# Pruebas con Stockfish (Español)

Esta carpeta contiene scripts para ejecutar partidas automáticas entre el motor en `mChess.html` y Stockfish, recoger resultados y analizarlos.

Inicio rápido

1. Instala Node.js (v14+ recomendado) y npm.
2. Desde la raíz del proyecto coloca `stockfish.exe` junto a `mChess.html`, o define la variable de entorno `STOCKFISH_PATH` apuntando al ejecutable.
3. Desde esta carpeta ejecuta:

```bash
# Ejecutar un pequeño torneo
node arena_tournament.js

# Inspeccionar resultados
node analyze_results.js
```

Notas

- `arena_tournament.js` abre `../mChess.html` (carpeta padre).
- Los resultados se guardan en `stockfish_tests/tournament_results.json`.
- `engine_patches.js` contiene sugerencias para editar `mChess.html` manualmente.

Ajusta `CONFIG` dentro de `arena_tournament.js` para cambiar número de partidas, profundidad o límites de tiempo.
