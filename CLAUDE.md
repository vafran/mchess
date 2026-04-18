# mChess (Monolith Chess) — Project Reference

> **AI Context Document** — Keep this file updated as the engine evolves.  
> Current version: **v2.22.10** (branch `feat/v2.22.0`) | `main` has v2.22.5 | File: `mChess.html` (~16,500 lines, ~860 KB)  
> The entire project is a **single self-contained HTML file**. No build step, no npm, no bundler.

---

## Project Overview

**Monolith Chess** is a browser-based chess game with a pedagogical focus. It teaches chess to beginners through a coach ("Profesor"), a dynamic commentator, and context-aware opening recognition. The strongest AI level ("Wise King / Rey Sabio") is competitive (~1600–1700 ELO vs Stockfish at depth 7).

- **Language:** Spanish (default) / English, toggled at runtime
- **Architecture:** Single HTML file — CSS + JS all inline
- **Repo:** `c:\Users\aaron\OneDrive\Documentos\mChess-public\`
- **Tested via:** `file:///` protocol directly in browser. No server required.

---

## File Structure

```
mChess-public/
├── mChess.html              ← ENTIRE GAME (~860 KB, ~16,500 lines)
├── index.html               ← Redirect shim only
├── README.md / README_es.md ← Public-facing docs (EN/ES)
├── CLAUDE.md                ← THIS FILE (AI context document)
├── pesto_tables.md          ← PeSTO PST values reference
├── low_diff_levels.md       ← Design notes for Easy/Medium difficulty tuning
├── stockfish.exe            ← Stockfish binary (Windows, ~111 MB) for arena tests
└── stockfish_tests/
    ├── arena.js                    ← Single-game test runner (Node + Puppeteer)
    ├── arena_tournament.js         ← 20-game tournament runner
    ├── analyze_results.js          ← Post-tournament ELO/blunder analysis
    ├── pedagogical_audit.js        ← Coach quality audit script
    ├── fens_all_blunders.json      ← Known blunder FENs for regression tests
    ├── fens_antiblunders.json      ← Positions where engine MUST NOT blunder
    ├── fens_endgames.json          ← Endgame test suite
    ├── fens_sacrificios_apertura.json ← Opening sacrifice regression tests
    ├── tournament_mChess_v*_d7_*g_*.json      ← Tournament results (timestamped)
    ├── tournament_mChess_v*_d7_*g_*_verbose_*.log ← Full verbose diagnostics log
    └── mChess_v*.html              ← Historical snapshots for A/B comparison
```

**Analysis / planning files** (gitignored via `pr_*.md`):
```
pr_v2.22.6_patches.md        ← Patch backlog with code, risk, status
pr_tournament_v*.md          ← Per-tournament analysis docs
```

---

## High-Level Architecture: How the Subsystems Interact

```
┌─────────────────────────────────────────────────────────────┐
│                         BROWSER TAB                         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  MAIN THREAD                         │   │
│  │                                                      │   │
│  │  Global Game State ←─────────────────────────────┐   │   │
│  │  (board, turn, castleRights, etc.)               │   │   │
│  │         │                                        │   │   │
│  │  onCellClick() ─► makeMove() ─► triggerAI() ─┐  │   │   │
│  │                        │           │          │  │   │   │
│  │             updatePositionHashes   │          │  │   │   │
│  │             addCommentaryEntry     │    engineSearch()    │
│  │             checkGameOver          │          │  │   │   │
│  │             render / UI updates    │          ▼  │   │   │
│  │                                   │   postMessage() ──►  │
│  └───────────────────────────────────│────────────────┘   │ │
│                                      │         │           │ │
│  ┌───────────────────────────────────│─────────▼─────────┐ │ │
│  │               WEB WORKER          │                   │ │ │
│  │  (isolated JS context, no DOM)    │                   │ │ │
│  │                                   │  minimax / IDA   │ │ │
│  │  ◄── postMessage({action:'search'}) ◄────────────── │ │ │
│  │  ──► postMessage({action:'bestSoFar'})              │ │ │
│  │  ──► postMessage({action:'result'})                 │ │ │
│  └─────────────────────────────────────────────────────┘ │ │
└─────────────────────────────────────────────────────────────┘
```

---

## Global State Variables (Main Thread)

All variables live in the main script closure. The worker receives copies via `postMessage`.

| Variable | Type | Purpose |
|----------|------|---------|
| `board` | `string[8][8]` | Live char board. Uppercase=White, lowercase=Black, `' '`=empty |
| `turn` | `'w'`/`'b'` | Whose turn it is |
| `playerColor` | `'w'`/`'b'` | Human player's color |
| `gameMode` | `'pvp'`/`'ai'` | Two-player or vs AI |
| `currentDifficulty` | `string` | `'easy'`, `'medium'`, `'hard'`, `'grandmaster'` |
| `aiDepth` | `number` | Search depth sent to worker (set by `DIFF_SETTINGS`) |
| `aiTimeLimit` | `number` | Time budget in ms sent to worker |
| `castleRights` | `{K,Q,k,q:bool}` | Castling availability |
| `enPassantTarget` | `[row,col]\|null` | En-passant target square |
| `halfMoveClock` | `number` | 50-move rule counter |
| `positionHashes` | `string[]` | Serialized position strings for 3-fold repetition |
| `history` | `string[]` | SAN move list (e.g. `['e4','e5','Nf3']`) |
| `undoStack` | `object[]` | Full snapshots pushed on each `makeMove()` |
| `capturedByWhite` | `string[]` | Piece chars captured by White |
| `capturedByBlack` | `string[]` | Piece chars captured by Black |
| `lastFrom` / `lastTo` | `[r,c]\|null` | Last move squares for highlighting |
| `animating` | `bool` | Blocks re-entrant `makeMove()` during animation |
| `aiThinking` | `bool` | Prevents concurrent AI triggers |
| `isViewingHistory` | `bool` | History replay mode active |
| `chessEngineWorker` | `Worker\|null` | The live Web Worker instance |
| `currentLanguage` | `'es'`/`'en'` | UI language |
| `commentaryLog` | `object[]` | Array of {html, time, tone} commentary entries |
| `commentaryStyleLevel` | `0\|1\|2` | Commentator persona: 0=serious, 1=mixed, 2=funny |
| `trainingModeEnabled` | `bool` | Training mode (blunder interception) on/off |
| `aiSearchGeneration` | `number` | Monotonically increasing token; stale AI results are discarded |
| `_currentEngineDone` | `function\|null` | Callback to instantly unblock the current `engineSearch` Promise |

