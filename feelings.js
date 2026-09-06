/* The spam buttons. Tapping one lands on the other phone as a notification.

   Rewrite anything here freely - it's just text. `e` is the emoji on the
   button, `t` is what he actually reads. Keep `t` short; a lock screen clips
   it at roughly forty characters.

   The "custom" tab is not in here. Those get made in the app and live in the
   database, so whatever one of you adds shows up on the other phone. */

window.FEELINGS = [
  {
    group: 'flirty',
    items: [
      { e: '😏', t: 'thinking about you again' },
      { e: '🔥', t: 'unwell. about you. specifically.' },
      { e: '💋', t: 'come here' },
      { e: '👀', t: 'stop looking like that' },
      { e: '😈', t: 'behaving. barely.' },
      { e: '🥵', t: "you're a problem" },
      { e: '🫠', t: 'melting, thanks for that' },
      { e: '🛏️', t: 'bed is too big without you' },
      { e: '🤲', t: 'need to be held immediately' },
      { e: '🫦', t: 'i have plans and they involve you' }
    ]
  },
  {
    group: 'feral',
    items: [
      { e: '😤', t: 'MISS YOU' },
      { e: '🐺', t: 'howling' },
      { e: '🤡', t: 'being so normal about this' },
      { e: '💥', t: 'screaming' },
      { e: '🚨', t: 'emergency: no you' },
      { e: '🪦', t: 'dying about it' },
      { e: '📉', t: 'mental state: declining' },
      { e: '⏳', t: 'the distance is a personal insult' },
      { e: '🛫', t: 'thinking about the airport again' },
      { e: '🧱', t: 'chewing the wall' }
    ]
  },
  {
    group: 'soft',
    items: [
      { e: '🥺', t: 'miss you' },
      { e: '🤍', t: 'first thought was you, obviously' },
      { e: '🫂', t: 'need a hug' },
      { e: '☕', t: 'wish you were here' },
      { e: '🌙', t: 'goodnight, love you' },
      { e: '☀️', t: 'good morning' },
      { e: '🧸', t: 'be nice to yourself today' },
      { e: '💐', t: 'proud of you' },
      { e: '🫧', t: 'no reason. just you.' },
      { e: '🪟', t: 'look outside. same sky.' }
    ]
  },
  {
    group: 'stupid',
    items: [
      { e: '🗿', t: 'hi' },
      { e: '🧠', t: 'pedantle. now.' },
      { e: '🍜', t: 'hungry. thought of you.' },
      { e: '📞', t: 'answer your phone' },
      { e: '🦆', t: 'quack' },
      { e: '👻', t: 'nothing. just bothering you.' },
      { e: '🛒', t: 'added you to cart' },
      { e: '🧦', t: 'thinking about your stupid face' },
      { e: '🐌', t: 'time is broken' },
      { e: '🥴', t: 'no thoughts. you.' }
    ]
  },
  {
    group: 'real',
    items: [
      { e: '🎧', t: 'send me a song' },
      { e: '📖', t: 'tell me about your day' },
      { e: '🫗', t: 'how are you actually' },
      { e: '🧭', t: 'thinking about the trip' },
      { e: '🛟', t: "i'm here" },
      { e: '📝', t: 'wrote something for you' },
      { e: '🌍', t: 'wherever you are, hi' },
      { e: '🔋', t: 'running low, need you' },
      { e: '🤝', t: 'can we talk later' },
      { e: '🕯️', t: 'hope today was gentle' }
    ]
  }
];
