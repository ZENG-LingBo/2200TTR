// ── GBA Ticket to Ride — Online (P2P) Controller ──
//
// Host-authoritative model:
//   * One player creates a room and runs the real GameState (the "host").
//   * Other players ("clients") mirror state and send action requests.
//   * After every state change, the host broadcasts a full state snapshot.
//
// Privacy note: for simplicity, state broadcasts include all hands. Hands
// are hidden in the UI for opponents, but a determined observer could inspect
// network traffic. Good enough for friend play; can add per-slot filtering
// later if needed.

import { LOCO, ROUTES, CITIES } from './game-data.js';
import { GameState } from './game-state.js';
import { HostNet, ClientNet } from './net.js';
import {
  cacheDOM, renderMap, renderFaceUp, renderDeck, renderHand,
  renderTickets, renderScores, renderTurnIndicator, showSelectedRoute,
  highlightClaimable, showMessage, showModal, showTicketPicker,
  showEndGameModal, setDrawTicketsBtn, setClaimBtn, disableActions,
  showLobbyScreen, setPlayerInfo,
} from './game-render.js';

// ── Serialization helpers ──

function serializeState(game) {
  // Plain JSON snapshot. GameState fields are all JSON-safe.
  return JSON.parse(JSON.stringify({
    players: game.players,
    numPlayers: game.numPlayers,
    deck: game.deck,
    discardPile: game.discardPile,
    faceUp: game.faceUp,
    ticketDeck: game.ticketDeck,
    currentPlayer: game.currentPlayer,
    gamePhase: game.gamePhase,
    lastRoundTriggeredBy: game.lastRoundTriggeredBy,
    turnNumber: game.turnNumber,
    log: game.log,
  }));
}

function applyState(game, snap) {
  Object.assign(game, snap);
}

// ── Shared UI controller (host + client) ──

class OnlineUI {
  constructor() {
    this.game = new GameState();
    this.mySlot = 0;
    this.selectedRoute = -1;
    this.drawsThisTurn = 0;     // host only
    this.uiLocked = false;      // client: waiting for host ack
    this.onAction = null;       // (action, args) => void — set by host or client controller
  }

  renderAll() {
    const game = this.game;
    if (!game || !game.players || game.players.length === 0) return;
    renderMap(game, (r) => this.onRouteClick(r));
    renderFaceUp(game.faceUp, (i) => this.onFaceUpClick(i));
    renderDeck(game.deck ? game.deck.length : 0, () => this.onDeckClick());

    const me = game.players[this.mySlot];
    if (me) {
      renderHand(me, false);
      renderTickets(me, game, false);
    }
    renderScores(game.players);
    renderTurnIndicator(game.currentPlayer, game.gamePhase);

    const isActivePhase = game.gamePhase === 'playing' || game.gamePhase === 'lastRound';
    const isMyTurn = game.currentPlayer === this.mySlot && isActivePhase;
    if (isMyTurn && !this.uiLocked) {
      const claimable = game.getClaimableRoutes(this.mySlot);
      highlightClaimable(claimable, this.selectedRoute);
      disableActions(false);
    } else {
      highlightClaimable([], -1);
      disableActions(true);
    }
    this._updateSelectedRouteDisplay();
  }

  _updateSelectedRouteDisplay() {
    const game = this.game;
    const isMyTurn = game.currentPlayer === this.mySlot;
    if (this.selectedRoute >= 0 && isMyTurn) {
      const canClaim = game.canClaimRoute(this.mySlot, this.selectedRoute);
      const currencyZone = canClaim ? game.getBestCurrency(this.mySlot, this.selectedRoute) : null;
      const combo = canClaim ? game.getBestCombo(this.mySlot, this.selectedRoute) : null;
      showSelectedRoute(this.selectedRoute, canClaim, currencyZone, combo);
    } else {
      showSelectedRoute(-1, false, false, null);
    }
  }

