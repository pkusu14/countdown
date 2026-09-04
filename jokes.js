/* Funny content, kept away from the logic so you can edit freely.
   Add lines to any bucket, or add whole new stats. Nothing here needs
   to be kept in sync with anything else. */

(function () {
  'use strict';

  var MIN = 60 * 1000;
  var HOUR = 60 * MIN;
  var DAY = 24 * HOUR;
  var WEEK = 7 * DAY;

  /* Lines bucketed by how far away it is, so the tone matches the panic level. */
  var LINES = {
    /* under an hour */
    imminent: [
      'this is not a drill. this is not a drill.',
      'stop reading this. go check your hair.',
      'i have refreshed this page nine times in the last minute and i regret nothing.',
      'currently pacing. will continue pacing.',
      'ok everybody be cool. BE COOL.',
      'the countdown has minutes left and i have zero composure left.',
      'i have practiced what i am going to say. i will say none of it.'
    ],

    /* under a day */
    today: [
      'today. TODAY. today today today.',
      'i am legally required to tell everyone i meet about this.',
      'slept badly. worth it. would sleep badly again.',
      'packing for a few days like i am relocating permanently.',
      'my productivity today is a rounding error.',
      'hours. we are down to HOURS.',
      'have already checked the arrival time four times. it has not changed.'
    ],

    /* under a week */
    thisweek: [
      'close enough to start doing laundry with intent.',
      'this is the good part of the wait. the smug part.',
      'i can now say "next week" and it is technically true.',
      'single digit days. i am basically already there.',
      'have begun mentally rehearsing the hug. it is going great.',
      'the calendar and i are finally on speaking terms.'
    ],

    /* under a month */
    soonish: [
      'close enough to be excited, far enough to be annoying about it.',
      'i have started counting in weekends and it helps a little.',
      'checking this app has replaced most of my hobbies.',
      'far enough away to be rude, close enough to be survivable.',
      'somewhere between "soon" and "not soon enough", leaning heavily on the second one.',
      'i keep doing the maths differently hoping for a better answer.'
    ],

    /* under six months */
    faraway: [
      'the number is large and my patience is not.',
      'i have decided this is fine. i am lying.',
      'this is the part where i become insufferable about time zones.',
      'staring at this number like it owes me something.',
      'have considered simply making the date sooner. was informed this is not how time works.',
      'in the meantime i will be here. refreshing. always refreshing.'
    ],

    /* six months and beyond */
    eternity: [
      'ok this one is just cruel.',
      'that is not a countdown, that is a sentence.',
      'i will be a different person by then. still yours though.',
      'have started measuring this in seasons. bad sign.',
      'the good news is it goes down by one every single day. the bad news is everything else.'
    ],

    /* already happened */
    past: [
      'and it was worth every single one of those seconds.',
      'best thing on this whole page.',
      'i would do the entire wait again. quietly complaining the whole time, but i would do it.',
      'filed permanently under: good day.',
      'still thinking about it, obviously.'
    ]
  };

  /* Deadpan stat cards. value() gets { ms, days, opens, event } and returns a string. */
  var STATS = [
    {
      label: 'times you opened this today',
      value: function (c) { return String(c.opens); }
    },
    {
      label: 'times I have recalculated this in my head',
      /* an absurd but stable number, so it does not flicker on every tick */
      value: function (c) { return String(Math.max(3, c.days * 47 + 12)); }
    },
    {
      label: 'sleeps, roughly',
      value: function (c) { return String(Math.max(0, Math.ceil(c.ms / DAY))); }
    },
    {
      label: 'percent of my personality that is now this countdown',
      value: function (c) { return String(Math.min(98, 41 + (c.days % 55))) + '%'; }
    },
    {
      label: 'texts drafted and not sent',
      value: function (c) { return String(6 + (c.days * 3) % 31); }
    },
    {
      label: 'weekends in the way',
      value: function (c) { return String(Math.max(0, Math.floor(c.days / 7))); }
    },
    {
      label: 'hours I could have spent doing something useful',
      value: function (c) { return String(11 + (c.days * 7) % 90); }
    },
    {
      label: 'people who are tired of hearing about this',
      value: function (c) { return String(2 + (c.days % 9)); }
    }
  ];

  function bucketFor(ms) {
    if (ms <= 0) return 'past';
    if (ms < HOUR) return 'imminent';
    if (ms < DAY) return 'today';
    if (ms < WEEK) return 'thisweek';
    if (ms < 30 * DAY) return 'soonish';
    if (ms < 182 * DAY) return 'faraway';
    return 'eternity';
  }

  /* seed keeps the line stable for a whole session instead of changing every tick */
  function pickLine(ms, seed) {
    var pool = LINES[bucketFor(ms)] || LINES.soonish;
    return pool[Math.abs(seed) % pool.length];
  }

  /* Plain-language summary under the clock. */
  function humanize(ms, isPast) {
    var abs = Math.abs(ms);
    var days = Math.floor(abs / DAY);
    var hours = Math.floor(abs / HOUR);
    var mins = Math.floor(abs / MIN);
    var tail = isPast ? ' ago' : ' away';

    if (abs < MIN) return isPast ? 'just now' : 'any second now';
    if (abs < HOUR) return mins + (mins === 1 ? ' minute' : ' minutes') + tail;
    if (abs < DAY) return hours + (hours === 1 ? ' hour' : ' hours') + tail;
    if (days === 1) return isPast ? 'yesterday' : 'tomorrow';
    if (days < 14) return days + ' days' + tail;

    if (days < 60) {
      var weekends = Math.floor(days / 7);
      return days + ' days' + tail + ' \u2014 about ' + weekends +
        (weekends === 1 ? ' weekend' : ' weekends');
    }

    var months = Math.round(days / 30.44);
    return days + ' days' + tail + ' \u2014 roughly ' + months +
      (months === 1 ? ' month' : ' months');
  }

  function statsFor(ctx, seed) {
    var n = STATS.length;
    var a = Math.abs(seed) % n;
    var b = (a + 1 + (Math.abs(seed >> 3) % (n - 1))) % n;
    return [STATS[a], STATS[b]].map(function (s) {
      return { label: s.label, value: s.value(ctx) };
    });
  }

  window.JOKES = {
    pickLine: pickLine,
    humanize: humanize,
    statsFor: statsFor,
    bucketFor: bucketFor
  };
})();
