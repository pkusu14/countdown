/* Push notification settings.

   The public key is safe here - it only lets a phone say "notifications from
   this app are welcome". Sending requires the matching private key, which
   lives as a secret inside the Cloudflare Worker and is never committed.

   Until `worker` is filled in, the app runs with notifications simply
   switched off. */

window.PUSH_CONFIG = {
  publicKey: 'BK6MDHJWx2CxFT6XUcHq6zZc25poVtxWbXh-SjV87bhYk6vmJd0it3YQKj0vTuxk6wxYcT3oy_us2ZBXqAmOOMc',

  worker: 'https://countdown-push.pkusu14.workers.dev'
};
