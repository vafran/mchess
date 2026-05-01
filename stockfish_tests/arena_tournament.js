const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const { Chess } = require('chess.js');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// ═══════════════════════════════════════════════════════════════
// 🏆 TOURNAMENT v2 — Airin vs Stockfish
//    Fixes: color alternation, sample size, opening variety,
//           multi-depth bracketing, phase tracking, CI output
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
    numGames: 20,      // minimum for ±76 ELO precision
    depths: [7, 8],  // bracket with two depths (override at runtime)
    htmlFile: path.join(__dirname, '../mChess.html'),
    stockfishPath: process.env.STOCKFISH_PATH || path.join(__dirname, '..', 'stockfish'),
    logFile: path.join(__dirname, 'tournament_latest_results.json'),
    moveTimeoutMs: 90000,   // 45s max per Airin move
    gameTimeoutMs: 3600000, // 1h per game
};

// ELO map for depth mode — informal estimates, kept for historical comparisons
const DEPTH_ELO = {
    1: 900, 2: 1100, 3: 1300, 4: 1450, 5: 1600,
    6: 1750, 7: 1900, 8: 2000, 9: 2100, 10: 2200,
    12: 2350, 15: 2500, 18: 2700, 20: 2800
};
function sfELO(d) {
    if (DEPTH_ELO[d]) return DEPTH_ELO[d];
    const keys = Object.keys(DEPTH_ELO).map(Number).sort((a, b) => a - b);
    for (let i = 0; i < keys.length - 1; i++) {
        if (d > keys[i] && d < keys[i + 1]) {
            const t = (d - keys[i]) / (keys[i + 1] - keys[i]);
            return Math.round(DEPTH_ELO[keys[i]] * (1 - t) + DEPTH_ELO[keys[i + 1]] * t);
        }
    }
    return 2200;
}

// Official Stockfish Skill Level → ELO (source: stockfish-wiki FAQ / official graph)
const SKILL_LEVEL_ELO = {
    0:1347, 1:1444, 2:1566, 3:1729, 4:1953, 5:2197, 6:2383, 7:2518, 8:2624, 9:2711,
    10:2786, 11:2851, 12:2910, 13:2963, 14:3012, 15:3057, 16:3099, 17:3139, 18:3176, 19:3185, 20:3190
};
// sfConfig = { mode: 'depth' | 'uci_elo' | 'skill_level', value: N }
function getSFElo(sfConfig) {
    if (!sfConfig || sfConfig.mode === 'depth') return sfELO(sfConfig ? sfConfig.value : 7);
    if (sfConfig.mode === 'uci_elo')     return sfConfig.value;
    if (sfConfig.mode === 'skill_level') return SKILL_LEVEL_ELO[sfConfig.value] || 1347;
    return 1900;
}
function sfConfigTag(sfConfig) {
    if (!sfConfig || sfConfig.mode === 'depth') return `d${sfConfig ? sfConfig.value : 7}`;
    if (sfConfig.mode === 'uci_elo')     return `ucielo${sfConfig.value}`;
    if (sfConfig.mode === 'skill_level') return `sl${sfConfig.value}`;
    return 'sf';
}
function sfConfigLabel(sfConfig) {
    if (!sfConfig || sfConfig.mode === 'depth') return `depth ${sfConfig.value} (~${getSFElo(sfConfig)} ELO estimated)`;
    if (sfConfig.mode === 'uci_elo')     return `UCI_Elo ${sfConfig.value} (official calibrated)`;
    if (sfConfig.mode === 'skill_level') return `Skill Level ${sfConfig.value} (~${getSFElo(sfConfig)} ELO official)`;
    return 'unknown';
}

// ── Opening book for variety ─────────────────────────────────
// Each entry is a sequence of UCI moves to play before the engines start.
// Covers the main ECO openings so we get a diverse sample.
const OPENING_BOOK = [
    [],             // Starting position (no forced moves)
    ['e2e4'],       // 1.e4 (King's Pawn)
    ['d2d4'],       // 1.d4 (Queen's Pawn)
    ['c2c4'],       // 1.c4 (English)
    ['g1f3'],       // 1.Nf3 (Reti)
    ['e2e4', 'e7e5'],// 1.e4 e5 (Open Game)
    ['e2e4', 'c7c5'],// 1.e4 c5 (Sicilian)
    ['e2e4', 'e7e6'],// 1.e4 e6 (French)
    ['e2e4', 'c7c6'],// 1.e4 c6 (Caro-Kann)
    ['d2d4', 'd7d5'],// 1.d4 d5 (Closed)
    ['d2d4', 'g8f6'],// 1.d4 Nf6 (Indian)
    ['e2e4', 'e7e5', 'g1f3', 'b8c6'],      // Open, 2.Nf3 Nc6
    ['e2e4', 'c7c5', 'g1f3', 'd7d6'],      // Sicilian Najdorf setup
    ['d2d4', 'd7d5', 'c2c4'],             // Queen's Gambit
    ['e2e4', 'e7e5', 'g1f3', 'g8f6'],      // Petrov
    ['e2e4', 'e7e5', 'f1c4'],             // Italian
    ['d2d4', 'g8f6', 'c2c4', 'e7e6'],      // Queen's Indian setup
    ['e2e4', 'd7d6', 'd2d4', 'g8f6'],      // Pirc
    ['c2c4', 'e7e5'],                    // Reversed Sicilian
    ['g1f3', 'd7d5', 'g2g3'],             // Reti
];

