const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const { Chess } = require('chess.js');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// ═══════════════════════════════════════════════════════════════
// 🏆 TOURNAMENT v2 — mChess vs Stockfish
//    Fixes: color alternation, sample size, opening variety,
//           multi-depth bracketing, phase tracking, CI output
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
    numGames: 20,      // minimum for ±76 ELO precision
    depths: [7, 8],  // bracket with two depths (override at runtime)
    htmlFile: path.join(__dirname, '../mChess.html'),
    stockfishPath: process.env.STOCKFISH_PATH || path.join(__dirname, '..', 'stockfish'),
    logFile: path.join(__dirname, 'tournament_latest_results.json'),
    moveTimeoutMs: 90000,   // 45s max per mChess move
    gameTimeoutMs: 3600000, // 1h per game
};

// ELO map (Lichess-calibrated approximations)
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

// ── Blunder detection ────────────────────────────────────────
// A blunder = non-pawn, non-capture mChess move where the piece
// is captured within 3 half-moves for a net loss of ≥ 2 pts.
const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function detectBlunders(pgn, mChessColor) {
    if (!pgn) return [];
    const chess = new Chess();
    try { chess.loadPgn(pgn); } catch (_) { return []; }
    const moves = chess.history({ verbose: true });
    const blunders = [];
    for (let i = 0; i < moves.length; i++) {
        const mv = moves[i];
        if (mv.color !== mChessColor) continue;
        if (mv.piece === 'p') continue;
        if (mv.captured) continue;
        const pieceVal = PIECE_VALUES[mv.piece] || 0;
        if (pieceVal < 2) continue;
        const destSq = mv.to;
        let capturedBy = null, capturedAtIdx = -1;
        for (let j = 1; j <= 3 && i + j < moves.length; j++) {
            const nx = moves[i + j];
            if (nx.color !== mChessColor && nx.to === destSq && nx.captured) {
                capturedBy = nx; capturedAtIdx = i + j; break;
            }
        }
        if (!capturedBy) continue;
        let recaptureVal = 0;
        for (let j = capturedAtIdx + 1; j <= capturedAtIdx + 2 && j < moves.length; j++) {
            const rc = moves[j];
            if (rc.color === mChessColor && rc.to === destSq && rc.captured) {
                recaptureVal = PIECE_VALUES[capturedBy.piece] || 0; break;
            }
        }
        const netLoss = pieceVal - recaptureVal;
        if (netLoss >= 2) {
            const moveNum = Math.floor(i / 2) + 1;
            blunders.push({
                moveNum, san: mv.san, piece: mv.piece, pieceVal, netLoss,
                phase: moveNum <= 15 ? 'opening' : (moveNum <= 40 ? 'middlegame' : 'endgame'),
            });
        }
    }
    return blunders;
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
    constructor(depth) {
        this.depth = depth;
        this.sfELO = sfELO(depth);
        this.games = [];
        this.npsLog = []; // NPS samples per move, for average
        this.wW = 0; this.wB = 0; // wins as white / black
        this.lW = 0; this.lB = 0; // losses
        this.dW = 0; this.dB = 0; // draws
    }
    add(result, mChessColor, moves, reason, pgn, phase) {
        const blunders = detectBlunders(pgn, mChessColor);
        this.games.push({
            result, mChessColor, moves, reason, pgn, phase,
            blunders,
            ts: new Date().toISOString()
        });
        const w = mChessColor === 'w';
        if (result === 'mchess_win') { if (w) this.wW++; else this.wB++; }
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
        console.log(`\n  📊 Stockfish d${this.depth} (~${this.sfELO} ELO)`);
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
        const allBlunders = this.games.flatMap(g => g.blunders || []);
        const openingBlunders = allBlunders.filter(b => b.phase === 'opening').length;
        console.log(`     Blunders: ${allBlunders.length} total (${(allBlunders.length / this.total()).toFixed(2)}/game), ${openingBlunders} opening`);
        if (allBlunders.length > 0) {
            const worst = [...allBlunders].sort((a, b) => b.netLoss - a.netLoss).slice(0, 3);
            worst.forEach(b => console.log(`       ↳ Move ${b.moveNum}: ${b.san} (lost ${b.netLoss}pts, ${b.phase})`));
        }
    }
}

