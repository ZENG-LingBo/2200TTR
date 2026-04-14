// ── GBA Ticket to Ride — Rendering ──

import {
  CITIES, ROUTES, CARD_COLORS, LOCO, CURRENCY_TYPES,
  COLOR_HEX, PLAYER_COLORS, PLAYER_NAMES, ROUTE_TYPE,
  getRoutePoints,
} from './game-data.js';

// ── SVG namespace ──
const SVG_NS = 'http://www.w3.org/2000/svg';

// ── Cached elements ──
let mapSvg, faceUpContainer, handContainer, ticketContainer, scoreDisplay;
let messageEl, selectedRouteInfo, claimBtn, drawTicketsBtn, deckBtn;
let turnIndicator;

export function cacheDOM() {
  mapSvg = document.getElementById('game-map');
  faceUpContainer = document.getElementById('face-up-cards');
  handContainer = document.getElementById('hand-cards');
  ticketContainer = document.getElementById('ticket-list');
  scoreDisplay = document.getElementById('score-display');
  messageEl = document.getElementById('game-message');
  selectedRouteInfo = document.getElementById('selected-route-info');
  claimBtn = document.getElementById('claim-btn');
  drawTicketsBtn = document.getElementById('draw-tickets-btn');
  deckBtn = document.getElementById('deck-btn');
  turnIndicator = document.getElementById('turn-indicator');
}

// ── Map rendering ──

export function renderMap(gameState, onRouteClick) {
  mapSvg.innerHTML = '';

  // Water background
  const waterGrad = document.createElementNS(SVG_NS, 'defs');
  waterGrad.innerHTML = `
    <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#d4e6f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#aed6f1;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  `;
  mapSvg.appendChild(waterGrad);

  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('width', '960');
  bg.setAttribute('height', '650');
  bg.setAttribute('fill', 'url(#waterGrad)');
  bg.setAttribute('rx', '12');
  mapSvg.appendChild(bg);

  // Pearl River area (rough polygon)
  const river = document.createElementNS(SVG_NS, 'path');
  river.setAttribute('d', 'M420,300 Q480,380 500,450 Q520,500 540,540 Q560,570 520,600 Q480,620 460,600 Q440,560 430,500 Q420,430 400,370 Z');
  river.setAttribute('fill', '#b3d9ff');
  river.setAttribute('opacity', '0.4');
  mapSvg.appendChild(river);

  // Render routes first (below cities)
  const routeGroup = document.createElementNS(SVG_NS, 'g');
  routeGroup.setAttribute('id', 'routes-group');
  for (const route of ROUTES) {
    renderRoute(routeGroup, route, gameState, onRouteClick);
  }
  mapSvg.appendChild(routeGroup);

  // Render cities on top
  const cityGroup = document.createElementNS(SVG_NS, 'g');
  cityGroup.setAttribute('id', 'cities-group');
  for (const city of CITIES) {
    renderCity(cityGroup, city);
  }
  mapSvg.appendChild(cityGroup);
}

function renderCity(parent, city) {
  const g = document.createElementNS(SVG_NS, 'g');
  g.classList.add('city-node');

  // Outer glow
  const glow = document.createElementNS(SVG_NS, 'circle');
  glow.setAttribute('cx', city.x);
  glow.setAttribute('cy', city.y);
  glow.setAttribute('r', '14');
  glow.setAttribute('fill', '#00bcd4');
  glow.setAttribute('opacity', '0.3');
  g.appendChild(glow);

  // City dot
  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', city.x);
  circle.setAttribute('cy', city.y);
  circle.setAttribute('r', '9');
  circle.setAttribute('fill', '#00bcd4');
  circle.setAttribute('stroke', '#006064');
  circle.setAttribute('stroke-width', '2');
  g.appendChild(circle);

  // City label background
  const labelText = city.name;
  const textEl = document.createElementNS(SVG_NS, 'text');
  textEl.setAttribute('x', city.x);
  textEl.setAttribute('y', city.y - 16);
  textEl.setAttribute('text-anchor', 'middle');
  textEl.setAttribute('class', 'city-label');
  textEl.textContent = labelText;
  g.appendChild(textEl);

  // Chinese name (smaller)
  const cnText = document.createElementNS(SVG_NS, 'text');
  cnText.setAttribute('x', city.x);
  cnText.setAttribute('y', city.y + 24);
  cnText.setAttribute('text-anchor', 'middle');
  cnText.setAttribute('class', 'city-label-cn');
  cnText.textContent = city.chinese;
  g.appendChild(cnText);

  parent.appendChild(g);
}

