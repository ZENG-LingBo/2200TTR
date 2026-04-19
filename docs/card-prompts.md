# GBA Ticket to Ride — Card Design Prompts

Ready-to-paste prompts for a UI designer or generative image model.
Each prompt includes the shared **ART DIRECTION** and **TECH** blocks,
plus a card-specific brief and variables table.

Hex palette is identical to the digital game (`COLOR_HEX` in `js/game-data.js`)
so printed cards will match the on-screen cards perfectly.

---

## Reusable Blocks (inline in every prompt below)

### ART DIRECTION

```
ART DIRECTION:
- Theme: modern Chinese Greater Bay Area (Pearl River Delta) — fusion of
  traditional Chinese ink-wash motifs (mountains, rivers, cranes) with
  futuristic infrastructure (suspension bridges, high-speed rail, container
  ports, fiber-optic neon skylines).
- Mood: confident, optimistic, premium. Readable at arm's length.
- Palette: saturated primaries matching the digital game (see hex codes
  per card). Deep navy background #0f3460 with subtle wave/circuit texture.
- Typography: English = Inter Bold (titles) / Inter Medium (body).
  Chinese = PingFang SC or Noto Sans SC Bold.
- Iconography: flat, line weight 2-3 pt, rounded corners, soft drop shadow.
- Bilingual: include English and Chinese wherever text is present.
- Avoid: photo collages, cluttered backgrounds, overt political imagery,
  watermarks, shutterstock-style stock photos.
```

### TECH

```
TECH:
- Size: 63 × 88 mm (standard poker / Ticket-to-Ride card), portrait.
- Bleed: 3 mm on all sides (full artwork size 69 × 94 mm).
- Safe zone: 5 mm inside trim edge — no critical text or focal art outside.
- Resolution: 300 DPI, CMYK, flattened.
- Format: PDF + separate PNG at 300 DPI.
- Corner radius after cut: 3 mm.
```

---

## 1. Train Cards — 8 Color Variants

```
ROLE: Senior board-game card illustrator.
CONTEXT: GBA Ticket to Ride — a route-building train game in China's Greater Bay Area.

<<insert ART DIRECTION block>>

CARD BRIEF — Train Card (one design per color, 8 color variants total):
- Focal art: single stylized train car viewed in 3/4 perspective, filled
  in the card's base color with subtle gradient and chrome highlights on
  windows/wheels.
- Background: geometric patterns in a darker shade of the base color
  (hexagons, diagonal rail lines, or wave motifs).
- Top-left corner: English color name in caps (Inter Bold 14pt).
- Top-right corner: three decorative dots "○ ○ ○" in white 40% opacity.
- Bottom-right corner: Chinese character for the color (28pt, 80% opacity).
- Bottom-left: small "GBA TTR" watermark logo, 10pt 30% opacity.
- No numbers, no point values, no city references.

<<insert TECH block>>

VARIANTS (same design, swap color + Chinese character):
| Color   | Hex      | English Label | Chinese | Text-on-card contrast |
|---------|----------|---------------|---------|----------------------|
| Red     | #e74c3c  | RED           | 红      | white text          |
| Orange  | #f39c12  | ORANGE        | 橙      | white text          |
| Yellow  | #f1c40f  | YELLOW        | 黄      | dark text (#2c3e50) |
| Green   | #2ecc71  | GREEN         | 绿      | white text          |
| Blue    | #3498db  | BLUE          | 蓝      | white text          |
| Purple  | #9b59b6  | PURPLE        | 紫      | white text          |
| White   | #ecf0f1  | WHITE         | 白      | dark text (#2c3e50) |
| Black   | #2c3e50  | BLACK         | 黑      | white text          |

DELIVERABLES: 8 PDFs (one per color) + 8 PNGs at 300 DPI + layered source
(.ai or .fig). Name files `train-red.pdf`, `train-orange.pdf`, etc.
Print run: 12 copies of each (96 total).
```

---

## 2. Locomotive (Wild) Card

