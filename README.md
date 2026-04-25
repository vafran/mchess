# ♟️ Airin Chess

> A complete, single-file chess game built for children learning to play.  
> No installation. No internet. No accounts. Open the `.html` file in any browser.

[Leer en Español](README_es.md)

---

## Why this exists

I built Airin Chess for my 9-year-old daughter.

She wanted to learn chess, but every app I found was either too hard (she lost constantly and gave up), too simple (it felt like a toy), or full of ads and distractions. I wanted something that would teach her the real game — FIDE rules, real tactics — but that would also hold her hand when she made a mistake, explain *why* a move was bad, and celebrate her when she did something clever.

The result is a game that puts pedagogy first. The Coach is more important than the AI. Losing gracefully to a 7-year-old is a feature, not a bug.

## Goals and Non-Goals

### Goals

- **Teach, not defeat.** The primary job is to explain the game, prevent frustration, and build pattern recognition. The AI opponent is secondary.
- **Zero friction.** No installation, no account, no internet required after the first download. Works on a 10-year-old laptop and a modern phone equally.
- **Real chess, not a simplified version.** Full FIDE rules — en passant, castling, threefold repetition, the 50-move rule, all of it.
- **Forgiving at the bottom, challenging at the top.** Easy and Medium let beginners feel what winning feels like. Hard and Wise King exist for when they are ready for a real test.
- **Monolithic mastery.** Everything — engine, coach, opening book, training library, animations, sounds — lives in a single `.html` file of ~860 KB. Zero dependencies.

### Non-Goals

- **Defeating titled players.** This is not Stockfish. The engine reaches **~1652 ELO** at Wizard level and **~1830 ELO** at Wise King level (validated: 40-game PC tournaments vs UCI_Elo 1750, v2.23.0). Actual strength depends on hardware — see calibration note below.
- **Online multiplayer.** Local play only.
- **Advanced preparation tools.** The opening book is curated for teaching, not professional preparation.
- **Benchmark performance.** Clean, readable JavaScript takes priority over micro-optimised techniques,18 though v2.1.0 introduced critical low-level bottlenecks fixes.

---

## How to Play

**Locally**

1. **Download** the `.html` file.
2. **Double-click** it. It opens in any modern browser (Chrome, Firefox, Safari, Edge).
3. **Choose** *vs AI* or *2 Players* from the main menu.
4. **Click a piece** to select it. Legal destination squares appear as dots.
5. **Click a destination** to move.

**Online**

