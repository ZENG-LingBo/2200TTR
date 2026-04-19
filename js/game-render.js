// ── GBA Ticket to Ride — Rendering ──

import {
  CITIES, ROUTES, CARD_COLORS, LOCO, CURRENCY_TYPES,
  COLOR_HEX, PLAYER_COLORS, DEFAULT_PLAYER_NAMES, ROUTE_TYPE,
  MIN_PLAYERS, MAX_PLAYERS, getRoutePoints, CURRENCY_BONUS_VALUES,
} from './game-data.js';

// ── Player name lookup (set by main.js after setup) ──
let playerNames = [...DEFAULT_PLAYER_NAMES];
let playerTypes = ['human', 'ai', 'ai', 'ai']; // 'human' or 'ai'

export function setPlayerInfo(names, types) {
  playerNames = names;
  playerTypes = types;
}

export function getPlayerName(idx) {
  return playerNames[idx] || DEFAULT_PLAYER_NAMES[idx];
}

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
      rect.setAttribute('stroke', '#000');
      rect.setAttribute('stroke-width', '2');
      rect.setAttribute('opacity', '1');
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

  // Player ownership badge on claimed routes
  if (isClaimed) {
    const midI = Math.floor(route.length / 2);
    const midOffset = startOffset + midI * (segLen + gap) + segLen / 2;
    const bx = startX + (dx / dist) * midOffset;
    const by = startY + (dy / dist) * midOffset;

    const badge = document.createElementNS(SVG_NS, 'circle');
    badge.setAttribute('cx', bx);
    badge.setAttribute('cy', by);
    badge.setAttribute('r', '10');
    badge.setAttribute('fill', '#fff');
    badge.setAttribute('stroke', PLAYER_COLORS[claimedBy]);
    badge.setAttribute('stroke-width', '3');
    g.appendChild(badge);

    const badgeText = document.createElementNS(SVG_NS, 'text');
    badgeText.setAttribute('x', bx);
    badgeText.setAttribute('y', by + 4);
    badgeText.setAttribute('text-anchor', 'middle');
    badgeText.setAttribute('font-size', '12');
    badgeText.setAttribute('font-weight', '700');
    badgeText.setAttribute('fill', PLAYER_COLORS[claimedBy]);
    badgeText.textContent = `P${claimedBy + 1}`;
    g.appendChild(badgeText);
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

export function renderHand(player, hidden = false) {
  handContainer.innerHTML = '';
  if (hidden) {
    const total = Object.values(player.hand).reduce((s, n) => s + n, 0);
    const div = document.createElement('div');
    div.className = 'hand-hidden';
    div.textContent = `🂠 ${total} cards (hidden)`;
    handContainer.appendChild(div);
    return;
  }
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

export function renderTickets(player, gameState, hidden = false) {
  ticketContainer.innerHTML = '';
  if (hidden) {
    const div = document.createElement('div');
    div.className = 'ticket ticket-hidden';
    div.textContent = `🎫 ${player.tickets.length} ticket(s) (hidden)`;
    ticketContainer.appendChild(div);
    return;
  }
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
  scoreDisplay.innerHTML = players.map((p, i) => {
    const typeIcon = playerTypes[i] === 'ai' ? ' 🤖' : '';
    return `<span class="score-item" style="color:${PLAYER_COLORS[i]}">${playerNames[i]}${typeIcon}: ${p.score} pts | ${p.trains} trains</span>`;
  }).join(' &nbsp;|&nbsp; ');
}

// ── Turn indicator ──

export function renderTurnIndicator(currentPlayer, phase) {
  if (phase === 'ended') {
    turnIndicator.textContent = 'Game Over!';
    turnIndicator.style.color = '#e74c3c';
  } else {
    const name = playerNames[currentPlayer];
    const typeIcon = playerTypes[currentPlayer] === 'ai' ? ' 🤖' : '';
    turnIndicator.textContent = `${name}${typeIcon} — Turn`;
    turnIndicator.style.color = PLAYER_COLORS[currentPlayer];
  }
}

// ── Selected route info ──

export function showSelectedRoute(routeId, canClaim, currencyZone, combo) {
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
    ${currencyZone ? `<br><label><input type="checkbox" id="use-currency-cb"> Use ${currencyZone} currency card (+${CURRENCY_BONUS_VALUES[currencyZone]} pts)</label>` : ''}
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

export function showTicketPicker(tickets, minKeep = 1, playerIdx = 0) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';

    const h2 = document.createElement('h2');
    h2.style.color = PLAYER_COLORS[playerIdx];
    h2.textContent = `${playerNames[playerIdx]}: Choose Tickets (keep ≥${minKeep})`;
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
    html += `<th style="color:${PLAYER_COLORS[r.playerIdx]}">${playerNames[r.playerIdx]}</th>`;
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

  const pathSummary = results.map(r => r.longestPath).join(' vs ');
  html += `<tr><td>Longest Path (${pathSummary})</td>`;
  for (const r of results) html += `<td>${r.longestPathBonus > 0 ? `+${r.longestPathBonus}` : '—'}</td>`;
  html += '</tr>';

  html += '<tr class="total-row"><td><strong>Total</strong></td>';
  for (const r of results) html += `<td><strong>${r.finalScore}</strong></td>`;
  html += '</tr></table>';

  // Ticket details
  for (const r of results) {
    html += `<h3 style="color:${PLAYER_COLORS[r.playerIdx]}">${playerNames[r.playerIdx]}'s Tickets</h3><ul>`;
    for (const tr of r.ticketResults) {
      const from = CITIES[tr.ticket.from].name;
      const to = CITIES[tr.ticket.to].name;
      const icon = tr.connected ? '✓' : '✗';
      const cls = tr.connected ? 'ticket-complete' : 'ticket-fail';
      html += `<li class="${cls}">${icon} ${from} → ${to}: ${tr.points > 0 ? '+' : ''}${tr.points}</li>`;
    }
    html += '</ul>';
  }

  const winnerName = playerNames[winner.playerIdx];
  return showModal(`${winnerName} Wins!`, html, [{ label: 'New Game', value: 'new', primary: true }]);
}

// ── Setup screen: pick number of players & human/AI for each ──

export function showSetupScreen() {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay setup-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal setup-modal';

    const h2 = document.createElement('h2');
    h2.textContent = 'GBA Ticket to Ride';
    modal.appendChild(h2);

    const sub = document.createElement('p');
    sub.className = 'setup-subtitle';
    sub.textContent = 'Build train routes across the Greater Bay Area';
    modal.appendChild(sub);

    // Player count selector
    const countDiv = document.createElement('div');
    countDiv.className = 'setup-section';
    countDiv.innerHTML = '<h3>Number of Players</h3>';
    const countBar = document.createElement('div');
    countBar.className = 'setup-count-bar';
    let currentCount = 2;
    const countBtns = [];
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
      const b = document.createElement('button');
      b.className = 'btn setup-count-btn' + (n === currentCount ? ' active' : '');
      b.textContent = n;
      b.addEventListener('click', () => {
        currentCount = n;
        countBtns.forEach(btn => btn.classList.remove('active'));
        b.classList.add('active');
        renderPlayerRows();
      });
      countBtns.push(b);
      countBar.appendChild(b);
    }
    countDiv.appendChild(countBar);
    modal.appendChild(countDiv);

    // Player rows
    const playersDiv = document.createElement('div');
    playersDiv.className = 'setup-section';
    playersDiv.innerHTML = '<h3>Players</h3>';
    const playerList = document.createElement('div');
    playerList.className = 'setup-player-list';
    playersDiv.appendChild(playerList);
    modal.appendChild(playersDiv);

    const playerSettings = [
      { name: 'You', type: 'human' },
      { name: 'AI Opponent', type: 'ai' },
      { name: 'Player 3', type: 'ai' },
      { name: 'Player 4', type: 'ai' },
    ];

    function renderPlayerRows() {
      playerList.innerHTML = '';
      for (let i = 0; i < currentCount; i++) {
        const row = document.createElement('div');
        row.className = 'setup-player-row';
        row.style.borderLeftColor = PLAYER_COLORS[i];

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'setup-name-input';
        nameInput.value = playerSettings[i].name;
        nameInput.maxLength = 20;
        nameInput.addEventListener('input', () => { playerSettings[i].name = nameInput.value || `Player ${i + 1}`; });
        row.appendChild(nameInput);

        const typeBar = document.createElement('div');
        typeBar.className = 'setup-type-bar';
        const humanBtn = document.createElement('button');
        humanBtn.className = 'btn setup-type-btn' + (playerSettings[i].type === 'human' ? ' active' : '');
        humanBtn.textContent = '👤 Human';
        humanBtn.addEventListener('click', () => {
          playerSettings[i].type = 'human';
          humanBtn.classList.add('active');
          aiBtn.classList.remove('active');
        });
        const aiBtn = document.createElement('button');
        aiBtn.className = 'btn setup-type-btn' + (playerSettings[i].type === 'ai' ? ' active' : '');
        aiBtn.textContent = '🤖 AI';
        aiBtn.addEventListener('click', () => {
          playerSettings[i].type = 'ai';
          aiBtn.classList.add('active');
          humanBtn.classList.remove('active');
        });
        typeBar.appendChild(humanBtn);
        typeBar.appendChild(aiBtn);
        row.appendChild(typeBar);

        playerList.appendChild(row);
      }
    }
    renderPlayerRows();

    // Start button
    const btnBar = document.createElement('div');
    btnBar.className = 'modal-buttons';
    const startBtn = document.createElement('button');
    startBtn.textContent = 'Start Game';
    startBtn.className = 'btn btn-primary';
    startBtn.addEventListener('click', () => {
      const names = [];
      const types = [];
      for (let i = 0; i < currentCount; i++) {
        names.push(playerSettings[i].name || `Player ${i + 1}`);
        types.push(playerSettings[i].type);
      }
      overlay.remove();
      resolve({ numPlayers: currentCount, names, types });
    });
    btnBar.appendChild(startBtn);
    modal.appendChild(btnBar);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  });
}