// ── Stats per depth ──────────────────────────────────────────
class DepthStats {
    constructor(depth, sfConfig = null) {
        this.depth = depth;
        this.sfConfig = sfConfig || { mode: 'depth', value: depth };
        this.sfELO = sfConfig ? getSFElo(sfConfig) : sfELO(depth);
        this.games = [];
        this.npsLog = []; // NPS samples per move, for average
        this.wW = 0; this.wB = 0; // wins as white / black
        this.lW = 0; this.lB = 0; // losses
        this.dW = 0; this.dB = 0; // draws
    }
    add(result, AirinColor, moves, reason, pgn, phase) {
        this.games.push({
            result, AirinColor, moves, reason, pgn, phase,
            ts: new Date().toISOString()
        });
        const w = AirinColor === 'w';
        if (result === 'airin_win') { if (w) this.wW++; else this.wB++; }
        else if (result === 'sf_win') { if (w) this.lW++; else this.lB++; }
        else { if (w) this.dW++; else this.dB++; }
    }
    wins() { return this.wW + this.wB; }
    losses() { return this.lW + this.lB; }
    draws() { return this.dW + this.dB; }
    total() { return this.games.length; }
    score() { return this.total() > 0 ? (this.wins() + 0.5 * this.draws()) / this.total() : 0; }

    // 95% confidence interval using Wilson score
    wilsonCI() {
        const n = this.total(); if (n === 0) return [0, 0];
        const p = this.score();
        const z = 1.96;
        const center = (p + z * z / (2 * n)) / (1 + z * z / n);
        const margin = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n);
        return [Math.max(0, center - margin), Math.min(1, center + margin)];
    }

    estimateELO() {
        const p = this.score();
        if (p === 0) return this.sfELO - 600;
        if (p === 1) return this.sfELO + 600;
        return Math.round(this.sfELO - 400 * Math.log10((1 - p) / p));
    }
    eloCI() {
        const [lo, hi] = this.wilsonCI();
        const eloLo = lo === 0 ? this.sfELO - 600 : Math.round(this.sfELO - 400 * Math.log10((1 - lo) / lo));
        const eloHi = hi === 1 ? this.sfELO + 600 : Math.round(this.sfELO - 400 * Math.log10((1 - hi) / hi));
        return [eloLo, eloHi];
    }
    print() {
        const [elo_lo, elo_hi] = this.eloCI();
        const phases = {};
        this.games.forEach(g => { phases[g.phase] = (phases[g.phase] || 0) + 1; });
        const _eloSrc = (!this.sfConfig || this.sfConfig.mode === 'depth') ? 'estimated' : 'official';
        console.log(`\n  📊 Stockfish [${sfConfigLabel(this.sfConfig)}] (ELO ${_eloSrc})`);
        console.log(`     Games: ${this.total()} | W:${this.wins()} L:${this.losses()} D:${this.draws()}`);
        console.log(`     As White  → W:${this.wW} L:${this.lW} D:${this.dW}`);
        console.log(`     As Black  → W:${this.wB} L:${this.lB} D:${this.dB}`);
        console.log(`     Score: ${(this.score() * 100).toFixed(1)}%`);
        console.log(`     ELO estimate: ~${this.estimateELO()}  [95%CI: ${elo_lo}..${elo_hi}]`);
        console.log(`     Game phases: ${JSON.stringify(phases)}`);
        if (this.npsLog.length > 0) {
            const avgNps = Math.round(this.npsLog.reduce((a, b) => a + b, 0) / this.npsLog.length);
            const npsDisp = avgNps >= 1000000
                ? (avgNps / 1000000).toFixed(2) + 'M n/s'
                : (avgNps / 1000).toFixed(0) + 'k n/s';
            console.log(`     Avg NPS: ${npsDisp}  (${this.npsLog.length} samples)`);
        }
    }
}

// ── Stockfish wrapper ────────────────────────────────────────
function spawnSF(sfConfig) {
    const sf = spawn(CONFIG.stockfishPath, { stdio: ['pipe', 'pipe', 'pipe'] });
    sf.on('error', () => {});
    sf.stdin.on('error', () => {});
    sf.stdout.on('error', () => {});
    sf.stdin.write('uci\n');
    // Send mode-specific setoptions once at spawn
    if (sfConfig && sfConfig.mode === 'uci_elo') {
        sf.stdin.write('setoption name UCI_LimitStrength value true\n');
        sf.stdin.write(`setoption name UCI_Elo value ${sfConfig.value}\n`);
    } else if (sfConfig && sfConfig.mode === 'skill_level') {
        sf.stdin.write(`setoption name Skill Level value ${sfConfig.value}\n`);
    }
    sf.stdin.write('isready\n'); // flush setoptions before first move
    return sf;
}
function sfBestMove(sf, fen, sfConfig) {
    return new Promise((resolve, reject) => {
        let buf = '';
        const timeout = setTimeout(() => {
            sf.stdout.removeListener('data', onData);
            try { sf.kill(); } catch (_) {}
            reject(new Error('Stockfish timeout'));
        }, 30000);
        function onData(data) {
            buf += data.toString();
            if (buf.includes('bestmove')) {
                clearTimeout(timeout);
                sf.stdout.removeListener('data', onData);
                const m = buf.split('bestmove ')[1]?.split(' ')[0]?.trim();
                resolve(m || null);
            }
        }
        sf.stdout.on('data', onData);
        sf.stdin.write(`position fen ${fen}\n`);
        if (!sfConfig || sfConfig.mode === 'depth') {
            sf.stdin.write(`go depth ${sfConfig ? sfConfig.value : 7}\n`);
        } else {
            // UCI_Elo / Skill Level: strength already set at spawn; use movetime
            sf.stdin.write(`go movetime ${sfConfig.moveTime || 5000}\n`);
        }
    });
}

