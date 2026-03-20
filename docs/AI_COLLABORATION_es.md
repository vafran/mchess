# Notas de Colaboración con IA

Este documento es una pequeña muestra del diálogo de control de calidad entre Claude Sonnet y Gemini Pro durante el desarrollo de Monolith Chess v2.0.0. Es un relato honesto de cómo se vio en la práctica el desarrollo asistido por IA — incluyendo desacuerdos, correcciones y los casos en que un modelo detectó un bug que había introducido el otro.

[Ir a README_es.md](../README_es.md)

---

## Cómo funcionó

Aaron dirigía el proyecto. Claude escribía el grueso del código. Gemini hacía revisiones periódicas del código y cacerías de bugs, enviando sus hallazgos como informes estructurados. Aaron transmitía esos informes a Claude para que los verificara y aplicara. Ningún modelo podía ver directamente el trabajo del otro — Aaron era el intermediario.

El proceso tenía esta forma:

```
Aaron → Claude (escribe la función X)
Aaron → Gemini (revisa el archivo)
Gemini → Aaron (informe de bugs)
Aaron → Claude (verifica y aplica)
Claude → Aaron (archivo corregido)
```

---

## Las Rondas de QA

### Ronda 1 — Higiene de estado
Gemini señaló que `loadPositionFromFEN()` no reiniciaba `positionHashes`, `halfMoveClock` ni `moveNumber`. Si un jugador cargaba un puzzle FEN después de una partida larga, la regla de los 50 movimientos podía dispararse en mitad del puzzle usando datos de la partida anterior.

**Veredicto:** Bug real, confirmado en el archivo, aplicado.

---

### Ronda 2 — El `simulateMove` congelado

Gemini identificó que `simulateMove` — función usada por el Profesor para evaluar posiciones futuras — movía al Rey durante el enroque pero dejaba la Torre en su casilla original. Esto significaba que el Profesor evaluaba incorrectamente la seguridad del rey y no detectaba jaquemates en ninguna posición que involucrara un enroque.

Claude había usado `simulateMove` extensivamente en todo el sistema del Profesor (escáner de mate en 1, detección de piezas colgadas, Garantía de Intercambio Rentable). Todos esos componentes estaban afectados.

**Veredicto:** Bug real, confirmado. Añadidas tres líneas:

```javascript
if (piece.toUpperCase() === 'K' && Math.abs(m.tc - m.fc) === 2) {
  if (m.tc === 6) { copy[m.fr][5] = copy[m.fr][7]; copy[m.fr][7] = ' '; }
  else            { copy[m.fr][3] = copy[m.fr][0]; copy[m.fr][0] = ' '; }
}
```

---

### Ronda 3 — La línea huérfana

Gemini encontró que `window.snapshotBeforeRules = null` estaba en una línea *después* de la llave de cierre de `undoMove()` — fuera de la función por completo. Había quedado ahí durante una refactorización anterior y no se ejecutaba nunca al deshacer una jugada.

Claude había escrito el sistema de snapshots. Claude también había introducido el bug al colocar esa línea fuera de su sitio.

**Veredicto:** Bug real, confirmado en línea 4729 vs llave de cierre en línea 4728. Movido al interior.

---

### Ronda 4 — Sincronización del "cerebro dividido"

Cuando Claude implementó la Penalización por Pieza Abandonada (para que el Profesor dejara de sugerir jugadas que escapaban con una pieza mientras dejaban abandonada otra ya colgada), aplicó la lógica en `renderProfessorOptions` pero no en `requestBestMove` ni en `continueProfessorSearch`. Gemini lo detectó.

La nota exacta de Gemini: *"Claude diseñó una solución fantástica pero se olvidó de enseñársela a una de las mitades del cerebro del Profesor."*

**Veredicto:** Laguna real, confirmada. La penalización faltaba en dos de las tres rutas del código.

---

### Ronda 5 — La "Dama Esnob"

La Garantía de Intercambio Rentable inyectaba capturas gratuitas que el motor había clasificado por debajo de jugadas defensivas. Pero la lógica de inyección contenía un return prematuro defectuoso:

```javascript
if (tgtVal < myVal) return; // rechaza si el objetivo vale menos que el atacante
```

Esto rechazaba a una Dama capturando un Caballo libre (30 < 90) antes de comprobar siquiera si la casilla era segura. Gemini bautizó esto como el bug de la "Dama Esnob".

**Veredicto:** Bug real, confirmado. La corrección: calcular `safeAfter` primero, y solo omitir si no es ni segura ni rentable.