// ── Pass-device curtain (for hot-seat multiplayer) ──

export function showPassDeviceScreen(playerIdx) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay pass-device-overlay';
    overlay.style.background = PLAYER_COLORS[playerIdx];

    const modal = document.createElement('div');
    modal.className = 'pass-device-card';

    const name = playerNames[playerIdx];
    modal.innerHTML = `
      <div class="pass-device-icon">🤝</div>
      <h2>Pass the device to</h2>
      <h1 style="color:${PLAYER_COLORS[playerIdx]}">${name}</h1>
      <p>Tap when ready to see your hand</p>
      <button class="btn btn-primary pass-device-btn">I'm Ready</button>
    `;

    modal.querySelector('.pass-device-btn').addEventListener('click', () => {
      overlay.remove();
      resolve();
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  });
}

// ── Onboarding walkthrough ──

// Helper: build a mock card element as HTML string
function mockCard(type, label) {
  const lbl = label !== undefined ? label : (
    type === LOCO ? '🚂' :
    type === 'RMB' ? '¥' :
    type === 'HKD' ? '$' :
    type === 'MOP' ? 'P' : ''
  );
  return `<div class="card wt-card card-${type}"><span class="card-label">${lbl}</span></div>`;
}

// Helper: build a tiny mock SVG map for walkthrough steps
function miniMapSvg({ bridge = false, ferry = false, double = false, routeColor = 'red' } = {}) {
  const colorHex = COLOR_HEX[routeColor] || '#e74c3c';
  const bridgeIcon = bridge ? `<text x="190" y="75" text-anchor="middle" font-size="14">🌉</text>` : '';
  const ferryIcon = ferry ? `<text x="110" y="125" text-anchor="middle" font-size="14">⛴</text>` : '';
  // Double route: draw two parallel lines between city A and B
  const doubleLine = double ? `
    <g>
      ${[0,1,2].map(i => `<rect x="${55 + i*25}" y="52" width="18" height="10" rx="2" fill="#f1c40f" stroke="#555" stroke-width="0.8"/>`).join('')}
      ${[0,1,2].map(i => `<rect x="${55 + i*25}" y="68" width="18" height="10" rx="2" fill="#9b59b6" stroke="#555" stroke-width="0.8"/>`).join('')}
    </g>
  ` : '';

  return `
    <svg class="mini-map" viewBox="0 0 260 160" xmlns="http://www.w3.org/2000/svg">
      <rect width="260" height="160" rx="8" fill="url(#wtWater)"/>
      <defs>
        <linearGradient id="wtWater" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#d4e6f1"/>
          <stop offset="100%" stop-color="#aed6f1"/>
        </linearGradient>
      </defs>
      ${double ? doubleLine : `
        <g>
          ${[0,1,2].map(i => `<rect x="${60 + i*34}" y="60" width="26" height="12" rx="2" fill="${colorHex}" stroke="#555" stroke-width="1" opacity="0.85"/>`).join('')}
        </g>
      `}
      ${bridge ? `<g>
        ${[0,1,2,3].map(i => `<rect x="${160 + i*22}" y="60" width="16" height="12" rx="2" fill="#95a5a6" stroke="#555" stroke-width="1" transform="rotate(25 ${168 + i*22} 66)"/>`).join('')}
      </g>` : ''}
      ${ferry ? `<g>
        ${[0,1,2].map(i => `<rect x="${60 + i*22}" y="110" width="16" height="12" rx="2" fill="#95a5a6" stroke="#555" stroke-width="1" opacity="0.8"/>`).join('')}
      </g>` : ''}
      <!-- Cities -->
      <circle cx="45" cy="65" r="9" fill="#00bcd4" stroke="#006064" stroke-width="2"/>
      <text x="45" y="50" text-anchor="middle" font-size="10" font-weight="700" fill="#1a1a2e" stroke="#fff" stroke-width="2" paint-order="stroke">Foshan</text>
      <circle cx="155" cy="65" r="9" fill="#00bcd4" stroke="#006064" stroke-width="2"/>
      <text x="155" y="50" text-anchor="middle" font-size="10" font-weight="700" fill="#1a1a2e" stroke="#fff" stroke-width="2" paint-order="stroke">Guangzhou</text>
      ${bridge ? `<circle cx="245" cy="95" r="9" fill="#00bcd4" stroke="#006064" stroke-width="2"/><text x="245" y="120" text-anchor="middle" font-size="10" font-weight="700" fill="#1a1a2e" stroke="#fff" stroke-width="2" paint-order="stroke">HK</text>` : ''}
      ${ferry ? `<circle cx="45" cy="135" r="9" fill="#00bcd4" stroke="#006064" stroke-width="2"/><text x="45" y="155" text-anchor="middle" font-size="10" font-weight="700" fill="#1a1a2e" stroke="#fff" stroke-width="2" paint-order="stroke">Macau</text><circle cx="155" cy="135" r="9" fill="#00bcd4" stroke="#006064" stroke-width="2"/><text x="155" y="155" text-anchor="middle" font-size="10" font-weight="700" fill="#1a1a2e" stroke="#fff" stroke-width="2" paint-order="stroke">Zhuhai</text>` : ''}
      ${bridgeIcon}
      ${ferryIcon}
    </svg>
  `;
}

