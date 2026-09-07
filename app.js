(function () {
  'use strict';

  var STORE_KEY = 'us.events.v1';
  var DONE_KEY = 'us.celebrated.v1';
  var NOTIFY_KEY = 'us.notifyask.v1';
  var SECOND = 1000, MIN = 60000, HOUR = 3600000, DAY = 86400000;

  var $ = function (id) { return document.getElementById(id); };

  var events = [];
  var heroId = null;
  /* set once a tab is tapped, so flipping to another countdown sticks instead
     of snapping back to the soonest one on the next redraw */
  var pickedId = null;
  var celebrated = [];
  var lastDayIndex = null;

  var members = {};
  var todos = [];

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
    var hero = byId(pickedId) || pickHero(now);
    heroId = hero ? hero.id : null;

    $('empty').hidden = events.length > 0;
    $('hero').hidden = !hero;

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

    list.textContent = '';
    $('list-section').hidden = events.length === 0;

    events.forEach(function (e) {
      var ts = Date.parse(e.date);
      var past = ts < Date.now();

      var li = document.createElement('li');
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'row' + (past ? ' is-past' : '') + (e.id === heroId ? ' is-on' : '');
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
  function shuffled(arr, seed) {
    var out = arr.slice();
    var s = seed || 1337;
    for (var i = out.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      var j = s % (i + 1);
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  /* ---------------- the absurd units ---------------- */

  /* Frozen at local midnight: same pair and same numbers all day, even as
     the seconds tick. Recalculated when the day rolls or the tab changes. */
  var measureCache = { key: '', picks: [] };

  function renderMeasures(ms) {
    var today = localDayIndex();
    var key = today + ':' + heroId;
    if (measureCache.key !== key) {
      /* remaining as of this morning, so the number does not creep down hourly */
      var start = startOfLocalDay();
      var frozen = Math.abs((Date.parse((byId(heroId) || {}).date) || 0) - start);
      if (!frozen) frozen = Math.abs(ms);
      measureCache = { key: key, picks: pickMeasures(frozen, today) };
    }

    var picks = measureCache.picks;
    var box = $('measures');

    box.hidden = picks.length === 0;
    if (box.hidden) return;

    for (var i = 0; i < 2; i++) {
      var pick = picks[i];
      box.children[i].hidden = !pick;
      if (!pick) continue;

      $('measure-' + (i + 1) + '-v').textContent = pick.count.toLocaleString();
      $('measure-' + (i + 1) + '-l').textContent = pick.unit;
    }
  }

  function startOfLocalDay() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  /* Near enough is the point - 7,640 plays of Billie Jean reads as a
     calculation, 7,600 reads as a measurement. */
  function ballpark(n) {
    if (n < 20) return Math.max(1, Math.round(n));
    if (n < 100) return Math.round(n / 5) * 5;
    if (n < 1000) return Math.round(n / 10) * 10;
    if (n < 10000) return Math.round(n / 50) * 50;
    var step = Math.pow(10, Math.floor(Math.log10(n)) - 1);
    return Math.round(n / step) * step;
  }

  /* Two a day, taken from the date so both phones show the same pair. */
  function pickMeasures(ms, dayIndex) {
    var order = shuffled(window.MEASURES || []);
    if (order.length < 2) return [];

    var start = ((dayIndex == null ? localDayIndex() : dayIndex) * 2) % order.length;

    var out = [];
    for (var i = 0; i < order.length && out.length < 2; i++) {
      var item = order[(start + i) % order.length];
      var count = ballpark(ms / (item.s * 1000));
      if (count >= 1) out.push({ count: count, unit: item.unit });
    }
    return out;
  }

  /* ---------------- the tick ---------------- */

  function tick() {
    var now = Date.now();

    /* midnight rolled over: new meme, new units */
    var today = localDayIndex(now);
    if (lastDayIndex !== null && today !== lastDayIndex) renderMeme();
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

    $('hero').classList.toggle('is-past', isPast);
    $('hero-eyebrow').textContent = isPast ? 'it has been' : 'counting down to';

    document.title = (isPast ? '' : compact(ms) + ' \u00b7 ') + hero.title;

    renderMeasures(ms);
    checkCelebrations(now);
    checkMilestones(now);

    /* clocks tick on the minute, no point redrawing every second */
    if (p.s === 0 || clocksStale) { renderClocks(); clocksStale = false; }
  }

  var clocksStale = true;

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
        date: when.toISOString(),
        /* the halfway milestone needs to know where the wait started */
        createdAt: Date.now()
      });
    }

    saveAndSync();
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
    saveAndSync();
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
    /* Events already sync on their own. This link is only for putting a new
       phone in the same room - so it still works with an empty calendar. */
    var key = window.SYNC ? SYNC.roomId() : '';
    if (!key && !events.length) return toast('Nothing to share yet');

    var url = location.origin + location.pathname + '#'
      + (key ? 'k=' + key : '')
      + (events.length ? (key ? '&' : '') + 'e=' + encodeEvents(events) : '');

    if (navigator.share) {
      navigator.share({ title: 'Hari & Pranavi', text: 'open this and add it to your home screen', url: url })
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
    var hash = location.hash;
    var k = /[#&]k=([A-Za-z0-9\-_]+)/.exec(hash);
    var m = /[#&]e=([^&]+)/.exec(hash);
    if (!k && !m) return;

    /* clean the hash straight away so a refresh does not re-prompt */
    history.replaceState(null, '', location.pathname + location.search);

    /* joining the room is what makes everything else keep itself in step */
    if (k) adoptRoom(k[1]);
    if (!m) return;

    var incoming;
    try { incoming = decodeEvents(m[1]); }
    catch (e) { return toast('That link looked broken'); }

    showImport(incoming);
  }

  /* Sync may already be running against a different room, or not running at
     all, so re-init either way. */
  function adoptRoom(key) {
    if (!window.SYNC || !SYNC.setRoom(key)) return;
    SYNC.init();
    if (SYNC.isReady()) {
      maybeAskWhoYouAre();
      SYNC.touch();
    }
    renderSyncBits();
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

    saveAndSync();
    closeImport();
    render();
    toast(mode === 'replace' ? 'Replaced' : 'Merged');
  }

  function key(e) { return e.title.toLowerCase() + '|' + Date.parse(e.date); }

  /* ---------------- the two clocks ---------------- */

  /* Each phone publishes its own timezone every time it's opened, so when he
     travels his clock here corrects itself with nothing to configure. */
  function renderClocks() {
    var me = members[seatOf('me')] || {};
    var them = members[seatOf('them')] || {};
    var section = $('clocks');

    if (!them.tz && !me.tz) { section.hidden = true; return; }
    section.hidden = false;

    var myTz = me.tz || deviceTz();
    var theirTz = them.tz || myTz;

    $('tz-me-name').textContent = me.name || 'you';
    $('tz-me-time').textContent = timeIn(myTz);
    $('tz-me-place').textContent = placeName(myTz);

    $('tz-them-name').textContent = them.name || 'them';
    $('tz-them-time').textContent = timeIn(theirTz);
    $('tz-them-place').textContent = placeName(theirTz);

    $('clock-me').classList.toggle('is-asleep', isNight(myTz));
    $('clock-them').classList.toggle('is-asleep', isNight(theirTz));

    $('tz-gap').textContent = gapLabel(myTz, theirTz);
  }

  function deviceTz() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
    catch (e) { return 'UTC'; }
  }

  function timeIn(tz) {
    try {
      return new Date().toLocaleTimeString([], {
        timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false
      });
    } catch (e) { return '--:--'; }
  }

  function isNight(tz) {
    var hour = hourIn(tz);
    return hour < 7 || hour >= 23;
  }

  function hourIn(tz) {
    try {
      return Number(new Date().toLocaleString('en-GB', {
        timeZone: tz, hour: '2-digit', hour12: false
      }).slice(0, 2));
    } catch (e) { return 12; }
  }

  /* "Europe/Paris" reads better as just "Paris" */
  function placeName(tz) {
    if (!tz) return '';
    var tail = tz.split('/').pop() || tz;
    return tail.replace(/_/g, ' ');
  }

  function gapLabel(a, b) {
    var diff = (offsetOf(b) - offsetOf(a)) / 60;
    if (!isFinite(diff) || Math.abs(diff) < 0.01) return 'same time';

    var sign = diff > 0 ? 'ahead' : 'behind';
    var mag = Math.abs(diff);
    var hours = Math.floor(mag);
    var mins = Math.round((mag - hours) * 60);

    return (mins ? hours + 'h' + pad(mins) : hours + 'h') + ' ' + sign;
  }

  /* Minutes that a zone sits from UTC, worked out by comparing a formatted
     wall clock against the same instant in UTC. */
  function offsetOf(tz) {
    try {
      var now = new Date();
      var local = new Date(now.toLocaleString('en-US', { timeZone: tz }));
      var utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
      return Math.round((local - utc) / 60000);
    } catch (e) { return 0; }
  }

  /* ---------------- statuses ---------------- */

  function seatOf(which) {
    if (!window.SYNC || !SYNC.hasSeat()) return which === 'me' ? 'a' : 'b';
    return which === 'me' ? SYNC.mySeat() : SYNC.otherSeat();
  }

  function renderStatuses() {
    var section = $('statuses');

    if (!window.SYNC || !SYNC.isReady() || !SYNC.hasSeat()) {
      section.hidden = true;
      return;
    }
    section.hidden = false;

    var me = members[seatOf('me')] || {};
    var them = members[seatOf('them')] || {};

    $('status-me-who').textContent = me.name || 'you';
    $('status-me-text').textContent = me.status || 'set your status';
    $('status-me-age').textContent = ago(me.statusAt);

    $('status-them-who').textContent = them.name || 'them';
    $('status-them-text').textContent = them.status || 'nothing yet';
    $('status-them-age').textContent = ago(them.statusAt);
  }

  function renderListening() {
    var section = $('listening');
    if (!section) return;

    if (!window.SYNC || !SYNC.isReady() || !SYNC.hasSeat() || !window.SPOTIFY || !SPOTIFY.configured()) {
      section.hidden = true;
      return;
    }
    section.hidden = false;

    fillListen($('listen-them'), members[seatOf('them')], false);
    fillListen($('listen-me'), members[seatOf('me')], true);

    var connect = $('spot-connect');
    connect.hidden = SPOTIFY.connected();
  }

  function fillListen(el, person, mine) {
    var info = (person || {}).listening;
    var fresh = window.SPOTIFY && SPOTIFY.isFresh(info);
    if (!fresh) {
      el.hidden = true;
      el.textContent = '';
      el.removeAttribute('href');
      return;
    }

    el.hidden = false;
    el.classList.toggle('is-paused', !info.playing);
    if (info.url) el.href = info.url;
    else el.removeAttribute('href');

    el.textContent = '';

    if (info.art) {
      var img = document.createElement('img');
      img.className = 'listen-art';
      img.alt = '';
      img.src = info.art;
      el.appendChild(img);
    }

    var main = document.createElement('div');
    main.className = 'listen-main';

    var who = document.createElement('span');
    who.className = 'listen-who';
    who.textContent = (mine ? 'you' : (person.name || 'them')) + (info.playing ? '' : ' · paused');

    var title = document.createElement('span');
    title.className = 'listen-title';
    title.textContent = info.title;

    var artist = document.createElement('span');
    artist.className = 'listen-artist';
    artist.textContent = info.artist || 'Spotify';

    main.appendChild(who);
    main.appendChild(title);
    main.appendChild(artist);
    el.appendChild(main);
  }

  function openSpot() {
    $('spot-input').value = '';
    $('spot-error').hidden = true;
    $('spot-disconnect').hidden = !(window.SPOTIFY && SPOTIFY.connected());
    $('spot-backdrop').hidden = false;
    $('spot').hidden = false;
  }

  function closeSpot() {
    $('spot').hidden = true;
    $('spot-backdrop').hidden = true;
  }

  function applySpotPaste() {
    var text = $('spot-input').value.trim();
    if (!text) {
      $('spot-error').textContent = 'Paste the address Safari sent you back to.';
      $('spot-error').hidden = false;
      return;
    }
    SPOTIFY.handleCallbackUrl(text).then(function (result) {
      if (result === 'ok') {
        closeSpot();
        renderListening();
        toast('Spotify connected');
        return;
      }
      var msg = {
        denied: 'You said no on Spotify.',
        'missing-verifier': 'Start from Open Spotify in this app first, then paste.',
        none: "That doesn't look like the address Spotify sent back."
      }[result] || "Couldn't connect - try Open Spotify again.";
      $('spot-error').textContent = msg;
      $('spot-error').hidden = false;
    });
  }

  /* Both names once both phones have said who they are. Sorted rather than
     me-first, so the header reads identically on each of them. */
  function renderBrand() {
    var names = ['a', 'b']
      .map(function (s) { return String((members[s] || {}).name || '').trim(); })
      .filter(Boolean)
      .sort(function (x, y) { return x.localeCompare(y); });

    if (names.length < 2) return;
    $('brand').textContent = names.join(' & ');
  }

  function ago(ts) {
    if (!ts) return '';
    var diff = Date.now() - ts;
    if (diff < 2 * MIN) return 'now';
    if (diff < HOUR) return Math.floor(diff / MIN) + 'm';
    if (diff < DAY) return Math.floor(diff / HOUR) + 'h';
    return Math.floor(diff / DAY) + 'd';
  }

  function openPicker() {
    var box = $('pick-groups');
    if (!box.childNodes.length) buildPicker(box);

    $('pick-input').value = '';
    $('pick-backdrop').hidden = false;
    $('pick').hidden = false;
  }

  function buildPicker(box) {
    (window.STATUSES || []).forEach(function (group) {
      var title = document.createElement('p');
      title.className = 'pick-group-title';
      title.textContent = group.group;

      var wrap = document.createElement('div');
      wrap.className = 'pick-options';

      group.items.forEach(function (text) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'pick-opt';
        b.textContent = text;
        b.addEventListener('click', function () { chooseStatus(text); });
        wrap.appendChild(b);
      });

      box.appendChild(title);
      box.appendChild(wrap);
    });
  }

  function closePicker() {
    $('pick').hidden = true;
    $('pick-backdrop').hidden = true;
  }

  function chooseStatus(text) {
    if (window.SYNC) SYNC.setStatus(text);
    closePicker();
    toast(text ? 'Status set' : 'Status cleared');

    if (text && window.PUSHER) {
      var me = members[seatOf('me')] || {};
      PUSHER.notify({
        title: me.name || 'us.',
        message: 'is now ' + text,
        /* one status per person on the lock screen, not a pile of them */
        tag: 'status-' + seatOf('me'),
        silent: partnerAsleep()
      });
    }
  }

  /* ---------------- feelings ---------------- */

  var mood = 0;
  var inbox = [];
  var customs = [];

  /* The ones they invent come first, because those are the ones that get
     used. Everything after is the built-in list. */
  function moodGroups() {
    return [{ group: 'custom', mine: true, items: customs }]
      .concat(window.FEELINGS || []);
  }

  function renderFeelings() {
    var section = $('feelings');

    if (!window.SYNC || !SYNC.isReady() || !SYNC.hasSeat() || !window.FEELINGS) {
      section.hidden = true;
      return;
    }
    section.hidden = false;

    if (!$('mood-tabs').childNodes.length) buildMoodTabs();
    renderMoodGrid();
    renderPushNote();
    renderThrows();
  }

  function buildMoodTabs() {
    var tabs = $('mood-tabs');

    moodGroups().forEach(function (group, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mood-tab' + (i === mood ? ' is-on' : '');
      b.textContent = group.group;
      b.addEventListener('click', function () {
        mood = i;
        [].forEach.call(tabs.children, function (el, j) {
          el.classList.toggle('is-on', j === i);
        });
        renderMoodGrid();
      });
      tabs.appendChild(b);
    });
  }

  function renderMoodGrid() {
    var grid = $('mood-grid');
    grid.textContent = '';

    var group = moodGroups()[mood];
    if (!group) return;

    group.items.forEach(function (item) {
      grid.appendChild(feelButton(item));
    });

    if (!group.mine) return;

    /* the way in to making one, sat at the end of your own row */
    var add = document.createElement('button');
    add.type = 'button';
    add.className = 'feel-btn is-add';
    add.textContent = group.items.length ? '+ another' : '+ make one';
    add.addEventListener('click', openFeelMaker);
    grid.appendChild(add);
  }

  function feelButton(item) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'feel-btn';

    var e = document.createElement('span');
    e.className = 'feel-emoji';
    e.textContent = item.e;

    var t = document.createElement('span');
    t.className = 'feel-text';
    t.textContent = item.t;

    b.appendChild(e);
    b.appendChild(t);
    b.addEventListener('click', function () { throwFeeling(item, b); });
    return b;
  }

  /* ---------------- feelings you make yourself ---------------- */

  function openFeelMaker() {
    $('feel-emoji').value = '';
    $('feel-text').value = '';
    $('feel-error').hidden = true;
    renderMyFeelings();
    $('feel-backdrop').hidden = false;
    $('feel').hidden = false;
    setTimeout(function () { $('feel-emoji').focus(); }, 60);
  }

  function closeFeelMaker() {
    $('feel').hidden = true;
    $('feel-backdrop').hidden = true;
  }

  function renderMyFeelings() {
    var ul = $('feel-mine');
    ul.textContent = '';

    customs.forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'feel-mine-row';

      var label = document.createElement('span');
      label.textContent = item.e + '  ' + item.t;

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'todo-del';
      del.setAttribute('aria-label', 'Remove');
      del.textContent = '\u00d7';
      del.addEventListener('click', function () { SYNC.removeCustom(item.id); });

      li.appendChild(label);
      li.appendChild(del);
      ul.appendChild(li);
    });
  }

  function saveFeeling() {
    var emoji = $('feel-emoji').value.trim();
    var text = $('feel-text').value.trim();

    /* no strict grapheme count here - flags and skin tones are several code
       points each - just enough to catch someone typing a word in the box */
    if (!emoji || /[A-Za-z0-9\s]/.test(emoji)) return feelError('Emoji goes in the first box.');
    if (!text) return feelError('And what should it say?');

    SYNC.addCustom(emoji, text).then(function (ok) {
      if (!ok) return feelError("Couldn't save that - check your signal.");
      $('feel-emoji').value = '';
      $('feel-text').value = '';
      $('feel-error').hidden = true;
      $('feel-emoji').focus();
    });
  }

  function feelError(msg) {
    var el = $('feel-error');
    el.textContent = msg;
    el.hidden = false;
  }

  function throwFeeling(item, button) {
    var me = members[seatOf('me')] || {};

    SYNC.addInbox({ emoji: item.e, text: item.t });

    if (window.PUSHER) {
      PUSHER.notify({
        title: (me.name || 'someone') + ' ' + item.e,
        message: item.t,
        tag: 'feeling',
        silent: partnerAsleep()
      });
    }

    button.classList.add('is-sent');
    setTimeout(function () { button.classList.remove('is-sent'); }, 260);
    if (navigator.vibrate) navigator.vibrate(12);
  }

  /* Notifications still arrive in the middle of his night, they just arrive
     quietly, so they're waiting rather than waking him. */
  function partnerAsleep() {
    var them = members[seatOf('them')] || {};
    return them.tz ? isNight(them.tz) : false;
  }

  function renderThrows() {
    var ul = $('throws');
    ul.textContent = '';

    var recent = inbox
      .sort(function (a, b) { return (b.at || 0) - (a.at || 0); })
      .slice(0, 2);

    recent.forEach(function (item) {
      var mine = item.by === seatOf('me');

      var li = document.createElement('li');
      li.className = 'throw-row' + (mine ? ' is-mine' : '');

      var who = document.createElement('span');
      who.className = 'throw-who';
      who.textContent = mine ? 'you' : ((members[item.by] || {}).name || 'them');

      var text = document.createElement('span');
      text.className = 'throw-text';
      text.textContent = (item.emoji ? item.emoji + ' ' : '') + item.text;

      var when = document.createElement('span');
      when.className = 'throw-when';
      when.textContent = ago(item.at);

      li.appendChild(who);
      li.appendChild(text);
      li.appendChild(when);
      ul.appendChild(li);
    });
  }

  /* ---------------- notification permission ---------------- */

  function renderPushNote() {
    var note = $('push-note');
    if (!note) return;

    if (!window.PUSHER) { note.hidden = true; return; }

    var state = PUSHER.state();
    /* once they're on, the prompt is gone. a quiet note stays only when
       something is actually wrong. */
    note.hidden = state === 'on' || state === 'ready' || state === 'off';

    if (state === 'needs-install') {
      note.textContent = 'Add this to your Home Screen and open it from there to get notifications. iPhones will not send them from a Safari tab.';
    } else if (state === 'unsupported') {
      note.textContent = "This browser can't do notifications. Everything still lands in the app.";
    } else if (state === 'blocked') {
      note.textContent = 'Notifications are blocked. Turn them back on in your phone settings for this app.';
    }
  }

  function askForPush() {
    PUSHER.enable().then(function (result) {
      renderPushNote();
      if (result === 'on') closeNotifyAsk();

      if (result === 'on') return toast('Notifications on');
      if (result === 'blocked') return toast('You said no - change it in settings');
      if (result === 'needs-install') return toast('Add to Home Screen first');
      if (result === 'error') return toast("Couldn't turn those on");
    });
  }

  /* Asked up front rather than left as a link nobody notices, but only when
     tapping it would actually do something, and never again once it has. */
  function maybeAskNotify() {
    if (!window.PUSHER || PUSHER.state() !== 'ready') return;
    if (Date.now() < snoozedUntil()) return;

    /* whatever else is on screen - first run, an incoming link - matters more */
    if (!$('hello').hidden || !$('import').hidden || !$('celebrate').hidden) return;

    $('notify-backdrop').hidden = false;
    $('notify').hidden = false;
  }

  function snoozedUntil() {
    try { return Number(localStorage.getItem(NOTIFY_KEY)) || 0; }
    catch (e) { return Infinity; }
  }

  function snoozeNotify() {
    try { localStorage.setItem(NOTIFY_KEY, String(Date.now() + 7 * DAY)); } catch (e) {}
    closeNotifyAsk();
  }

  function closeNotifyAsk() {
    $('notify').hidden = true;
    $('notify-backdrop').hidden = true;
  }

  /* ---------------- shared checklist ---------------- */

  function renderTodos() {
    var section = $('todo-section');

    if (!window.SYNC || !SYNC.isReady() || !SYNC.hasSeat()) {
      section.hidden = true;
      return;
    }
    section.hidden = false;

    var ul = $('todo-list');
    ul.textContent = '';

    var sorted = todos.slice().sort(function (x, y) {
      if (!!x.done !== !!y.done) return x.done ? 1 : -1;
      return (x.at || 0) - (y.at || 0);
    });

    $('todo-empty').hidden = sorted.length > 0;

    sorted.forEach(function (item) {
      var li = document.createElement('li');
      var row = document.createElement('div');
      row.className = 'todo-row' + (item.done ? ' is-done' : '');

      var box = document.createElement('input');
      box.type = 'checkbox';
      box.className = 'todo-check';
      box.checked = !!item.done;
      box.addEventListener('change', function () {
        SYNC.toggleListItem(item.id, box.checked);
      });

      var main = document.createElement('div');
      main.className = 'todo-main';

      var text = document.createElement('span');
      text.className = 'todo-text';
      text.textContent = item.text;

      var by = document.createElement('span');
      by.className = 'todo-by';
      by.textContent = nameOfSeat(item.by);

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'todo-del';
      del.setAttribute('aria-label', 'Remove');
      del.textContent = '\u00d7';
      del.addEventListener('click', function () { SYNC.removeListItem(item.id); });

      main.appendChild(text);
      main.appendChild(by);
      row.appendChild(box);
      row.appendChild(main);
      row.appendChild(del);
      li.appendChild(row);
      ul.appendChild(li);
    });
  }

  function nameOfSeat(seat) {
    var m = members[seat];
    if (!m || !m.name) return '';
    return (window.SYNC && seat === SYNC.mySeat()) ? 'you' : m.name;
  }

  function submitTodo(ev) {
    ev.preventDefault();
    var input = $('todo-input');
    var text = input.value.trim();
    if (!text) return;
    SYNC.addListItem(text);
    input.value = '';

    if (window.PUSHER) {
      var me = members[seatOf('me')] || {};
      PUSHER.notify({
        title: (me.name || 'someone') + ' added to the list',
        message: text,
        tag: 'list',
        silent: partnerAsleep()
      });
    }
  }

  /* ---------------- first run ---------------- */

  function maybeAskWhoYouAre() {
    if (!window.SYNC || !SYNC.isReady() || SYNC.hasSeat()) return;
    openHello();
  }

  function openHello() {
    $('hello-error').hidden = true;
    $('hello-backdrop').hidden = false;
    $('hello').hidden = false;
    setTimeout(function () { $('hello-name').focus(); }, 60);
  }

  function submitHello(ev) {
    ev.preventDefault();

    var name = $('hello-name').value.trim();
    if (!name) {
      $('hello-error').textContent = 'Need something to call you.';
      $('hello-error').hidden = false;
      return;
    }

    SYNC.claimSeat(name, function (ok) {
      if (!ok) {
        $('hello-error').textContent = "Couldn't reach the database - check your signal and try again.";
        $('hello-error').hidden = false;
        return;
      }
      closeHello();
      renderSyncBits();
      if (window.PUSHER) PUSHER.refresh();
      if (window.SPOTIFY) SPOTIFY.start();
      toast('Hello ' + name);
    });
  }

  function closeHello() {
    $('hello').hidden = true;
    $('hello-backdrop').hidden = true;
  }

  function renderSyncBits() {
    renderBrand();
    renderClocks();
    renderStatuses();
    renderListening();
    renderTodos();
    renderFeelings();

    /* the way back in for anyone who tapped "not now" */
    var unclaimed = !!(window.SYNC && SYNC.isReady() && !SYNC.hasSeat());
    $('foot-hello').hidden = !unclaimed;
  }

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
    var k = /[#&]k=([A-Za-z0-9\-_]+)/.exec(text);
    if (k) adoptRoom(k[1]);

    var m = /[#&]e=([A-Za-z0-9\-_]+)/.exec(text);
    var code = m ? m[1] : (/^[A-Za-z0-9\-_]+$/.test(text) ? text : null);

    if (!code) {
      if (k) { closePaste(); return toast('Connected'); }
      return pasteError("That doesn't look like one of our links.");
    }

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

  /* ---------------- milestones ---------------- */

  /* Marked once each, per event, so a long wait has a pulse instead of just
     grinding down. Keyed by event id so two trips don't share a milestone. */
  var MILESTONES = [
    { id: 'half', test: function (ms, total) { return total > 14 * DAY && ms <= total / 2; },
      kicker: 'halfway', title: 'HALFWAY', sub: 'downhill from here, allegedly' },
    { id: 'm30', days: 30, kicker: 'one month to go', title: '30 DAYS', sub: 'a whole month. we can do a month.' },
    { id: 'm14', days: 14, kicker: 'two weeks', title: '14 DAYS', sub: 'close enough to start a packing list' },
    { id: 'm10', days: 10, kicker: 'single digits soon', title: '10 DAYS', sub: 'double figures are over' },
    { id: 'm7', days: 7, kicker: 'one week', title: '7 DAYS', sub: 'this time next week.' },
    { id: 'm3', days: 3, kicker: 'three sleeps', title: '3 DAYS', sub: 'ok now it is happening' },
    { id: 'm1', days: 1, kicker: 'tomorrow', title: 'TOMORROW', sub: 'go to sleep. you will not.' }
  ];

  function checkMilestones(now) {
    /* don't bury the first-run prompt under confetti */
    if (!$('celebrate').hidden || !$('hello').hidden) return;

    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      var ms = Date.parse(e.date) - now;
      if (ms <= 0) continue;

      var total = e.createdAt ? Date.parse(e.date) - e.createdAt : 0;

      for (var j = 0; j < MILESTONES.length; j++) {
        var m = MILESTONES[j];
        var key = e.id + ':' + m.id;
        if (celebrated.indexOf(key) !== -1) continue;

        var hit = m.days
          ? (ms <= m.days * DAY && ms > (m.days * DAY) - DAY)
          : m.test(ms, total);

        if (hit) {
          markCelebrated(key);
          showCelebration(m.kicker + ' \u00b7 ' + e.title, m.title, m.sub);
          announceMilestone(key, m, e);
          return;
        }
      }
    }
  }

  /* Both phones work out milestones independently, so whichever notices first
     claims it and sends the one notification. */
  function announceMilestone(key, milestone, event) {
    if (!window.SYNC || !SYNC.isReady() || !SYNC.hasSeat() || !window.PUSHER) return;

    SYNC.claimOnce(key).then(function (mine) {
      if (!mine) return;
      PUSHER.notify({
        title: milestone.title + ' \u00b7 ' + event.title,
        message: milestone.sub,
        tag: 'milestone',
        silent: partnerAsleep()
      });
    });
  }

  /* ---------------- zero moment ---------------- */

  function celebrate(event) {
    markCelebrated(event.id);
    showCelebration(
      event.title,
      "HE'S HERE",
      window.JOKES.pickLine(0, Math.floor(Math.random() * 1e9))
    );
  }

  function showCelebration(kicker, title, sub) {
    $('celebrate-kicker').textContent = kicker;
    $('celebrate-title').textContent = title;
    $('celebrate-sub').textContent = sub;
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

  /* If a phone ever ends up running this script against an older cached page,
     a missing element must not take every other button down with it. */
  function on(id, type, fn) {
    var el = $(id);
    if (el) el.addEventListener(type, fn);
  }

  function wire() {
    on('add-btn', 'click', function () { openSheet(null); });
    on('empty-add', 'click', function () { openSheet(null); });
    on('share-btn', 'click', shareLink);

    on('event-form', 'submit', submit);
    on('f-cancel', 'click', closeSheet);
    on('f-delete', 'click', removeEvent);
    on('sheet-backdrop', 'click', closeSheet);

    on('empty-paste', 'click', openPaste);
    on('foot-paste', 'click', openPaste);
    on('paste-cancel', 'click', closePaste);
    on('paste-backdrop', 'click', closePaste);
    on('paste-clip', 'click', readClipboard);
    on('paste-go', 'click', applyPaste);

    on('status-me', 'click', openPicker);
    on('pick-cancel', 'click', closePicker);
    on('pick-backdrop', 'click', closePicker);
    on('pick-clear', 'click', function () { chooseStatus(''); });
    on('pick-form', 'submit', function (ev) {
      ev.preventDefault();
      var text = $('pick-input').value.trim();
      if (text) chooseStatus(text);
    });

    on('hello-form', 'submit', submitHello);
    on('hello-skip', 'click', closeHello);
    on('foot-hello', 'click', openHello);
    on('todo-form', 'submit', submitTodo);

    on('notify-yes', 'click', askForPush);
    on('notify-later', 'click', snoozeNotify);
    on('notify-backdrop', 'click', snoozeNotify);

    on('feel-cancel', 'click', closeFeelMaker);
    on('feel-backdrop', 'click', closeFeelMaker);
    on('feel-save', 'click', saveFeeling);
    on('feel-form', 'submit', function (ev) { ev.preventDefault(); saveFeeling(); });

    on('spot-connect', 'click', openSpot);
    on('spot-cancel', 'click', closeSpot);
    on('spot-backdrop', 'click', closeSpot);
    on('spot-login', 'click', function () { if (window.SPOTIFY) SPOTIFY.connect(); });
    on('spot-disconnect', 'click', function () {
      if (window.SPOTIFY) SPOTIFY.disconnect();
      closeSpot();
      renderListening();
      toast('Spotify disconnected');
    });
    on('spot-go', 'click', applySpotPaste);

    on('import-ignore', 'click', closeImport);
    on('import-backdrop', 'click', closeImport);
    on('import-merge', 'click', function () { applyImport('merge'); });
    on('import-replace', 'click', function () { applyImport('replace'); });

    on('celebrate-close', 'click', function () {
      $('celebrate').hidden = true;
      /* the event just moved into the past, so the ordering needs redoing */
      render();
    });

    on('list', 'click', function (ev) {
      var row = ev.target.closest('.row');
      if (!row) return;
      /* tap another date to put it on the timer; tap the one already
         showing, or the only one, to edit it */
      if (row.dataset.id === heroId || events.length === 1) {
        openSheet(byId(row.dataset.id));
      } else {
        pickedId = row.dataset.id;
        render();
      }
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Escape') return;
      closeSheet(); closeImport(); closePaste(); closePicker(); closeFeelMaker(); closeSpot();
    });

    /* phones freeze timers in the background - resync on return */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      render();
      clocksStale = true;
      /* republish the timezone: he may have landed somewhere new */
      if (window.SYNC) SYNC.touch();
      if (window.SPOTIFY) SPOTIFY.poll();
    });
  }

  function registerSW() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;

    /* Whether anything was already in charge. On a first install there is
       nothing to refresh, so the reload below must not fire. */
    var hadController = !!navigator.serviceWorker.controller;
    var refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController || refreshing) return;
      /* A newer version just took over. Reload so the page and the script
         running against it are from the same build - otherwise buttons can
         render without any code behind them. */
      refreshing = true;
      location.reload();
    });

    navigator.serviceWorker.register('sw.js')
      .then(function (reg) { reg.update(); })
      .catch(function () {});
  }

  /* ---------------- sync wiring ---------------- */

  var syncedOnce = false;

  /* Registered before anything can trigger a connection, so the first
     snapshots from the database aren't emitted into thin air. */
  function wireSyncHandlers() {
    if (!window.SYNC) return;

    SYNC.on('state', function (state) {
      if (state === 'unconfigured' || state === 'unavailable' || state === 'noroom') {
        /* no database, or no room yet: the app is exactly what it was before */
        $('clocks').hidden = true;
        $('statuses').hidden = true;
        $('todo-section').hidden = true;
        $('feelings').hidden = true;
        $('listening').hidden = true;
      }
    });

    SYNC.on('members', function (m) {
      members = m || {};
      renderSyncBits();
    });

    SYNC.on('list', function (items) {
      todos = items || [];
      renderTodos();
    });

    SYNC.on('inbox', function (items) {
      inbox = items || [];
      renderThrows();
    });

    SYNC.on('customs', function (items) {
      customs = (items || []).sort(function (x, y) { return (x.at || 0) - (y.at || 0); });
      if (mood === 0) renderMoodGrid();
      if (!$('feel').hidden) renderMyFeelings();
    });

    SYNC.on('events', function (remote) {
      /* First payload decides which way things flow: if the room is empty but
         this phone has events, seed the room from here. Otherwise the room
         wins, so both phones converge instead of arguing. */
      if (!syncedOnce && !remote.length && events.length) {
        syncedOnce = true;
        SYNC.pushEvents(events);
        return;
      }
      syncedOnce = true;

      events = remote.map(function (e) {
        return {
          id: e.id,
          title: e.title,
          emoji: e.emoji || '',
          date: e.date,
          createdAt: e.createdAt || 0
        };
      }).filter(valid);

      save();
      render();
    });
  }

  function startSync() {
    if (!window.SYNC || SYNC.isReady()) return;

    SYNC.init();

    if (SYNC.isReady()) {
      maybeAskWhoYouAre();
      SYNC.touch();
      /* push subscriptions rotate silently, so re-file ours on every open */
      if (window.PUSHER) PUSHER.refresh();
      if (window.SPOTIFY) SPOTIFY.start();
    }
    renderSyncBits();
  }

  /* Events live in the room when sync is up, so pushing after every change
     keeps the other phone current without anyone sending a link. */
  function saveAndSync() {
    save();
    if (window.SYNC && SYNC.isReady() && SYNC.hasSeat()) SYNC.pushEvents(events);
  }

  function init() {
    celebrated = celebratedIds();
    load();
    wire();
    wireSyncHandlers();
    checkIncoming();
    if (window.SPOTIFY) {
      SPOTIFY.finishFromLocation().then(function (result) {
        if (result === 'ok') toast('Spotify connected');
        else if (result === 'denied') toast('Spotify login cancelled');
        else if (result && result !== 'none') toast("Couldn't connect Spotify");
        renderListening();
      });
    }
    render();
    setInterval(tick, SECOND);
    startSync();
    registerSW();

    /* after the first paint, so it lands on the app rather than a blank page */
    setTimeout(maybeAskNotify, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
