/* Live sync over Firebase Realtime Database.
 *
 * Deliberately optional. If the config is missing, the SDK fails to load, or
 * there is no signal, every function here quietly no-ops and the app carries
 * on running from local storage. Nothing in the UI may assume sync exists.
 *
 * Shape of the data:
 *   rooms/<room>/members/<seat>  { name, status, statusAt, tz, seenAt }
 *   rooms/<room>/list/<id>       { text, done, by, at }
 *   rooms/<room>/events/<id>     { title, emoji, date }
 *   rooms/<room>/customs/<id>    { e, t, by, at }
 */

(function () {
  'use strict';

  var db = null;
  var room = null;
  var seat = null;
  var ready = false;

  var handlers = { members: [], list: [], events: [], inbox: [], customs: [], state: [] };

  var SEAT_KEY = 'us.seat.v1';
  var ROOM_KEY = 'us.room.v1';

  var app = null;

  function emit(kind, payload) {
    handlers[kind].forEach(function (fn) {
      try { fn(payload); } catch (e) {}
    });
  }

  function on(kind, fn) {
    if (handlers[kind]) handlers[kind].push(fn);
  }

  /* ---------------- startup ---------------- */

  function roomId() {
    try { return localStorage.getItem(ROOM_KEY) || ''; }
    catch (e) { return ''; }
  }

  /* Adopting a room from a link. Returns true if this is a change worth
     reconnecting for. */
  function setRoom(id) {
    id = String(id || '').trim();
    if (!/^[A-Za-z0-9\-_]{6,64}$/.test(id)) return false;
    if (id === roomId()) return false;

    try { localStorage.setItem(ROOM_KEY, id); } catch (e) { return false; }

    /* a different room means a different pair of seats */
    localStorage.removeItem(SEAT_KEY);
    seat = null;
    return true;
  }

  function init() {
    var cfg = window.FIREBASE_CONFIG;

    if (!cfg || !cfg.databaseURL) return report('unconfigured');
    if (!window.firebase || !firebase.database) return report('unavailable');
    if (!roomId()) return report('noroom');

    if (!app) {
      try {
        app = firebase.initializeApp(cfg);
        db = firebase.database();
      } catch (e) {
        return report('unavailable');
      }

      db.ref('.info/connected').on('value', function (snap) {
        report(snap.val() ? 'online' : 'offline');
      });
    }

    /* drop any previous room's listeners before moving */
    if (room) room.off();

    room = db.ref('rooms/' + roomId());
    seat = localStorage.getItem(SEAT_KEY);
    ready = true;

    room.child('members').on('value', function (snap) {
      emit('members', snap.val() || {});
    });

    room.child('list').on('value', function (snap) {
      emit('list', toArray(snap.val()));
    });

    room.child('events').on('value', function (snap) {
      emit('events', toArray(snap.val()));
    });

    room.child('customs').on('value', function (snap) {
      emit('customs', toArray(snap.val()));
    });

    /* only today's worth is ever interesting, and it keeps the payload small */
    room.child('inbox').orderByKey().limitToLast(40).on('value', function (snap) {
      emit('inbox', toArray(snap.val()));
    });

    if (seat) touch();
  }

  function report(state) {
    emit('state', state);
  }

  function toArray(obj) {
    if (!obj) return [];
    return Object.keys(obj).map(function (id) {
      var v = obj[id] || {};
      v.id = id;
      return v;
    });
  }

  /* ---------------- who am i ---------------- */

  function hasSeat() { return !!seat; }
  function mySeat() { return seat; }
  function otherSeat() { return seat === 'a' ? 'b' : 'a'; }

  /* Takes back the seat already under this name if there is one, so
     reinstalling doesn't evict your partner. Otherwise takes whichever side
     is free. */
  function claimSeat(name, done) {
    if (!ready) return done && done(false);

    var settled = false;
    function finish(ok) {
      if (settled) return;
      settled = true;
      done && done(ok);
    }

    /* offline, the read below never resolves - don't leave them staring at it */
    setTimeout(function () { finish(false); }, 8000);

    var wanted = String(name || '').trim().slice(0, 24);

    room.child('members').once('value').then(function (snap) {
      var members = snap.val() || {};

      var same = function (s) {
        return members[s] && String(members[s].name || '').toLowerCase() === wanted.toLowerCase();
      };

      var pick = same('a') ? 'a'
        : same('b') ? 'b'
        : !members.a ? 'a'
        : !members.b ? 'b'
        : 'b';

      seat = pick;
      localStorage.setItem(SEAT_KEY, seat);

      room.child('members/' + seat).update({
        name: wanted,
        tz: timezone(),
        seenAt: Date.now()
      }).then(function () { finish(true); })
        .catch(function () { finish(false); });
    }).catch(function () { finish(false); });
  }

  function releaseSeat() {
    localStorage.removeItem(SEAT_KEY);
    seat = null;
  }

  /* ---------------- publishing ---------------- */

  function timezone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; }
    catch (e) { return ''; }
  }

  /* Called on every open, so his clock follows him when he travels. */
  function touch() {
    if (!ready || !seat) return;
    room.child('members/' + seat).update({
      tz: timezone(),
      seenAt: Date.now()
    }).catch(function () {});
  }

  function setStatus(text) {
    if (!ready || !seat) return;
    room.child('members/' + seat).update({
      status: String(text || '').slice(0, 80),
      statusAt: Date.now(),
      tz: timezone(),
      seenAt: Date.now()
    }).catch(function () {});
  }

  function setName(name) {
    if (!ready || !seat) return;
    room.child('members/' + seat).update({
      name: String(name || '').slice(0, 24)
    }).catch(function () {});
  }

  function setListening(info) {
    if (!ready || !seat) return;
    room.child('members/' + seat + '/listening').set(info).catch(function () {});
  }

  function clearListening() {
    if (!ready || !seat) return;
    room.child('members/' + seat + '/listening').remove().catch(function () {});
  }

  /* ---------------- push ---------------- */

  function setPush(subscription) {
    if (!ready || !seat) return Promise.resolve(false);
    return room.child('members/' + seat + '/push').set(subscription)
      .then(function () { return true; })
      .catch(function () { return false; });
  }

  function clearPush() {
    if (!ready || !seat) return;
    room.child('members/' + seat + '/push').remove().catch(function () {});
  }

  /* ---------------- the back and forth ---------------- */

  function addInbox(item) {
    if (!ready || !seat) return;

    item.by = seat;
    item.at = Date.now();
    room.child('inbox').push(item).catch(function () {});

    /* push ids sort chronologically, so keeping the last 40 by key needs no
       index and no timestamp query */
    room.child('inbox').orderByKey().once('value')
      .then(function (snap) {
        var extra = snap.numChildren() - 40;
        if (extra <= 0) return;
        snap.forEach(function (child) {
          if (extra-- > 0) child.ref.remove();
        });
      })
      .catch(function () {});
  }

  /* Buttons the two of them invent. Shared, so either can make one and both
     get it. */
  function addCustom(emoji, text) {
    if (!ready) return Promise.resolve(false);
    return room.child('customs').push({
      e: String(emoji || '').slice(0, 8),
      t: String(text || '').slice(0, 40),
      by: seat || '?',
      at: Date.now()
    }).then(function () { return true; })
      .catch(function () { return false; });
  }

  function removeCustom(id) {
    if (!ready) return;
    room.child('customs/' + id).remove().catch(function () {});
  }

  /* First phone to claim a milestone is the one that announces it, so the
     other doesn't send a duplicate. */
  function claimOnce(key) {
    if (!ready) return Promise.resolve(false);

    return room.child('claims/' + key).transaction(function (current) {
      return current === null ? Date.now() : undefined;
    }).then(function (res) {
      return !!res.committed;
    }).catch(function () { return false; });
  }

  /* ---------------- the shared list ---------------- */

  function addListItem(text) {
    if (!ready) return;
    room.child('list').push({
      text: String(text || '').slice(0, 120),
      done: false,
      by: seat || '?',
      at: Date.now()
    }).catch(function () {});
  }

  function toggleListItem(id, done) {
    if (!ready) return;
    room.child('list/' + id).update({ done: !!done }).catch(function () {});
  }

  function removeListItem(id) {
    if (!ready) return;
    room.child('list/' + id).remove().catch(function () {});
  }

  /* ---------------- events ---------------- */

  function pushEvents(list) {
    if (!ready) return;

    var payload = {};
    list.forEach(function (e) {
      payload[e.id] = {
        title: e.title,
        emoji: e.emoji || '',
        date: e.date,
        createdAt: e.createdAt || Date.now()
      };
    });

    room.child('events').set(payload).catch(function () {});
  }

  function removeEvent(id) {
    if (!ready) return;
    room.child('events/' + id).remove().catch(function () {});
  }

  window.SYNC = {
    init: init,
    on: on,
    isReady: function () { return ready; },
    roomId: roomId,
    setRoom: setRoom,
    hasSeat: hasSeat,
    mySeat: mySeat,
    otherSeat: otherSeat,
    claimSeat: claimSeat,
    releaseSeat: releaseSeat,
    touch: touch,
    setStatus: setStatus,
    setName: setName,
    setListening: setListening,
    clearListening: clearListening,
    setPush: setPush,
    clearPush: clearPush,
    addInbox: addInbox,
    addCustom: addCustom,
    removeCustom: removeCustom,
    claimOnce: claimOnce,
    addListItem: addListItem,
    toggleListItem: toggleListItem,
    removeListItem: removeListItem,
    pushEvents: pushEvents,
    removeEvent: removeEvent,
    timezone: timezone
  };
})();
