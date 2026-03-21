const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const { Chess } = require('chess.js');
const path = require('path');

async function runMatch() {
    console.log("🏟️ Iniciando el Coliseo: Rey Sabio vs Stockfish");
    
    const htmlPath = 'file://' + path.join(__dirname, 'mChess.html');
    
    const browser = await puppeteer.launch({ 
        headless: "new",
        protocolTimeout: 120000,
        args: ['--allow-file-access-from-files', '--no-sandbox'] 
    });
    
    const page = await browser.newPage();
    page.on('console', msg => console.log('🌐 Browser Log:', msg.text()));

    console.log(`📂 Cargando archivo: ${htmlPath}`);
    await page.goto(htmlPath);
    console.log("✅ HTML cargado correctamente.");

    console.log("⏳ Esperando a que el motor se inicialice...");
    await new Promise(r => setTimeout(r, 2000)); 

    const game = new Chess();
    let turn = 'w';

    const sf = spawn('./stockfish.exe'); 

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
            sf.stdin.write(`go depth 10\n`);
        });
    };

    while (!game.isGameOver()) {
        const fen = game.fen();
        console.log(`\n-------------------\n🎲 TURNO: ${turn === 'w' ? '👑 Rey Sabio' : '🐟 Stockfish'}`);
        
        let move;
        if (turn === 'w') {
            process.stdout.write("🧠 Rey Sabio pensando...\n");
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