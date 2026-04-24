# mChess Engine Roadmap

> Last updated: 2026-04-21  
> Active branch: `feat/v2.22.0` | Production: `main` (v2.22.5, ~1732 ELO)  
> Rule: **one patch per version, 20-game tournament after each, never combine.**

---

## Current State

| Version | W | D | L | Score | ELO | Tournament | Status |
|---------|---|---|---|-------|-----|------------|--------|
| v2.22.5 | 0 | 9 | 11 | 27.5% | ~1732 | 20g SF-d7 | Legacy production baseline |
| v2.22.14 | 2 | 14 | 14 | 30.0% | ~1753 | 30g SF-d7 PC | Last depth-7 canonical run |
| **v2.23.0** | **11** | **7** | **22** | **36.3%** | **~1652** | **40g UCI-1750 @ 15s PC** | ✅ **Production (main) — canonical baseline** |
| v2.23.0 (ref) | 21 | 7 | 12 | 61.3% | ~1830 | 40g UCI-1750 @ 30s PC | ⚠️ 2× budget — reference only |

**All future tournaments: 15s time limit, UCI_Elo 1750, PC only.**  
The 15s limit matches the game's actual `aiTimeLimit: 15000`. The 30s result is kept for historical context only.

**Key finding from v2.23.0 tournament:** mChess scores 25% as White and 62.5% as Black — a 37.5-point disparity. The engine defends and counterattacks well but does not generate initiative as White. This is the dominant ELO gap and the primary target for v2.24.x.

**Known real-world strength:** mChess on mobile beat Maia 1800 ELO (Chessis app, v2.23.0, back-rank mating combination in 23 moves). PC gameplay at 15s is stronger than tournament conditions (human think time = CPU rest, no Stockfish process running).

*v2.22.12 was 16/20 SP partial. v2.22.13 was 32/40 SP partial (Surface thermal throttled after 12h).*  
*v2.22.14 is the first complete 30g PC tournament — canonical machine for all future runs.*

**Surface warmup data (v2.22.15, 2026-04-21, informational only):**
- Depth-7 (6g): W0 D5 L1 = 41.7% — 5 draws, strong defensive play
- UCI Elo 1900 (5g partial): W2 D0 L3 = 40.0% — 2 clean checkmate wins
- Combined estimate: ~1830 ELO (wide CI, Surface run, not canonical)

**Known real-world strength:** mChess on mobile already beat Maia 1900 ELO (Chessis app, previous version, 15s/move). v2.22.14 PC tournament confirmed W2 D14 L14 (30%) vs SF-d7, including two checkmate wins — the first wins in a complete PC tournament run.

> **ELO methodology note:** Tournaments run to date used `go depth 7` (depth-limited), whose ELO is *estimated* (~1900), not officially calibrated. Starting with the v2.22.15 tournament, `arena_tournament.js` supports `UCI_Elo` mode (official calibrated ELO) and `Skill Level` mode (0–20, with deliberate errors). The **canonical release tournament uses `UCI_Elo 1800`** — surface warmup data suggests mChess is ~1830, making 1800 the closest to 50% expected score (tightest CI).

---

## Phase 1 — COMPLETE ✅: Blunder Reduction (feat/v2.22.0 → merged as v2.23.0)

Goal: eliminate structural bugs causing piece giveaways. All patches applied and validated.

| Version | Patch | Status | Result |
|---------|-------|--------|--------|
| v2.22.11 | #11 — Extend filter to losing captures | ✅ Done | Loss rate fell from 65% to 37.5% |
| v2.22.12 | #4 — King Centralization Gate | ✅ Done | +132 ELO, marathon draws instead of fast mates |
| v2.22.13 | #9 — Repetition Blindness fix | ✅ Done | 266 root-rep firings confirmed; 12 rep draws in 32g |
| v2.22.14 | #14 — BLOCKED threshold 100→50cp | ✅ Done | **W2 D14 L14, 30.0%, ~1753 ELO** — first PC complete run; beats production |
| **v2.22.15** | **R7 — Rook on 7th rank bonus** | **✅ Applied** | Tapered +40cp MG / +25cp EG — tournament pending |
| v2.22.16 | #15 — Rep acceptance threshold -500→-300cp | Optional | Low risk; apply after v2.22.15 if log shows refused draws |

### v2.22.14 — BLOCKED Threshold (done, 30g PC complete ✅)

Filter false positive confirmed in v2.22.13 G26: Nc6xe5 (SEE=-225, eval+8cp) was substituted because the delta (57–63cp) was below the 100cp BLOCKED gate. Threshold lowered to 50cp. FEN regression entries added to `fens_antiblunders.json`.