### Snapshot Variables (on `window`)

Three snapshots are taken during human moves for the coach's "Was it good?" analysis:

| Variable | Set when | Contains |
|----------|----------|----------|
| `window.snapshotBeforeHumanMove` | Click resolves to a legal move (line 4791) | Deep copy of `board` before the move |
| `window.snapshotBeforeRules` | Same click (line 4794) | `{castleRights, enPassantTarget, turn}` at click time |
| `window.snapshotAfterHumanMove` | After `makeMove()` completes — only human moves (line 5067) | Deep copy of `board` after the move |

All three are cleared on `init()`, `undoMove()`, and FEN load.

---

## Difficulty Settings (~line 3373)

```javascript
const DIFF_SETTINGS = {
  easy:        { depth: 2,  mistakes: 0.50, timeLimit: 500   },
  medium:      { depth: 4,  mistakes: 0.20, timeLimit: 1500  },
  hard:        { depth: 7,  mistakes: 0,    timeLimit: 6000  },
  grandmaster: { depth: 30, mistakes: 0,    timeLimit: 15000 },
};
```

- `depth:30` for grandmaster is a ceiling — the real cap is the time budget (15 s)
- `mistakes`: probability of playing a random legal move instead of the best one
- Undo is **disabled on Hard** level (see `undoMove()` at line 5315)
- The Professor/Coach is **disabled on Grandmaster** level

---

## Piece Representation

### Main thread (char board)
`'P','N','B','R','Q','K'` = White; `'p','n','b','r','q','k'` = Black; `' '` = empty  
Values: `PIECE_VALUES = { P:100, N:315, B:330, R:510, Q:885, K:20000 }` (~line 3383)

### Worker (Int8Array, 64 elements, row-major)
```
Bit layout:  [color bit 3] | [piece type bits 0-2]
White: WP=1, WN=2, WB=3, WR=4, WQ=5, WK=6
Black: BP=9, BN=10, BB=11, BR=12, BQ=13, BK=14
Empty = 0
```
Values: `PV = { P:100, N:325, B:335, R:500, Q:900, K:20000 }` (~line 9219 of worker blob)

> ⚠️ **Known discrepancy**: Main thread and worker use different piece values (N:315 vs 325, R:510 vs 500, etc.). Intentional — main thread values are used only for coach/UI SEE. Worker values drive all actual game play.

---

## Complete Game Flow

### 1. Startup

```
DOMContentLoaded → init()
  ├─ Read localStorage (language, theme, commentary style, training mode)
  ├─ Reset all global state (board, turn, castleRights, undoStack, etc.)
  ├─ Clear snapshots (snapshotBefore/After/Rules)
  ├─ setLanguage() → I18N strings, rebuildCommentaryForLanguage()
  ├─ render() → draws board
  └─ [if player is Black in AI mode] → setTimeout(triggerAI, 500)
```

### 2. Human Move

```
onCellClick(r, c)
  ├─ Guard: AI thinking? → return
  ├─ Guard: History view? → exitHistoryView()
  ├─ If piece already selected AND (r,c) is a legal target:
  │    ├─ Save window.snapshotBeforeHumanMove = deepCopy(board)
  │    ├─ Save window.snapshotBeforeRules = {castleRights, enPassantTarget, turn}
  │    ├─ [Training mode] → check for blunder → possibly BLOCK and show warning
  │    └─ await makeMove(sr, sc, r, c)
  │         ├─ Push full state snapshot to undoStack
  │         ├─ Handle castling (move rook too)
  │         ├─ board[sr][sc]=' ', board[tr][tc]=piece (update BEFORE animation)
  │         ├─ await animateMove() (CSS transition)
  │         ├─ Handle en-passant pawn removal
  │         ├─ Handle promotion (modal for human, auto-Queen for AI)
  │         ├─ Update castleRights (K/Q/R moves and captures)
  │         ├─ Update enPassantTarget (double pawn push only)
  │         ├─ Save window.snapshotAfterHumanMove = deepCopy(board)  ← human only
  │         ├─ Toggle turn, push positionHash, update halfMoveClock
  │         ├─ Play sound + particles
  │         ├─ addCommentaryEntry()
  │         ├─ checkGameOver() → show banner if mate/stalemate/draw
  │         └─ [if AI mode and it's AI's turn] → triggerAI()
  │
  └─ If piece selected is own piece → highlight legal moves → render()
```

### 3. AI Move