function renderRoute(parent, route, gameState, onRouteClick) {
  const from = CITIES[route.from];
  const to = CITIES[route.to];

  // Calculate positions for train car segments
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  // Offset for double routes
  let offsetX = 0, offsetY = 0;
  if (route.doubleOf >= 0) {
    const perpAngle = (angle + 90) * Math.PI / 180;
    const offset = route.id < route.doubleOf ? -8 : 8;
    offsetX = Math.cos(perpAngle) * offset;
    offsetY = Math.sin(perpAngle) * offset;
  }

  const startX = from.x + offsetX;
  const startY = from.y + offsetY;

  const segLen = Math.min(28, (dist - 30) / route.length);
  const gap = 4;
  const totalLen = route.length * segLen + (route.length - 1) * gap;
  const startOffset = (dist - totalLen) / 2;

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'route-group');
  g.setAttribute('data-route-id', route.id);

  // Check if claimed
  const claimedBy = gameState.players.findIndex(p => p.claimedRoutes.includes(route.id));
  const isClaimed = claimedBy >= 0;

  for (let i = 0; i < route.length; i++) {
    const segOffset = startOffset + i * (segLen + gap);
    const cx = startX + (dx / dist) * segOffset + (dx / dist) * segLen / 2;
    const cy = startY + (dy / dist) * segOffset + (dy / dist) * segLen / 2;

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', cx - segLen / 2);
    rect.setAttribute('y', cy - 7);
    rect.setAttribute('width', segLen);
    rect.setAttribute('height', 14);
    rect.setAttribute('rx', '3');
    rect.setAttribute('transform', `rotate(${angle}, ${cx}, ${cy})`);

    if (isClaimed) {
      rect.setAttribute('fill', PLAYER_COLORS[claimedBy]);
      rect.setAttribute('stroke', '#fff');
      rect.setAttribute('stroke-width', '1.5');
      rect.setAttribute('opacity', '0.9');
    } else {
      const fillColor = route.color === 'gray' ? COLOR_HEX.gray : COLOR_HEX[route.color];
      rect.setAttribute('fill', fillColor);
      rect.setAttribute('stroke', '#555');
      rect.setAttribute('stroke-width', '1');
      rect.setAttribute('opacity', '0.7');
    }

    g.appendChild(rect);

    // Route type icons on the first segment
    if (i === 0 && !isClaimed) {
      if (route.type === ROUTE_TYPE.BRIDGE) {
        const icon = document.createElementNS(SVG_NS, 'text');
        icon.setAttribute('x', cx);
        icon.setAttribute('y', cy + 4);
        icon.setAttribute('text-anchor', 'middle');
        icon.setAttribute('class', 'route-icon');
        icon.textContent = '\u{1F309}'; // bridge emoji
        g.appendChild(icon);
      } else if (route.type === ROUTE_TYPE.FERRY) {
        const icon = document.createElementNS(SVG_NS, 'text');
        icon.setAttribute('x', cx);
        icon.setAttribute('y', cy + 4);
        icon.setAttribute('text-anchor', 'middle');
        icon.setAttribute('class', 'route-icon');
        icon.textContent = '\u{26F4}'; // ferry emoji
        g.appendChild(icon);
      }
    }
  }

  // Click handler for unclaimed routes
  if (!isClaimed) {
    g.style.cursor = 'pointer';
    g.addEventListener('click', () => onRouteClick(route.id));
  }

  parent.appendChild(g);
}

// ── Highlight claimable routes ──

export function highlightClaimable(claimableIds, selectedId) {
  const groups = document.querySelectorAll('.route-group');
  for (const g of groups) {
    const rid = parseInt(g.dataset.routeId);
    g.classList.remove('claimable', 'selected');
    if (rid === selectedId) {
      g.classList.add('selected');
    } else if (claimableIds.includes(rid)) {
      g.classList.add('claimable');
    }
  }
}

// ── Face-up cards ──

export function renderFaceUp(faceUp, onCardClick) {
  faceUpContainer.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const card = faceUp[i];
    const div = document.createElement('div');
    div.className = 'card face-up-card';
    if (card) {
      div.style.backgroundColor = COLOR_HEX[card] || '#ccc';
      div.textContent = getCardLabel(card);
      div.classList.add(`card-${card}`);
      div.addEventListener('click', () => onCardClick(i));
    } else {
      div.classList.add('card-empty');
      div.textContent = '—';
    }
    faceUpContainer.appendChild(div);
  }
}

export function renderDeck(deckSize, onClick) {
  deckBtn.textContent = `Draw (${deckSize})`;
  deckBtn.onclick = onClick;
}