**30g PC tournament result:** W2 D14 L14 — **30.0% — ~1753 ELO [CI: 1620–1885]**  
First complete PC run. First wins vs Stockfish d7. Beats production baseline (27.5%, ~1732 ELO). No G26-type FPs observed. root-rep (Patch #9) confirmed still working. 5 short losses (≤31 moves) from flank attacks identified as Phase 5 opening book targets — not blocking release.

Full analysis: `pr_tournament_v2.22.14_analysis.md`

### v2.22.15 — Rook on 7th Rank

Standard positional bonus (+40cp MG / +25cp EG) for a rook on the 7th rank. Ceiling-lift — engine currently earns no bonus for this strong placement. Code drafted in `pr_v2.22.6_patches.md`.

---

## Phase 2 — COMPLETE ✅: Production Release v2.23.0

Merged to `main` on 2026-04-23. All checklist items complete.

**Canonical baseline going into v2.24.x:** ~1652 ELO vs UCI_Elo 1750 @ 15s, 40g PC.  
**Target for v2.24.0 release:** ≥45% score vs UCI_Elo 1750 @ 15s (~1720 ELO). Realistic if White score improves from 25% to 35%+.

---

## Phase 3 — Active: White Side Improvement (feat/v2.24.x)

**Primary goal:** Close the White/Black color gap (currently 25% White vs 62.5% Black). Target: bring White score to 35%+ without degrading Black score.

Same one-patch-per-version discipline, 15s tournaments only.

| Patch | Description | Priority | Evidence |
|-------|-------------|----------|----------|
| Opening book — Sicilian as White | Add lines through move 8–10 for Alapin (2.c3), Closed Sicilian (2.Nc3 g3), or Grand Prix Attack (2.Nc3 f4) | **HIGH** | G5, G7, G27, G31 all White Sicilian losses |
| Initiative bonus — White in opening | Small eval bonus for open/semi-open files aimed at enemy king in MG | Medium | Structural gap — engine drifts passively as White |
| Short-loss prevention | FEN regression tests on G13 (29 moves), G27 (31 moves), G38 (26 moves) | Medium | Pedagogical goal: reduce early collapses |
| TP | Trapped piece penalty (−200cp for mob=0 on advanced pieces) | Low | No tournament evidence yet |
| #7 | KR vs KB/KN theoretical draw recognition | Low | Low urgency |

---

## Phase 4 — Post-Release: UI / Coach / Commentator + ELO Gauntlet

**Start after v2.23.0 is stable on main.**

### Track 1: UI / Coach / Commentator improvements

- Coach brain sync sessions A→D (see gap analysis in conversation — rook files, mobility, passed pawns, endgame)
  - No version bumps for coach-only changes (Option A agreed)
  - One final version bump for all coach work combined
- UI rename: **Monolith Chess → Airin Chess** (Aaron + Irene; AI+RIN)
- Commentator improvements from easy/medium Surface game data
- All changes committed to feat branch, no engine change, no tournament needed

### Track 2: ELO Gauntlet (run in parallel during the week)

**Run on desktop** (no thermal throttle, peak search depth). Script already ready.

| Opponent | Command | Why |
|----------|---------|-----|
| UCI Elo 1600 | `--sf-mode uci_elo --sf-value 1600` | Lower bound confirmation |
| UCI Elo 1750 | `--sf-mode uci_elo --sf-value 1750` | Previous canonical target |
| UCI Elo 1800 | `--sf-mode uci_elo --sf-value 1800` | Release ELO ± 50 |
| UCI Elo 1900 | `--sf-mode uci_elo --sf-value 1900` | Upper bound |
| Skill Level 3 | `--sf-mode skill_level --sf-value 3` | Human-error comparison (1729 ELO) |
| Skill Level 4 | `--sf-mode skill_level --sf-value 4` | Human-error comparison (1953 ELO) |

Run 20g per level → full ELO ladder. Surface warmup already suggests ~1830 so ladder around 1700–1950.

**Known floor:** mChess already beat Maia 1900 (mobile, previous version). Gauntlet should confirm PC ceiling.

### Tournament script changes — ✅ Done (2026-04-21)
- ✅ Multi-opponent mode (cycle through UCI_Elo / Skill Level / depth in one run)
- ✅ Stockfish Skill Level support (0–20 with official ELO table)
- ✅ Stockfish UCI_Elo support (direct official calibrated ELO, 1320–3190)
- ✅ Interactive menu updated — 3-option mode selector
- ✅ Batch CLI updated — `--sf-mode uci_elo --sf-value 1800`
- ⏳ Maia engine integration — post-release Phase 4
- ⏳ Rating ladder summary report — post-release Phase 4

---

## Phase 5 — Opening Book Extension

**After v2.23.0 ships.** Do not mix with eval patches.

**Priority target:** French Winawer 4.Qg4 line — appeared 3× in v2.22.12 tournaments (2 losses, 1 draw as Black). mChess misplays the opening because it doesn't recognise the positional demands of the Winawer structure.

**Rule:** only extend with unambiguous theoretical moves. A wrong book move fires every time — worse than letting the engine think.

**Validation:** FEN tests on the specific positions. No full 20-game tournament needed (book moves are deterministic).

---

## Reference Run

**Pending:** User will play a single normal game in a fresh browser session and share the console log — to measure real search depth vs thermally-throttled tournament depth.

**Before that game:** add `d:${finalDepth}` to the `📊` log line in the worker so the depth is visible.

---

## Key Numbers

| Metric | Value |
|--------|-------|
| **Production version** | **v2.23.0 (main)** |
| **Canonical ELO baseline** | **~1652 vs UCI_Elo 1750 @ 15s, 40g PC** |
| Canonical ELO CI | [1542–1762] |
| Canonical score | 36.3% (11W 7D 22L) |
| White score (v2.23.0) | **25.0%** — primary improvement target |
| Black score (v2.23.0) | **62.5%** — engine strength is reactive |
| Reference result (30s, non-canonical) | ~1830 ELO, 61.3% — 2× real budget |
| PC search depth (15s budget, grandmaster) | d9–d12 per move (85–95k NPS in tournament) |
| Real gameplay NPS estimate | 90–110k (human think time = CPU rest, no SF process) |
| Surface Pro | Never use for canonical tournaments — thermal throttle kills NPS |
| Maia 1800 cleared | Yes (mobile, v2.23.0, back-rank mating combination) |
| Tournament methodology | **`UCI_Elo N` @ 15s** — official ELO, real budget. Depth-7 is legacy only. |
| Skill Level ELO references | Lv3=1729 \| Lv4=1953 \| Lv5=2197 \| Lv7=2518 (source: stockfish-wiki FAQ) |
| Target for v2.24.0 release | ≥45% vs UCI_Elo 1750 @ 15s (~1720 ELO) |
