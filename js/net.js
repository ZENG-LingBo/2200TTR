// ── GBA Ticket to Ride — Networking (PeerJS) ──
//
// Uses the free public PeerJS broker (0.peerjs.com) for WebRTC signaling.
// After handshake, all game data flows peer-to-peer via WebRTC data channels.
// No self-hosted server required.
//
// Room model: one player ("host") creates a room. They generate a short room
// code and register a Peer with ID `ttr2200-<code>`. Other players join by
// opening a Peer with a random ID and connecting to the host's Peer ID.
// The host holds authoritative game state and broadcasts updates; clients
// send action requests back via the same data channel.

const PEER_ID_PREFIX = 'ttr2200-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const CODE_LEN = 4;

function randomCode() {
  let s = '';
  for (let i = 0; i < CODE_LEN; i++) {
    s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return s;
}

function peerIdFor(code) {
  return PEER_ID_PREFIX + code.toUpperCase();
}

// ── Host: owns authoritative state, broadcasts to clients ──
export class HostNet {
  constructor() {
    this.peer = null;
    this.roomCode = '';
    this.conns = new Map();  // peerId -> DataConnection
    this.onClientJoin = null;    // (peerId) => void
    this.onClientLeave = null;   // (peerId) => void
    this.onClientMessage = null; // (peerId, msg) => void
  }

  async create(preferredCode = null) {
    // Try up to 3 codes if taken
    const triedCodes = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = preferredCode && attempt === 0 ? preferredCode.toUpperCase() : randomCode();
      triedCodes.push(code);
      try {
        await this._tryCreate(code);
        this.roomCode = code;
        return code;
      } catch (err) {
        if (err && err.type === 'unavailable-id') continue;
        throw err;
      }
    }
    throw new Error(`Room code unavailable (tried ${triedCodes.join(', ')})`);
  }

  _tryCreate(code) {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line no-undef
      const peer = new Peer(peerIdFor(code), { debug: 1 });
      let settled = false;
      peer.on('open', () => {
        if (settled) return;
        settled = true;
        this.peer = peer;
        peer.on('connection', (conn) => this._handleConnection(conn));
        resolve();
      });
      peer.on('error', (err) => {
        if (settled) return;
        settled = true;
        peer.destroy();
        reject(err);
      });
    });
  }

  _handleConnection(conn) {
    conn.on('open', () => {
      this.conns.set(conn.peer, conn);
      if (this.onClientJoin) this.onClientJoin(conn.peer);
    });
    conn.on('data', (msg) => {
      if (this.onClientMessage) this.onClientMessage(conn.peer, msg);
    });
    conn.on('close', () => {
      this.conns.delete(conn.peer);
      if (this.onClientLeave) this.onClientLeave(conn.peer);
    });
    conn.on('error', () => {
      this.conns.delete(conn.peer);
      if (this.onClientLeave) this.onClientLeave(conn.peer);
    });
  }

  broadcast(msg) {
    for (const conn of this.conns.values()) {
      try { conn.send(msg); } catch (e) { /* ignore */ }
    }
  }

  sendTo(peerId, msg) {
    const conn = this.conns.get(peerId);
    if (conn) {
      try { conn.send(msg); } catch (e) { /* ignore */ }
    }
  }

  destroy() {
    if (this.peer) {
      try { this.peer.destroy(); } catch (e) { /* ignore */ }
    }
    this.peer = null;
    this.conns.clear();
  }
}

// ── Client: connects to host ──
export class ClientNet {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.roomCode = '';
    this.onHostMessage = null; // (msg) => void
    this.onDisconnect = null;
  }

  async join(code) {
    code = code.toUpperCase();
    this.roomCode = code;

    await new Promise((resolve, reject) => {
      // eslint-disable-next-line no-undef
      const peer = new Peer({ debug: 1 });
      let settled = false;
      peer.on('open', () => {
        if (settled) return;
        settled = true;
        this.peer = peer;
        resolve();
      });
      peer.on('error', (err) => {
        if (settled) return;
        settled = true;
        peer.destroy();
        reject(err);
      });
    });

    await new Promise((resolve, reject) => {
      const conn = this.peer.connect(peerIdFor(code), { reliable: true });
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(`Timed out connecting to room ${code}`));
      }, 15000);
      conn.on('open', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.conn = conn;
        resolve();
      });
      conn.on('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(err);
      });
      conn.on('data', (msg) => {
        if (this.onHostMessage) this.onHostMessage(msg);
      });
      conn.on('close', () => {
        if (this.onDisconnect) this.onDisconnect();
      });
    });
  }

  send(msg) {
    if (!this.conn) return;
    try { this.conn.send(msg); } catch (e) { /* ignore */ }
  }

  destroy() {
    if (this.peer) {
      try { this.peer.destroy(); } catch (e) { /* ignore */ }
    }
    this.peer = null;
    this.conn = null;
  }
}

export { randomCode };