```
ROLE: Senior board-game card illustrator.
CONTEXT: GBA Ticket to Ride — the locomotive card is the rare wild card.

<<insert ART DIRECTION block>>

CARD BRIEF — Locomotive / Wild:
- Focal art: a CRH-style (China Railway High-speed) bullet train bursting
  out of the card toward the viewer, with speed lines and motion blur
  trailing behind it. Nose of the train slightly 3D, breaking the card edge.
- Background: orange radial gradient #d35400 (outer) → #e67e22 (inner),
  overlaid with faint multicolor gear/wheel silhouette (reinforces "wild" =
  "any color") at ~15% opacity.
- Top banner: "LOCO" in large Inter Bold white all-caps / 机车 below it.
- Center emblem (small, behind train): rainbow gear ring.
- Bottom banner: "★ WILD ★ / 万能" with tiny crossed-rail icon.
- Optional steam/smoke cloud in top-left corner breaking the frame.

<<insert TECH block>>

COLOR VARIABLES:
- Primary gradient: #d35400 → #e67e22
- Accent: #f1c40f (gold), #ffffff (body text)
- Border: 2pt #f39c12

DELIVERABLES: 1 PDF + 1 PNG at 300 DPI. Print run: 14 copies.
```

---

## 3. Currency Card — RMB (¥)

```
ROLE: Senior board-game card illustrator.
CONTEXT: GBA Ticket to Ride — currency cards grant a scaled bonus when claiming
a route where at least one endpoint city is in the matching currency zone.
RMB = +3, HKD = +5, MOP = +7. Rarer currencies give bigger bonuses.

<<insert ART DIRECTION block>>

CARD BRIEF — RMB Currency Card:
- Focal art: Guangzhou Canton Tower silhouette (nighttime, lit) behind a
  giant stylized ¥ symbol in gold, subtly glowing.
- Secondary: a high-speed train streaking left→right at mid-card.
- Palette: red gradient #c0392b (top) → #e74c3c (bottom), gold accents
  #f1c40f, off-white text.
- Top banner: "RMB · 人民币" in Inter Bold white all-caps.
- Center: massive stylized ¥ (90pt).
- Bottom corner: "+3 BONUS / +3 奖励" in gold, pill-shaped badge.
- Pattern: faint repeating 元 characters at 5% opacity over background.
- Fine-print bottom: "Mainland GBA zone · 大陆经济区".

<<insert TECH block>>

COLOR VARIABLES:
- Gradient: #c0392b → #e74c3c
- Accent gold: #f1c40f
- Text white: #ffffff

DELIVERABLES: 1 PDF + 1 PNG at 300 DPI. Print run: 6 copies (most-common zone).
```

---

## 4. Currency Card — HKD ($)

```
ROLE: Senior board-game card illustrator.
CONTEXT: GBA Ticket to Ride — HKD currency card for the Hong Kong zone.
Grants +5 bonus when claiming a route touching Hong Kong or NT.

<<insert ART DIRECTION block>>

CARD BRIEF — HKD Currency Card:
- Focal art: Hong Kong Victoria Harbour skyline at dusk (IFC, Bank of China
  Tower, peak silhouette) with a Star Ferry boat mid-water. Light reflections
  on the water.
- Secondary: stylized bauhinia (洋紫荆) flower watermark top-right.
- Palette: blue gradient #2980b9 (top) → #3498db (bottom), silver accents
  #bdc3c7, off-white text.
- Top banner: "HKD · 港币" Inter Bold white.
- Center: massive stylized $ (90pt) with tiny "HK" subscript.
- Bottom corner: "+5 BONUS / +5 奖励" in silver, pill-shaped badge.
- Pattern: faint repeating $ and 元 characters at 5% opacity.
- Fine-print bottom: "Hong Kong SAR zone · 香港特别行政区".

<<insert TECH block>>

COLOR VARIABLES:
- Gradient: #2980b9 → #3498db
- Accent silver: #bdc3c7
- Accent pink (bauhinia): #e91e63

DELIVERABLES: 1 PDF + 1 PNG at 300 DPI. Print run: 4 copies.
```

---

## 5. Currency Card — MOP (P)

