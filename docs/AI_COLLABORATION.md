# AI Collaboration Notes

This document records a small subset of quality assurance dialogue between Claude Sonnet and Gemini Pro during the development of Monolith Chess v2.0.0. It is an honest account of how AI-assisted development actually looked in practice — including disagreements, corrections, and the cases where one model caught a bug the other had introduced.

[Go to README.md](../README.md)

---

## How it worked

Aaron directed the project. Claude wrote the bulk of the code. Gemini ran periodic code reviews and bug hunts, submitting findings as structured reports. Aaron would then relay those reports to Claude for verification and application. Neither model could see the other's work directly — Aaron was the relay.

The process looked like this:

```
Aaron → Claude (write feature X)
Aaron → Gemini (review the file)
Gemini → Aaron (bug report)
Aaron → Claude (verify and apply)
Claude → Aaron (fixed file)
```

---

## The QA Rounds

### Round 1 — State hygiene
Gemini flagged that `loadPositionFromFEN()` was not resetting `positionHashes`, `halfMoveClock`, or `moveNumber`. If a player loaded a FEN puzzle after a long game, the 50-move rule could fire mid-puzzle using data from the previous game.

**Verdict:** Real bug, confirmed in the file, applied.

---

### Round 2 — The frozen `simulateMove`

Gemini identified that `simulateMove` — a function used by the Professor to evaluate future positions — moved the King during castling but left the Rook on its original square. This meant the Professor was evaluating king safety and detecting checkmates incorrectly for any position that involved castling.

Claude had used `simulateMove` extensively throughout the Professor system (mate-in-1 scanner, hanging piece detection, Profitable Trade Guarantee). All of those were affected.

**Verdict:** Real bug, confirmed. Three lines added:

```javascript
if (piece.toUpperCase() === 'K' && Math.abs(m.tc - m.fc) === 2) {
  if (m.tc === 6) { copy[m.fr][5] = copy[m.fr][7]; copy[m.fr][7] = ' '; }
  else            { copy[m.fr][3] = copy[m.fr][0]; copy[m.fr][0] = ' '; }
}
```

---

### Round 3 — The orphaned line

Gemini found that `window.snapshotBeforeRules = null` was sitting on a line *after* the closing brace of `undoMove()` — outside the function entirely. It had been placed there during an earlier refactor and was never running when undo was called.

Claude had written the snapshot system. Claude had also introduced the bug by misplacing that line.

**Verdict:** Real bug, confirmed at line 4729 vs closing brace at 4728. Moved inside.

---

### Round 4 — "Split brain" synchronisation

When Claude implemented the Abandoned Piece Penalty (to stop the Professor suggesting moves that escaped with one piece while abandoning another already-hanging piece), it applied the logic to `renderProfessorOptions` but not to `requestBestMove` or `continueProfessorSearch`. Gemini caught this.

Gemini's exact note: *"Claude designed a fantastic solution but forgot to teach it to one half of the Professor's brain."*

**Verdict:** Real gap, confirmed. The penalty was missing from two of the three code paths.

---

### Round 5 — The "Queen Snob"

The Profitable Trade Guarantee injected free captures that the engine had ranked below defensive moves. But the injection logic contained a flawed early return:

```javascript
if (tgtVal < myVal) return; // reject if target worth less than attacker
```

This rejected a Queen capturing a free Knight (30 < 90) before ever checking whether the square was safe. Gemini named this the "Queen Snob" bug.

**Verdict:** Real bug, confirmed. The fix: compute `safeAfter` first, then only skip if neither safe nor profitable.

---

### Round 6 — 203 lines of dead code

Gemini identified that `continueProfessorSearch` contained a large fallback block (approximately 200 lines) inside a `catch(err)` clause that was mathematically unreachable:

```javascript
try {
  engineSearch(...).then(...).catch(...);
  return; // ← JS executes this immediately
} catch (err) {
  // 200 lines here — NEVER REACHED
  // Promises catch their own errors via .catch()
}
```

**Verdict:** Real architectural flaw, confirmed. Function reduced from 230 to 28 lines.

---

### Round 7 — Async race conditions

Gemini described two timing bugs that only occur when a user acts during an async operation:

1. **AI Zombie Move** — restarting the game while the AI was calculating. The Worker's Promise resolved after the reset and called `makeMove()` on the new board, corrupting the new game.

2. **Undo while in history view** — pressing Undo while reviewing past moves left `isViewingHistory = true`, keeping the rocket 🚀 button visible and the app believing the player was still in the past.

Gemini noted that Claude had protected the Professor from the equivalent problem (using a `snapPly` guard in `requestBestMove`) but had not applied the same pattern to `triggerAI`.

**Verdict:** Both confirmed. Guards added to `init()`, `triggerAI`, and `undoMove`.

---

## What worked

**Gemini's methodology was disciplined.** Every finding included the exact line number, the problematic code, a diagnosis, and a proposed fix. There were no false positives in the later rounds. When Gemini said a bug existed, it existed.

**Claude's verification habit mattered.** Before applying any fix, the code was checked to confirm the bug was present. In at least one instance across the sessions, a report described a bug that had already been fixed in a previous round, which would have introduced a regression if applied blindly.

**The relay structure helped.** Because Aaron was reading both reports and applying fixes sequentially, there was a natural review step. Neither model could accidentally overwrite the other's work.

---

## What didn't work

**Version drift was a real problem.** The project had multiple HTML files in circulation at once. On at least two occasions a bug report turned out to describe a version that was one or two patches behind the current working file. The lesson: always verify the file hash or line count before running a review.

**Claude introduced several of the bugs it later fixed.** The orphaned snapshot line, the split-brain penalty, the Queen Snob logic, the dead code block — all were Claude's own mistakes, caught by Gemini. This is not surprising (the codebase grew to ~12,000 lines of dense JavaScript in a single file), but worth noting honestly.

---

## Summary

| Round | Found by | Bug | Real? |
|---|---|---|---|
| 1 | Gemini | FEN load didn't reset 50-move clock | ✅ |
| 1 | Gemini | `vs IA` button hardcoded, didn't translate | ✅ |
| 2 | Gemini | `simulateMove` didn't move the Rook on castling | ✅ |
| 3 | Gemini | `snapshotBeforeRules` outside `undoMove` | ✅ |
| 3 | Gemini | FEN load didn't clear snapshot variables | ✅ |
| 4 | Gemini | Abandoned Piece Penalty missing from 2 of 3 Professor paths | ✅ |
| 5 | Gemini | Queen Snob — early return before safety check | ✅ |
| 6 | Gemini | 203 lines of unreachable dead code | ✅ |
| 7 | Gemini | AI zombie move on game restart | ✅ |
| 7 | Gemini | Undo while in history view left UI stuck | ✅ |

10 bugs found. 10 confirmed. 10 fixed.
