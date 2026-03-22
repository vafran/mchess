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

Instalación / Dependencias

- Este conjunto de scripts usa `puppeteer` y `chess.js`. Desde la raíz del proyecto ejecuta:

```bash
npm init -y
npm install puppeteer chess.js
```

- Ejemplo (PowerShell) para establecer `STOCKFISH_PATH` temporalmente y ejecutar:

```powershell
# temporal para la sesión actual
$env:STOCKFISH_PATH = 'C:\ruta\completa\a\stockfish.exe'
node stockfish_tests/arena_tournament.js

# o establecerlo permanentemente (nueva terminal requerida)
setx STOCKFISH_PATH 'C:\ruta\completa\a\stockfish.exe'
```

- Alternativa: coloca `stockfish.exe` junto a `mChess.html` en la raíz del proyecto y ejecuta los scripts desde la raíz para usar la ruta por defecto.
