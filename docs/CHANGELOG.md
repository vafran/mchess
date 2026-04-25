# Changelog — Airin Chess

All notable changes to this project are documented here.  
Format: version · size · what changed.

[Go to README.md](../README.md)

---
## v2.23.0 — Production Release
**~16,500 lines · ~860 KB**

### Engine: Ten Validated Improvements (v2.22.6 → v2.22.15)

v2.23.0 merges the complete v2.22.x development cycle into production. Each patch was individually validated with a tournament before inclusion. The production baseline being replaced is v2.22.5 (~1732 ELO, 27.5% vs Stockfish depth-7).

**v2.22.6 — Rule of the Square: Broken Duplicate Removed**
A second Rule of the Square implementation was silently running inside the pawn evaluation loop. Unlike the correct version (gated to pure king-and-pawn endings), this broken copy fired in any endgame and awarded up to +942cp for easily-blockable passed pawns. Produced phantom evaluations of +600–+942cp on quiet moves (identical scores across multiple different moves = definitive phantom signature).

**v2.22.7 / v2.22.10 — Anti-blunder Filter Safety Check + BLOCKED Gate**
The root SEE filter now has a two-stage gate: (1) a BLOCKED(mate) gate prevents the filter from substituting when the substitute is a known-mate line (score ≤ −100,000), and (2) a BLOCKED(worse:N) gate prevents substitution when the substitute scores more than N cp worse than the original. At v2.22.7 N=200, refined to N=100 in v2.22.10 after tournament analysis.

**v2.22.8 / v2.22.9 — PASS_DANGER Phantom Fixed**
The `PASS_DANGER` evaluation term had an asymmetry bug: it only penalised White for Black's passed pawns, with no mirror bonus for White's own passed pawns. Fixed with symmetric scoring. The base value was also reduced from 80cp to 25cp (v2.22.9) to prevent marathon endgame draws caused by the engine over-weighting passed pawn danger at equal positions.

**v2.22.11 — Anti-blunder Filter Extended to Losing Captures**
The root SEE filter previously only checked quiet moves. It now also checks captures where SEE < 0 — catching losing exchanges that the engine's depth-limited search might not resolve correctly.

**v2.22.12 — King Centralization Gate**
The endgame king activity bonus (`kingCentralization`) now has a guard: the bonus is gated to `eg > 0.5` (genuine endgame). Without this gate, the king received bonus points for walking toward the center in the middlegame, producing phantom "king walk" evaluations of +200–+400cp that distorted move selection.

**v2.22.13 — Repetition Blindness Fix**
Root moves that would create the 2nd or 3rd repetition of a position were not being scored as repetitions — the `gameHashCount` map was built from the wrong data. Fixed: repetitions at root now score −9000 (strong avoid) unless the engine is already losing badly (score < −500), in which case a draw is accepted. Confirmed: 266 root-rep firings across a 32-game tournament, converting blind draws into real results.

**v2.22.14 — BLOCKED Gate Threshold 100→50cp**
The anti-blunder filter's BLOCKED gate fires when the substitute move scores N cp worse than the original. At 100cp, the G26 false positive occurred: Nc6xe5 (SEE=−225, clearly correct) was blocked because the substitute scored only 57–63cp worse. Threshold lowered to 50cp.

**v2.22.15 — Rook on 7th Rank Bonus**
Standard positional bonus added: +40cp (MG) / +25cp (EG), tapered. A rook on the 7th rank (or 2nd rank for Black) attacks the opponent's unmoved pawns and restricts the king. The engine previously earned no bonus for this strong placement.

### Difficulty Levels Recalibrated

| Level | Time budget | Validated ELO | Notes |
|---|---|---|---|
| 🐣 Chick (easy) | 0.5 s | — | Depth-2 cap, always reached well before time |
| 📚 Student (medium) | 1.5 s | — | Depth-4 cap, always reached well before time |
| 🔥 Wizard (hard) | **15 s** | **~1652** | Searches as deep as time allows |
| 👑 Wise King (grandmaster) | **30 s** | **~1830** | Searches as deep as time allows |

ELO calibrated on CoolPC Black VIII (AMD Ryzen 7 3700X @ 4.4 GHz, 16 GB DDR4 3200 MHz, ~95k NPS). Wizard and Wise King strength scales with hardware.

### Tournament Results

| Tournament | W | D | L | Score | ELO |
|---|---|---|---|---|---|
| 40g PC vs UCI_Elo 1750 (15s) — **Wizard** | 11 | 7 | 22 | 36.3% | ~1652 [CI: 1542–1762] |
| 40g PC vs UCI_Elo 1750 (30s) — **Wise King** | 21 | 7 | 12 | 61.3% | ~1830 [CI: 1721–1938] |

**Key finding:** Significant White/Black color disparity — White 25.0%, Black 47.5% over the 40-game Wizard run. The engine defends and counterattacks well (reactive play) but does not generate initiative as White. This drives the v2.24.x development roadmap.

### Pedagogical & Coach Improvements

