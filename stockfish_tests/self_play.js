const puppeteer = require('puppeteer');
const { Chess } = require('chess.js');
const path = require('path');
const fs = require('fs');

// ═══════════════════════════════════════════════════════════════
// 🥊 SELF-PLAY — Airin candidate vs baseline
//    Machine-independent relative patch validation.
//    Both engines run on the same hardware under identical conditions.
//
//    Usage:
//      node self_play.js                                  ← interactive
//      node self_play.js --batch --games 20 --time 5000
//      node self_play.js --batch --candidate ../mChess.html \
//                        --baseline mChess_baseline_v2.24.0.html \
//                        --games 20 --time 5000 --level grandmaster
//
//    Output: selfplay_{cVer}_vs_{bVer}_{time}s_{N}g_{ts}.json
//    Interpretation:
//      Relative ELO = 400 * log10(score / (1-score))
//      If baseline ELO is known (~1830), candidate ELO ≈ 1830 + relative ELO
// ═══════════════════════════════════════════════════════════════

// Known baseline ELO — update if a new canonical run changes the reference
const BASELINE_ELO_KNOWN = 1830; // v2.23.0/v2.24.0 @ 30s vs UCI_Elo 1750 (40g PC)

const OPENING_BOOK = [
    [],
    ['e2e4'], ['d2d4'], ['c2c4'], ['g1f3'],
    ['e2e4', 'e7e5'], ['e2e4', 'c7c5'], ['e2e4', 'e7e6'], ['e2e4', 'c7c6'],
    ['d2d4', 'd7d5'], ['d2d4', 'g8f6'],
    ['e2e4', 'e7e5', 'g1f3', 'b8c6'],
    ['e2e4', 'c7c5', 'g1f3', 'd7d6'],
    ['d2d4', 'd7d5', 'c2c4'],
    ['e2e4', 'e7e5', 'g1f3', 'g8f6'],
    ['e2e4', 'e7e5', 'f1c4'],
    ['d2d4', 'g8f6', 'c2c4', 'e7e6'],
    ['e2e4', 'd7d6', 'd2d4', 'g8f6'],
    ['c2c4', 'e7e5'],
    ['g1f3', 'd7d5', 'g2g3'],
];

function readVersion(htmlPath) {
    try {
        const src = fs.readFileSync(htmlPath, 'utf8');
        const m = src.match(/<title>(?:Airin|Monolith Chess) (v[\d.]+[a-z]?)<\/title>/);
        return m ? m[1] : 'unknown';
    } catch (_) { return 'unknown'; }
}

