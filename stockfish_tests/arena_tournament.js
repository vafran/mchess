const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const { Chess } = require('chess.js');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// ═══════════════════════════════════════════════════════════════
// 🏆 AUTOMATED TOURNAMENT: mChess vs Stockfish
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
    numPartidas: 5,             
    stockfishDepth: 10,        // overridden at runtime by user input
    timePerGame: 3600000,
    logFile: path.join(__dirname, 'tournament_results.json')
};

// Calibrated ELO per Stockfish depth (approximate Lichess equivalents)
const STOCKFISH_ELO_BY_DEPTH = {
    1: 900,  2: 1100, 3: 1300, 4: 1450, 5: 1600,
    6: 1750, 7: 1900, 8: 2000, 9: 2100, 10: 2200,
    12: 2350, 15: 2500, 18: 2700, 20: 2800
};
function stockfishELOForDepth(d) {
    if (STOCKFISH_ELO_BY_DEPTH[d]) return STOCKFISH_ELO_BY_DEPTH[d];
    // interpolate for unlisted depths
    const keys = Object.keys(STOCKFISH_ELO_BY_DEPTH).map(Number).sort((a,b)=>a-b);
    for (let i = 0; i < keys.length - 1; i++) {
        if (d > keys[i] && d < keys[i+1]) {
            const t = (d - keys[i]) / (keys[i+1] - keys[i]);
            return Math.round(STOCKFISH_ELO_BY_DEPTH[keys[i]] * (1-t) + STOCKFISH_ELO_BY_DEPTH[keys[i+1]] * t);
        }
    }
    return 2200;
}


class TournamentStats {
    constructor() {
        this.partidas = [];
        this.wins = 0;
        this.losses = 0;
        this.draws = 0;
    }

    addResult(result, moves, reason, pgn) {
        this.partidas.push({ result, moves, reason, pgn, timestamp: new Date().toISOString() });
        if (result === '1-0') this.wins++;
        else if (result === '0-1') this.losses++;
        else this.draws++;
    }

    getWinRate() {
        const total = this.wins + this.losses + this.draws;
        return total > 0 ? (this.wins / total * 100).toFixed(1) : 0;
    }

    getAvgMoves() {
        if (this.partidas.length === 0) return 0;
        const totalMoves = this.partidas.reduce((sum, p) => sum + p.moves, 0);
        return (totalMoves / this.partidas.length).toFixed(1);
    }

    estimateELO() {
        const total = this.wins + this.losses + this.draws;
        if (total === 0) return 'N/A';
        const score = (this.wins + 0.5 * this.draws) / total;
        const sfELO = stockfishELOForDepth(CONFIG.stockfishDepth);
        if (score === 0) return `~${sfELO - 400} (0 wins — test lower depth for precision)`;
        if (score === 1) return sfELO + 600;
        const eloDiff = -400 * Math.log10((1 - score) / score);
        return Math.round(sfELO + eloDiff);
    }

    printReport() {
        console.log('\n' + '═'.repeat(60));
        console.log('🏆 FINAL TOURNAMENT REPORT');
        console.log('═'.repeat(60));
        console.log(`📊 Games played: ${this.partidas.length}`);
        console.log(`✅ Wins (mChess): ${this.wins}`);
        console.log(`❌ Losses: ${this.losses}`);
        console.log(`🤝 Draws: ${this.draws}`);
        console.log(`📈 Win Rate: ${this.getWinRate()}%`);
        console.log(`📏 Average moves: ${this.getAvgMoves()}`);
        console.log(`🎯 Estimated ELO: ${this.estimateELO()}`);
        console.log('═'.repeat(60));

        const reasons = {};
        this.partidas.forEach(p => { reasons[p.reason] = (reasons[p.reason] || 0) + 1; });
        console.log('\n📋 Reasons for completion:');
        Object.entries(reasons).forEach(([reason, count]) => { console.log(`   ${reason}: ${count}`); });

        fs.writeFileSync(CONFIG.logFile, JSON.stringify({
            config: CONFIG,
            stats: { wins: this.wins, losses: this.losses, draws: this.draws, winRate: this.getWinRate(), avgMoves: this.getAvgMoves(), estimatedELO: this.estimateELO() },
            partidas: this.partidas
        }, null, 2));
        console.log(`\n💾 Results saved to ${CONFIG.logFile}`);
    }
}

