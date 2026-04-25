# 🚀 ROADMAP: "THE STATISTICIAN" RELEASE

## 🧠 PHASE 1: Data Structure (The Brain in LocalStorage)
The goal of this phase is to create the data mold for the player and ensure it saves automatically.

* **1.1 Create the `defaultProfile`:** A JSON object that will contain:
    * `id` and `playerName` (e.g., "Player 1").
    * `stats`: Global counters (`totalGames`, `totalUndos`, `hintsUsed`, `piecesCaptured`).
    * `records`: `fastestWin` (fewest moves) and `highestEvalWin`.
    * `bots`: A Win/Draw/Loss record separated by level (`easy`, `medium`, `hard`, `grandmaster`) — keys must match the game's internal difficulty strings exactly.
    * `unlockedTrophies`: An empty array `[]` to store the IDs of earned trophies, each with an `id` and `unlockedAt` (ISO date string).
* **1.2 Memory Manager:** Program the `loadProfile()` function (retrieves from `localStorage` when the app starts) and `saveProfile()` (overwrites `localStorage` whenever there's a change).

> **Architecture note:** The localStorage key must be distinct from the existing `mchess_saved_game` key to avoid conflicts.

---

## ⚡ PHASE 2: Event Interceptors (The Sensors)
We need the chess engine to notify "The Statistician" when things happen on the board.

* **2.1 Session Counters:** Temporary variables that reset at the start of each game via `init()`:
    * `sessionUndos` — incremented on every undo.
    * `sessionHints` — incremented on every Hawk Eye activation and every Professor button press (Analysis, What should I do?, Was it good?).
    * `sessionMinEval` — tracks the *lowest* eval (in centipawns, from the player's perspective) seen during the game. Updated after every move via `evaluateBoard()`. Required for the `david_goliath` trophy.
    * `sessionQueenBlundered` — boolean flag, set to `true` when the player's queen is captured on a square where it was not defended (SEE < 0 at capture time). Cleared to `false` if the queen was traded (opponent queen also off the board). Required for `oops_queen`.
    * `sessionCastled` — boolean, set to `true` the first time the player castles. Required for `iron_castle`.
    * `sessionKingMoved` — boolean, set to `true` if the player's king moves after castling. Required for `iron_castle`.

* **2.2 Intercept Buttons:** Wire up the session counters:
    * `undoMove()` → `sessionUndos++`
    * `toggleHawksEye()` → `sessionHints++`
    * `analyzePosition()`, `requestBestMove()`, `analyzeLastMove()` → `sessionHints++` each

* **2.3 End-Game Hook:** In the function where the game detects Checkmate or a Draw, inject a call to `updateMatchStats(result, difficulty, movesCount)` which:
    * Updates `profile.bots[difficulty]` W/D/L record.
    * Updates `profile.stats` global counters.
    * Updates `profile.records` if applicable (fastest win, highest eval win).
    * Calls `checkTrophyUnlocks(result, difficulty, movesCount)`.
    * Calls `saveProfile()`.

---

## 🏆 PHASE 3: The Trophy Dictionary (Total Gamification)
This is the official list we will implement. Each trophy has an ID, Name, Description, and unlock condition.

**🏅 Category 1: Progression & Milestones**
* `first_blood` - **First Blood:** Win your first game against any bot.
* `chicken_hunter` - **Chicken Hunter:** Defeat the Easy level (Little Chick) 5 times.
* `fried_chicken` - **Fried Chicken:** Defeat the Easy level in under 20 moves.
* `graduation` - **The Graduation:** Defeat the Medium level (Student) for the first time.
* `magic_trick` - **Magic Trick:** Defeat the Hard level (The Magician) for the first time.
* `king_slayer` - **The King Slayer:** Defeat the Grandmaster level (The Wise King) for the first time.

**🧠 Category 2: Technical & Late-Game Challenges**
* `pure_pride` - **Pure Pride:** Win against Medium or higher with `sessionUndos === 0` AND `sessionHints === 0`.
* `iron_castle` - **Iron Castle:** Win a game where `sessionCastled === true` AND `sessionKingMoved === false` (castled and king never moved again).
* `david_goliath` - **David vs Goliath:** Win a game where `sessionMinEval` reached −500cp or worse at some point (severe disadvantage). Requires the `sessionMinEval` tracker from Phase 2.1.
* `illusion_breaker` - **Illusion Breaker:** Force a draw (Stalemate or 3-fold repetition) against The Magician.
* `no_tricks` - **No Tricks Allowed:** Defeat The Magician with `sessionHints === 0`.
* `royal_endurance` - **Royal Endurance:** Survive for more than 60 moves against The Wise King.
* `the_immortal` - **The Immortal:** Defeat The Wise King with `sessionUndos === 0`.
* `usurper` - **The Usurper:** Checkmate The Wise King using a pawn (final move is a pawn move that delivers checkmate — detectable from the last SAN entry).

**🐣 Category 3: Easter Eggs (Hidden Trophies)**
* `panic_mode` - **Don't Panic!:** Win a game where `sessionUndos > 5`.
* `dumb_dumber` - **Dumb and Dumber:** End in a draw (Stalemate/Draw) against the Easy level.
* `oops_queen` - **Oops, My Queen?:** Win a game where `sessionQueenBlundered === true` (queen was lost without trade). Requires the `sessionQueenBlundered` tracker from Phase 2.1.

**📜 Category 4: The Historians (Real-Time triggers)**

Triggered during the game, not at end-of-game. Each requires the player to play a specific move that is *also a sacrifice* — i.e., the piece lands on a square where SEE < 0 (it can be captured for a net loss). A purely safe move to that square does not qualify.

* `secret_marshall_qg3` - **Golden Rain:** Play a queen sacrifice to g3 (Qg3, SEE < 0).
* `secret_vladimirov_bh6` - **The Cannon Shot:** Play a bishop sacrifice to h6 (Bh6, SEE < 0).
* `secret_sanz_rxb2` - **The Locomotive:** Play a rook sacrifice to b2 (Rxb2, SEE < 0).
* `secret_shirov_bh3` - **Fire on Board:** Play a bishop sacrifice to h3 (Bh3, SEE < 0).
* `grand_historian` - **The Grand Historian (Platinum):** Unlock all 4 historical motifs above.

> **Detection:** check after every human `makeMove()`. If the move's destination square matches and main-thread SEE returns < 0 for that square, call `unlockTrophy(id)`.

---

## 🎨 PHASE 4: User Interface (The Showcase)
The player needs a place to see their achievements.

* **4.1 Profile Modal:** A pop-up overlay `div` accessible from the main menu.

* **4.2 Summary Panel:** Display:
    * **Avatar** — the character portrait of the highest bot level defeated so far (Easy → Little Chick art, Medium → Student art, Hard → Magician art, Grandmaster → Wise King art). Falls back to a default pawn icon if no bot has been defeated yet.
    * **Overall winrate** (%) across all games.
    * **Per-bot W/D/L bars** — one row per difficulty level showing wins, draws, losses.

* **4.3 The Trophy Cabinet:** A CSS grid iterating over the full trophy list from Phase 3:
    * **Unlocked:** full colour icon + name + unlock date.
    * **Locked (visible):** greyscale icon + name + description visible.
    * **Hidden Easter Egg (locked):** shows only "???" — name and description hidden until unlocked.

* **4.4 Toast Notifications:** Reuse the existing `showToast()` / `toastContainer` infrastructure already in the game. Call `showToast(trophyUnlockedMessage)` from `unlockTrophy(id)` whenever a new trophy is earned. No new toast system needed.

> **i18n note:** All trophy names and descriptions need entries in both `es:` and `en:` blocks of the `I18N` object. That is approximately 50 new keys. Add them before implementing the UI so the modal is bilingual from day one.

---

## 💾 PHASE 5: Portability (Export / Import)
The cherry on top to make this a truly professional web app.

* **5.1 Export Data:** A button in the Profile that takes `JSON.stringify(currentProfile)`, creates a text `Blob`, generates a `<a download="airin_save.json">` link, and triggers a click programmatically.
* **5.2 Import Data:** An `<input type="file">` button. Upon upload, use `FileReader` to read the JSON, validate its structure (check for required keys before accepting), overwrite `localStorage`, and force a `location.reload()` to update the UI.

---

## 📋 Implementation Order

1. **Phase 1** — data structure + localStorage manager (no UI, testable via console)
2. **Phase 2** — session counters + end-game hook (no UI, testable via console)
3. **Phase 3** — `checkTrophyUnlocks()` + `unlockTrophy()` logic (toast fires, no cabinet yet)
4. **Phase 4** — profile modal + trophy cabinet UI
5. **Phase 5** — export / import buttons

Each phase is independently testable before the next begins.