// ── Player hand ──

export function renderHand(player) {
  handContainer.innerHTML = '';
  const allTypes = [...CARD_COLORS, LOCO, ...CURRENCY_TYPES];
  for (const type of allTypes) {
    const count = player.hand[type] || 0;
    if (count === 0) continue;
    const div = document.createElement('div');
    div.className = 'card hand-card';
    div.style.backgroundColor = COLOR_HEX[type] || '#ccc';
    div.innerHTML = `<span class="card-count">${count}</span><span class="card-label">${getCardLabel(type)}</span>`;
    div.classList.add(`card-${type}`);
    handContainer.appendChild(div);
  }
}

function getCardLabel(type) {
  if (type === LOCO) return '\u{1F682}'; // loco emoji
  if (type === 'RMB') return '¥';
  if (type === 'HKD') return '$';
  if (type === 'MOP') return 'P';
  return '';
}

// ── Tickets ──

export function renderTickets(player, gameState) {
  ticketContainer.innerHTML = '';
  for (const ticket of player.tickets) {
    const fromCity = CITIES[ticket.from].name;
    const toCity = CITIES[ticket.to].name;
    const connected = gameState.isConnected(player.index, ticket.from, ticket.to);
    const div = document.createElement('div');
    div.className = `ticket ${connected ? 'ticket-complete' : 'ticket-incomplete'}`;
    div.innerHTML = `<span class="ticket-cities">${fromCity} → ${toCity}</span><span class="ticket-pts">${ticket.points}</span>`;
    ticketContainer.appendChild(div);
  }
}

// ── Scores ──

export function renderScores(players) {
  scoreDisplay.innerHTML = players.map((p, i) =>
    `<span class="score-item" style="color:${PLAYER_COLORS[i]}">${PLAYER_NAMES[i]}: ${p.score} pts | ${p.trains} trains</span>`
  ).join(' &nbsp;|&nbsp; ');
}

// ── Turn indicator ──

export function renderTurnIndicator(currentPlayer, phase) {
  if (phase === 'ended') {
    turnIndicator.textContent = 'Game Over!';
    turnIndicator.style.color = '#e74c3c';
  } else {
    const name = PLAYER_NAMES[currentPlayer];
    turnIndicator.textContent = `${name === 'You' ? 'Your' : "AI's"} Turn`;
    turnIndicator.style.color = PLAYER_COLORS[currentPlayer];
  }
}

// ── Selected route info ──

export function showSelectedRoute(routeId, canClaim, canCurrency, combo) {
  if (routeId < 0) {
    selectedRouteInfo.innerHTML = '<em>Click a route on the map to select it</em>';
    claimBtn.disabled = true;
    return;
  }
  const route = ROUTES[routeId];
  const from = CITIES[route.from].name;
  const to = CITIES[route.to].name;
  const pts = getRoutePoints(route.length, route.type);
  const typeLabel = route.type === 'bridge' ? ' [Bridge 2x]' : route.type === 'ferry' ? ' [Ferry 1.5x]' : '';
  const colorLabel = route.color === 'gray' ? 'Any color' : route.color;

  let costStr = `${route.length} ${colorLabel}`;
  if (route.type === 'bridge') costStr += ' + 1 Loco';
  if (route.type === 'ferry') costStr += ' (≥1 Loco)';

  selectedRouteInfo.innerHTML = `
    <strong>${from} → ${to}</strong>${typeLabel}<br>
    Cost: ${costStr} | Points: ${pts}
    ${canCurrency ? '<br><label><input type="checkbox" id="use-currency-cb"> Use currency card (+3 pts)</label>' : ''}
  `;
  claimBtn.disabled = !canClaim;
}

// ── Game messages ──

export function showMessage(text, type = 'info') {
  const div = document.createElement('div');
  div.className = `msg msg-${type}`;
  div.textContent = text;
  messageEl.appendChild(div);
  messageEl.scrollTop = messageEl.scrollHeight;
  // Keep last 30 messages
  while (messageEl.children.length > 30) {
    messageEl.removeChild(messageEl.firstChild);
  }
}

// ── Modal system ──

export function showModal(title, content, buttons = []) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';

    const h2 = document.createElement('h2');
    h2.textContent = title;
    modal.appendChild(h2);

    const body = document.createElement('div');
    body.className = 'modal-body';
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else {
      body.appendChild(content);
    }
    modal.appendChild(body);

    if (buttons.length > 0) {
      const btnBar = document.createElement('div');
      btnBar.className = 'modal-buttons';
      for (const btn of buttons) {
        const b = document.createElement('button');
        b.textContent = btn.label;
        b.className = btn.primary ? 'btn btn-primary' : 'btn';
        b.addEventListener('click', () => {
          overlay.remove();
          resolve(btn.value);
        });
        btnBar.appendChild(b);
      }
      modal.appendChild(btnBar);
    }

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  });
}

