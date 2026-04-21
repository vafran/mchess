# mChess Engine Roadmap

> Last updated: 2026-04-21  
> Active branch: `feat/v2.22.0` | Production: `main` (v2.22.5, ~1732 ELO)  
> Rule: **one patch per version, 20-game tournament after each, never combine.**

---

## Current State

| Version | W | D | L | Score | ELO | Status |
|---------|---|---|---|-------|-----|--------|
| v2.22.5 | 0 | 9 | 11 | 27.5% | ~1732 | Production (main) — baseline to beat |
| v2.22.11 | 0 | 7 | 13 | 17.5% | ~1631 | Filter extended to captures |
| v2.22.12 | 0 | 10 | 6 | **31.3%*** | **~1763*** | King Centralization Gate — best score yet |
| v2.22.13 | 0 | 16 | 16 | 25.0% | ~1709 | Repetition blindness fix — 32/40g SP partial |
| v2.22.14 | 2 | 14 | 14 | 30.0% | ~1753 | BLOCKED threshold 100→50cp — 30g PC complete ✅ |
| **v2.22.15** | **—** | **—** | **—** | **pending** | **pending** | **Rook on 7th rank — PC tournament pending** |

*v2.22.12 was 16/20 SP partial. v2.22.13 was 32/40 SP partial (Surface thermal throttled after 12h).*  
*v2.22.14 is the first complete 30g PC tournament — canonical machine for all future runs.*

**Surface warmup data (v2.22.15, 2026-04-21, informational only):**
- Depth-7 (6g): W0 D5 L1 = 41.7% — 5 draws, strong defensive play
- UCI Elo 1900 (5g partial): W2 D0 L3 = 40.0% — 2 clean checkmate wins
- Combined estimate: ~1830 ELO (wide CI, Surface run, not canonical)

**Known real-world strength:** mChess on mobile already beat Maia 1900 ELO (Chessis app, previous version, 15s/move). v2.22.14 PC tournament confirmed W2 D14 L14 (30%) vs SF-d7, including two checkmate wins — the first wins in a complete PC tournament run.

> **ELO methodology note:** Tournaments run to date used `go depth 7` (depth-limited), whose ELO is *estimated* (~1900), not officially calibrated. Starting with the v2.22.15 tournament, `arena_tournament.js` supports `UCI_Elo` mode (official calibrated ELO) and `Skill Level` mode (0–20, with deliberate errors). The **canonical release tournament uses `UCI_Elo 1800`** — surface warmup data suggests mChess is ~1830, making 1800 the closest to 50% expected score (tightest CI).

---

## Phase 1 — Active: Blunder Reduction (feat/v2.22.0)

Goal: eliminate the structural bugs causing piece giveaways and missed wins. Reach wins vs Stockfish d7 again.

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

## Phase 2 — Production Release: v2.23.0

**Trigger:** Phase 1 complete AND 40-game tournament shows no regression vs v2.22.5 (~1732 ELO).

### Checklist before PR to main
- [ ] 40-game tournament on PC (canonical test machine — Surface has thermal throttle issues)
- [ ] ELO confirmed above v2.22.5 baseline (~1732)
- [ ] **Pedagogical audit** — run `pedagogical_audit.js`, verify coach and commentator are aligned with current engine strength (fix misalignments as a standalone session before the PR)
- [ ] Update `README.md` and `README_es.md` — "What's new in v2.23.0"
- [ ] Update `docs/CHANGELOG.md` and `docs/CHANGELOG_es.md`
- [ ] Version bump to `v2.23.0` in 4 places in `mChess.html`
- [ ] PR from `feat/v2.22.0` → `main`

> Note: internal dev convention uses v2.23.0; the user may prefer "v2.3.0" for public branding — confirm at merge time.

---

## Phase 3 — Post-Release: Eval Improvements

Same one-patch-per-version discipline. Start after v2.23.0 is on main.

| Patch | Description | Priority |
|-------|-------------|----------|
| ~~BP~~ | ~~Bishop pair bonus~~ | Already in code (lines 8996–8999, +40cp flat) — skip |
| ~~R7~~ | ~~Rook on 7th rank~~ | Moved to Phase 1 (v2.22.15) |
| TP | Trapped piece penalty (-200cp for mob=0 on advanced pieces) | No tournament evidence yet — monitor |
| ~~QG~~ | ~~`!enemyHasQueen` guard for King Centralization~~ | Skipped — no king-into-queen pattern in tournaments |
| #7 | KR vs KB/KN theoretical draw recognition | Low urgency |

---

## Phase 4 — Post-Release Week: UI / Coach / Commentator + ELO Gauntlet

**Immediately after v2.23.0 merges to main — one week, no engine changes.**

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
| Production baseline (v2.22.5) | ~1732 ELO, 27.5% vs SF-d7 |
| Best complete PC result (v2.22.14) | **~1753 ELO, 30.0%** — beats production |
| Best SP partial (v2.22.12) | ~1763 ELO, 31.3% |
| PC search depth (30s budget, grandmaster) | d8–d17 per move (~56k–217k NPS) |
| Surface Pro depth (thermal throttled) | d6–d11 per move (~8k–37k NPS) — ~10× slower |
| Real-world strength vs tournament numbers | Noticeably stronger (PC, burst performance) |
| Maia 1900 already cleared | Yes (mobile, previous version) |
| PC wins vs SF-d7 | 2 wins in v2.22.14 30g run (G3 Queen endgame; G17 Nimzo sacrifice) |
| Tournament ELO methodology | **`go depth N`** — estimated; **`UCI_Elo N`** — official (use for release) |
| Skill Level ELO references | Lv3=1729 \| Lv4=1953 \| Lv5=2197 \| Lv7=2518 (source: stockfish-wiki FAQ) |
