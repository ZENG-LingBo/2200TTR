// ── GBA Ticket to Ride — AI Opponent ──

import { ROUTES, CITIES, CARD_COLORS, LOCO, ROUTE_TYPE, getRoutePoints } from './game-data.js';

// ── BFS: find shortest path between two cities using unclaimed routes ──
function findPath(gameState, playerIdx, from, to) {
  const claimed = new Set();
  for (const p of gameState.players) {
    for (const rid of p.claimedRoutes) {
      if (p.index !== playerIdx) claimed.add(rid);
    }
  }

  const adj = {};
  for (const r of ROUTES) {
    if (claimed.has(r.id)) continue;
    // Skip double route partner if already claimed by someone in 2-3p
    if (r.doubleOf >= 0 && claimed.has(r.doubleOf) && gameState.players.length <= 3) continue;

    if (!adj[r.from]) adj[r.from] = [];
    if (!adj[r.to]) adj[r.to] = [];
    adj[r.from].push({ city: r.to, routeId: r.id });
    adj[r.to].push({ city: r.from, routeId: r.id });
  }

  const visited = new Set();
  const queue = [{ city: from, path: [] }];
  visited.add(from);

  while (queue.length > 0) {
    const { city, path } = queue.shift();
    if (city === to) return path;
    for (const edge of (adj[city] || [])) {
      if (!visited.has(edge.city)) {
        visited.add(edge.city);
        queue.push({ city: edge.city, path: [...path, edge.routeId] });
      }
    }
  }
  return null; // no path
}

// ── Determine which routes the AI needs for its tickets ──
function getNeededRoutes(gameState, playerIdx) {
  const player = gameState.players[playerIdx];
  const needed = new Set();

  for (const ticket of player.tickets) {
    if (gameState.isConnected(playerIdx, ticket.from, ticket.to)) continue;
    const path = findPath(gameState, playerIdx, ticket.from, ticket.to);
    if (path) {
      for (const rid of path) {
        if (!player.claimedRoutes.includes(rid)) {
          needed.add(rid);
        }
      }
    }
  }
  return needed;
}

// ── Determine which colors the AI needs most ──
function getNeededColors(gameState, playerIdx) {
  const needed = getNeededRoutes(gameState, playerIdx);
  const colorCounts = {};

  for (const rid of needed) {
    const route = ROUTES[rid];
    const color = route.color === 'gray' ? 'any' : route.color;
    colorCounts[color] = (colorCounts[color] || 0) + route.length;
  }
  return colorCounts;
}

// ── AI turn ──
export function aiTakeTurn(gameState, playerIdx, callbacks) {
  const player = gameState.players[playerIdx];
  const claimable = gameState.getClaimableRoutes(playerIdx);
  const needed = getNeededRoutes(gameState, playerIdx);

  // Priority 1: Claim a route that completes a destination ticket
  for (const rid of claimable) {
    if (!needed.has(rid)) continue;
    const route = ROUTES[rid];

    // Check if claiming this route would complete any ticket
    const willComplete = player.tickets.some(ticket => {
      if (gameState.isConnected(playerIdx, ticket.from, ticket.to)) return false;
      // Simulate: would connecting these cities via this route complete the ticket?
      const tmpRoutes = [...player.claimedRoutes, rid];
      return isConnectedWith(tmpRoutes, ticket.from, ticket.to);
    });

    if (willComplete) {
      const combo = gameState.getBestCombo(playerIdx, rid);
      if (combo) {
        const useCurrency = gameState.canUseCurrency(playerIdx, rid);
        callbacks.claimRoute(rid, combo, useCurrency);
        return;
      }
    }
  }

  // Priority 2: Claim a needed route if we have the cards
  const neededClaimable = claimable.filter(rid => needed.has(rid));
  if (neededClaimable.length > 0) {
    // Pick the longest one we can afford (most value)
    neededClaimable.sort((a, b) => ROUTES[b].length - ROUTES[a].length);
    const rid = neededClaimable[0];
    const combo = gameState.getBestCombo(playerIdx, rid);
    if (combo) {
      const useCurrency = gameState.canUseCurrency(playerIdx, rid);
      callbacks.claimRoute(rid, combo, useCurrency);
      return;
    }
  }

  // Priority 3: Claim any high-value route (4+ length)
  const highValue = claimable.filter(rid => ROUTES[rid].length >= 4);
  if (highValue.length > 0) {
    highValue.sort((a, b) => getRoutePoints(ROUTES[b].length, ROUTES[b].type) - getRoutePoints(ROUTES[a].length, ROUTES[a].type));
    const rid = highValue[0];
    const combo = gameState.getBestCombo(playerIdx, rid);
    if (combo) {
      const useCurrency = gameState.canUseCurrency(playerIdx, rid);
      callbacks.claimRoute(rid, combo, useCurrency);
      return;
    }
  }

  // Priority 4: Draw destination tickets if few tickets and big hand
  if (player.tickets.length < 2 && gameState.getHandTotal(playerIdx) >= 8 && gameState.ticketDeck.length >= 3) {
    callbacks.drawTickets();
    return;
  }

  // Priority 5: Draw train cards
  // Prefer face-up cards that match needed colors
  const neededColors = getNeededColors(gameState, playerIdx);
  let drawsLeft = 2;

  for (let draw = 0; draw < 2 && drawsLeft > 0; draw++) {
    let bestIdx = -1;
    let bestScore = -1;

    for (let i = 0; i < 5; i++) {
      const card = gameState.faceUp[i];
      if (!card) continue;
      if (card === LOCO) {
        // Loco is always good, but costs full draw
        if (drawsLeft >= 2 || draw === 0) {
          bestIdx = i;
          bestScore = 100;
          break;
        }
        continue;
      }
      // Skip currency cards for AI (keep it simple)
      if (['RMB', 'HKD', 'MOP'].includes(card)) continue;

      let score = 1; // base: any train card is okay
      if (neededColors[card]) score = neededColors[card] + 5;
      if (neededColors['any']) score += 2;

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0 && gameState.faceUp[bestIdx] === LOCO) {
      callbacks.drawCard(bestIdx);
      return; // Loco takes full draw
    }

    if (bestIdx >= 0 && bestScore > 2) {
      callbacks.drawCard(bestIdx);
      drawsLeft--;
    } else {
      callbacks.drawCard('deck');
      drawsLeft--;
    }
  }
}

// ── AI ticket selection (keep all by default, or drop worst) ──
export function aiPickTickets(gameState, playerIdx, tickets) {
  // Keep all tickets that seem achievable (path exists)
  const keep = [];
  const ret = [];
  for (const ticket of tickets) {
    const path = findPath(gameState, playerIdx, ticket.from, ticket.to);
    if (path && path.length <= 5) {
      keep.push(ticket);
    } else {
      ret.push(ticket);
    }
  }
  // Must keep at least 1
  if (keep.length === 0) {
    // Keep the shortest/easiest
    tickets.sort((a, b) => a.points - b.points);
    keep.push(tickets[0]);
    ret.push(...tickets.slice(1));
  }
  return { kept: keep, returned: ret };
}

// ── Helper: check connectivity with a hypothetical route set ──
function isConnectedWith(routeIds, cityA, cityB) {
  if (cityA === cityB) return true;
  const adj = {};
  for (const rid of routeIds) {
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
    for (const nb of (adj[node] || [])) {
      if (!visited.has(nb)) {
        visited.add(nb);
        queue.push(nb);
      }
    }
  }
  return false;
}
