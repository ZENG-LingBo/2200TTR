// ── GBA Ticket to Ride — Physical Map (print + PDF) ──
//
// Renders a static, print-ready SVG map only (no gameplay UI).
// Fixes label/route overlaps by giving each city a dedicated label direction
// and by nudging a few cities that sat too close together in the game layout.

import {
  CITIES as GAME_CITIES,
  ROUTES,
  COLOR_HEX,
  ROUTE_TYPE,
  getRoutePoints,
} from './game-data.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Per-city label direction + nudged coordinates to eliminate the overlaps
// that existed in the in-game layout (Zhuhai/Macau and NT/Hong Kong in
// particular were almost touching).
const LABEL_DIR = {
  0:  { dir: 'W' },   // Zhaoqing
  1:  { dir: 'N' },   // Suihui
  2:  { dir: 'W' },   // Foshan
  3:  { dir: 'N' },   // Guangzhou
  4:  { dir: 'N' },   // Huadu
  5:  { dir: 'W' },   // Jiangmen
  6:  { dir: 'S' },   // Zhongshan
  7:  { dir: 'N' },   // Dongguan
  8:  { dir: 'W' },   // Humen
  9:  { dir: 'N' },   // Huizhou
  10: { dir: 'N' },   // Longgang
  11: { dir: 'N' },   // Shenzhen
  12: { dir: 'W' },   // Zhuhai — label left to stay clear of Macau
  13: { dir: 'S' },   // Macau — label below
  14: { dir: 'E' },   // NT — label right, away from HK
  15: { dir: 'E' },   // Hong Kong — label right
};

// Copy of CITIES with a couple of small position tweaks so labels and
// short routes don't pile on top of each other in the physical print.
const CITIES = GAME_CITIES.map((c) => {
  if (c.id === 12) return { ...c, x: 505, y: 540 }; // Zhuhai a bit up+left
  if (c.id === 13) return { ...c, x: 495, y: 590 }; // Macau a bit down+left
  if (c.id === 14) return { ...c, x: 745, y: 478 }; // NT a touch up
  if (c.id === 15) return { ...c, x: 755, y: 582 }; // Hong Kong a touch down+right
  return { ...c };
});

// ── Utility ──
function el(name, attrs = {}, text) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
}

// ── Map rendering ──
export function renderPhysicalMap(svg) {
  svg.innerHTML = '';

  const defs = el('defs');
  defs.innerHTML = `
    <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#dfeff7"/>
      <stop offset="100%" stop-color="#bcdcee"/>
    </linearGradient>
    <pattern id="landTexture" width="6" height="6" patternUnits="userSpaceOnUse">
      <rect width="6" height="6" fill="#f7f3e8"/>
      <circle cx="1" cy="1" r="0.4" fill="#e8e0c8"/>
    </pattern>
  `;
  svg.appendChild(defs);

  // Water background
  svg.appendChild(el('rect', {
    x: 0, y: 0, width: 960, height: 650,
    fill: 'url(#waterGrad)', rx: 14,
  }));

  // Pearl River Estuary shape (suggestive, not geographical)
  const river = el('path', {
    d: 'M420,300 Q490,380 510,450 Q530,510 550,545 Q565,575 520,605 Q480,620 455,595 Q438,555 430,500 Q420,430 405,370 Z',
    fill: '#a9cee3', opacity: '0.55',
  });
  svg.appendChild(river);

  // Routes under cities
  const routeLayer = el('g', { id: 'routes' });
  for (const r of ROUTES) renderRoute(routeLayer, r);
  svg.appendChild(routeLayer);

  // City dots + labels on top of everything
  const cityLayer = el('g', { id: 'cities' });
  for (const c of CITIES) renderCity(cityLayer, c);
  svg.appendChild(cityLayer);

  // Legend + title
  svg.appendChild(renderLegend());
  svg.appendChild(renderTitle());
}

function renderCity(parent, city) {
  const g = el('g', { class: 'pm-city' });

  g.appendChild(el('circle', {
    cx: city.x, cy: city.y, r: 11,
    fill: '#ffffff', stroke: '#0b3d5c', 'stroke-width': 2.5,
  }));
  g.appendChild(el('circle', {
    cx: city.x, cy: city.y, r: 4.5,
    fill: '#0b3d5c',
  }));

  const dir = (LABEL_DIR[city.id] && LABEL_DIR[city.id].dir) || 'N';
  const { lx, ly, cx, cy, anchor } = labelPosition(city, dir);

  // English name
  g.appendChild(el('text', {
    x: lx, y: ly, 'text-anchor': anchor, class: 'pm-label-en',
  }, city.name));

  // Chinese name underneath
  g.appendChild(el('text', {
    x: cx, y: cy, 'text-anchor': anchor, class: 'pm-label-cn',
  }, city.chinese));

  parent.appendChild(g);
}

function labelPosition(city, dir) {
  const { x, y } = city;
  switch (dir) {
    case 'S':
      return { lx: x, ly: y + 26, cx: x, cy: y + 39, anchor: 'middle' };
    case 'E':
      return { lx: x + 16, ly: y - 2, cx: x + 16, cy: y + 12, anchor: 'start' };
    case 'W':
      return { lx: x - 16, ly: y - 2, cx: x - 16, cy: y + 12, anchor: 'end' };
    case 'N':
    default:
      return { lx: x, ly: y - 18, cx: x, cy: y - 5, anchor: 'middle' };
  }
}