```
ROLE: Senior board-game card illustrator.
CONTEXT: GBA Ticket to Ride — MOP currency card for the Macau zone.
Grants +7 bonus when claiming a route touching Macau.

<<insert ART DIRECTION block>>

CARD BRIEF — MOP Currency Card:
- Focal art: Ruins of St. Paul's Cathedral façade at sunset, warm stone
  tones, with a cruise ship in the harbor below.
- Secondary: stylized lotus flower (Macau SAR emblem) watermark.
- Palette: green gradient #27ae60 (top) → #2ecc71 (bottom), warm cream
  accents #fff3e0, off-white text.
- Top banner: "MOP · 澳门币 / 葡币" Inter Bold white.
- Center: massive stylized "P" (or 圆) in 90pt, with tiny "MO" subscript.
- Bottom corner: "+7 BONUS / +7 奖励" in cream, pill-shaped badge.
- Pattern: faint Portuguese-tile (azulejo) lattice at 8% opacity.
- Fine-print bottom: "Macau SAR zone · 澳门特别行政区".

<<insert TECH block>>

COLOR VARIABLES:
- Gradient: #27ae60 → #2ecc71
- Accent cream: #fff3e0
- Accent warm stone: #c9a47a

DELIVERABLES: 1 PDF + 1 PNG at 300 DPI. Print run: 2 copies (rare-zone, high-value).
```

---

## 6. Destination Ticket Card — Template + 15 Variants

```
ROLE: Senior board-game card illustrator.
CONTEXT: GBA Ticket to Ride — destination tickets reward players for
connecting two specific cities. Failed tickets subtract points.

<<insert ART DIRECTION block>>

CARD BRIEF — Destination Ticket (template, 15 variants):
- Overall aesthetic: a train-ticket stub — perforated edge down the left
  side (stitched dot pattern), paper-texture background in warm cream
  #fdf6e3 with navy ink.
- Top: banner "DESTINATION / 目的地" in navy #0f3460, Inter Bold.
- Below banner: a tiny stylized route illustration with two pin markers
  (from + to) on a schematic map fragment.
- Center (big): "{FROM_CITY_EN} → {TO_CITY_EN}" Inter Bold 22pt, with
  "{FROM_CITY_ZH} → {TO_CITY_ZH}" Pingfang Bold 16pt directly beneath.
- Right side: circular stamp-style badge with the point value in the
  center (e.g. "15" or "10") and the word "PTS / 分" around the ring.
- Bottom: distance-class color bar (short = green, medium = orange,
  long = red) running the full width, labeled "SHORT / MEDIUM / LONG".
- Top-left corner: serial number "No. 01 / 15" in 8pt.
- Bottom-right: small logo "GBA TTR".

<<insert TECH block>>

VARIABLES (15 tickets — from `TICKETS[]` in js/game-data.js):

| # | From (EN, ZH)       | To (EN, ZH)         | Points | Class  |
|---|---------------------|---------------------|--------|--------|
| 0 | Foshan 佛山         | Guangzhou 广州       | 5      | SHORT  |
| 1 | Dongguan 东莞       | Longgang 龙岗区      | 5      | SHORT  |
| 2 | Dongguan 东莞       | Humen 虎门           | 5      | SHORT  |
| 3 | Suihui 三水         | Foshan 佛山          | 5      | SHORT  |
| 4 | Zhuhai 珠海         | Macau 澳门           | 6      | SHORT  |
| 5 | Guangzhou 广州      | Shenzhen 深圳        | 10     | MEDIUM |
| 6 | Jiangmen 江门       | Dongguan 东莞        | 10     | MEDIUM |
| 7 | Zhongshan 中山      | Shenzhen 深圳        | 11     | MEDIUM |
| 8 | Guangzhou 广州      | Macau 澳门           | 11     | MEDIUM |
| 9 | Foshan 佛山         | Huizhou 惠州         | 12     | MEDIUM |
| 10| Suihui 三水         | Macau 澳门           | 12     | MEDIUM |
| 11| Zhaoqing 肇庆       | Shenzhen 深圳        | 13     | LONG   |
| 12| Jiangmen 江门       | Hong Kong 香港       | 14     | LONG   |
| 13| Zhaoqing 肇庆       | Hong Kong 香港       | 15     | LONG   |
| 14| Macau 澳门          | Huizhou 惠州         | 16     | LONG   |

COLOR VARIABLES:
- Paper: #fdf6e3
- Ink: #0f3460
- Accent stamp: #c0392b
- Short-bar: #2ecc71 / Medium-bar: #f39c12 / Long-bar: #e74c3c

DELIVERABLES: 15 PDFs + 15 PNGs at 300 DPI. Name files
`ticket-00-foshan-guangzhou.pdf`, `ticket-01-dongguan-longgang.pdf`, etc.
Print run: 1 copy each (15 total).
```

