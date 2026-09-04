(function () {
  'use strict';

  var STORE_KEY = 'us.events.v1';
  var OPENS_KEY = 'us.opens.v1';
  var DONE_KEY = 'us.celebrated.v1';
  var SECOND = 1000, MIN = 60000, HOUR = 3600000, DAY = 86400000;

  var $ = function (id) { return document.getElementById(id); };

  var events = [];
  var heroId = null;
  var celebrated = [];
  var lastDayIndex = null;
  var sessionSeed = Math.floor(Math.random() * 1e9);
  var opens = 1;

  /* ---------------- storage ---------------- */

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      events = Array.isArray(parsed) ? parsed.filter(valid) : [];
    } catch (e) {
      events = [];
    }
    sort();
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(events));
    } catch (e) {
      toast('Could not save - storage is full or blocked');
    }
  }

  function valid(e) {
    return e && typeof e.title === 'string' && typeof e.date === 'string' &&
      !isNaN(Date.parse(e.date));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* future events soonest-first, then past events most-recent-first */
  function sort() {
    var now = Date.now();
    events.sort(function (a, b) {
      var ta = Date.parse(a.date), tb = Date.parse(b.date);
      var fa = ta >= now, fb = tb >= now;
      if (fa !== fb) return fa ? -1 : 1;
      return fa ? ta - tb : tb - ta;
    });
  }

  function celebratedIds() {
    try { return JSON.parse(localStorage.getItem(DONE_KEY)) || []; }
    catch (e) { return []; }
  }

  function markCelebrated(id) {
    if (celebrated.indexOf(id) !== -1) return;
    celebrated.push(id);
    celebrated = celebrated.slice(-50);
    try { localStorage.setItem(DONE_KEY, JSON.stringify(celebrated)); } catch (e) {}
  }

  function countOpen() {
    var today = localDayIndex();
    try {
      var rec = JSON.parse(localStorage.getItem(OPENS_KEY)) || {};
      opens = rec.day === today ? (rec.n || 0) + 1 : 1;
      localStorage.setItem(OPENS_KEY, JSON.stringify({ day: today, n: opens }));
    } catch (e) {
      opens = 1;
    }
  }

  /* ---------------- time ---------------- */

  /* Days since epoch in the viewer's own timezone, so the meme flips at their
     local midnight rather than at UTC midnight. */
  function localDayIndex(ts) {
    var d = new Date(ts === undefined ? Date.now() : ts);
    return Math.floor((d.getTime() - d.getTimezoneOffset() * MIN) / DAY);
  }

  function parts(ms) {
    var abs = Math.abs(ms);
    return {
      d: Math.floor(abs / DAY),
      h: Math.floor(abs / HOUR) % 24,
      m: Math.floor(abs / MIN) % 60,
      s: Math.floor(abs / SECOND) % 60
    };
  }

  function compact(ms) {
    var p = parts(ms);
    if (p.d > 0) return p.d + 'd';
    if (p.h > 0) return p.h + 'h';
    if (p.m > 0) return p.m + 'm';
    return p.s + 's';
  }

  function awayText(ms) {
    return ms < 0 ? compact(ms) + ' ago' : compact(ms);
  }

  function prettyDate(ts) {
    var d = new Date(ts);
    var opts = { weekday: 'short', day: 'numeric', month: 'short' };
    if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
    var out = d.toLocaleDateString(undefined, opts);
    if (d.getHours() !== 0 || d.getMinutes() !== 0) {
      out += ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
    return out;
  }

  /* ---------------- rendering ---------------- */

  function render() {
    sort();

    var now = Date.now();
    var hero = pickHero(now);
    heroId = hero ? hero.id : null;

    $('empty').hidden = events.length > 0;
    $('hero').hidden = !hero;
    $('stats').hidden = !hero;

    if (hero) {
      $('hero-title').textContent = (hero.emoji ? hero.emoji + '  ' : '') + hero.title;
      var isPast = Date.parse(hero.date) < now;
      $('hero-eyebrow').textContent = isPast ? 'it has been' : 'counting down to';
      $('hero').classList.toggle('is-past', isPast);
    }

    renderList();
    renderMeme();
    tick();
  }

  /* On the day itself the meetup should stay front and centre counting up,
     rather than instantly handing the spotlight to whatever is next. */
  function pickHero(now) {
    var justHappened = events.filter(function (e) {
      var t = Date.parse(e.date);
      return t <= now && t > now - 12 * HOUR;
    })[0];

    var upcoming = events.filter(function (e) { return Date.parse(e.date) > now; })[0];

    return justHappened || upcoming || events[0] || null;
  }

  function renderList() {
    var list = $('list');
    var rest = events.filter(function (e) { return e.id !== heroId; });

    list.textContent = '';
    $('list-section').hidden = rest.length === 0;

    rest.forEach(function (e) {
      var ts = Date.parse(e.date);
      var past = ts < Date.now();

      var li = document.createElement('li');
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'row' + (past ? ' is-past' : '');
      row.dataset.id = e.id;

      var emoji = document.createElement('span');
      emoji.className = 'row-emoji';
      emoji.textContent = e.emoji || '\u2726';

      var main = document.createElement('span');
      main.className = 'row-main';

      var title = document.createElement('span');
      title.className = 'row-title';
      title.textContent = e.title;

      var date = document.createElement('span');
      date.className = 'row-date';
      date.textContent = prettyDate(ts);

      var away = document.createElement('span');
      away.className = 'row-away';
      away.dataset.away = e.id;
      away.textContent = awayText(ts - Date.now());

      main.appendChild(title);
      main.appendChild(date);
      row.appendChild(emoji);
      row.appendChild(main);
      row.appendChild(away);
      li.appendChild(row);
      list.appendChild(li);
    });
  }

  function renderMeme() {
    var memes = window.MEMES || [];
    var card = $('meme-card');

    if (!memes.length) {
      card.hidden = true;
      return;
    }

    var order = shuffled(memes);
    var idx = localDayIndex() % order.length;
    var img = $('meme-img');

    img.onerror = function () { card.hidden = true; };
    img.src = 'assets/memes/' + order[idx];
    card.hidden = false;

    warmMemes([
      'assets/memes/' + order[idx],
      'assets/memes/' + order[(idx + 1) % order.length]
    ]);
  }

  /* Ask the service worker to hold on to today's and tomorrow's meme, so the
     app still has something to show with no signal. */
  function warmMemes(urls) {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'warm', urls: urls });
    }
  }

  /* Same order on both phones: a fixed-seed shuffle, not Math.random. */
  function shuffled(arr) {
    var out = arr.slice();
    var seed = 1337;
    for (var i = out.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      var j = seed % (i + 1);
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  function renderStats(ms) {
    var stats = window.JOKES.statsFor(
      { ms: Math.abs(ms), days: Math.floor(Math.abs(ms) / DAY), opens: opens },
      localDayIndex()
    );
    $('stat-1-v').textContent = stats[0].value;
    $('stat-1-l').textContent = stats[0].label;
    $('stat-2-v').textContent = stats[1].value;
    $('stat-2-l').textContent = stats[1].label;
  }

  /* ---------------- the tick ---------------- */

  function tick() {
    var now = Date.now();

    /* midnight rolled over: new meme, new stats */
    var today = localDayIndex(now);
    if (lastDayIndex !== null && today !== lastDayIndex) {
      renderMeme();
      sessionSeed = Math.floor(Math.random() * 1e9);
    }
    lastDayIndex = today;

    document.querySelectorAll('[data-away]').forEach(function (el) {
      var e = byId(el.dataset.away);
      if (!e) return;
      el.textContent = awayText(Date.parse(e.date) - now);
    });

    var hero = byId(heroId);
    if (!hero) {
      document.title = 'Countdown';
      return;
    }

    var ms = Date.parse(hero.date) - now;
    var isPast = ms < 0;
    var p = parts(ms);

    $('d').textContent = p.d;
    $('h').textContent = pad(p.h);
    $('m').textContent = pad(p.m);
    $('s').textContent = pad(p.s);

    $('hero-human').textContent = window.JOKES.humanize(ms, isPast);
    $('hero-joke').textContent = window.JOKES.pickLine(ms, sessionSeed);
    $('hero').classList.toggle('is-past', isPast);
    $('hero-eyebrow').textContent = isPast ? 'it has been' : 'counting down to';

    document.title = (isPast ? '' : compact(ms) + ' \u00b7 ') + hero.title;

    renderStats(ms);
    checkCelebrations(now);
  }

  /* Fires for any event that has just landed, whether it crossed zero with the
     app open or while it was shut. Checking every event rather than only the
     hero means a meetup still gets its moment when other dates are in the list. */
  function checkCelebrations(now) {
    if (!$('celebrate').hidden) return;

    for (var i = 0; i < events.length; i++) {
      var ms = Date.parse(events[i].date) - now;
      if (ms <= 0 && ms > -6 * HOUR && celebrated.indexOf(events[i].id) === -1) {
        celebrate(events[i]);
        return;
      }
    }
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function byId(id) {
    for (var i = 0; i < events.length; i++) if (events[i].id === id) return events[i];
    return null;
  }

  /* ---------------- add / edit sheet ---------------- */

  function openSheet(e) {
    $('sheet-title').textContent = e ? 'Edit event' : 'New event';
    $('f-id').value = e ? e.id : '';
    $('f-title').value = e ? e.title : '';
    $('f-emoji').value = e ? (e.emoji || '') : '';
    $('f-delete').hidden = !e;
    $('form-error').hidden = true;

    var d = e ? new Date(Date.parse(e.date)) : defaultDate();
    $('f-date').value = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    $('f-time').value = pad(d.getHours()) + ':' + pad(d.getMinutes());

    $('sheet').hidden = false;
    $('sheet-backdrop').hidden = false;
    if (!e) setTimeout(function () { $('f-title').focus(); }, 60);
  }

  function defaultDate() {
    var d = new Date();
    d.setDate(d.getDate() + 30);
    d.setHours(12, 0, 0, 0);
    return d;
  }

  function closeSheet() {
    $('sheet').hidden = true;
    $('sheet-backdrop').hidden = true;
  }

  function submit(ev) {
    ev.preventDefault();

    var title = $('f-title').value.trim();
    var dateStr = $('f-date').value;
    var timeStr = $('f-time').value || '00:00';

    if (!title) return formError('Give it a name.');
    if (!dateStr) return formError('Pick a date.');

    var dp = dateStr.split('-').map(Number);
    var tp = timeStr.split(':').map(Number);
    /* built from local components so the saved instant matches what was typed */
    var when = new Date(dp[0], dp[1] - 1, dp[2], tp[0] || 0, tp[1] || 0, 0, 0);
    if (isNaN(when.getTime())) return formError('That date did not parse.');

    var id = $('f-id').value;
    var existing = byId(id);

    if (existing) {
      existing.title = title;
      existing.emoji = $('f-emoji').value.trim();
      existing.date = when.toISOString();
    } else {
      events.push({
        id: uid(),
        title: title,
        emoji: $('f-emoji').value.trim(),
        date: when.toISOString()
      });
    }

    save();
    closeSheet();
    render();
    toast(existing ? 'Updated' : 'Added');
  }

  function formError(msg) {
    var el = $('form-error');
    el.textContent = msg;
    el.hidden = false;
  }

  function removeEvent() {
    var id = $('f-id').value;
    events = events.filter(function (e) { return e.id !== id; });
    save();
    closeSheet();
    render();
    toast('Deleted');
  }

  /* ---------------- share link ---------------- */

  /* compact tuples keep the URL short: [title, epochMs, emoji] */
  function encodeEvents(list) {
    var payload = list.map(function (e) {
      return [e.title, Date.parse(e.date), e.emoji || ''];
    });
    return b64url(JSON.stringify(payload));
  }

  function decodeEvents(str) {
    var arr = JSON.parse(unb64url(str));
    if (!Array.isArray(arr)) return [];
    return arr.map(function (t) {
      return {
        id: uid(),
        title: String(t[0] || 'Untitled').slice(0, 60),
        date: new Date(Number(t[1])).toISOString(),
        emoji: String(t[2] || '').slice(0, 8)
      };
    }).filter(valid);
  }

  /* btoa only handles latin-1, so emoji have to go through UTF-8 first */
  function b64url(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function unb64url(str) {
    var s = str.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function shareLink() {
    if (!events.length) return toast('Nothing to share yet');

    var url = location.origin + location.pathname + '#e=' + encodeEvents(events);

    if (navigator.share) {
      navigator.share({ title: 'our countdown', text: 'open this and add it to your home screen', url: url })
        .catch(function () { copy(url); });
    } else {
      copy(url);
    }
  }

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(function () { toast('Link copied - send it to him'); })
        .catch(function () { prompt('Copy this link:', text); });
    } else {
      prompt('Copy this link:', text);
    }
  }

  var pendingImport = null;

  function checkIncoming() {
    var m = /[#&]e=([^&]+)/.exec(location.hash);
    if (!m) return;

    /* clean the hash straight away so a refresh does not re-prompt */
    history.replaceState(null, '', location.pathname + location.search);

    var incoming;
    try { incoming = decodeEvents(m[1]); }
    catch (e) { return toast('That link looked broken'); }

    showImport(incoming);
  }

  function showImport(incoming) {
    if (!incoming || !incoming.length) return;

    pendingImport = incoming;

    $('import-body').textContent = incoming.length === 1
      ? 'One event came in with this link.'
      : incoming.length + ' events came in with this link.';

    var ul = $('import-list');
    ul.textContent = '';
    incoming.forEach(function (e) {
      var li = document.createElement('li');
      li.textContent = (e.emoji ? e.emoji + ' ' : '') + e.title + ' ';
      var span = document.createElement('span');
      span.textContent = prettyDate(Date.parse(e.date));
      li.appendChild(span);
      ul.appendChild(li);
    });

    $('import-replace').hidden = events.length === 0;
    $('import').hidden = false;
    $('import-backdrop').hidden = false;
  }

  function closeImport() {
    pendingImport = null;
    $('import').hidden = true;
    $('import-backdrop').hidden = true;
  }

  function applyImport(mode) {
    if (!pendingImport) return closeImport();

    if (mode === 'replace') {
      events = pendingImport;
    } else {
      var seen = {};
      events.forEach(function (e) { seen[key(e)] = true; });
      pendingImport.forEach(function (e) {
        if (!seen[key(e)]) events.push(e);
      });
    }

    save();
    closeImport();
    render();
    toast(mode === 'replace' ? 'Replaced' : 'Merged');
  }

  function key(e) { return e.title.toLowerCase() + '|' + Date.parse(e.date); }

  /* ---------------- pasting a link in ---------------- */

  /* An installed app on iOS gets storage of its own, separate from Safari, and
     tapping a link always opens Safari rather than the app. So the only way to
     get shared events into the installed copy is to paste the link in here. */

  function openPaste() {
    $('paste-input').value = '';
    $('paste-error').hidden = true;
    $('paste-backdrop').hidden = false;
    $('paste').hidden = false;
    setTimeout(function () { $('paste-input').focus(); }, 60);
  }

  function closePaste() {
    $('paste').hidden = true;
    $('paste-backdrop').hidden = true;
  }

  function readClipboard() {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      return pasteError('Long-press the box above and choose Paste.');
    }
    navigator.clipboard.readText()
      .then(function (text) {
        $('paste-input').value = text;
        $('paste-error').hidden = true;
      })
      .catch(function () {
        pasteError('Long-press the box above and choose Paste.');
      });
  }

  function applyPaste() {
    var text = $('paste-input').value.trim();
    if (!text) return pasteError('Paste the link in first.');

    /* accepts the whole link or just the code on the end of it */
    var m = /[#&]e=([A-Za-z0-9\-_]+)/.exec(text);
    var code = m ? m[1] : (/^[A-Za-z0-9\-_]+$/.test(text) ? text : null);
    if (!code) return pasteError("That doesn't look like one of our links.");

    var incoming;
    try { incoming = decodeEvents(code); }
    catch (e) { incoming = []; }

    if (!incoming.length) return pasteError('That link is damaged - ask for a fresh one.');

    closePaste();
    showImport(incoming);
  }

  function pasteError(msg) {
    var el = $('paste-error');
    el.textContent = msg;
    el.hidden = false;
  }

  /* ---------------- zero moment ---------------- */

  function celebrate(event) {
    markCelebrated(event.id);
    $('celebrate-kicker').textContent = event.title;
    $('celebrate-sub').textContent = window.JOKES.pickLine(0, Math.floor(Math.random() * 1e9));
    $('celebrate').hidden = false;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) confetti();
  }

  function confetti() {
    var canvas = $('confetti');
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth, h = canvas.clientHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    var colors = ['#ff5470', '#ffd166', '#7ee0c1', '#8ab6ff', '#f4f4f6'];
    var bits = [];
    for (var i = 0; i < 140; i++) {
      bits.push({
        x: Math.random() * w,
        y: -20 - Math.random() * h,
        vx: (Math.random() - 0.5) * 1.6,
        vy: 1.6 + Math.random() * 2.6,
        size: 5 + Math.random() * 7,
        spin: (Math.random() - 0.5) * 0.2,
        angle: Math.random() * Math.PI,
        color: colors[i % colors.length]
      });
    }

    var stop = Date.now() + 7000;

    (function frame() {
      ctx.clearRect(0, 0, w, h);
      bits.forEach(function (b) {
        b.x += b.vx;
        b.y += b.vy;
        b.angle += b.spin;
        if (b.y > h + 20) { b.y = -20; b.x = Math.random() * w; }

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        ctx.fillStyle = b.color;
        ctx.fillRect(-b.size / 2, -b.size / 4, b.size, b.size / 2);
        ctx.restore();
      });

      if (Date.now() < stop && !$('celebrate').hidden) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, w, h);
    })();
  }

  /* ---------------- misc ---------------- */

  var toastTimer = null;

  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2600);
  }

  function wire() {
    $('add-btn').addEventListener('click', function () { openSheet(null); });
    $('empty-add').addEventListener('click', function () { openSheet(null); });
    $('share-btn').addEventListener('click', shareLink);

    $('event-form').addEventListener('submit', submit);
    $('f-cancel').addEventListener('click', closeSheet);
    $('f-delete').addEventListener('click', removeEvent);
    $('sheet-backdrop').addEventListener('click', closeSheet);

    $('empty-paste').addEventListener('click', openPaste);
    $('foot-paste').addEventListener('click', openPaste);
    $('paste-cancel').addEventListener('click', closePaste);
    $('paste-backdrop').addEventListener('click', closePaste);
    $('paste-clip').addEventListener('click', readClipboard);
    $('paste-go').addEventListener('click', applyPaste);

    $('import-ignore').addEventListener('click', closeImport);
    $('import-backdrop').addEventListener('click', closeImport);
    $('import-merge').addEventListener('click', function () { applyImport('merge'); });
    $('import-replace').addEventListener('click', function () { applyImport('replace'); });

    $('celebrate-close').addEventListener('click', function () {
      $('celebrate').hidden = true;
      /* the event just moved into the past, so the ordering needs redoing */
      render();
    });

    $('list').addEventListener('click', function (ev) {
      var row = ev.target.closest('.row');
      if (row) openSheet(byId(row.dataset.id));
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { closeSheet(); closeImport(); closePaste(); }
    });

    /* phones freeze timers in the background - resync on return */
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) render();
    });
  }

  function registerSW() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  function init() {
    countOpen();
    celebrated = celebratedIds();
    load();
    wire();
    checkIncoming();
    render();
    setInterval(tick, SECOND);
    registerSW();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
