const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const { Chess } = require('chess.js');
const path = require('path');
const readline = require('readline');

async function runMatch() {
    console.log("🏟️ Starting the Colosseum: mChess vs Stockfish");
    
    const htmlPath = 'file://' + path.join(__dirname, '../mChess.html');
    
    const browser = await puppeteer.launch({
        headless: "new",
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        protocolTimeout: 120000,
        args: ['--allow-file-access-from-files', '--no-sandbox']
    });
    
    const page = await browser.newPage();
    page.on('console', msg => console.log('🌐 Browser Log:', msg.text()));

    // Ask user which mChess level to use
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q) => new Promise(res => rl.question(q, ans => res(ans)));
    console.log('\nSelect mChess level:');
    console.log('  1) Chick (easy)');
    console.log('  2) Student (medium)');
    console.log('  3) Wizard (hard)');
    console.log('  4) Wise King (grandmaster)');
    const ans = (await ask('Choose 1-4 (enter=4): ')).trim();
    rl.close();
    const MAP = { '1':'easy', '2':'medium', '3':'hard', '4':'grandmaster' };
    const selectedLevel = MAP[ans] || 'grandmaster';
    console.log(`\nUsing mChess level: ${selectedLevel}`);

    console.log(`📂 Loading file: ${htmlPath}`);
    await page.goto(htmlPath);
    console.log("✅ HTML loaded correctly.");

    // Inject selected level into the page so mChess starts with that difficulty
    try {
        await page.evaluate((level) => { if(typeof startAIGame === 'function') startAIGame(level); }, selectedLevel);
        // allow the page to show the intro and start the game
        await new Promise(r => setTimeout(r, 1800));
    } catch (e) {
        console.log('⚠️ Warning: could not start the level in the page:', e.message);
    }

    console.log("⏳ Waiting for the engine to initialize...");
    await new Promise(r => setTimeout(r, 2000)); 

    const game = new Chess();
    let turn = 'w';

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
            const depth = process.env.STOCKFISH_DEPTH || '5';
            sf.stdin.write(`go depth ${depth}\n`);
        });
    };

    while (!game.isGameOver()) {
        const fen = game.fen();
        console.log(`\n-------------------\n🎲 TURN: ${turn === 'w' ? '👑 mChess' : '🐟 Stockfish'}`);
        
        let move;
        let timeTaken = 0, depthInfo = null;
        if (turn === 'w') {
            process.stdout.write("🧠 mChess thinking...\n");
            const positionHistory = game.history({ verbose: true }).map(m => m.after);
            const t0 = Date.now();
            const result = await page.evaluate(async (f, h) => {
                return await window.askWiseKing(f, h);
            }, fen, positionHistory);
            timeTaken = (Date.now() - t0) / 1000;
            depthInfo = await page.evaluate(() => window._lastSearchDepth);
            move = typeof result === 'object' ? result.move || result : result;
        } else {
            process.stdout.write("🐟 Stockfish thinking...\n");
            move = await askStockfish(fen);
        }

        console.log(`🚀 Move: ${move}`);
        if (turn === 'w') {
            const alert = timeTaken >= 30.0 ? ' ⚠️ (Time limit)' : '';
            let depthStr = '';
            if (depthInfo) {
                depthStr = depthInfo.completedDepth === 'book'
                    ? ' [book]'
                    : ` [d:${depthInfo.completedDepth}/${depthInfo.maxDepth}${depthInfo.isPartial ? '~' : ''}]`;
            }
            console.log(`   ⏱️ ${timeTaken.toFixed(1)}s${alert}${depthStr}`);
        }
        
        // CLAUDE'S GUARD
        if (!move || move === 'null' || move.trim() === '') {
            console.log(`🏳️ No moves available — end`);
            break;
        }

        try {
            // The robust format of chess.js proposed by Claude
            game.move({ 
                from: move.slice(0,2), 
                to: move.slice(2,4), 
                promotion: move.length === 5 ? move[4] : 'q' // Default 'q' if promotion is not specified
            });
            turn = turn === 'w' ? 'b' : 'w';
        } catch (e) {
            console.error(`❌ Illegal move attempted: ${move}`);
            break;
        }
    }

    // Determine final result
    let result = '1/2-1/2';
    let reason = 'unknown';
    let winner = '🤝 Draw';

    if (game.isCheckmate()) {
        // turn was already swapped after the last move, so the player now to move got mated
        result = turn === 'w' ? '0-1' : '1-0';
        reason = 'checkmate';
        winner = result === '1-0' ? '👑 mChess wins! (White)' : '🐟 Stockfish wins! (Black)';
    } else if (game.isStalemate()) {
        reason = 'stalemate'; winner = '🤝 Draw (stalemate)';
    } else if (game.isThreefoldRepetition()) {
        reason = 'threefold repetition'; winner = '🤝 Draw (repetition)';
    } else if (game.isInsufficientMaterial()) {
        reason = 'insufficient material'; winner = '🤝 Draw (material)';
    } else if (game.isDraw()) {
        reason = '50-move rule'; winner = '🤝 Draw (50 moves)';
    } else {
        reason = 'engine resigned / no legal moves';
        winner = turn === 'w' ? '🐟 Stockfish wins! (no mChess moves)' : '👑 mChess wins! (no Stockfish moves)';
        result = turn === 'w' ? '0-1' : '1-0';
    }

    const totalMoves = game.history().length;
    console.log('\n' + '═'.repeat(55));
    console.log(`🏁  ${winner}`);
    console.log(`📋  Result: ${result}  |  Reason: ${reason}  |  Moves: ${totalMoves}`);
    console.log('═'.repeat(55));
    game.header('Result', result);
    console.log('\n📜 PGN:\n' + game.pgn());
    await browser.close();
    sf.kill();
}

runMatch().catch(console.error);