function wilsonCI(p, n) {
    if (n === 0) return [0.5, 0.5];
    const z = 1.96;
    const center = (p + z*z / (2*n)) / (1 + z*z / n);
    const margin = z * Math.sqrt(p*(1-p)/n + z*z/(4*n*n)) / (1 + z*z / n);
    return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

function eloFromScore(p, opponentElo) {
    if (p <= 0.001) return opponentElo - 600;
    if (p >= 0.999) return opponentElo + 600;
    return Math.round(opponentElo - 400 * Math.log10((1 - p) / p));
}

async function setupPage(browser, htmlPath, timeLimitMs, level, verboseStream, pageLabel) {
    const page = await browser.newPage();
    page.on('console', msg => {
        const t = msg.text();
        const ts = new Date().toISOString().slice(11, 23);
        if (verboseStream) verboseStream.write(`[${ts}] [${pageLabel}] ${t}\n`);
        if (msg.type() === 'error') console.log(`  🌐 ERR [${pageLabel}]: ${t.slice(0, 100)}`);
        else if (t.includes('NPS:')) console.log(`   🧠 [${pageLabel}] ${t.replace(/.*?Real depth:/, 'depth:').trim()}`);
        else if (t.startsWith('📊') && t.includes('FILTER→')) console.log(`   🚨 [${pageLabel}] ${t.trim()}`);
    });
    await page.goto('file://' + htmlPath);
    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate((lvl, tl) => {
        try {
            currentDifficulty = lvl;
            const s = DIFF_SETTINGS && DIFF_SETTINGS[lvl];
            if (s) {
                aiDepth = s.depth;
                aiMistakeChance = s.mistakes;
                s.timeLimit = tl;
                aiTimeLimit = tl;
            }
            if (typeof chessEngineWorker !== 'undefined' && chessEngineWorker) {
                try { chessEngineWorker.terminate(); } catch (_) {}
                chessEngineWorker = null;
            }
            if (typeof startNewGame === 'function') {
                gameMode = 'ai'; playerColor = 'w'; startNewGame('ai');
            }
        } catch (_) {}
    }, level, timeLimitMs);
    await new Promise(r => setTimeout(r, 800));
    return page;
}

async function getMove(page, htmlPath, fen, history, positionFens, timeLimitMs, level) {
    const moveTimeoutMs = timeLimitMs * 6 + 8000; // generous ceiling

    const evalP = page.evaluate(async (f, h, p) => {
        try { return await window.askWiseKing(f, h, p); } catch (_) { return null; }
    }, fen, history, positionFens);

    const result = await Promise.race([
        evalP,
        new Promise(r => setTimeout(() => r('__TIMEOUT__'), moveTimeoutMs)),
    ]);

    if (result === '__TIMEOUT__') {
        // Reload page to clear stale worker state before next call
        await page.goto('file://' + htmlPath);
        await new Promise(r => setTimeout(r, 1500));
        await page.evaluate((lvl, tl) => {
            try {
                currentDifficulty = lvl;
                const s = DIFF_SETTINGS && DIFF_SETTINGS[lvl];
                if (s) { s.timeLimit = tl; aiTimeLimit = tl; }
                if (typeof startNewGame === 'function') {
                    gameMode = 'ai'; playerColor = 'w'; startNewGame('ai');
                }
            } catch (_) {}
        }, level, timeLimitMs);
        await new Promise(r => setTimeout(r, 800));
        return null;
    }
    return result;
}

async function playGame(gameNum, total, candidatePage, candidateHtml, baselinePage, baselineHtml,
                        candidateColor, opening, timeLimitMs, gameTimeoutMs, level) {
    const openingStr = opening.length ? opening.join(' ') : 'start';
    console.log(`\n${'─'.repeat(62)}`);
    console.log(`🥊 Game ${gameNum}/${total}  🆕=${candidateColor === 'w' ? '⬜' : '⬛'}  Opening:[${openingStr}]`);
    console.log('─'.repeat(62));

    const game = new Chess();
    let reason = 'unknown';

    for (const uci of opening) {
        try { game.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci[4] || 'q' }); }
        catch (_) { break; }
    }

    const gameStart = Date.now();

    while (!game.isGameOver()) {
        if (Date.now() - gameStart > gameTimeoutMs) { reason = 'game_timeout'; break; }

        const fen = game.fen();
        const currentColor = game.turn();
        const isCandidate = currentColor === candidateColor;
        const page = isCandidate ? candidatePage : baselinePage;
        const htmlPath = isCandidate ? candidateHtml : baselineHtml;
        const label = isCandidate ? '🆕 New  ' : '📦 Base ';

        const t0 = Date.now();
        const fenHist = game.history({ verbose: true }).map(m => m.after);
        const move = await getMove(page, htmlPath, fen, game.history(), fenHist, timeLimitMs, level);
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

        if (!move || move === 'null') {
            reason = isCandidate ? 'candidate_no_move' : 'baseline_no_move';
            break;
        }

        console.log(`   ${label} ${move}  (${elapsed}s)`);

        try {
            game.move({ from: move.slice(0,2), to: move.slice(2,4), promotion: move[4] || 'q' });
        } catch (_) {
            console.error(`❌ Illegal move: ${move} (${isCandidate ? 'candidate' : 'baseline'})`);
            reason = isCandidate ? 'candidate_illegal' : 'baseline_illegal';
            break;
        }
    }

    let result;
    if (game.isCheckmate()) {
        result = game.turn() !== candidateColor ? 'candidate_win' : 'baseline_win';
        reason = 'checkmate';
    } else if (game.isDraw()) {
        result = 'draw';
        if (game.isStalemate()) reason = 'stalemate';
        else if (game.isThreefoldRepetition()) reason = 'repetition';
        else if (game.isInsufficientMaterial()) reason = 'insufficient_material';
        else reason = '50_moves';
    } else if (reason === 'candidate_illegal' || reason === 'candidate_no_move') {
        result = 'baseline_win';
    } else if (reason === 'baseline_illegal' || reason === 'baseline_no_move') {
        result = 'candidate_win';
    } else {
        result = 'draw';
    }

    const resultStr = result === 'candidate_win' ? '✅ New wins'
        : result === 'baseline_win' ? '❌ Baseline wins'
        : '🤝 Draw';
    console.log(`\n${resultStr}  reason:${reason}  moves:${game.history().length}`);

    return { result, candidateColor, moves: game.history().length, reason, pgn: game.pgn() };
}

