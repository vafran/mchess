const puppeteer = require('puppeteer');
const { spawn }  = require('child_process');
const { Chess }  = require('chess.js');
const path       = require('path');
const fs         = require('fs');

// ═══════════════════════════════════════════════════════════════
// 🎓 PEDAGOGICAL AUDIT v4.0
//
//  Dos modos mutuamente excluyentes (no se mezclan por turno):
//
//  'whatToDo'  → pregunta "¿Qué hago ahora?" ANTES de que mChess mueva.
//                Registra qué sugirió el profesor y qué jugó mChess realmente.
//                Útil para medir calidad de las sugerencias.
//
//  'wasItGood' → deja jugar a mChess primero, luego inyecta los snapshots
//                correctos y llama a analyzeLastMove().
//                SIN memoria de sugerencias previas (lastProfessorSuggestions=null)
//                para que el análisis sea honesto, no "¡seguiste mi consejo!".
//
//  Por qué no se pueden mezclar: si preguntas "¿Qué hago?" y después
//  "¿Fue buena?", el motor habrá jugado exactamente lo que recomendó el
//  profesor → el análisis siempre responde "¡Excelente! Seguiste mi consejo"
//  en vez de analizar la jugada real.
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
    htmlFile:      path.join(__dirname, '../mChess.html'),
    stockfishPath: process.env.STOCKFISH_PATH || path.join(__dirname, '..', 'stockfish.exe'),
    outputFile:    path.join(__dirname, 'pedagogical_audit_log.json'),
    mChessLevel:   'medium',
    sfDepth:       7,
    numGames:      2,
    moveTimeoutMs: 60000,
    // 'whatToDo' | 'wasItGood'  — choose ONE
    auditMode:     'wasItGood',
};

// ── Inyectar FEN en los globales del motor sin efectos secundarios ──────────
// Esto es lo que faltaba en v3.x: syncBoard usaba game.reset() (chess.js API)
// que no existe en mChess. Esta función setea directamente board, castleRights,
// enPassantTarget, turn, history, etc. tal y como lo hace loadPositionFromFEN.
async function setPageFEN(page, fen, historyArr = []) {
    await page.evaluate((f, h) => {
        const parts = f.split(/\s+/);
        const rows = parts[0].split('/');
        const newBoard = [];
        for (const row of rows) {
            const r = [];
            for (const ch of row) {
                if (ch >= '1' && ch <= '8') { for (let i = 0; i < parseInt(ch); i++) r.push(' '); }
                else r.push(ch);
            }
            newBoard.push(r);
        }
        board = newBoard;
        turn = parts[1];
        const cr = parts[2] || '-';
        castleRights = { K: cr.includes('K'), Q: cr.includes('Q'), k: cr.includes('k'), q: cr.includes('q') };
        enPassantTarget = (parts[3] && parts[3] !== '-')
            ? [8 - parseInt(parts[3][1]), 'abcdefgh'.indexOf(parts[3][0])]
            : null;
        halfMoveClock = parts[4] ? (parseInt(parts[4]) || 0) : 0;
        history = [...h];
        fenPositionLoaded = true;          // suprime "haz una jugada primero"
        if (typeof fenGameActive !== 'undefined') fenGameActive = true; // desactiva libro
        aiThinking = false;                // evita bloqueo
        professorThinking = false;
        gameMode = 'pvp';                  // requestBestMove pasa el check canAsk
        window.lastProfessorSuggestions = null; // CRÍTICO: evita "¡seguiste mi consejo!"
    }, fen, historyArr);
}

// ── Preguntar "¿Qué hago ahora?" y recoger las sugerencias ──────────────────
async function getWhatToDoHints(page) {
    return page.evaluate(() => new Promise(resolve => {
        const pList = document.getElementById('professorList');
        if (pList) pList.innerHTML = '';
        if (typeof window.requestBestMove !== 'function') { resolve([]); return; }
        professorThinking = true;
        try { window.requestBestMove(); } catch(e) { resolve([]); return; }
        let checks = 0;
        const iv = setInterval(() => {
            checks++;
            if (!professorThinking || checks > 40) {
                clearInterval(iv);
                professorThinking = false;
                // Capture full professorList text — includes panicMsg (⚠️ hanging pieces),
                // contextMsg (🦅 captures, 🔭 X-rays, ♟️ passed pawns) and the moves list.
                const hints = pList && pList.innerText.trim()
                    ? [pList.innerText.trim()]
                    : [];
                if (pList) pList.innerHTML = '';
                resolve(hints);
            }
        }, 500);
    }));
}