---

### Ronda 6 — 203 líneas de código muerto

Gemini identificó que `continueProfessorSearch` contenía un gran bloque de fallback (aproximadamente 200 líneas) dentro de una cláusula `catch(err)` que era matemáticamente inalcanzable:

```javascript
try {
  engineSearch(...).then(...).catch(...);
  return; // ← JS ejecuta esto inmediatamente
} catch (err) {
  // 200 líneas aquí — NUNCA SE ALCANZAN
  // Las Promesas capturan sus propios errores con .catch()
}
```

**Veredicto:** Fallo arquitectónico real, confirmado. Función reducida de 230 a 28 líneas.

---

### Ronda 7 — Condiciones de carrera asíncronas

Gemini describió dos bugs de temporización que solo ocurren cuando el usuario actúa durante una operación asíncrona:

1. **Movimiento fantasma de la IA** — reiniciar la partida mientras la IA calculaba. La Promise del Worker se resolvía después del reinicio y llamaba a `makeMove()` sobre el tablero nuevo, corrompiéndolo.

2. **Deshacer durante revisión del historial** — pulsar Deshacer mientras se revisaban jugadas pasadas dejaba `isViewingHistory = true`, manteniendo el botón cohete 🚀 visible y haciendo que la app creyera que el jugador seguía viajando en el tiempo.

Gemini señaló que Claude había protegido al Profesor del problema equivalente (usando una guarda `snapPly` en `requestBestMove`) pero no había aplicado el mismo patrón a `triggerAI`.

**Veredicto:** Ambos confirmados. Guardas añadidas en `init()`, `triggerAI` y `undoMove`.

---

## Lo que funcionó

**La metodología de Gemini fue disciplinada.** Cada hallazgo incluía el número de línea exacto, el código problemático, un diagnóstico y una corrección propuesta. No hubo falsos positivos en las últimas rondas. Cuando Gemini decía que existía un bug, existía.

**El hábito de verificar antes de aplicar fue valioso.** Antes de aplicar cualquier corrección, se comprobaba en el código que el bug estaba realmente presente. En al menos una ocasión a lo largo de las sesiones, un informe describía un bug que ya había sido corregido en una ronda anterior, lo que habría introducido una regresión si se hubiera aplicado sin comprobar.

**La estructura de intermediario ayudó.** Como Aaron leía ambos informes y aplicaba los cambios secuencialmente, existía un paso de revisión natural. Ningún modelo podía sobrescribir accidentalmente el trabajo del otro.

---

## Lo que no funcionó

**La deriva de versiones fue un problema real.** El proyecto tenía varios archivos HTML en circulación a la vez. En al menos dos ocasiones a lo largo de las sesiones, un informe de bugs resultó describir una versión que llevaba uno o dos parches de retraso respecto al archivo de trabajo actual. La lección: siempre verificar el número de líneas o el hash del archivo antes de ejecutar una revisión.

**Claude introdujo varios de los bugs que luego corrigió.** La línea huérfana del snapshot, la penalización de cerebro dividido, la lógica de la Dama Esnob, el bloque de código muerto — todos fueron errores de Claude, detectados por Gemini. Esto no sorprende (el código base creció hasta ~12.000 líneas de JavaScript denso en un único archivo), pero merece documentarse con honestidad.

---

## Resumen

| Ronda | Detectado por | Bug | ¿Real? |
|---|---|---|---|
| 1 | Gemini | Carga FEN no reiniciaba el reloj de 50 movimientos | ✅ |
| 1 | Gemini | Botón `vs IA` hardcodeado en español, no se traducía | ✅ |
| 2 | Gemini | `simulateMove` no movía la Torre en el enroque | ✅ |
| 3 | Gemini | `snapshotBeforeRules` fuera de `undoMove` | ✅ |
| 3 | Gemini | Carga FEN no limpiaba las variables de snapshot | ✅ |
| 4 | Gemini | Penalización por Pieza Abandonada faltaba en 2 de 3 rutas del Profesor | ✅ |
| 5 | Gemini | Dama Esnob — return temprano antes de comprobar seguridad | ✅ |
| 6 | Gemini | 203 líneas de código muerto inalcanzable | ✅ |
| 7 | Gemini | Movimiento fantasma de la IA al reiniciar la partida | ✅ |
| 7 | Gemini | Deshacer durante revisión del historial dejaba la UI atascada | ✅ |

10 bugs encontrados. 10 confirmados. 10 corregidos.
