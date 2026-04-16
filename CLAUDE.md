# mChess (Monolith Chess) — Project Reference

> **AI Context Document** — Keep this file updated as the engine evolves.  
> Current version: **v2.22.5** (branch `feat/v2.22.0`) | `main` has v2.22.2 | File: `mChess.html` (~16,496 lines, ~860 KB)  
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
    ├── tournament_mChess_d7_20g_v.2.25.12.json ← Latest full tournament result
    └── mChess_v*.html              ← Historical snapshots for A/B comparison
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
| Root anti-blunder | Post-search: replace top move if SEE < -50 on quiet move |
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

> **Workflow note:** The user runs tournaments manually — do NOT launch `arena_tournament.js` as a background task. After committing a change, just tell the user the version is ready and they will run it themselves.

### Tournament ELO History (20 games, SF depth-7, JS blunder detector)

| Version | Result vs SF-1900 | Est. ELO | Blunders | Notes |
|---------|-------------------|----------|----------|-------|
| v2.21.0 | **2W 15L 3D** | **~1631** | 12 (0.60/g), 5 opening | ✅ **Stable baseline** — only version with wins |
| v2.22.0 | 0W 24L 16D | ~1659 | 13 (0.33/g, 40 games) | Bigger book; book-exit SEE filter caused deviations every game |
| v2.22.1 | 0W 10L 7D | ~1665 | 10 (0.59/g) | Book-exit filter removed; anti-blunder filter still dead code |
| v2.22.2 | **1W 11L 8D** | **~1709** | 5 (0.25/g), 1 opening | ✅ **Best result** — anti-blunder filter dead code fixed; first win since v2.21.0 |
| v2.24.2 | 0W 14L 6D | ~1609 | 16 (0.80/g), 6 opening | Regression from v2.21 |
| v2.25.12 | 0W 13L 7D | ~1631 | 14 (0.70/g), 1 opening | Same ELO as v2.21 but no wins; 1 opening blunder due to bigger book |

**Primary metric: blunders per game** (especially opening blunders). A clean loss beats a draw with piece giveaways — the game is for a 9-year-old.

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

### Run a Regression Test
```bash
node arena.js --fen "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3" --color w --depth 7
```

---

## Version Numbering

`v2.MAJOR.MINOR` — updated manually in the `<title>` tag and 3 other occurrences in the HTML.

**Current branching strategy (strictly enforced):**
- `main` = last tournament-validated version only (currently v2.24.1; v2.22.0 pending overnight test)
- `feat/v2.22.0` = active development branch (v2.21.0 engine + bigger opening book + UI fixes)
- Every engine change gets its own branch + 20-game tournament before merging to main
- **Never commit engine changes directly to main**

**v2.21.0** is the stable baseline stored at `stockfish_tests/mChessv2.21.0.html`. It is the only version that consistently wins real games vs SF depth-7.