  _myTurn() {
    const phase = this.game.gamePhase;
    return this.game.currentPlayer === this.mySlot
      && (phase === 'playing' || phase === 'lastRound')
      && !this.uiLocked;
  }

  onRouteClick(routeId) {
    if (!this._myTurn()) return;
    if (this.drawsThisTurn > 0) return;
    this.selectedRoute = routeId;
    const claimable = this.game.getClaimableRoutes(this.mySlot);
    highlightClaimable(claimable, this.selectedRoute);
    this._updateSelectedRouteDisplay();
  }

  onFaceUpClick(index) {
    if (!this._myTurn()) return;
    const card = this.game.faceUp[index];
    if (!card) return;
    const isLoco = card === LOCO;
    if (isLoco && this.drawsThisTurn > 0) {
      showMessage("Can't take a locomotive as your second draw!", 'warn');
      return;
    }
    this._dispatch('drawCard', { source: index });
  }

  onDeckClick() {
    if (!this._myTurn()) return;
    this._dispatch('drawCard', { source: 'deck' });
  }

  onClaimRoute() {
    if (!this._myTurn()) return;
    if (this.selectedRoute < 0) return;
    if (this.drawsThisTurn > 0) return;
    if (!this.game.canClaimRoute(this.mySlot, this.selectedRoute)) {
      showMessage("You can't claim this route!", 'warn');
      return;
    }
    const combo = this.game.getBestCombo(this.mySlot, this.selectedRoute);
    const cb = document.getElementById('use-currency-cb');
    const useCurrency = cb ? cb.checked : false;
    this._dispatch('claimRoute', { routeIdx: this.selectedRoute, combo, useCurrency });
    this.selectedRoute = -1;
  }

  onDrawTickets() {
    if (!this._myTurn()) return;
    if (this.drawsThisTurn > 0) return;
    if (this.game.ticketDeck.length === 0) {
      showMessage('No more tickets available!', 'warn');
      return;
    }
    this._dispatch('drawTickets', {});
  }

  _dispatch(action, args) {
    if (this.onAction) this.onAction(action, args);
  }

  bindUI() {
    cacheDOM();
    setDrawTicketsBtn(() => this.onDrawTickets());
    setClaimBtn(() => this.onClaimRoute());
    const rulesBtn = document.getElementById('rules-btn');
    if (rulesBtn) rulesBtn.onclick = () => this._showRules();
  }

  _showRules() {
    showModal('Game Rules', '<p>Same rules as local play. See README for details.</p>',
      [{ label: 'OK', value: 'ok', primary: true }]);
  }
}

// ── Host controller ──

class HostController {
  constructor(myName) {
    this.ui = new OnlineUI();
    this.myName = myName;
    this.net = new HostNet();
    this.seats = [{ name: myName, peerId: null }]; // slot 0 = host
    this.lobby = null;
    this.roomCode = '';
    this.drawsThisTurn = 0;
    // Per-slot pending ticket picks at game start (slot -> tickets shown)
    this.pendingTicketPicks = {};
  }

  async start() {
    this.ui.mySlot = 0;
    this.ui.onAction = (action, args) => this._applyAction(0, action, args);

    // Create room
    this.roomCode = await this.net.create();
    this._setupNetHandlers();

    // Open lobby
    this.lobby = showLobbyScreen({
      roomCode: this.roomCode,
      isHost: true,
      onLeave: () => this._leave(),
    });
    this._updateLobby();

    await this.lobby.waitForStart();
    this._beginGame();
  }

  _setupNetHandlers() {
    this.net.onClientJoin = (peerId) => {
      // Client connected; they'll send 'hello' with their name shortly
    };
    this.net.onClientLeave = (peerId) => {
      const idx = this.seats.findIndex(s => s.peerId === peerId);
      if (idx < 0) return;
      this.seats.splice(idx, 1);
      if (this.game) {
        // Game in progress: abort for everyone (too hard to recover mid-game)
        this.net.broadcast({ type: 'error', msg: 'A player disconnected. Game aborted.' });
        showMessage('A player disconnected. Game aborted.', 'warn');
      } else {
        this._updateLobby();
      }
    };
    this.net.onClientMessage = (peerId, msg) => this._onClientMessage(peerId, msg);
  }