// ── Detect game phase from move count + piece count ──────────
function detectPhase(game) {
    const m = game.history().length;
    const board = game.board().flat().filter(Boolean);
    const pieces = board.length - 2; // minus kings
    if (m <= 16) return 'opening';
    if (pieces <= 10) return 'endgame';
    return 'middlegame';
}

// ── askWiseKing concurrency guard ─────────────────────────────────────────────
// askWiseKing stores its resolve callback in a single global slot (window._wkResolve).
// If two calls overlap, the second call overwrites the slot and the worker's reply
// for call 1 resolves call 2 with the WRONG move.  We prevent this by reloading
// the page whenever a previous page.evaluate timed out (page.goto cancels stale evals).
let _pageStale = false;

async function evalMove(page, fen, history, timeoutMs, positionFens = []) {
    if (_pageStale) {
        console.log('   ♻️  Reloading page (previous call timed out — clearing stale worker state)...');
        await page.goto('file://' + CONFIG.htmlFile);
        await new Promise(r => setTimeout(r, 1500));
        await page.evaluate((lvl) => {
            try {
                currentDifficulty = lvl;
                const s = DIFF_SETTINGS && DIFF_SETTINGS[lvl];
                if (s) {
                    aiDepth = s.depth;
                    aiMistakeChance = s.mistakes;
                    // Patch DIFF_SETTINGS directly — askWiseKing reads it, not aiTimeLimit
                    if (lvl === 'grandmaster') s.timeLimit = 15000;
                    aiTimeLimit = s.timeLimit;
                }
                if (typeof chessEngineWorker !== 'undefined' && chessEngineWorker) {
                    try { chessEngineWorker.terminate(); } catch (e) { } chessEngineWorker = null;
                }
                if (typeof startNewGame === 'function') {
                    gameMode = 'ai'; playerColor = 'w'; startNewGame('ai');
                }
            } catch (e) { }
        }, CONFIG.selectedLevel || 'grandmaster');
        await new Promise(r => setTimeout(r, 800));
        _pageStale = false;
    }

    const evalP = page.evaluate(async (f, h, p) => {
        try { return await window.askWiseKing(f, h, p); } catch (e) { return null; }
    }, fen, history, positionFens);

    const result = await Promise.race([
        evalP,
        new Promise(r => setTimeout(() => r('__WK_TIMEOUT__'), timeoutMs)),
    ]);

    if (result === '__WK_TIMEOUT__') {
        _pageStale = true;  // page.evaluate still running; mark for reload before next call
        return null;
    }
    return result;
}

