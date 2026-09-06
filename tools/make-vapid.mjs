/* Generates the VAPID keypair that identifies this app to Apple's and
   Google's push services.
 
   Run once:  node tools/make-vapid.mjs
 
   The public key is safe to ship in the app. The private key is a secret and
   belongs only in the Cloudflare Worker - never commit it. */

import { generateKeyPairSync } from 'node:crypto';

const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1'
});

const b64url = (buf) => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/* the uncompressed point (65 bytes, leading 0x04) is what browsers want */
const pubJwk = publicKey.export({ format: 'jwk' });
const pub = Buffer.concat([
  Buffer.from([4]),
  Buffer.from(pubJwk.x, 'base64url'),
  Buffer.from(pubJwk.y, 'base64url')
]);

/* PKCS8 so the Worker can hand it straight to crypto.subtle.importKey */
const priv = privateKey.export({ format: 'der', type: 'pkcs8' });

console.log('\nPublic key  (goes in push-config.js, safe to commit):\n');
console.log(b64url(pub));
console.log('\nPrivate key (Worker secret VAPID_PRIVATE - do not commit):\n');
console.log(priv.toString('base64'));
console.log('');