---

## 7. Train Card Back (uniform for all 128 train-deck cards)

```
ROLE: Senior board-game card illustrator.
CONTEXT: GBA Ticket to Ride — back face of every train card (train colors,
locomotives, and currency cards share the same back so the deck looks
uniform face-down).

<<insert ART DIRECTION block>>

CARD BRIEF — Train Card Back:
- Central circular emblem: two crossed steel rails over a Pearl River wave
  motif, ringed by the game title.
- Title around the ring: "GBA TICKET TO RIDE · 大湾区客票" set in a
  circular path, Inter Bold 12pt, letter-spacing 3.
- Background: radial sunburst in deep navy #0f3460 with subtle
  circuit-board pattern at 8% opacity.
- Corner flourishes: four small lotus flowers (one per corner) at 40%
  opacity.
- NO variable text — identical for every train card.

<<insert TECH block>>

COLOR VARIABLES:
- Navy bg: #0f3460
- Accent gold: #f1c40f
- Rail grey: #7f8c8d
- Wave blue: #3498db

DELIVERABLES: 1 PDF + 1 PNG at 300 DPI. Printed on the back of all
train-deck cards (122 total: 96 colors + 14 locos + 12 currency).
```

---

## 8. Destination Ticket Back

```
ROLE: Senior board-game card illustrator.
CONTEXT: GBA Ticket to Ride — back face of destination ticket cards.
Must be visually distinct from train-card back so the two decks are never
confused.

<<insert ART DIRECTION block>>

CARD BRIEF — Destination Ticket Back:
- Central motif: a compass rose overlaid on an abstract 16-city
  constellation (dots + thin lines, like a train timetable map, city
  positions roughly matching the real GBA layout).
- Background: warm cream paper #fdf6e3 with a subtle aged-paper texture.
- Title curved above the compass: "DESTINATION TICKETS · 目的地客票".
- Below compass: small icon row "📍 🚂 ⛴ 🌉".
- Corner numerals: "1/15 … 15/15" style decorative (not per-card).
- NO variable text — identical for every ticket card.

<<insert TECH block>>

COLOR VARIABLES:
- Paper: #fdf6e3
- Ink: #0f3460
- Accent: #c0392b (stamp red)

DELIVERABLES: 1 PDF + 1 PNG at 300 DPI. Printed on the back of all 15
destination tickets.
```

---

## 9. Player Reference Card (4 per-color variants)

```
ROLE: Senior board-game card illustrator.
CONTEXT: GBA Ticket to Ride — quick-reference summary each player keeps
at the table. One per player, colored banner per player.

<<insert ART DIRECTION block>>

CARD BRIEF — Player Reference Card (landscape):
- Size: 85 × 55 mm landscape. Bleed 3 mm.
- Top banner (colored per player, 15% of card height): player color fill
  with "PLAYER N · 玩家 N" in white. The 4 variants differ only in banner
  color and player number.
- Main body — three vertical columns:
  1. "YOUR TURN — PICK ONE · 一回合 一行动" with 3 icons + one-line text:
     🃏 Draw 2 train cards   🛤 Claim a route   🎫 Draw 3 tickets (keep ≥1)
  2. "SCORING · 得分表"
     | Length | Normal | 🌉 Bridge ×2 | ⛴ Ferry ×1.5 |
     | 1 | 1 | 2 | 2 |
     | 2 | 2 | 4 | 3 |
     | 3 | 4 | 8 | 6 |
     | 4 | 7 | 14| 11|
     | 5 | 10| 20| 15|
     | 6 | 15| 30| 23|
  3. "EXTRAS · 加分"
     💰 Currency bonus: ¥+3 · $+5 · P+7 (either endpoint in zone)
     🏆 Longest continuous path +10
     🏁 Game ends when any player has ≤3 trains.
- Bottom-right: tiny "v1.0" + GBA TTR logo.

<<insert TECH block>>
Override SIZE: 85 × 55 mm landscape, bleed 3 mm (full 91 × 61 mm).

VARIANTS (4 cards — one per player color):
| Variant | Banner Color Hex | Player Label |
|---------|------------------|--------------|
| Blue    | #2196F3          | PLAYER 1     |
| Red     | #F44336          | PLAYER 2     |
| Green   | #4CAF50          | PLAYER 3     |
| Yellow  | #FFC107          | PLAYER 4     |

DELIVERABLES: 4 PDFs + 4 PNGs at 300 DPI. Print run: 1 each.
```