// ── Play one game ─────────────────────────────────────────────
// NOTE: `page` is a persistent shared page. The Web Worker is NEVER restarted
// between games so TurboFan keeps JIT-compiled code alive across all games.
// startFen: optional FEN string to start from a specific position (FEN replay mode).
//           When set, `opening` is ignored.
async function playGame(gameNum, totalGames, AirinColor, opening, sfConfig, stats, page, startFen = null) {
    const colorStr = AirinColor === 'w' ? '⬜White' : '⬛Black';
    const openingStr = startFen ? `FEN: ${startFen.slice(0, 40)}…` : (opening.length ? opening.join(' ') : 'start');
    console.log(`\n${'─'.repeat(62)}`);
    console.log(`🎮 Game ${gameNum}/${totalGames}  Airin=${colorStr}  ${startFen ? '📌 FEN replay' : `Opening:[${openingStr}]`}  SF:[${sfConfigTag(sfConfig)}]`);
    if (startFen) console.log(`   FEN: ${startFen}`);
    console.log('─'.repeat(62));

    // Update difficulty settings only — do NOT call startNewGame() because that
    // creates a new Worker and destroys all JIT-compiled code.
    // askWiseKing(fen, history) is fully stateless: it receives the complete
    // position on every call, so no visual game reset is needed.
    await page.evaluate((lvl) => {
        try {
            currentDifficulty = lvl;
            const s = DIFF_SETTINGS && DIFF_SETTINGS[lvl];
            if (s) {
                aiDepth = s.depth;
                aiMistakeChance = s.mistakes;
                // Patch DIFF_SETTINGS directly — askWiseKing reads it, not aiTimeLimit
                if (lvl === 'grandmaster') s.timeLimit = 30000;
                aiTimeLimit = s.timeLimit;
            }
        } catch (e) { }
    }, CONFIG.selectedLevel || 'grandmaster');

    const sf = spawnSF(sfConfig);
    const game = startFen ? new Chess(startFen) : new Chess();
    let reason = 'unknown';
    let phase = 'opening';

    try {
        // Apply forced opening moves (only in normal mode, not FEN replay)
        if (!startFen) {
            for (const uci of opening) {
                const result = game.move({
                    from: uci.slice(0, 2), to: uci.slice(2, 4),
                    promotion: uci[4] || 'q'
                });
                if (!result) { console.log(`⚠️ Opening move ${uci} illegal — skipping rest`); break; }
            }
        }

        const gameStart = Date.now();

        while (!game.isGameOver()) {
            if (Date.now() - gameStart > CONFIG.gameTimeoutMs) { reason = 'game_timeout'; break; }

            const fen = game.fen();
            const currentColor = game.turn(); // 'w' or 'b'
            const isAirin = (currentColor === AirinColor);
            let move = null;

            if (isAirin) {
                // Airin moves — use evalMove() to safely handle timeouts
                // and prevent concurrent askWiseKing calls (which corrupt its result)
                const t0 = Date.now();
                const _fenHist = game.history({ verbose: true }).map(m => m.after);
                move = await evalMove(page, fen, game.history(), CONFIG.moveTimeoutMs, _fenHist);

                const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
                let depth_info = null;
                try { depth_info = await page.evaluate(() => window._lastSearchDepth || null); } catch (_) { }
                const dStr = depth_info
                    ? (depth_info.completedDepth === 'book' ? '[book]'
                        : ` [d${depth_info.completedDepth}/${depth_info.maxDepth}${depth_info.isPartial ? '~' : ''}]`)
                    : '';
                const npsStr = depth_info && depth_info.nps > 0
                    ? ` ${depth_info.nps >= 1000000
                        ? (depth_info.nps / 1000000).toFixed(1) + 'Mn/s'
                        : (depth_info.nps / 1000).toFixed(0) + 'kn/s'}`
                    : '';
                console.log(`   👑 Airin ${move || 'null'} (${elapsed}s)${dStr}${npsStr}`);
                if (depth_info && depth_info.nps > 0) stats.npsLog.push(depth_info.nps);
            } else {
                // Stockfish moves
                move = await sfBestMove(sf, fen, sfConfig);
                console.log(`   🐟 SF     ${move}  [${sfConfigTag(sfConfig)}]`);
            }

            if (!move || move === 'null') {
                reason = isAirin ? 'airin_no_move' : 'sf_no_move';
                break;
            }

            try {
                game.move({
                    from: move.slice(0, 2), to: move.slice(2, 4),
                    promotion: move[4] || 'q'
                });
                phase = detectPhase(game);
            } catch (e) {
                console.error(`❌ Illegal: ${move} (${isAirin ? 'Airin' : 'SF'})`);
                reason = isAirin ? 'airin_illegal' : 'sf_illegal';
                break;
            }
        }
    } finally {
        // Do NOT close the page — we reuse it to keep the JIT hot
        try { if (!sf.killed) sf.stdin.write('quit\n'); sf.kill(); } catch (_) { }
    }

    // Determine result
    let result;
    if (game.isCheckmate()) {
        result = (game.turn() !== AirinColor) ? 'airin_win' : 'sf_win';
        reason = 'checkmate';
    } else if (game.isDraw()) {
        result = 'draw';
        if (game.isStalemate()) reason = 'stalemate';
        else if (game.isThreefoldRepetition()) reason = 'repetition';
        else if (game.isInsufficientMaterial()) reason = 'insufficient_material';
        else reason = '50_moves';
    } else if (reason === 'airin_illegal' || reason === 'airin_no_move') {
        result = 'sf_win';
    } else if (reason === 'sf_illegal' || reason === 'sf_no_move') {
        result = 'airin_win';
    } else {
        result = 'draw';
    }

    const resultStr = result === 'airin_win' ? '✅ Airin wins'
        : result === 'sf_win' ? '❌ Stockfish wins'
            : '🤝 Draw';
    console.log(`\n${resultStr}  reason:${reason}  moves:${game.history().length}  phase:${phase}`);

    stats.add(result, AirinColor, game.history().length, reason, game.pgn(), phase);
}

