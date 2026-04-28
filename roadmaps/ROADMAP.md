# mChess Engine Roadmap

> Last updated: 2026-04-28  
> Active branch: `v2.24.x` | Production: `main` (v2.24.0) | Next release: `v2.25.0`  
> Rule: **one patch per version, 20-game tournament after each, never combine.**

---

## Current State

| Version | W | D | L | Score | ELO | Tournament | Status |
|---------|---|---|---|-------|-----|------------|--------|
| v2.22.5 | 0 | 9 | 11 | 27.5% | ~1732 | 20g SF-d7 | Legacy production baseline |
| v2.22.14 | 2 | 14 | 14 | 30.0% | ~1753 | 30g SF-d7 PC | Last depth-7 canonical run |
| v2.23.0 | 11 | 7 | 22 | 36.3% | ~1652 | 40g UCI-1750 @ 15s PC | Wizard-level calibration |
| v2.23.0 (ref) | 21 | 7 | 12 | 61.3% | ~1830 | 40g UCI-1750 @ 30s PC | **Wise King calibration (canonical)** |
| **v2.24.0** | — | — | — | — | ~1830 (est.) | No engine changes | ✅ **Production (main) — gamification release** |

**Calibration methodology (corrected from earlier versions of this document):**
- **Wizard (hard, 15s):** UCI_Elo 1750 @ 15s → ~1652 ELO. All Wizard-level tournaments use 15s.
- **Wise King (grandmaster, 30s):** UCI_Elo 1750 @ 30s → ~1830 ELO. All Wise King tournaments use 30s.
- PC only. Surface Pro is never used for canonical runs (thermal throttle kills NPS after game 3).

**Key finding from v2.23.0 tournament:** mChess scores 25% as White and 62.5% as Black — a 37.5-point disparity. The engine defends and counterattacks well but does not generate initiative as White. This is the dominant ELO gap and a primary target for Phase 5.

**Known real-world strength:** mChess on mobile beat Maia 1800 ELO (Chessis app, v2.23.0, back-rank mating combination in 23 moves). PC gameplay at 15s is stronger than tournament conditions (human think time = CPU rest, no Stockfish process running).

*v2.22.12 was 16/20 SP partial. v2.22.13 was 32/40 SP partial (Surface thermal throttled after 12h).*  
*v2.22.14 is the first complete 30g PC tournament — canonical machine for all future runs.*

---

## Phase 1 — COMPLETE ✅: Blunder Reduction (feat/v2.22.0 → merged as v2.23.0)

Goal: eliminate structural bugs causing piece giveaways. All patches applied and validated.

| Version | Patch | Status | Result |
|---------|-------|--------|--------|
| v2.22.11 | #11 — Extend filter to losing captures | ✅ Done | Loss rate fell from 65% to 37.5% |
| v2.22.12 | #4 — King Centralization Gate | ✅ Done | +132 ELO, marathon draws instead of fast mates |
| v2.22.13 | #9 — Repetition Blindness fix | ✅ Done | 266 root-rep firings confirmed; 12 rep draws in 32g |
| v2.22.14 | #14 — BLOCKED threshold 100→50cp | ✅ Done | **W2 D14 L14, 30.0%, ~1753 ELO** — first PC complete run; beats production |
| v2.22.15 | R7 — Rook on 7th rank bonus | ✅ Done | Tapered +40cp MG / +25cp EG — shipped as v2.23.0 |

### v2.22.14 — BLOCKED Threshold (done, 30g PC complete ✅)

Filter false positive confirmed in v2.22.13 G26: Nc6xe5 (SEE=-225, eval+8cp) was substituted because the delta (57–63cp) was below the 100cp BLOCKED gate. Threshold lowered to 50cp. FEN regression entries added to `fens_antiblunders.json`.