  _onClientMessage(peerId, msg) {
    if (!msg || !msg.type) return;
    if (msg.type === 'hello') {
      // New player joining lobby
      if (this.seats.length >= 4) {
        this.net.sendTo(peerId, { type: 'error', msg: 'Room is full (max 4 players).' });
        return;
      }
      if (this.game) {
        this.net.sendTo(peerId, { type: 'error', msg: 'Game already started.' });
        return;
      }
      this.seats.push({ name: msg.name || 'Player', peerId });
      const slot = this.seats.length - 1;
      this.net.sendTo(peerId, { type: 'welcome', slot, roomCode: this.roomCode });
      this._updateLobby();
      return;
    }
    const slot = this.seats.findIndex(s => s.peerId === peerId);
    if (slot < 0) return;
    if (msg.type === 'action') {
      this._applyAction(slot, msg.action, msg.args || {});
    } else if (msg.type === 'ticketChoice') {
      this._applyTicketChoice(slot, msg.kept || [], msg.returned || []);
    }
  }

  _updateLobby() {
    if (!this.lobby) return;
    this.lobby.update({
      players: this.seats.map(s => ({ name: s.name })),
      status: this.seats.length < 2
        ? 'Waiting for players to join…'
        : `${this.seats.length} players connected. Ready when you are.`,
    });
    // Broadcast lobby state
    this.net.broadcast({
      type: 'lobby',
      players: this.seats.map(s => ({ name: s.name })),
    });
  }

  _beginGame() {
    const names = this.seats.map(s => s.name);
    const types = names.map(() => 'human');
    setPlayerInfo(names, types);
    this.playerNames = names;

    this.game = new GameState();
    this.game.init(this.seats.length);
    this.ui.game = this.game;

    if (this.lobby) { this.lobby.close(); this.lobby = null; }
    this.ui.bindUI();

    // Broadcast: game starting
    this._broadcast({
      type: 'start',
      names,
      slotCount: this.seats.length,
    });
    // Send each client their slot assignment
    for (let slot = 1; slot < this.seats.length; slot++) {
      this.net.sendTo(this.seats[slot].peerId, { type: 'assign', slot });
    }

    // Initial ticket selection: draw 3 tickets per player, send offer to each.
    this._initialTicketSelection();
  }

  _initialTicketSelection() {
    this.pendingInitialPicks = new Set();
    for (let slot = 0; slot < this.seats.length; slot++) {
      const tickets = this.game.drawTickets();
      if (tickets.length === 0) continue;
      this.pendingTicketPicks[slot] = tickets;
      this.pendingInitialPicks.add(slot);
      this._sendTicketOffer(slot, tickets, 2);
    }
    this._broadcastState();
  }

  _sendTicketOffer(slot, tickets, minKeep) {
    if (slot === 0) {
      // Host picks locally
      showTicketPicker(tickets, minKeep, 0).then(result => {
        this._submitTicketChoice(0, result.kept, result.returned);
      });
    } else {
      this.net.sendTo(this.seats[slot].peerId, {
        type: 'ticketOffer', tickets, minKeep, slot,
      });
    }
  }

  _applyTicketChoice(slot, kept, returned) {
    this._submitTicketChoice(slot, kept, returned);
  }