function renderRoute(parent, route) {
  const from = CITIES[route.from];
  const to   = CITIES[route.to];

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  // Parallel offset for double routes
  let ox = 0, oy = 0;
  if (route.doubleOf >= 0) {
    const perp = (angle + 90) * Math.PI / 180;
    const off = route.id < route.doubleOf ? -9 : 9;
    ox = Math.cos(perp) * off;
    oy = Math.sin(perp) * off;
  }

  const sx = from.x + ox;
  const sy = from.y + oy;

  const segLen = Math.min(28, (dist - 34) / route.length);
  const gap = 4;
  const totalLen = route.length * segLen + (route.length - 1) * gap;
  const startOffset = (dist - totalLen) / 2;

  const g = el('g', { class: `pm-route pm-${route.type}`, 'data-id': route.id });

  const fill = route.color === 'gray' ? '#8a8a8a' : COLOR_HEX[route.color];
  const stroke = '#2a2a2a';

  for (let i = 0; i < route.length; i++) {
    const segOff = startOffset + i * (segLen + gap);
    const cx = sx + (dx / dist) * (segOff + segLen / 2);
    const cy = sy + (dy / dist) * (segOff + segLen / 2);

    g.appendChild(el('rect', {
      x: cx - segLen / 2, y: cy - 7,
      width: segLen, height: 14, rx: 3,
      transform: `rotate(${angle}, ${cx}, ${cy})`,
      fill, stroke, 'stroke-width': 1,
    }));

    // Bridge / ferry marker on the centre segment
    if (i === Math.floor(route.length / 2)) {
      if (route.type === ROUTE_TYPE.BRIDGE) {
        g.appendChild(el('text', {
          x: cx, y: cy + 4, 'text-anchor': 'middle', class: 'pm-route-icon',
        }, '\u{1F309}'));
      } else if (route.type === ROUTE_TYPE.FERRY) {
        g.appendChild(el('text', {
          x: cx, y: cy + 4, 'text-anchor': 'middle', class: 'pm-route-icon',
        }, '\u{26F4}'));
      }
    }
  }

  // Length / points tag near the midpoint, perpendicular-offset so it sits
  // off the track itself and away from the parallel twin.
  const mx = (from.x + to.x) / 2 + ox * 0.4;
  const my = (from.y + to.y) / 2 + oy * 0.4;
  const perp = (angle + 90) * Math.PI / 180;
  const tagSide = route.doubleOf >= 0 && route.id >= route.doubleOf ? -1 : 1;
  const tx = mx + Math.cos(perp) * 16 * tagSide;
  const ty = my + Math.sin(perp) * 16 * tagSide + 3;

  const pts = getRoutePoints(route.length, route.type);
  g.appendChild(el('text', {
    x: tx, y: ty, 'text-anchor': 'middle', class: 'pm-route-tag',
  }, `${route.length}·${pts}`));

  parent.appendChild(g);
}

function renderLegend() {
  const g = el('g', { id: 'pm-legend', transform: 'translate(20, 500)' });

  g.appendChild(el('rect', {
    x: 0, y: 0, width: 240, height: 132, rx: 8,
    fill: '#ffffff', stroke: '#0b3d5c', 'stroke-width': 1.5, opacity: 0.92,
  }));
  g.appendChild(el('text', {
    x: 12, y: 20, class: 'pm-legend-title',
  }, 'Legend'));

  const rows = [
    { label: 'Normal route',  color: COLOR_HEX.blue,   type: 'normal' },
    { label: 'Bridge (2× pts)', color: '#8a8a8a',      type: 'bridge' },
    { label: 'Ferry (needs loco)', color: '#8a8a8a',   type: 'ferry'  },
  ];

  rows.forEach((row, i) => {
    const y = 38 + i * 22;
    g.appendChild(el('rect', {
      x: 12, y, width: 30, height: 12, rx: 2,
      fill: row.color, stroke: '#2a2a2a', 'stroke-width': 1,
    }));
    if (row.type === 'bridge') {
      g.appendChild(el('text', { x: 27, y: y + 10, 'text-anchor': 'middle', class: 'pm-route-icon' }, '\u{1F309}'));
    }
    if (row.type === 'ferry') {
      g.appendChild(el('text', { x: 27, y: y + 10, 'text-anchor': 'middle', class: 'pm-route-icon' }, '\u{26F4}'));
    }
    g.appendChild(el('text', {
      x: 50, y: y + 10, class: 'pm-legend-text',
    }, row.label));
  });

  g.appendChild(el('text', {
    x: 12, y: 118, class: 'pm-legend-note',
  }, 'Number on route = length · points'));

  return g;
}

function renderTitle() {
  const g = el('g', { id: 'pm-title' });
  g.appendChild(el('text', {
    x: 480, y: 34, 'text-anchor': 'middle', class: 'pm-title',
  }, 'GBA Ticket to Ride — Physical Map'));
  g.appendChild(el('text', {
    x: 480, y: 54, 'text-anchor': 'middle', class: 'pm-subtitle',
  }, 'Greater Bay Area · Print & Play Edition'));
  return g;
}

// ── Export ──
// Uses the browser's print-to-PDF pipeline. A print stylesheet hides the
// controls so only the map itself ends up on the page.
export function exportAsPDF() {
  window.print();
}