**30g PC tournament result:** W2 D14 L14 — **30.0% — ~1753 ELO [CI: 1620–1885]**  
First complete PC run. First wins vs Stockfish d7. Beats production baseline (27.5%, ~1732 ELO). No G26-type FPs observed. root-rep (Patch #9) confirmed still working. 5 short losses (≤31 moves) from flank attacks identified as Phase 5 opening book targets — not blocking release.

Full analysis: `pr_tournament_v2.22.14_analysis.md`

---

## Phase 2 — COMPLETE ✅: Production Release v2.23.0

Merged to `main` on 2026-04-23. All checklist items complete.

**Canonical engine baseline going into v2.24.x:**
- Wizard (15s): ~1652 ELO vs UCI_Elo 1750 @ 15s, 40g PC
- Wise King (30s): ~1830 ELO vs UCI_Elo 1750 @ 30s, 40g PC

---

## Phase 3 — COMPLETE ✅: Gamification (feat/the-statistician → merged as v2.24.0)

Statistician system, trophy cabinet, medals, profile stats, category scoring, and UI/UX improvements. No engine changes. Merged to `main` as v2.24.0.

**Engine ELO is unchanged from v2.23.0.** v2.24.0 is a gamification release only.

---

## Phase 4 — ACTIVE: Engine Speed Optimization (feat/v2.24.x)

**Goal:** Reduce Wise King think time below 30s while maintaining ≥1800 ELO and zero blunders.

**Baseline:** Wise King @ 30s → ~1830 ELO vs UCI_Elo 1750. Only 30 ELO of margin — changes must be precise.

**Priorities (in order):**
1. **Zero blunders** — a clean loss beats a piece giveaway for a 9-year-old
2. **ELO ≥ 1800** at Wise King level
3. **Reduce think time** below 30s

| Version | Patch | Risk | Pass Criterion |
|---------|-------|------|----------------|
| v2.24.1 | Opening Book — Sicilian as White | None | New ELO baseline ≥ 1830; fewer ≤35-move White losses |
| v2.24.2 | LMR Table Precompute | None | ELO holds ≥ baseline; NPS increase confirmed |
| v2.24.3 | Wise King 30s → 25s | Low | ELO ≥ 1800 @ 25s; if not, revert to 30s |

### Decision Tree

```
v2.24.1 Sicilian book → 20-game tournament → new ELO baseline
  └─ ELO improved? YES → v2.24.2: LMR precompute
                          └─ ELO holds? YES → v2.24.3: reduce to 25s
                                              └─ ELO ≥ 1800 @ 25s? YES → Phase 4 done
                                                                    NO  → Revert to 30s → Phase 4 done
                        NO  → Book had no measurable effect → v2.24.2 directly
```

### v2.24.1 — Opening Book: Sicilian as White

**What:** Add lines through move 8–10 for Alapin (2.c3), Closed Sicilian (2.Nc3 g3), or Grand Prix Attack (2.Nc3 f4).

**Why:** The 40-game tournament showed 4 consecutive White losses in Sicilian positions (G5, G7, G27, G31). The engine exits book and drifts passively — an opening preparation failure, not a depth failure. More time won't fix it. Fixing White play first raises the ELO baseline and gives more headroom for the time reduction steps that follow.

**Zero blunders impact:** G13 (29 moves) and G27 (31 moves) were opening-phase collapses. Book coverage directly targets early White defeats.

**Risk:** None — no engine code changed. Worst case: book moves are suboptimal (same outcome as today without them).

**Tournament:** 20 games vs UCI_Elo 1750 @ **30s** — needed to establish the new ELO baseline before time reduction work begins.

### v2.24.2 — LMR Table Precompute

**What:** Replace the inline `Math.log(depth) × Math.log(moveCount+1)` formula in the minimax inner loop with a `lmrTable[depth][moveCount]` array initialized once at worker startup.

**Why:** Every LMR-qualifying node currently pays 2 floating-point log calls. This is the most-called branch in the engine. A table lookup eliminates this cost at zero logic cost. Doing this after the book baseline means the NPS gain is measured cleanly and doesn't mix with the book effect.

**Risk:** None — no chess logic changed. Pure arithmetic optimization.

**Expected:** +5–10% NPS. 30s budget now searches as deep as ~33s did before.

**Tournament:** 20 games vs UCI_Elo 1750 @ **30s**.

### v2.24.3 — Wise King Time Reduction 30s → 25s

**What:** Drop `grandmaster.timeLimit` from 30000 → 25000 ms.

**Why:** With v2.24.1's stronger baseline and v2.24.2's NPS gain, 25s of faster search ≈ current 27.5s of depth. The stability exit, big-gap exit, and mate exit already terminate many games well before the ceiling — real average think time is lower than the maximum in most positions. A higher post-book ELO baseline may allow going more aggressively to 20s instead of 25s.

**Pass criterion:** ELO ≥ 1800 vs UCI_Elo 1750 @ 25s. If not reached → hold at 30s, stop time reduction work.

**Tournament:** 20 games vs UCI_Elo 1750 @ **25s** (or 20s if baseline permits).

---

## Phase 5 — Queued: White Side Improvement

**Unblock after Phase 4 completes.** Primary goal: close the White/Black color gap (25% White vs 62.5% Black). Target: White score to 35%+ without degrading Black score.

Same one-patch-per-version discipline. Wizard tournaments: UCI_Elo 1750 @ 15s. Wise King tournaments: UCI_Elo 1750 @ whatever Phase 4 sets.

| Patch | Description | Priority | Evidence |
|-------|-------------|----------|----------|
| Initiative bonus — White in opening | Small eval bonus for open/semi-open files aimed at enemy king in MG | Medium | Engine drifts passively as White without clear plan |
| Short-loss prevention | FEN regression tests on G13 (29 moves), G27 (31 moves), G38 (26 moves) | Medium | Pedagogical goal: reduce early collapses |
| Trapped piece penalty | −200cp for mob=0 on advanced pieces | Low | No tournament evidence yet |
| KR vs KB/KN draw recognition | Theoretical draw detection | Low | Low urgency |

---

## Phase 6 — Later: Opening Book Extension (Beyond Sicilian)

**After Phase 5.** Do not mix with eval patches.

**Priority target:** French Winawer 4.Qg4 line — appeared 3× in v2.22.12 tournaments (2 losses, 1 draw as Black). mChess misplays the opening because it doesn't recognise the positional demands of the Winawer structure.

**Rule:** only extend with unambiguous theoretical moves. A wrong book move fires every time — worse than letting the engine think.

**Validation:** FEN tests on the specific positions. No full 20-game tournament needed (book moves are deterministic).

---

## What is NOT on the Roadmap

| Item | Reason |
|------|--------|
| Bitwise move encoding | High refactor risk — defer to a future v3.0 rewrite |
| 0x88 board representation | Negligible JS benefit (V8 already optimizes Int8Array bounds) |
| Time below 25s | Math does not support ≥1800 ELO without a larger NPS leap than LMR alone provides |
| Eval changes during Phase 4 | Must isolate variables — one change per version |

---

## Key Numbers

| Metric | Value |
|--------|-------|
| **Production version** | **v2.24.0 (main)** |
| **Engine baseline** | **v2.23.0 — no engine changes in v2.24.0** |
| Wizard ELO (15s) | ~1652 vs UCI_Elo 1750 — canonical Wizard reference |
| Wise King ELO (30s) | ~1830 vs UCI_Elo 1750 — canonical Wise King reference |
| Phase 4 ELO target | ≥1800 at Wise King after time reduction |
| White score (v2.23.0) | **25.0%** — primary improvement target (Phase 5) |
| Black score (v2.23.0) | **62.5%** — engine strength is reactive |
| PC search depth (15s budget) | d9–d12 per move (85–95k NPS in tournament) |
| PC search depth (30s budget) | d11–d13 per move (76–90k NPS in tournament) |
| Real gameplay NPS estimate | 90–110k (human think time = CPU rest, no SF process) |
| Surface Pro | Never use for canonical tournaments |
| Maia 1800 cleared | Yes (mobile, v2.23.0, back-rank mating combination in 23 moves) |
| Tournament methodology (Wizard) | UCI_Elo 1750 @ 15s, PC |
| Tournament methodology (Wise King) | UCI_Elo 1750 @ 30s, PC |
| Skill Level ELO references | Lv3=1729 \| Lv4=1953 \| Lv5=2197 \| Lv7=2518 (source: stockfish-wiki FAQ) |
