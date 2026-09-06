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
    if (!events.length) return toast('Nothing to share yet');

    /* the room name rides along so he joins the same room without typing it,
       and so it never has to live in the source */
    var key = window.SYNC ? SYNC.roomId() : '';
    var url = location.origin + location.pathname + '#'
      + (key ? 'k=' + key + '&' : '') + 'e=' + encodeEvents(events);

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
      toast('Hello ' + name);
    });
  }

  function closeHello() {
    $('hello').hidden = true;
    $('hello-backdrop').hidden = true;
  }

  function renderSyncBits() {
    renderClocks();
    renderStatuses();
    renderTodos();

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
          return;
        }
      }
    }
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
      if (row) openSheet(byId(row.dataset.id));
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { closeSheet(); closeImport(); closePaste(); closePicker(); }
    });

    /* phones freeze timers in the background - resync on return */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      render();
      clocksStale = true;
      /* republish the timezone: he may have landed somewhere new */
      if (window.SYNC) SYNC.touch();
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
    countOpen();
    celebrated = celebratedIds();
    load();
    wire();
    wireSyncHandlers();
    checkIncoming();
    render();
    setInterval(tick, SECOND);
    startSync();
    registerSW();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
