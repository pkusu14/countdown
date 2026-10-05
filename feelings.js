/* The spam buttons. Tapping one lands on the other phone as a notification.

   Rewrite anything here freely - it's just text. `e` is the emoji on the
   button, `t` is what he actually reads. Keep `t` short; a lock screen clips
   it at roughly forty characters.

   Each group holds more than the grid shows. Every time a countdown ends the
   app deals a fresh ten from each group, same hand on both phones.

   The "custom" tab is not in here. Those get made in the app and live in the
   database, so whatever one of you adds shows up on the other phone. */

window.FEELINGS = [
  {
    group: 'flirty',
    items: [
      { e: '😏', t: 'you crossed my mind. stayed there.' },
      { e: '🔥', t: 'thinking about you in HD' },
      { e: '💋', t: 'come here. now. thanks.' },
      { e: '👀', t: 'send a picture. for science.' },
      { e: '😈', t: 'i have ideas' },
      { e: '🥵', t: 'the distance is making me thirsty' },
      { e: '🫠', t: 'melted. your fault.' },
      { e: '🛏️', t: 'your side of the bed misses you' },
      { e: '🤲', t: 'hold me. emotionally and physically.' },
      { e: '🫦', t: 'save your kisses, i want all of them' },
      { e: '💅', t: 'i look good today. pity.' },
      { e: '🍑', t: 'reminder: i exist and i am cute' },
      { e: '🧲', t: 'come closer. like 6,600 km closer.' },
      { e: '🌶️', t: 'spicy thought incoming, brace' },
      { e: '💌', t: 'i like you. disgusting.' },
      { e: '🫣', t: 'i just thought something rude' }
    ]
  },
  {
    group: 'feral',
    items: [
      { e: '😤', t: 'MISS YOU. AGGRESSIVELY.' },
      { e: '🐺', t: 'awooo (romantically)' },
      { e: '🤡', t: 'totally fine without you (lie)' },
      { e: '💥', t: 'brain exploded about you' },
      { e: '🚨', t: 'code red: insufficient you' },
      { e: '🪦', t: 'deceased. cause: missing you.' },
      { e: '📉', t: 'sanity stocks crashing' },
      { e: '⏳', t: 'time zones are a hate crime' },
      { e: '🛫', t: 'refreshing flight prices again' },
      { e: '🧱', t: 'licking the wall, emotionally' },
      { e: '🦖', t: 'RAWR (affectionate)' },
      { e: '🌪️', t: 'chaos levels: critical' },
      { e: '🥊', t: 'fighting the distance. winning?' },
      { e: '🫨', t: 'vibrating about you' },
      { e: '🐒', t: 'going ape about you' },
      { e: '📢', t: 'ATTENTION. I LOVE YOU. OVER.' }
    ]
  },
  {
    group: 'soft',
    items: [
      { e: '🥺', t: 'miss your face' },
      { e: '🤍', t: 'thinking of you, softly' },
      { e: '🫂', t: 'sending one (1) hug' },
      { e: '☕', t: 'made two coffees out of habit' },
      { e: '🌙', t: 'sleep well, i love you' },
      { e: '☀️', t: 'good morning, gorgeous' },
      { e: '🧸', t: 'be gentle with yourself today' },
      { e: '💐', t: 'so proud of you' },
      { e: '🫧', t: 'just wanted to say hi, softly' },
      { e: '🪟', t: 'same moon, different window' },
      { e: '🍵', t: 'drink water. i love you.' },
      { e: '🌷', t: 'you make everything better' },
      { e: '🐣', t: 'small hug, big feelings' },
      { e: '🕊️', t: 'thinking of you, peacefully' },
      { e: '💛', t: 'you are my favourite person' },
      { e: '🌻', t: 'today is better because of you' }
    ]
  },
  {
    group: 'stupid',
    items: [
      { e: '🗿', t: 'yo' },
      { e: '🧠', t: 'pedantle. now. i am winning.' },
      { e: '🍜', t: 'ate. thought of you. ate more.' },
      { e: '📞', t: 'pick up the phone, coward' },
      { e: '🦆', t: 'quack quack (urgent)' },
      { e: '👻', t: 'boo. just haunting you.' },
      { e: '🛒', t: 'added you to cart. checking out.' },
      { e: '🧦', t: 'lost a sock, found feelings' },
      { e: '🐌', t: 'time is moving like this' },
      { e: '🥴', t: 'no thoughts, head empty, you' },
      { e: '🐸', t: 'ribbit. means i miss you.' },
      { e: '🍌', t: 'banana. no context.' },
      { e: '🦐', t: 'shrimply thinking of you' },
      { e: '🐝', t: 'bee mine. it is a pun.' },
      { e: '🥔', t: 'feeling like a potato. a cute one.' },
      { e: '🧀', t: 'you are the cheese to my pizza' }
    ]
  },
  {
    group: 'real',
    items: [
      { e: '🎧', t: 'send me the song you are on' },
      { e: '📖', t: 'tell me one thing about your day' },
      { e: '🫗', t: 'how are you, honestly' },
      { e: '🧭', t: 'planning our next trip in my head' },
      { e: '🛟', t: 'here if you need me' },
      { e: '📝', t: 'i wrote you something' },
      { e: '🌍', t: 'wherever you are, i am with you' },
      { e: '🔋', t: 'low battery, need a call' },
      { e: '🤝', t: 'can we talk tonight?' },
      { e: '🕯️', t: 'hope today was kind to you' },
      { e: '🍽️', t: 'did you eat? properly?' },
      { e: '😴', t: 'go to sleep, i mean it' },
      { e: '📸', t: 'send me what you can see right now' },
      { e: '🗓️', t: 'let us plan the next visit' },
      { e: '🧘', t: 'breathe. you are doing great.' },
      { e: '💬', t: 'call me when you are free' }
    ]
  }
];
