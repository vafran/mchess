const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// 🔬 ANALIZADOR Y REFINADOR DEL MOTOR DE AJEDREZ
// Analiza los resultados del torneo y sugiere ajustes de parámetros
// Esta copia está adaptada para ejecutarse desde la carpeta `stockfish_tests`
// ═══════════════════════════════════════════════════════════════

const RESULTS_FILE = path.join(__dirname, 'tournament_results.json');

// Parámetros ajustables del motor (dentro del Worker en mChess.html)
const TUNABLE_PARAMS = {
  FUTILITY_MARGIN: [0, 150, 300],
  NULL_MOVE_MIN_DEPTH: 3,
  NULL_MOVE_REDUCTION: { depth6: 3, default: 2 },
  UNDEVELOPED_PENALTY_PHASE: 0.3,
  UNDEVELOPED_PENALTY_VALUE: 20,
  BISHOP_PAIR_BONUS: 30,
  DOUBLED_PAWN_PENALTY: 30,
  ISOLATED_PAWN_PENALTY: 40,
  CENTER_CONTROL_BONUS: 15,
  MOBILITY_WEIGHT: 5
};

class EngineAnalyzer {
  constructor(resultsPath) {
    if (!fs.existsSync(resultsPath)) {
      throw new Error(`Archivo de resultados no encontrado: ${resultsPath}`);
    }
    this.data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    this.stats = this.data.stats || {};
    this.partidas = this.data.partidas || [];
  }

  analyze() {
    console.log('\n╔' + '═'.repeat(58) + '╗');
    console.log('║' + ' '.repeat(15) + '🔬 ANÁLISIS DEL MOTOR' + ' '.repeat(19) + '║');
    console.log('╚' + '═'.repeat(58) + '╝\n');

    console.log(`📊 Estadísticas generales:`);
    console.log(`   ELO Estimado: ${this.stats.estimatedELO}`);
    console.log(`   Win Rate: ${this.stats.winRate}%`);
    console.log(`   Victorias: ${this.stats.wins} | Derrotas: ${this.stats.losses} | Empates: ${this.stats.draws}`);
    console.log(`   Promedio de movimientos: ${this.stats.avgMoves}\n`);

    this.analyzeGameEndings();
    this.analyzeMovePatterns();
    this.suggestImprovements();
  }

  analyzeGameEndings() {
    console.log('📋 Análisis de finales de partida:');
    const endings = {};
    this.partidas.forEach(p => { endings[p.reason] = (endings[p.reason] || 0) + 1; });
    Object.entries(endings).forEach(([reason, count]) => {
      const pct = (count / this.partidas.length * 100).toFixed(1);
      console.log(`   ${reason.padEnd(25)}: ${count} (${pct}%)`);
    });
    console.log();
  }

  analyzeMovePatterns() {
    console.log('🎯 Análisis de duración de partidas:');
    const moves = this.partidas.map(p => p.moves).filter(m => m > 0);
    if (moves.length === 0) return;
    const avg = moves.reduce((a, b) => a + b, 0) / moves.length;
    const min = Math.min(...moves);
    const max = Math.max(...moves);
    const median = moves.sort((a, b) => a - b)[Math.floor(moves.length / 2)];
    console.log(`   Promedio: ${avg.toFixed(1)} movimientos`);
    console.log(`   Mediana: ${median} movimientos`);
    console.log(`   Rango: ${min} - ${max} movimientos`);
    const shortGames = moves.filter(m => m < 20).length;
    if (shortGames > moves.length * 0.3) {
      console.log(`   ⚠️  Alerta: ${shortGames} partidas terminaron en < 20 movimientos`);
      console.log(`      Esto puede indicar errores tácticos tempranos.`);
    }
    console.log();
  }

