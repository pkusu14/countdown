/* The status list. Add, delete or rewrite anything here freely - it's just
   text, and nothing else in the app depends on the wording.

   Each group holds more than the picker shows. Every time a countdown ends
   the app deals a fresh eight from each group, so the list shifts a little
   after every visit. Both phones deal the same hand.

   Groups show as headings in the picker. Keep lines short; long ones get
   clipped on the pill. */

window.STATUSES = [
  {
    group: 'awake',
    items: [
      'awake and already unwell',
      'conscious against my will',
      'my alarm said your name, probably',
      'up. vertical. barely.',
      'woke up yearning, as is tradition',
      'caffeine first, feelings second',
      'awake and checking if you texted',
      'alive, upright, insufferable',
      'morning person (lie)',
      'brushing my teeth, thinking of you',
      'awake and plotting',
      'rose from the dead for this',
      'awake. no thoughts. one thought.',
      'up early to miss you for longer'
    ]
  },
  {
    group: 'asleep',
    items: [
      'asleep, yours, do not disturb',
      'unconscious, do not perceive me',
      'dreaming in your direction',
      'gone. horizontal. smitten.',
      'cuddling a pillow named after you',
      'sleeping on your side of the bed',
      'asleep with the countdown open',
      'logged off. dreams: you.',
      'pretending to sleep, actually scrolling',
      'out cold, snoring romantically',
      'asleep. wake me when you land.',
      'tucked in, slightly feral',
      'sleep mode: yearning edition',
      'one sock on, dreaming of you'
    ]
  },
  {
    group: 'working',
    items: [
      'in a meeting, mentally in your arms',
      'technically working',
      'nodding in a call, thinking about you',
      'working hard (hardly working)',
      'replying "noted" to things i did not read',
      'pretending this spreadsheet is you',
      'on mute, sighing about you',
      'deadline-ing. send snacks.',
      'typing words, none of them to you',
      'busy being a professional, ew',
      'my camera is off for a reason',
      'at my desk, at my limit',
      'earning money for flights',
      'corporate outside, yours inside'
    ]
  },
  {
    group: 'missing you',
    items: [
      'missing you in surround sound',
      'scrolling up to our first messages again',
      'looking at your photos again. sorry.',
      'doing the countdown maths again',
      'smelling the hoodie. no comment.',
      'staring into the middle distance, about you',
      'counting sleeps like a child',
      'listening to our songs, badly',
      'replaying the arrivals gate in my head',
      'drafting texts i will absolutely send',
      'missing you, but make it cute',
      'checking flight prices recreationally',
      'quietly losing it about you',
      'there is a you-shaped hole in today'
    ]
  },
  {
    group: 'flirty',
    items: [
      'my thoughts are not safe for work',
      'your voice is living in my head rent free',
      'picturing you here, getting nothing done',
      'on my best behaviour (temporary)',
      'in urgent need of being squished',
      'clingy and unashamed',
      'dressed up for nobody. come see.',
      'very kissable today, just so you know',
      'thinking about your face. not moving on.',
      'hot and bothered by the distance',
      'saving my kisses, interest is accruing',
      'would let you ruin my hair',
      'down bad and proud of it',
      'ask me what i am thinking. i dare you.'
    ]
  },
  {
    group: 'busy',
    items: [
      'out and about, mentally holding your hand',
      'eating cereal for dinner, do not tell',
      'buying groceries for one, tragically',
      'in transit, staring out windows dramatically',
      'socialising. would rather be in your lap.',
      'at the gym, building arms to hold you with',
      'cooking badly, plating confidently',
      'shopping for things to show you',
      'walking around like a music video',
      'outside, touching grass, missing you',
      'ordered coffee for two, drinking both',
      'buying snacks for when you are here',
      'watching a film without you (cheating)',
      'saw a dog. thought of you. both cute.'
    ]
  },
  {
    group: 'chaotic',
    items: [
      'spiralling, but scenic',
      'brain: empty. heart: full. phone: 4%',
      'acting normal, failing',
      'villain era, romantic subplot',
      'cried at an advert, doing great',
      'being brave about the distance (sobbing)',
      'telling strangers about you again',
      'feral. do not approach. do approach.',
      'emotionally on a rollercoaster',
      'talking to myself, it is going well',
      'raccoon mode activated',
      'chaos, but in a loving way',
      'sending memes as a coping mechanism',
      'unhinged and hydrated'
    ]
  }
];
