/* Other ways of saying how long is left.
 *
 * Each entry is one concrete thing and how many seconds it takes. The app
 * divides the remaining time by that, rounds to a ballpark, and shows two
 * a day. The pair and the numbers freeze until local midnight so both phones
 * are looking at the same joke all day.
 *
 *   s    seconds one of the thing takes
 *   unit what the number is counting
 *
 * Skip anything meta ("hours of longing", "midnights until then"). The number
 * has to be "how many of this fit in the wait", not a restatement of the clock.
 */

window.MEASURES = [
  /* songs - real track lengths */
  { s: 294, unit: 'plays of Billie Jean' },
  { s: 613, unit: 'plays of All Too Well (10 minute version)' },
  { s: 355, unit: 'Bohemian Rhapsodies' },
  { s: 482, unit: 'Stairways to Heaven' },
  { s: 268, unit: 'plays of Rasputin' },
  { s: 213, unit: 'Rickrolls' },
  { s: 225, unit: 'plays of Take On Me' },
  { s: 229, unit: 'plays of Despacito' },
  { s: 262, unit: 'plays of Tum Hi Ho' },
  { s: 315, unit: 'plays of Kal Ho Naa Ho' },
  { s: 411, unit: 'plays of Chaiyya Chaiyya' },
  { s: 301, unit: 'plays of Smells Like Teen Spirit' },
  { s: 391, unit: 'plays of Hotel California' },
  { s: 239, unit: 'plays of Blinding Lights' },
  { s: 233, unit: 'plays of Levitating' },
  { s: 537, unit: 'plays of November Rain' },
  { s: 240, unit: 'plays of Cruel Summer' },
  { s: 201, unit: 'plays of As It Was' },
  { s: 281, unit: 'plays of Die For You' },
  { s: 210, unit: 'plays of Espresso' },

  /* telly */
  { s: 1380, unit: 'episodes of Naruto' },
  { s: 1320, unit: 'episodes of Friends' },
  { s: 1320, unit: 'episodes of The Office' },
  { s: 2820, unit: 'episodes of Breaking Bad' },
  { s: 3420, unit: 'episodes of Game of Thrones' },
  { s: 1440, unit: 'episodes of One Piece' },
  { s: 1440, unit: 'episodes of Attack on Titan' },
  { s: 3600, unit: 'episodes of Black Mirror' },
  { s: 300, unit: 'episodes of Peppa Pig' },
  { s: 420, unit: 'episodes of Bluey' },
  { s: 5400, unit: 'feature-length Sherlocks' },
  { s: 1500, unit: 'episodes of The Bear' },
  { s: 3300, unit: 'episodes of Succession' },
  { s: 1560, unit: 'episodes of Brooklyn Nine-Nine' },

  /* films */
  { s: 11640, unit: 'showings of Titanic' },
  { s: 8520, unit: 'Shawshank Redemptions' },
  { s: 10860, unit: 'Avengers: Endgames' },
  { s: 10140, unit: 'Interstellars' },
  { s: 11340, unit: 'showings of Dilwale Dulhania Le Jayenge' },
  { s: 10200, unit: 'showings of 3 Idiots' },
  { s: 12240, unit: 'showings of Sholay' },
  { s: 5400, unit: 'Shreks' },
  { s: 6180, unit: 'showings of Paddington 2' },
  { s: 8880, unit: 'showings of Inception' },
  { s: 7140, unit: 'La La Lands' },
  { s: 8100, unit: 'showings of Parasite' },

  /* games they actually play */
  { s: 1200, unit: 'games of Pedantle' },
  { s: 240, unit: 'Wordles' },
  { s: 240, unit: 'Connections puzzles' },
  { s: 900, unit: 'rounds of GeoGuessr' },
  { s: 600, unit: 'games of blitz chess' },

  /* moving through the world */
  { s: 720, unit: 'km of walking' },          /* 5 km/h */
  { s: 240, unit: 'km of cycling' },          /* 15 km/h */
  { s: 36, unit: 'km of driving' },           /* 100 km/h */
  { s: 28800, unit: 'flights from Paris to Delhi' },
  { s: 2400, unit: 'walks across Paris, one end to the other' },
  { s: 5520, unit: 'orbits of the ISS' },
  { s: 9000, unit: 'trips around IKEA' },

  /* food, because of course */
  { s: 120, unit: 'batches of Maggi' },
  { s: 180, unit: 'boiled kettles' },
  { s: 360, unit: 'soft-boiled eggs' },
  { s: 1200, unit: 'pots of rice' },
  { s: 10800, unit: 'slow-cooked biryanis' },
  { s: 180, unit: 'bags of microwave popcorn' },
  { s: 480, unit: 'actually-quick showers' },
  { s: 2700, unit: 'loads of laundry' },

  /* sitting still */
  { s: 1080, unit: 'TED talks' },
  { s: 2700, unit: 'podcast episodes' },
  { s: 6000, unit: 'Formula 1 races' },
  { s: 5700, unit: 'football matches' },
  { s: 1500, unit: 'naps you would regret' },
  { s: 28800, unit: 'full nights of sleep' }
];