// ── Core tournament runner (shared by interactive and batch modes) ────────
async function runCore(sfConfigs, n, selectedLevel, fenReplayMode = false, fenList = []) {
    CONFIG.numGames = n;
    CONFIG.sfConfigs = sfConfigs;
    CONFIG.selectedLevel = selectedLevel;

    // Extract Airin version from HTML title tag
    let airinVer = '';
    let airinVerStr = 'unknown';
    try {
        const htmlSrc = fs.readFileSync(CONFIG.htmlFile, 'utf8');
        const m = htmlSrc.match(/<title>(?:Airin|Monolith Chess) (v[\d.]+[a-z]?)<\/title>/);
        if (m) { airinVer = '_' + m[1]; airinVerStr = m[1]; }
    } catch (_) {}
    const modeTag = (fenReplayMode && fenList.length > 0) ? '_fenreplay' : '';
    const gameCount = fenReplayMode && fenList.length > 0 ? fenList.length : n;
    const _vTs = new Date().toISOString().replace('T', '_').replace(/[:.]/g, '').slice(0, 15);
    const _sfTag = sfConfigs.map(c => sfConfigTag(c)).join('_');
    CONFIG.logFile = path.join(__dirname, `tournament_Airin${airinVer}_${_sfTag}_${gameCount}g${modeTag}_${_vTs}.json`);

    // ── Verbose log — same timestamp as JSON so both files pair up ────────
    const verboseLogFile = CONFIG.logFile.replace('.json', `_verbose_${_vTs}.log`);
    const verboseStream = fs.createWriteStream(verboseLogFile, { encoding: 'utf8' });
    verboseStream.write(`# Airin verbose log — ${new Date().toISOString()}\n`);
    verboseStream.write(`# ${n} games × [${sfConfigs.map(c => sfConfigLabel(c)).join(' / ')}] | ${selectedLevel}\n\n`);

    console.log(`\n🔧 Config: ${fenReplayMode && fenList.length > 0 ? fenList.length + ' FENs' : n + ' games'} × ${sfConfigs.length} opponent(s)`);
    sfConfigs.forEach(c => console.log(`   [${sfConfigTag(c)}] → ~${getSFElo(c)} ELO  (${sfConfigLabel(c)})`));

    // ~11 min/game at Wizard (15s budget), ~22 min/game at Wise King (30s budget)
    const estMinPerGame = (selectedLevel === 'grandmaster') ? 22 : 11;
    const estTotal = n * sfConfigs.length * estMinPerGame;
    console.log(`\n⏱️  Estimated time: ~${estTotal} min (~${(estTotal / 60).toFixed(1)}h)`);
    console.log(`💾 Results will save to: ${CONFIG.logFile}`);
    console.log('✅ Partial save after every game — safe to interrupt anytime (Ctrl+C)\n');
    console.log('🚀 Starting tournament...\n');
    const statsMap = {};
    sfConfigs.forEach(c => { statsMap[sfConfigTag(c)] = new DepthStats(c.value, c); });

    // ── Partial save helper — called after every game ─────────────────
    const savePartial = (gameNum, total, done = false) => {
        try {
            const allGamesFlat = sfConfigs.flatMap(c => statsMap[sfConfigTag(c)].games);
            const totalW = allGamesFlat.filter(g => g.result === 'airin_win').length;
            const totalD = allGamesFlat.filter(g => g.result === 'draw').length;
            const totalL = allGamesFlat.filter(g => g.result === 'sf_win').length;
            const totalN = allGamesFlat.length;
            fs.writeFileSync(CONFIG.logFile, JSON.stringify({
                timestamp: new Date().toISOString(),
                status: done ? 'complete' : `partial_${gameNum}_of_${total}`,
                config: { numGames: n, sfConfigs, airinVersion: airinVerStr, difficultyLevel: CONFIG.selectedLevel || 'grandmaster' },
                byDepth: Object.fromEntries(sfConfigs.map(c => {
                    const k = sfConfigTag(c); const st = statsMap[k];
                    return [k, {
                        sfConfig: c,
                        sfELO: getSFElo(c),
                        sfLabel: sfConfigLabel(c),
                        estimatedELO: st.estimateELO(),
                        eloCI: st.eloCI(),
                        score: st.score(),
                        wins: st.wins(),
                        losses: st.losses(),
                        draws: st.draws(),
                        games: st.games,
                    }];
                })),
                combined: totalN > 0 ? {
                    gamesPlayed: totalN,
                    wins: totalW, losses: totalL, draws: totalD,
                    score: ((totalW + 0.5 * totalD) / totalN).toFixed(3),
                } : null,
            }, null, 2));
        } catch (e) { console.error('⚠️  Partial save failed:', e.message); }
    };

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        protocolTimeout: 120000,
        args: [
            '--allow-file-access-from-files',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            // ── Prevent browser from throttling background tabs / workers ──
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
        ],
    });

    // ── Create ONE persistent page for the entire tournament ──────────────
    // Re-using the same page means V8/TurboFan JIT-compiled code is never
    // thrown away between games. NPS stabilises at peak from game 2 onward.
    const sharedPage = await browser.newPage();
    sharedPage.on('console', msg => {
        const t = msg.text();
        const ts = new Date().toISOString().slice(11, 23); // "HH:MM:SS.mmm"
        verboseStream.write(`[${ts}] ${t}\n`); // ALL browser console messages go to verbose log
        if (msg.type() === 'error') console.log('🌐 Error:', t.slice(0, 120));
        else if (t.includes('NPS:')) console.log('   🧠', t.replace(/.*?Real depth:/, 'depth:').trim());
        else if (t.includes('Book exit')) console.log('   ⚠️  ' + t);
        else if (t.startsWith('📊') && t.includes('FILTER→')) console.log('   🚨', t.trim()); // anti-blunder events only
    });
    console.log('🌐 Loading page...');
    await sharedPage.goto('file://' + CONFIG.htmlFile);
    await new Promise(r => setTimeout(r, 1500));
    // Initial engine setup (done once)
    await sharedPage.evaluate((level) => {
        try {
            currentDifficulty = level;
            const s = DIFF_SETTINGS && DIFF_SETTINGS[level];
            if (s) {
                aiDepth = s.depth;
                aiMistakeChance = s.mistakes;
                aiTimeLimit = s.timeLimit;
            }
            if (typeof chessEngineWorker !== 'undefined' && chessEngineWorker) {
                try { chessEngineWorker.terminate(); } catch (e) { }
                chessEngineWorker = null;
            }
            if (typeof startNewGame === 'function') {
                gameMode = 'ai'; playerColor = 'w'; startNewGame('ai');
            }
        } catch (e) { }
    }, CONFIG.selectedLevel || 'grandmaster');
    await new Promise(r => setTimeout(r, 800));
    console.log('   ✅ Worker ready. JIT warms up naturally during game 1; NPS improves from game 2+.\n');

    // ── Graceful Ctrl+C: save partial results before exit ────────────
    process.on('SIGINT', async () => {
        console.log('\n\n⚠️  Interrupted! Saving partial results...');
        savePartial('interrupted', '?', false);
        console.log(`💾 Partial results saved to: ${CONFIG.logFile}`);
        // Print partial report
        console.log('\n' + '═'.repeat(62));
        console.log('📊 PARTIAL RESULTS AT INTERRUPTION');
        console.log('═'.repeat(62));
        sfConfigs.forEach(c => { const st = statsMap[sfConfigTag(c)]; if (st.total() > 0) st.print(); });
        try { await browser.close(); } catch (_) { }
        try { verboseStream.end(); } catch (_) { }
        console.log(`📝 Verbose log: ${path.basename(verboseLogFile)}`);
        process.exit(0);
    });

    try {
        // Build game list
        const allGames = [];
        for (const sfConfig of sfConfigs) {
            const _key = sfConfigTag(sfConfig);
            if (fenReplayMode && fenList.length > 0) {
                // FEN replay: one game per FEN entry
                for (const { fen, AirinColor } of fenList) {
                    allGames.push({ sfConfig, AirinColor, opening: [], startFen: fen });
                }
            } else {
                // Normal tournament: alternate colors, rotate openings
                const gamesPerConfig = Math.floor(n / sfConfigs.length);
                for (let i = 0; i < gamesPerConfig; i++) {
                    allGames.push({
                        sfConfig,
                        AirinColor: i % 2 === 0 ? 'w' : 'b',
                        opening: OPENING_BOOK[i % OPENING_BOOK.length],
                        startFen: null,
                    });
                }
            }
        }

        const total = allGames.length;
        for (let i = 0; i < allGames.length; i++) {
            const { sfConfig, AirinColor, opening, startFen } = allGames[i];
            const _key = sfConfigTag(sfConfig);
            verboseStream.write(`\n${'='.repeat(60)}\n`);
            verboseStream.write(`=== Game ${i+1}/${total} | Airin=${AirinColor} | SF [${_key}] ===\n`);
            verboseStream.write(`${'='.repeat(60)}\n`);
            try {
                await playGame(i + 1, total, AirinColor, opening, sfConfig, statsMap[_key], sharedPage, startFen);
            } catch (err) {
                console.error(`\n💥 Game ${i + 1} crashed:`, err.message);
                statsMap[_key].add('draw', AirinColor, 0, 'crash', '', 'unknown');
            }
            savePartial(i + 1, total, false);
            const gs = statsMap[_key];
            if (gs.total() > 0) {
                const lastGame = gs.games[gs.games.length - 1];
                console.log(`   💾 Saved: W:${gs.wins()} L:${gs.losses()} D:${gs.draws()} | ELO ~${gs.estimateELO()} [${gs.eloCI()[0]}..${gs.eloCI()[1]}]`);
            }
            await new Promise(r => setTimeout(r, 1500));
        }
    } finally {
        await browser.close();
    }

    // ── Final report ────────────────────────────────────────
    console.log('\n\n' + '═'.repeat(62));
    console.log('🏆 FINAL TOURNAMENT REPORT');
    console.log('═'.repeat(62));
    sfConfigs.forEach(c => statsMap[sfConfigTag(c)].print());

    // Combined ELO estimate (weighted by game count)
    const allGamesFlat = sfConfigs.flatMap(c => statsMap[sfConfigTag(c)].games);
    const totalW = allGamesFlat.filter(g => g.result === 'airin_win').length;
    const totalD = allGamesFlat.filter(g => g.result === 'draw').length;
    const totalN = allGamesFlat.length;
    if (totalN > 0 && sfConfigs.length > 1) {
        const score = (totalW + 0.5 * totalD) / totalN;
        const avgSfELO = sfConfigs.reduce((s, c) => s + getSFElo(c) * statsMap[sfConfigTag(c)].total(), 0) / totalN;
        const combinedELO = score === 0 ? avgSfELO - 600 : score === 1 ? avgSfELO + 600
            : Math.round(avgSfELO - 400 * Math.log10((1 - score) / score));
        console.log(`\n  🎯 Combined ELO estimate: ~${combinedELO}  (${totalN} games total)`);
    }

    console.log('\n  📋 Breakdown by reason:');
    const allReasons = {};
    allGamesFlat.forEach(g => { allReasons[g.reason] = (allReasons[g.reason] || 0) + 1; });
    Object.entries(allReasons).sort((a, b) => b[1] - a[1]).forEach(([r, c]) => {
        console.log(`     ${r}: ${c}`);
    });

    savePartial(totalN, totalN, true); // final complete save
    console.log(`\n💾 Results saved to: ${CONFIG.logFile}`);
    verboseStream.end();
    console.log(`📝 Verbose log: ${path.basename(verboseLogFile)}`);
}

