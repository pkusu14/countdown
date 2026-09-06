/* Other ways of saying how long is left.
 *
 * Two show under the timer each day, picked from the date so both phones show
 * the same pair. There are enough here that a pair doesn't come round again
 * for over a month - if you add more, that window gets longer.
 *
 *   s    how many seconds one of the thing takes
 *   unit what it's called, plural
 *
 * Anything that would come out as less than one gets skipped automatically,
 * so short countdowns quietly fall back to the smaller units.
 */

window.MEASURES = [
  /* songs */
  { s: 613, unit: 'plays of All Too Well (10 minute version)' },
  { s: 355, unit: 'Bohemian Rhapsodies' },
  { s: 482, unit: 'Stairways to Heaven' },
  { s: 268, unit: 'Rasputins' },
  { s: 549, unit: 'Free Birds, start to finish' },
  { s: 213, unit: 'Rickrolls' },
  { s: 96, unit: 'renditions of Baby Shark' },
  { s: 225, unit: 'Take On Mes' },
  { s: 262, unit: 'plays of Tum Hi Ho' },
  { s: 315, unit: 'plays of Kal Ho Naa Ho' },
  { s: 411, unit: 'trips down Chaiyya Chaiyya' },
  { s: 229, unit: 'Despacitos' },
  { s: 301, unit: 'Smells Like Teen Spirits' },
  { s: 391, unit: 'Hotel Californias' },

  /* telly */
  { s: 1380, unit: 'episodes of Naruto' },
  { s: 1320, unit: 'episodes of Friends' },
  { s: 1320, unit: 'episodes of The Office' },
  { s: 2820, unit: 'episodes of Breaking Bad' },
  { s: 3420, unit: 'episodes of Game of Thrones' },
  { s: 300, unit: 'episodes of Peppa Pig' },
  { s: 3600, unit: 'episodes of Black Mirror' },
  { s: 5400, unit: 'feature-length Sherlocks' },
  { s: 1440, unit: 'episodes of Attack on Titan' },
  { s: 1440, unit: 'episodes of One Piece' },
  { s: 420, unit: 'episodes of Bluey' },
  { s: 1320, unit: 'episodes of Seinfeld' },

  /* films */
  { s: 11640, unit: 'showings of Titanic' },
  { s: 10500, unit: 'viewings of The Godfather' },
  { s: 8520, unit: 'Shawshank Redemptions' },
  { s: 43560, unit: 'runs through the extended Lord of the Rings' },
  { s: 10860, unit: 'Endgames' },
  { s: 11340, unit: 'showings of DDLJ' },
  { s: 12240, unit: 'showings of Sholay' },
  { s: 10200, unit: 'viewings of 3 Idiots' },
  { s: 10140, unit: 'Interstellars' },
  { s: 5400, unit: 'Shreks' },
  { s: 6180, unit: 'showings of Paddington 2' },

  /* domestic */
  { s: 360, unit: 'soft-boiled eggs' },
  { s: 1200, unit: 'cups of tea left to go cold' },
  { s: 180, unit: 'bags of microwave popcorn' },
  { s: 2700, unit: 'loads of laundry' },
  { s: 480, unit: 'showers you would describe as quick' },
  { s: 120, unit: 'batches of Maggi' },
  { s: 1200, unit: 'pots of rice' },
  { s: 10800, unit: 'slow-cooked biryanis' },
  { s: 180, unit: 'boiled kettles' },
  { s: 18000, unit: 'sourdough proves' },

  /* the body */
  { s: 5400, unit: 'full REM cycles' },
  { s: 1500, unit: 'naps you would regret' },
  { s: 0.83, unit: 'heartbeats' },
  { s: 4, unit: 'blinks' },
  { s: 4, unit: 'breaths' },
  { s: 60, unit: 'yawns' },
  { s: 90, unit: 'sighs about each other' },
  { s: 60, unit: 'planks you would not finish' },

  /* going places */
  { s: 28800, unit: 'flights from Paris to Delhi' },
  { s: 5520, unit: 'orbits of the space station' },
  { s: 2400, unit: 'journeys across Paris' },
  { s: 9000, unit: 'trips round IKEA' },
  { s: 1800, unit: 'dentist appointments' },
  { s: 1800, unit: 'haircuts' },

  /* games and time-wasting */
  { s: 1200, unit: 'games of Pedantle' },
  { s: 240, unit: 'Wordles' },
  { s: 900, unit: 'rounds of GeoGuessr' },
  { s: 600, unit: 'games of blitz chess' },
  { s: 2700, unit: 'meetings that could have been emails' },
  { s: 1080, unit: 'TED talks' },
  { s: 2700, unit: 'podcast episodes' },
  { s: 6000, unit: 'Formula 1 races' },
  { s: 5700, unit: 'football matches' },
  { s: 28800, unit: 'days of a cricket test' },
  { s: 15, unit: 'TikToks' },
  { s: 45, unit: 'attempts to explain this app to someone' },
  { s: 180, unit: 'times you have opened this app today' },
  { s: 8, unit: 'rereads of the same message' },
  { s: 420, unit: 'photos of him you have scrolled past' },
  { s: 30, unit: 'deep sighs' },
  { s: 7200, unit: 'films you should watch together' },
  { s: 240, unit: 'Connections puzzles' },
  { s: 900, unit: 'walks to nowhere thinking of him' },
  { s: 3600, unit: 'hours you have been normal about this' },
  { s: 1260, unit: 'plays of a song that reminds you of him' },
  { s: 540, unit: 'cups of coffee drunk alone' },
  { s: 75, unit: 'voice notes you almost sent' },
  { s: 20, unit: 'times you checked if he was online' },
  { s: 86400, unit: 'midnights until then' },
  { s: 604800, unit: 'weekends, technically' }
];