```
triggerAI()
  ├─ Guard: not AI turn, or aiThinking, or no legal moves → return
  ├─ aiThinking = true, show thinking bar + countdown
  ├─ await 250-600ms (human-feel delay)
  ├─ Check opening book:
  │    ├─ Build historyKey = history.join(',') with +/# stripped
  │    ├─ Look up OPENING_BOOK[historyKey]
  │    ├─ Filter to valid legal moves
  │    ├─ Grandmaster: 10% exploration chance (skip book from move 5+)
  │    └─ forcedBookMove = chosen entry (or null)
  ├─ engineSearch(aiColor, aiDepth, 1, aiTimeLimit, forcedBookMove)
  │    ├─ Create/reuse Web Worker
  │    ├─ postMessage({action:'search', board, turn, castleRights, enPassantTarget,
  │    │               depth, timeout, positionHashes, forcedMove, halfMoveClock})
  │    ├─ Worker sends bestSoFar messages during search (handled live — not used for move)
  │    └─ Worker sends result → Promise resolves with [{move, score}]
  ├─ Pick best move from result[0].move
  ├─ await makeMove(fr, fc, tr, tc, promo) ← same function as human moves
  ├─ aiThinking = false
  └─ [checkGameOver inside makeMove]
```

### 4. Race Condition Protection

- `aiSearchGeneration` increments on `init()`. Worker results arriving after a restart are silently discarded.
- `_currentEngineDone` allows `init()` to instantly resolve any dangling `engineSearch` Promise, preventing ghost AI moves on the new game.
- `makeMoveGeneration` increments on `init()`. If a promo modal was open when the game restarted, the modal's `await promptPromotion()` detects the generation mismatch and aborts.

---

## Undo System

`undoStack` (array of full state snapshots) is the source of truth.

```
makeMove() → undoStack.push({board, turn, castleRights, enPassantTarget,
                              history, moveNumber, capturedBy*, lastFrom,
                              lastTo, halfMoveClock, positionHashes})
```

`undoMove()`:
- In AI mode: pops **2** entries (undo AI move + human move)
- In PvP mode: pops **1** entry
- Restores all state from the snapshot
- Clears all three `window.snapshot*` variables
- Resets Professor panel, rebuilds commentary
- Undo is disabled on `hard` level

---

## History Replay (Hawk's Eye)

Press back/forward arrows in the move list:

- `isViewingHistory = true` while browsing
- `currentViewPly` tracks which ply is displayed
- The board is rendered from `undoStack[n].board` without modifying global state
- `exitHistoryView()` restores the live board and clears the flag
- Any `makeMove()` or `undoMove()` call automatically exits history view first

---

## Position Hashing (Repetition Detection)

After every `makeMove()`, a hash string is pushed to `positionHashes`:

```javascript
posHash = board.map(r => r.join('')).join('|') + '|' + nextColor
        + '|' + castleString    // e.g. "KQkq"
        + '|ep' + epFile;       // e.g. "ep4" (only if EP available)
```

This array is passed to the worker on each search. The worker rebuilds both:
- `gameHashCount` (Map: stringHash → count) — used at root for repetition scoring
- `historyCount` (Map: Zobrist XOR-fold → count) — fast lookup inside minimax

---

## Persistence (localStorage)

| Key | Content |
|-----|---------|
| `mchess_saved_game` | Full game state JSON (restored on next visit) |
| `mchess_theme` | Theme name string |
| `te_commentary_style_level` | `'0'`, `'1'`, or `'2'` |
| `mchess_language` | `'es'` or `'en'` |
| `mchess_training_mode` | `'0'` or `'1'` |
| `professor_discard_log` | Coach audit log (dev only) |

`saveGameState()` is called after every move in AI mode (auto-save). `loadSavedGame()` is called on startup to offer game resumption.

---

## Translation System (i18n)

All UI strings are in the `I18N` object (~line 3423):

```javascript
const I18N = {
  es: { thinking: '🤖 Pensando', turnWhite: 'Turno: ⬜ Blancas', ... },
  en: { thinking: '🤖 Thinking', turnWhite: 'Turn: ⬜ White',    ... }
};
function t(key) { return I18N[currentLanguage === 'en' ? 'en' : 'es'][key] || key; }
```

**Language toggle**: button calls `currentLanguage = lang; setLanguage(lang)` which:
1. Updates all static DOM text via I18N
2. Calls `rebuildCommentaryForLanguage()` — re-generates all commentary entries in the new language using the stored `history` array
3. Persists to `localStorage`

**Adding a string**: add the key to BOTH `es:` and `en:` blocks. Reference via `t('yourKey')`. Never hardcode UI strings.

---

## Commentary System

`addCommentaryEntry(move, moveHistory)` is called after every `makeMove()`.

**Data flow:**
```
makeMove() → addCommentaryEntry()
  ├─ Detect opening: OPENING_BOOK lookup → named opening? → "Defensa Francesa..."
  ├─ Detect castling → castle comment
  ├─ Detect check/capture/promotion → tactical comment
  ├─ Build tone-aware comment string (commentaryStyleLevel 0/1/2)
  ├─ commentaryLog.unshift({html, time, tone})  ← newest first
  ├─ Trim to max 15 entries
  └─ Re-render the commentary panel
```

**Key aspects:**
- `commentaryStyleLevel`: 0=serious, 1=mixed, 2=funny — affects which comment templates are chosen
- `commentaryLog` stores rendered HTML, not raw text
- `rebuildCommentaryForLanguage()` empties the log and re-runs `addCommentaryEntry` for each move in `history`, preserving original timestamps
- Commentary never calls the engine — it is purely observation-based (no AI analysis)
- On undo, `rebuildCommentaryForLanguage()` is called to trim the log to the new game length

---

## Professor (Coach) System

Three buttons in the Professor tab:

| Button | Function called | What it does |
|--------|----------------|-------------|
| 🔍 Análisis | `analyzePosition()` | Evaluates current position with main-thread engine (depth 4-8) |
| 🎯 ¿Qué hago? | `askWhatShouldIDo()` | Suggests best move using `findGoodMoveOptionsFor()` |
| 💡 ¿Fue buena? | `analyzeLastMove()` | Reviews the last human move for blunders/missed wins |