  suggestImprovements() {
    console.log('💡 Sugerencias de mejora:\n');
    const elo = parseInt(this.stats.estimatedELO || '0');
    const winRate = parseFloat(this.stats.winRate || '0');
    const avgMoves = parseFloat(this.stats.avgMoves || '0');
    const suggestions = [];
    if (elo < 1500) {
      suggestions.push({ priority: '🔴 ALTA', area: 'Búsqueda Táctica', issue: 'ELO muy bajo - probablemente perdiendo material frecuentemente', actions: ['Aumentar profundidad de búsqueda de 10 a 12','Reducir agresividad de futility pruning (aumentar márgenes)','Mejorar evaluación de piezas colgadas en evaluate()','Verificar que inCheck() funcione correctamente'] });
    } else if (elo < 1700) {
      suggestions.push({ priority: '🟡 MEDIA', area: 'Posicionamiento', issue: 'Táctica aceptable pero posición débil', actions: ['Aumentar penalización por piezas sin desarrollar a 25-30','Mejorar bonificación por control del centro','Ajustar tablas PST (piece-square tables)','Aumentar bonificación por par de alfiles a 40-50'] });
    }
    if (elo >= 1700 && elo < 1900) {
      suggestions.push({ priority: '🟢 BAJA', area: 'Refinamiento', issue: 'Motor cerca del objetivo - ajustes finos', actions: ['Optimizar ordenación de movimientos (move ordering)','Ajustar valores de null move reduction','Calibrar mejor la fase del juego (endgame vs middlegame)','Mejorar evaluación de estructura de peones'] });
    }
    if (winRate < 30) {
      suggestions.push({ priority: '🔴 ALTA', area: 'Defensa', issue: 'Win rate muy bajo - problemas defensivos', actions: ['Mejorar detección de amenazas (getAttackersOfSquare)','Aumentar peso de seguridad del rey en evaluate()','Revisar generación de movimientos legales','Verificar que no se pierdan piezas colgadas'] });
    }
    if (avgMoves < 25) {
      suggestions.push({ priority: '🔴 ALTA', area: 'Errores Tempranos', issue: 'Partidas muy cortas - blunders en apertura/medio juego', actions: ['Expandir libro de aperturas','Aumentar profundidad en las primeras jugadas','Mejorar isTacticalBlunderFast()','Verificar evaluación de capturas'] });
    } else if (avgMoves > 60) {
      suggestions.push({ priority: '🟡 MEDIA', area: 'Finales', issue: 'Partidas largas - dificultad para cerrar', actions: ['Mejorar evaluación de finales (KEG en PST)','Aumentar bonificación por peones pasados','Mejorar evaluación de material insuficiente','Ajustar actividad del rey en endgame'] });
    }
    if (suggestions.length === 0) {
      console.log('   ✅ ¡Motor funcionando excelentemente! ELO >= 1900');
      console.log('   Continuar con ajustes finos basados en partidas específicas.');
    } else {
      suggestions.forEach((sug, idx) => {
        console.log(`${idx + 1}. [${sug.priority}] ${sug.area}`);
        console.log(`   ${sug.issue}\n`);
        console.log('   Acciones recomendadas:');
        sug.actions.forEach(action => { console.log(`   • ${action}`); });
        console.log();
      });
    }
    this.generatePatchFile();
  }

  generatePatchFile() {
    const elo = parseInt(this.stats.estimatedELO || '0');
    console.log('📝 Generando archivo de ajustes sugeridos...\n');
    let patches = '// ═══════════════════════════════════════════════════════\n';
    patches += `// AJUSTES SUGERIDOS PARA MOTOR (ELO Actual: ${elo})\n`;
    patches += `// Generado: ${new Date().toISOString()}\n`;
    patches += '// ═══════════════════════════════════════════════════════\n\n';
    if (elo < 1500) {
      patches += '// 🔴 PRIORIDAD ALTA: Mejorar táctica básica\n';
      patches += "// En la función minimax, DESACTIVAR temporalmente null move pruning:\n";
      patches += "// Cambiar línea ~7434: if(nullOk && !checked && depth>=3) → if(false) \n\n";
      patches += "// Aumentar márgenes de futility pruning (línea ~7456):\n";
      patches += "const FUTILITY_MARGIN=[0, 200, 400]; // Antes: [0,150,300]\n\n";
      patches += "// Aumentar penalización por piezas sin desarrollar (línea ~7025):\n";
      patches += "s -= wUndevelopedMinors * 30; // Antes: 20\n";
      patches += "s += bUndevelopedMinors * 30; // Antes: 20\n\n";
    } else if (elo < 1700) {
      patches += '// 🟡 PRIORIDAD MEDIA: Mejorar evaluación posicional\n';
      patches += "// Ajustar bonificación por par de alfiles (línea ~7042):\n";
      patches += "if(wBishops>=2)s+=40; // Antes: 30\n";
      patches += "if(bBishops>=2)s-=40; // Antes: 30\n\n";
      patches += "// Aumentar penalización por peones doblados (línea ~7034):\n";
      patches += "if(wP[c]>1)s-=35*wP[c]; // Antes: 30\n";
      patches += "if(bP[c]>1)s+=35*bP[c]; // Antes: 30\n\n";
    } else if (elo >= 1700 && elo < 1900) {
      patches += '// 🟢 PRIORIDAD BAJA: Refinamiento fino\n';
      patches += '// El motor está cerca del objetivo. Ajustes sugeridos:\n\n';
      patches += '// 1. Optimizar ordenación de movimientos en minimax\n';
      patches += '// 2. Calibrar mejor transición middlegame/endgame\n';
      patches += '// 3. Mejorar evaluación de estructura de peones\n\n';
    } else {
      patches += '// ✅ Motor funcionando excelentemente (ELO >= 1900)\n';
      patches += '// Continuar con testing y ajustes basados en partidas específicas.\n\n';
    }
    patches += "// Para aplicar estos cambios:\n";
    patches += "// 1. Abrir mChess.html\n";
    patches += "// 2. Buscar las líneas indicadas en el código del Worker\n";
    patches += "// 3. Aplicar los cambios sugeridos\n";
    patches += "// 4. Ejecutar nuevo torneo con: node arena_tournament.js\n";

    fs.writeFileSync(path.join(__dirname, 'engine_patches.js'), patches);
    console.log('✅ Archivo de ajustes generado:', path.join(__dirname, 'engine_patches.js'), '\n');
  }
}

// Ejecutar análisis
try {
  const analyzer = new EngineAnalyzer(RESULTS_FILE);
  analyzer.analyze();
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n💡 Primero ejecuta el torneo: node arena_tournament.js');
}
