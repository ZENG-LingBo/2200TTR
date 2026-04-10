# QFD – Interactive House of Quality (with Real-Time Collaboration)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/demo-live-brightgreen)](https://zeng-lingbo.github.io/house-of-quality-matrix/)

> **[Live Demo](https://zeng-lingbo.github.io/house-of-quality-matrix/)** — try it in your browser, no install needed

An interactive, educational web tool for **Quality Function Deployment (QFD)** — the House of Quality matrix used in product development to translate customer needs into engineering specifications.

**Now with serverless real-time collaboration** — multiple people on different devices can edit the same QFD simultaneously with zero server setup.

<!-- Replace this with an actual screenshot of your app -->
![QFD House of Quality Screenshot](preview.png)

## 🎯 Project Goals

- Provide students with a hands-on tool to learn QFD concepts
- Show how changing one variable (e.g., importance rating) cascades through the entire house
- Include a real-life **smartphone design** example for demonstration
- Enable **multi-device, real-time collaboration** without any server

## ✅ Implemented Features

### Core House of Quality Sections
| Section | Description | Interaction |
|---------|-------------|-------------|
| **Customer Requirements (WHATs)** | Left-side rows — editable text inputs | Type requirement names |
| **Importance Ratings** | 1–5 scale for each requirement | Click to cycle 0→1→2→3→4→5 |
| **Product Characteristics (HOWs)** | Top column headers — editable text | Type characteristic names |
| **Optimization Direction** | ▲ Maximize, ▼ Minimize, ◎ Target | Click arrows to cycle |
| **Relationship Matrix** | Center grid: ● Strong(9), ○ Medium(3), ▽ Weak(1) | Click cells to cycle |
| **Correlation Roof** | Triangular roof with diamond cells | Click to cycle: ++, +, −, −− |
| **Competitor Analysis** | Right-side columns rating 1–5 | Click to cycle ratings |
| **Target Values** | Bottom row — editable text | Type target specs |
| **Absolute Weight** | Auto-calculated: Σ(importance × relationship) | Updates live |
| **Relative Weight %** | Auto-calculated: percentage of total | Updates live with bars |

### 🛰️ Real-Time Collaboration (Serverless P2P)
| Feature | Details |
|---------|---------|
| **Technology** | WebRTC via [Trystero](https://github.com/dmotz/trystero) using Nostr public relays |
| **No server needed** | Uses public Nostr relay infrastructure for signaling — you run zero backend |
| **Room codes** | Type any room code and click "Join" — everyone with the same code connects |
| **Invite links** | Click "Invite Link" to copy a URL with `?room=code` that auto-joins |
| **Peer presence** | See colored avatars of who's in the room |
| **Live sync** | Every click (relationship, importance, correlation, names, etc.) broadcasts instantly |
| **Full state sync** | New joiners receive the complete QFD state automatically |
| **Activity indicators** | See flash notifications when a peer makes a change |
| **Custom names** | Edit your display name in the collab bar |

### How Collaboration Works
```
┌─────────┐     Nostr Relays      ┌─────────┐
│ Browser  │ ◄──── WebRTC ────► │ Browser  │
│ (Peer A) │   (peer-to-peer)    │ (Peer B) │
└─────────┘   No server needed   └─────────┘
```

1. **Person A** opens the QFD page and types a room code (e.g., `team-alpha`) → clicks **Join**
2. **Person A** clicks **Invite Link** → copies the URL → shares it via chat/email
3. **Person B** opens the link → auto-joins the same room
4. Both see each other's avatars in the collab bar
5. Any change either person makes appears instantly on the other's screen

### Interactive Features
- **Live recalculation**: Every click instantly recalculates weights and insights
- **Pulse animations**: Visual feedback when values change
- **Hover tooltips**: Context-sensitive info on every interactive cell
- **Resizable matrix**: Add/remove rows, columns, and competitors with +/− buttons
- **Load Example**: One-click smartphone design example
- **Export JSON**: Download all QFD data for offline use
- **Clear All**: Reset the entire house

### Live Insights Panel
- **Technical Priority Ranking** — bar chart showing which characteristics matter most
- **Design Conflict Detection** — identifies negative correlations from the roof
- **Competitive Gap Analysis** — finds opportunities where competitors score low
- **Competitor Comparison** — average ratings across all requirements
- **Relationship Coverage** — identifies unaddressed requirements or unused characteristics

## 📂 File Structure

```
index.html              — Main page
css/
  ├── style.css         — Core QFD styles
  └── collab.css        — Collaboration bar styles
js/
  ├── qfd-data.js       — Data model, calculations, example data
  ├── qfd-render.js     — DOM rendering (roof SVG, grid, cells) + collab broadcasts
  ├── qfd-interactions.js — Event handlers, insights, tooltips, I/O + collab broadcasts
  ├── collab.js         — P2P collaboration engine (room mgmt, state sync, UI)
  ├── collab-loader.js  — ESM module that imports Trystero from CDN
  └── main.js           — Entry point / initialization
```

## 🌐 Entry URIs

| Path | Description |
|------|-------------|
| `index.html` | Main QFD application |
| `index.html?room=ROOMCODE` | Auto-join a collaboration room |

## 📱 Real-Life Example: Smartphone Design

Click **"Load Example"** to see:
- **7 Customer Requirements**: Battery life, performance, camera, weight, display, price, water resistance
- **7 Product Characteristics**: Battery (mAh), processor (GHz), camera (MP), weight (g), screen (in), cost ($), IP rating
- **3 Competitors**: iPhone 15, Galaxy S24, Pixel 8
- **Full correlations** showing trade-offs (e.g., battery capacity vs. device weight)

## 🔧 Technology Stack

- **Frontend**: Vanilla HTML/CSS/JS (no build step)
- **P2P**: [Trystero](https://github.com/dmotz/trystero) via Nostr strategy
- **CDN**: esm.sh for ESM module delivery
- **Icons**: Font Awesome 6
- **Fonts**: Google Fonts (Inter)

## 🚀 Recommended Next Steps

1. **Undo/Redo** — Track changes for rollback
2. **Cursor sharing** — Show where each peer is hovering/clicking
3. **Conflict resolution** — Handle simultaneous edits to the same cell
4. **Offline mode** — Cache state in localStorage, sync when reconnected
5. **PDF export** — Print-optimized layout for reports
6. **Multiple QFD templates** — Different product types (software, hardware, service)

## 📄 License

This project is licensed under the [MIT License](LICENSE).