**`analyzeLastMove()` detail** (the most complex):
1. Checks `window.snapshotBefore/AfterHumanMove` — aborts if null
2. Detects `humanMove` from board diff via `detectLastMoveFromBoards()`
3. Restores past state using `window.snapshotBeforeRules` (temporal desync fix)
4. Evaluates: `getImmediateHangingAfterMove()`, `getImmediateReplyRisk()`, `getMoveRiskLevel()`
5. If a missed win is detected: fires `engineSearch()` asynchronously at depth 6 to find the better move, patches the DOM when the result arrives (non-blocking)
6. Draws arrows on the board showing threats or missed moves
7. Restores all global state in a `finally` block (guaranteed cleanup)

**Professor availability:**
- Disabled at Grandmaster level
- `analyzePosition()` uses depth 4 (easy/medium/hard) or 8 (grandmaster-but-professor-off)
- Uses **main-thread engine** (`findBestMoveFor`, `evaluateBoard`) — NOT the worker

---

## Training Mode

When `trainingModeEnabled = true`, the click handler intercepts potential blunders **before** `makeMove()`:

1. Simulate the proposed move on a copy of the board
2. Check for **suicide**: moving piece lands on an undefended square attacked by cheaper piece
3. Check for **discovered threat**: moving piece reveals an attack on another own piece that was safe before
4. If blunder detected:
   - First warning: block the move, show explanation, draw attack arrow → `return`
   - Second click of same move: `window.pendingBlunder` matches → allow anyway (player insists)
5. Safe move: clear `window.pendingBlunder`

Training mode state is persisted to `localStorage`.

---

## Opening Book

`OPENING_BOOK` is a JS object keyed by comma-separated SAN history (with `+`/`#` stripped):

```javascript
"e4,e5,Nf3,Nc6,Bb5": [
  { m: "a6",  w: 10 },  // Ruy Lopez Morphy
  { m: "Nf6", w: 5  },  // Berlin
]
```

**Book usage rules:**
- Easy: no book
- Medium: first 4 half-moves only
- Hard / Grandmaster: always use book
- Grandmaster: 10% exploration chance from move 5+ onwards (skips book randomly)
- When a book move is chosen, it's sent as `forcedMove` to the worker, which narrows root moves to just that one and deepens it (fills TT with that line's continuations)

**Opening detection for commentary** uses the same `OPENING_BOOK` keys — it finds the longest matching prefix in history to name the opening.

---

## FEN Loader

`loadFenPosition(fenString)`:
1. Parses FEN: piece placement, active color, castling rights, en-passant, half-move clock, full-move number
2. Sets `board`, `turn`, `castleRights`, `enPassantTarget`, `halfMoveClock`, `moveNumber`
3. Sets `fenPositionLoaded = true` (suppresses auto-save until first move is played)
4. Clears `positionHashes`, snapshots, undo stack
5. If it's AI's turn, fires `triggerAI()` after 800ms delay

`sqToRc(sq)` converts algebraic notation (e.g. `'e4'`) to `[row, col]` where row 0 = rank 8.

---

## Rendering

`render()` (~line 4088):
- Iterates all 64 squares
- Applies piece unicode via `PIECES` map
- Applies CSS classes: `selected`, `legal-move`, `last-from`, `last-to`, `in-check` (king square)
- Respects `window.currentAnimList` — flying pieces during animation are rendered differently
- Board flip (`boardFlipped`) is handled via CSS class on the board element

`updateAdvantageBar()` (~line 4183):
- Calls `evaluateBoard(board, 'hard')` synchronously on the main thread
- Updates the visual bar (a thin vertical slider next to the board)
- Runs after every move

---

## AI Architecture: Two Engines

### 1. Worker Engine (plays all actual game moves)

Created by `createEngineWorker()`. The entire worker code is a JS string embedded in a `Blob`, instantiated as a `Web Worker`.

**Worker state object:**
```javascript
{
  board: Int8Array(64),       // row-major, see piece codes above
  turn: 'w'|'b',
  castleRights: { K, Q, k, q },
  enPassantTarget: [row, col] | null,
  wKing: [row, col],          // king position cache (updated by makeMove)
  bKing: [row, col],
  hashL: uint32,              // Zobrist hash low 32 bits
  hashH: uint32,              // Zobrist hash high 32 bits
  halfMoveClock: number
}
```

**Full search feature list:**
| Feature | Details |
|---------|---------|
| Iterative deepening | d=1 to maxDepth |
| Aspiration windows | ±50cp, 3 retry attempts, full-window failsafe |
| Root alpha-beta cutoff | `if (multiPV===1 && alpha>=beta) break` (**v2.25.30**) |
| PVS | Correct null windows: `[alpha,alpha+1]` maximizing / `[beta-1,beta]` minimizing |
| LMR | `R = 0.77 + ln(depth)·ln(moveCount+1)/2.36`, reduced for high-history moves |
| LMP | Depth≤3 quiet moves: limits 8/15/25; disabled in endgame (≤4 major/minor pieces) |
| NMP | Adaptive R, zugzwang-guarded (requires ≥1 major/minor piece) |
| RFP | Depth≤3, 120cp/ply margin |
| Futility Pruning | Depth≤2, margins [0, 175, 350]cp |
| IID | Depth≥4 with no hash move: search at depth-2 to fill TT |
| Check extensions | +1 ply if move gives check |
| Pawn extensions | +1 ply for advanced pawns (ranks 2-3/6-7) at depth≤4 |
| TT | Flat `Int32Array`, 64-bit Zobrist keys, 5-slot entries, EXACT protection |
| Killers | 2 per depth, reset each search |
| History | `Int32Array(64*64)`, aged by `>>=1` each search (**v2.25.30**, was zeroed) |
| Countermove | Per (from,to) pair, reset each search |
| SEE | Used in quiescence pruning and root anti-blunder filter |
| Root anti-blunder | Post-search: replace top move if SEE < -100 on quiet move |
| bestSoFar | Sent after each completed depth iteration |
| Soft deadline | Don't start new depth if >75% budget used |
| EBF brake | Predict next depth cost via EBF factor (4.5); skip if it won't fit |
| Stability exit | Stop if same move + score stable within 20cp for 3 consecutive depths |
| Big-gap exit | Stop if best move leads 2nd by >200cp at depth≥6 |
| Mate exit | Stop at depth≥5 if |score| > 90000 (verified mate) |