// ── Preguntar "¿Fue buena mi jugada?" con snapshots correctos ────────────────
// prevFen  = posición ANTES de la jugada de mChess
// currFen  = posición DESPUÉS de la jugada de mChess
// historyArr = historial de movimientos EN notación algebraica (chess.js history())
async function getWasItGoodHints(page, prevFen, currFen, historyArr) {
    // 1. Inyectar snapshots + estado actual del tablero
    await page.evaluate((pf, cf, h) => {
        const fenToBoard = (fen) => {
            const rows = fen.split(' ')[0].split('/');
            return rows.map(row => {
                const r = [];
                for (const ch of row) {
                    if (ch >= '1' && ch <= '8') { for (let i = 0; i < parseInt(ch); i++) r.push(' '); }
                    else r.push(ch);
                }
                return r;
            });
        };
        const prevParts = pf.split(/\s+/);
        const currParts = cf.split(/\s+/);

        // Snapshots que normalmente rellena onCellClick
        window.snapshotBeforeHumanMove = fenToBoard(pf);
        window.snapshotAfterHumanMove  = fenToBoard(cf);
        const prevCr = prevParts[2] || '-';
        window.snapshotBeforeRules = {
            castleRights: { K: prevCr.includes('K'), Q: prevCr.includes('Q'), k: prevCr.includes('k'), q: prevCr.includes('q') },
            enPassantTarget: (prevParts[3] && prevParts[3] !== '-')
                ? [8 - parseInt(prevParts[3][1]), 'abcdefgh'.indexOf(prevParts[3][0])]
                : null,
            turn: prevParts[1]
        };

        // Estado global = tablero DESPUÉS de la jugada
        board = window.snapshotAfterHumanMove.map(r => [...r]);
        turn  = currParts[1];
        const cr = currParts[2] || '-';
        castleRights = { K: cr.includes('K'), Q: cr.includes('Q'), k: cr.includes('k'), q: cr.includes('q') };
        enPassantTarget = (currParts[3] && currParts[3] !== '-')
            ? [8 - parseInt(currParts[3][1]), 'abcdefgh'.indexOf(currParts[3][0])]
            : null;
        halfMoveClock  = currParts[4] ? (parseInt(currParts[4]) || 0) : 0;
        history = [...h];
        fenPositionLoaded = true;
        if (typeof fenGameActive !== 'undefined') fenGameActive = true;
        aiThinking = false;
        professorThinking = false;
        gameMode = 'pvp';
        // CRÍTICO: limpiar sugerencias previas para que no responda "¡seguiste mi consejo!"
        window.lastProfessorSuggestions = null;
    }, prevFen, currFen, historyArr);

    // 2. Llamar analyzeLastMove y esperar resultado
    return page.evaluate(() => new Promise(resolve => {
        const pList = document.getElementById('professorList');
        if (pList) pList.innerHTML = '';
        if (typeof window.analyzeLastMove !== 'function') { resolve([]); return; }
        professorThinking = true;
        try { window.analyzeLastMove(); } catch(e) { resolve([]); return; }
        let checks = 0;
        const iv = setInterval(() => {
            checks++;
            if (!professorThinking || checks > 40) {
                clearInterval(iv);
                professorThinking = false;
                const hints = pList && pList.innerText.trim()
                    ? [pList.innerText.trim()]
                    : [];
                if (pList) pList.innerHTML = '';
                resolve(hints);
            }
        }, 500);
    }));
}

// ── Ojo Halcón ───────────────────────────────────────────────────────────────
async function getHawkEye(page) {
    return page.evaluate(() => {
        if (typeof window.toggleHawksEye === 'function') window.toggleHawksEye();
        const toast = document.getElementById('toastContainer')?.lastElementChild;
        return toast ? toast.innerText.trim() : 'No data';
    });
}

// ── Comentarista: llama addCommentaryEntry con el FEN post-jugada ────────────
async function getCommentary(page, newFen, newHistory) {
    return page.evaluate((fen, hist) => {
        try {
            // Inject post-move board state
            const parts = fen.split(' ');
            const rows  = parts[0].split('/');
            const nb    = Array.from({length: 8}, () => Array(8).fill(' '));
            rows.forEach((row, r) => {
                let c = 0;
                for (const ch of row) {
                    if (ch >= '1' && ch <= '8') c += parseInt(ch);
                    else nb[r][c++] = ch;
                }
            });
            board = nb;
            turn  = parts[1];
            const cr = parts[2];
            castleRights   = { K: cr.includes('K'), Q: cr.includes('Q'), k: cr.includes('k'), q: cr.includes('q') };
            enPassantTarget = parts[3] !== '-' ? [8 - parseInt(parts[3][1]), 'abcdefgh'.indexOf(parts[3][0])] : null;
            halfMoveClock  = parseInt(parts[4]) || 0;
            history        = [...hist];

            const ev  = typeof evaluateBoard === 'function' ? evaluateBoard(board, 'hard') : null;
            const alg = hist.length > 0 ? hist[hist.length - 1] : null;
            if (typeof window.addCommentaryEntry === 'function') {
                window.addCommentaryEntry(alg, hist, ev);
            }
            // commentaryLog is declared with `let` inside the script — NOT on window.
            // Read the rendered text directly from the DOM instead.
            const firstEntry = document.querySelector('#commentaryList .commentary-entry .hint-text');
            return firstEntry ? firstEntry.innerText.trim() : null;
        } catch(_) { return null; }
    }, newFen, newHistory);
}

