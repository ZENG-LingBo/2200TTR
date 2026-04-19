// ── GBA Ticket to Ride — Game State Management ──

import {
  CITIES, ROUTES, TICKETS, CARD_COLORS, LOCO, CURRENCY_TYPES,
  CARDS_PER_COLOR, LOCO_COUNT, CURRENCY_PER_TYPE,
  TRAINS_PER_PLAYER, STARTING_HAND, END_TRIGGER, CURRENCY_BONUS,
  LONGEST_PATH_BONUS, ROUTE_TYPE, DEFAULT_NUM_PLAYERS,
  getRoutePoints, DOUBLE_ROUTE_PAIRS,
} from './game-data.js';

// ── Utility ──
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Build full deck (128 cards) ──
function buildDeck() {
  const deck = [];
  for (const color of CARD_COLORS) {
    for (let i = 0; i < CARDS_PER_COLOR; i++) deck.push(color);
  }
  for (let i = 0; i < LOCO_COUNT; i++) deck.push(LOCO);
  for (const cur of CURRENCY_TYPES) {
    for (let i = 0; i < CURRENCY_PER_TYPE; i++) deck.push(cur);
  }
  return shuffle(deck);
}

// ── Player factory ──
function createPlayer(index) {
  return {
    index,
    hand: {},       // { color: count }
    tickets: [],    // array of ticket objects
    claimedRoutes: [], // route ids
    trains: TRAINS_PER_PLAYER,
    score: 0,
    currencyBonuses: 0,
  };
}

// ── GameState class ──
export class GameState {
  constructor() {
    this.players = [];
    this.numPlayers = DEFAULT_NUM_PLAYERS;
    this.deck = [];
    this.discardPile = [];
    this.faceUp = [];
    this.ticketDeck = [];
    this.currentPlayer = 0;
    this.gamePhase = 'setup'; // setup, playing, lastRound, ended
    this.lastRoundTriggeredBy = -1;
    this.turnNumber = 0;
    this.log = [];
  }

  init(numPlayers = DEFAULT_NUM_PLAYERS) {
    this.numPlayers = numPlayers;
    this.deck = buildDeck();
    this.discardPile = [];
    this.ticketDeck = shuffle([...TICKETS]);
    this.players = [];
    for (let i = 0; i < numPlayers; i++) {
      this.players.push(createPlayer(i));
    }

    // Deal starting hands
    for (const p of this.players) {
      for (let i = 0; i < STARTING_HAND; i++) {
        const card = this.deck.pop();
        p.hand[card] = (p.hand[card] || 0) + 1;
      }
    }

    // Set up face-up
    this.faceUp = [];
    for (let i = 0; i < 5; i++) {
      this.faceUp.push(this.deck.pop());
    }
    this._checkThreeLocos();

    this.currentPlayer = 0;
    this.gamePhase = 'setup';
    this.turnNumber = 0;
    this.log = [];
  }

  // ── Card drawing ──

  _refillDeck() {
    if (this.deck.length === 0) {
      this.deck = shuffle([...this.discardPile]);
      this.discardPile = [];
    }
  }

  _checkThreeLocos() {
    let locoCount = this.faceUp.filter(c => c === LOCO).length;
    let attempts = 0;
    while (locoCount >= 3 && attempts < 5) {
      this.discardPile.push(...this.faceUp);
      this.faceUp = [];
      this._refillDeck();
      for (let i = 0; i < 5 && this.deck.length > 0; i++) {
        this.faceUp.push(this.deck.pop());
      }
      locoCount = this.faceUp.filter(c => c === LOCO).length;
      attempts++;
    }
  }

  drawCard(playerIdx, source) {
    // source: 'deck' or index 0-4 for face-up
    const player = this.players[playerIdx];
    let card;
    if (source === 'deck') {
      this._refillDeck();
      if (this.deck.length === 0) return null;
      card = this.deck.pop();
    } else {
      card = this.faceUp[source];
      if (!card) return null;
      this._refillDeck();
      this.faceUp[source] = this.deck.length > 0 ? this.deck.pop() : null;
      this._checkThreeLocos();
    }
    if (card) {
      player.hand[card] = (player.hand[card] || 0) + 1;
    }
    return card;
  }

  isLocoFaceUp(index) {
    return this.faceUp[index] === LOCO;
  }

  isCurrencyCard(card) {
    return CURRENCY_TYPES.includes(card);
  }

  // ── Route claiming ──

  canClaimRoute(playerIdx, routeIdx) {
    const route = ROUTES[routeIdx];
    const player = this.players[playerIdx];

    // Already claimed?
    if (this._isRouteClaimed(routeIdx)) return false;

    // Double route: in 2-3 player games, if partner is claimed, block
    if (route.doubleOf >= 0 && this.numPlayers <= 3) {
      if (this._isRouteClaimed(route.doubleOf)) return false;
    }
    // In 4p, can't claim both of a double pair yourself
    if (route.doubleOf >= 0) {
      if (player.claimedRoutes.includes(route.doubleOf)) return false;
    }

    // Enough trains?
    if (player.trains < route.length) return false;

    // Card check
    return this._getValidCardCombos(playerIdx, routeIdx).length > 0;
  }

