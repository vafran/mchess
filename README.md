# ♟️ Monolith Chess

> A complete, single-file chess game built for children learning to play.  
> No installation. No internet. No accounts. Open the `.html` file in any browser.

[Leer en Español](README_es.md)

---

## Why this exists

I built Monolith Chess for my 9-year-old daughter.

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

- **Defeating titled players.** This is not Stockfish. The engine reaches **~1753 ELO** at Wise King level (validated: W2 D14 L14 vs Stockfish depth 7, 30-game PC tournament, v2.22.14). Actual strength depends on the hardware running it.
- **Online multiplayer.** Local play only.
- **Advanced preparation tools.** The opening book is curated for teaching, not professional preparation.
- **Benchmark performance.** Clean, readable JavaScript takes priority over micro-optimised techniques, though v2.1.0 introduced critical low-level bottlenecks fixes.

---

## How to Play

1. **Download** the `.html` file.
2. **Double-click** it. It opens in any modern browser (Chrome, Firefox, Safari, Edge).
3. **Choose** *vs AI* or *2 Players* from the main menu.
4. **Click a piece** to select it. Legal destination squares appear as dots.
5. **Click a destination** to move.

That is everything. The game handles the rest.

---

## Difficulty Levels

### 🐣 Easy — *Chick* (~630 ELO)

**Target:** Complete beginners, children under 8, first-time players.

2-ply depth · 40% mistake rate · ±12 cp noise · no book · no quiescence

### 📚 Medium — *Student* (~1010 ELO)

**Target:** Players who know the rules and want their first real game.

4-ply depth · 20% mistake rate · ±6 cp noise · book (first 2 moves) · full quiescence

### 🔥 Hard — *Mage* (~1400 ELO)

**Target:** Experienced casual players who want a real test.

6-ply depth · 5% mistake rate · no noise · full book · all search techniques active

### 👑 Master — *Wise King* (~1753 ELO validated)

**Target:** Strong club players and advanced amateurs.

Up to 30-ply depth (time-capped at 30s) · 0% mistakes · full book · full evaluation · Training Mode auto-disabled

<img src="screenshots/EN/characters.png" alt="Characters" width="300" />


### Difficulty Summary

| Level | ELO est. | Depth | Mistake rate | Noise | Book | Quiescence |
|---|---|---|---|---|---|---|
| 🐣 Easy | ~630 | 2 | 40% | ±12 cp | ❌ | ❌ |
| 📚 Medium | ~1010 | 4 | 20% | ±6 cp | first 2 moves | ✅ |
| 🔥 Hard | ~1400 | 6 | 0% | none | ✅ full | ✅ |
| 👑 Wise King | ~1753 (validated) | up to 30 (30s cap) | 0% | none | ✅ full | ✅ |
 
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

## What's new in v2.22.14 — *BLOCKED Filter Threshold Fixed*

### 🛡️ Anti-Blunder Filter: False-Positive Gate Tightened

The root anti-blunder filter blocked piece captures (e.g. Nc6xe5, SEE=−225) because the substituted move scored only 57–63 cp worse than the original — below the old 100cp gate. The threshold was lowered to 50cp.

**Result:** The engine no longer rejects strong capture moves that score marginally below the gate, eliminating the G26-type false positive confirmed in v2.22.13.

**Tournament result (30 games, PC, Stockfish depth-7):** W2 D14 L14 — **30.0% — ~1753 ELO [CI: 1620–1885]**.  
First complete PC tournament. First wins vs Stockfish d7 in a PC run. Beats production baseline (v2.22.5, 27.5%).

---

## What's new in v2.22.6 — *Phantom Promotion Bug Fixed*

### 🔧 Rule of the Square: Broken Duplicate Removed

A second Rule of the Square implementation was silently running inside the pawn evaluation loop. Unlike the correct version (which only activates in pure king-and-pawn endings), this broken copy had no guard — it awarded a promotion bonus of up to **+600 × endgame_factor centipawns** for any passed pawn, even when enemy pieces could easily block or capture it.