  _submitTicketChoice(slot, kept, returned) {
    if (!this.pendingTicketPicks[slot]) return;
    this.game.keepTickets(slot, kept);
    this.game.returnTickets(returned);
    delete this.pendingTicketPicks[slot];
    this._broadcastMessage(`${this.playerNames[slot]} kept ${kept.length} ticket(s)`);

    // Initial selection flow
    if (this.pendingInitialPicks && this.pendingInitialPicks.has(slot)) {
      this.pendingInitialPicks.delete(slot);
      if (this.pendingInitialPicks.size === 0) {
        this.pendingInitialPicks = null;
        this.game.gamePhase = 'playing';
        this._broadcastState();
        this._broadcastMessage(`${this.playerNames[this.game.currentPlayer]} — your turn!`, 'info');
      } else {
        this._broadcastState();
      }
      return;
    }

    // Mid-game drawTickets flow: picking done, end turn
    this._endTurn();
  }

  _applyAction(slot, action, args) {
    if (!this.game) return;
    if (this.game.gamePhase === 'ended') return;
    if (slot !== this.game.currentPlayer) {
      // Out-of-turn action; ignore
      if (slot !== 0) {
        this.net.sendTo(this.seats[slot].peerId,
          { type: 'message', text: "It's not your turn.", kind: 'warn' });
      }
      return;
    }
    // Mid-turn guards
    if (this.pendingTicketPicks[slot]) return; // awaiting their ticket pick

    if (action === 'drawCard') {
      this._handleDrawCard(slot, args.source);
    } else if (action === 'claimRoute') {
      this._handleClaimRoute(slot, args.routeIdx, args.combo, args.useCurrency);
    } else if (action === 'drawTickets') {
      this._handleDrawTickets(slot);
    }
  }

  _handleDrawCard(slot, source) {
    const wasLoco = (typeof source === 'number') && this.game.faceUp[source] === LOCO;
    if (wasLoco && this.drawsThisTurn > 0) return;
    const card = this.game.drawCard(slot, source);
    if (!card) {
      if (source === 'deck') {
        this._broadcastMessage('Deck is empty!', 'warn');
      }
      return;
    }
    this.drawsThisTurn++;
    this._broadcastMessage(`${this.playerNames[slot]} drew a card`);

    if (wasLoco || this.drawsThisTurn >= 2) {
      this._endTurn();
    } else {
      this._broadcastState();
    }
  }

  _handleClaimRoute(slot, routeIdx, combo, useCurrency) {
    if (this.drawsThisTurn > 0) return;
    if (!this.game.canClaimRoute(slot, routeIdx)) return;
    // Always recompute combo on the host to prevent cheating
    const trustedCombo = this.game.getBestCombo(slot, routeIdx);
    if (!trustedCombo) return;
    const result = this.game.claimRoute(slot, routeIdx, trustedCombo, !!useCurrency);
    const route = ROUTES[routeIdx];
    const from = CITIES[route.from].name;
    const to = CITIES[route.to].name;
    let msg = `${this.playerNames[slot]} claimed ${from} → ${to} for ${result.points} points`;
    if (result.currencyUsed) msg += ` (+${result.currencyBonus} currency bonus!)`;
    this._broadcastMessage(msg, 'success');
    this._endTurn();
  }

  _handleDrawTickets(slot) {
    if (this.drawsThisTurn > 0) return;
    const tickets = this.game.drawTickets();
    if (tickets.length === 0) {
      this._broadcastMessage('No more tickets available!', 'warn');
      return;
    }
    this.pendingTicketPicks[slot] = tickets;
    this._sendTicketOffer(slot, tickets, 1);
    this._broadcastState();
  }

  _endTurn() {
    this.drawsThisTurn = 0;
    this.ui.drawsThisTurn = 0;
    this.game.endTurn();
    if (this.game.gamePhase === 'ended') {
      this._endGame();
      return;
    }
    this._broadcastState();
    this._broadcastMessage(`${this.playerNames[this.game.currentPlayer]} — your turn!`, 'info');
  }

  _endGame() {
    const results = this.game.calculateFinalScore();
    this._broadcastState();
    this._broadcast({ type: 'end', results });
    // Local host shows end modal
    showEndGameModal(results).then(action => {
      if (action === 'new') location.reload();
    });
  }