  _isRouteClaimed(routeIdx) {
    return this.players.some(p => p.claimedRoutes.includes(routeIdx));
  }

  _getValidCardCombos(playerIdx, routeIdx) {
    const route = ROUTES[routeIdx];
    const player = this.players[playerIdx];
    const combos = [];
    const locos = player.hand[LOCO] || 0;

    if (route.type === ROUTE_TYPE.BRIDGE) {
      // Need: length color cards + 1 extra loco
      const extraLocoNeeded = 1;
      if (route.color === 'gray') {
        // Any single color works
        for (const color of CARD_COLORS) {
          const have = player.hand[color] || 0;
          const locoUsable = locos - extraLocoNeeded; // reserve 1 for bridge
          if (locoUsable < 0) continue;
          if (have + locoUsable >= route.length) {
            const colorUsed = Math.min(have, route.length);
            const locoForColor = route.length - colorUsed;
            combos.push({ color, count: colorUsed, locos: locoForColor + extraLocoNeeded });
          }
        }
      } else {
        const have = player.hand[route.color] || 0;
        const locoUsable = locos - extraLocoNeeded;
        if (locoUsable >= 0 && have + locoUsable >= route.length) {
          const colorUsed = Math.min(have, route.length);
          const locoForColor = route.length - colorUsed;
          combos.push({ color: route.color, count: colorUsed, locos: locoForColor + extraLocoNeeded });
        }
      }
    } else if (route.type === ROUTE_TYPE.FERRY) {
      // Need: length cards, at least 1 must be loco
      if (locos < 1) return [];
      if (route.color === 'gray') {
        for (const color of CARD_COLORS) {
          const have = player.hand[color] || 0;
          if (have + locos >= route.length) {
            const colorUsed = Math.min(have, route.length - 1); // at least 1 loco
            const locoUsed = route.length - colorUsed;
            combos.push({ color, count: colorUsed, locos: locoUsed });
          }
        }
        // All locos
        if (locos >= route.length) {
          combos.push({ color: null, count: 0, locos: route.length });
        }
      } else {
        const have = player.hand[route.color] || 0;
        if (have + locos >= route.length) {
          const colorUsed = Math.min(have, route.length - 1);
          const locoUsed = route.length - colorUsed;
          combos.push({ color: route.color, count: colorUsed, locos: locoUsed });
        }
      }
    } else {
      // Normal route
      if (route.color === 'gray') {
        for (const color of CARD_COLORS) {
          const have = player.hand[color] || 0;
          if (have + locos >= route.length) {
            const colorUsed = Math.min(have, route.length);
            combos.push({ color, count: colorUsed, locos: route.length - colorUsed });
          }
        }
        // All locos
        if (locos >= route.length) {
          combos.push({ color: null, count: 0, locos: route.length });
        }
      } else {
        const have = player.hand[route.color] || 0;
        if (have + locos >= route.length) {
          const colorUsed = Math.min(have, route.length);
          combos.push({ color: route.color, count: colorUsed, locos: route.length - colorUsed });
        }
      }
    }

    return combos;
  }

  getBestCombo(playerIdx, routeIdx) {
    const combos = this._getValidCardCombos(playerIdx, routeIdx);
    if (combos.length === 0) return null;
    // Prefer combo that uses fewest locos
    combos.sort((a, b) => a.locos - b.locos);
    return combos[0];
  }

  claimRoute(playerIdx, routeIdx, combo, useCurrency = false) {
    const route = ROUTES[routeIdx];
    const player = this.players[playerIdx];

    // Discard color cards
    if (combo.color && combo.count > 0) {
      player.hand[combo.color] -= combo.count;
      for (let i = 0; i < combo.count; i++) this.discardPile.push(combo.color);
    }
    // Discard locos
    if (combo.locos > 0) {
      player.hand[LOCO] = (player.hand[LOCO] || 0) - combo.locos;
      for (let i = 0; i < combo.locos; i++) this.discardPile.push(LOCO);
    }

    // Currency bonus
    let currencyUsed = false;
    if (useCurrency) {
      const zone = this._getRouteCurrencyZone(route);
      if (zone && (player.hand[zone] || 0) > 0) {
        player.hand[zone]--;
        this.discardPile.push(zone);
        currencyUsed = true;
      }
    }

    player.claimedRoutes.push(routeIdx);
    player.trains -= route.length;

    const points = getRoutePoints(route.length, route.type);
    player.score += points;
    if (currencyUsed) {
      player.score += CURRENCY_BONUS;
      player.currencyBonuses++;
    }

    return { points, currencyUsed, currencyBonus: currencyUsed ? CURRENCY_BONUS : 0 };
  }

  _getRouteCurrencyZone(route) {
    const cityFrom = CITIES[route.from];
    const cityTo = CITIES[route.to];
    if (cityFrom.zone === cityTo.zone) return cityFrom.zone;
    return null;
  }

