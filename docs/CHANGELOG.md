# Changelog — Monolith Chess

All notable changes to this project are documented here.  
Format: version · size · what changed.

[Go to README.md](../README.md)

---

## v2.0.0 — The Professor's Edition
**11,593 lines · 570 KB**

The engine did not change. The teaching did. This release rebuilt the pedagogical layer from scratch.

### New features
- **Opening theory in the Professor** — Analysis and What should I do? now name the opening you are in and show how many theoretical continuations remain available. Works even when the exact move sequence is not stored as a book key.
- **Opening book expanded** — 48 → 97 positions, 140 → 274 entries. New coverage: French Defence (Winawer, Tarrasch, Advance, Exchange), Scandinavian, Caro-Kann (Classical, Karpov, Advance), English Opening (Symmetrical, Anglo-Indian, Four Knights), Nimzo-Indian (Rubinstein, Classical, Sämisch), Grünfeld, Queen's Indian, Benoni, Reti with all black responses, extended London System.
- **Training Library** — 36 curated positions in three tabs (Openings, Tactics, Endgames) accessible from the main menu. Each position has a name and a one-line task description in both languages.
- **100 random challenge FENs** — drawn from real game databases spanning Sicilian middlegames, Ruy López structures, Indian defences, and endgames.
- **Training button on main menu** — no longer buried in Options.
- **FEN loader mode selector** — the Training modal now lets you choose mode (2 Players / vs AI) and difficulty before loading any position, avoiding the multi-step menu dance.
- **About modal** — version, author, licence, and AI attribution, fully theme-aware.

### Bugs fixed
- **Checkmate in 1 now shows exactly one move** — the pedagogical guarantee was incorrectly forcing a second irrelevant option even when the game was already won. Mate-first sort added; filter truncates to one on mate.
- **Commentary level 0 (Serious) was unselectable** — `parseInt("0") || 1` evaluates to `1` because `0` is falsy in JavaScript. Fixed with explicit `isNaN` check.
- **Slider labels now visible** — Serious / Mixed / Playful labels appear under both commentary sliders.
- **Victory confetti fires only when the human wins** — in AI mode confetti previously fired on both outcomes.
- **`simulateMove` now handles castling** — it moved the King but left the Rook on its original square. The Professor was evaluating king safety and detecting mates incorrectly after any castling move.
- **History time machine + tap on board** — tapping the board while reviewing history now snaps back to the present gracefully before processing the click.
- **AI zombie move** — if the game was restarted while the AI was thinking, its move would land on the new board. Fixed with a `startPly` snapshot guard in `triggerAI`.
- **Undo while in history view** — `undoMove` now calls `exitHistoryView()` first, preventing the rocket 🚀 button from staying stuck on screen.
- **Hawk Eye and Professor highlight timers** — rapid double-clicks launched overlapping `setTimeout` calls; the earlier timer would expire and wipe the arrows requested by the later click. Fixed with `clearTimeout` guards.
- **FEN load state leak** — loading a FEN mid-game now correctly clears `positionHashes`, `halfMoveClock`, `moveNumber`, and all three snapshot variables. Previously the 50-move rule and threefold repetition could fire mid-puzzle using data from the previous game.
- **`snapshotBeforeRules` was orphaned outside `undoMove`** — placed after the closing brace by accident, meaning it never ran on undo.
- **Profitable Trade Guarantee** — the Professor could suggest moves that saved one piece while abandoning a different piece that was already hanging. Added injection of free/profitable captures into the move list, and an Abandoned Piece Penalty applied consistently across all three Professor code paths (renderProfessorOptions, requestBestMove, continueProfessorSearch).
- **"Queen Snob" bug** — the capture injection logic rejected any capture where the target was worth less than the attacking piece before checking if it was free. A Queen could not capture a free Knight because `30 < 90` triggered an early return before `safeAfter` was evaluated.
- **203 lines of dead code removed** — a large fallback block inside `continueProfessorSearch` was unreachable because `engineSearch()` returns a Promise whose errors are caught by `.catch()`. The `return` after setting up the Promise made everything below it dead. Function reduced from 230 to 28 lines.
- **`updateVsAiButton` hardcoded Spanish** — the function wrote `'🤖 vs IA'` directly instead of calling `t('btnVsAi')`, so the main menu button never translated to English.
- **Thinking bar moved to top** — was a floating pill at the bottom that caused layout shifts on mobile. Now a fixed banner at the top of the viewport with a running progress animation.

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
