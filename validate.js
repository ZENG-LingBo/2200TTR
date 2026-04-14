// ── GBA Ticket to Ride — Game Design Validation ──
// Run with: node --experimental-vm-modules validate.js

import {
  CITIES, ROUTES, TICKETS, CARD_COLORS, LOCO, CURRENCY_TYPES,
  ROUTE_TYPE, getRoutePoints, TRAINS_PER_PLAYER,
} from './js/game-data.js';
import { GameState } from './js/game-state.js';

// ═══════════════════════════════════════════════
// 1. NETWORK ANALYSIS
// ═══════════════════════════════════════════════

function analyzeNetwork() {
  console.log('\n══════════════════════════════════════');
  console.log('  1. NETWORK ANALYSIS');
  console.log('══════════════════════════════════════\n');

  // Build adjacency from all routes
  const adj = {};
  for (const r of ROUTES) {
    if (!adj[r.from]) adj[r.from] = [];
    if (!adj[r.to]) adj[r.to] = [];
    adj[r.from].push({ city: r.to, route: r });
    adj[r.to].push({ city: r.from, route: r });
  }

  // Check connectivity
  const visited = new Set();
  const queue = [0];
  visited.add(0);
  while (queue.length > 0) {
    const node = queue.shift();
    for (const edge of (adj[node] || [])) {
      if (!visited.has(edge.city)) {
        visited.add(edge.city);
        queue.push(edge.city);
      }
    }
  }
  console.log(`Cities reachable from Zhaoqing: ${visited.size}/${CITIES.length} ${visited.size === CITIES.length ? '✓ ALL CONNECTED' : '✗ DISCONNECTED!'}`);

  // Degree of each city
  console.log('\nCity connectivity (degree):');
  const degrees = {};
  for (const c of CITIES) degrees[c.id] = 0;
  for (const r of ROUTES) {
    degrees[r.from]++;
    degrees[r.to]++;
  }
  const sorted = CITIES.map(c => ({ name: c.name, degree: degrees[c.id] }))
    .sort((a, b) => b.degree - a.degree);
  for (const c of sorted) {
    const bar = '█'.repeat(c.degree);
    console.log(`  ${c.name.padEnd(12)} ${bar} ${c.degree}`);
  }

  // Identify bottlenecks: cities whose removal disconnects the graph
  console.log('\nBottleneck analysis (articulation points):');
  let bottlenecks = 0;
  for (const city of CITIES) {
    const testVisited = new Set();
    const start = city.id === 0 ? 1 : 0;
    const q = [start];
    testVisited.add(start);
    testVisited.add(city.id); // "remove" this city
    while (q.length > 0) {
      const node = q.shift();
      for (const edge of (adj[node] || [])) {
        if (!testVisited.has(edge.city)) {
          testVisited.add(edge.city);
          q.push(edge.city);
        }
      }
    }
    if (testVisited.size < CITIES.length) {
      console.log(`  ⚠ ${city.name} is a bottleneck! Removing it disconnects the graph.`);
      bottlenecks++;
    }
  }
  if (bottlenecks === 0) console.log('  ✓ No single city is a bottleneck — good redundancy!');

  // Cross-river analysis
  console.log('\nCross-river routes (east ↔ west):');
  const eastCities = new Set([7, 8, 9, 10, 11, 14, 15]); // DG, Humen, HZ, LG, SZ, NT, HK
  const westCities = new Set([0, 1, 2, 5, 6, 12, 13]); // ZQ, Suihui, FS, JM, ZS, ZH, Macau
  // GZ (3) and Huadu (4) are hubs connecting both
  for (const r of ROUTES) {
    const fromEast = eastCities.has(r.from);
    const fromWest = westCities.has(r.from);
    const toEast = eastCities.has(r.to);
    const toWest = westCities.has(r.to);
    if ((fromEast && toWest) || (fromWest && toEast)) {
      const from = CITIES[r.from].name;
      const to = CITIES[r.to].name;
      console.log(`  ${r.type.toUpperCase().padEnd(7)} ${from} ↔ ${to} (len ${r.length})`);
    }
  }

  // Ticket path analysis
  console.log('\nTicket shortest paths:');
  for (const ticket of TICKETS) {
    const path = bfsPath(adj, ticket.from, ticket.to);
    const fromName = CITIES[ticket.from].name;
    const toName = CITIES[ticket.to].name;
    const totalLen = path ? path.reduce((s, r) => s + r.length, 0) : -1;
    const routeCount = path ? path.length : -1;
    const needsBridge = path ? path.some(r => r.type === 'bridge') : false;
    const needsFerry = path ? path.some(r => r.type === 'ferry') : false;
    const special = [];
    if (needsBridge) special.push('bridge');
    if (needsFerry) special.push('ferry');
    console.log(`  ${fromName.padEnd(10)} → ${toName.padEnd(10)} ${ticket.points}pts | ${routeCount} routes, ${totalLen} trains ${special.length ? '(' + special.join('+') + ')' : ''}`);
  }
}

