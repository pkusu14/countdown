/* Spotify "now playing" for both phones.
 *
 * Each phone connects its own account (PKCE, no client secret). While the
 * app is in the foreground it asks Spotify what's playing and writes a small
 * record onto that phone's member node. The other phone just reads it.
 *
 * Optional throughout: missing config, a refused login, or Spotify being
 * down all look the same - the rows stay hidden and the rest of the app
 * is unaffected.
 *
 * iOS home-screen apps open Spotify's login in Safari, then Safari keeps
 * the redirect. The verifier lives in this app's storage, so the way back
 * is to paste the address Safari landed on. Android usually returns by
 * itself.
 */

(function () {
  'use strict';

  var TOKEN_KEY = 'us.spotify.tokens.v1';
  var VERIFIER_KEY = 'us.spotify.verifier.v1';
  var POLL_MS = 15000;
  var STALE_MS = 3 * 60 * 1000;

  var timer = null;

  function cfg() { return window.SPOTIFY_CONFIG || {}; }
  function configured() { return !!(cfg().clientId); }

  function redirectUri() {
    var path = location.pathname.replace(/index\.html$/i, '');
    if (path.slice(-1) !== '/') path += '/';
    return location.origin + path;
  }

  function loadTokens() {
    try { return JSON.parse(localStorage.getItem(TOKEN_KEY)) || null; }
    catch (e) { return null; }
  }

  function saveTokens(t) {
    try { localStorage.setItem(TOKEN_KEY, JSON.stringify(t)); } catch (e) {}
  }

  function clearTokens() {
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
  }

  function connected() { return !!(loadTokens() && loadTokens().refresh); }

  /* ---------------- PKCE ---------------- */

  function randomVerifier() {
    var bytes = crypto.getRandomValues(new Uint8Array(64));
    var out = '';
    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    for (var i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
    return out;
  }

  function b64url(buf) {
    var bytes = new Uint8Array(buf);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function challengeFor(verifier) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
      .then(function (hash) { return b64url(hash); });
  }

  function connect() {
    if (!configured()) return Promise.resolve(false);
    var verifier = randomVerifier();
    try { localStorage.setItem(VERIFIER_KEY, verifier); } catch (e) {}

    return challengeFor(verifier).then(function (challenge) {
      var url = 'https://accounts.spotify.com/authorize?' + [
        'client_id=' + encodeURIComponent(cfg().clientId),
        'response_type=code',
        'redirect_uri=' + encodeURIComponent(redirectUri()),
        'scope=' + encodeURIComponent('user-read-currently-playing user-read-playback-state'),
        'code_challenge_method=S256',
        'code_challenge=' + encodeURIComponent(challenge)
      ].join('&');
      location.href = url;
      return true;
    });
  }

  function disconnect() {
    clearTokens();
    if (window.SYNC) SYNC.clearListening();
    stop();
  }

  /* Accepts the live redirect (?code= on this page) or a URL pasted in
     after iOS dumped the login into Safari. */
  function handleCallbackUrl(raw) {
    var url;
    try { url = new URL(raw, location.href); }
    catch (e) { return Promise.resolve('bad'); }

    var err = url.searchParams.get('error');
    if (err) return Promise.resolve(err === 'access_denied' ? 'denied' : 'error');

    var code = url.searchParams.get('code');
    if (!code) return Promise.resolve('none');

    var verifier = '';
    try { verifier = localStorage.getItem(VERIFIER_KEY) || ''; } catch (e) {}
    if (!verifier) return Promise.resolve('missing-verifier');

    var body = [
      'grant_type=authorization_code',
      'code=' + encodeURIComponent(code),
      'redirect_uri=' + encodeURIComponent(redirectUri()),
      'client_id=' + encodeURIComponent(cfg().clientId),
      'code_verifier=' + encodeURIComponent(verifier)
    ].join('&');

    return fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body
    }).then(function (res) { return res.json().then(function (j) { return { res: res, j: j }; }); })
      .then(function (out) {
        if (!out.res.ok || !out.j.access_token) return 'error';
        saveTokens({
          access: out.j.access_token,
          refresh: out.j.refresh_token,
          expiresAt: Date.now() + (out.j.expires_in - 60) * 1000
        });
        try { localStorage.removeItem(VERIFIER_KEY); } catch (e) {}
        start();
        return 'ok';
      })
      .catch(function () { return 'error'; });
  }

  function finishFromLocation() {
    if (!configured()) return Promise.resolve('none');
    if (!/[?&]code=/.test(location.search) && !/[?&]error=/.test(location.search)) {
      return Promise.resolve('none');
    }
    var href = location.href;
    history.replaceState(null, '', location.pathname);
    return handleCallbackUrl(href);
  }

  /* ---------------- tokens ---------------- */

  function accessToken() {
    var t = loadTokens();
    if (!t || !t.refresh) return Promise.resolve('');
    if (t.access && t.expiresAt > Date.now()) return Promise.resolve(t.access);

    var body = [
      'grant_type=refresh_token',
      'refresh_token=' + encodeURIComponent(t.refresh),
      'client_id=' + encodeURIComponent(cfg().clientId)
    ].join('&');

    return fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body
    }).then(function (res) { return res.json().then(function (j) { return { res: res, j: j }; }); })
      .then(function (out) {
        if (!out.res.ok || !out.j.access_token) {
          clearTokens();
          return '';
        }
        t.access = out.j.access_token;
        t.expiresAt = Date.now() + (out.j.expires_in - 60) * 1000;
        if (out.j.refresh_token) t.refresh = out.j.refresh_token;
        saveTokens(t);
        return t.access;
      })
      .catch(function () { return ''; });
  }

  /* ---------------- polling ---------------- */

  function poll() {
    if (document.hidden) return;
    if (!connected()) return;

    accessToken().then(function (token) {
      if (!token) return;
      return fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: 'Bearer ' + token }
      }).then(function (res) {
        if (res.status === 204) return publish(null);
        if (res.status === 401) { clearTokens(); return publish(null); }
        if (!res.ok) return;
        return res.json().then(function (data) {
          var item = data && data.item;
          if (!item || (item.type && item.type !== 'track')) return publish(null);
          var images = item.album && item.album.images || [];
          var art = (images[images.length - 1] || images[0] || {}).url || '';
          var artists = (item.artists || []).map(function (a) { return a.name; }).join(', ');
          publish({
            title: String(item.name || '').slice(0, 80),
            artist: String(artists).slice(0, 80),
            art: art,
            url: (item.external_urls && item.external_urls.spotify) || '',
            playing: !!data.is_playing,
            at: Date.now()
          });
        });
      });
    }).catch(function () {});
  }

  function publish(payload) {
    if (!window.SYNC) return;
    if (payload) SYNC.setListening(payload);
    else SYNC.clearListening();
  }

  function start() {
    if (!configured() || !connected()) return;
    stop();
    poll();
    timer = setInterval(poll, POLL_MS);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function isFresh(info) {
    if (!info || !info.title) return false;
    return (Date.now() - (info.at || 0)) < STALE_MS;
  }

  window.SPOTIFY = {
    configured: configured,
    connected: connected,
    connect: connect,
    disconnect: disconnect,
    handleCallbackUrl: handleCallbackUrl,
    finishFromLocation: finishFromLocation,
    start: start,
    stop: stop,
    poll: poll,
    isFresh: isFresh
  };
})();
