/* Notification plumbing on the phone's side.
 *
 * Like sync, entirely optional: if the browser can't do push, the Worker
 * isn't configured, or permission is refused, every call here quietly does
 * nothing and the app behaves as though notifications were never mentioned.
 *
 * The iOS rules worth knowing, because they cause most of the confusion:
 *   - only works in a Home Screen app, never a Safari tab
 *   - needs iOS 16.4 or newer
 *   - the permission prompt must come from a real tap
 */

(function () {
  'use strict';

  var cfg = window.PUSH_CONFIG || {};

  function configured() {
    return !!(cfg.worker && cfg.publicKey);
  }

  function supported() {
    return !!(
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /* Safari only exposes push to an installed app, and silently fails rather
     than telling you, so it's worth detecting up front. */
  function installed() {
    return !!(
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone
    );
  }

  function isIOS() {
    return /iP(hone|ad|od)/.test(navigator.userAgent);
  }

  function permission() {
    return supported() ? Notification.permission : 'unsupported';
  }

  /* One of: off, unsupported, needs-install, ready, blocked, on */
  function state() {
    if (!configured()) return 'off';
    if (!supported()) return 'unsupported';
    if (isIOS() && !installed()) return 'needs-install';
    if (Notification.permission === 'denied') return 'blocked';
    if (Notification.permission === 'granted') return 'on';
    return 'ready';
  }

  function urlB64ToUint8Array(base64) {
    var padded = (base64 + '='.repeat((4 - base64.length % 4) % 4))
      .replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(padded);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  /* Asks permission, subscribes, and files the subscription in the room so
     the Worker can find it. Must be called straight from a tap. */
  function enable() {
    if (!configured()) return Promise.resolve('off');
    if (!supported()) return Promise.resolve('unsupported');
    if (isIOS() && !installed()) return Promise.resolve('needs-install');

    return Notification.requestPermission()
      .then(function (result) {
        if (result !== 'granted') return result === 'denied' ? 'blocked' : 'ready';
        return subscribe();
      })
      .catch(function () { return 'error'; });
  }

  function subscribe() {
    return navigator.serviceWorker.ready
      .then(function (reg) {
        return reg.pushManager.getSubscription().then(function (existing) {
          if (existing) return existing;
          return reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlB64ToUint8Array(cfg.publicKey)
          });
        });
      })
      .then(function (sub) {
        if (!window.SYNC || !SYNC.isReady()) return 'error';
        return SYNC.setPush(JSON.parse(JSON.stringify(sub)))
          .then(function (ok) { return ok ? 'on' : 'error'; });
      })
      .catch(function () { return 'error'; });
  }

  /* Re-files the subscription on every open. Push subscriptions rotate, and a
     stale one fails silently, which is the worst kind of failure. */
  function refresh() {
    if (!configured() || !supported()) return;
    if (Notification.permission !== 'granted') return;
    if (!window.SYNC || !SYNC.isReady() || !SYNC.hasSeat()) return;
    subscribe();
  }

  /* Fire and forget - a failed notification must never block the thing that
     triggered it. Returns true only when a send was actually kicked off. */
  function notify(opts) {
    if (!configured() || !window.SYNC || !SYNC.isReady() || !SYNC.hasSeat()) return false;

    fetch(cfg.worker.replace(/\/$/, '') + '/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room: SYNC.roomId(),
        to: SYNC.otherSeat(),
        title: opts.title || 'us.',
        message: opts.message || '',
        tag: opts.tag || 'us',
        silent: !!opts.silent
      })
    }).catch(function () {});
    return true;
  }

  window.PUSHER = {
    configured: configured,
    supported: supported,
    installed: installed,
    permission: permission,
    state: state,
    enable: enable,
    refresh: refresh,
    notify: notify
  };
})();
