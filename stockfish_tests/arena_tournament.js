const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const { Chess } = require('chess.js');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// ═══════════════════════════════════════════════════════════════
// 🏆 TORNEO AUTOMATIZADO: mChess vs Stockfish (stockfish_tests)
// Ejecuta múltiples partidas y calcula estadísticas detalladas
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
    numPartidas: 3,          // Número de partidas a jugar
    stockfishDepth: 10,        // Profundidad de Stockfish (ajustar según ELO deseado)
    timePerGame: 3600000,       // 1 hora máximo por partida
    logFile: path.join(__dirname, 'tournament_results.json')
};

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
        const stockfishELO = 2200; 
        
        if (score === 0) return stockfishELO - 600;
        if (score === 1) return stockfishELO + 600;
        
        const eloDiff = -400 * Math.log10((1 - score) / score);
        return Math.round(stockfishELO + eloDiff);
    }

    printReport() {
        console.log('\n' + '═'.repeat(60));
        console.log('🏆 REPORTE FINAL DEL TORNEO');
        console.log('═'.repeat(60));
        console.log(`📊 Partidas jugadas: ${this.partidas.length}`);
        console.log(`✅ Victorias (mChess): ${this.wins}`);
        console.log(`❌ Derrotas: ${this.losses}`);
        console.log(`🤝 Empates: ${this.draws}`);
        console.log(`📈 Win Rate: ${this.getWinRate()}%`);
        console.log(`📏 Promedio de movimientos: ${this.getAvgMoves()}`);
        console.log(`🎯 ELO Estimado: ${this.estimateELO()}`);
        console.log('═'.repeat(60));

        const reasons = {};
        this.partidas.forEach(p => {
            reasons[p.reason] = (reasons[p.reason] || 0) + 1;
        });
        console.log('\n📋 Razones de finalización:');
        Object.entries(reasons).forEach(([reason, count]) => {
            console.log(`   ${reason}: ${count}`);
        });

        fs.writeFileSync(CONFIG.logFile, JSON.stringify({
            config: CONFIG,
            stats: {
                wins: this.wins,
                losses: this.losses,
                draws: this.draws,
                winRate: this.getWinRate(),
                avgMoves: this.getAvgMoves(),
                estimatedELO: this.estimateELO()
            },
            partidas: this.partidas
        }, null, 2));
        console.log(`\n💾 Resultados guardados en ${CONFIG.logFile}`);
    }
}

async function playMatch(matchNumber, stats, aiLevel) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🎮 PARTIDA ${matchNumber}/${CONFIG.numPartidas}`);
    console.log('─'.repeat(60));
    
    // mChess.html está en la carpeta padre
    const htmlPath = 'file://' + path.join(__dirname, '..', 'mChess.html');
    
    const browser = await puppeteer.launch({ 
        headless: "new",
        protocolTimeout: 120000,
        args: ['--allow-file-access-from-files', '--no-sandbox'] 
    });
    
    const page = await browser.newPage();
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('🌐 Browser Error:', msg.text());
        }
    });

    await page.goto(htmlPath);
    await new Promise(r => setTimeout(r, 2000)); 

    // If an AI level was provided, request the page to start the AI at that difficulty
    if (aiLevel) {
        try {
            await page.evaluate((level) => { if(typeof startAIGame==='function') startAIGame(level); }, aiLevel);
            // give the page a moment to initialize the AI and start the game
            await new Promise(r => setTimeout(r, 1800));
        } catch (e) {
            console.log('⚠️ Warning: could not inject AI level into page:', e.message);
        }
    }

    const game = new Chess();
    let turn = 'w';
    let moveCount = 0;
    let reason = 'completada';

    // stockfish.exe should be in parent folder; allow explicit override via env var
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

    while (!game.isGameOver()) {
        if (Date.now() - startTime > CONFIG.timePerGame) {
            reason = 'timeout';
            break;
        }

        const fen = game.fen();
        const historyObj = game.history();
        
        let move;
        if (turn === 'w') {
            move = await page.evaluate(async (f, h) => {
                return await window.askWiseKing(f, h);
            }, fen, historyObj);
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
            turn = turn === 'w' ? 'b' : 'w';
            moveCount++;
            
            if (moveCount % 10 === 0) {
                console.log(`   📍 Movimiento ${moveCount}...`);
            }
        } catch (e) {
            console.error(`❌ Jugada ILEGAL: ${move} (${turn === 'w' ? 'mChess' : 'Stockfish'})`);
            reason = turn === 'w' ? 'ilegal_rey_sabio' : 'ilegal_stockfish';
            break;
        }
    }

    try { await browser.close(); } catch(e){}
    try { sf.kill(); } catch(e){}

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

    console.log(`\n✨ Resultado: ${result} (${reason}) - ${moveCount} movimientos`);
    
    stats.addResult(result, moveCount, reason, game.pgn());
    
    return result;
}

async function runTournament() {
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║' + ' '.repeat(10) + '🏆 TORNEO AUTOMÁTICO mChess vs Stockfish 🏆' + ' '.repeat(10) + '║');
    console.log('╚' + '═'.repeat(58) + '╝');
    console.log(`\n⚙️  Configuración:`);
    console.log(`   • Partidas: ${CONFIG.numPartidas}`);
    console.log(`   • Profundidad Stockfish: ${CONFIG.stockfishDepth}`);
    console.log(`   • Tiempo máximo por partida: ${CONFIG.timePerGame / 1000}s`);
    
    // Ask user which mChess difficulty to use for Rey Sabio (mChess levels)
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q) => new Promise(res => rl.question(q, ans => res(ans)));
    console.log('\nSelecciona nivel de mChess para Rey Sabio:');
    console.log('  1) Pollito (easy)');
    console.log('  2) Estudiante (medium)');
    console.log('  3) Mago (hard)');
    console.log('  4) Rey Sabio (grandmaster)');
    const ans = (await ask('Elige 1-4 (enter=4): ')).trim();
    rl.close();
    const MAP = { '1':'easy', '2':'medium', '3':'hard', '4':'grandmaster' };
    const selectedLevel = MAP[ans] || 'grandmaster';
    console.log(`\nUsando nivel: ${selectedLevel} (mChess)`);

    const stats = new TournamentStats();
    
    for (let i = 1; i <= CONFIG.numPartidas; i++) {
        try {
            await playMatch(i, stats, selectedLevel);
        } catch (error) {
            console.error(`\n💥 Error en partida ${i}:`, error.message);
            stats.addResult('1/2-1/2', 0, 'error', '');
        }
        
        await new Promise(r => setTimeout(r, 2000));
    }
    
    stats.printReport();
}

runTournament().catch(console.error);
