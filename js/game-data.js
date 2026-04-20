// ── GBA Ticket to Ride — Static Game Data ──

// ── Constants ──
export const TRAINS_PER_PLAYER = 35;
export const STARTING_HAND = 5;
export const END_TRIGGER = 3;
export const CURRENCY_BONUS = 3;
export const CURRENCY_BONUS_VALUES = { RMB: 3, HKD: 5, MOP: 7 };
export const LONGEST_PATH_BONUS = 10;
export const DEFAULT_NUM_PLAYERS = 2;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;

// ── Card Colors ──
export const CARD_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'white', 'black'];
export const LOCO = 'locomotive';
export const CURRENCY_TYPES = ['RMB', 'HKD', 'MOP'];

// ── Color hex values for rendering ──
export const COLOR_HEX = {
  red:    '#e74c3c',
  orange: '#f39c12',
  yellow: '#f1c40f',
  green:  '#2ecc71',
  blue:   '#3498db',
  purple: '#9b59b6',
  white:  '#ecf0f1',
  black:  '#2c3e50',
  gray:   '#95a5a6',
  locomotive: '#e67e22',
  RMB:  '#c0392b',
  HKD:  '#2980b9',
  MOP:  '#27ae60',
};

// ── Player colors (up to 4 players) ──
export const PLAYER_COLORS = ['#2196F3', '#F44336', '#4CAF50', '#FFC107']; // Blue, Red, Green, Yellow
export const DEFAULT_PLAYER_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
// Legacy exports for backwards compatibility
export const PLAYER_NAMES = DEFAULT_PLAYER_NAMES;

// ── Deck composition ──
export const CARDS_PER_COLOR = 12;
export const LOCO_COUNT = 14;
export const CURRENCY_COUNTS = { RMB: 4, HKD: 2, MOP: 2 };

// ── Route types ──
export const ROUTE_TYPE = {
  NORMAL: 'normal',
  BRIDGE: 'bridge',
  FERRY:  'ferry',
};

// ── Scoring tables ──
export const NORMAL_POINTS = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 10, 6: 15 };
export const BRIDGE_POINTS = { 1: 2, 2: 4, 3: 8, 4: 14, 5: 20, 6: 30 };
export const FERRY_POINTS  = { 1: 2, 2: 3, 3: 6, 4: 11, 5: 15, 6: 23 };

export function getRoutePoints(length, type) {
  if (type === ROUTE_TYPE.BRIDGE) return BRIDGE_POINTS[length];
  if (type === ROUTE_TYPE.FERRY) return FERRY_POINTS[length];
  return NORMAL_POINTS[length];
}

// ── Currency Zones ──
export const ZONES = { RMB: 'RMB', HKD: 'HKD', MOP: 'MOP' };

// ── Cities ──
export const CITIES = [
  { id: 0,  name: 'Zhaoqing',  chinese: '肇庆',  zone: 'RMB', x: 100, y: 215 },
  { id: 1,  name: 'Suihui',    chinese: '三水',  zone: 'RMB', x: 245, y: 165 },
  { id: 2,  name: 'Foshan',    chinese: '佛山',  zone: 'RMB', x: 345, y: 230 },
  { id: 3,  name: 'Guangzhou', chinese: '广州',  zone: 'RMB', x: 398, y: 178 },
  { id: 4,  name: 'Huadu',     chinese: '花都区', zone: 'RMB', x: 380, y: 60  },
  { id: 5,  name: 'Jiangmen',  chinese: '江门',  zone: 'RMB', x: 330, y: 400 },
  { id: 6,  name: 'Zhongshan', chinese: '中山',  zone: 'RMB', x: 446, y: 430 },
  { id: 7,  name: 'Dongguan',  chinese: '东莞',  zone: 'RMB', x: 582, y: 220 },
  { id: 8,  name: 'Humen',     chinese: '虎门',  zone: 'RMB', x: 552, y: 315 },
  { id: 9,  name: 'Huizhou',   chinese: '惠州',  zone: 'RMB', x: 835, y: 190 },
  { id: 10, name: 'Longgang',  chinese: '龙岗区', zone: 'RMB', x: 770, y: 360 },
  { id: 11, name: 'Shenzhen',  chinese: '深圳',  zone: 'RMB', x: 698, y: 440 },
  { id: 12, name: 'Zhuhai',    chinese: '珠海',  zone: 'RMB', x: 518, y: 545 },
  { id: 13, name: 'Macau',     chinese: '澳门',  zone: 'MOP', x: 488, y: 618 },
  { id: 14, name: 'NT',        chinese: '新界',  zone: 'HKD', x: 740, y: 490 },
  { id: 15, name: 'Hong Kong', chinese: '香港',  zone: 'HKD', x: 740, y: 570 },
];

