# GBA Ticket to Ride

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/demo-live-brightgreen)](https://zeng-lingbo.github.io/2200TTR/)

> **[Live Demo](https://zeng-lingbo.github.io/2200TTR/)** — try it in your browser, no install needed

A browser-based **Ticket to Ride** board game set in China's **Greater Bay Area** (GBA). Play against an AI opponent across 16 real GBA cities connected by rail, bridges, and ferries.

Built with vanilla HTML/CSS/JS — no frameworks, no build step, no install.

![GBA Ticket to Ride Screenshot](preview.png)

## What Makes It Different from Standard Ticket to Ride?

Three new mechanics that reflect the GBA's unique character:

| Mechanic | How It Works | Balance |
|----------|-------------|---------|
| **Multi-Currency System** | Three currencies circulate: ¥ RMB (Mainland), $ HKD (Hong Kong), P MOP (Macau). Discard a matching currency card when claiming a route for **+3 bonus points** | Currency cards compete with train card draws — opportunity cost |
| **Bridge Routes** | Cross-sea mega-infrastructure (HK-Zhuhai-Macau Bridge, Shenzhen-Zhongshan Link, etc.). Cost: route length **+ 1 extra locomotive**. Reward: **2x points** | High reward justifies the locomotive investment; locos are scarce (14 in deck) |
| **Ferry Routes** | Pearl River Delta water crossings (Shekou-HK ferry, TurboJET, etc.). At least **1 locomotive** required. Reward: **1.5x points** | Ferries are geographic chokepoints — essential for cross-river connectivity |

## Game Rules

### Setup
- **35 trains** per player, **5-card** starting hand
- Draw 3 destination tickets, keep at least 2
- 128-card deck: 96 train cards (8 colors x 12) + 14 locomotives + 18 currency cards

### Each Turn (pick ONE action)
1. **Draw Cards** — Take 2 from face-up display or deck (face-up locomotive = only 1 draw)
2. **Claim a Route** — Discard matching cards, place trains, score points
3. **Draw Tickets** — Draw 3 destination tickets, keep at least 1

### End Game
When any player has **<= 3 trains** remaining, each player gets one final turn. Then score destination tickets (+/- points) and longest continuous path (+10 bonus).

## Map & Routes

**16 cities** positioned by real geographic coordinates across the Pearl River Delta:

Zhaoqing, Suihui, Foshan, Guangzhou, Huadu, Jiangmen, Zhongshan, Dongguan, Humen, Huizhou, Longgang, Shenzhen, Zhuhai, Macau, NT, Hong Kong

**36 routes** based on real infrastructure:
- 26 normal routes (rail/highway connections)
- 6 bridge routes (Humen Bridge, Nansha Bridge, SZ-ZS Link, HK-Zhuhai-Macau Bridge, SZ Bay Bridge, Tolo Highway)
- 4 ferry routes (Zhuhai-Macau, Shekou-HK, cross-delta, TurboJET HK-Macau)

## File Structure

```
index.html          — Single-page game
css/
  style.css         — All game styles
js/
  game-data.js      — Cities, routes, tickets, constants
  game-state.js     — Game state, turn logic, scoring
  game-render.js    — SVG map rendering, UI updates
  game-ai.js        — AI opponent (BFS pathfinding)
  main.js           — Entry point, event binding
```

## Technology Stack

- **Frontend**: Vanilla HTML/CSS/JS (no build step)
- **Rendering**: SVG for the game map
- **Fonts**: Google Fonts (Inter)
- **Deployment**: GitHub Pages — zero server needed

## Run Locally

```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve .
```

Then open [http://localhost:8080](http://localhost:8080)

## Scoring Reference

| Route Length | Normal | Bridge (2x) | Ferry (1.5x) |
|-------------|--------|-------------|--------------|
| 1 | 1 | 2 | 2 |
| 2 | 2 | 4 | 3 |
| 3 | 4 | 8 | 6 |
| 4 | 7 | 14 | 11 |
| 5 | 10 | 20 | 15 |
| 6 | 15 | 30 | 23 |

- **Currency bonus**: +3 per matching currency card used
- **Longest path**: +10 bonus
- **Destination tickets**: +value if completed, -value if failed

## License

This project is licensed under the [MIT License](LICENSE).
