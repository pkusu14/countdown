/* Delivers web push on behalf of the countdown app.
 *
 * The app itself can't do this: sending requires the VAPID private key, and
 * anything shipped to a phone is public. So this sits in the middle, holding
 * the key, and does nothing else.
 *
 * It implements two specs by hand rather than pulling in a library, because
 * Workers have no Node crypto and the whole job is about eighty lines:
 *   - RFC 8292, the VAPID signature that identifies us to the push service
 *   - RFC 8291, the payload encryption that stops the push service reading it
 *
 * Secrets (wrangler secret put):
 *   VAPID_PRIVATE   base64 PKCS8 from tools/make-vapid.mjs
 *   ROOM            the room name, so this can't be used to spam strangers
 * Vars (wrangler.toml):
 *   VAPID_PUBLIC    base64url raw public key
 *   DB              Realtime Database URL
 *   CONTACT         mailto: address push services can complain to
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'bad json' }, 400); }

    const { room, to, title, message, tag, silent } = body || {};

    /* the room name doubles as the shared secret everywhere else in this
       app, so it does the same job here */
    if (!room || room !== env.ROOM) return json({ error: 'unknown room' }, 403);
    if (to !== 'a' && to !== 'b') return json({ error: 'bad recipient' }, 400);

    const sub = await getSubscription(env, room, to);
    if (!sub) return json({ error: 'not subscribed', delivered: false }, 200);

    const payload = JSON.stringify({
      title: String(title || 'us.').slice(0, 80),
      message: String(message || '').slice(0, 160),
      tag: String(tag || 'us'),
      silent: !!silent
    });

    try {
      const res = await send(env, sub, payload, silent);

      /* 404 and 410 mean the phone threw the subscription away - reinstalled,
         permission revoked, or iOS pruned it. Clear it so we stop trying. */
      if (res.status === 404 || res.status === 410) {
        await clearSubscription(env, room, to);
        return json({ delivered: false, reason: 'subscription expired' }, 200);
      }

      return json({ delivered: res.ok, status: res.status }, res.ok ? 200 : 502);
    } catch (err) {
      return json({ delivered: false, error: String(err) }, 502);
    }
  }
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}

/* ---------------- the room ---------------- */

async function getSubscription(env, room, seat) {
  const url = `${env.DB}/rooms/${room}/members/${seat}/push.json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const sub = await res.json();
  return sub && sub.endpoint && sub.keys ? sub : null;
}

async function clearSubscription(env, room, seat) {
  await fetch(`${env.DB}/rooms/${room}/members/${seat}/push.json`, { method: 'DELETE' })
    .catch(() => {});
}

/* ---------------- bytes ---------------- */

const enc = new TextEncoder();

function b64urlToBytes(s) {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(pad + '='.repeat((4 - pad.length % 4) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes) {
  let bin = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concat(...parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

/* ---------------- VAPID (RFC 8292) ---------------- */

async function vapidHeader(env, endpoint) {
  const aud = new URL(endpoint).origin;

  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = bytesToB64url(enc.encode(JSON.stringify({
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: env.CONTACT || 'mailto:nobody@example.com'
  })));

  const signingInput = enc.encode(`${header}.${claims}`);

  const key = await crypto.subtle.importKey(
    'pkcs8',
    b64urlToBytes(env.VAPID_PRIVATE.replace(/\+/g, '-').replace(/\//g, '_')),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  /* WebCrypto returns raw r||s, which is exactly what JWS ES256 wants */
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, signingInput
  );

  return `vapid t=${header}.${claims}.${bytesToB64url(sig)}, k=${env.VAPID_PUBLIC}`;
}

/* ---------------- payload encryption (RFC 8291) ---------------- */

async function hmac(keyBytes, data) {
  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
}

/* HKDF expand, single block - everything here needs 32 bytes or fewer */
async function hkdf(salt, ikm, info, length) {
  const prk = await hmac(salt, ikm);
  const okm = await hmac(prk, concat(info, new Uint8Array([1])));
  return okm.slice(0, length);
}

/* Salt and ephemeral keypair are passed in rather than made here, so the
   RFC 8291 test vectors can be reproduced exactly. */
async function encryptPayload(sub, plaintext, salt, ephemeral) {
  const uaPublic = b64urlToBytes(sub.keys.p256dh);
  const authSecret = b64urlToBytes(sub.keys.auth);

  const asPublic = new Uint8Array(
    await crypto.subtle.exportKey('raw', ephemeral.publicKey)
  );

  const uaKey = await crypto.subtle.importKey(
    'raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const shared = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: uaKey }, ephemeral.privateKey, 256
  ));

  const keyInfo = concat(
    enc.encode('WebPush: info'), new Uint8Array([0]), uaPublic, asPublic
  );
  const ikm = await hkdf(authSecret, shared, keyInfo, 32);

  const cek = await hkdf(salt, ikm, concat(enc.encode('Content-Encoding: aes128gcm'), new Uint8Array([0])), 16);
  const nonce = await hkdf(salt, ikm, concat(enc.encode('Content-Encoding: nonce'), new Uint8Array([0])), 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);

  /* 0x02 marks the last record of the stream */
  const padded = concat(enc.encode(plaintext), new Uint8Array([2]));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce }, aesKey, padded
  ));

  /* header: salt | record size | key length | ephemeral public key */
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);

  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, ciphertext);
}

async function send(env, sub, payload, silent) {
  /* a fresh salt and keypair per message, as the spec requires */
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ephemeral = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );

  const body = await encryptPayload(sub, payload, salt, ephemeral);
  const auth = await vapidHeader(env, sub.endpoint);

  return fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: silent ? '86400' : '3600',
      Urgency: silent ? 'low' : 'high'
    },
    body
  });
}

export const __test = { encryptPayload, vapidHeader, bytesToB64url, b64urlToBytes };
