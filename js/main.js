// ── GBA Ticket to Ride — Main Entry Point ──

import { PLAYER_NAMES, LOCO, ROUTES, CITIES } from './game-data.js';
import { GameState } from './game-state.js';
import {
  cacheDOM, renderMap, renderFaceUp, renderDeck, renderHand,
  renderTickets, renderScores, renderTurnIndicator, showSelectedRoute,
  highlightClaimable, showMessage, showModal, showTicketPicker,
  showEndGameModal, setDrawTicketsBtn, setClaimBtn, disableActions,
} from './game-render.js';
import { aiTakeTurn, aiPickTickets } from './game-ai.js';

let game;
let selectedRoute = -1;
let drawsThisTurn = 0;
let humanActing = false;

// ── Initialize ──

function startGame() {
  game = new GameState();
  game.init();
  selectedRoute = -1;
  drawsThisTurn = 0;
  humanActing = false;

  cacheDOM();
  renderAll();
  bindEvents();

  // Initial ticket selection for both players
  initialTicketSelection();
}

async function initialTicketSelection() {
  // Human picks tickets
  const humanTickets = game.drawTickets();
  if (humanTickets.length > 0) {
    const result = await showTicketPicker(humanTickets, 2);
    game.keepTickets(0, result.kept);
    game.returnTickets(result.returned);
    showMessage(`You kept ${result.kept.length} ticket(s)`);
  }

  // AI picks tickets
  const aiTickets = game.drawTickets();
  if (aiTickets.length > 0) {
    const aiResult = aiPickTickets(game, 1, aiTickets);
    game.keepTickets(1, aiResult.kept);
    game.returnTickets(aiResult.returned);
    showMessage(`AI kept ${aiResult.kept.length} ticket(s)`);
  }

  game.gamePhase = 'playing';
  renderAll();
  showMessage('Game started! Your turn — draw cards, claim a route, or draw tickets.', 'info');
}

// ── Rendering ──

function renderAll() {
  renderMap(game, onRouteClick);
  renderFaceUp(game.faceUp, onFaceUpClick);
  renderDeck(game.deck.length, onDeckClick);
  renderHand(game.players[0]);
  renderTickets(game.players[0], game);
  renderScores(game.players);
  renderTurnIndicator(game.currentPlayer, game.gamePhase);

  if (game.currentPlayer === 0 && game.gamePhase !== 'ended') {
    const claimable = game.getClaimableRoutes(0);
    highlightClaimable(claimable, selectedRoute);
    disableActions(false);
  } else {
    highlightClaimable([], -1);
    disableActions(true);
  }

  updateSelectedRouteDisplay();
}

function updateSelectedRouteDisplay() {
  if (selectedRoute >= 0 && game.currentPlayer === 0) {
    const canClaim = game.canClaimRoute(0, selectedRoute);
    const canCurrency = canClaim && game.canUseCurrency(0, selectedRoute);
    const combo = canClaim ? game.getBestCombo(0, selectedRoute) : null;
    showSelectedRoute(selectedRoute, canClaim, canCurrency, combo);
  } else {
    showSelectedRoute(-1, false, false, null);
  }
}

// ── Event binding ──

function bindEvents() {
  setDrawTicketsBtn(onDrawTickets);
  setClaimBtn(onClaimRoute);

  // Rules button
  document.getElementById('rules-btn').addEventListener('click', showRules);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const overlay = document.querySelector('.modal-overlay');
      if (overlay) overlay.remove();
    }
  });
}

// ── Human actions ──

function onRouteClick(routeId) {
  if (game.currentPlayer !== 0 || game.gamePhase === 'ended') return;
  if (drawsThisTurn > 0) return; // mid-draw, can't switch to claiming
  selectedRoute = routeId;
  updateSelectedRouteDisplay();
  const claimable = game.getClaimableRoutes(0);
  highlightClaimable(claimable, selectedRoute);
}