**Key worker function locations (approximate — shift slightly with edits):**
| Function | Line (~) | Purpose |
|----------|----------|---------|
| `minimax` | 11272 | Main alpha-beta search |
| `quiesce` | 11169 | Quiescence search |
| `evaluate` | 9219 | Tapered eval (PeSTO + extensions) |
| `see` | 9482 | Static Exchange Evaluation |
| `legalMoves` | 8810 | Legal move generation |
| `makeMove` | 9050 | In-place move (returns save object) |
| `unmakeMove` | 9120 | Restore board from save object |
| `computeZobFull` | 9170 | Full Zobrist hash recomputation |
| `moveScore` | 9540 | Move ordering score |
| `onmessage` / root loop | 11580 | Worker entry point + iterative deepening |

### 2. Main-Thread Engine (coach/sync fallback only)

Used by: Professor/Coach analysis, `findBestMoveFor()`, `evaluateBoard()`, sync fallback if Worker fails.  
**Does NOT play actual game moves.**

Key differences vs worker:
- Uses char `board[8][8]` not `Int8Array`
- Different piece values (`PIECE_VALUES`: 315/330/510/885)
- Simpler eval: no tapered PeSTO, no pawn structure, no Clock of Fear, no Material Anchor
- No IID, no Countermove heuristic
- TT hash = `side + board.flat().join('')` (omits castling/EP — known limitation, coach only)
- PVS and NMP bugs fixed after v2.25.30 (PVS null windows corrected, NMP returns score not beta)

---

## Evaluation Function (Worker, ~1200 lines)

Tapered between middlegame (mg) and endgame (eg) phases.

**Phase:** `eg = 1 - clamp(materialCount / maxMaterial, 0, 1)`

**Major terms:**
| Term | Notes |
|------|-------|
| PeSTO PST | MG/EG piece-square tables, tapered |
| Material | Raw piece count difference |
| Mobility | Sliding piece move counts |
| King safety | S-curve penalty, capped ±150cp |
| Pawn structure | Isolated, doubled, backward pawns |
| Passed pawns | Tarrasch bonus, King escort |
| Rule of Square | Passed pawn promotion race vs enemy king |
| Bad bishop | Penalty for bishops blocked by own pawns |
| Rook on open/semi-open file | Positional bonus |
| Minor piece activity | Outpost detection, centralization |
| King centralization | Endgame only — per-piece + global (counts twice, ~161cp max — known) |
| Hanging piece penalty | SEE-based (see SEE section) |
| Simplification incentive | Trade pieces when ahead by >150cp |
| Clock of Fear | Anti-shuffling: scales eval toward 0 as HMC >20 (hmc=80 → ×0.5) |
| Narrow Material Anchor | Clamps eval when down >200cp with eg<0.30 (prevents phantom comp.) |

> ⚠️ **Known eval noise**: King centralization counted twice (up to 161cp). Passed pawns counted in 3 places. Fixing redundancy is lower priority.

---

## SEE (Static Exchange Evaluation)

Two independent implementations:
- **Main thread SEE** (~line 3392): operates on `string[8][8]`, uses `PIECE_VALUES` (315/330/510/885)
- **Worker SEE** (~line 9482): operates on `Int8Array(64)`, uses `PV_I` array (325/335/500/900)

Algorithm: simulate all captures on a target square (cheapest attacker first), negate alternately, propagate backwards (negamax), return net gain.

Worker SEE is used in:
- Quiescence search: skip losing captures (attacker value > victim value AND SEE < 0)
- Delta pruning: skip captures that can't raise alpha even with 250cp margin
- Root anti-blunder filter: replace top move if quiet move has SEE < -50

---

## Repetition Detection

**Two parallel systems — both must agree:**

1. **Main thread** (`positionHashes`): string array, built after every `makeMove()`. Includes board, color, castling, EP. Checked before triggering AI.

2. **Worker internal** (`gameHashCount` + `historyCount` + `searchSet`):
   - `gameHashCount`: Map(stringHash → count) from `positionHashes` passed in message
   - `historyCount`: Map(Zobrist XOR-fold → count) for fast lookup
   - `searchSet`: Set of XOR-folds on the current search path (in-search repetitions)
   - Root: `reps ≥ 2` → score = -9000 (avoid), unless losing badly (`score < -500`)
   - Root `reps === 1` → score = -20 (mild deterrent against king shuffles)

---

## Testing Infrastructure

```bash
cd stockfish_tests
node arena_tournament.js --batch --depth 7 --games 20   # batch mode (no prompts), saves JSON
node arena_tournament.js --batch --depth 7 --games 30   # longer run for overnight
node analyze_results.js     # ELO estimate + blunder stats
node arena.js --fen "..." --color w --depth 7   # single FEN test
```

Requires: Node.js, Puppeteer, `stockfish.exe` in `stockfish_tests/`.  
Output: `tournament_mChess_<version>_d7_<N>g.json` (version auto-detected from HTML title tag)