Result: the engine hallucinated massive promotion threats in any endgame with pieces on the board, triggering irrational pawn pushes (e.g. `h4??` with a rook on the board) and distorted evaluations of +600–+942 cp on quiet moves.

**Fix:** Removed the 14-line broken block inside the pawn loop. The correct implementation (with `if (!anyMajorMinor)` guard) is preserved and untouched.

**Tournament result (6 games, early data):** 0W 1L 5D — ~1842 ELO (CI 1651–2032). Zero phantom activations detected in all 6 games.

### 📊 Diagnostic: Think Time Added to Verbose Log

The `📊` line in the worker's verbose diagnostic now includes `t:${N}ms` — the time the engine spent searching each move. This makes it easier to spot pathological positions where the engine thinks for 0ms (forced moves) or unexpectedly long.

---

## What's new in v2.22.5 — *Mobile Crash Recovery*

### 📱 bestSoFar: Worker Crash Protection

The worker now sends a `bestSoFar` message to the main thread after each completed depth iteration. If the safety timer fires (worker frozen or crashed — most likely on mobile), the engine plays the best move found at the last completed depth instead of falling back to a depth-2 near-random move.

Desktop behavior is identical to v2.22.2. No tournament run needed — this only activates on worker crash, which doesn't occur in normal desktop play.

**Also:** Removed the automated JS blunder detector from the tournament runner — it produced false positives. Manual PGN analysis with Stockfish is the reliable method.

---

## What's new in v2.22.4 — *SEE Threshold Experiment (Reverted)*

Tightened the root anti-blunder SEE threshold from −100 to −50cp, intending to catch hanging pawns. **Reverted** — the tighter threshold blocked intentional pawn advances (e.g. e4-e5 with SEE = −100) and caused a regression to ~1659 ELO.

---

## What's new in v2.22.3 — *LMR Experiments (Reverted)*

Two LMR changes were tried and reverted:
- Raised LMR divisor 2.36 → 3.00 (less aggressive): ELO dropped ~1631
- Changed LMR threshold to moveCount > 4: ELO dropped ~1518

Both looser-LMR directions hurt. v2.22.2's LMR settings appear optimal.

---

## What's new in v2.22.2 — *Anti-Blunder Filter Fix*

### 🛡️ Root Anti-Blunder Filter (Dead Code Bug Fixed)

The engine's post-search safety net — designed to reject quiet moves where SEE < −100 (piece moving to an attacked square) — was computing the correct detection but **never acting on it**. The fix updated `bestOptions` after `finalOptions` was already computed; `postMessage` sends `finalOptions`, so the override was silently discarded.

**Fix:** One line added — `finalOptions = bestOptions` — propagating the filter's decision to the output. The filter was already identifying blunders correctly (e.g., Bc5 to a queen-attacked square: SEE = −335). Now it acts on them.

**Tournament result (20 games, SF depth-7):** 1W 8D 11L — **~1709 ELO**, 0.25 blunders/game.
First win vs Stockfish since v2.21.0.

---

## What's new in v2.22.1 — *Opening Book Stability*

### 📚 Book-Exit SEE Filter Removed

A SEE-based filter in `askWiseKing` checked opening book moves for piece safety before playing them, incorrectly rejecting standard moves like `Bb5`, `Bc4`, and `Bg5` (bishops that appear temporarily undefended mid-sequence). This caused the engine to deviate from the opening book on nearly every game.

**Fix:** Removed the filter entirely. The opening book is curated and trusted; moves are played as recommended without a post-hoc safety check.

---

## What's new in v2.22.0 — *Pedagogical Intelligence & Strategic Awareness*

### 🧠 Fixed "Was It Good?" Analysis
The `analyzeLastMove` function has been repaired. It now provides real tactical assessment (Balanced, Inaccuracy, or Excellent move) instead of an empty placeholder.

### 🎙️ Dynamic Game Commentary
The commentator now reads the engine's evaluation score to provide real-time situational remarks (e.g., detecting dominating advantages or absolute equality).

### 📚 Turn-Aware Opening Detection
Opening nomenclature (like the Benko Gambit) is now restricted to the first 12 moves, switching to positional notes for the middle and endgame.