---

## 10. Rules Booklet Cover (A5)

```
ROLE: Senior board-game illustrator.
CONTEXT: GBA Ticket to Ride — the rules booklet (A5, 8-page saddle-stitched).
This is just the COVER design.

<<insert ART DIRECTION block>>

CARD BRIEF — Rules Booklet Cover:
- Size: 148 × 210 mm (A5), portrait. 3 mm bleed.
- Hero illustration: cinematic view of a bullet train crossing the HK-Zhuhai-Macau
  Bridge at sunset. Warm orange sky, deep blue sea, bridge pylons silhouetted.
  The Pearl River Delta cities glow with distant neon on either side.
- Top 1/3: title block.
  - Large: "GBA TICKET TO RIDE" Inter Black 48pt white with subtle drop shadow.
  - Sub: "大湾区 客票游戏" Pingfang Heavy 32pt.
  - Tag: "Build the future of the Greater Bay Area" Inter Regular Italic 14pt.
- Bottom strip: three badges (rounded rectangles, 60% opacity navy):
  👥 2–4 Players   ⏱ 30–60 min   🧑 Ages 10+
- Bottom-right corner: version "v1.0 · ©ZENG-LingBo 2026".

TECH:
- Size: A5 portrait (148 × 210 mm).
- Bleed 3 mm, safe zone 5 mm.
- 300 DPI CMYK, PDF/X-1a export.

DELIVERABLES: 1 PDF + 1 PNG at 300 DPI.
```

---

## 11. Train Piece Design Spec (for 3D print or wooden-model supplier)

```
ROLE: 3D model designer / product-design illustrator.
CONTEXT: GBA Ticket to Ride — physical train playing pieces. 4 colors ×
35 pieces = 140 total.

DESIGN BRIEF — Train Piece:
- Silhouette: simplified bullet-train locomotive, stylized (not strictly
  realistic). Proportion: 1 locomotive head + 1 short passenger car, joined.
- Dimensions: 18 mm long × 8 mm tall × 5 mm wide.
- Base: flat underside so it sits stably on the board.
- Detail: tiny embossed window row along the side (3 windows on
  locomotive, 3 on car), raised wheel-hubs on the base.
- No embedded text or logos.
- Material (choose one):
  - Resin 3D print (SLA) — best detail, ~$0.10/piece at a print farm
  - Painted wood — cheaper and stackable, slight loss of detail

COLOR VARIANTS:
| Color Name | Hex      | Pantone Equivalent | Quantity |
|------------|----------|--------------------|----------|
| Blue       | #2196F3  | 2175 C             | 35       |
| Red        | #F44336  | 185 C              | 35       |
| Green      | #4CAF50  | 7481 C             | 35       |
| Yellow     | #FFC107  | 1225 C             | 35       |

DELIVERABLES:
- 1 STL file for the base geometry (common to all 4 colors).
- 1 color-spec PNG (top/side/front views with hex + Pantone labels).
- Optional: 1 render PNG showing all 4 colors side by side on a GBA map
  background (for packaging / marketing).
```

---

## Master Print Summary

| Item                  | Designs | Copies each | Total printed |
|-----------------------|---------|-------------|---------------|
| Train cards (8 cols)  | 8       | 12          | 96            |
| Locomotive            | 1       | 14          | 14            |
| Currency ¥ RMB        | 1       | 6           | 6             |
| Currency $ HKD        | 1       | 4           | 4             |
| Currency P MOP        | 1       | 2           | 2             |
| Destination tickets   | 15      | 1           | 15            |
| Train card back       | 1       | — (printed on back of all 122 train-deck cards) | — |
| Ticket card back      | 1       | — (printed on back of all 15 tickets)           | — |
| Player reference      | 4       | 1           | 4             |
| Rules booklet cover   | 1       | 1           | 1             |
| Train pieces (STL)    | 1       | 140         | 140 pieces    |
| **Total card copies** |         |             | **141 cards** |

Pair with a printed game board (A2), 4 scoring markers, rules booklet
interior (6 pages), and a storage box.