// ── Stockfish (con protección EPIPE) ─────────────────────────────────────────
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

// ── Menú interactivo ──────────────────────────────────────────────────────────
function askQuestion(prompt) {
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(prompt, ans => { rl.close(); resolve(ans.trim()); }));
}

async function promptConfig() {
    console.log('\n🎓 Pedagogical Audit v4.0');
    console.log('─────────────────────────────────────────');
    console.log('  1 → ¿Qué hago ahora?  (whatToDo)');
    console.log('      El profesor sugiere ANTES de que mChess mueva.');
    console.log('      Mide la calidad de las sugerencias vs la jugada real.');
    console.log('');
    console.log('  2 → ¿Fue buena?        (wasItGood)');
    console.log('      mChess mueve primero, luego el profesor analiza honestamente.');
    console.log('      Sin memoria de sugerencias previas — análisis real.');
    console.log('─────────────────────────────────────────');

    let mode;
    while (true) {
        const ans = await askQuestion('  Elige modo [1/2]: ');
        if (ans === '1') { mode = 'whatToDo'; break; }
        if (ans === '2') { mode = 'wasItGood'; break; }
        console.log('  ⚠️  Introduce 1 o 2.');
    }

    console.log('');
    console.log('  Nivel de mChess:');
    console.log('    1 → easy        (aleatorio, sin motor)');
    console.log('    2 → medium      (depth 4, recomendado para auditoría)');
    console.log('    3 → hard        (depth 6)');
    console.log('    4 → grandmaster (depth 30 / Rey Sabio — no recomendado aquí,');
    console.log('                     tarda mucho y la auditoría mide al Profesor, no al motor)');
    let level;
    while (true) {
        const ans = await askQuestion('  Nivel mChess [1-4, defecto 2]: ');
        const map = { '1':'easy', '2':'medium', '3':'hard', '4':'grandmaster' };
        level = map[ans] || (ans === '' ? 'medium' : null);
        if (level) break;
        console.log('  ⚠️  Introduce 1, 2, 3 o 4.');
    }

    const gamesAns = await askQuestion(`  Nº de partidas [${CONFIG.numGames}]: `);
    const numGames = parseInt(gamesAns) || CONFIG.numGames;

    console.log(`\n  ✅ Modo: ${mode} | Nivel: ${level} | Partidas: ${numGames} | SF d${CONFIG.sfDepth}`);
    console.log('─────────────────────────────────────────\n');

    return { mode, numGames, level };
}