---

## What's new in v2.21.0 — *The Performance & Tactics Edition (Final)*

This release is a full engine rewrite reaching **1631 ELO** against Stockfish depth 7. It includes a major architectural shift to 8-bit board representation and a new **Security Parachute** for absolute stability.

### 🛡️ Security Parachute & Absolute Stability

Implemented a failsafe in `askWiseKing` that guarantees a legal move is always returned, avoiding freezing in long matches. Combined with the v3.1 Anti-Freeze pedagogical audit, the engine is now fully crash-resistant.

### 🚀 8-Bit Board Representation (NPS ×4–10)

The board was migrated from an `8×8` array of strings (e.g. `'P'`, `'k'`) to a **flat `Int8Array(64)`** with integer piece codes (`1–6` = White, `9–14` = Black).

- **Cache locality**: 64 bytes fit in a single L1 cache line — board reads are effectively free.
- **Integer arithmetic everywhere**: piece type extracted with `p & 7`, color with `p <= 6`. No string comparisons in the hot path.
- **Zero allocations**: all buffers (`Int8Array`, `Int32Array`) are pre-allocated once at worker startup.
- **Result**: stable **45k–80k NPS** vs ~10k–18k in v2.13.1 at identical depths.

### 📊 Tapered Evaluation (MG/EG PST)

Replaced single static Piece-Square Tables with **dual-phase tables** (`PST_MG` / `PST_EG`).

```
score = (mgVal × ph + egVal × (24 − ph)) / 24   [integer, no floats in hot path]
```

Phase `ph` is computed from remaining pieces: each minor = 1, rook = 2, queen = 4. Pure endgame = 0, full middlegame = 24. This allows the engine to value pieces correctly across all game phases — e.g. knights centralise in the middlegame and retreat to safe squares in the endgame.

### 🛡️ King Shield & Storm Heuristics

- **King Shield** (`eg < 0.3`): rewards keeping 3 pawns in front of the castled king (+25 cp each).
- **King Storm**: penalises open or semi-open files toward the castled king, scaled by how far the cover pawns have been pushed.

### ⚔️ Static Exchange Evaluation (SEE)

A full `see()` function evaluates capture sequences before committing to them:

- Winning/equal captures (`SEE ≥ 0`) sorted by net gain — tried first.
- Losing captures (`SEE < 0`) deprioritised below quiet moves — tried last or skipped in quiescence.
- X-ray attacks (piece lines up behind removed piece) handled correctly.

This eliminates the engine's most common class of blunders: trading a bishop for a pawn protected by another pawn.

### 🔁 Repetition Draw Detection Restored

After the 8-bit refactor, game history was sent to the worker as string hashes but the search loop used Zobrist XOR-fold keys — they were **never connected**. The engine was completely blind to repetition.

Fix: `positionHashes` strings are now decoded into Zobrist keys using the same tables as `makeMove()`, stored in `historyCount: Map<u32, count>`. The draw check in `minimax()` is:
```
if (searchSet.has(bkS) || historyCount.get(bkS) >= 2) return 0;
```

### Tournament Infrastructure

- `arena_tournament.js` v2: 20-game tournament, color alternation, 20 opening lines (ECO coverage), partial save after every game, NPS logging, ELO confidence intervals (Wilson score).
- Persistent shared V8/TurboFan page across all games — JIT code survives between rounds, NPS stabilises at peak from game 2.
- 45-second per-move timeout with stale-page detection and auto-reload.

---

## What's new in v2.13.1 — *The Memory Update*