1. **Go to** GitHub Pages site: [https://airinchess.com](https://airinchess.com)  
2. **Play directly** in the browser. No download needed.

---

## Difficulty Levels

<img src="screenshots/EN/characters.png" alt="Characters" width="300" />

| Level | ELO est. | Depth | Time cap | Mistake rate | Book |
|---|---|---|---|---|---|
| 🐣 Easy | ~630 | 2 | 0.5s | 40% | ❌ |
| 📚 Medium | ~1010 | 5 | 5s | 15% | first 2 moves |
| 🔥 Wizard | ~1652 (validated) | up to 30 | 15s | 0% | ✅ full |
| 👑 Wise King | ~1830 (validated) | up to 30 | 30s | 0% | ✅ full |

> **ELO calibration hardware:** CoolPC Black VIII — AMD Ryzen 7 3700X @ 4.4 GHz, 16 GB DDR4 3200 MHz (~95k NPS in tournament conditions).
>
> ⚠️ **Hardware note:** Airin is a pure JavaScript engine running in the browser. Its strength scales directly with your device's CPU speed — the time budget (15s / 30s) is fixed, but the search depth reached within that budget is not. On a mid-range gaming PC you can expect the validated ELO figures above. On a typical laptop expect roughly 50–100 ELO less; on a phone or tablet, 150–250 ELO less. Easy and Medium are effectively hardware-independent in practice — their depth caps (2 and 4) are always reached well before the time budget on any modern device. Wizard and Wise King search as deep as time allows, so their strength scales with your hardware.

---

## The Coach

The Coach (El Profesor) is the heart of the game. Interactive chess tutor, context-aware, bilingual at all times.

### 🔍 Analysis
Evaluates center control, X-Ray threats, piece safety, king safety, material balance, game phase, and opening theory status.

<img src="screenshots/EN/coach_analysis.png" alt="Analysis" width="650" />

### 🎯 What should I do?
Engine-backed move suggestions with risk badges, strategic explanations, opening theory headers, and click-to-highlight on the board. **Kasparov's Law:** when checkmate exists, it is shown alone. **Fair Trade Law:** equal-value captures never trigger hanging warnings.

<img src="screenshots/EN/coach_openings.png" alt="What Should I Do?" width="650" />

### 💡 Was it good?
Post-move verdict (Excellent / Good / Acceptable / Inaccuracy / Mistake) with refutation arrow for mistakes.

<img src="screenshots/EN/coach_wasitgood.png" alt="Was it good?" width="650" />

### 🦅 Hawk Eye
Visual threat scanner. Red arrows = your pieces in danger. Green arrows = free captures available.

<img src="screenshots/EN/hawkeye.png" alt="Hawk Eye" width="650" />

### 🎓 Training Mode
Spider Sense (attacked pieces glow), colour-coded move destinations, blunder prevention with confirmation tap. Auto-disabled at Wise King level.

<img src="screenshots/coach_trainingmode.png" alt="Coach Trainng Mode" width="500" />

---

## The Commentator

Narrates every move in real time. Recognises opening names, Scholar's Mate formation, Greek Gift sacrifice, knight fork incursions, historical motifs, and major material swings.

Three styles, with labels now visible under the slider:
- **🧐 Serious** — technical, precise
- **⚖️ Mixed** — balanced (default)
- **🎉 Playful** — humorous and dramatic

<img src="screenshots/EN/comment_scholarsmate_win.png" alt="Commentarist Scholars Mate" width="650" />
<img src="screenshots/EN/comment_historic.png" alt="Commentarist Historic Echo" width="650" />

---

## Training Library

| Tab | Positions | Sample topics |
|---|---|---|
| Openings | 7 | Scholar's Mate, Fried Liver Attack, Budapest Gambit |
| Tactics | 15 | Fork, pin, skewer, discovered attack, back rank, zugzwang |
| Endgames | 14 | Lucena, Philidor, square rule, king opposition, wrong bishop |
| Random | 30 | Curated tactical puzzles with themes: mate, fork, pin, skewer, sacrifice, promotion |

<img src="screenshots/EN/training.png" alt="FEN Training Library" width="300" />

---

## FIDE Rules

| Rule | Status |
|---|---|
| Legal move generation — all pieces | ✅ |
| Check, checkmate, stalemate | ✅ |
| En passant | ✅ |
| Castling — both sides, rights tracking, blocked through check | ✅ |
| Pawn promotion — auto-queen or player choice | ✅ |
| Insufficient material (KK, KBK, KNK, KBKB same colour) | ✅ |
| Threefold repetition with claim modal | ✅ |
| 50-move rule | ✅ |
| Undo restores full state | ✅ |

---

## Settings

| Setting | Options |
|---|---|
| Language | 🇪🇸 Spanish / 🇬🇧 English (auto-detected on first load) |
| Theme | 🪄 Magic · 🌲 Forest · 🌊 Ocean · 🏛️ Classic · ⚽ Football |
| Commentator style | Serious · Mixed · Playful |
| Sound | On / Off |
| Training Mode | On / Off |


## Known Issues

| # | Severity | Description | Planned fix |
|---|---|---|---|
| 1 | Low | **Stalemate in won positions (Wise King only)** — In rare simplified endgames (queen + pawns vs lone king), the engine may play a move that stalemates the opponent instead of mating them, converting a win into a draw. Root cause: the quiescence search evaluates the final position using `evaluate()`

## What's new in v2.23.0 — *Production Release*

Replaces v2.22.5 (~1732 ELO, 27.5%) as the production version. Includes ten engine patches, a full UI redesign, and significant pedagogical improvements.

### 🚀 Engine: Ten Cumulative Improvements (v2.22.6 → v2.22.15)

Each patch was validated with a dedicated tournament before inclusion.

- **v2.22.6** — Rule of the Square: phantom evaluation bug removed (was awarding up to +942cp for easily-blockable passed pawns in any endgame)
- **v2.22.7/10** — Anti-blunder filter: BLOCKED(mate) gate added; BLOCKED(worse) gate refined
- **v2.22.8/9** — PASS_DANGER: asymmetry bug fixed (was only penalising White); base value reduced to prevent marathon draws
- **v2.22.11** — Anti-blunder filter extended to losing captures (SEE < 0 on captures)
- **v2.22.12** — King Centralization Gate: endgame king activity bonus gated to genuine endgames only
- **v2.22.13** — Repetition blindness fixed: root moves repeating the position 2+ times now score −9000; confirmed 266 firings across a 32-game tournament
- **v2.22.14** — Anti-blunder filter BLOCKED gate lowered from 100cp to 50cp
- **v2.22.15** — Rook on 7th rank: +40cp MG / +25cp EG tapered bonus

**Tournament results (40 games each, PC, UCI_Elo 1750):**
- Wizard level (15s/move): W11 D7 L22 — **36.3% — ~1652 ELO [CI: 1542–1762]**
- Wise King level (30s/move): W21 D7 L12 — **61.3% — ~1830 ELO [CI: 1721–1938]**

### 🎓 Teaching & Commentator Improvements

- **Blunder detection in the opening** — the commentator now flags hanging pieces from move 1, not just move 11+. Training Mode also warns when the player ignores an already-hanging rook or queen
- **PGN disambiguation** — SAN notation now correctly emits `Nbd2`/`Rfe1` when two pieces of the same type can reach the same square; Lichess/Chess.com import no longer rejects exported games
- **Advantage bar accuracy** — sigmoid (tanh) mapping replaces the old linear scale; matches Lichess behaviour and no longer saturates at ±700cp
- **Graded move quality (7 levels)** — blunder / mistake / inaccuracy / neutral / nice / good / very good / brilliant, each with distinct emoji and message
- **Commentator: expanded playful mode** — richer phrase sets for all piece types (moves, captures, checks, blunders) in both Spanish and English
- **Commentator: no quality annotation in funny mode** — humorous and technical commentary no longer appear on the same move
- **Coach false-positive fixes** — three targeted fixes to "Was it good?": sacrifice gate, worstEval guard, threshold tightened

### 🖥️ UI Redesign

- **Move carousel** — compact horizontal scroll strip below the board replaces the sidebar list
- **Responsive layout overhaul** — board + advantage bar on row 1, move strip on row 2; mobile stacks vertically
- **Top bar redesigned** — title integrated, hamburger moved inline, cleaner vertical space
- **Opening style tags** — each opening suggestion now shows a colour-coded style badge (⚡ Aggressive, 🧱 Solid, 🔀 Flexible, etc.)
- **Dynamic 📖 book-move phrases** — varied commentary when a book move is played

---

## Full version history

See [docs/CHANGELOG.md](docs/CHANGELOG.md) for the complete version history.

---


## Internal Architecture

### Single-file design

~860 KB. One `.html` file. No external dependencies, no CDN calls, no cookies, no network requests after load.

### Search

Web Worker + main-thread fallback. Alpha-beta stack: Iterative Deepening, PVS, NMP (adaptive R), LMR (logarithmic formula), Futility Pruning (depth ≤ 2, margins 175/350 cp), Aspiration Windows (±75 cp), Quiescence Search (max depth 5 non-check / 8 in-check, SEE pruning, delta pruning), Check Extensions, Advanced Pawn Extensions.

1 048 576-entry Zobrist transposition table (20 MB, `Int32Array`) in the Worker with depth-aware eviction. EXACT entries are never overwritten by UPPER/LOWER entries. Each entry stores the **best move** for ordering in the next iteration. Board represented as flat `Int8Array(64)` — 45–80k NPS on typical hardware.

Move ordering: TT move (priority 1,000,000) → MVV-LVA captures → promotions → killer moves → counter move → history heuristic → king tropism → central bonus. Root moves pre-sorted with MVV-LVA before depth-1.

### Evaluation

PeSTO-style dual-phase PST tables (`PST_MG` / `PST_EG`) with integer tapered interpolation (`(mgVal × ph + egVal × (24-ph)) / 24 | 0`). Pawn structure: doubled −15, isolated −40, passed pawn scaled with phase + Rule of the Square. Bishop pair +40. King Shield/Storm (middlegame). Rook activity (open file +40, 7th rank +35, connected rooks +15). Dynamic king safety. Knight outpost detection. Bad bishop penalty.

Piece values: N=325, B=335, R=500, Q=900 (bishop correctly valued above knight by 10 cp). Tapered middlegame/endgame interpolation (mgPV/egPV).

### Opening Book

~826 entries across ~100 positions, theory-weighted at Hard/Wise King, uniform random at Medium (2 moves), disabled at Easy.

### Audio

All sounds synthesised at runtime via Web Audio API. Zero audio files bundled.

---

## Mobile Support

Viewport locked · `touch-action: manipulation` · board `min(96vw, 520px)` · webkit fullscreen · Worker fallback.  
Tested on Chrome for Android, Safari for iOS, Firefox for Android.

---

## Compatibility

ES2017+ required. Tested on Chrome 90+, Firefox 88+, Safari 14+.

---

## Changelog

[ChangeLog](docs/CHANGELOG.md)

---

## AI Collaboration samples

[AI Collaboration](docs/AI_COLLABORATION.md)

## How to Contribute

Airin is a single `.html` file with no build step, no bundler, no package manager. Open it in any browser and it runs — which means many contributions take minutes to try.

### Easy contributions — no tournament needed

| Area | What |
|---|---|
| Bug reports | Open an Issue with steps to reproduce + screenshot |
| Commentary phrases | Add entries to the `I18N` object in both `es:` and `en:` blocks |
| Opening book | Add lines to `OPENING_BOOK` (comma-separated SAN → `[{m, w}]`). Only unambiguous theoretical moves — a wrong book move fires every game |
| Training positions | Add FENs to the Training Library with theme and description |
| UI / CSS | Edit inline styles or CSS variables; test by opening the file directly |

### Engine changes — tournament required

The search engine is a ~1,200-line alpha-beta inside a Web Worker. Any change to evaluation, search parameters, or move ordering requires tournament validation before it can merge:

- **Development validation (each patch):** 20-game tournament (~4 hours at 15s/move, ~7–8 hours at 30s/move)
- **Release sign-off (merging to main):** 40-game tournament with UCI_Elo (~7.5 hours at 15s/move, ~14–16 hours at 30s/move)

```bash
cd stockfish_tests
# Development — validate each patch (~4h at 15s)
node arena_tournament.js --batch --sf-mode uci_elo --sf-value 1750 --games 20
# Release — required before opening a PR to main (~7.5h at 15s)
node arena_tournament.js --batch --sf-mode uci_elo --sf-value 1750 --games 40
```

Requires Node.js, Puppeteer, and `stockfish.exe` in the project root.

**The rule:** one change per PR. Never combine two engine changes — if ELO drops, you cannot isolate the cause. Run tournaments on a desktop PC (laptops thermal-throttle and produce unreliable ELO estimates). Include the tournament JSON in the PR description.

### Architecture notes

- The entire game lives in `mChess.html` (~860 KB, ~16,500 lines). No other source files.
- **Two engines:** the Web Worker (plays all game moves) and the main-thread engine (Coach/analysis only, never plays). Changes to one do not affect the other.
- **Worker code** is a JS string inside `createEngineWorker()` — edit it like normal JS, the browser re-parses it on each load.
- **Version bump required** for every engine change — 4 places in the HTML: `<!--` comment, `<title>`, button text, `console.log`.
- **Testing:** open via `file:///` directly. No server needed.


## Stockfish Tests (Training the Engine)

The engine's heuristics and positional weights were **trained and tuned by playing automated tournaments against Stockfish**. A set of scripts and utilities to run automated matches between the in-browser engine (`mChess.html`) and Stockfish was created to collect results and produce quick analysis.

- Location: [stockfish_tests](stockfish_tests)
- Quick commands (from the project root):

```bash
# Official calibrated ELO (recommended)
node stockfish_tests/arena_tournament.js --batch --sf-mode uci_elo --sf-value 1750 --games 20

# Historical depth mode (kept for comparisons)
node stockfish_tests/arena_tournament.js --batch --depth 7 --games 20

# Inspect the last results
node stockfish_tests/analyze_results.js
```

Notes:
- `arena_tournament.js` opens `mChess.html` from the parent folder and expects `stockfish.exe` in the project root (or set `STOCKFISH_PATH`).
- Results and suggested patches will be saved inside `stockfish_tests`.

### English / Spanish READMEs

The `stockfish_tests` folder contains both `README.md` and `README_es.md` describing how to run the scripts and where the results are written. Open them for detailed instructions.


## License

Apache License 2.0  
Copyright 2026 Aaron Vazquez Fraga

---

## How this was built

Airin Chess was designed and directed by Aaron Vazquez Fraga. The code was written almost entirely by AI assistants.

The bulk of the implementation — engine architecture, search techniques, the Professor system, opening book, training library, and most bug fixes — was written by **Claude Sonnet** (Anthropic). **Gemini Pro** (Google) contributed to earlier structural decisions and alternative approaches. **ChatGPT** (OpenAI) helped with isolated problems in the earlier phases of development.

The ideas, the pedagogy, the product decisions, the 1000+ test games, and the direction of every iteration came from a human who wanted a better way to teach his daughter chess. The code came from the models.

This is an honest record of how the project was made. It is also, perhaps, a document of what human-AI collaboration looks like when it is working well.

---

*Airin Chess v2.22.14 — A chess game made for a 9-year-old, that accidentally became a serious engine.* *~860 KB. Zero dependencies. Open the file and play.*