export function showTicketPicker(tickets, minKeep = 1) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';

    const h2 = document.createElement('h2');
    h2.textContent = `Choose Destination Tickets (keep at least ${minKeep})`;
    modal.appendChild(h2);

    const body = document.createElement('div');
    body.className = 'modal-body';

    const checkboxes = [];
    for (const ticket of tickets) {
      const from = CITIES[ticket.from].name;
      const to = CITIES[ticket.to].name;
      const label = document.createElement('label');
      label.className = 'ticket-option';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.dataset.ticketId = ticket.id;
      checkboxes.push(cb);
      label.appendChild(cb);
      label.appendChild(document.createTextNode(` ${from} → ${to} (${ticket.points} pts)`));
      body.appendChild(label);
    }
    modal.appendChild(body);

    const btnBar = document.createElement('div');
    btnBar.className = 'modal-buttons';
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Confirm';
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.addEventListener('click', () => {
      const kept = [];
      const returned = [];
      for (let i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].checked) kept.push(tickets[i]);
        else returned.push(tickets[i]);
      }
      if (kept.length < minKeep) {
        alert(`You must keep at least ${minKeep} ticket(s)!`);
        return;
      }
      overlay.remove();
      resolve({ kept, returned });
    });
    btnBar.appendChild(confirmBtn);
    modal.appendChild(btnBar);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  });
}

export function showEndGameModal(results) {
  const winner = results.reduce((a, b) => a.finalScore >= b.finalScore ? a : b);

  let html = '<table class="score-table"><tr><th></th>';
  for (const r of results) {
    html += `<th style="color:${PLAYER_COLORS[r.playerIdx]}">${PLAYER_NAMES[r.playerIdx]}</th>`;
  }
  html += '</tr>';

  html += '<tr><td>Route Points</td>';
  for (const r of results) html += `<td>${r.routePoints}</td>`;
  html += '</tr>';

  html += '<tr><td>Ticket Points</td>';
  for (const r of results) html += `<td>${r.ticketPoints >= 0 ? '+' : ''}${r.ticketPoints}</td>`;
  html += '</tr>';

  html += '<tr><td>Currency Bonuses</td>';
  for (const r of results) html += `<td>+${r.currencyBonuses}</td>`;
  html += '</tr>';

  html += `<tr><td>Longest Path (${results[0].longestPath} vs ${results[1].longestPath})</td>`;
  for (const r of results) html += `<td>${r.longestPathBonus > 0 ? `+${r.longestPathBonus}` : '—'}</td>`;
  html += '</tr>';

  html += '<tr class="total-row"><td><strong>Total</strong></td>';
  for (const r of results) html += `<td><strong>${r.finalScore}</strong></td>`;
  html += '</tr></table>';

  // Ticket details
  for (const r of results) {
    html += `<h3 style="color:${PLAYER_COLORS[r.playerIdx]}">${PLAYER_NAMES[r.playerIdx]}'s Tickets</h3><ul>`;
    for (const tr of r.ticketResults) {
      const from = CITIES[tr.ticket.from].name;
      const to = CITIES[tr.ticket.to].name;
      const icon = tr.connected ? '✓' : '✗';
      const cls = tr.connected ? 'ticket-complete' : 'ticket-fail';
      html += `<li class="${cls}">${icon} ${from} → ${to}: ${tr.points > 0 ? '+' : ''}${tr.points}</li>`;
    }
    html += '</ul>';
  }

  const winnerName = PLAYER_NAMES[winner.playerIdx];
  return showModal(`${winnerName} Wins!`, html, [{ label: 'New Game', value: 'new', primary: true }]);
}

// ── Draw tickets button ──

export function setDrawTicketsBtn(onClick) {
  drawTicketsBtn.onclick = onClick;
}

export function setClaimBtn(onClick) {
  claimBtn.onclick = onClick;
}

export function disableActions(disabled) {
  claimBtn.disabled = disabled;
  drawTicketsBtn.disabled = disabled;
  deckBtn.disabled = disabled;
  const faceUpCards = document.querySelectorAll('.face-up-card');
  faceUpCards.forEach(c => {
    if (disabled) c.classList.add('disabled');
    else c.classList.remove('disabled');
  });
}
