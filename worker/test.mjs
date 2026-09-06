/* Checks the push encryption against the worked example in RFC 8291 section 5.
   Hand-rolled crypto that produces undecryptable payloads fails silently on
   the phone, so this is the only way to know it's right before shipping.

   Run: node worker/test.mjs */

import { __test } from './src/index.js';

const { encryptPayload, vapidHeader, bytesToB64url, b64urlToBytes } = __test;

/* ---- the RFC's fixed inputs ---- */
const PLAINTEXT = 'When I grow up, I want to be a watermelon';
const SALT = 'DGv6ra1nlYgDCS1FRnbzlw';
const AS_PRIVATE = 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw';
const AS_PUBLIC = 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8';
const UA_PUBLIC = 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4';
const AUTH_SECRET = 'BTBZMqHH6r4Tts7J_aSIgg';

const EXPECTED =
  'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml' +
  'mlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPT' +
  'pK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN';

const raw = b64urlToBytes(AS_PUBLIC);
const jwk = {
  kty: 'EC',
  crv: 'P-256',
  d: AS_PRIVATE,
  x: bytesToB64url(raw.slice(1, 33)),
  y: bytesToB64url(raw.slice(33, 65)),
  ext: true
};

const privateKey = await crypto.subtle.importKey(
  'jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
);
const publicKey = await crypto.subtle.importKey(
  'raw', raw, { name: 'ECDH', namedCurve: 'P-256' }, true, []
);

const body = await encryptPayload(
  { keys: { p256dh: UA_PUBLIC, auth: AUTH_SECRET } },
  PLAINTEXT,
  b64urlToBytes(SALT),
  { privateKey, publicKey }
);

const got = bytesToB64url(body);

let failures = 0;

if (got === EXPECTED) {
  console.log('PASS  payload encryption matches RFC 8291');
} else {
  failures++;
  console.log('FAIL  payload encryption does not match RFC 8291');
  console.log('  expected: ' + EXPECTED);
  console.log('  got:      ' + got);
}

/* ---- VAPID: sign, then verify with the matching public key ---- */
const { generateKeyPairSync } = await import('node:crypto');
const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pubJwk = pair.publicKey.export({ format: 'jwk' });
const pubRaw = Buffer.concat([
  Buffer.from([4]),
  Buffer.from(pubJwk.x, 'base64url'),
  Buffer.from(pubJwk.y, 'base64url')
]);

const env = {
  VAPID_PRIVATE: pair.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'),
  VAPID_PUBLIC: bytesToB64url(pubRaw),
  CONTACT: 'mailto:test@example.com'
};

const header = await vapidHeader(env, 'https://web.push.apple.com/some/endpoint');
const token = header.match(/t=([^,]+)/)[1];
const [h, p, s] = token.split('.');

const claims = JSON.parse(Buffer.from(p, 'base64url').toString());
const verifyKey = await crypto.subtle.importKey(
  'raw', pubRaw, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']
);
const valid = await crypto.subtle.verify(
  { name: 'ECDSA', hash: 'SHA-256' },
  verifyKey,
  b64urlToBytes(s),
  new TextEncoder().encode(`${h}.${p}`)
);

if (valid) console.log('PASS  VAPID signature verifies');
else { failures++; console.log('FAIL  VAPID signature does not verify'); }

if (claims.aud === 'https://web.push.apple.com') console.log('PASS  VAPID audience is the push service origin');
else { failures++; console.log('FAIL  VAPID audience wrong: ' + claims.aud); }

if (claims.exp > Date.now() / 1000 && claims.exp < Date.now() / 1000 + 24 * 3600) {
  console.log('PASS  VAPID expiry within 24h');
} else { failures++; console.log('FAIL  VAPID expiry out of range'); }

console.log(failures ? `\n${failures} failure(s)` : '\nall good');
process.exit(failures ? 1 : 0);