// ── Interactive tournament runner ────────────────────────────────────────
async function runTournament() {
    console.log('╔' + '═'.repeat(62) + '╗');
    console.log('║       🏆 TOURNAMENT v2 — Airin vs Stockfish 🏆          ║');
    console.log('╚' + '═'.repeat(62) + '╝');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = q => new Promise(r => rl.question(q, r));

    // ── Mode selection ────────────────────────────────────────
    console.log('\nSelect mode:');
    console.log('  1) Normal tournament  (full games from opening)');
    console.log('  2) FEN replay         (reproduce specific positions)');
    const modeAns = (await ask('Choose 1-2 (enter=1): ')).trim();
    const fenReplayMode = modeAns === '2';

    // ── Airin level ─────────────────────────────────────────
    console.log('\nSelect Airin level:');
    console.log('  1) Chick       (easy)');
    console.log('  2) Student     (medium)');
    console.log('  3) Wizard      (hard)');
    console.log('  4) Wise King   (grandmaster) ← recommended');
    const levelAns = (await ask('Choose 1-4 (enter=4): ')).trim();
    const LEVEL_MAP = { '1': 'easy', '2': 'medium', '3': 'hard', '4': 'grandmaster' };
    const selectedLevel = LEVEL_MAP[levelAns] || 'grandmaster';
    console.log(`✅ Airin level: ${selectedLevel}`);

    // ── HTML file ─────────────────────────────────────────────
    console.log('\nPath to Airin HTML file:');
    console.log('  (leave blank to use default: ../mChess.html)');
    const htmlAns = (await ask('HTML path: ')).trim();
    if (htmlAns) CONFIG.htmlFile = path.resolve(__dirname, htmlAns);
    console.log(`✅ File: ${CONFIG.htmlFile}`);

    // ── Stockfish opponent mode ────────────────────────────────
    console.log('\nSelect Stockfish opponent mode:');
    console.log('  1) Depth limit   — e.g. d7 (historical baseline, ELO estimated, NOT official)');
    console.log('  2) UCI_Elo       — official calibrated ELO ← recommended');
    console.log('  3) Skill Level   — 0-20 with deliberate errors (ELO official)');
    const sfModeAns = (await ask('Choose 1-3 (enter=2): ')).trim();
    const sfMode = sfModeAns === '1' ? 'depth' : sfModeAns === '3' ? 'skill_level' : 'uci_elo';

    let sfConfigs;
    if (sfMode === 'depth') {
        console.log('  d5→~1600  d6→~1750  d7→~1900 (baseline)  d8→~2000  d9→~2100');
        console.log('  Multiple opponents: e.g. 7,8');
        const depthAns = (await ask('Depth(s) 1-15 (enter=7): ')).trim();
        const depths = depthAns ? depthAns.split(',').map(x => parseInt(x.trim())).filter(d => d >= 1 && d <= 20) : [7];
        sfConfigs = depths.map(d => ({ mode: 'depth', value: d }));
        sfConfigs.forEach(c => console.log(`✅ ${sfConfigLabel(c)}`));
    } else if (sfMode === 'uci_elo') {
        console.log('  Valid range: 1320–3190. Level 3 (Skill)=1729 | Airin est.=1750 | Level 4 (Skill)=1953');
        console.log('  Multiple opponents: e.g. 1700,1900');
        const eloAns = (await ask('UCI_Elo value(s) (enter=1750): ')).trim();
        const eloVals = eloAns ? eloAns.split(',').map(x => Math.min(3190, Math.max(1320, parseInt(x.trim())))).filter(v => !isNaN(v)) : [1750];
        sfConfigs = eloVals.map(v => ({ mode: 'uci_elo', value: v }));
        sfConfigs.forEach(c => console.log(`✅ ${sfConfigLabel(c)}`));
    } else {
        console.log('  Lv 0=1347 | Lv 1=1444 | Lv 2=1566 | Lv 3=1729 | Lv 4=1953 | Lv 5=2197');
        console.log('  Lv 6=2383 | Lv 7=2518 | Lv 8=2624 | Lv 9=2711 | Lv10=2786 | Lv11=2851');
        console.log('  Lv12=2910 | Lv13=2963 | Lv14=3012 | Lv15=3057 | Lv16=3099 | Lv17=3139');
        console.log('  Lv18=3176 | Lv19=3185 | Lv20=3190 (full strength)');
        console.log('  Multiple opponents: e.g. 3,4');
        const slAns = (await ask('Skill Level(s) 0-20 (enter=3): ')).trim();
        const slVals = slAns ? slAns.split(',').map(x => Math.min(20, Math.max(0, parseInt(x.trim())))).filter(v => !isNaN(v)) : [3];
        sfConfigs = slVals.map(v => ({ mode: 'skill_level', value: v }));
        sfConfigs.forEach(c => console.log(`✅ ${sfConfigLabel(c)}`));
    }

    // ── FEN replay: load positions ────────────────────────────
    let fenList = []; // { fen, AirinColor }
    if (fenReplayMode) {
        console.log('\n📌 FEN REPLAY MODE');
        console.log('  Enter one FEN per line. Format: <FEN> [w|b]');
        console.log('  The color (w/b) is who Airin plays AS in that position.');
        console.log('  If omitted, Airin plays the side to move in the FEN.');
        console.log('  Or enter a path to a JSON file: [{ "fen": "...", "color": "w" }, ...]');
        console.log('  Leave blank and press Enter to finish.\n');
        const firstLine = (await ask('FEN / JSON file path: ')).trim();
        if (firstLine.endsWith('.json')) {
            const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, firstLine), 'utf8'));
            fenList = raw.map(e => ({ fen: e.fen, AirinColor: e.color || e.fen.split(' ')[1] }));
            console.log(`✅ Loaded ${fenList.length} positions from ${firstLine}`);
        } else if (firstLine) {
            const lines = [firstLine];
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const line = (await ask('FEN (blank to finish): ')).trim();
                if (!line) break;
                lines.push(line);
            }
            fenList = lines.map(line => {
                const parts = line.split(/\s+/);
                // last token may be 'w' or 'b' (color override), rest is FEN
                const lastTok = parts[parts.length - 1];
                let color, fen;
                if (lastTok === 'w' || lastTok === 'b') {
                    color = lastTok;
                    fen = parts.slice(0, -1).join(' ');
                } else {
                    fen = parts.join(' ');
                    color = fen.split(' ')[1]; // side to move in FEN
                }
                return { fen, AirinColor: color };
            });
            console.log(`✅ ${fenList.length} position(s) loaded`);
        }
        if (fenList.length === 0) {
            console.log('⚠️  No FENs entered — switching to normal tournament mode.');
        }
    }

    // ── Number of games (normal mode only) ───────────────────
    let n = fenList.length > 0 ? fenList.length * sfConfigs.length : 0;
    if (!fenReplayMode || fenList.length === 0) {
        console.log('\nNumber of games per opponent:');
        console.log('  10 games → ±108 ELO precision  (~2h Wizard / ~4h Wise King)');
        console.log('  20 games → ±76  ELO precision  (~4h Wizard / ~7-8h Wise King)   ← recommended');
        console.log('  40 games → ±54  ELO precision  (~7.5h Wizard / ~14-16h Wise King) ← required for main PR');
        const nAns = (await ask('Games per opponent (enter=10): ')).trim();
        n = Math.max(2, parseInt(nAns) || 10);
        console.log(`✅ ${n} games × ${sfConfigs.length} opponent(s) = ${n * sfConfigs.length} total games`);
    } else {
        console.log(`\n✅ ${fenList.length} position(s) × ${sfConfigs.length} opponent(s) = ${n} total games`);
    }

    rl.close();

    await runCore(sfConfigs, n, selectedLevel, fenReplayMode, fenList);
}