// ✨ FIX: Pasamos el 'browser' como parámetro para reutilizarlo
async function playMatch(matchNumber, stats, aiLevel, browser) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🎮 MATCH ${matchNumber}/${CONFIG.numPartidas}`);
    console.log('─'.repeat(60));
    
    const htmlPath = 'file://' + path.join(__dirname, '..', 'mChess.html');
    
    // ✨ FIX: Solo abrimos una pestaña nueva, no todo el navegador
    const page = await browser.newPage();
    
    page.on('console', msg => {
        if (msg.type() === 'error') console.log('🌐 Browser Error:', msg.text());
    });

    await page.goto(htmlPath);
    await new Promise(r => setTimeout(r, 1500)); 

    if (aiLevel) {
        try {
            await page.evaluate((level) => { if(typeof startAIGame==='function') startAIGame(level); }, aiLevel);
            await new Promise(r => setTimeout(r, 1500));
        } catch (e) {
            console.log('⚠️ Warning: could not inject level:', e.message);
        }
    }

    const game = new Chess();
    let turn = 'w';
    let moveCount = 0;
    let reason = 'completed';

    const stockfishPath = process.env.STOCKFISH_PATH || path.join(__dirname, '..', 'stockfish.exe');
    const sf = spawn(stockfishPath); 

    const askStockfish = (fen) => {
        return new Promise((resolve) => {
            const listener = (data) => {
                const output = data.toString();
                if (output.includes('bestmove')) {
                    sf.stdout.removeListener('data', listener);
                    const move = output.split('bestmove ')[1].split(' ')[0];
                    resolve(move);
                }
            };
            sf.stdout.on('data', listener);
            sf.stdin.write(`position fen ${fen}\n`);
            sf.stdin.write(`go depth ${CONFIG.stockfishDepth}\n`);
        });
    };

    const startTime = Date.now();

    try {
        while (!game.isGameOver()) {
            if (Date.now() - startTime > CONFIG.timePerGame) { reason = 'timeout'; break; }

            const fen = game.fen();
            const historyObj = game.history();
            
            let move;
            let timeTaken = 0;
            let depthInfo = null;

            if (turn === 'w') {
                const thinkStart = Date.now();
                move = await page.evaluate(async (f, h) => {
                    return await window.askWiseKing(f, h);
                }, fen, historyObj);
                timeTaken = (Date.now() - thinkStart) / 1000;
                // Read real depth achieved from window._lastSearchDepth
                try {
                    depthInfo = await page.evaluate(() => window._lastSearchDepth || null);
                } catch(_) { depthInfo = null; }
            } else {
                move = await askStockfish(fen);
            }

            if (!move || move === 'null' || move.trim() === '') {
                console.log(`🏳️ ${turn === 'w' ? 'mChess' : 'Stockfish'} sin jugadas`);
                reason = turn === 'w' ? 'rey_sabio_sin_jugadas' : 'stockfish_sin_jugadas';
                break;
            }

            try {
                game.move({ 
                    from: move.slice(0,2), 
                    to: move.slice(2,4), 
                    promotion: move.length === 5 ? move[4] : 'q'
                });
                
                // ✨ FIX: Imprimir cada movimiento con el tiempo de cálculo
                if (turn === 'w') {
                    const alert = timeTaken >= 30.0 ? ' ⚠️ (Time limit)' : '';
                    let depthStr = '';
                    if (depthInfo) {
                        depthStr = depthInfo.completedDepth === 'book'
                            ? ' [book]'
                            : ` [d:${depthInfo.completedDepth}/${depthInfo.maxDepth}${depthInfo.isPartial ? '~' : ''}]`;
                    }
                    console.log(`   👑 mChess plays ${move} (⏱️ ${timeTaken.toFixed(1)}s)${alert}${depthStr}`);
                } else {
                    console.log(`   🐟 Stockfish plays ${move}`);
                }

                turn = turn === 'w' ? 'b' : 'w';
                moveCount++;
            } catch (e) {
                console.error(`❌ ILLEGAL MOVE: ${move} (${turn === 'w' ? 'mChess' : 'Stockfish'})`);
                reason = turn === 'w' ? 'ilegal_rey_sabio' : 'ilegal_stockfish';
                break;
            }
        }
    } finally {
        // ✨ FIX: Cerramos la pestaña y matamos a Stockfish SÍ O SÍ
        try { await page.close(); } catch(e){}
        try { sf.kill(); } catch(e){}
    }

    let result = '1/2-1/2';
    if (game.isCheckmate()) {
        result = turn === 'w' ? '0-1' : '1-0';
        reason = 'mate';
    } else if (game.isDraw()) {
        if (game.isStalemate()) reason = 'ahogado';
        else if (game.isThreefoldRepetition()) reason = 'repeticion';
        else if (game.isInsufficientMaterial()) reason = 'material_insuficiente';
        else reason = '50_movimientos';
    } else if (reason === 'completada') {
        result = '1/2-1/2';
    } else if (reason.includes('ilegal_rey_sabio') || reason === 'rey_sabio_sin_jugadas') {
        result = '0-1';
    } else if (reason.includes('ilegal_stockfish') || reason === 'stockfish_sin_jugadas') {
        result = '1-0';
    }

    console.log(`\n✨ Result: ${result} (${reason}) - ${moveCount} moves`);
    stats.addResult(result, moveCount, reason, game.pgn());
    return result;
}

async function runTournament() {
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║' + ' '.repeat(5) + '🏆 AUTOMATIC TOURNAMENT mChess vs Stockfish 🏆' + ' '.repeat(10) + '║');
    console.log('╚' + '═'.repeat(58) + '╝');
    
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q) => new Promise(res => rl.question(q, ans => res(ans)));
    console.log('\nSelect mChess level for Wise King:');
    console.log('  1) Chick (easy)');
    console.log('  2) Student (medium)');
    console.log('  3) Wizard (hard)');
    console.log('  4) Wise King (grandmaster)');
    const ans = (await ask('Choose 1-4 (enter=4): ')).trim();
    const MAP = { '1':'easy', '2':'medium', '3':'hard', '4':'grandmaster' };
    const selectedLevel = MAP[ans] || 'grandmaster';

    console.log('\nSelect Stockfish depth (lower = weaker = more accurate ELO for ~1600-2000):');
    console.log('  d5  → ~1600 ELO  (good if mChess wins some games)');
    console.log('  d6  → ~1750 ELO  (recommended first test)');
    console.log('  d7  → ~1900 ELO  (if mChess is strong)');
    console.log('  d10 → ~2200 ELO  (current default — too strong for precision)');
    const depthAns = (await ask('Enter depth 1-20 (enter=6): ')).trim();
    CONFIG.stockfishDepth = parseInt(depthAns) || 6;
    console.log(`🔧 Stockfish depth: ${CONFIG.stockfishDepth} (~ELO ${stockfishELOForDepth(CONFIG.stockfishDepth)})`);
    rl.close();
    
    // ✨ FIX: Lanzamos Puppeteer UNA SOLA VEZ para todo el torneo
    console.log(`\n🚀 Initializing base browser...`);
    const browser = await puppeteer.launch({ 
        headless: "new",
        protocolTimeout: 120000,
        args: ['--allow-file-access-from-files', '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });

    const stats = new TournamentStats();
    
    try {
        for (let i = 1; i <= CONFIG.numPartidas; i++) {
            try {
                await playMatch(i, stats, selectedLevel, browser);
            } catch (error) {
                console.error(`\n💥 Critical error in match ${i}:`, error.message);
                stats.addResult('1/2-1/2', 0, 'error', '');
            }
            await new Promise(r => setTimeout(r, 2000));
        }
    } finally {
        console.log(`\n🛑 Closing base browser...`);
        await browser.close();
    }
    
    stats.printReport();
}

runTournament().catch(console.error);