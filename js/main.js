// ── GBA Ticket to Ride — Main Entry Point ──

import { LOCO, ROUTES, CITIES } from './game-data.js';
import { GameState } from './game-state.js';
import {
  cacheDOM, renderMap, renderFaceUp, renderDeck, renderHand,
  renderTickets, renderScores, renderTurnIndicator, showSelectedRoute,
  highlightClaimable, showMessage, showModal, showTicketPicker,
  showEndGameModal, setDrawTicketsBtn, setClaimBtn, disableActions,
  showSetupScreen, showPassDeviceScreen, setPlayerInfo, getPlayerName,
  showWalkthrough,
} from './game-render.js';
import { aiTakeTurn, aiPickTickets } from './game-ai.js';

let game;
let playerNames = [];
let playerTypes = []; // 'human' or 'ai' per index
let selectedRoute = -1;
let drawsThisTurn = 0;
let humanActing = false;
let eventsBound = false;

// ── Helpers ──

function isHuman(idx) { return playerTypes[idx] === 'human'; }
function humanCount() { return playerTypes.filter(t => t === 'human').length; }

// ── Initialize ──

async function startGame() {
  // First-time onboarding walkthrough (skippable, remembered via localStorage)
  if (localStorage.getItem('gba-tutorial-seen') !== '1') {
    await showWalkthrough();
    localStorage.setItem('gba-tutorial-seen', '1');
  }

  // Setup screen
  const setup = await showSetupScreen();
  playerNames = setup.names;
  playerTypes = setup.types;

  game = new GameState();
  game.init(setup.numPlayers);
  selectedRoute = -1;
  drawsThisTurn = 0;
  humanActing = false;

  cacheDOM();
  setPlayerInfo(playerNames, playerTypes);
  renderAll();
  if (!eventsBound) {
    bindEvents();
    eventsBound = true;
  }

  // Initial ticket selection for all players
  await initialTicketSelection();

  game.gamePhase = 'playing';
  renderAll();

  // First turn: no pass-device (device is already in hand after ticket selection)
  if (!isHuman(game.currentPlayer)) {
    startTurn();
  } else {
    showMessage(`${getPlayerName(game.currentPlayer)} — your turn! Draw cards, claim a route, or draw tickets.`, 'info');
  }
}

async function initialTicketSelection() {
  const multiHuman = humanCount() >= 2;
  let lastWasHuman = false;
  for (let i = 0; i < game.numPlayers; i++) {
    const tickets = game.drawTickets();
    if (tickets.length === 0) break;

    if (isHuman(i)) {
      if (multiHuman && lastWasHuman) {
        await showPassDeviceScreen(i);
      }
      const result = await showTicketPicker(tickets, 2, i);
      game.keepTickets(i, result.kept);
      game.returnTickets(result.returned);
      showMessage(`${getPlayerName(i)} kept ${result.kept.length} ticket(s)`);
      lastWasHuman = true;
    } else {
      const aiResult = aiPickTickets(game, i, tickets);
      game.keepTickets(i, aiResult.kept);
      game.returnTickets(aiResult.returned);
      showMessage(`${getPlayerName(i)} (AI) kept ${aiResult.kept.length} ticket(s)`);
      lastWasHuman = false;
    }
  }
}

// ── Rendering ──

function renderAll() {
  renderMap(game, onRouteClick);
  renderFaceUp(game.faceUp, onFaceUpClick);
  renderDeck(game.deck.length, onDeckClick);

  const cp = game.currentPlayer;
  const cpIsHuman = isHuman(cp);

  // In 1-human mode, always show that human's hand (even during AI turns).
  // In multi-human hot-seat, only show the current player's hand when it's their turn.
  let displayIdx, hidden;
  if (humanCount() === 1) {
    displayIdx = playerTypes.findIndex(t => t === 'human');
    if (displayIdx < 0) { displayIdx = cp; hidden = true; }
    else { hidden = false; }
  } else if (humanCount() === 0) {
    displayIdx = cp;
    hidden = true;
  } else {
    displayIdx = cp;
    hidden = !cpIsHuman;
  }

  renderHand(game.players[displayIdx], hidden);
  renderTickets(game.players[displayIdx], game, hidden);
  renderScores(game.players);
  renderTurnIndicator(game.currentPlayer, game.gamePhase);

  if (cpIsHuman && game.gamePhase !== 'ended') {
    const claimable = game.getClaimableRoutes(cp);
    highlightClaimable(claimable, selectedRoute);
    disableActions(false);
  } else {
    highlightClaimable([], -1);
    disableActions(true);
  }

  updateSelectedRouteDisplay();
}