function bfsPath(adj, from, to) {
  const visited = new Set();
  const queue = [{ city: from, path: [] }];
  visited.add(from);
  while (queue.length > 0) {
    const { city, path } = queue.shift();
    if (city === to) return path;
    for (const edge of (adj[city] || [])) {
      if (!visited.has(edge.city)) {
        visited.add(edge.city);
        queue.push({ city: edge.city, path: [...path, edge.route] });
      }
    }
  }
  return null;
}

// ═══════════════════════════════════════════════
// 2. MONTE CARLO SIMULATION
// ═══════════════════════════════════════════════

function simulateGame() {
  const game = new GameState();
  game.init();

  // Both players pick tickets
  for (let p = 0; p < 2; p++) {
    const tickets = game.drawTickets();
    // Keep all tickets (aggressive strategy)
    game.keepTickets(p, tickets);
  }
  game.gamePhase = 'playing';

  let turns = 0;
  const MAX_TURNS = 200;
  const stats = { bridgesClaimed: [0, 0], ferriesClaimed: [0, 0], currencyUsed: [0, 0], routesClaimed: [0, 0] };

  while (game.gamePhase !== 'ended' && turns < MAX_TURNS) {
    const p = game.currentPlayer;
    const player = game.players[p];
    const claimable = game.getClaimableRoutes(p);

    let acted = false;

    // Strategy: try to claim routes, prefer needed ones
    if (claimable.length > 0 && Math.random() < 0.6) {
      // Pick a random claimable route (weighted toward longer ones)
      const weighted = claimable.map(rid => ({ rid, weight: ROUTES[rid].length * ROUTES[rid].length }));
      const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
      let pick = Math.random() * totalWeight;
      let chosen = weighted[0].rid;
      for (const w of weighted) {
        pick -= w.weight;
        if (pick <= 0) { chosen = w.rid; break; }
      }

      const combo = game.getBestCombo(p, chosen);
      if (combo) {
        const useCurrency = game.canUseCurrency(p, chosen);
        const result = game.claimRoute(p, chosen, combo, useCurrency);
        stats.routesClaimed[p]++;
        if (ROUTES[chosen].type === 'bridge') stats.bridgesClaimed[p]++;
        if (ROUTES[chosen].type === 'ferry') stats.ferriesClaimed[p]++;
        if (result.currencyUsed) stats.currencyUsed[p]++;
        acted = true;
      }
    }

    if (!acted) {
      // Draw 2 cards
      for (let d = 0; d < 2; d++) {
        if (game.deck.length > 0 || game.discardPile.length > 0) {
          // 50% face-up, 50% deck
          if (Math.random() < 0.5 && game.faceUp.some(c => c)) {
            const validIdx = game.faceUp.map((c, i) => c ? i : -1).filter(i => i >= 0);
            const idx = validIdx[Math.floor(Math.random() * validIdx.length)];
            if (game.faceUp[idx] === LOCO) {
              game.drawCard(p, idx);
              break; // Loco = full draw
            }
            game.drawCard(p, idx);
          } else {
            game.drawCard(p, 'deck');
          }
        }
      }
    }

    game.endTurn();
    turns++;
  }

  const results = game.calculateFinalScore();
  return { turns, results, stats, ended: game.gamePhase === 'ended' };
}

