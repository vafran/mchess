const puppeteer = require('puppeteer');
const { spawn }  = require('child_process');
const { Chess }  = require('chess.js');
const path       = require('path');
const fs         = require('fs');

// ═══════════════════════════════════════════════════════════════
// 🎓 PEDAGOGICAL AUDIT v3.1 (Anti-Freeze Edition)
//    Play against Stockfish and extract ALL the reasoning
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
    htmlFile:      path.join(__dirname, '../mChess.html'), 
    stockfishPath: process.env.STOCKFISH_PATH || path.join(__dirname,'..', 'stockfish.exe'), // Ensure .exe or correct path
    outputFile:    path.join(__dirname, 'pedagogical_audit_log.json'),
    mChessLevel:   'medium',
    sfDepth:       7,
    numGames:      1,
    moveTimeoutMs: 60000,
};

async function getCheckupAndMove(page, fen, history) {
    // --- 0. PERFECT SYNCHRONIZATION ---
    // Force the browser to update its visual board and internal history
    // so the Professor knows exactly what position it is analyzing.
    const syncBoard = async () => {
        await page.evaluate((hist) => {
            if (typeof game !== 'undefined') {
                game.reset();
                hist.forEach(m => game.move(m)); // Recreate moves from Node
                if (typeof board !== 'undefined') board.position(game.fen(), false);
            }
        }, history);
    };

    await syncBoard();

    // 1. Ask the engine for a move (Opening Book or Calculation)
    const move = await page.evaluate(async (f, h) => {
        try { return await window.askWiseKing(f, h); } 
        catch(e) { return null; }
    }, fen, history);

    if (!move) return { move: null, checkup: null };

    // --- 🔍 AUDIT 1: "ANALYSIS" (Static Evaluation) ---
    const analysisHints = await page.evaluate(async () => {
        return new Promise(resolve => {
            const pList = document.getElementById('professorList');
            if (pList) pList.innerHTML = ''; // Clear residual data
            
            if (typeof window.analyzePosition === 'function') window.analyzePosition();
            
            // Allow 1 second for the UI to render (static eval, doesn't use Worker)
            setTimeout(() => {
                const hints = pList ? Array.from(pList.querySelectorAll('.hint-item')).map(el => el.innerText.trim()) : [];
                if (pList) pList.innerHTML = '';
                resolve(hints);
            }, 1000);
        });
    });

    // Restore board (just in case analyzePosition altered anything)
    await syncBoard();

    // --- 💡 AUDIT 2: "WAS IT GOOD?" (Evaluates the player's last move) ---
    const wasItGoodHints = await page.evaluate(async () => {
        return new Promise(resolve => {
            const pList = document.getElementById('professorList');
            if (pList) pList.innerHTML = '';
            
            if (typeof window.analyzeLastMove !== 'function' || (typeof game !== 'undefined' && game.history().length === 0)) {
                resolve([]); return;
            }

            window.professorThinking = true;
            try { window.analyzeLastMove(); } catch(e) { resolve([]); return; }

            // Safe polling: max 15 seconds wait
            let checks = 0;
            const iv = setInterval(() => {
                checks++;
                if (window.professorThinking === false || checks > 30) { 
                    clearInterval(iv);
                    window.professorThinking = false; // Forced unlock
                    const hints = pList ? Array.from(pList.querySelectorAll('.hint-item')).map(el => el.innerText.trim()) : [];
                    if (pList) pList.innerHTML = '';
                    resolve(hints);
                }
            }, 500);
        });
    });

    // Restore board again (crucial because analyzeLastMove usually triggers game.undo())
    await syncBoard();

    // --- 🎯 AUDIT 3: "WHAT DO I DO?" (Tactical options) ---
    const whatToDoHints = await page.evaluate(async () => {
        return new Promise(resolve => {
            const pList = document.getElementById('professorList');
            if (pList) pList.innerHTML = '';
            
            if (typeof window.requestBestMove !== 'function') {
                resolve([]); return;
            }

            window.professorThinking = true;
            try { window.requestBestMove(); } catch(e) { resolve([]); return; }

            // Safe polling: max 15 seconds wait
            let checks = 0;
            const iv = setInterval(() => {
                checks++;
                if (window.professorThinking === false || checks > 30) { 
                    clearInterval(iv);
                    window.professorThinking = false; // Forced unlock
                    const hints = pList ? Array.from(pList.querySelectorAll('.hint-item')).map(el => el.innerText.trim()) : [];
                    if (pList) pList.innerHTML = '';
                    resolve(hints);
                }
            }, 500);
        });
    });

    // --- 👁️ AUDIT 4 & 5: HAWK EYE AND COMMENTATOR ---
    const extraData = await page.evaluate(() => {
        if (typeof window.toggleHawksEye === 'function') window.toggleHawksEye();
        const score = typeof evaluateBoard === 'function' && typeof board !== 'undefined' ? evaluateBoard(board, 'hard') : 0;
        if (typeof addCommentaryEntry === 'function') addCommentaryEntry(null, null, score);

        const toast = document.getElementById('toastContainer')?.lastElementChild;
        const comm = document.getElementById('commentaryList');
        
        return {
            hawkEye: toast ? toast.innerText.trim() : 'No data from Hawk Eye',
            fen: typeof boardToFEN === 'function' ? boardToFEN(board) : null,
            depth: window._lastSearchDepth ? window._lastSearchDepth.completedDepth : null,
            lastCommentary: comm ? (comm.querySelector('.commentary-entry')?.innerText.trim() || '') : '',
            evalScore: typeof evaluateBoard === 'function' ? evaluateBoard(board, 'hard') : null,
            timestamp: new Date().toISOString()
        };
    });

    const fullCheckup = {
        ply: history.length + 1,
        movePlayed: move,
        ...extraData,
        professor_Analysis: analysisHints,
        professor_WasItGood: wasItGoodHints,
        professor_WhatToDo: whatToDoHints
    };

    return { move, checkup: fullCheckup };
}