function onFaceUpClick(index) {
  if (game.currentPlayer !== 0 || game.gamePhase === 'ended' || humanActing) return;

  const card = game.faceUp[index];
  if (!card) return;

  const isLoco = card === LOCO;

  // If it's a loco and we already drew 1 card, can't take it
  if (isLoco && drawsThisTurn > 0) {
    showMessage("Can't take a locomotive as your second draw!", 'warn');
    return;
  }

  humanActing = true;
  const drawn = game.drawCard(0, index);
  if (drawn) {
    showMessage(`You drew: ${getCardDisplayName(drawn)}`);
    drawsThisTurn++;

    if (isLoco || drawsThisTurn >= 2) {
      endHumanTurn();
    } else {
      renderFaceUp(game.faceUp, onFaceUpClick);
      renderDeck(game.deck.length, onDeckClick);
      renderHand(game.players[0]);
      humanActing = false;
    }
  } else {
    humanActing = false;
  }
}

function onDeckClick() {
  if (game.currentPlayer !== 0 || game.gamePhase === 'ended' || humanActing) return;

  humanActing = true;
  const drawn = game.drawCard(0, 'deck');
  if (drawn) {
    showMessage(`You drew a card from the deck`);
    drawsThisTurn++;

    if (drawsThisTurn >= 2) {
      endHumanTurn();
    } else {
      renderFaceUp(game.faceUp, onFaceUpClick);
      renderDeck(game.deck.length, onDeckClick);
      renderHand(game.players[0]);
      humanActing = false;
    }
  } else {
    showMessage('Deck is empty!', 'warn');
    humanActing = false;
  }
}

function onClaimRoute() {
  if (game.currentPlayer !== 0 || game.gamePhase === 'ended' || humanActing) return;
  if (selectedRoute < 0) return;
  if (drawsThisTurn > 0) return;

  if (!game.canClaimRoute(0, selectedRoute)) {
    showMessage("You can't claim this route!", 'warn');
    return;
  }

  humanActing = true;
  const combo = game.getBestCombo(0, selectedRoute);
  const useCurrencyCb = document.getElementById('use-currency-cb');
  const useCurrency = useCurrencyCb ? useCurrencyCb.checked : false;

  const result = game.claimRoute(0, selectedRoute, combo, useCurrency);
  const route = ROUTES[selectedRoute];
  const from = CITIES[route.from].name;
  const to = CITIES[route.to].name;

  let msg = `You claimed ${from} → ${to} for ${result.points} points!`;
  if (result.currencyUsed) msg += ` (+${result.currencyBonus} currency bonus!)`;
  showMessage(msg, 'success');

  selectedRoute = -1;
  endHumanTurn();
}

async function onDrawTickets() {
  if (game.currentPlayer !== 0 || game.gamePhase === 'ended' || humanActing) return;
  if (drawsThisTurn > 0) return;

  if (game.ticketDeck.length === 0) {
    showMessage('No more tickets available!', 'warn');
    return;
  }

  humanActing = true;
  const tickets = game.drawTickets();
  if (tickets.length > 0) {
    const result = await showTicketPicker(tickets, 1);
    game.keepTickets(0, result.kept);
    game.returnTickets(result.returned);
    showMessage(`You kept ${result.kept.length} new ticket(s)`);
  }

  endHumanTurn();
}

function endHumanTurn() {
  drawsThisTurn = 0;
  humanActing = false;
  selectedRoute = -1;
  game.endTurn();
  renderAll();

  if (game.gamePhase === 'ended') {
    endGame();
    return;
  }

  // AI turn
  if (game.currentPlayer === 1) {
    disableActions(true);
    showMessage("AI is thinking...");
    setTimeout(() => runAITurn(), 1000);
  }
}

// ── AI turn ──