// ── Routes ──
// doubleOf: index of the other route in a double-route pair (-1 if none)
export const ROUTES = [
  // Normal routes (26)
  { id: 0,  from: 0,  to: 1,  length: 3, color: 'orange', type: 'normal', doubleOf: -1 },
  { id: 1,  from: 0,  to: 2,  length: 4, color: 'red',    type: 'normal', doubleOf: -1 },
  { id: 2,  from: 0,  to: 5,  length: 5, color: 'green',  type: 'normal', doubleOf: -1 },
  { id: 3,  from: 1,  to: 3,  length: 3, color: 'blue',   type: 'normal', doubleOf: -1 },
  { id: 4,  from: 1,  to: 2,  length: 2, color: 'green',  type: 'normal', doubleOf: -1 },
  { id: 5,  from: 2,  to: 3,  length: 2, color: 'yellow', type: 'normal', doubleOf: 6  },
  { id: 6,  from: 2,  to: 3,  length: 2, color: 'purple', type: 'normal', doubleOf: 5  },
  { id: 7,  from: 2,  to: 5,  length: 3, color: 'black',  type: 'normal', doubleOf: -1 },
  { id: 8,  from: 2,  to: 6,  length: 3, color: 'orange', type: 'normal', doubleOf: -1 },
  { id: 9,  from: 3,  to: 4,  length: 2, color: 'white',  type: 'normal', doubleOf: -1 },
  { id: 10, from: 3,  to: 7,  length: 3, color: 'red',    type: 'normal', doubleOf: 11 },
  { id: 11, from: 3,  to: 7,  length: 3, color: 'blue',   type: 'normal', doubleOf: 10 },
  { id: 12, from: 3,  to: 8,  length: 3, color: 'green',  type: 'normal', doubleOf: -1 },
  { id: 13, from: 4,  to: 7,  length: 4, color: 'purple', type: 'normal', doubleOf: -1 },
  { id: 14, from: 7,  to: 9,  length: 4, color: 'yellow', type: 'normal', doubleOf: -1 },
  { id: 15, from: 7,  to: 8,  length: 2, color: 'orange', type: 'normal', doubleOf: -1 },
  { id: 16, from: 7,  to: 10, length: 3, color: 'white',  type: 'normal', doubleOf: -1 },
  { id: 17, from: 7,  to: 11, length: 3, color: 'black',  type: 'normal', doubleOf: -1 },
  { id: 18, from: 9,  to: 10, length: 3, color: 'green',  type: 'normal', doubleOf: -1 },
  { id: 19, from: 10, to: 11, length: 2, color: 'red',    type: 'normal', doubleOf: -1 },
  { id: 20, from: 5,  to: 6,  length: 2, color: 'yellow', type: 'normal', doubleOf: -1 },
  { id: 21, from: 6,  to: 12, length: 2, color: 'purple', type: 'normal', doubleOf: -1 },
  { id: 22, from: 5,  to: 12, length: 3, color: 'white',  type: 'normal', doubleOf: -1 },
  { id: 23, from: 6,  to: 13, length: 3, color: 'blue',   type: 'normal', doubleOf: -1 },
  { id: 24, from: 10, to: 14, length: 3, color: 'orange', type: 'normal', doubleOf: -1 },
  { id: 25, from: 9,  to: 11, length: 4, color: 'red',    type: 'normal', doubleOf: -1 },

  // Bridge routes (6) — 2× points, +1 loco cost
  { id: 26, from: 8,  to: 6,  length: 4, color: 'gray', type: 'bridge', doubleOf: -1 }, // Humen Bridge
  { id: 27, from: 11, to: 6,  length: 5, color: 'gray', type: 'bridge', doubleOf: -1 }, // SZ-ZS Link
  { id: 28, from: 15, to: 12, length: 6, color: 'gray', type: 'bridge', doubleOf: -1 }, // HK-ZH-Macau Bridge
  { id: 29, from: 11, to: 14, length: 2, color: 'gray', type: 'bridge', doubleOf: -1 }, // SZ Bay Bridge
  { id: 30, from: 14, to: 15, length: 2, color: 'gray', type: 'bridge', doubleOf: -1 }, // Tolo Hwy
  { id: 31, from: 8,  to: 11, length: 4, color: 'gray', type: 'bridge', doubleOf: -1 }, // Nansha Bridge

  // Ferry routes (4) — 1.5× points, ≥1 loco required
  { id: 32, from: 12, to: 13, length: 1, color: 'gray', type: 'ferry', doubleOf: -1 }, // Zhuhai-Macau
  { id: 33, from: 11, to: 15, length: 3, color: 'gray', type: 'ferry', doubleOf: -1 }, // Shekou-HK
  { id: 34, from: 11, to: 12, length: 4, color: 'gray', type: 'ferry', doubleOf: -1 }, // Cross-delta
  { id: 35, from: 15, to: 13, length: 5, color: 'gray', type: 'ferry', doubleOf: -1 }, // TurboJET
];