async function run(cfg) {
    const { candidateHtml, baselineHtml, numGames, timeLimitMs, level } = cfg;

    const candidateVer = readVersion(candidateHtml);
    const baselineVer  = readVersion(baselineHtml);
    const gameTimeoutMs = Math.max(1800000, timeLimitMs * 120); // 30 min min, or ~120 moves * timeLimit

    console.log('╔' + '═'.repeat(62) + '╗');
    console.log('║       🥊 SELF-PLAY — candidate vs baseline 🥊           ║');
    console.log('╚' + '═'.repeat(62) + '╝');
    console.log(`  🆕 Candidate : ${candidateVer}  (${path.basename(candidateHtml)})`);
    console.log(`  📦 Baseline  : ${baselineVer}  (${path.basename(baselineHtml)})`);
    console.log(`  ⏱️  Time/move : ${timeLimitMs}ms  |  Games: ${numGames}  |  Level: ${level}`);
    const estMin = Math.round(numGames * 35 * timeLimitMs / 1000 / 60);
    console.log(`  📐 Estimated : ~${estMin} min  (assumes ~35 half-moves/game)`);
    console.log(`  📌 Baseline ELO reference: ~${BASELINE_ELO_KNOWN} (canonical 40g PC tournament)\n`);

    const ts = new Date().toISOString().replace('T','_').replace(/[:.]/g,'').slice(0,15);
    const outFile = path.join(__dirname,
        `selfplay_${candidateVer}_vs_${baselineVer}_${timeLimitMs/1000}s_${numGames}g_${ts}.json`);
    const verboseFile = outFile.replace('.json', `_verbose_${ts}.log`);
    const verboseStream = fs.createWriteStream(verboseFile, { encoding: 'utf8' });
    verboseStream.write(`# Self-play verbose log — ${new Date().toISOString()}\n`);
    verboseStream.write(`# 🆕 ${candidateVer} vs 📦 ${baselineVer} | ${timeLimitMs}ms/move | ${numGames} games\n\n`);

    const allGames = [];
    let cWins = 0, bWins = 0, draws = 0;

    const saveResult = (done = false) => {
        const n = allGames.length;
        const score = n > 0 ? (cWins + 0.5*draws) / n : 0.5;
        const [ciLo, ciHi] = wilsonCI(score, n);
        const relElo  = eloFromScore(score, 0);
        const absElo  = BASELINE_ELO_KNOWN + relElo;
        const eloLo   = BASELINE_ELO_KNOWN + eloFromScore(ciLo, 0);
        const eloHi   = BASELINE_ELO_KNOWN + eloFromScore(ciHi, 0);
        try {
            fs.writeFileSync(outFile, JSON.stringify({
                timestamp: new Date().toISOString(),
                status: done ? 'complete' : `partial_${n}_of_${numGames}`,
                config: { candidateVer, baselineVer, numGames, timeLimitMs, level,
                          baselineEloKnown: BASELINE_ELO_KNOWN },
                summary: {
                    games: n, candidateWins: cWins, baselineWins: bWins, draws,
                    score: score.toFixed(3),
                    relativeElo: relElo,
                    candidateEloEstimate: absElo,
                    eloCI95: [eloLo, eloHi],
                    whiteStats: {
                        cWins: allGames.filter(g => g.candidateColor==='w' && g.result==='candidate_win').length,
                        cLoss: allGames.filter(g => g.candidateColor==='w' && g.result==='baseline_win').length,
                        cDraw: allGames.filter(g => g.candidateColor==='w' && g.result==='draw').length,
                    },
                    blackStats: {
                        cWins: allGames.filter(g => g.candidateColor==='b' && g.result==='candidate_win').length,
                        cLoss: allGames.filter(g => g.candidateColor==='b' && g.result==='baseline_win').length,
                        cDraw: allGames.filter(g => g.candidateColor==='b' && g.result==='draw').length,
                    },
                },
                games: allGames,
            }, null, 2));
        } catch (e) { console.error('⚠️  Save failed:', e.message); }
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
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
        ],
    });

    process.on('SIGINT', async () => {
        console.log('\n\n⚠️  Interrupted! Saving partial results...');
        saveResult(false);
        console.log(`💾 ${path.basename(outFile)}`);
        try { verboseStream.end(); } catch (_) {}
        try { await browser.close(); } catch (_) {}
        process.exit(0);
    });

    try {
        console.log('🌐 Loading candidate page...');
        const candidatePage = await setupPage(browser, candidateHtml, timeLimitMs, level, verboseStream, '🆕');
        console.log('   ✅ Candidate ready');

        console.log('🌐 Loading baseline page...');
        const baselinePage = await setupPage(browser, baselineHtml, timeLimitMs, level, verboseStream, '📦');
        console.log('   ✅ Baseline ready');
        console.log('\n🚀 Starting self-play...\n');

        for (let i = 0; i < numGames; i++) {
            const candidateColor = i % 2 === 0 ? 'w' : 'b';
            const opening = OPENING_BOOK[i % OPENING_BOOK.length];

            verboseStream.write(`\n${'='.repeat(60)}\n`);
            verboseStream.write(`=== Game ${i+1}/${numGames} | 🆕=${candidateColor} | Opening:[${opening.join(' ') || 'start'}] ===\n`);
            verboseStream.write(`${'='.repeat(60)}\n`);

            const gameResult = await playGame(
                i + 1, numGames,
                candidatePage, candidateHtml,
                baselinePage, baselineHtml,
                candidateColor, opening, timeLimitMs, gameTimeoutMs, level
            );

            allGames.push({ gameNum: i+1, ...gameResult, ts: new Date().toISOString() });
            if (gameResult.result === 'candidate_win') cWins++;
            else if (gameResult.result === 'baseline_win') bWins++;
            else draws++;

            const n = allGames.length;
            const score = (cWins + 0.5*draws) / n;
            const relElo = eloFromScore(score, 0);
            console.log(`   💾 W:${cWins} L:${bWins} D:${draws} | ${(score*100).toFixed(1)}% | ΔElo:${relElo >= 0 ? '+' : ''}${relElo} | est.~${BASELINE_ELO_KNOWN + relElo}`);

            saveResult(false);
            await new Promise(r => setTimeout(r, 1000));
        }
    } finally {
        await browser.close();
    }

    // Final report
    const n = allGames.length;
    const score = n > 0 ? (cWins + 0.5*draws) / n : 0.5;
    const [ciLo, ciHi] = wilsonCI(score, n);
    const relElo = eloFromScore(score, 0);
    const absElo = BASELINE_ELO_KNOWN + relElo;
    const eloLo  = BASELINE_ELO_KNOWN + eloFromScore(ciLo, 0);
    const eloHi  = BASELINE_ELO_KNOWN + eloFromScore(ciHi, 0);

    const cwW = allGames.filter(g => g.candidateColor==='w' && g.result==='candidate_win').length;
    const clW = allGames.filter(g => g.candidateColor==='w' && g.result==='baseline_win').length;
    const cdW = allGames.filter(g => g.candidateColor==='w' && g.result==='draw').length;
    const cwB = allGames.filter(g => g.candidateColor==='b' && g.result==='candidate_win').length;
    const clB = allGames.filter(g => g.candidateColor==='b' && g.result==='baseline_win').length;
    const cdB = allGames.filter(g => g.candidateColor==='b' && g.result==='draw').length;

    console.log('\n\n' + '═'.repeat(62));
    console.log('🏆 FINAL SELF-PLAY RESULT');
    console.log('═'.repeat(62));
    console.log(`  🆕 ${candidateVer}  vs  📦 ${baselineVer}`);
    console.log(`  Games: ${n} | W:${cWins} L:${bWins} D:${draws}`);
    console.log(`  As White → W:${cwW} L:${clW} D:${cdW}`);
    console.log(`  As Black → W:${cwB} L:${clB} D:${cdB}`);
    console.log(`  Score: ${(score*100).toFixed(1)}%`);
    console.log(`  Relative ELO: ${relElo >= 0 ? '+' : ''}${relElo} vs baseline`);
    console.log(`  Candidate ELO estimate: ~${absElo}  [95%CI: ${eloLo}..${eloHi}]`);
    console.log(`  (Baseline reference: ~${BASELINE_ELO_KNOWN} from canonical 40g PC run)`);
    if (score > 0.5) console.log(`\n  ✅ Candidate is stronger than baseline at ${timeLimitMs/1000}s`);
    else if (score < 0.5) console.log(`\n  ❌ Candidate is weaker than baseline at ${timeLimitMs/1000}s`);
    else console.log(`\n  🤝 Candidate is statistically equal to baseline at ${timeLimitMs/1000}s`);

    saveResult(true);
    verboseStream.end();
    console.log(`\n💾 ${path.basename(outFile)}`);
    console.log(`📝 ${path.basename(verboseFile)}`);
}