- **Worker TT Amnesia Fix (critical)**: The engine's transposition table, killer moves, and history heuristics were wiped on every single move in tournament/Arena mode. Fixed by reusing the Web Worker across moves. Endgame search depth jumped from d:8–10 to **d:14–18**, with peaks at **d:30**. First meaningful tournament draws achieved: **2 draws in 3 games vs Stockfish depth 6 (~1700 ELO)**.
- **Opening Book — Ruy López Exchange**: Added book coverage after `Bxc6 dxc6`, preventing the engine from finding `Nxe5??` on its own (which loses to `Qd4!`).
- **Opening Book — English Reversed Alekhine**: After `c4 e5 Nf3 e4`, the engine now plays `Nd4` from the book. Previously had no coverage and collapsed in 40 moves.
- **Opening Book — King's Indian Attack**: 13 new entries for the `g3 Bg2 Nf3 d3 O-O` system vs all major Black responses.
- **Arena calibration**: `arena_tournament.js` now lets you choose Stockfish depth at runtime, with calibrated ELO labels. ELO formula no longer hardcoded to 1600.

---

## What's new in v2.12.0

- **Massive Opening Book Expansion**: Added ~120+ new entries covering QGD, Slav, Italian, French, and Caro-Kann, plus extensive transposition support (Nf3/c4/g3-first) and King's Gambit tactical fixes.
- **King Safety NPS Optimization**: Replaced quadratic scans with ray-casting, increasing opening NPS from ~500 to ~10,000+.
- **Scholar's Mate Detection**: Improved the commentator's ability to recognize and warn about f7 threats even with non-standard move orders.
- **Engine Stability**: Fixed Temporal Dead Zone (TDZ) and Zobrist repetition bugs.

---

## What's new in v2.11.0

This release, **The Bug Fix & Evaluation Edition**, adds +130 ELO over v2.10 (benchmark: ~1818 vs Stockfish depth 10, 10 games), fixes 5 correctness bugs, and unlocks deeper endgame search.

### Engine
- **En Passant in quiescence** — EP captures are now visible to the quietness filter, MVV-LVA, and delta pruning.
- **50-move rule in minimax** — engine now returns 0 (draw) when `halfMoveClock ≥ 100`.
- **Wise King depth 12 → 30** — time (30s) is the real cap. In endgames, d:12 was the bottleneck; now iterative deepening goes as far as the clock allows.
- **Q-search limit** — non-check quiescence capped at 5 (was 8). Average NPS increased ~56% (18K → 28K).

### Evaluation
- Enemy passed pawn danger: exponential penalty by rank (rank 7 = 270 cp extra — engine blocks).
- King centralisation bonus in endgame (`eg > 0.4`).
- Positional bonus deflation: outpost, king safety, open files, early queen penalty all reduced to prevent material sacrifices.

### UI / Rules
- Draw detection order fixed: K vs K no longer reported as stalemate.
- Scholar's Mate commentary covers Qf3 and Bc5 variants.
- Professor correctly values en passant captures.

---

## What's new in v2.1.0

This release, **The Performance & Heuristics Edition**, brings a massive jump in tactical strength and execution speed (+80% NPS) through low-level optimizations and classic positional heuristics.

### High-Performance Search (40k+ NPS)
We eliminated the three biggest bottlenecks in the engine:
- **O(1) King Tracking**: No more scanning the board to find the kings; their positions are now cached and updated in real-time.
- **Reverse Ray-Casting**: The `isAtk` (is attacked) detection now uses outward ray-casts rather than inward board loops, dramatically reducing core computation time.
- **Lazy Selection Sort**: Replaced generic `.sort()` with a manual selection sort using pre-computed scores in `Int32Array`, allowing the engine to find the best move and trigger Alpha-Beta cuts significantly faster.

### Advanced Heuristics (HCE)
- **Tapered Evaluation**: Piece values now interpolate smoothly between Middlegame and Endgame (e.g., Bishop/Knight pair value parity adjusted by phase).
- **Safe Mobility**: Minor piece mobility bonuses are now calculated only for squares not controlled by enemy pawns.
- **Passed Pawn Logic**: Path scanning (penalty for contested promotion squares) and **Rule of the Square** (geometric detection of unstoppable pawns in endgames).
- **Pawn Hash Table**: Zobrist-based caching for pawn structures to avoid redundant O(64) structure scans.

---

## What's new in v2.0.0

This release features a major architectural engine update alongside a complete rebuild of the pedagogical layer. The engine is no longer "just a wrapper"—it is now a refined tactical core.