const WALKTHROUGH_STEPS = [
  // 1. Welcome
  {
    title: 'Welcome to GBA Ticket to Ride',
    html: `
      <div class="wt-hero">🚂 🌉 ⛴</div>
      <p>Build train routes across China's <strong>Greater Bay Area</strong> — 11 cities plus Hong Kong and Macau — using real-world bridges and ferries.</p>
      <p class="wt-dim">This quick tour (≈ 1 min) covers every card, route type, and action. You can skip it any time.</p>
    `,
  },
  // 2. Objective
  {
    title: 'Objective',
    html: `
      <p>Score more points than your opponents by:</p>
      <ul class="wt-list">
        <li>🛤 <strong>Claiming routes</strong> between cities (points scale with length)</li>
        <li>🎫 <strong>Completing destination tickets</strong> (big bonus points)</li>
        <li>🏆 <strong>Building the longest continuous path</strong> (+10 pts)</li>
      </ul>
      <p class="wt-callout">Game ends when any player has <strong>≤ 3 trains</strong> left — everyone gets one last turn, then final scoring.</p>
    `,
  },
  // 3. Top Bar
  {
    title: 'UI Tour — Top Bar',
    html: `
      <div class="wt-topbar-mock">
        <span class="wt-mock-title">GBA <em>Ticket to Ride</em></span>
        <span class="wt-mock-scores"><span style="color:#2196F3">You: 12 pts | 28 trains</span>&nbsp;|&nbsp;<span style="color:#F44336">AI: 7 pts | 30 trains</span></span>
        <span class="wt-mock-turn">Your Turn</span>
        <span class="wt-mock-btn">📖</span>
        <span class="wt-mock-btn">?</span>
      </div>
      <ul class="wt-list wt-small">
        <li><strong>Scores + trains</strong> — live scoreboard for every player</li>
        <li><strong>Turn indicator</strong> — whose turn it is right now (colored by player)</li>
        <li><strong>📖 Tutorial</strong> — replay this walkthrough any time</li>
        <li><strong>? Rules</strong> — quick text reference</li>
      </ul>
    `,
  },
  // 4. Map
  {
    title: 'UI Tour — The Map',
    html: `
      ${miniMapSvg({ bridge: true, ferry: true, routeColor: 'red' })}
      <ul class="wt-list wt-small">
        <li><strong>Cyan circles</strong> — cities (English + Chinese labels)</li>
        <li><strong>Colored rectangles</strong> — route segments. Count = number of matching cards you need.</li>
        <li><strong>🌉 Bridge icon</strong> / <strong>⛴ Ferry icon</strong> — special routes (see steps 10 & 11)</li>
        <li>Routes you can <strong>currently afford</strong> will <em>glow and pulse</em> on the real map</li>
      </ul>
    `,
  },
  // 5. Bottom panel
  {
    title: 'UI Tour — Bottom Panel',
    html: `
      <div class="wt-bottompanel-mock">
        <div class="wt-panel-half">
          <div class="wt-panel-label">ACTIONS (left)</div>
          <ul class="wt-list wt-small">
            <li>5 face-up cards you can take</li>
            <li>Draw Deck / Draw Tickets / Claim Route buttons</li>
            <li>Selected-route info + cost breakdown</li>
            <li>Game message log</li>
          </ul>
        </div>
        <div class="wt-panel-half">
          <div class="wt-panel-label">YOUR RESOURCES (right)</div>
          <ul class="wt-list wt-small">
            <li>Your hand (cards grouped by type with counts)</li>
            <li>Your destination tickets — green = done, red = not yet</li>
          </ul>
        </div>
      </div>
    `,
  },
  // 6. Train cards
  {
    title: 'Train Cards — 8 Colors',
    html: `
      <div class="wt-card-row">
        ${['red','orange','yellow','green','blue','purple','white','black'].map(c => mockCard(c, '')).join('')}
      </div>
      <ul class="wt-list wt-small">
        <li><strong>12 cards of each color</strong> in the deck (96 train cards total)</li>
        <li>Used to pay for routes — you need <strong>matching-color cards</strong> equal to the route's length</li>
        <li><strong>Gray routes</strong> (bridges, ferries) accept <strong>any single color</strong></li>
      </ul>
    `,
  },
  // 7. Locomotive cards
  {
    title: 'Locomotive Cards 🚂 — Wild',
    html: `
      <div class="wt-card-row wt-card-row-center">
        ${mockCard('locomotive', '🚂')}
        ${mockCard('locomotive', '🚂')}
        ${mockCard('locomotive', '🚂')}
      </div>
      <ul class="wt-list wt-small">
        <li><strong>14 locomotives</strong> in the deck — wild, substitute for any color</li>
        <li>⚠️ Taking a <strong>face-up locomotive</strong> uses your <em>whole</em> draw turn (1 card, not 2)</li>
        <li>Required: <strong>+1 locomotive for bridges</strong>, <strong>≥1 locomotive for ferries</strong></li>
        <li>Special rule: if 3+ face-up cards become locomotives, all 5 are discarded and refilled</li>
      </ul>
    `,
  },
  // 8. Currency cards
  {
    title: 'Currency Cards — ¥ $ P',
    html: `
      <div class="wt-card-row wt-card-row-center">
        ${mockCard('RMB', '¥')}
        ${mockCard('HKD', '$')}
        ${mockCard('MOP', 'P')}
      </div>
      <ul class="wt-list wt-small">
        <li><strong>¥ RMB</strong> — Mainland (Guangzhou, Shenzhen, Foshan, …) → <strong>+3 pts</strong></li>
        <li><strong>$ HKD</strong> — Hong Kong zone → <strong>+5 pts</strong></li>
        <li><strong>P MOP</strong> — Macau → <strong>+7 pts</strong></li>
        <li>Card counts scale by zone size: <strong>4 RMB · 2 HKD · 2 MOP</strong> (8 total). <em>Not</em> train cards — they can't pay route length.</li>
        <li>Rarer currencies give bigger bonuses! (see step 13)</li>
      </ul>
    `,
  },
  // 9. Normal routes
  {
    title: 'Normal Routes',
    html: `
      ${miniMapSvg({ routeColor: 'red' })}
      <ul class="wt-list wt-small">
        <li>Pay <strong>matching-color train cards</strong> equal to the route's length</li>
        <li>Gray routes accept <strong>any single color</strong> (all cards the same color)</li>
        <li>Locomotives can substitute for any color</li>
      </ul>
      <div class="wt-callout">
        <strong>Scoring:</strong> Length 1→1pt · 2→2 · 3→4 · 4→7 · 5→10 · 6→15
      </div>
    `,
  },
  // 10. Bridges
  {
    title: '🌉 Bridge Routes — 2× points',
    html: `
      ${miniMapSvg({ bridge: true, routeColor: 'red' })}
      <ul class="wt-list wt-small">
        <li>Cost = <strong>route length + 1 extra locomotive</strong></li>
        <li>Score: <strong>2× normal points</strong> — a 6-bridge = <strong>30 pts!</strong></li>
        <li>Real-world bridges: HK–Zhuhai–Macau (2018), Shenzhen–Zhongshan Link (2024), Humen (1997), Nansha (2019), Shenzhen Bay, Tolo Hwy</li>
      </ul>
    `,
  },
  // 11. Ferries
  {
    title: '⛴ Ferry Routes — 1.5× points',
    html: `
      ${miniMapSvg({ ferry: true, routeColor: 'blue' })}
      <ul class="wt-list wt-small">
        <li>Cost = length, but <strong>≥ 1 locomotive must be in the payment</strong></li>
        <li>Score: <strong>1.5× normal points</strong>, rounded up — a 5-ferry = 15 pts</li>
        <li>Real-world ferries: Shekou–HK, TurboJET (HK–Macau), Zhuhai–Macau, cross-delta</li>
      </ul>
    `,
  },
  // 12. Double routes
  {
    title: 'Double Routes',
    html: `
      ${miniMapSvg({ double: true })}
      <p>Two cities sometimes have <strong>parallel routes</strong> (different colors side-by-side).</p>
      <ul class="wt-list wt-small">
        <li><strong>2–3 players:</strong> only <em>one</em> of the pair can be claimed — first come, first served</li>
        <li><strong>4 players:</strong> both can be claimed, but by <em>different</em> players</li>
        <li>You can never claim both sides of a pair yourself</li>
      </ul>
    `,
  },
  // 13. Currency bonus
  {
    title: '💰 Currency Bonus — Scaled',
    html: `
      <div class="wt-card-row wt-card-row-center">
        ${mockCard('RMB', '¥')}
        <span class="wt-plus">+</span>
        ${miniMapSvg({ routeColor: 'red' })}
        <span class="wt-eq">=</span>
        <span class="wt-bonus">+3/+5/+7!</span>
      </div>
      <ul class="wt-list wt-small">
        <li>When claiming a route where <strong>at least one endpoint city</strong> is in the matching currency zone…</li>
        <li>…you may discard one matching currency card for bonus points:</li>
        <li><strong>¥ RMB → +3</strong> · <strong>$ HKD → +5</strong> · <strong>P MOP → +7</strong></li>
        <li>Example: Zhongshan (RMB) → Macau (MOP) → discard MOP card → +7 pts!</li>
        <li>If both currencies match, the system picks the highest-value one</li>
      </ul>
    `,
  },
  // 14. Draw cards
  {
    title: 'Action 1 — Draw Train Cards',
    html: `
      <div class="wt-card-row">
        ${mockCard('red', '')}
        ${mockCard('blue', '')}
        ${mockCard('locomotive', '🚂')}
        ${mockCard('yellow', '')}
        ${mockCard('green', '')}
        <div class="wt-deck-mock">Deck<br>(108)</div>
      </div>
      <ul class="wt-list wt-small">
        <li>Take <strong>2 cards</strong> per turn — each one from either the face-up row or the deck</li>
        <li>⚠️ A <strong>face-up locomotive</strong> takes your <em>whole</em> draw turn (only 1 card)</li>
        <li>Drawing from the <strong>deck</strong> is blind (any color)</li>
      </ul>
    `,
  },
  // 15. Claim route
  {
    title: 'Action 2 — Claim a Route',
    html: `
      <ol class="wt-list wt-small wt-ordered">
        <li>Click any <strong>glowing route</strong> on the map — it becomes selected</li>
        <li>The <strong>selected-route info</strong> panel shows cost breakdown + points</li>
        <li>(Optional) tick <strong>☑ Use currency card</strong> if either city is in a matching zone</li>
        <li>Click <strong>Claim Route</strong> — cards are spent, route turns your color, points added</li>
      </ol>
      <div class="wt-callout">
        Claiming costs <strong>trains</strong> equal to the route's length (you start with 35).
      </div>
    `,
  },
  // 16. Draw tickets
  {
    title: 'Action 3 — Draw Destination Tickets',
    html: `
      <div class="wt-tickets-mock">
        <div class="ticket ticket-complete"><span class="ticket-cities">Guangzhou → Shenzhen</span><span class="ticket-pts">10</span></div>
        <div class="ticket ticket-incomplete"><span class="ticket-cities">Zhaoqing → Hong Kong</span><span class="ticket-pts">15</span></div>
      </div>
      <ul class="wt-list wt-small">
        <li>Draw <strong>3 tickets</strong>, keep at least <strong>1</strong> (≥2 at game start)</li>
        <li>At game end: <strong>connected</strong> endpoints → <strong>+points</strong> · not connected → <strong>−points</strong></li>
        <li>Risk vs reward — long tickets pay big but are harder to complete</li>
      </ul>
    `,
  },
  // 17. Ready
  {
    title: "You're Ready to Play! 🎉",
    html: `
      <div class="wt-recap">
        <div class="wt-recap-item"><div class="wt-recap-num">3</div><div>actions per turn</div></div>
        <div class="wt-recap-item"><div class="wt-recap-num">3</div><div>route types</div></div>
        <div class="wt-recap-item"><div class="wt-recap-num">3</div><div>currencies</div></div>
        <div class="wt-recap-item"><div class="wt-recap-num">3</div><div>ways to score</div></div>
      </div>
      <p class="wt-dim">Replay this tour any time from the <strong>📖 Tutorial</strong> button in the top bar.</p>
      <p>Next: pick 2–4 players (humans, AI, or a mix) on the setup screen.</p>
    `,
  },
];