// ── Stockfish wrapper ────────────────────────────────────────
function spawnSF() {
    const sf = spawn(CONFIG.stockfishPath, { stdio: ['pipe', 'pipe', 'pipe'] });
    sf.on('error', () => {});
    sf.stdin.on('error', () => {});
    sf.stdout.on('error', () => {});
    sf.stdin.write('uci\n');
    return sf;
}
function sfBestMove(sf, fen, depth) {
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
        sf.stdin.write(`go depth ${depth}\n`);
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

async function evalMove(page, fen, history, timeoutMs) {
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
                    if (lvl === 'grandmaster') s.timeLimit = 30000;
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

    const evalP = page.evaluate(async (f, h) => {
        try { return await window.askWiseKing(f, h); } catch (e) { return null; }
    }, fen, history);

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
async function playGame(gameNum, totalGames, mChessColor, opening, depth, stats, page, startFen = null) {
    const colorStr = mChessColor === 'w' ? '⬜White' : '⬛Black';
    const openingStr = startFen ? `FEN: ${startFen.slice(0, 40)}…` : (opening.length ? opening.join(' ') : 'start');
    console.log(`\n${'─'.repeat(62)}`);
    console.log(`🎮 Game ${gameNum}/${totalGames}  mChess=${colorStr}  ${startFen ? '📌 FEN replay' : `Opening:[${openingStr}]`}  SF:d${depth}`);
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

    const sf = spawnSF();
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
            const isMChess = (currentColor === mChessColor);
            let move = null;

            if (isMChess) {
                // mChess moves — use evalMove() to safely handle timeouts
                // and prevent concurrent askWiseKing calls (which corrupt its result)
                const t0 = Date.now();
                move = await evalMove(page, fen, game.history(), CONFIG.moveTimeoutMs);

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
                console.log(`   👑 mChess ${move || 'null'} (${elapsed}s)${dStr}${npsStr}`);
                if (depth_info && depth_info.nps > 0) stats.npsLog.push(depth_info.nps);
            } else {
                // Stockfish moves
                move = await sfBestMove(sf, fen, depth);
                console.log(`   🐟 SF     ${move}`);
            }

            if (!move || move === 'null') {
                reason = isMChess ? 'mchess_no_move' : 'sf_no_move';
                break;
            }

            try {
                game.move({
                    from: move.slice(0, 2), to: move.slice(2, 4),
                    promotion: move[4] || 'q'
                });
                phase = detectPhase(game);
            } catch (e) {
                console.error(`❌ Illegal: ${move} (${isMChess ? 'mChess' : 'SF'})`);
                reason = isMChess ? 'mchess_illegal' : 'sf_illegal';
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
        result = (game.turn() !== mChessColor) ? 'mchess_win' : 'sf_win';
        reason = 'checkmate';
    } else if (game.isDraw()) {
        result = 'draw';
        if (game.isStalemate()) reason = 'stalemate';
        else if (game.isThreefoldRepetition()) reason = 'repetition';
        else if (game.isInsufficientMaterial()) reason = 'insufficient_material';
        else reason = '50_moves';
    } else if (reason === 'mchess_illegal' || reason === 'mchess_no_move') {
        result = 'sf_win';
    } else if (reason === 'sf_illegal' || reason === 'sf_no_move') {
        result = 'mchess_win';
    } else {
        result = 'draw';
    }

    const resultStr = result === 'mchess_win' ? '✅ mChess wins'
        : result === 'sf_win' ? '❌ Stockfish wins'
            : '🤝 Draw';
    console.log(`\n${resultStr}  reason:${reason}  moves:${game.history().length}  phase:${phase}`);

    stats.add(result, mChessColor, game.history().length, reason, game.pgn(), phase);
}

// ── Core tournament runner (shared by interactive and batch modes) ────────
async function runCore(depths, n, selectedLevel, fenReplayMode = false, fenList = []) {
    CONFIG.numGames = n;
    CONFIG.depths = depths;
    CONFIG.selectedLevel = selectedLevel;

    // Extract mChess version from HTML title tag (e.g. "Monolith Chess v2.25.32" → "v2.25.32")
    let mchessVer = '';
    try {
        const htmlSrc = fs.readFileSync(CONFIG.htmlFile, 'utf8');
        const m = htmlSrc.match(/<title>Monolith Chess (v[\d.]+)<\/title>/);
        if (m) mchessVer = '_' + m[1];
    } catch (_) {}
    const modeTag = (fenReplayMode && fenList.length > 0) ? '_fenreplay' : '';
    const gameCount = fenReplayMode && fenList.length > 0 ? fenList.length : n;
    CONFIG.logFile = path.join(__dirname, `tournament_mChess${mchessVer}_d${depths.join('_')}_${gameCount}g${modeTag}.json`);

    console.log(`\n🔧 Config: ${fenReplayMode && fenList.length > 0 ? fenList.length + ' FENs' : n + ' games'} × ${depths.length} depth(s)`);
    depths.forEach(d => console.log(`   d${d} → ~${sfELO(d)} ELO`));

    const estMinPerGame = 6; // conservative estimate
    const estTotal = n * depths.length * estMinPerGame;
    console.log(`\n⏱️  Estimated time: ~${estTotal} min (~${(estTotal / 60).toFixed(1)}h)`);
    console.log(`💾 Results will save to: ${CONFIG.logFile}`);
    console.log('✅ Partial save after every game — safe to interrupt anytime (Ctrl+C)\n');
    console.log('🚀 Starting tournament...\n');
    const statsMap = {};
    depths.forEach(d => { statsMap[d] = new DepthStats(d); });

    // ── Partial save helper — called after every game ─────────────────
    const savePartial = (gameNum, total, done = false) => {
        try {
            const allGamesFlat = depths.flatMap(d => statsMap[d].games);
            const totalW = allGamesFlat.filter(g => g.result === 'mchess_win').length;
            const totalD = allGamesFlat.filter(g => g.result === 'draw').length;
            const totalL = allGamesFlat.filter(g => g.result === 'sf_win').length;
            const totalN = allGamesFlat.length;
            fs.writeFileSync(CONFIG.logFile, JSON.stringify({
                timestamp: new Date().toISOString(),
                status: done ? 'complete' : `partial_${gameNum}_of_${total}`,
                config: { numGames: n, depths },
                byDepth: Object.fromEntries(depths.map(d => {
                    const dBlunders = statsMap[d].games.flatMap(g => g.blunders || []);
                    return [d, {
                        sfELO: sfELO(d),
                        estimatedELO: statsMap[d].estimateELO(),
                        eloCI: statsMap[d].eloCI(),
                        score: statsMap[d].score(),
                        wins: statsMap[d].wins(),
                        losses: statsMap[d].losses(),
                        draws: statsMap[d].draws(),
                        blunders: {
                            total: dBlunders.length,
                            perGame: statsMap[d].total() > 0 ? +(dBlunders.length / statsMap[d].total()).toFixed(2) : 0,
                            opening: dBlunders.filter(b => b.phase === 'opening').length,
                            middlegame: dBlunders.filter(b => b.phase === 'middlegame').length,
                            endgame: dBlunders.filter(b => b.phase === 'endgame').length,
                        },
                        games: statsMap[d].games,
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
        protocolTimeout: 120000,
        args: [
            '--allow-file-access-from-files',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            // ── Prevent Chrome from throttling background tabs / workers ──
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
        if (msg.type() === 'error') console.log('🌐 Error:', t.slice(0, 120));
        else if (t.includes('NPS:')) console.log('   🧠', t.replace(/.*?Real depth:/, 'depth:').trim());
        else if (t.includes('Book exit')) console.log('   ⚠️  ' + t);
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
                // Patch DIFF_SETTINGS directly — askWiseKing reads it, not aiTimeLimit
                if (level === 'grandmaster') s.timeLimit = 30000;
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
        depths.forEach(d => { if (statsMap[d].total() > 0) statsMap[d].print(); });
        try { await browser.close(); } catch (_) { }
        process.exit(0);
    });

    try {
        // Build game list
        const allGames = [];
        for (const depth of depths) {
            if (fenReplayMode && fenList.length > 0) {
                // FEN replay: one game per FEN entry
                for (const { fen, mChessColor } of fenList) {
                    allGames.push({ depth, mChessColor, opening: [], startFen: fen });
                }
            } else {
                // Normal tournament: alternate colors, rotate openings
                const gamesPerDepth = Math.floor(n / depths.length);
                for (let i = 0; i < gamesPerDepth; i++) {
                    allGames.push({
                        depth,
                        mChessColor: i % 2 === 0 ? 'w' : 'b',
                        opening: OPENING_BOOK[i % OPENING_BOOK.length],
                        startFen: null,
                    });
                }
            }
        }

        const total = allGames.length;
        for (let i = 0; i < allGames.length; i++) {
            const { depth, mChessColor, opening, startFen } = allGames[i];
            try {
                await playGame(i + 1, total, mChessColor, opening, depth, statsMap[depth], sharedPage, startFen);
            } catch (err) {
                console.error(`\n💥 Game ${i + 1} crashed:`, err.message);
                statsMap[depth].add('draw', mChessColor, 0, 'crash', '', 'unknown');
            }
            // 💾 Save partial results after every game
            savePartial(i + 1, total, false);
            const gs = statsMap[depth];
            if (gs.total() > 0) {
                const lastGame = gs.games[gs.games.length - 1];
                const gameBlunders = (lastGame.blunders || []).length;
                const totalBlunders = gs.games.flatMap(g => g.blunders || []).length;
                console.log(`   💾 Saved: W:${gs.wins()} L:${gs.losses()} D:${gs.draws()} | ELO ~${gs.estimateELO()} [${gs.eloCI()[0]}..${gs.eloCI()[1]}] | blunders this game:${gameBlunders} total:${totalBlunders}`);
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
    depths.forEach(d => statsMap[d].print());

    // Combined ELO estimate (weighted by game count)
    const allGamesFlat = depths.flatMap(d => statsMap[d].games);
    const totalW = allGamesFlat.filter(g => g.result === 'mchess_win').length;
    const totalD = allGamesFlat.filter(g => g.result === 'draw').length;
    const totalN = allGamesFlat.length;
    if (totalN > 0 && depths.length > 1) {
        const score = (totalW + 0.5 * totalD) / totalN;
        const avgSfELO = depths.reduce((s, d) => s + sfELO(d) * statsMap[d].total(), 0) / totalN;
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
}

// ── Interactive tournament runner ────────────────────────────────────────
async function runTournament() {
    console.log('╔' + '═'.repeat(62) + '╗');
    console.log('║       🏆 TOURNAMENT v2 — mChess vs Stockfish 🏆          ║');
    console.log('╚' + '═'.repeat(62) + '╝');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = q => new Promise(r => rl.question(q, r));

    // ── Mode selection ────────────────────────────────────────
    console.log('\nSelect mode:');
    console.log('  1) Normal tournament  (full games from opening)');
    console.log('  2) FEN replay         (reproduce specific positions)');
    const modeAns = (await ask('Choose 1-2 (enter=1): ')).trim();
    const fenReplayMode = modeAns === '2';

    // ── mChess level ─────────────────────────────────────────
    console.log('\nSelect mChess level:');
    console.log('  1) Chick       (easy)');
    console.log('  2) Student     (medium)');
    console.log('  3) Wizard      (hard)');
    console.log('  4) Wise King   (grandmaster) ← recommended');
    const levelAns = (await ask('Choose 1-4 (enter=4): ')).trim();
    const LEVEL_MAP = { '1': 'easy', '2': 'medium', '3': 'hard', '4': 'grandmaster' };
    const selectedLevel = LEVEL_MAP[levelAns] || 'grandmaster';
    console.log(`✅ mChess level: ${selectedLevel}`);

    // ── HTML file ─────────────────────────────────────────────
    console.log('\nPath to mChess HTML file:');
    console.log('  (leave blank to use default: ../mChess.html)');
    const htmlAns = (await ask('HTML path: ')).trim();
    if (htmlAns) CONFIG.htmlFile = path.resolve(__dirname, htmlAns);
    console.log(`✅ File: ${CONFIG.htmlFile}`);

    // ── Stockfish depths ──────────────────────────────────────
    console.log('\nSelect Stockfish depth(s) — lower = weaker = more accurate ELO estimate:');
    console.log('  d5  → ~1600 ELO  (if mChess wins too many at d7)');
    console.log('  d6  → ~1750 ELO');
    console.log('  d7  → ~1900 ELO  ← recommended baseline');
    console.log('  d8  → ~2000 ELO  ← recommended for strong versions');
    console.log('  d9  → ~2100 ELO');
    console.log('  d10 → ~2200 ELO  (very strong, mostly losses)');
    console.log('  You can enter multiple depths: e.g. 7,8');
    const depthAns = (await ask('Depth(s) 1-15 (enter=7): ')).trim();
    const depths = depthAns
        ? depthAns.split(',').map(x => parseInt(x.trim())).filter(d => d >= 1 && d <= 20)
        : [7];
    depths.forEach(d => console.log(`✅ Stockfish d${d} → ~${sfELO(d)} ELO`));

    // ── FEN replay: load positions ────────────────────────────
    let fenList = []; // { fen, mChessColor }
    if (fenReplayMode) {
        console.log('\n📌 FEN REPLAY MODE');
        console.log('  Enter one FEN per line. Format: <FEN> [w|b]');
        console.log('  The color (w/b) is who mChess plays AS in that position.');
        console.log('  If omitted, mChess plays the side to move in the FEN.');
        console.log('  Or enter a path to a JSON file: [{ "fen": "...", "color": "w" }, ...]');
        console.log('  Leave blank and press Enter to finish.\n');
        const firstLine = (await ask('FEN / JSON file path: ')).trim();
        if (firstLine.endsWith('.json')) {
            const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, firstLine), 'utf8'));
            fenList = raw.map(e => ({ fen: e.fen, mChessColor: e.color || e.fen.split(' ')[1] }));
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
                return { fen, mChessColor: color };
            });
            console.log(`✅ ${fenList.length} position(s) loaded`);
        }
        if (fenList.length === 0) {
            console.log('⚠️  No FENs entered — switching to normal tournament mode.');
        }
    }

    // ── Number of games (normal mode only) ───────────────────
    let n = fenList.length > 0 ? fenList.length * depths.length : 0;
    if (!fenReplayMode || fenList.length === 0) {
        console.log('\nNumber of games per depth:');
        console.log('  10 games → ±108 ELO precision  (~50-90 min on average PC)');
        console.log('  20 games → ±76  ELO precision  (~2-3h)   ← recommended');
        const nAns = (await ask('Games per depth (enter=10): ')).trim();
        n = Math.max(2, parseInt(nAns) || 10);
        console.log(`✅ ${n} games × ${depths.length} depth(s) = ${n * depths.length} total games`);
    } else {
        console.log(`\n✅ ${fenList.length} position(s) × ${depths.length} depth(s) = ${n} total games`);
    }

    rl.close();

    await runCore(depths, n, selectedLevel, fenReplayMode, fenList);
}

// ── CLI entry point ──────────────────────────────────────────────────────
// Interactive: node arena_tournament.js
// Batch:       node arena_tournament.js --batch --depth 7 --games 30 [--level grandmaster] [--html path]
const _args = process.argv.slice(2);
if (_args.includes('--batch')) {
    const _get = (f, d) => { const i = _args.indexOf(f); return i >= 0 && _args[i + 1] ? _args[i + 1] : d; };
    const _depths = _get('--depth', '7').split(',').map(x => parseInt(x.trim())).filter(d => d >= 1 && d <= 20);
    const _n      = Math.max(2, parseInt(_get('--games', '20')) || 20);
    const _level  = _get('--level', 'grandmaster');
    const _html   = _get('--html', null);
    if (_html) CONFIG.htmlFile = path.resolve(__dirname, _html);

    console.log('╔' + '═'.repeat(62) + '╗');
    console.log('║       🏆 TOURNAMENT v2 — mChess vs Stockfish 🏆          ║');
    console.log('╚' + '═'.repeat(62) + '╝');
    console.log(`🚀 Batch mode: ${_n} games × d${_depths.join('/')} | level:${_level}`);

    runCore(_depths, _n, _level, false, []).catch(console.error);
} else {
    runTournament().catch(console.error);
}