> **Workflow note:** The user runs tournaments manually — do NOT launch `arena_tournament.js` as a background task. After committing a change, tell the user the version is ready and they will run it themselves. Never run or suggest running the tournament without the user explicitly starting it.

### Tournament ELO History (20 games, SF depth-7, JS blunder detector)

| Version | Result vs SF-1900 | Est. ELO | "Winning" evals | Notes |
|---------|-------------------|----------|-----------------|-------|
| v2.21.0 | **2W 15L 3D** | **~1631** | — | Only version with 2 wins; filter was dead code |
| v2.22.0 | 0W 24L 16D | ~1659 | — | Bigger book; book-exit SEE filter caused deviations every game |
| v2.22.1 | 0W 10L 7D | ~1665 | — | Book-exit filter removed; anti-blunder filter still dead code |
| v2.22.2 | **1W 11L 8D** | **~1709** | — | Anti-blunder filter dead code fixed; first win since v2.21.0 |
| v2.24.2 | 0W 14L 6D | ~1609 | — | Regression from v2.21 |
| v2.25.12 | 0W 13L 7D | ~1631 | — | Same ELO as v2.21 but no wins |
| v2.22.5 | **0W 9L 11D** | **~1732** | **20%** | ✅ **Production baseline (main)** — Rule of Square phantom active; accidental fighting spirit |
| v2.22.6 | 0W 12L 8D | ~1659 | 19% | Phantom fixed; ELO drop from removing phantom confidence |
| v2.22.7 | 0W 12L 8D | ~1659 | 18% | BLOCKED(mate) gate + SEE threshold −200 |
| v2.22.9 | 0W 13L 7D | ~1631 | 14% | PASS_DANGER base 80→25cp; marathon draws; 2 filter FPs |
| v2.22.10 | 0W 9L 5D (14g) | ~1635* | 17% | BLOCKED(worse) + 🔁 diagnostic; repetition blindness ×3 confirmed |

*v2.22.10 partial — 14/20 games complete.

**"Winning" evals** = % of moves where engine evaluates its own position as >+50cp. Correlates directly with score — higher % → more active play → more draws. v2.22.5's 20% was phantom-driven. Target for v2.23.0: reach 20%+ legitimately via eval improvements.

**Primary metric: blunders per game** (especially opening blunders). A clean loss beats a draw with piece giveaways — the game is for a 9-year-old.

**Revised patch roadmap (post v2.22.10 analysis):**
1. **v2.22.11** — Patch #11: extend filter to losing captures (floor fix)
2. **v2.22.12** — Patch #4: King Centralization Gate (ceiling lift — endgame activity)
3. **v2.22.13** — Bishop pair bonus (ceiling lift — open position advantage recognition)
4. **v2.22.14** — Patch #9: Repetition blindness fix (convert blind draws to real results)
5. **v2.22.15** — Rook on 7th rank (ceiling lift)
Goal: get "winning eval %" from 17% to 20%+ legitimately before merging to main as **v2.23.0**.

---

## Engine Patch Development Workflow

**This is the mandatory process for every engine change. No exceptions.**

### The Rule
> **ONE patch per version. Commit. Tournament. Analyze. Decide. Repeat.**
> Never combine two engine changes in one version. If the ELO drops, you cannot isolate the cause.

### Full Cycle (step by step)

**Step 1 — Implement the patch**
- Read the target code section before touching anything
- Make the smallest possible change that addresses the root cause
- Bump version in **4 places** in `mChess.html`: `<!--` comment, `<title>`, button text, `console.log`
- Verify the diff is clean — only the intended change, nothing else

**Step 1.5 — Run FEN regression tests (before committing)**

Check `pr_v2.22.6_patches.md` for the `FEN tests:` line on the current patch. Run each listed position:
```bash
node arena.js --fen "<FEN>" --color <w/b> --depth 7
```
- The targeted FEN must now pass its `pass_criterion` (patch fixes the known-bad position)
- Any `fens_antiblunders.json` positions for adjacent patches must still pass (no regressions)

If the targeted FEN still fails after the patch, diagnose before committing — the fix is incomplete.

**Step 2 — Commit to feat branch**
```bash
git add mChess.html
git commit -m "feat: vX.X.X — <one-line description of the patch>"
```
Branch is always `feat/v2.22.0`. Never commit to `main`.

**Step 3 — User runs the tournament**
```bash
cd stockfish_tests
node arena_tournament.js --batch --depth 7 --games 20
```
This produces two files:
- `tournament_mChess_vX.X.X_d7_20g_<timestamp>.json` — results + PGNs
- `tournament_mChess_vX.X.X_d7_20g_<timestamp>_verbose_<timestamp>.log` — full diagnostics

Do NOT start the tournament yourself. Tell the user the version is ready.

**Fail-fast: when to abort mid-tournament**

Stop and fix only if you observe a **code-provable correctness failure** in the first 2–5 games. Outcome noise (early losses) is never a reason to abort.

Abort if you see any of these in the verbose log:

| Signal | Example | What it means |
|--------|---------|----------------|
| Eval phantom: identical top3 scores with \|score\| > 150cp AND no material justification | `a1-b1:630 c2-d3:630 h7-h5:630` | Eval term producing a constant; position differences invisible |
| Filter catastrophe: filter fired, then mChess was immediately mated | `FILTER→Ke2` followed by checkmate in 2 | BLOCKED(mate) gate broken or filter injecting a losing move |
| Illegal or impossible move sent | Move lands on own piece or off-board square | Race condition or move generation regression |
| A targeted diagnostic log line fires unexpectedly | A `console.warn` added to confirm a fix fires on move 1 | The regression the log was designed to detect is present |