// ── Bucle principal ───────────────────────────────────────────────────────────
async function runAudit() {
    const { mode, numGames, level } = await promptConfig();
    CONFIG.auditMode  = mode;
    CONFIG.numGames   = numGames;
    CONFIG.mChessLevel = level;
    CONFIG.outputFile = path.join(__dirname, `pedagogical_audit_log_${mode}.json`);

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

    const auditLogs = [];

    for (let g = 0; g < CONFIG.numGames; g++) {
        // Respawnear SF por partida — evita usar proceso muerto si timeout en partida anterior
        const sf = spawnSF();
        const game     = new Chess();
        const mChessColor = (g % 2 === 0) ? 'w' : 'b';
        console.log(`\n🎮 Game ${g+1}: mChess=${mChessColor === 'w' ? 'White' : 'Black'}`);

        while (!game.isGameOver()) {
            const fen  = game.fen();
            const turn = game.turn();
            let uciMove;

            if (turn === mChessColor) {
                // ── Turno de mChess ───────────────────────────────────────────
                let professorHints = [];

                if (CONFIG.auditMode === 'whatToDo') {
                    // 1. Inyectar posición
                    await setPageFEN(page, fen, game.history());
                    // 2. Preguntar "¿Qué hago?" ANTES de mover
                    professorHints = await getWhatToDoHints(page);
                    // 3. Restaurar estado y pedir jugada (fresh, sin contaminar)
                    await setPageFEN(page, fen, game.history());
                    uciMove = await page.evaluate(async (f, h) => {
                        try { return await window.askWiseKing(f, h); } catch(e) { return null; }
                    }, fen, game.history());

                } else {
                    // wasItGood: primero jugar, luego analizar
                    // 1. Inyectar y pedir jugada
                    await setPageFEN(page, fen, game.history());
                    uciMove = await page.evaluate(async (f, h) => {
                        try { return await window.askWiseKing(f, h); } catch(e) { return null; }
                    }, fen, game.history());

                    // 2. Calcular FEN resultante para los snapshots
                    if (uciMove) {
                        const tempGame = new Chess(fen);
                        try {
                            tempGame.move({ from: uciMove.slice(0,2), to: uciMove.slice(2,4), promotion: uciMove.length === 5 ? uciMove[4] : 'q' });
                        } catch(_) {}
                        const afterFen = tempGame.fen();
                        // 3. Preguntar "¿Fue buena?" con snapshots reales
                        professorHints = await getWasItGoodHints(page, fen, afterFen, game.history());
                    }
                }

                if (!uciMove) { console.log('❌ mChess no devolvió jugada. Fin de partida.'); break; }

                // Ojo Halcón (sobre el FEN antes de la jugada)
                await setPageFEN(page, fen, game.history());
                const hawkEye = await getHawkEye(page);

                // Eval y profundidad
                const evalScore = await page.evaluate(() =>
                    typeof evaluateBoard === 'function' ? evaluateBoard(board, 'hard') : null
                );
                const depth = await page.evaluate(() =>
                    window._lastSearchDepth ? window._lastSearchDepth.completedDepth : null
                );

                // Aplicar jugada primero para poder capturar el comentario post-jugada
                let moveApplied = false;
                try {
                    game.move({ from: uciMove.slice(0,2), to: uciMove.slice(2,4), promotion: uciMove.length === 5 ? uciMove[4] : 'q' });
                    moveApplied = true;
                } catch(e) { console.error(`❌ Jugada ilegal: ${uciMove}`); }

                // Comentarista: inyecta posición post-jugada y llama addCommentaryEntry
                const lastCommentary = moveApplied
                    ? await getCommentary(page, game.fen(), game.history())
                    : null;

                // Registrar
                const entry = {
                    game:           g + 1,
                    ply:            game.history().length,
                    color:          mChessColor,
                    fen,
                    movePlayed:     uciMove,
                    depth,
                    evalScore,
                    hawkEye,
                    auditMode:      CONFIG.auditMode,
                    professor:      professorHints,
                    lastCommentary,
                    timestamp:      new Date().toISOString()
                };
                auditLogs.push(entry);

                // Log en consola
                const tipCount = professorHints.length;
                console.log(`  👑 mChess: ${uciMove} [d${depth ?? '?'}] | Tips: ${tipCount} | Eval: ${evalScore != null ? evalScore.toFixed(1) : '?'}`);
                if (tipCount > 0) console.log(`     💡 ${professorHints[0].slice(0, 140)}`);
                if (lastCommentary) console.log(`     🎙️  ${lastCommentary.slice(0, 100)}`);

                if (!moveApplied) break;

            } else {
                // ── Turno de Stockfish ────────────────────────────────────────
                process.stdout.write(`  🐟 SF d${CONFIG.sfDepth}... `);
                try {
                    uciMove = await sfBestMove(sf, fen, CONFIG.sfDepth);
                    process.stdout.write(`${uciMove}\n`);
                    game.move({ from: uciMove.slice(0,2), to: uciMove.slice(2,4), promotion: uciMove.length === 5 ? uciMove[4] : 'q' });
                } catch(e) { console.error(`❌ SF error: ${e.message}`); break; }
            }
        }

        const result = game.isCheckmate()
            ? (game.turn() === mChessColor ? 'DERROTA' : 'VICTORIA')
            : game.isDraw() ? 'TABLAS' : 'INTERRUMPIDA';
        console.log(`🏁 Partida ${g+1}: ${result} en ${game.history().length} jugadas`);

        // Matar SF al final de cada partida (proceso fresco para la siguiente)
        try { if (!sf.killed) sf.stdin.write('quit\n'); sf.kill(); } catch(_) {}
    }

    // Guardar resultado (outputFile ya lleva el modo — no añadir sufijo extra)
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(auditLogs, null, 2));
    console.log(`\n✅ Auditoría completa. ${auditLogs.length} posiciones → ${path.basename(CONFIG.outputFile)}`);
    await browser.close();
}

runAudit().catch(console.error);
