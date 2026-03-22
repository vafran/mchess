# Stockfish Tests (English)

This folder contains scripts to run automated matches between the in-browser engine (`mChess.html`) and Stockfish, collect results and analyze them.

Quick start

1. Install Node.js (v14+ recommended) and npm.
2. From the project root, place `stockfish.exe` in the root (parallel to `mChess.html`), or set `STOCKFISH_PATH` env var to the executable.
3. From this folder run:

```bash
# run a small tournament
node arena_tournament.js

# inspect last results
node analyze_results.js
```

Notes

- `arena_tournament.js` launches a headless browser and opens `../mChess.html` (parent).
- Results and logs are saved to `stockfish_tests/tournament_results.json`.
- `engine_patches.js` contains suggested manual edits for `mChess.html` (open the file and apply changes by hand).

If you want to run multiple tournaments in batch, you can edit `CONFIG` inside `arena_tournament.js`.

Setup / Dependencies

- This repository uses `puppeteer` and `chess.js` (plus built-in Node APIs). From the project root run:

```bash
npm init -y
npm install puppeteer chess.js
```

- Example: run a tournament from the project root (PowerShell):

```powershell
# temporary for current session
$env:STOCKFISH_PATH = 'C:\full\path\to\stockfish.exe'
node stockfish_tests/arena_tournament.js

# or permanently (new terminal required)
setx STOCKFISH_PATH 'C:\full\path\to\stockfish.exe'
```

- If you prefer keeping `stockfish.exe` next to `mChess.html`, put it at the project root (parallel to `mChess.html`) and run the scripts from the project root so the default path is found.