// ── Entry point ──────────────────────────────────────────────
const _args = process.argv.slice(2);
const _get = (flag, def) => { const i = _args.indexOf(flag); return i >= 0 && _args[i+1] ? _args[i+1] : def; };

if (_args.includes('--batch')) {
    run({
        candidateHtml: path.resolve(__dirname, _get('--candidate', '../mChess.html')),
        baselineHtml:  path.resolve(__dirname, _get('--baseline',  'mChess_baseline_v2.24.0.html')),
        numGames:      Math.max(2, parseInt(_get('--games', '20')) || 20),
        timeLimitMs:   Math.max(1000, parseInt(_get('--time', '5000')) || 5000),
        level:         _get('--level', 'grandmaster'),
    }).catch(console.error);
} else {
    // Interactive mode
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = q => new Promise(r => rl.question(q, r));

    (async () => {
        console.log('╔' + '═'.repeat(62) + '╗');
        console.log('║       🥊 SELF-PLAY — candidate vs baseline 🥊           ║');
        console.log('╚' + '═'.repeat(62) + '╝\n');

        const candidateAns = (await ask('Candidate HTML (enter=../mChess.html): ')).trim();
        const baselineAns  = (await ask('Baseline HTML  (enter=mChess_baseline_v2.24.0.html): ')).trim();
        const gamesAns     = (await ask('Games          (enter=20): ')).trim();
        const timeAns      = (await ask('Time/move ms   (enter=5000): ')).trim();
        const levelAns     = (await ask('Level          (enter=grandmaster): ')).trim();
        rl.close();

        run({
            candidateHtml: path.resolve(__dirname, candidateAns || '../mChess.html'),
            baselineHtml:  path.resolve(__dirname, baselineAns  || 'mChess_baseline_v2.24.0.html'),
            numGames:      Math.max(2, parseInt(gamesAns) || 20),
            timeLimitMs:   Math.max(1000, parseInt(timeAns) || 5000),
            level:         levelAns || 'grandmaster',
        }).catch(console.error);
    })();
}