**Do NOT abort for:**
- First 2–5 games are all losses — normal variance at any ELO
- Identical top3 scores at magnitudes < 150cp — this is **PVS null-window behavior** (non-PV moves display alpha as their score) and is present in every version; it does not mean the engine is choosing randomly
- A single blunder of a known unpatched type (e.g., losing capture bypassing the SEE filter) — finish the tournament and measure frequency
- A game running 300+ moves — the engine may be defending well, not stuck

**The rule:** fail-fast requires a *code-provable* failure you can trace to a specific wrong value in the log. If you cannot do that, finish the tournament.

**Step 4 — Analyze the tournament (thorough)**

When the user says the tournament is done (or shares intermediate data), analyze **both** files:

*From the JSON:*
- Final score: W/L/D, ELO estimate, CI
- Per-game: color, result, reason, move count, opening (first 5 moves of PGN)
- Final moves of each game (last 8 PGN tokens) — to identify mating sequences, repetitions

*From the verbose log:*
- Phantom detection: grep `top3:` lines where top-1 score is ≥150 or ≤-150 AND all three moves show identical scores
- **True phantom signature**: multiple *different* moves with *identical* scores > 150cp absolute = evaluation dominated by a constant term (an eval bug)
- **Not a phantom**: identical scores < 150cp = normal PVS null-window behavior (non-PV moves display alpha; engine still plays the correct PV move)
- Filter activations: grep `FILTER→` — note SEE value, original score, substitute score, think time
- Game boundaries: `=== Game N/20 ===` markers
- Forced moves: `[dforced/30]` at 0.0s = only one legal move, expected in cornered-king endgames

**Step 5 — Create the analysis document**

Create `pr_tournament_vX.X.X_analysis.md` (gitignored). Structure:
1. Header with game count, files, patch applied
2. Scoreboard table: `# | Color | Plies | Moves | Result | Reason | Opening | Phantom? | Filter?`
3. Patch validation section — did it work? any side effects?
4. New findings — unexpected patterns discovered in this tournament
5. Per-game deep dives for: losses, games with phantom activity, unusual draws
6. Filter analysis table (all activations, verdict: correct / false positive / ambiguous)
7. Comparison table vs previous version
8. Implications for patch plan + revised priority order

**Step 6 — Update the patch backlog**

Update `pr_v2.22.6_patches.md`:
- Mark applied patch as ✅ APPLIED
- Add any new bugs discovered (new patch entries with code location, fix, risk)
- Reorder the STATUS table by new priority (based on tournament evidence, not theory)
- Update version targets

**Step 7 — Assess verbose log coverage**

After completing the analysis, ask: *does the current log give us everything we need to diagnose the next patch?*

- If the next patch requires confirming a root cause that isn't visible in the existing log (e.g., a repetition hash mismatch, a specific eval term dominating, a search condition not firing), **add the targeted diagnostic log line now** — before the next tournament. The cost of a wasted tournament run because the log didn't capture what we needed is high.
- Keep additions targeted and low-noise: one `console.log` per hypothesis, only fires in the rare case (not every move). Never add per-node or per-depth logging.
- If the existing log already covers the next patch's diagnostic needs, skip this step.

**Step 7.5 — Add FEN entries for newly discovered bugs**

When the tournament reveals a new reproducible failure (a blunder played, a win converted to draw, a filter misfiring), extract the FEN from the verbose log and add it to the appropriate file:
- Blunder played → `fens_all_blunders.json`
- Filter should fire but didn't (or vice versa) → `fens_antiblunders.json`
- Won/drawn endgame mishandled → `fens_endgames.json`