function runAITurn() {
  let aiDraws = 0;

  const aiCallbacks = {
    claimRoute: (rid, combo, useCurrency) => {
      const result = game.claimRoute(1, rid, combo, useCurrency);
      const route = ROUTES[rid];
      const from = CITIES[route.from].name;
      const to = CITIES[route.to].name;
      let msg = `AI claimed ${from} → ${to} for ${result.points} points`;
      if (result.currencyUsed) msg += ` (+${result.currencyBonus} bonus)`;
      showMessage(msg);
      finishAITurn();
    },
    drawCard: (source) => {
      // Check if it's a loco BEFORE drawing (since draw replaces the face-up slot)
      const wasLoco = (typeof source === 'number') && game.faceUp[source] === LOCO;
      game.drawCard(1, source);
      aiDraws++;
      if (aiDraws >= 2 || wasLoco) {
        showMessage('AI drew cards');
        finishAITurn();
      }
    },
    drawTickets: () => {
      const tickets = game.drawTickets();
      if (tickets.length > 0) {
        const result = aiPickTickets(game, 1, tickets);
        game.keepTickets(1, result.kept);
        game.returnTickets(result.returned);
        showMessage(`AI drew ${result.kept.length} ticket(s)`);
      }
      finishAITurn();
    },
  };

  aiTakeTurn(game, 1, aiCallbacks);
}

function finishAITurn() {
  game.endTurn();
  renderAll();

  if (game.gamePhase === 'ended') {
    endGame();
    return;
  }

  showMessage('Your turn!', 'info');
}

// ── End game ──

async function endGame() {
  const results = game.calculateFinalScore();
  renderAll();
  const action = await showEndGameModal(results);
  if (action === 'new') {
    startGame();
  }
}

// ── Rules modal ──

function showRules() {
  const html = `
    <h3>How to Play</h3>
    <p>GBA Ticket to Ride is a route-building game set in China's Greater Bay Area.</p>

    <h4>Each Turn (pick ONE action):</h4>
    <ul>
      <li><strong>Draw Cards</strong> — Take 2 cards from the face-up display or deck. Taking a face-up locomotive counts as your entire draw.</li>
      <li><strong>Claim a Route</strong> — Click a route on the map, then click "Claim". Discard matching color cards equal to the route length.</li>
      <li><strong>Draw Tickets</strong> — Draw 3 destination tickets, keep at least 1. Complete tickets for bonus points; failed tickets lose points!</li>
    </ul>

    <h4>GBA Special Routes:</h4>
    <ul>
      <li><strong>🌉 Bridge Routes</strong> — Cross-sea mega-infrastructure. Cost: route length + 1 extra locomotive. Reward: <strong>2× points!</strong></li>
      <li><strong>⛴ Ferry Routes</strong> — Pearl River Delta crossings. At least 1 card must be a locomotive. Reward: <strong>1.5× points</strong></li>
    </ul>

    <h4>💰 Currency System:</h4>
    <p>Three currencies circulate in the GBA: <strong>¥ RMB</strong> (Mainland), <strong>$ HKD</strong> (Hong Kong), <strong>P MOP</strong> (Macau).</p>
    <p>When claiming a route where both cities are in the same currency zone, you may discard a matching currency card for <strong>+3 bonus points</strong>.</p>

    <h4>Game End:</h4>
    <p>When any player has ≤3 trains left, each player gets one final turn. Then destination tickets are scored: connected = +points, not connected = −points. Longest continuous path wins +10 bonus.</p>
  `;
  showModal('Game Rules', html, [{ label: 'Got it!', value: 'ok', primary: true }]);
}

// ── Utility ──

function getCardDisplayName(card) {
  if (card === LOCO) return 'Locomotive 🚂';
  if (card === 'RMB') return 'RMB ¥';
  if (card === 'HKD') return 'HKD $';
  if (card === 'MOP') return 'MOP P';
  return card.charAt(0).toUpperCase() + card.slice(1);
}

// ── Start ──
window.addEventListener('DOMContentLoaded', startGame);