  _broadcastState() {
    const snap = serializeState(this.game);
    this.net.broadcast({ type: 'state', state: snap, drawsThisTurn: this.drawsThisTurn });
    // Host renders its own state too
    this.ui.drawsThisTurn = this.drawsThisTurn;
    this.ui.renderAll();
  }

  _broadcastMessage(text, kind = 'info') {
    this.net.broadcast({ type: 'message', text, kind });
    showMessage(text, kind);
  }

  _broadcast(msg) {
    this.net.broadcast(msg);
  }

  _leave() {
    this.net.destroy();
    location.reload();
  }
}

// ── Client controller ──

class ClientController {
  constructor(myName, roomCode) {
    this.ui = new OnlineUI();
    this.myName = myName;
    this.roomCode = roomCode;
    this.net = new ClientNet();
    this.lobby = null;
    this.mySlot = null;
    this.gameStarted = false;
  }

  async start() {
    this.ui.onAction = (action, args) => {
      this.ui.uiLocked = true;
      this.net.send({ type: 'action', action, args });
    };
    this.net.onHostMessage = (msg) => this._onHostMessage(msg);
    this.net.onDisconnect = () => {
      showMessage('Disconnected from host.', 'warn');
      setTimeout(() => location.reload(), 2000);
    };

    try {
      await this.net.join(this.roomCode);
    } catch (err) {
      const m = err && err.message ? err.message : String(err);
      alert(`Could not join room ${this.roomCode}: ${m}`);
      location.reload();
      return;
    }

    // Announce ourselves
    this.net.send({ type: 'hello', name: this.myName });

    this.lobby = showLobbyScreen({
      roomCode: this.roomCode,
      isHost: false,
      onLeave: () => { this.net.destroy(); location.reload(); },
    });
    this.lobby.update({ players: [{ name: this.myName }], status: 'Connecting…' });
  }

  _onHostMessage(msg) {
    if (!msg || !msg.type) return;
    switch (msg.type) {
      case 'welcome':
        this.mySlot = msg.slot;
        this.ui.mySlot = msg.slot;
        break;
      case 'lobby':
        if (this.lobby) {
          this.lobby.update({ players: msg.players, status: 'Waiting for host to start…' });
        }
        break;
      case 'error':
        alert(msg.msg || 'Error from host');
        location.reload();
        break;
      case 'start': {
        setPlayerInfo(msg.names, msg.names.map(() => 'human'));
        this.gameStarted = true;
        if (this.lobby) { this.lobby.close(); this.lobby = null; }
        this.ui.bindUI();
        break;
      }
      case 'assign':
        this.mySlot = msg.slot;
        this.ui.mySlot = msg.slot;
        break;
      case 'state':
        applyState(this.ui.game, msg.state);
        this.ui.uiLocked = false;
        this.ui.drawsThisTurn = msg.drawsThisTurn || 0;
        this.ui.renderAll();
        break;
      case 'message':
        showMessage(msg.text, msg.kind || 'info');
        break;
      case 'ticketOffer':
        this._handleTicketOffer(msg);
        break;
      case 'end':
        showEndGameModal(msg.results).then(action => {
          if (action === 'new') location.reload();
        });
        break;
    }
  }

  async _handleTicketOffer(msg) {
    this.ui.uiLocked = true;
    const result = await showTicketPicker(msg.tickets, msg.minKeep, this.mySlot);
    this.net.send({
      type: 'ticketChoice',
      kept: result.kept,
      returned: result.returned,
    });
    // UI stays locked until host's next state broadcast.
  }
}

// ── Public entry points ──

export async function runHost(myName) {
  const ctl = new HostController(myName);
  await ctl.start();
}

export async function runClient(myName, roomCode) {
  const ctl = new ClientController(myName, roomCode);
  await ctl.start();
}