Each entry needs: `fen`, `side`, `description`, `bug` (patch #), `bad_move`, `pass_criterion`, `source`.
The FEN must be extractable from the verbose log's `Received FEN request:` line immediately before the bad move's `📊` line.

**Step 8 — Decide next patch and repeat**

Choose the highest-priority patch from the backlog that has:
- Clear evidence from tournament data
- A well-understood fix
- Low risk of regressions

Then go back to Step 1.

---

### Verbose Log Diagnostic Reference

The `📊` line logged after each AI move:
```
[HH:MM:SS.mmm] 📊 [w/b] top3:[mv1:score/see:N mv2:score mv3:score] FILTER→mv / clean t:Xms
```

| Field | Meaning |
|-------|---------|
| `[w/b]` | Side to move |
| `mv:score` | Move in algebraic + eval from current player's perspective |
| `/see:N` | Static Exchange Evaluation of top move (quiet moves only) |
| `/capt` | Top move is a capture (no SEE shown) |
| `FILTER→mv` | Anti-blunder filter fired, substituted this move |
| `clean` | No filter substitution |
| `t:Xms` | Total search time for this move |

**Phantom signatures to watch for:**
- `score ≥ 590` or `score ≤ -590` on a quiet move = phantom evaluation (eval dominated by a constant term, not real material)
- Multiple different moves with **identical** scores (e.g., `a1-b1:630 c2-d3:630 h7-h5:630`) = definitive phantom — the constant dominates all positional differences
- Scores escalating in lockstep across consecutive moves = passed pawn phantom building up

**Known phantom sources (as of v2.22.6):**
- ~~Broken Rule of Square in pawn loop~~ → **FIXED in v2.22.6**
- `PASS_DANGER` term (~-600cp for opponent's passed pawn) → visible in G4/G5 of v2.22.6 tournament; shows as negative identical scores

**Filter false positive indicators:**
- SEE = -165 = rook-for-bishop exchange sacrifice (R=500, B=335, 500-335=165) — valid chess
- SEE = -325 = knight sacrifice — valid in many positions
- SEE = -335 = bishop sacrifice — valid in many positions
- A false positive is confirmed when: substitute scores WORSE than original, or game outcome didn't improve
- Current threshold: SEE < -100 triggers filter; proposed upgrade: SEE < -200 (avoids exchange sac FPs)

---

### What Claude Must Never Do

- **Never implement two patches in one version**, even if both seem trivial
- **Never start a tournament** — the user runs it manually
- **Never commit to `main`** — always `feat/v2.22.0`
- **Never implement a patch while a tournament is running** — wait for all 20 games
- **Never trust Gemini/external analysis blindly** — verify every code location and proposed change against the actual `mChess.html` source before implementing
- **Never skip the analysis doc** — every tournament gets a `pr_tournament_v*.md`

---

## Known Issues & Technical Debt

| Issue | Severity | Status |
|-------|----------|--------|
| `applyMove` deep copy at root (should use makeMove/unmakeMove) | Medium | Open |
| LMP does O(64) piece scan per move inside inner loop | Low-Medium | Open |
| King centralization counted twice in evaluate | Low | Open |
| Passed pawn bonus in 3 separate places | Low | Open |
| Clock of Fear may hurt quiet-move endgame plans | Low | Monitor |
| RFP at depth ≤ 3 with no endgame exclusion | Low | Monitor |
| Main-thread TT hash omits castling/EP | Low | Known, coach only |

---

## How-To Guides

### Add a New Evaluation Term (Worker)
1. Add inside `function evaluate(state)` in the worker blob (search `function evaluate`)
2. Keep **additive to `s`** (White positive, Black negative)
3. Test with a FEN from `fens_all_blunders.json`
4. Run `arena_tournament.js` (20 games) to confirm no ELO drop

### Add Opening Book Lines
```javascript
"e4,e5,Nf3,Nc6,Bb5": [       // ALL moves from start, SAN, no +/#
  { m: "a6",  w: 10 },        // Ruy Lopez Morphy — high weight
  { m: "Nf6", w: 5  },        // Berlin — medium weight
],
```

### Add a UI String
1. Find `const I18N = {` (~line 3423)
2. Add key to **both** `es:` and `en:` blocks
3. Reference via `t('yourKey')` (uses `currentLanguage`)

### Run a FEN Regression Test

FEN test suites live in `stockfish_tests/fens_*.json`. Each file targets a specific class of bug:

| File | Purpose |
|------|---------|
| `fens_all_blunders.json` | Positions where a known blunder was played — engine must NOT repeat it |
| `fens_antiblunders.json` | Positions where filter must fire correctly (or must NOT fire incorrectly) |
| `fens_endgames.json` | Endgame positions where engine must win/draw correctly |

Run a single FEN:
```bash
node arena.js --fen "<FEN from file>" --color <w/b> --depth 7
```

Each entry has a `bad_move` (what the engine incorrectly does now) and a `pass_criterion` (what it must do after the fix). Check the verbose output for the `📊` filter log line to confirm the filter fired or didn't fire as expected.

**When to run:** before committing a patch (quick sanity check, ~1 min per FEN) and after the 20-game tournament (confirm no regressions on the targeted positions).

---

## Version Numbering

`v2.MINOR.PATCH` — updated manually in the `<title>` tag and 3 other occurrences in the HTML.

**Convention (enforced going forward from v2.23.0):**
- **`v2.X.0`** = production release — the only versions that live on `main`. When a dev cycle is ready to ship, bump the minor version and reset patch to 0 before the PR.
- **`v2.X.Y` (Y > 0)** = development iterations on the feat branch, and hotfixes applied directly to `main` for critical bugs found in production.
- At a glance: `.0` = production, anything else = dev/hotfix.

Example cycle: dev iterates `v2.22.1 → v2.22.2 → … → v2.22.7` on the feat branch. When ready to ship, the PR bumps to **`v2.23.0`** and merges to `main`. The next dev cycle starts at `v2.23.1`.

> Note: `main` currently holds `v2.22.5` (pre-convention, merged via PR #6). The next merge to main will be `v2.23.0`.

**Current branching strategy (strictly enforced):**
- `main` = last tournament-validated version only (currently v2.22.5)
- `feat/v2.22.0` = active development branch (currently at v2.22.10)
- Every engine change gets its own version bump + 20-game tournament before merging to main
- **Never commit engine changes directly to main**
- Merge to `main` only after a full 20-game tournament shows no ELO regression
- **Before opening a PR to `main` (production release):**
  1. Run a 40-game tournament on the candidate version:
     ```bash
     node arena_tournament.js --batch --depth 7 --games 40
     ```
     The 20-game tournament is for patch validation during development. The 40-game run is required for production sign-off — wider confidence interval, more reliable ELO estimate, catches variance-sensitive regressions that 20 games can miss.
  2. Update `README.md` and `README_es.md` — add a "What's new in vX.X.X" section and bump the footer version.
  3. Update `docs/CHANGELOG.md` and `docs/CHANGELOG_es.md` — add a new version entry at the top.
  All four files must be updated before the PR is opened. Never open a PR to `main` with stale docs.

**v2.22.5** is the current production version on `main` (~1732 ELO, 27.5% vs SF-d7). It is the baseline to beat before merging v2.23.0. Note: its high score is partly driven by a Rule of Square phantom (accidental "fighting spirit"); the dev target is to exceed it with legitimate eval improvements.

**v2.21.0** is stored at `stockfish_tests/mChessv2.21.0.html` for historical reference. It had 2 wins vs SF depth-7 (also with dead-code filter and phantom evals active).

**Active patch backlog:** `pr_v2.22.6_patches.md` (gitignored) — one-line-per-patch status table, full code + rationale for each.