function updateSelectedRouteDisplay() {
  const cp = game.currentPlayer;
  if (selectedRoute >= 0 && isHuman(cp)) {
    const canClaim = game.canClaimRoute(cp, selectedRoute);
    const currencyZone = canClaim ? game.getBestCurrency(cp, selectedRoute) : null;
    const combo = canClaim ? game.getBestCombo(cp, selectedRoute) : null;
    showSelectedRoute(selectedRoute, canClaim, currencyZone, combo);
  } else {
    showSelectedRoute(-1, false, false, null);
  }
}

// ── Pass-device helper ──

async function passDeviceIfNeeded() {
  // Only meaningful when there are 2+ humans
  if (humanCount() < 2) return;
  if (!isHuman(game.currentPlayer)) return;
  await showPassDeviceScreen(game.currentPlayer);
}

// ── Event binding ──

function bindEvents() {
  setDrawTicketsBtn(onDrawTickets);
  setClaimBtn(onClaimRoute);

  document.getElementById('rules-btn').addEventListener('click', showRules);

  const tutorialBtn = document.getElementById('tutorial-btn');
  if (tutorialBtn) tutorialBtn.addEventListener('click', () => showWalkthrough());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const overlay = document.querySelector('.modal-overlay:not(.pass-device-overlay):not(.setup-overlay):not(.walkthrough-overlay)');
      if (overlay) overlay.remove();
    }
  });
}

// ── Human actions ──

function onRouteClick(routeId) {
  const cp = game.currentPlayer;
  if (!isHuman(cp) || game.gamePhase === 'ended') return;
  if (drawsThisTurn > 0) return;
  selectedRoute = routeId;
  updateSelectedRouteDisplay();
  const claimable = game.getClaimableRoutes(cp);
  highlightClaimable(claimable, selectedRoute);
}

function onFaceUpClick(index) {
  const cp = game.currentPlayer;
  if (!isHuman(cp) || game.gamePhase === 'ended' || humanActing) return;

  const card = game.faceUp[index];
  if (!card) return;

  const isLoco = card === LOCO;

  if (isLoco && drawsThisTurn > 0) {
    showMessage("Can't take a locomotive as your second draw!", 'warn');
    return;
  }

  humanActing = true;
  const drawn = game.drawCard(cp, index);
  if (drawn) {
    showMessage(`${getPlayerName(cp)} drew: ${getCardDisplayName(drawn)}`);
    drawsThisTurn++;

    if (isLoco || drawsThisTurn >= 2) {
      endHumanTurn();
    } else {
      renderFaceUp(game.faceUp, onFaceUpClick);
      renderDeck(game.deck.length, onDeckClick);
      renderHand(game.players[cp]);
      humanActing = false;
    }
  } else {
    humanActing = false;
  }
}

function onDeckClick() {
  const cp = game.currentPlayer;
  if (!isHuman(cp) || game.gamePhase === 'ended' || humanActing) return;

  humanActing = true;
  const drawn = game.drawCard(cp, 'deck');
  if (drawn) {
    showMessage(`${getPlayerName(cp)} drew a card from the deck`);
    drawsThisTurn++;

    if (drawsThisTurn >= 2) {
      endHumanTurn();
    } else {
      renderFaceUp(game.faceUp, onFaceUpClick);
      renderDeck(game.deck.length, onDeckClick);
      renderHand(game.players[cp]);
      humanActing = false;
    }
  } else {
    showMessage('Deck is empty!', 'warn');
    humanActing = false;
  }
}

function onClaimRoute() {
  const cp = game.currentPlayer;
  if (!isHuman(cp) || game.gamePhase === 'ended' || humanActing) return;
  if (selectedRoute < 0) return;
  if (drawsThisTurn > 0) return;

  if (!game.canClaimRoute(cp, selectedRoute)) {
    showMessage("You can't claim this route!", 'warn');
    return;
  }

  humanActing = true;
  const combo = game.getBestCombo(cp, selectedRoute);
  const useCurrencyCb = document.getElementById('use-currency-cb');
  const useCurrency = useCurrencyCb ? useCurrencyCb.checked : false;

  const result = game.claimRoute(cp, selectedRoute, combo, useCurrency);
  const route = ROUTES[selectedRoute];
  const from = CITIES[route.from].name;
  const to = CITIES[route.to].name;

  let msg = `${getPlayerName(cp)} claimed ${from} → ${to} for ${result.points} points!`;
  if (result.currencyUsed) msg += ` (+${result.currencyBonus} currency bonus!)`;
  showMessage(msg, 'success');

  selectedRoute = -1;
  endHumanTurn();
}