  canUseCurrency(playerIdx, routeIdx) {
    const route = ROUTES[routeIdx];
    const player = this.players[playerIdx];
    const zone = this._getRouteCurrencyZone(route);
    return zone && (player.hand[zone] || 0) > 0;
  }

  getClaimableRoutes(playerIdx) {
    return ROUTES.filter((_, i) => this.canClaimRoute(playerIdx, i)).map(r => r.id);
  }

  // ── Destination tickets ──

  drawTickets() {
    const drawn = [];
    for (let i = 0; i < 3 && this.ticketDeck.length > 0; i++) {
      drawn.push(this.ticketDeck.pop());
    }
    return drawn;
  }

  keepTickets(playerIdx, kept) {
    this.players[playerIdx].tickets.push(...kept);
  }

  returnTickets(tickets) {
    // Put unkept tickets back at bottom
    this.ticketDeck.unshift(...tickets);
  }

  // ── Turn management ──

  endTurn() {
    // Check end trigger
    if (this.players[this.currentPlayer].trains <= END_TRIGGER && this.lastRoundTriggeredBy < 0) {
      this.lastRoundTriggeredBy = this.currentPlayer;
      this.gamePhase = 'lastRound';
      this.log.push(`Player ${this.currentPlayer + 1} triggered the last round! (≤${END_TRIGGER} trains)`);
    }

    // Advance to next player
    this.currentPlayer = (this.currentPlayer + 1) % this.numPlayers;
    this.turnNumber++;

    // Check if last round is complete
    if (this.gamePhase === 'lastRound' && this.currentPlayer === this.lastRoundTriggeredBy) {
      this.gamePhase = 'ended';
    }
  }

  // ── Connectivity check (BFS) ──

  isConnected(playerIdx, cityA, cityB) {
    if (cityA === cityB) return true;
    const playerRoutes = this.players[playerIdx].claimedRoutes;
    const adj = {};
    for (const rid of playerRoutes) {
      const r = ROUTES[rid];
      if (!adj[r.from]) adj[r.from] = [];
      if (!adj[r.to]) adj[r.to] = [];
      adj[r.from].push(r.to);
      adj[r.to].push(r.from);
    }
    const visited = new Set();
    const queue = [cityA];
    visited.add(cityA);
    while (queue.length > 0) {
      const node = queue.shift();
      if (node === cityB) return true;
      for (const neighbor of (adj[node] || [])) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    return false;
  }

  // ── Longest continuous path ──

  longestPath(playerIdx) {
    const playerRoutes = this.players[playerIdx].claimedRoutes;
    if (playerRoutes.length === 0) return 0;

    const adj = {};
    for (const rid of playerRoutes) {
      const r = ROUTES[rid];
      if (!adj[r.from]) adj[r.from] = [];
      if (!adj[r.to]) adj[r.to] = [];
      adj[r.from].push({ to: r.to, length: r.length, id: rid });
      adj[r.to].push({ to: r.from, length: r.length, id: rid });
    }

    let maxLen = 0;
    const usedRoutes = new Set();

    const dfs = (node, pathLen) => {
      maxLen = Math.max(maxLen, pathLen);
      for (const edge of (adj[node] || [])) {
        if (!usedRoutes.has(edge.id)) {
          usedRoutes.add(edge.id);
          dfs(edge.to, pathLen + edge.length);
          usedRoutes.delete(edge.id);
        }
      }
    };

    const cities = new Set();
    for (const rid of playerRoutes) {
      cities.add(ROUTES[rid].from);
      cities.add(ROUTES[rid].to);
    }

    for (const city of cities) {
      dfs(city, 0);
    }
    return maxLen;
  }

  // ── Final scoring ──

  calculateFinalScore() {
    const results = [];
    for (const player of this.players) {
      let ticketPoints = 0;
      const ticketResults = [];
      for (const ticket of player.tickets) {
        const connected = this.isConnected(player.index, ticket.from, ticket.to);
        const pts = connected ? ticket.points : -ticket.points;
        ticketPoints += pts;
        ticketResults.push({ ticket, connected, points: pts });
      }

      const pathLen = this.longestPath(player.index);
      results.push({
        playerIdx: player.index,
        routePoints: player.score,
        ticketPoints,
        ticketResults,
        currencyBonuses: player.currencyBonuses * CURRENCY_BONUS,
        longestPath: pathLen,
        totalBeforePath: player.score + ticketPoints,
      });
    }

    // Determine longest path winner(s)
    const maxPath = Math.max(...results.map(r => r.longestPath));
    for (const r of results) {
      r.longestPathBonus = (r.longestPath === maxPath && maxPath > 0) ? LONGEST_PATH_BONUS : 0;
      r.finalScore = r.totalBeforePath + r.longestPathBonus;
    }

    return results;
  }

  // ── Hand helpers ──

  getHandTotal(playerIdx) {
    const hand = this.players[playerIdx].hand;
    return Object.values(hand).reduce((sum, n) => sum + n, 0);
  }

  getHandCount(playerIdx, cardType) {
    return this.players[playerIdx].hand[cardType] || 0;
  }
}