function runMonteCarlo(numGames) {
  console.log('\n══════════════════════════════════════');
  console.log(`  2. MONTE CARLO SIMULATION (${numGames} games)`);
  console.log('══════════════════════════════════════\n');

  const allResults = [];
  let gamesEnded = 0;

  for (let i = 0; i < numGames; i++) {
    const result = simulateGame();
    allResults.push(result);
    if (result.ended) gamesEnded++;
  }

  // Aggregate stats
  const scores = allResults.flatMap(r => r.results.map(p => p.finalScore));
  const turns = allResults.map(r => r.turns);
  const routePoints = allResults.flatMap(r => r.results.map(p => p.routePoints));
  const ticketPoints = allResults.flatMap(r => r.results.map(p => p.ticketPoints));
  const bridgesClaimed = allResults.flatMap(r => r.stats.bridgesClaimed);
  const ferriesClaimed = allResults.flatMap(r => r.stats.ferriesClaimed);
  const currencyUsed = allResults.flatMap(r => r.stats.currencyUsed);
  const routesClaimed = allResults.flatMap(r => r.stats.routesClaimed);

  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const min = arr => Math.min(...arr);
  const max = arr => Math.max(...arr);
  const std = arr => {
    const m = avg(arr);
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
  };

  console.log(`Games that ended naturally: ${gamesEnded}/${numGames} (${(gamesEnded/numGames*100).toFixed(0)}%)`);
  console.log(`\nGame Length (turns):`);
  console.log(`  Avg: ${avg(turns).toFixed(1)} | Min: ${min(turns)} | Max: ${max(turns)} | Std: ${std(turns).toFixed(1)}`);

  console.log(`\nFinal Scores:`);
  console.log(`  Avg: ${avg(scores).toFixed(1)} | Min: ${min(scores)} | Max: ${max(scores)} | Std: ${std(scores).toFixed(1)}`);

  console.log(`\nScore Breakdown (per player avg):`);
  console.log(`  Route points:  ${avg(routePoints).toFixed(1)}`);
  console.log(`  Ticket points: ${avg(ticketPoints).toFixed(1)}`);

  console.log(`\nMechanic Usage (per player per game avg):`);
  console.log(`  Routes claimed:   ${avg(routesClaimed).toFixed(1)}`);
  console.log(`  Bridges claimed:  ${avg(bridgesClaimed).toFixed(2)} (${(avg(bridgesClaimed)/avg(routesClaimed)*100).toFixed(0)}% of claims)`);
  console.log(`  Ferries claimed:  ${avg(ferriesClaimed).toFixed(2)} (${(avg(ferriesClaimed)/avg(routesClaimed)*100).toFixed(0)}% of claims)`);
  console.log(`  Currency used:    ${avg(currencyUsed).toFixed(2)}`);

  // Score distribution
  console.log('\nScore distribution:');
  const buckets = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  for (let i = 0; i < buckets.length - 1; i++) {
    const count = scores.filter(s => s >= buckets[i] && s < buckets[i + 1]).length;
    const bar = '█'.repeat(Math.round(count / numGames * 30));
    console.log(`  ${String(buckets[i]).padStart(3)}-${String(buckets[i+1]).padStart(3)}: ${bar} ${count}`);
  }
  const over100 = scores.filter(s => s >= 100).length;
  if (over100 > 0) console.log(`  100+ : ${'█'.repeat(Math.round(over100 / numGames * 30))} ${over100}`);
  const negative = scores.filter(s => s < 0).length;
  if (negative > 0) console.log(`   <0  : ${'█'.repeat(Math.round(negative / numGames * 30))} ${negative}`);

  // Winner margin
  const margins = allResults.map(r => {
    const s = r.results.map(p => p.finalScore).sort((a, b) => b - a);
    return s[0] - s[1];
  });
  console.log(`\nWinner margin: Avg ${avg(margins).toFixed(1)} | Median ${margins.sort((a,b)=>a-b)[Math.floor(margins.length/2)]}`);
}

// ═══════════════════════════════════════════════
// 3. BALANCE ANALYSIS
// ═══════════════════════════════════════════════