async function onDrawTickets() {
  const cp = game.currentPlayer;
  if (!isHuman(cp) || game.gamePhase === 'ended' || humanActing) return;
  if (drawsThisTurn > 0) return;

  if (game.ticketDeck.length === 0) {
    showMessage('No more tickets available!', 'warn');
    return;
  }

  humanActing = true;
  const tickets = game.drawTickets();
  if (tickets.length > 0) {
    const result = await showTicketPicker(tickets, 1, cp);
    game.keepTickets(cp, result.kept);
    game.returnTickets(result.returned);
    showMessage(`${getPlayerName(cp)} kept ${result.kept.length} new ticket(s)`);
  }

  endHumanTurn();
}

async function endHumanTurn() {
  drawsThisTurn = 0;
  humanActing = false;
  selectedRoute = -1;

  // Render end-of-turn state while currentPlayer is still this human
  renderAll();

  game.endTurn();

  if (game.gamePhase === 'ended') {
    endGame();
    return;
  }

  // Hide actions immediately so there's no flash of next player's hand
  disableActions(true);
  await nextTurn();
}

// ── Turn dispatcher ──

async function nextTurn() {
  const cp = game.currentPlayer;
  if (isHuman(cp)) {
    await passDeviceIfNeeded();
    renderAll();
    showMessage(`${getPlayerName(cp)} — your turn!`, 'info');
  } else {
    // AI turn
    disableActions(true);
    showMessage(`${getPlayerName(cp)} (AI) is thinking...`);
    setTimeout(() => runAITurn(), 900);
  }
}

function startTurn() {
  // Used at game start when first player is AI
  if (!isHuman(game.currentPlayer)) {
    showMessage(`${getPlayerName(game.currentPlayer)} (AI) is thinking...`);
    setTimeout(() => runAITurn(), 900);
  }
}

// ── AI turn ──

function runAITurn() {
  const cp = game.currentPlayer;
  let aiDraws = 0;

  const aiCallbacks = {
    claimRoute: (rid, combo, useCurrency) => {
      const result = game.claimRoute(cp, rid, combo, useCurrency);
      const route = ROUTES[rid];
      const from = CITIES[route.from].name;
      const to = CITIES[route.to].name;
      let msg = `${getPlayerName(cp)} (AI) claimed ${from} → ${to} for ${result.points} points`;
      if (result.currencyUsed) msg += ` (+${result.currencyBonus} bonus)`;
      showMessage(msg);
      finishAITurn();
    },
    drawCard: (source) => {
      const wasLoco = (typeof source === 'number') && game.faceUp[source] === LOCO;
      game.drawCard(cp, source);
      aiDraws++;
      if (aiDraws >= 2 || wasLoco) {
        showMessage(`${getPlayerName(cp)} (AI) drew cards`);
        finishAITurn();
      }
    },
    drawTickets: () => {
      const tickets = game.drawTickets();
      if (tickets.length > 0) {
        const result = aiPickTickets(game, cp, tickets);
        game.keepTickets(cp, result.kept);
        game.returnTickets(result.returned);
        showMessage(`${getPlayerName(cp)} (AI) drew ${result.kept.length} ticket(s)`);
      }
      finishAITurn();
    },
  };

  aiTakeTurn(game, cp, aiCallbacks);
}

async function finishAITurn() {
  // Show AI's final state briefly (currentPlayer still = AI)
  renderAll();

  game.endTurn();

  if (game.gamePhase === 'ended') {
    endGame();
    return;
  }

  await nextTurn();
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
    <p>GBA Ticket to Ride is a route-building game set in China's Greater Bay Area. Play with 2-4 players (mix of humans and AI).</p>

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

    <h4>Hot-Seat Multiplayer:</h4>
    <p>When playing with 2+ humans on one device, a "pass the device" screen appears between human turns so your hand stays private.</p>

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