export function showWalkthrough() {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay walkthrough-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal walkthrough-modal';

    const titleEl = document.createElement('h2');
    modal.appendChild(titleEl);

    const stepIndicator = document.createElement('div');
    stepIndicator.className = 'wt-step-indicator';
    modal.appendChild(stepIndicator);

    const body = document.createElement('div');
    body.className = 'modal-body walkthrough-body';
    modal.appendChild(body);

    const dots = document.createElement('div');
    dots.className = 'walkthrough-dots';
    modal.appendChild(dots);

    const nav = document.createElement('div');
    nav.className = 'walkthrough-nav';

    const skipBtn = document.createElement('button');
    skipBtn.className = 'btn walkthrough-skip-btn';
    skipBtn.textContent = 'Skip Tutorial';

    const navRight = document.createElement('div');
    navRight.className = 'walkthrough-nav-right';
    const backBtn = document.createElement('button');
    backBtn.className = 'btn';
    backBtn.textContent = '← Back';
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-primary';
    nextBtn.textContent = 'Next →';
    navRight.appendChild(backBtn);
    navRight.appendChild(nextBtn);

    nav.appendChild(skipBtn);
    nav.appendChild(navRight);
    modal.appendChild(nav);

    let currentStep = 0;
    const total = WALKTHROUGH_STEPS.length;

    function render() {
      const step = WALKTHROUGH_STEPS[currentStep];
      titleEl.textContent = step.title;
      stepIndicator.textContent = `Step ${currentStep + 1} of ${total}`;
      body.innerHTML = step.html;
      body.scrollTop = 0;

      dots.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const d = document.createElement('button');
        d.className = 'walkthrough-dot';
        if (i === currentStep) d.classList.add('active');
        else if (i < currentStep) d.classList.add('done');
        d.setAttribute('aria-label', `Go to step ${i + 1}`);
        d.addEventListener('click', () => { currentStep = i; render(); });
        dots.appendChild(d);
      }

      backBtn.disabled = currentStep === 0;
      nextBtn.textContent = currentStep === total - 1 ? 'Start Game' : 'Next →';
    }

    function close() {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      resolve();
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight' && currentStep < total - 1) { e.preventDefault(); currentStep++; render(); }
      else if (e.key === 'ArrowLeft' && currentStep > 0) { e.preventDefault(); currentStep--; render(); }
    }

    skipBtn.addEventListener('click', close);
    backBtn.addEventListener('click', () => { if (currentStep > 0) { currentStep--; render(); } });
    nextBtn.addEventListener('click', () => {
      if (currentStep < total - 1) { currentStep++; render(); }
      else close();
    });
    document.addEventListener('keydown', onKey);

    render();
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  });
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