function spawnStockfish() {
    const sf = spawn(CONFIG.stockfishPath);
    sf.stdin.setEncoding('utf-8');
    sf.stdin.write('uci\n');
    sf.stdin.write('isready\n');
    return sf;
}

function askStockfish(sf, fen, depth) {
    return new Promise((resolve) => {
        sf.stdin.write(`position fen ${fen}\n`);
        sf.stdin.write(`go depth ${depth}\n`);
        const onData = (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                if (line.startsWith('bestmove')) {
                    sf.stdout.removeListener('data', onData);
                    resolve(line.split(' ')[1].trim());
                }
            }
        };
        sf.stdout.on('data', onData);
    });
}

async function runAudit() {
    console.log("🚀 Starting Pedagogical Audit v3.1 (Anti-Freeze)...");
    
    const browser = await puppeteer.launch({ 
        headless: false,
        args: [
            '--allow-file-access-from-files',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
        ]
    });
    
    const page = await browser.newPage();
    await page.goto('file://' + CONFIG.htmlFile);
    
    await page.evaluate((level) => {
        if (typeof currentDifficulty !== 'undefined') currentDifficulty = level;
        if (typeof DIFF_SETTINGS !== 'undefined' && DIFF_SETTINGS[level]) {
            aiDepth = DIFF_SETTINGS[level].depth;
            aiTimeLimit = DIFF_SETTINGS[level].timeLimit;
        }
    }, CONFIG.mChessLevel);

    const sf = spawnStockfish();
    const auditLogs = [];

    for (let g = 0; g < CONFIG.numGames; g++) {
        const game = new Chess();
        const mChessColor = (g % 2 === 0) ? 'w' : 'b';
        console.log(`\n🎮 Game ${g+1}: mChess plays with ${mChessColor === 'w' ? 'White' : 'Black'}`);

        while (!game.isGameOver()) {
            const fen = game.fen();
            const turn = game.turn();
            let move;

            if (turn === mChessColor) {
                process.stdout.write(`🤔 mChess (${turn}) thinking and extracting pedagogy... `);
                
                const result = await getCheckupAndMove(page, fen, game.history());
                move = result.move;
                
                if (result.checkup) {
                    auditLogs.push(result.checkup);
                    const c = result.checkup;
                    const totalTips = c.professor_Analysis.length + c.professor_WasItGood.length + c.professor_WhatToDo.length;
                    
                    process.stdout.write(`Ready!\n`);
                    if (c.lastCommentary) {
                        console.log(`   🎙️  Commentary: "${c.lastCommentary}"`);
                    }
                    if (totalTips > 0) {
                        console.log(`   🎓 Professor: ${totalTips} tips available (Analysis: ${c.professor_Analysis.length} | Was_It_Good: ${c.professor_WasItGood.length} | What_To_Do: ${c.professor_WhatToDo.length})`);
                        // Opcional: Mostrar la primera sugerencia de "WasItGood" si existe, que suele ser la más relevante
                        if (c.professor_WasItGood.length > 0) {
                            console.log(`      💡 Tip: ${c.professor_WasItGood[0]}`);
                        }
                    }
                } else {
                    process.stdout.write(`Ready! (No data from Professor).\n`);
                }
            } else {
                process.stdout.write(`🤖 Stockfish (${turn}) thinking at d${CONFIG.sfDepth}... `);
                move = await askStockfish(sf, fen, CONFIG.sfDepth);
                process.stdout.write(`Ready!: ${move}\n`);
            }

            if (!move || move === 'null') {
                console.log("❌ No move received. Ending game.");
                break;
            }

            try {
                game.move({ 
                    from: move.slice(0,2), 
                    to: move.slice(2,4), 
                    promotion: move.length === 5 ? move[4] : 'q' 
                });
            } catch (e) {
                console.error(`❌ Illegal move detected: ${move}`);
                break;
            }
        }
        console.log(`🏁 Game ${g+1} ended: ${game.pgn()}`);
    }

    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(auditLogs, null, 2));
    console.log(`\n✅ Audit completed. Data saved to: ${CONFIG.outputFile}`);
    
    sf.stdin.write('quit\n');
    await browser.close();
}

runAudit().catch(console.error);