**Graded move quality (7 levels)**
The coach's "Was it good?" feedback now uses a 7-level scale instead of binary brilliant/blunder. Levels: blunder / mistake / inaccuracy / neutral / nice / good / very good / brilliant, each with a distinct emoji and message. Thresholds are based on centipawn delta relative to the previous position.

**Commentator: no quality annotation during funny commentary**
When the commentator is in funny mode (e.g. "El caballo hace su cosa rara y nadie le entiende"), quality annotations (e.g. "¡Jugada brillante!") are now suppressed. Technical and humorous tones no longer appear on the same move.

**wasItGood false-positive fixes**
Three targeted fixes reduce the coach false-positive rate:
- *Sacrifice gate:* `isRealHanging` now checks `evalAfterMove ≤ 200cp` — intentional sacrifices in winning positions are no longer flagged as hanging pieces.
- *worstEval guard:* `getImmediateReplyRisk()` now returns `worstEval` (the position after the opponent's best reply), enabling the delta check to use a tighter reference point.
- *Threshold tightened:* `_worstFromMover < 0` → `< −100` — avoids MISSED_WIN flags when the engine is already clearly ahead (+300cp+) and the opponent's quiet retreat creates only a superficial 1-ply dip.

### UI & Interface Redesign

**Move carousel (desktop & mobile)**
The move history list has been replaced by a compact horizontal scroll strip positioned directly below the board. Navigation (⏮ ◀ ▶), undo (↩), PGN copy (📋), and a live-game exit button (🚀) sit at each end. The strip auto-scrolls to the active ply and highlights it in the theme accent colour. The previous sidebar history and redundant navigation buttons have been removed.

**Responsive layout overhaul**
The board wrapper is now a column-flex container: board + advantage bar on the first row, move strip on the second. This eliminates the floating-strip problem on desktop and keeps the board visually self-contained. On mobile the advantage bar is hidden and the layout stacks vertically.

**Top bar redesigned**
The page title ("♟️ Airin") is integrated into the top bar as a centred gradient element, freeing vertical space. The hamburger menu button moved from a floating fixed position into the top-bar right group alongside the language selector and fullscreen button. The `<h1>` element is kept invisible for JavaScript state detection.

**Side panel streamlined**
A red "☰ Menú" button was added below "Reiniciar partida" in the side panel for quick in-game menu access on large screens. The left coach panel is wider (max 360 px) and the right info panel is narrower (max 220 px), giving the coach more room for opening suggestions and analysis text.

**Commentary box overflow fixed**
The commentary list now correctly scrolls within a bounded height instead of growing to overflow the panel. Fix: `min-height: 0` added at every level of the flex chain (`.left-panel`, `.hints-card`, `.tab-pane`) so `overflow-y: auto` on `#commentaryList` activates.

**Football theme contrast fixed**
The "♟️ Airin" title and "vs Wise King" status text are now white on the football (green) theme, where the previous gradient fill was invisible against the dark green background.

**Commentator: quality suppressed in opening, preserved across language switch**
Move-quality annotations (📉 Blunder, 👍 Nice move, etc.) no longer appear on the first 10 moves — opening theory moves produce noisy centipawn deltas that don't reflect actual quality. Quality is now stored in the `commentaryLog` entry and re-applied in the correct language when the player switches language mid-game, so annotations are no longer lost on rebuild.

**Commentator: dynamic 📖 book-move phrases**
When a move is played in the opening phase, the commentator now sometimes (~28% of quiet moves) adds a varied 📖 "theory" comment ("Book move! White follows well-known theory", "Black knows their theory!", "Theory! This position has been played thousands of times", etc.) in addition to or instead of the standard piece commentary. Opening name announcements also now include the 📖 emoji. Six phrases per language with rotation to avoid repetition.

**Opening suggestions: style tags**
In the "What should I do?" coach panel, book-move suggestions no longer show a uniform "Low risk" badge. Each opening now shows a colour-coded style tag derived from its description: ⚡ Aggressive (orange), 🧱 Solid (green), 🔀 Flexible (blue), ♟️ Positional (amber), 🔮 Hypermodern (purple), or 📖 Theory (grey). The opening list at game start is capped at 11 entries (was 20) to remove duplicates.

**Blunder detection: opening phase and ignored threats**
Two classes of blunders that previously went unreported now trigger commentary and Training Mode warnings:
- *Opening-phase hanging pieces:* The commentator's quality scan now runs regardless of `isOpening`. A hanging rook or queen on any move — even move 3 — is flagged as a blunder. Previously the scan was gated to moves 11+.
- *Ignored threat:* Training Mode now warns when the player plays an unrelated move while their rook or queen is already under attack. Previously the guard only fired for *newly* created threats; an existing hanging queen was silently ignored.
- *Stale-snapshot fix:* Move quality evaluation is now correctly scoped to human moves only. A stale snapshot was causing intermittent false blunder annotations on AI moves.
- *Check + blunder:* A new combined comment branch resolves the contradiction where "¡Jaque! Buena jugada" and "📉 ¡Error grave!" appeared on the same move. If a check move also leaves a piece hanging, a single unified warning is shown instead.

**Advantage bar: sigmoid mapping**
The advantage bar now uses a `tanh(score/600)` sigmoid mapping instead of a linear scale. The linear mapping saturated (pinned to 95%) at ±700cp, making most non-trivial positions look one-sided. The sigmoid matches Lichess/Chess.com behavior: ±100cp ≈ 58%, ±300cp ≈ 73%, ±600cp ≈ 88%, never hard-clips. The queen's early-development penalty is also reduced from 280cp max to 80cp max to prevent the bar from flipping to the wrong side in normal opening positions.

**PGN export: SAN disambiguation**
The move notation generator now correctly disambiguates when two pieces of the same type can both reach the same square (e.g. `Nbd2` vs `Nfd2`, `Rfe1` vs `Rae1`). Previously the engine emitted bare `Nd2` which Lichess and other tools rejected as ambiguous. Fix covers knights, bishops, rooks, and queens. Both the in-game SAN generator and the book/analysis notation helper are updated.

**Commentator: expanded funny commentary**
The 🎉 Playful style now has richer variety. New phrases added for all piece types (pawns, knights, bishops, rooks, queens, king) in both Spanish and English — covering piece moves, captures, checks, and blunders. Each category now has 3–5 options with rotation to avoid repetition.

---

---
## v2.22.14 — BLOCKED Filter Threshold Fixed
**~16,500 lines · ~860 KB**

### Bug Fix — Anti-Blunder Filter: False-Positive Gate Tightened (BLOCKED threshold 100→50cp)

The root anti-blunder filter gate (`BLOCKED(worse:N)` at line 11029) fires when the filter's substitute scores more than N cp worse than the original move. At 100cp, the G26 false positives slipped through: the knight capture Nc6xe5 (SEE=−225, clearly correct) was blocked because the substitute scored only 57–63cp worse — below the old gate.

**Fix:** Threshold lowered from 100cp to 50cp.

```javascript
// BEFORE
} else if (_subScore < _topScore - 100) {
// AFTER
} else if (_subScore < _topScore - 50) {
```

**Tournament result (30 games, PC, Stockfish depth-7):** W2 D14 L14 — **30.0% — ~1753 ELO [CI: 1620–1885]**.  
First complete PC tournament run. First wins vs Stockfish d7 in a complete PC run. Beats production baseline (v2.22.5, 27.5%, ~1732 ELO).

### Tournament Script — UCI_Elo and Skill Level Support

`arena_tournament.js` now supports three Stockfish opponent modes:
- **Depth mode** (`--depth N`) — historical baseline, ELO estimated
- **UCI_Elo mode** (`--sf-mode uci_elo --sf-value 1750`) — official calibrated ELO (recommended)
- **Skill Level mode** (`--sf-mode skill_level --sf-value 3`) — 0–20 with deliberate errors, official ELO

Release tournament from v2.22.15 onwards: `--sf-mode uci_elo --sf-value 1750 --games 40`.

---

## v2.22.6 — Phantom Promotion Bug Fixed

**~16,500 lines · ~860 KB**

### Bug Fix — Rule of the Square: Broken Duplicate Removed (Critical)

A second Rule of the Square implementation existed inside the pawn evaluation loop (`u === 1`, ~line 9099). Unlike the correct version at line ~9690 (which has an `if (!anyMajorMinor)` guard and only fires in pure king-and-pawn endings), this broken copy:

- Had **no guard** — fired in any endgame, including positions with rooks and minor pieces on the board
- Awarded `bonus += Math.round(600 * eg)` — up to **+942 cp** at `eg=1.57` — for passed pawns that enemy pieces could trivially block or capture
- Produced **phantom evaluation scores** of +600–+942 cp on quiet moves (identical scores across multiple different moves = phantom signature)

Result: the engine hallucinated unstoppable promotions, played irrational pawn pushes (e.g. `h4??` with a rook defending), and lost evaluative trust in any endgame with pieces present.

**Fix:** Removed the 14-line broken block. The correct implementation (with `!anyMajorMinor` guard + proper passedness check + calibrated 250cp bonus) is preserved at line ~9690.

**Tournament validation (6/20 games, early data):** Zero phantom activations. Score 0W 1L 5D, ~1842 ELO vs baseline ~1732 (v2.22.5).

### Diagnostic — Think Time in Verbose Log

The `📊` console line in the worker now appends `t:${N}ms` — search duration per move. Enables detection of 0ms forced moves (`[dforced/30]`) and abnormally long think times in tournament logs.

---

## v2.22.0 — Pedagogical Intelligence Update
**~15,800 lines · ~805 KB**

### 🌟 New Features
*   **🧠 "God Mode" for the Coach (Deep Analysis):** The suggestion system is now capable of reaching Grandmaster-level analysis depth (**Depth 30**) with an extended calculation time (up to 15,000ms). The Coach no longer just detects immediate tactics; it formulates complex strategic plans.
*   **⏳ Visual Analysis Countdown:** Implemented the generic `startThinkingCountdown` function. Now, when the Coach performs a deep analysis, the UI displays a live countdown timer, vastly improving the user experience during calculation wait times.

### 🛠️ Technical Improvements
*   **🛡️ Move History Shielding:** Restructured how the engine reads the game. The Coach and Commentator now prioritize the internal chess state (`game.history()`) over `window.history`, eliminating collisions and direct conflicts with the user's browser history object.
*   **🌍 Global Scope for Utilities:** Refactored the phrase selection function (`getRnd`) to live in the global scope of the script. This ensures that any module dependent on language or randomness can access it without interruptions during engine initialization.

---

## v2.21.0 — The Performance & Tactics Edition (Final)
**~15,500 lines · ~790 KB**

### Engine — Security Parachute (Absolute Fallback)
- **Failsafe logic in `askWiseKing`** — implemented a global try/catch and legality check that guarantees a move is always returned, even if the primary search fails or returns an invalid value. This prevents the "Freezing AI" bug in long matches.

### Engine — 8-Bit Board Representation (NPS ×4–5)
- **`Int8Array(64)` flat board** — migrated from `8×8` string array to flat typed array with integer piece codes (`1–6` = White, `9–14` = Black).
- **Cache locality** — 64 bytes fit in a single L1 cache line. Board reads cost near-zero.
- **Integer arithmetic throughout** — piece type `p & 7`, color `p <= 6`. Zero string comparisons in the hot path.
- **Pre-allocated buffers** — `Int8Array`, `Int32Array` for all search structures, allocated once at Worker startup.
- **Result**: stable **45k–80k NPS** vs ~10k–18k in v2.13.1 at identical depths.

### Engine — Tapered Evaluation (MG/EG PST)
- **Dual-phase PST** (`PST_MG` / `PST_EG`) — replaces single static tables.
- Integer interpolation: `score = (mgVal × ph + egVal × (24−ph)) / 24 | 0`. No floats in hot path.
- Phase `ph` from pieces: minor=1, rook=2, queen=4. Endgame=0 (no pieces) to 24 (full set).
- Knights/bishops valued correctly for each game phase.

### Engine — King Shield & Storm Heuristics
- **King Shield** (`eg < 0.3`): +25 cp per pawn in front of the castled king (up to 3).
### Engine — Endgame & Mop-up Logic
- **Pawn Promotion Incentive** — increased base pawn value to **145** to encourage advancement.
- **Mop-up King Cornering** — proximity and center-distance factors increased by 10x (47/16). The engine is now significantly more efficient at checkmating lone kings.
- **Simplification correctly tuned** — fixed the trade-incentive multiplier to ensure the engine simplifies material when ahead by > 200cp.

### Engine — Static Exchange Evaluation (SEE)
- Full `see()` function with X-ray support (lines up correctly behind removed pieces).
- Winning/equal captures (`SEE ≥ 0`) sorted by net gain — searched first.
- Losing captures (`SEE < 0`) — deprioritised below quiet moves in move ordering; skipped in quiescence.
- Eliminates the most common blunder class: trading a bishop for a guarded pawn.

### Bug Fix — Repetition Draw Detection (critical)
- **Root cause**: after the 8-bit refactor, `positionHashes` (UI string hashes) were sent to the Worker but the search used Zobrist XOR-fold keys — they were never connected. The engine was completely blind to repetition.
- **Fix**: `positionHashes` strings are now decoded into Zobrist keys using the same `ZL`/`ZH`/`ZBL`/`Z_CASTLE`/`Z_EP` tables as `makeMove()`, stored in `historyCount: Map<u32, count>`.
- **Correct threshold**: `minimax()` returns 0 when `historyCount.get(bkS) >= 2` (position seen ≥2 times in history = threefold repetition territory).

### Tournament Infrastructure (arena_tournament.js v2)
- 20 opening lines (ECO coverage), color alternation, 20 games default.
- Partial JSON save after every game — safe to interrupt with Ctrl+C.
- NPS per-move logging, average NPS in final report.
- 95% Wilson score ELO confidence intervals.
- Persistent V8/TurboFan page across all games — JIT stabilises at peak from game 2.
- 45-second per-move timeout with stale-page detection and auto-reload.

### Engine — TT Upgrade
- **1 048 576-entry TT** (20 MB, `Int32Array`) — was 200K entries.
- EXACT entries are never overwritten by UPPER/LOWER entries at any depth.
- Mate scores stored as absolute (plyFromRoot-adjusted) for correct retrieval.

---

## v2.13.1 — Hotfix
**~14,100 lines · ~687 KB**

### Bug Fixes — Engine
- **d:1 blunder fix** — The iterative deepening loop could stop at depth 1 if a stale TT entry returned a mate score (> 90,000 cp) from a previous analysis. This caused queen sacrifices and blunders in simplified endgames. The mate-score early break now requires `d >= 5`.

**Note:** A stalemate safety root filter was initially included but caused a performance regression (tournament result dropped from ~1700 to ~1368 ELO estimated). It was reverted. Stalemate detection will be fixed in a future version at the quiescence search level.

---

## v2.13.0 — The Memory Update
**~14,100 lines · ~687 KB**

Tournament benchmark: **ELO ~1700** (3 draws / 1 loss in 4 games vs Stockfish d:6) — first meaningful draws in tournament history.  
Average game length: **234 moves**. Max depth reached: **d:30** (simplified endgame, Match 2).

### Bug Fixes — Engine (Critical)
- **Worker TT Amnesia fix** — `askWiseKing()` was calling `createEngineWorker()` + `worker.terminate()` on every single move, wiping the entire 200K-entry transposition table, all killer moves, and history heuristics at the start of each turn. The worker is now reused for the entire game. A safety timer handles crash recovery without destroying TT state. Impact: endgame search depth jumped from d:8–10 to **d:14–18**, with peaks at d:30.
- **Pawn Storm `distToPromo` formula corrected** — The distance-to-promotion formula in the Enemy Pawn Storm evaluator was inverted, causing the engine to fear its own pawns advancing toward the opponent. Fixed to `isW ? (7 - fr) : fr`.
- **Mate early-exit depth reporting** — `completedDepth = d` is now assigned before the `break` that exits the iterative deepening loop when a forced mate is found. Previously logged as `[d:0/30]`.

### Features — Opening Book
- **King's Indian Attack (g3 system)** — 13 new entries covering `g3 → Bg2 → Nf3 → d3 → O-O` against `e5`, `d5`, `Nf6`, and `Nc6` responses. Previously only 1 book move after `g3`.
- **Ruy López Exchange Variation** — After `Bxc6 dxc6`, the engine now plays `d3` from the book instead of searching independently and finding `Nxe5??` (which loses to `Qd4!`). Added for both `dxc6` and `bxc6` recaptures.
- **English Opening — Reversed Alekhine** — After `c4 e5 Nf3 e4`, the engine now plays `Nd4` from the book. Previously had zero coverage here and collapsed in 40 moves.
- **Bilingual translations** — All new entries include ES/EN translations in `localizeOpeningName()` and `localizeOpeningDescription()`.

### Features — Arena Tournament
- **Selectable Stockfish depth** — `arena_tournament.js` now prompts for Stockfish depth (d1–d20) at startup with calibrated ELO labels per level.
- **Calibrated ELO formula** — Replaced the hardcoded `2200 − 600 = 1600` floor with a proper per-depth ELO table. When score = 0, shows calibrated lower-bound with contextual advice instead of a misleading fixed number.
- **Move stability exit (20% threshold)** — Iterative deepening now exits when the best move is identical for 3 consecutive depths and 20%+ of the time budget is spent (was 40%). Saves 6–12 seconds per move in stable positions.
- **Big-gap early exit** — If the best move leads the 2nd-best by > 200 centipawns at depth ≥ 6 (after 15%+ of time spent), the engine trusts the result and stops searching. Saves 15–20 seconds in clearly decided positions and after decisive tactics.

---

## v2.12.0 — Opening Theory & Commentator Update
**~14,000 lines · ~685 KB**

This update significantly strengthens the engine's early game via a massive opening book expansion and polishes the commentator's tactical awareness.

### Features — Opening Book
- **Massive Book Expansion (~120+ entries)** — Doubled the opening knowledge to handle common transpositions and tactical traps:
  - **QGD & Slav Defense**: Detailed paths for Exchange, Orthodox, and Meran systems (up to 7-8 moves).
  - **Italian Game / Giuoco Piano**: Deep coverage of `c3-d4` and `Ng5` (Fried Liver) lines.
  - **French & Caro-Kann**: Added the most common Advance, Exchange, and Classical variations.
  - **Transposition Logic**: Broad support for **Nf3-first**, **c4-first**, and **g3-first** move orders to reach theoretical middlegames even when starting non-canonically.
  - **King's Gambit Correction**: Fixed the critical `e4 e5 f4 exf4` response (Nf3) to prevent the `Ke2??` early king-activation blunder.
  - **Bird Opening**: Added basic structural support for `1.f4 d5`.
  - *Result*: The engine now reaches the middlegame with a significant time advantage and better positional coordination.

### Bug Fixes — UI / Commentator
- **Scholar's Mate Detection Fix** — The `isScholarAverted` logic now correctly identifies `Qf3` as a threat (previously only tracked `Qh5`).
- **Enhanced Scholar's Defense recognition** — Added `f6` and `Nc6` as recognized defensive responses in the commentator alerts.
- **Improved Threat Sequencing** — The "Scholar's Mate threat" alert now correctly triggers even if the Bishop (`Bc4`) is played after the Queen (`Qf3`), covering the most common amateur move order.

---

## v2.11.1 — Engine Stability Update
**~13,800 lines · ~677 KB**

Focuses on resolving catastrophic tree collapses in deep endgames caused by Zobrist hash mismanagement and timeout leaks in quiescence search.

### Bug Fixes — Engine (Worker)
- **O(1) Zobrist Repetition Check** — `searchStack.includes(hash)` O(depth) removed. Added a parallel `searchSet` for O(1) perpetual check and piece-shuffling detection. Saves ~15-20 string-comparisons per node in late endgames.
- **Catastrophic Tree Collapse (d:0/30)** — Fixed a fatal logical flaw where the root loops pushed the child's hash *before* calling `minimax`, causing `minimax` to see its own hash upon entry and instantly return 0. The tree was returning 0 for every legal move without actually searching them.
- **Quiescence Search Timeout Leak** — Fixed the `[empty array / 45s hang]` bug. `quiesce` dropped the `deadline` check in extremely sharp tactical positions, causing the worker to hang until the UI safety timer triggered. The fallback `engineSearchSync` now catches all worker-thrown errors immediately.
- **50-Move Rule Inheritance** — The `cloneS` function now correctly copies the `halfMoveClock` property so root child-nodes have the correct clock for FIDE draw evaluation.
- **King Safety Loop Optimization (NPS Fix)** — Replaced the O(576 × `atk()`) nested loops in `evaluate()` with an O(9-zones × rays) approach using reverse ray-casting. This significantly improves NPS in complex positions, jumping from ~500 to ~10,000+ in the opening.
- **ReferenceError: maxDepth TDZ Fix** — Resolved a crash where the engine returned an empty array when exactly one legal move was available, caused by accessing `maxDepth` before its declaration.

---

## v2.11.0 — Bug Fixes & Evaluation / Benchmarks
**~13,800 lines · ~676 KB**

Tournament results: **ELO ~1818** (vs Stockfish d:10, 10 games) — previous: ~1688 → **+130 ELO**.  
Average game length: 142 moves (was 110). Average NPS: ~28K (was ~18K). **2 draws** by repetition.

### Bug Fixes — Engine (Worker)
- **En Passant blind spot in quiescence** — EP captures were invisible to the quietness filter, MVV-LVA sort, and delta pruning. Now correctly treated as pawn captures (`PV['P']`).
- **50-move rule missing in minimax** — Engine ignored the FIDE rule and kept evaluating drawn positions as wins. Added `if (halfMoveClock >= 100) return 0`.
- **Q-search explosion (NPS collapse)** — Non-check quiescence reached 8 levels deep, collapsing NPS from 18K to ~100–750. Limit reduced to 5 (non-check) and 8 (in check). Average NPS +56%.
- **Wise King depth: 12 → 30** — Time (30s) is the real constraint. In endgames with few pieces, d:12 was the bottleneck (3–8s per move, hitting the ceiling not the clock). d:30 lets iterative deepening go as far as the budget allows. `killers = Array(64)` → no overflow risk.

### Bug Fixes — UI / Game Logic
- **Draw detection order (K vs K, insufficient material)** — `halfMoveClock` and `isInsufficientMaterial` ran *after* the `!hasMove` return, incorrectly declaring "stalemate" in King-only endings. Both checks now run before the no-moves block.
- **Scholar's Mate commentary broken** — `isScholarAverted` used hardcoded board coordinates (broke on flipped board and variations). Rewritten with SAN move history. Detects any `Qxf7#` / `Qxf2#` with a bishop developed within 12 moves.
- **Professor blind to En Passant** — `getMoveSafetyProfile()` and `getTacticalMoveAdjustment()` valued EP captures as 0. Fixed by assigning `PIECE_VALUES['P']`.

### Evaluation Improvements
- **Enemy passed pawn — exponential danger** — Extra penalty for rival passers at rank ≥ 4: ×1/×4/×9 scaled by endgame phase. Rank 7 → 270 cp extra (more than a bishop → engine blocks).
- **King activity in endgame** — Centralisation bonus `8×eg` cp per step closer to centre when `eg > 0.4`. Reduces g1↔h2 shuffling.
- **Double passed pawn evaluation removed** — Old `distanceToPromotion × 25` per-piece loop removed; the `PASS_OWN / PASS_DANGER` block at the end of `evaluate()` already covers it.
- **Positional bonus deflation** — Outpost: 140→65 · `enemyMajors`: ×22→×12 · `openFilesThreat`: ×35→×15 · `kPenalty`: min(150,×25)→min(100,×20) · Early queen penalty: 150→60 cp. Maximum theoretical king-attack reward: 343 → ~193 cp (sacrificing a bishop is no longer "profitable").
- **MVV-LVA aligned with mgPV** — `PV = { N:325, B:335 }` instead of `{N:300, B:300}`. Capture ordering in quiescence now correctly prefers bishops over knights.

---

## v2.1.0 — The Performance & Heuristics Edition
**12,850+ lines · 653 KB**

This release focuses on raw execution speed and tactical depth. By eliminating high-level JavaScript bottlenecks and implementing classic positional heuristics, the engine's strength has jumped significantly, reaching an estimated **~1900 ELO**.

### Performance Optimizations (Turbo Boost)
- **O(1) King Tracking** — Kings' positions are now cached and updated during make/unmake, eliminating expensive board scans.
- **Reverse Ray-Casting isAtk** — The "is attacked" detection now scans outwards from the target square, significantly reducing the number of checks per node.
- **Lazy Selection Sort** — Replaced `.sort()` with a manual selection sort using an `Int32Array` of pre-computed scores, enabling faster Alpha-Beta pruning.

### Heuristic Evaluation (HCE)
- **Phase 1: Tapered Material** — Piece values (mgPV/egPV) interpolate based on game phase, correctly valuing minor piece trades vs rooks.
- **Phase 2: Safe Mobility** — Mobility bonuses for Knights and Bishops now ignore squares attacked by enemy pawns.
- **Phase 3: Passed Pawn Pathing** — Advanced path scanner reduces bonuses for contested promotion routes and adds **Tarrasch bonus** (rook behind pawn).
- **Phase 4: Pawn Hash Table** — Zobrist-based caching for pawn structures, avoiding redundant O(64) scans for doubled/isolated pawns.
- **Rule of the Square** — Geometric detection of unstoppable passed pawns in the endgame (+600 bonus).

### Bug Fixes & Improvements
- **Commentator Language Sync** — Fixed a bug where switching languages reset timestamps to "now" and triggered phantom blunder warnings on historical moves.
- **Professor Value Sync** — Aligned UI piece values with engine averages (Q:885, R:510, B:330, N:315) for consistent advice.
- **Opening Book** — Expanded to ~100 positions / ~280 entries (added Open Sicilian and others).

---

## v2.0.0 — The Awakening of the Wise King
**12,500+ lines · 628 KB**

This release features a major architectural engine update alongside a complete rebuild of the pedagogical layer. The engine is no longer "just a wrapper"—it is now a refined tactical core.

### New features
- **Opening theory in the Professor** — Analysis and What should I do? now name the opening you are in and show how many theoretical continuations remain available. Works even when the exact move sequence is not stored as a book key.
- **Missed Opportunity Detection** — The Coach now detects if you missed a golden tactical opportunity (like a free piece or a forced mate) because you were too focused on the opponent's last move.
- **3rd Person Commentator & Easter Eggs** — The announcer now narrates games strictly in the third person. Includes explicit piece naming with proper grammar and new musical/humorous easter eggs.
- **Opening book expanded** — 48 → 97 positions, 140 → 274 entries. New coverage: French Defence, Scandinavian, Caro-Kann, English Opening, Nimzo-Indian, Grünfeld, Queen's Indian, Benoni, Reti, and extended London System.
- **Training Library** — 36 curated positions in three tabs (Openings, Tactics, Endgames) plus 100 random challenge FENs accessible from the main menu.
- **Full Support for Playing as Black** — Fixed a critical state-machine bug and ensured the AI responds correctly regardless of side.

### Engine Improvements
- **Strength Improvements (P1-P4)** — Passed pawn scoring (base 25, endgame multiplier ×4.5), earlier King centralization (eg > 0.4), refined NMP (R=3 at depth 8), and opening exploration rate (20%).
- **Horizon Effect Fix** — Quiescence search now evaluates checks up to depth 2, preventing tactical blindness in deep exchanges.
- **Reckless Attack Prevention** — Engine avoids unsound sacrifices if its own minor pieces aren't developed.
- **Anti-Repetition 2.0** — Proper FIDE threefold repetition logic (0.0 evaluation). Combined with corrected Zobrist Hashing (tracking castling/EP).
- **Aspiration Window Correctness** — Fixed inverted bounds calculation for Black moves and improved window stability.
- **Move Ordering** — TT move ordering, counter-move heuristic, and root MVV-LVA pre-sorting.

### Bugs fixed
- **AI Race Condition (Zombie Move)** — Fixed the "crazy AI" bug where restarting during a search corrupted the next game. Added generation tokens and coroutine aborts.
- **Checkmate Handling** — Fixed "Fue buena?" to correctly identify checkmate/stalemate and terminal states. Mate-in-1 now shows exactly one move.
- **Commentary level 0 (Serious) was unselectable** — Fixed with explicit `isNaN` check.
- **`simulateMove` castling fix** — Now correctly moves both king and rook.
- **FEN load state leak** — Loading a FEN now correctly resets all clocks and repetition hashes.
- **Profitable Trade Guarantee** — Prevented the Professor from suggesting moves that hang valuable pieces.
- **Thinking bar moved to top** — Fixed mobile layout shifts.

### Internal
- `fenPositionLoaded` flag — distinguishes FEN-loaded positions from move-0 of a normal game, preventing welcome messages, opening theory hints, and maxShow=20 from firing on complex positions.
- Dead code (`evaluateRisks`) removed from evaluation pipeline.
- X-Ray false positives eliminated (`blockers === 1` guard).
- Equal exchange filter: fair captures no longer trigger hanging piece warnings.

---

## v1.6.0 — The Engine Edition
**9,387 lines · 442 KB**

The biggest engine upgrade in the project's history. Search went from depth 6 to depth 10.

### New features
- **Late Move Reductions (LMR)** — quiet moves from index 3 onwards searched at reduced depth, re-searched on fail-high. Significant speed gain at depth 8+.
- **Null Move Pruning (NMP)** — R=2 for depth < 6, R=3 for depth ≥ 6. Skipped in check and near-endgame to avoid zugzwang errors.
- **Aspiration windows** — initial window ±max(50, |prevScore|×0.5) cp, exponential widening on fail, full-window fallback after 3 failed attempts.
- **Wise King / Rey Sabio level** — depth 10, 35-second time budget, zero intentional errors, zero noise. Training mode auto-disabled at this level.
- **50-move rule** — full implementation with `halfMoveClock`.
- **Threefold repetition detection** — 64-bit Zobrist position hashes, bilingual claim modal.
- **Insufficient material draws** — KK, KBK, KNK, KBKB same colour.
- **Game review mode** — post-game navigation through all moves.
- **Fullscreen button**.
- **Opening book expanded** — 29 → 48 positions.

### Bug fixes / improvements
- Engine evaluation unified between Worker and main-thread fallback (tapered king PST).
- `ttEvict()` introduced — removes shallow entries (depth ≤ 2) when the transposition table fills rather than clearing it entirely, preserving deep search results.

---

## v1.5.1 — Hotfix
**8,744 lines · 384 KB**

- Patch for commentary timing issues introduced in v1.5.0.
- Minor UI fixes for the new difficulty screen layout.

---

## v1.5.0 — The Difficulty Overhaul
**8,703 lines · 382 KB**

- **Wise King difficulty added** (later refined in v1.6.0 with full LMR/NMP/Aspiration).
- Difficulty screen redesigned with character portraits and ELO estimates displayed.
- Commentary style memory system to avoid repetition within recent moves.
- Professor context notes expanded with X-Ray detection and king safety warnings.

---

## v1.4.0 — The Search Upgrade
**8,470 lines · 366 KB**

- **Principal Variation Search (PVS)** — first move at full window; remaining moves at null window `[α, α+1]`, re-searched on fail-high.
- **Killer move heuristic** — quiet moves that caused beta cutoffs at current depth ordered before other quiet moves.
- **History heuristic** — depth² bonus for quiet moves that previously improved alpha.
- **`evaluateAdvancedFeatures`** — pawn structure (doubled, isolated, passed), bishop pair bonus, rook activity (open file, 7th rank), knight mobility, dynamic king safety (quadratic penalty). Active at Hard and Wise King.
- Professor "What should I do?" expanded with book validation pipeline.

---

## v1.3.0 — FEN Support
**7,467 lines · 316 KB**

- **FEN position loader** — players can type or paste any valid FEN string to start from an arbitrary position.
- Validation: checks piece placement, side to move, castling rights format, en passant square legality, and king count.
- Minor Professor improvements and commentary fixes.

---

## v1.2.0 — Stability Release
**7,466 lines · 319 KB**

- Hawk Eye (Ojo Halcón) visual threat scanner refined — deduplication of target squares, red/green arrow distinction.
- History time machine improvements (navigation buttons, scroll sync).
- Professor ¿Fue buena? / Was it good? verdict improvements.
- Various commentary text improvements.

---

## v1.1.1 — Time Machine & Hawk Eye
**7,350 lines · 315 KB**

- **History time machine** — ⏮ ◀ ▶ navigation buttons to review previous positions.
- **Hawk Eye (Ojo Halcón)** — visual threat scanner drawing arrows on the board. Red = your pieces in danger, green = free captures available.
- Improved Professor risk detection.

---

## v1.0.0 — Initial Release
**7,111 lines · 307 KB**

The first complete version. Already contained the full pedagogical stack.

- Full FIDE rules: legal move generation, check, checkmate, stalemate, en passant, castling with rights tracking, pawn promotion.
- Four difficulty levels: Easy (Chick), Medium (Student), Hard (Mage), with intentional mistake rates and evaluation noise.
- Web Worker AI with alpha-beta search, quiescence, transposition table.
- The Professor: Analysis, What should I do?, Was it good?, Hawk Eye (later), Training Mode with Spider Sense and move colour coding, blunder prevention.
- The Commentator with opening detection, Scholar's Mate recognition, Greek Gift, historical motifs, three style settings.
- Opening book (29 positions).
- Bilingual Spanish/English, auto-detected from browser.
- Five themes: Magic, Forest, Ocean, Classic, Fútbol.
- Character reactions on win/loss/draw.
- Advantage bar, captured pieces panel, move history.
- Web Audio API sound synthesis (no bundled audio files).
- Mobile-first responsive layout.

---

## How this was built

Designed and directed by **Aaron Vazquez Fraga**.  
Code written almost entirely by **Claude Sonnet** (Anthropic), **Gemini Pro** (Google), and **ChatGPT** (OpenAI).  
The ideas, the pedagogy, the product decisions, and the 1000+ test games came from a human who wanted a better way to teach his daughter chess.
