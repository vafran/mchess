const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const { Chess } = require('chess.js');
const path = require('path');
const readline = require('readline');

async function runMatch() {
    console.log("🏟️ Iniciando el Coliseo: mChess vs Stockfish");
    
    const htmlPath = 'file://' + path.join(__dirname, '../mChess.html');
    
    const browser = await puppeteer.launch({ 
        headless: "new",
        protocolTimeout: 120000,
        args: ['--allow-file-access-from-files', '--no-sandbox'] 
    });
    
    const page = await browser.newPage();
    page.on('console', msg => console.log('🌐 Browser Log:', msg.text()));

    // Ask user which mChess level to use
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q) => new Promise(res => rl.question(q, ans => res(ans)));
    console.log('\nSelecciona nivel de mChess:');
    console.log('  1) Pollito (easy)');
    console.log('  2) Estudiante (medium)');
    console.log('  3) Mago (hard)');
    console.log('  4) Rey Sabio (grandmaster)');
    const ans = (await ask('Elige 1-4 (enter=4): ')).trim();
    rl.close();
    const MAP = { '1':'easy', '2':'medium', '3':'hard', '4':'grandmaster' };
    const selectedLevel = MAP[ans] || 'grandmaster';
    console.log(`\nUsando nivel mChess: ${selectedLevel}`);

    console.log(`📂 Cargando archivo: ${htmlPath}`);
    await page.goto(htmlPath);
    console.log("✅ HTML cargado correctamente.");

    // Inject selected level into the page so mChess starts with that difficulty
    try {
        await page.evaluate((level) => { if(typeof startAIGame === 'function') startAIGame(level); }, selectedLevel);
        // allow the page to show the intro and start the game
        await new Promise(r => setTimeout(r, 1800));
    } catch (e) {
        console.log('⚠️ Warning: no se pudo iniciar el nivel en la página:', e.message);
    }

    console.log("⏳ Esperando a que el motor se inicialice...");
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
            const depth = process.env.STOCKFISH_DEPTH || '10';
            sf.stdin.write(`go depth ${depth}\n`);
        });
    };

    while (!game.isGameOver()) {
        const fen = game.fen();
        console.log(`\n-------------------\n🎲 TURNO: ${turn === 'w' ? '👑 mChess' : '🐟 Stockfish'}`);
        
        let move;
        if (turn === 'w') {
            process.stdout.write("🧠 mChess pensando...\n");
            const historyObj = game.history();
            move = await page.evaluate(async (f, h) => {
                return await window.askWiseKing(f, h);
            }, fen, historyObj);
        } else {
            process.stdout.write("🐟 Stockfish pensando...\n");
            move = await askStockfish(fen);
        }

        console.log(`🚀 Movimiento: ${move}`);
        
        // LA GUARDIA DE CLAUDE
        if (!move || move === 'null' || move.trim() === '') {
            console.log(`🏳️ Motor sin jugadas — fin`);
            break;
        }

        try {
            // El formato robusto de chess.js propuesto por Claude
            game.move({ 
                from: move.slice(0,2), 
                to: move.slice(2,4), 
                promotion: move.length === 5 ? move[4] : 'q' // Por defecto 'q' si hay promoción sin especificar
            });
            turn = turn === 'w' ? 'b' : 'w';
        } catch (e) {
            console.error(`❌ Jugada ILEGAL intentada: ${move}`);
            break;
        }
    }

    console.log("\n🏁 RESULTADO FINAL:\n" + game.pgn());
    await browser.close();
    sf.kill();
}

runMatch().catch(console.error);