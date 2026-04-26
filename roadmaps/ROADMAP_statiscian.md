# 🚀 ROADMAP: "THE STATISTICIAN" RELEASE

## 🧠 PHASE 1: Data Structure (The Brain in LocalStorage) ✅
The goal of this phase is to create the data mold for the player and ensure it saves automatically.

* **1.1 Create the `defaultProfile`:** A JSON object that contains:
    * `id` and `playerName` (editable inline in the profile modal).
    * `stats`: Global counters (`totalGames`, `totalWins`, `totalDraws`, `totalLosses`, `totalUndos`, `hintsUsed`, `piecesCaptured`).
    * `records`: `fastestWin` (fewest moves) and `highestEvalWin` (capped at 2000 cp in display).
    * `bots`: Win/Draw/Loss record separated by level (`easy`, `medium`, `hard`, `grandmaster`).
    * `unlockedTrophies`: Array of `{ id, unlockedAt }` (ISO date string).
* **1.2 Memory Manager:** `loadProfile()` (retrieves from `localStorage` on startup) and `saveProfile()` (overwrites `localStorage` on every change).
    * localStorage key: `mchess_player_profile` (distinct from `mchess_saved_game`).

---

## ⚡ PHASE 2: Event Interceptors (The Sensors) ✅
Session variables reset in `init()`. All counters are per-game.