// ── CLI entry point ──────────────────────────────────────────────────────
// Interactive: node arena_tournament.js
// Batch (depth): node arena_tournament.js --batch --depth 7 --games 20
// Batch (UCI_Elo 20g dev, ~4h at Wizard): node arena_tournament.js --batch --sf-mode uci_elo --sf-value 1750 --games 20
// Batch (UCI_Elo 40g release, ~7.5h at Wizard): node arena_tournament.js --batch --sf-mode uci_elo --sf-value 1750 --games 40
// Batch (Skill):   node arena_tournament.js --batch --sf-mode skill_level --sf-value 3 --games 20
const _args = process.argv.slice(2);
if (_args.includes('--batch')) {
    const _get = (f, d) => { const i = _args.indexOf(f); return i >= 0 && _args[i + 1] ? _args[i + 1] : d; };
    const _n      = Math.max(2, parseInt(_get('--games', '20')) || 20);
    const _level  = _get('--level', 'grandmaster');
    const _html   = _get('--html', null);
    if (_html) CONFIG.htmlFile = path.resolve(__dirname, _html);

    // Build sfConfigs from CLI args
    let _sfConfigs;
    const _sfMode = _get('--sf-mode', 'depth');
    if (_sfMode === 'uci_elo') {
        const _vals = _get('--sf-value', '1750').split(',').map(x => Math.min(3190, Math.max(1320, parseInt(x.trim()))));
        _sfConfigs = _vals.map(v => ({ mode: 'uci_elo', value: v }));
    } else if (_sfMode === 'skill_level') {
        const _vals = _get('--sf-value', '3').split(',').map(x => Math.min(20, Math.max(0, parseInt(x.trim()))));
        _sfConfigs = _vals.map(v => ({ mode: 'skill_level', value: v }));
    } else {
        // depth mode (default — also handles legacy --depth flag)
        const _depths = _get('--depth', _get('--sf-value', '7')).split(',').map(x => parseInt(x.trim())).filter(d => d >= 1 && d <= 20);
        _sfConfigs = _depths.map(d => ({ mode: 'depth', value: d }));
    }

    console.log('\u2554' + '\u2550'.repeat(62) + '\u2557');
    console.log('\u2551       \ud83c\udfc6 TOURNAMENT v2 \u2014 Airin vs Stockfish \ud83c\udfc6          \u2551');
    console.log('\u255a' + '\u2550'.repeat(62) + '\u255d');
    console.log(`\ud83d� Batch mode: ${_n} games \u00d7 [${_sfConfigs.map(c => sfConfigTag(c)).join('/')}] | level:${_level}`);
    _sfConfigs.forEach(c => console.log(`   ${sfConfigLabel(c)}`));

    runCore(_sfConfigs, _n, _level, false, []).catch(console.error);
} else {
    runTournament().catch(console.error);
}