function analyzeBalance() {
  console.log('\n══════════════════════════════════════');
  console.log('  3. BALANCE ANALYSIS');
  console.log('══════════════════════════════════════\n');

  // Points per train for each route type
  console.log('Points efficiency (points per train spent):');
  console.log('  Route Type   | Len | Pts  | Pts/Train | Extra Cost');
  console.log('  -------------|-----|------|-----------|----------');
  for (const r of ROUTES) {
    if (r.id > 0 && ROUTES[r.id - 1].type === r.type && ROUTES[r.id - 1].length === r.length) continue; // skip dupes
    const pts = getRoutePoints(r.length, r.type);
    const trainCost = r.length;
    const cardCost = r.type === 'bridge' ? r.length + 1 : r.length;
    const ppt = (pts / trainCost).toFixed(2);
    const ppc = (pts / cardCost).toFixed(2);
    const extra = r.type === 'bridge' ? '+1 loco' : r.type === 'ferry' ? '≥1 loco' : '—';
    console.log(`  ${r.type.padEnd(13)} | ${r.length}   | ${String(pts).padEnd(4)} | ${ppt.padStart(5)} t / ${ppc.padStart(5)} c | ${extra}`);
  }

  // Compare same-length routes across types
  console.log('\nSame-length comparison:');
  for (let len = 1; len <= 6; len++) {
    const normal = getRoutePoints(len, 'normal');
    const bridge = getRoutePoints(len, 'bridge');
    const ferry = getRoutePoints(len, 'ferry');
    const normalPPC = (normal / len).toFixed(2);
    const bridgePPC = (bridge / (len + 1)).toFixed(2);
    const ferryPPC = (ferry / len).toFixed(2);
    console.log(`  Length ${len}: Normal ${normal}pts (${normalPPC}/card) | Bridge ${bridge}pts (${bridgePPC}/card) | Ferry ${ferry}pts (${ferryPPC}/card)`);
  }

  // Currency analysis
  console.log('\nCurrency card analysis:');
  console.log(`  Currency cards in deck: 18/128 = ${(18/128*100).toFixed(1)}%`);
  console.log(`  Bonus per use: +3 pts`);
  console.log(`  Cost: 1 card draw (opportunity cost of a train card)`);

  // Count routes eligible for currency bonus (both endpoints same zone)
  let rmbRoutes = 0, hkdRoutes = 0, mopRoutes = 0;
  for (const r of ROUTES) {
    const fromZone = CITIES[r.from].zone;
    const toZone = CITIES[r.to].zone;
    if (fromZone === toZone) {
      if (fromZone === 'RMB') rmbRoutes++;
      else if (fromZone === 'HKD') hkdRoutes++;
      else if (fromZone === 'MOP') mopRoutes++;
    }
  }
  console.log(`  Routes eligible for currency bonus:`);
  console.log(`    RMB: ${rmbRoutes} routes (6 cards available)`);
  console.log(`    HKD: ${hkdRoutes} routes (6 cards available)`);
  console.log(`    MOP: ${mopRoutes} routes (6 cards available)`);
  console.log(`    Total: ${rmbRoutes + hkdRoutes + mopRoutes}/${ROUTES.length} routes (${((rmbRoutes+hkdRoutes+mopRoutes)/ROUTES.length*100).toFixed(0)}%)`);

  // Locomotive economy
  console.log('\nLocomotive economy:');
  let locosDemanded = 0;
  const bridgeRoutes = ROUTES.filter(r => r.type === 'bridge');
  const ferryRoutes = ROUTES.filter(r => r.type === 'ferry');
  console.log(`  Locos in deck: 14`);
  console.log(`  Bridge routes (need +1 loco each): ${bridgeRoutes.length} → min ${bridgeRoutes.length} locos needed to claim all`);
  console.log(`  Ferry routes (need ≥1 loco each): ${ferryRoutes.length} → min ${ferryRoutes.length} locos needed to claim all`);
  console.log(`  Total loco demand if all special routes claimed: ${bridgeRoutes.length + ferryRoutes.length}`);
  console.log(`  Loco surplus/deficit: ${14 - bridgeRoutes.length - ferryRoutes.length} (with 2 players sharing 14 locos)`);
  console.log(`  → ${14 - bridgeRoutes.length - ferryRoutes.length >= 0 ? '✓ Enough locos exist but competition makes them scarce' : '⚠ Not enough locos for all — creates hard choices'}`);
}

// ═══════════════════════════════════════════════
// RUN ALL
// ═══════════════════════════════════════════════

console.log('╔══════════════════════════════════════╗');
console.log('║  GBA TICKET TO RIDE — DESIGN AUDIT   ║');
console.log('╚══════════════════════════════════════╝');

analyzeNetwork();
runMonteCarlo(500);
analyzeBalance();

console.log('\n══════════════════════════════════════');
console.log('  DONE');
console.log('══════════════════════════════════════');