* **Session Counters:**
    * `sessionUndos` — incremented in `undoMove()`.
    * `sessionHints` — incremented on Hawk Eye, Analysis, What should I do?, Was it good?.
    * `sessionMinEval` — lowest eval (cp, player's perspective) seen during the game.
    * `sessionQueenBlundered` — boolean, set when opponent captures the player's queen.
    * `sessionCastled` — boolean, set on the player's first castle.
    * `sessionKingMoved` — boolean, set if king moves after castling.
    * `sessionEnPassantCaptured` — boolean, set when player captures en passant.
    * `sessionPromotedToKnight` — boolean, set when player promotes a pawn to a knight.

* **End-Game Hook:** `updateMatchStats(result, difficulty, movesCount)`:
    * Guarded by `sessionGameRecorded` (exactly-once semantics).
    * `sessionPendingResult` stored at entry so `reviewGame()` can trigger it defensively.
    * Try-catch around `evaluateBoard()` (can throw in checkmate positions).
    * Updates `profile.bots[difficulty]` W/D/L, global stats, records, then calls `checkTrophyUnlocks()` and `saveProfile()`.

* **`reviewGame()` guard:** Calls `updateMatchStats` if stats were not yet recorded (fixes the case where the player clicks Review instead of New Game after checkmate).

---

## 🏆 PHASE 3: The Trophy Dictionary ✅
25 trophies across 4 categories. `unlockTrophy(id)` is idempotent and fires a toast.
`migrateProfileTrophies()` runs on `loadProfile()` to retroactively grant milestone trophies derivable from existing W/D/L data.

**🏅 Category 1: Progression & Milestones**
* `first_blood` 🩸 — **Primera Sangre:** Win your first game against any bot.
* `chicken_hunter` 🐔 — **Cazador de Pollitos:** Defeat Easy 5 times.
* `fried_chicken` 🍗 — **Pollo Frito:** Defeat Easy in under 20 moves (≤40 half-moves).
* `graduation` 🎓 — **La Graduación:** Defeat Medium for the first time.
* `magic_trick` 🎩 — **Truco de Magia:** Defeat Hard for the first time.
* `king_slayer` 👑 — **El Mata Reyes:** Defeat Grandmaster for the first time.
* `first_en_passant` 👣 — **¡Al Paso!:** Perform your first ever en passant capture. Fires immediately when it happens (not at end of game).

**🧠 Category 2: Technical & Late-Game Challenges**
* `pure_pride` 🧠 — **Orgullo Puro:** Win vs Medium or higher with 0 undos AND 0 hints.
* `iron_castle` 🏰 — **Castillo de Hierro:** Win after castling without ever moving the king again.
* `david_goliath` 🪨 — **David vs Goliat:** Win a game where `sessionMinEval` reached −500 cp or worse.
* `illusion_breaker` 🎭 — **Rompe Ilusiones:** Force a draw (stalemate or 3-fold) against Hard.
* `no_tricks` 🚫 — **Sin Trucos:** Defeat Hard with 0 hints.
* `royal_endurance` ⏳ — **Resistencia Real:** Survive more than 60 full moves against Grandmaster.
* `the_immortal` 💎 — **El Inmortal:** Defeat Grandmaster with 0 undos.
* `usurper` ♟️ — **El Usurpador:** Checkmate Grandmaster with a pawn (last SAN entry is a pawn move).

**🐣 Category 3: Easter Eggs (hidden — show "???" until unlocked)**
* `dumb_dumber` 🤦 — **Tonto y Más Tonto:** Draw against Easy.
* `oops_queen` 😬 — **¿Mi Dama?:** Win after losing your queen without compensation.
* `ancient_law` 👻 — **La Ley Antigua:** Win a game where you captured en passant.
* `the_rebel` ♞ — **El Rebelde:** Promote a pawn to a Knight and win.
* `night_owl` 🦉 — **Noctámbulo:** Win a game between midnight and 4 AM.

**📜 Category 4: The Historians (real-time — sacrifice required)**

Triggered during the game when the player moves a specific piece to a specific square **and** that square is attacked by the opponent after the move (SEE < 0 equivalent — `isSquareAttacked` on the post-move board). Additionally gated by a **material count** (non-pawn, non-king pieces) that matches the historical game's phase:

* `secret_marshall_qg3` 🌧️ — **La Lluvia de Oro:** Queen to g3, attacked, `nonPawnPieces >= 8` (rich middlegame). Echoes Marshall vs Levitsky, Breslau 1912.
* `secret_vladimirov_bh6` 💥 — **El Cañonazo:** Bishop to h6, attacked, `nonPawnPieces >= 6` (middlegame). Echoes Vladimirov vs Epishin, 1987.
* `secret_sanz_rxb2` 🚂 — **La Locomotora:** Rook to b2, attacked, `2 <= nonPawnPieces <= 8` (endgame). Echoes Sanz vs Ortueta, Madrid 1933.
* `secret_shirov_bh3` 🔥 — **Fuego en el Tablero:** Bishop to h3, attacked, `nonPawnPieces <= 5` (deep endgame). Echoes Shirov vs Topalov, Linares 1998.
* `grand_historian` 📜 — **El Gran Historiador (Platino):** Unlock all 4 historian trophies.

> **Detection (both trophies and commentary):** `checkHistorianTrophies()` is called after every human `makeMove()`. `detectHistoricalMotifFromHistory()` (commentary) accepts an optional `brd` parameter; both share the same `sq`/`minP`/`maxP` fields from `HISTORICAL_MOVE_MOTIFS`. The `minPly` gate (10–24 half-moves depending on motif) prevents false positives in the opening. Commentary fires on `addCommentaryEntry` and in the Professor's analysis panel.

---

## 🎨 PHASE 4: User Interface (The Showcase) ✅

* **4.1 Profile Modal:** Overlay `div`, opened via a button in the main menu and the in-game menu (crown icon).

* **4.2 Summary Panel:**
    * **Avatar** — portrait of the highest bot level defeated (Easy → Chick, Medium → Student, Hard → Magician, Grandmaster → Wise King). Falls back to a default pawn icon.
    * **Editable player name** — inline `<input>` with dashed underline hint, saves on blur/Enter via `saveProfileName()`. Defaults to "Player 1".
    * **Stats chips** — Games, Wins, Draws, Losses.
    * **Records** — Fastest win (moves) and Highest eval win (cp, capped at 2000 in display).
    * **Per-bot W/D/L bars** — one row per difficulty, color-coded (green/amber/red segments).

* **4.3 The Trophy Cabinet:** CSS grid iterating over `TROPHY_DEFS`:
    * **Unlocked:** full colour icon + name + unlock date.
    * **Locked (visible):** greyscale icon + name + description visible.
    * **Hidden Easter Egg (locked):** shows only "???" — name and description hidden until unlocked.

* **4.4 Toast Notifications:** `showToast()` called from `unlockTrophy()` with `durationMs = 4500`. Toast fade-out is dynamic — the `toastOut` animation delay is computed as `durationMs - 400ms` so the visible duration matches the JS timeout exactly.

---

## 💾 PHASE 5: Portability (Export / Import) 🔲
The cherry on top to make this a truly professional web app.

* **5.1 Export Data:** A button in the Profile that takes `JSON.stringify(currentProfile)`, creates a text `Blob`, generates a `<a download="airin_save.json">` link, and triggers a click programmatically.
* **5.2 Import Data:** An `<input type="file">` button. Upon upload, use `FileReader` to read the JSON, validate its structure (check for required keys before accepting), overwrite `localStorage`, and force a `location.reload()` to update the UI.

---

## 📋 Implementation Order

1. ✅ **Phase 1** — data structure + localStorage manager
2. ✅ **Phase 2** — session counters + end-game hook
3. ✅ **Phase 3** — `checkTrophyUnlocks()` + `unlockTrophy()` logic
4. ✅ **Phase 4** — profile modal + trophy cabinet UI
5. 🔲 **Phase 5** — export / import buttons

Each phase is independently testable before the next begins.