// ── Destination Tickets ──
export const TICKETS = [
  // Short (5-6 pts)
  { id: 0,  from: 2,  to: 3,  points: 5  }, // Foshan → Guangzhou
  { id: 1,  from: 7,  to: 10, points: 5  }, // Dongguan → Longgang
  { id: 2,  from: 7,  to: 8,  points: 5  }, // Dongguan → Humen
  { id: 3,  from: 1,  to: 2,  points: 5  }, // Suihui → Foshan
  { id: 4,  from: 12, to: 13, points: 6  }, // Zhuhai → Macau

  // Medium (10-12 pts)
  { id: 5,  from: 3,  to: 11, points: 10 }, // Guangzhou → Shenzhen
  { id: 6,  from: 5,  to: 7,  points: 10 }, // Jiangmen → Dongguan
  { id: 7,  from: 6,  to: 11, points: 11 }, // Zhongshan → Shenzhen
  { id: 8,  from: 3,  to: 13, points: 11 }, // Guangzhou → Macau
  { id: 9,  from: 2,  to: 9,  points: 12 }, // Foshan → Huizhou
  { id: 10, from: 1,  to: 13, points: 12 }, // Suihui → Macau

  // Long (13-16 pts)
  { id: 11, from: 0,  to: 11, points: 13 }, // Zhaoqing → Shenzhen
  { id: 12, from: 5,  to: 15, points: 14 }, // Jiangmen → Hong Kong
  { id: 13, from: 0,  to: 15, points: 15 }, // Zhaoqing → Hong Kong
  { id: 14, from: 13, to: 9,  points: 16 }, // Macau → Huizhou
];

// ── Double-route pairs for quick lookup ──
export const DOUBLE_ROUTE_PAIRS = [
  [5, 6],   // Foshan ↔ Guangzhou
  [10, 11], // Guangzhou ↔ Dongguan
];