### Opening Theory in the Professor

The two main Professor buttons now speak the language of chess openings.

**Analysis (🔍)** detects whether your current position has known theoretical continuations. If it does, it says *"You are still in theory — press What should I do? to see the next theoretical moves."* If you have left the book it says so clearly too.

**What should I do? (🎯)** shows a header line naming the opening and the number of theoretical continuations available, directly above the move list. After 1.Nf3 Nf6, you see: *"📚 Reti Opening — 3 theoretical continuations available below."* After 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4: *"📚 Nimzo-Indian Defence"*. The detection uses a broad algorithm that catches positions even when the exact sequence is not stored as a book key.

### Missed Opportunity Detection
The Coach no longer just warns you when you hang a piece; it can now detect if you **missed a golden tactical opportunity** (like a free piece or a forced mate) because you were too focused on the opponent's last move. It will tell you exactly what the hidden move was and explain its strategic intent.

### 3rd Person Commentator & Easter Eggs
The announcer now narrates games strictly in the third person, acting like a real sports broadcaster. It explicitly names captured pieces with proper grammar and includes new clean family jokes and musical easter eggs (like singing Queen's *Runaway* when the Queen flees).

### Expanded Opening Book

From 48 positions / 140 entries to **~100 positions / ~280 entries**. New coverage: French Defence (Winawer, Tarrasch, Advance, Exchange), Scandinavian, Caro-Kann (Classical, Karpov, Advance), English (Symmetrical, Anglo-Indian, Four Knights), Nimzo-Indian (Rubinstein, Classical, Sämisch), Grünfeld, Queen's Indian, Benoni, Reti with all black responses, extended London System, and Open Sicilian.

Positions that previously caused a false *"you have left the book"* at move 2 — such as 1.Nf3 Nf6 or 1.d4 e6 — are now correctly detected as theoretical.

### Training Library

A new **🧩 Training** button appears directly on the main menu — no longer buried in Options. It opens a library of 36 curated learning positions in three tabs:

- **Openings (7)** — Scholar's Mate, Légal's Trap, Budapest Gambit, Fried Liver, King's Gambit, Petrov blunder, Four Knights fork
- **Tactics (15)** — Back rank mate, knight fork, absolute pin, discovered attack, double check, skewer, queen trap, smothered mate, Anastasia's mate, Arabian mate, zugzwang, bishop sacrifice on h6, battery, and more
- **Endgames (14)** — Ladder mate, queen mate, king opposition, pawn promotion, Lucena, Philidor, square rule, wrong bishop, two bishops vs king, and more

A **🎲 Random Challenge** button loads one of **30 curated tactical puzzles** at random. Each puzzle includes a specific theme (Mate in 1, Fork, Pin, Skewer, Discovered Attack, Promotion, Sacrifice) and a bilingual description explaining the challenge. A **🎲 Another** button inside the challenge modal lets you cycle to a new puzzle without returning to the library.

### Full Support for Playing as Black

Fixed a transition bug that previously prevented the AI from continuing the game if the human player chose to play as Black. The game now handles side-switching seamlessly across all difficulty levels.

### Checkmate Handling Fixed

When a checkmate in 1 exists, the Professor now shows exactly one move with the header *"🏆 Checkmate in 1! This move ends the game."* Previously the pedagogical guarantee was forcing a second irrelevant move to appear even when the game was already won.

### Commentary Style Bug Fixed

The "More serious" setting (level 0) was impossible to select — `parseInt("0") || 1` evaluates to `1` in JavaScript because `0` is falsy. Fixed with an explicit `isNaN` check. Both menus now also show tick labels (*Serious | Mixed | Playful*) directly under the slider.

### Victory Detection Fixed

In AI mode, confetti now fires only when the human wins. Previously it fired for both outcomes.

### Anti-Repetition 2.0 (FIDE Standard)

The Wise King now understands the strategic value of a draw. While previous versions used a blind penalty for repeated positions, v2.0.0 evaluates threefold repetition as exactly **0.0 (Draw)**.

This architectural shift allows the engine to:
- **Force a draw** by repetition when it is materially behind (e.g., losing a piece against a stronger opponent).
- **Avoid a draw** by repetition when it is ahead, seeking alternative winning lines instead.

Combined with a corrected **Zobrist Hashing** implementation that tracks castling rights and en-passant state, the engine no longer falls into infinite "shuffle" loops in complex middle-games.

### Engine — Critical Bug Fixes

Several bugs in the search engine were identified and corrected post-release. These fixes have a significant effect on the Wise King level.

**Aspiration windows for Black** — the window bounds were passed to `minimax` in White's score space. With Black, `(α, β)` must be inverted to `(-β, -α)`. Without this fix the Wise King playing Black was effectively blind from depth 3 onwards, producing moves like Kd7 on move 7 when a free piece was available.

**PVS null window for the minimiser** — the null window used `(α, α+1)` for both sides. The correct window for a minimiser node is `(β-1, β)`.

**LMR re-search condition** — the re-search after a reduced null-window probe used `v > α && v < β`. The `v < β` guard is wrong: any fail-high (`v > α`) must trigger a full re-search regardless of whether it also exceeds β. Without this fix, shallow searches returning large scores were trusted without verification.

**multiPV alpha update** — when `multiPV === 1`, the alpha update for Black used `β = Math.min(β, −scoreForMe)`, mixing score spaces and collapsing the window on good positions.

**Aspiration failsafe** — after 3 widening attempts the engine could return stale scores. A guaranteed full-window re-search now runs as a fourth fallback.

### Engine — Strength Improvements

- **Horizon Effect Fix:** Quiescence search now evaluates checks up to depth 2, preventing the AI from going blind and hanging pieces during long tactical exchanges.
- **Reckless Attack Prevention:** The engine no longer sacrifices material to expose the enemy king if its own minor pieces are not yet developed (`attackerUndeveloped <= 1`).
- Passed pawn bonus scales **×4.5** in endgame (was ×3) and King centralization triggers earlier (`eg > 0.4`).
- TT move ordering: best move stored per TT entry, searched first at priority 1,000,000
- Counter move heuristic: quiet moves that refuted the opponent's last move scored at 48,000
- MVV-LVA pre-sorting of root moves before depth-1 iteration
- Futility pruning extended to depth 3 (margin 500 cp)
- Aspiration delta widened to ±75 cp (was ±50)
- Piece values tuned: N=305, B=333
- King safety loop restructured: each attacking piece counted once (was once per attacked zone square — overcounting)

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

- **Bugs & features:** Please open an **Issue** describing the bug or feature request with steps to reproduce, expected vs actual behaviour, and screenshots when helpful. Issues are the preferred place for discussion and triage.
- **Code changes:** Fork the repo, create a branch named `fix/your-brief-desc` or `feature/your-brief-desc`, and open a **Pull Request**. Small, focused PRs are easier to review.
- **Tests & scripts:** If you change or run the `stockfish_tests` scripts, list any setup steps in the PR and include relevant logs. See `stockfish_tests/README.md` for test setup.
- **Review & communication:** Use Issues to request reviews or design feedback; maintainers will label and triage incoming contributions.


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

Monolith Chess was designed and directed by Aaron Vazquez Fraga. The code was written almost entirely by AI assistants.

The bulk of the implementation — engine architecture, search techniques, the Professor system, opening book, training library, and most bug fixes — was written by **Claude Sonnet** (Anthropic). **Gemini Pro** (Google) contributed to earlier structural decisions and alternative approaches. **ChatGPT** (OpenAI) helped with isolated problems in the earlier phases of development.

The ideas, the pedagogy, the product decisions, the 1000+ test games, and the direction of every iteration came from a human who wanted a better way to teach his daughter chess. The code came from the models.

This is an honest record of how the project was made. It is also, perhaps, a document of what human-AI collaboration looks like when it is working well.

---

*Monolith Chess v2.22.14 — A chess game made for a 9-year-old, that accidentally became a serious engine.* *~860 KB. Zero dependencies. Open the file and play.*
