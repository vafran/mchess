# Historial de cambios — Airin Chess

Todos los cambios relevantes del proyecto están documentados aquí.  
Formato: versión · tamaño · qué cambió.

[Ir a README_es.md](../README_es.md)

---

## v2.23.0 — Publicación de Producción
**~16.500 líneas · ~860 KB**

### Motor: Cinco Mejoras Validadas (v2.22.11 → v2.22.15)

v2.23.0 fusiona el ciclo de desarrollo v2.22.x completo en producción. Cada parche fue validado individualmente con un torneo antes de su inclusión.

**v2.22.11 — Filtro anti-colgadas extendido a capturas perdedoras**
El filtro SEE raíz anteriormente solo comprobaba jugadas silenciosas. Ahora también comprueba capturas con SEE < 0, detectando intercambios perdedores que la búsqueda de profundidad limitada del motor podría no resolver correctamente.

**v2.22.12 — Puerta de Centralización del Rey**
El bono de actividad del rey en finales (`kingCentralization`) ahora tiene una comprobación: el bono se activa solo cuando `eg > 0.5` (final genuino). Sin esta puerta, el rey recibía puntos adicionales por caminar hacia el centro en el mediojuego, produciendo evaluaciones fantasma de "caminata del rey" de +200–+400cp que distorsionaban la selección de jugadas.

**v2.22.13 — Corrección de Ceguera de Repetición**
Las jugadas raíz que crearían la 2.ª o 3.ª repetición de una posición no se puntuaban como repeticiones — el mapa `gameHashCount` se construía con datos incorrectos. Corregido: las repeticiones en raíz ahora reciben −9000 (evitar fuertemente) a menos que el motor ya esté perdiendo claramente (puntuación < −500), en cuyo caso se acepta las tablas. Confirmado: 266 activaciones de repetición-raíz en un torneo de 32 partidas.

**v2.22.14 — Umbral de Puerta BLOCKED 100→50cp**
La puerta BLOCKED del filtro anti-colgadas se activa cuando la jugada sustituta puntúa N cp peor que la original. Con 100cp, ocurrió el falso positivo G26: Cc6xe5 (SEE=−225, claramente correcto) fue bloqueado porque la sustituta solo puntuaba 57–63cp peor. Umbral reducido a 50cp.

**v2.22.15 — Bono de Torre en 7.ª Fila**
Bono posicional estándar añadido: +40cp (MG) / +25cp (EG), tapered. Una torre en la 7.ª fila (o 2.ª fila para las Negras) ataca los peones sin mover del rival y restringe al rey. El motor anteriormente no recibía ningún bono por esta colocación fuerte.

### Niveles de Dificultad Recalibrados

| Nivel | Presupuesto de tiempo | ELO validado | Notas |
|---|---|---|---|
| 🐣 Pollito (fácil) | 0,5 s | — | Techo profundidad 2, siempre alcanzado antes del tiempo |
| 📚 Estudiante (medio) | 1,5 s | — | Techo profundidad 4, siempre alcanzado antes del tiempo |
| 🔥 Mago (difícil) | **15 s** | **~1652** | Busca lo más profundo que el tiempo permite |
| 👑 Rey Sabio (gran maestro) | **30 s** | **~1830** | Busca lo más profundo que el tiempo permite |

ELO calibrado en CoolPC Black VIII (AMD Ryzen 7 3700X @ 4,4 GHz, 16 GB DDR4 3200 MHz, ~95k NPS). La fuerza del Mago y el Rey Sabio escala con el hardware del usuario.

### Resultados de Torneos

| Torneo | V | E | D | Puntuación | ELO |
|---|---|---|---|---|---|
| 40p PC vs UCI_Elo 1750 (15s) — **Mago** | 11 | 7 | 22 | 36,3% | ~1652 [IC: 1542–1762] |
| 40p PC vs UCI_Elo 1750 (30s) — **Rey Sabio** | 21 | 7 | 12 | 61,3% | ~1830 [IC: 1721–1938] |

**Hallazgo clave:** Disparidad significativa de color Blancas/Negras — Blancas 25,0%, Negras 47,5% en la ejecución de 40 partidas del Mago. El motor defiende y contraataca bien (juego reactivo) pero no genera iniciativa como Blancas. Esto impulsa la hoja de ruta v2.24.x.

### Mejoras Pedagógicas y del Entrenador

**Calidad de jugada con 7 niveles**
El botón "¿Fue buena?" del Profesor ahora usa una escala de 7 niveles en lugar de brillante/colgada binario. Niveles: colgada / error / imprecisión / neutral / bien / buena / muy buena / brillante, cada uno con un emoji y mensaje distintos. Los umbrales se basan en el delta de centipawns respecto a la posición anterior.

**Comentarista: sin anotación técnica cuando el tono es gracioso**
Cuando el comentarista está en modo gracioso (ej. "El caballo hace su cosa rara y nadie le entiende"), las anotaciones de calidad (ej. "¡Jugada brillante!") ya no aparecen. Los tonos técnico y humorístico no vuelven a mezclarse en la misma jugada.

**Correcciones de falsos positivos en "¿Fue buena?"**
Tres correcciones específicas reducen la tasa de falsos positivos del entrenador:
- *Puerta de sacrificio:* `isRealHanging` ahora comprueba `evalDespuésJugada ≤ 200cp` — los sacrificios intencionales en posiciones ganadoras ya no se marcan como piezas colgadas.
- *Guardia worstEval:* `getImmediateReplyRisk()` ahora devuelve `worstEval` (la posición tras la mejor respuesta del rival), permitiendo al delta usar un punto de referencia más preciso.
- *Umbral ajustado:* `_worstFromMover < 0` → `< −100` — evita avisos de JUGADA_PERDIDA cuando el motor ya va claramente ganando (+300cp+) y la retirada silenciosa del rival crea solo una caída superficial de 1 jugada.

### Rediseño de Interfaz y UI

**Carrusel de jugadas (escritorio y móvil)**
El historial de jugadas en barra lateral ha sido reemplazado por una tira de desplazamiento horizontal compacta situada directamente debajo del tablero. La navegación (⏮ ◀ ▶), deshacer (↩), copiar PGN (📋) y botón de salida de partida en vivo (🚀) están a cada extremo. La tira se desplaza automáticamente hasta la jugada activa y la resalta con el color de acento del tema. Los botones de historial y navegación laterales redundantes han sido eliminados.

**Rediseño de disposición responsiva**
El contenedor del tablero es ahora un flex-columna: tablero + barra de ventaja en la primera fila, tira de jugadas en la segunda. Esto elimina el problema de la tira flotante en escritorio y mantiene el tablero visualmente autónomo. En móvil la barra de ventaja está oculta y la disposición se apila verticalmente.

**Barra superior rediseñada**
El título de la página ("♟️ Airin") se integra en la barra superior como elemento central con degradado, liberando espacio vertical. El botón de menú hamburguesa se movió de una posición fija flotante al grupo derecho de la barra superior junto al selector de idioma y el botón de pantalla completa. El elemento `<h1>` se mantiene invisible para la detección de estado en JavaScript.

**Panel lateral simplificado**
Se añadió un botón rojo "☰ Menú" bajo "Reiniciar partida" en el panel lateral para acceso rápido al menú durante la partida en pantallas grandes. El panel izquierdo del entrenador es más ancho (máx. 360 px) y el panel derecho de información es más estrecho (máx. 220 px), dando al entrenador más espacio para sugerencias de apertura y texto de análisis.

**Corrección del desbordamiento del cuadro de comentarios**
La lista de comentarios ahora se desplaza correctamente dentro de una altura acotada en lugar de crecer desbordando el panel. Corrección: `min-height: 0` añadido en cada nivel de la cadena flex (`.left-panel`, `.hints-card`, `.tab-pane`) para que `overflow-y: auto` en `#commentaryList` se active.

**Corrección de contraste en el tema fútbol**
El título "♟️ Airin" y el texto de estado "vs Rey Sabio" ahora son blancos en el tema fútbol (verde), donde el relleno con degradado anterior era invisible sobre el fondo verde oscuro.

**Comentarista: calidad suprimida en apertura, conservada al cambiar idioma**
Las anotaciones de calidad de jugada (📉 Error grave, 👍 ¡Buen movimiento!, etc.) ya no aparecen en las primeras 10 jugadas — las jugadas de teoría de apertura producen deltas en centipawns con ruido que no reflejan la calidad real. La calidad ahora se almacena en la entrada `commentaryLog` y se vuelve a aplicar en el idioma correcto cuando el jugador cambia de idioma a mitad de partida, de modo que las anotaciones ya no se pierden al reconstruir.

**Comentarista: frases dinámicas de 📖 jugadas de libro**
Cuando se juega una jugada en la fase de apertura, el comentarista ahora a veces (~28% de jugadas silenciosas) añade un comentario variado de 📖 "teoría" ("¡Jugada de libro! Las blancas siguen la teoría", "¡Las negras conocen su teoría!", "¡Teoría pura! Esta posición se ha jugado miles de veces", etc.). Los anuncios de nombre de apertura también incluyen ahora el emoji 📖. Seis frases por idioma con rotación para evitar repetición.

**Sugerencias de apertura: etiquetas de estilo**
En el panel del entrenador "¿Qué hago?", las sugerencias de jugadas de libro ya no muestran una insignia uniforme de "Riesgo bajo". Cada apertura muestra ahora una etiqueta de estilo con código de color derivada de su descripción: ⚡ Agresiva (naranja), 🧱 Sólida (verde), 🔀 Flexible (azul), ♟️ Posicional (ámbar), 🔮 Hipermoder. (morado), o 📖 Teórica (gris). La lista de aperturas al inicio de partida está limitada a 11 entradas (era 20) para eliminar duplicados.

---

---

## v2.22.6 — Bug de Promoción Fantasma Corregido
**~16.500 líneas · ~860 KB**

### Corrección — Regla del Cuadrado: Duplicado Roto Eliminado (Crítico)

Existía una segunda implementación de la Regla del Cuadrado dentro del bucle de evaluación de peones (`u === 1`, ~línea 9099). A diferencia de la versión correcta en la línea ~9690 (que tiene una comprobación `if (!anyMajorMinor)` y solo se activa en finales puros de rey y peones), esta copia rota:

- **No tenía ninguna comprobación** — se activaba en cualquier final, incluyendo posiciones con torres y piezas menores en el tablero
- Otorgaba `bonus += Math.round(600 * eg)` — hasta **+942 cp** con `eg=1.57` — para peones pasados que las piezas enemigas podían bloquear o capturar trivialmente
- Producía **evaluaciones fantasma** de +600–+942 cp en jugadas silenciosas (puntuaciones idénticas en múltiples jugadas diferentes = firma de fantasma)

Resultado: el motor alucinaba promociones imparables, jugaba avances de peón irracionales (por ejemplo, `h4??` con una torre defensora) y perdía confiabilidad evaluativa en cualquier final con piezas presentes.

**Corrección:** Eliminado el bloque roto de 14 líneas. La implementación correcta (con comprobación `!anyMajorMinor` + verificación correcta de peón pasado + bono calibrado de 250cp) se conserva en la línea ~9690.

**Validación en torneo (6/20 partidas, datos preliminares):** Cero activaciones de fantasmas. Resultado 0V 1D 5E, ~1842 ELO frente a ~1732 base (v2.22.5).

### Diagnóstico — Tiempo de Pensamiento en Log Detallado

La línea `📊` de la consola del worker ahora añade `t:${N}ms` — duración de búsqueda por jugada. Permite detectar jugadas forzadas de 0ms (`[dforced/30]`) y tiempos de pensamiento anormalmente largos en los logs del torneo.

---

## v2.22.0 — Actualización de Inteligencia Pedagógica
**~15,800 líneas · ~805 KB**

### 🌟 Nuevas Características
*   **🧠 "Modo Dios" del Profesor (Análisis Profundo):** El sistema de sugerencias ahora es capaz de alcanzar una profundidad de análisis de nivel Gran Maestro (**Profundidad 30**) con un tiempo de cálculo extendido (hasta 15,000ms). El Profesor ya no se limita a detectar tácticas inmediatas; ahora formula planes estratégicos complejos.
*   **⏳ Cuenta Atrás Visual de Análisis:** Implementación de la función genérica `startThinkingCountdown`. Ahora, cuando el Profesor realiza un análisis profundo, la interfaz muestra un temporizador de cuenta atrás en vivo, mejorando enormemente la experiencia del usuario durante los tiempos de espera.

### 🛠️ Mejoras Técnicas
*   **🛡️ Protección del Historial de Movimientos:** Reestructuración de la forma en que el motor lee la partida. El Profesor y el Comentarista ahora priorizan el estado interno del ajedrez (`game.history()`) sobre `window.history`, eliminando colisiones y conflictos directos con el objeto de historial del navegador.
*   **🌍 Ámbito Global para Utilidades:** Refactorización de la función de selección de frases (`getRnd`) para que resida en el ámbito global del script. Esto asegura que cualquier módulo dependiente del idioma o la aleatoriedad pueda acceder a ella sin interrupciones durante la inicialización del motor.

---

## v2.21.0 — La Edición de Rendimiento y Tácticas (Final)
**~15.800 líneas · ~818 KB**

Objetivo de torneo: **~1900 ELO** (vs Stockfish d:7).  
Rendimiento real (v2.21.0 Final): **1631 ELO** vs Stockfish d:7 (20 partidas).  
Motor 4–5× más rápido que v2.13.1 a igual profundidad. Estable y resistente a cuelgues.

### Motor — Paracaídas de Seguridad (Fallback absoluto)
- **Lógica de seguridad en `askWiseKing`** — implementado un try/catch global y validación de jugadas que garantiza que el motor siempre devuelva un movimiento legal, evitando bloqueos en la interfaz durante test de larga duración.

### Motor — Heurística de finales y Mop-up
- **Incentivo de coronación** — valor base del peón subido a **145** para incitar el avance.
- **Mop-up (Acorralar al rey)** — factores de proximidad y distancia al centro multiplicados por 10 (47/16). El motor ahora es mucho más eficiente dando mate a reyes solitarios.
- **Simplificación sintonizada** — corregido el multiplicador de intercambio para asegurar que el motor busque simplificar material cuando tiene una ventaja clara (> 200cp).

### Motor — Tablero 8 bits (`Int8Array(64)`) — NPS ×4–5
- **Tablero plano `Int8Array(64)`** — migrado desde array 8×8 de strings a array tipado plano con códigos enteros de pieza (`1–6` = Blancas, `9–14` = Negras).
- **Localidad de caché** — 64 bytes caben en una línea de caché L1. Las lecturas del tablero son prácticamente gratuitas.
- **Aritmética entera en todo el camino caliente** — tipo de pieza con `p & 7`, color con `p <= 6`. Cero comparaciones de strings.
- **Buffers preasignados** — `Int8Array`, `Int32Array` para todas las estructuras de búsqueda, asignados una sola vez al arrancar el Worker.
- **Resultado**: **45k–80k NPS** estables frente a ~10k–18k de v2.13.1 a iguales profundidades.

### Motor — Evaluación Tapered MG/EG (tablas PST dobles)
- **PST de dos fases** (`PST_MG` / `PST_EG`) — reemplaza las tablas estáticas únicas.
- Interpolación entera: `score = (mgVal × ph + egVal × (24−ph)) / 24 | 0`. Sin coma flotante en el bucle central.
- Fase `ph` calculada por piezas: menor=1, torre=2, dama=4. Final puro=0 (sin piezas), apertura completa=24.
- Caballos y alfiles valorados correctamente en cada fase de la partida.

### Motor — Heurísticas Escudo y Tormenta del Rey
- **Escudo del Rey** (`eg < 0.3`): +25 cp por peón delante del rey enrocado (hasta 3).
- **Tormenta de Peones**: penalización por columnas abiertas o semiabiertas hacia el rey enrocado, escalado según lo avanzados que estén los peones de cobertura.

### Motor — Evaluación de Intercambio Estático (SEE)
- Función completa `see()` con soporte de rayos X (detecta piezas que aparecen tras quitar otra).
- Capturas ganadoras/iguales (`SEE ≥ 0`) ordenadas por ganancia neta — buscadas primero.
- Capturas perdedoras (`SEE < 0`) — priorizadas por debajo de jugadas silenciosas; descartadas en la búsqueda de quietud.
- Elimina la clase más común de colgadas: cambiar un alfil por un peón defendido por otro peón.

### Bug — Detección de Empate por Repetición (crítico)
- **Causa raíz**: tras el refactor al tablero de 8 bits, `positionHashes` (strings del historial) se enviaba al Worker pero el bucle de búsqueda usaba claves Zobrist XOR-fold — **nunca estaban conectadas**. El motor era completamente ciego a la repetición.
- **Solución**: los strings de `positionHashes` se decodifican ahora a claves Zobrist usando exactamente las mismas tablas `ZL`/`ZH`/`ZBL`/`Z_CASTLE`/`Z_EP` que `makeMove()`, acumuladas en `historyCount: Map<u32, count>`.
- **Umbral correcto**: `minimax()` devuelve 0 cuando `historyCount.get(bkS) >= 2` (posición vista ≥ 2 veces en historial = territorio de triple repetición).

### Infraestructura de Torneo (`arena_tournament.js` v2)
- 20 líneas de apertura (cobertura ECO), alternancia de colores, 20 partidas por defecto.
- Guardado JSON parcial tras cada partida — se puede interrumpir con Ctrl+C sin perder datos.
- Log de NPS por jugada, NPS medio en el informe final.
- Intervalos de confianza ELO al 95% (método Wilson score).
- Página V8/TurboFan compartida entre partidas — el código JIT se calienta en la partida 1 y se mantiene. NPS estable desde la partida 2.
- Tiempo máximo de 45 segundos por jugada con detección de página caducada y recarga automática.

### Motor — Actualización de la TT
- **TT de 1 048 576 entradas** (20 MB, `Int32Array`) — antes 200K entradas.
- Entradas EXACT nunca sobreescritas por UPPER/LOWER a ninguna profundidad.
- Puntuaciones de mate almacenadas como absolutas (ajustadas por `plyFromRoot`) para recuperación correcta.

---

## v2.13.1 — Hotfix
**~14.100 líneas · ~687 KB**

### Bugs Corregidos — Motor (Críticos)
- **Fix de jugadas a d:1** — El bucle de profundización iterativa podía detenerse en profundidad 1 si una entrada de la TT (de un análisis anterior) devolvía una puntuación de mate (> 90.000 cp). Esto provocaba que el motor hiciera sacrificios de dama y otros errores graves en finales. La salida anticipada por puntuación de mate ahora exige `d >= 5` antes de actuar sobre ese score.
- **Filtro de seguridad contra ahogado** — Añadido un filtro post-búsqueda en la raíz: cuando el motor va claramente ganando (puntuación > 500 cp), cualquier movimiento que deje al rival en ahogado (0 jugadas legales, sin jaque) queda excluido de los candidatos. Evita la trampa clásica de ahogado con dama + peones (ej. Dg6 + h7 con rey negro en h8).

---

## v2.13.0 — The Memory Update
**~14.100 líneas · ~687 KB**

Benchmark del torneo: **ELO ~1700** (3 tablas / 1 derrota en 4 partidas vs Stockfish d:6) — primeros empates significativos de la historia del motor.  
Partidas promedio: **234 movimientos**. Profundidad máxima alcanzada: **d:30** (final simplificado, Partida 2).

### Bugs Corregidos — Motor (Críticos)
- **Fix de Amnesia del Worker TT** — `askWiseKing()` creaba y terminaba el `chessEngineWorker` en cada turno, borrando las 200K entradas de la tabla de transposición, todas las jugadas asesinas y el historial. El worker ahora se reutiliza durante toda la partida. Un temporizador de seguridad gestiona la recuperación ante fallos sin destruir el estado de la TT. Impacto: la profundidad en finales saltó de d:8–10 a **d:14–18**, con picos en d:30.
- **Fix de fórmula distToPromo** — Corregida una inversión lógica en el evaluador de tormenta de peones que producía evaluaciones incorrectas en ciertos finales.

### Características — Libro de Aperturas
- **Variante de Cambio del Ruy López** — Tras `Axc6 dxc6`, el motor juega `d3` desde el libro en vez de encontrar `Cxe5??` por sí solo (pierde ante `Dd4!`).
- **Apertura Inglesa — Reversed Alekhine** — Tras `c4 e5 Cf3 e4`, el motor juega `Cd4` desde el libro. Antes no tenía cobertura y se derrumbaba en 40 jugadas.
- **Sistema KIA con g3** — 13 entradas nuevas para el sistema `g3 Ag2 Cf3 d3 0-0` contra todas las respuestas negras principales.

### Características — Gestión del Tiempo
- **Salida por estabilidad (umbral 20%)** — La profundización iterativa ahora sale cuando el mejor movimiento es idéntico en 3 profundidades consecutivas, el score varía menos de 20 cp y se ha gastado el 20%+ del tiempo (antes 40%). Requiere `d >= 6` para evitar salidas precipitadas. Ahorra 6–12 segundos por movimiento en posiciones estables.
- **Salida por brecha grande** — Si el mejor movimiento supera al 2º en más de 200 cp a profundidad ≥ 6 (tras el 15%+ de tiempo), el motor confía y para. Ahorra 15–20 segundos en posiciones claramente decididas.

### Características — Arena de Torneo
- **Profundidad de Stockfish seleccionable** — `arena_tournament.js` muestra un menú al inicio para elegir la profundidad de Stockfish (d1–d20) con etiquetas de ELO calibradas por nivel.
- **Fórmula ELO calibrada** — Reemplazado el suelo fijo `2200 − 600 = 1600` por una tabla de ELO por profundidad. Si la puntuación es 0, muestra el límite inferior calibrado con consejo contextual.

---

## v2.12.0 — Teoría de Aperturas y Mejora del Comentarista
**~14.000 líneas · ~685 KB**

Esta actualización refuerza significativamente el juego temprano del motor mediante una expansión masiva del libro de aperturas y pule la conciencia táctica del comentarista.

### Características — Libro de Aperturas
- **Expansión Masiva del Libro (~120+ entradas)** — Duplicado el conocimiento de apertura para manejar transposiciones comunes y trampas tácticas:
  - **Gambito de Dama y Defensa Eslava**: Rutas detalladas para sistemas Exchange, Ortodoxa y Merano (hasta 7-8 movimientos).
  - **Apertura Italiana / Giuoco Piano**: Cobertura profunda de las líneas `c3-d4` y `Ng5` (Fegatello).
  - **Defensa Francesa y Caro-Kann**: Añadidas las variantes más comunes de Avance, Intercambio y Clásica.
  - **Lógica de Transposición**: Soporte amplio para órdenes de movimientos **Nf3 primero**, **c4 primero** y **g3 primero**, alcanzando mediojuegos teóricos incluso con inicios no canónicos.
  - **Corrección del Gambito de Rey**: Corregida la respuesta crítica `e4 e5 f4 exf4` (Nf3) para evitar el error de activación temprana del rey `Ke2??`.
  - **Apertura Bird**: Añadido soporte estructural básico para `1.f4 d5`.
  - *Resultado*: El motor ahora alcanza el mediojuego con una ventaja significativa de tiempo y mejor coordinación posicional.

### Bugs Corregidos — UI / Comentarista
- **Fix de Detección de Jaque Pastor** — La lógica de `isScholarAverted` ahora identifica correctamente `Qf3` como amenaza (antes solo rastreaba `Qh5`).
- **Reconocimiento de Defensas mejorado** — Añadidas `f6` y `Nc6` como respuestas defensivas reconocidas en las alertas del comentarista.
- **Mejora en Secuencia de Amenazas** — La alerta de "amenaza de Jaque Pastor" ahora se activa correctamente incluso si el Alfil (`Bc4`) se juega después de la Dama (`Qf3`), cubriendo el orden de movimientos más común.

---

## v2.11.1 — Actualización de Estabilidad del Motor
**~13.800 líneas · ~677 KB**

Centrado en resolver colapsos catastróficos del árbol de búsqueda en finales largos causados por la mala gestión del hash Zobrist y fugas de timeout en la búsqueda de quietud.

### Bugs Corregidos — Motor (Worker)
- **Check de Repetición Zobrist O(1)** — Eliminado `searchStack.includes(hash)` O(depth). Añadido un `searchSet` paralelo para detección en O(1) de jaques perpetuos y bailes de piezas. Ahorra ~15-20 comparaciones de string por nodo en finales tardíos.
- **Colapso Catastrófico del Árbol (d:0/30)** — Corregido un fallo lógico fatal donde los bucles raíz empujaban el hash del hijo *antes* de llamar a `minimax`, haciendo que `minimax` viera su propio hash al entrar y devolviera 0 al instante. El árbol devolvía 0 para cada jugada legal sin llegar a explorarlas.
- **Fuga de Timeout en Quiescence** — Corregido el bug de `[array vacío / cuelgue de 45s]`. `quiesce` carecía de comprobación de `deadline` en posiciones extremadamente tácticas, causando que el worker se colgara hasta que el temporizador de seguridad de la UI se disparaba. El fallback `engineSearchSync` ahora captura todos los errores lanzados por el worker inmediatamente.
- **Herencia de la Regla de 50 Movimientos** — La función `cloneS` ahora copia correctamente la propiedad `halfMoveClock` para que los nodos hijo raíz tengan el reloj correcto para la evaluación de tablas de la FIDE.
- **Optimización del Bucle de Seguridad del Rey (Fix de NPS)** — Reemplazados los bucles anidados O(576 × `atk()`) en `evaluate()` por un enfoque de O(9-zonas × rayos) mediante ray-casting inverso. Esto mejora significativamente el NPS en posiciones complejas, pasando de ~500 a más de 10.000 en la apertura.
- **Error de Referencia: Fix de TDZ en maxDepth** — Resuelto un fallo donde el motor devolvía un array vacío cuando solo había una jugada legal disponible, causado por acceder a `maxDepth` antes de su declaración.

---

## v2.11.0 — Bugfix & Evaluación / Benchmarks
**~13.800 líneas · ~676 KB**

Resultados del torneo: **ELO ~1818** (vs Stockfish d:10, 10 partidas) — anterior: ~1688 → **+130 ELO**.  
Partidas promedio: 142 movimientos (antes 110). NPS promedio: ~28K (antes ~18K). **2 tablas** por repetición.

### Bugs corregidos — Motor (Worker)
- **En Passant ciego en quiescence** — Las capturas al paso eran invisibles para el filtro de quietud, MVV-LVA y delta pruning. Ahora se detectan correctamente como capturas de peón (`PV['P']`).
- **Regla de los 50 movimientos en minimax** — El motor ignoraba esta regla y seguía calculando en posiciones técnicamente tablas. Añadido `if (halfMoveClock >= 100) return 0`.
- **Explosión de Q-search (caída de NPS)** — La quiescencia sin jaque llegaba a 8 niveles y al explotar reducía el NPS de 18K a ~100-750. Límite reducido a 5 (sin jaque) y 8 (en jaque). NPS medio: +56%.
- **Profundidad Rey Sabio: 12 → 30** — El tiempo es el límite real (30s). En finales con pocas piezas el motor alcanzaba el techo d:12 en 3-8s sin poder profundizar más. Con d:30 la ID puede llegar tan lejos como el reloj permita. `killers = Array(64)` → sin riesgo de overflow.

### Bugs corregidos — UI / Lógica
- **Orden de tablas (K vs R, material insuficiente)** — `halfMoveClock` e `isInsufficientMaterial` se comprobaban *tras* el `return` del bloque `!hasMove`, declarando erróneamente "ahogado" en finales de reyes. Movidos antes del bloque.
- **Comentarista: Jaque Pastor** — `isScholarAverted` usaba coordenadas de tablero hardcodeadas (rompía con tablero volteado y variantes). Reescrito con historial SAN. Detecta cualquier `Qxf7#` / `Qxf2#` con alfil desarrollado en ≤ 12 movs.
- **Profesor ciego al En Passant** — `getMoveSafetyProfile()` y `getTacticalMoveAdjustment()` valoraban capturas al paso como 0. Corregido asignando `PIECE_VALUES['P']`.

### Mejoras de evaluación
- **Peón pasado enemigo — peligro exponencial** — Penalización extra para peones pasados rivales en rango ≥ 4: ×1/×4/×9 factored por fase final. Rango 7 → 270cp extra (más que un alfil → el motor bloquea).
- **Actividad del rey en el final** — Bonus de centralización `8×eg` cp por paso del rey hacia el centro cuando `eg > 0.4`. Reduce shuffling g1↔h2.
- **Doble evaluación de peones pasados eliminada** — `distanceToPromotion × 25` (bucle por pieza) eliminado; el bloque `PASS_OWN / PASS_DANGER` al final de `evaluate()` ya lo cubre.
- **Deflación de bonus posicionales** — Outpost: 140→65 · `enemyMajors`: ×22→×12 · `openFilesThreat`: ×35→×15 · `kPenalty`: min(150,×25)→min(100,×20) · Penalización dama temprana: 150→60 cp. Recompensa máxima teórica por destruir el enroque: 343 → ~193 cp (sacrificar un alfil ya no es "rentable").
- **MVV-LVA alineado con mgPV** — `PV = { N:325, B:335 }` en lugar de `{N:300, B:300}`. El ordenamiento de capturas en quiescence ahora prefiere correctamente el alfil sobre el caballo.

---

## v2.1.0 — Edición de Rendimiento y Heurística
**12.850+ líneas · 653 KB**

Esta versión se centra en la velocidad de ejecución y la profundidad táctica. Al eliminar cuellos de botella de JavaScript y añadir heurísticas posicionales clásicas, el motor ha subido significativamente de nivel, alcanzando un estimado de **~1900 ELO**.

### Optimizaciones de Rendimiento (Turbo Boost)
- **Seguimiento del Rey O(1)** — Las posiciones de los reyes se mantienen en caché, eliminando escaneos costosos del tablero durante la búsqueda.
- **Ray-Casting Inverso isAtk** — La detección de piezas atacadas ahora escanea hacia afuera desde la casilla objetivo, reduciendo drásticamente las comprobaciones por nodo.
- **Lazy Selection Sort** — Reemplazado `.sort()` por una ordenación manual con puntuaciones precalculadas en `Int32Array`, permitiendo cortes Alpha-Beta mucho más rápidos.

### Heurística Avanzada (HCE)
- **Fase 1: Material Tapered** — Los valores de las piezas (mgPV/egPV) se interpolan según la fase del juego, corrigiendo la valoración de intercambios de piezas menores vs torres.
- **Fase 2: Movilidad Segura** — Los bonos de movilidad para Caballos y Alfiles ahora ignoran las casillas controladas por peones enemigos.
- **Fase 3: Ruta de Peones Pasados** — Escaneo avanzado que penaliza rutas de promoción disputadas y añade el **Bono Tarrasch** (torre detrás del peón).
- **Fase 4: Tabla Hash de Peones** — Caché basada en Zobrist para estructuras de peones, evitando escaneos redundantes para peones doblados o aislados.
- **Regla del Cuadrado** — Detección geométrica de peones pasados imparables en el final (+600 de bono).

### Bugs Corregidos y Mejoras
- **Sincronización de Idioma del Comentarista** — Corregido el error que reseteaba las horas a "ahora" y disparaba avisos fantasma de error grave al cambiar de idioma.
- **Sincronización de Valores del Profesor** — Alineados los valores de las piezas en la UI con los promedios del motor (D:885, T:510, A:330, C:315).
- **Libro de Aperturas** — Ampliado a ~100 posiciones / ~280 entradas (incluyendo la Siciliana Abierta, entre otras).

---

## v2.0.0 — El Despertar del Rey Sabio
**12.500+ líneas · 628 KB**

Esta versión incluye una gran actualización arquitectónica del motor junto con una reconstrucción completa de la capa pedagógica. El motor ya no es solo un soporte; ahora es un núcleo táctico refinado.

### Nuevas funciones
- **Teoría de aperturas en el Profesor** — Análisis y ¿Qué hago? ahora nombran la apertura en la que estás y muestran cuántas continuaciones teóricas quedan disponibles.
- **Detección de Oportunidades Perdidas** — El Profesor ahora detecta si dejaste escapar una táctica de oro (como un mate o ganar material limpio) por centrarte demasiado en la última jugada del rival.
- **Comentarista en 3ª Persona y Easter Eggs** — Narración deportiva en estricta tercera persona. Nombres de piezas con género gramatical correcto y huevos de pascua musicales.
- **Libro de aperturas ampliado** — 48 → 97 posiciones, 140 → 274 entradas. Nuevas líneas: Defensa Francesa, Escandinava, Caro-Kann, Apertura Inglesa, Nimzoindia, Grünfeld, India de Dama, Benoni, Reti y Sistema Londres.
- **Librería de Entrenamiento** — 36 posiciones curadas en tres pestañas más 100 retos aleatorios accesibles desde el menú principal.
- **Soporte completo para jugar como Negras** — Corregido un bug crítico del motor de estados y garantizada la respuesta de la IA en cualquier bando.

### Mejoras del Motor
- **Mejoras de Fuerza (P1-P4)** — Puntuación de peones pasados (base 25, multiplicador final ×4.5), centralización temprana del Rey (eg > 0.4), NMP refinado (R=3 a profundidad 8) y tasa de exploración (20%).
- **Fix del Efecto Horizonte** — La búsqueda de quietud ahora evalúa jaques hasta profundidad 2, evitando la ceguera táctica en intercambios profundos.
- **Prevención de Ataques Suicidas** — El motor evita sacrificios dudosos si sus piezas menores aún no están desarrolladas.
- **Antirepetición 2.0** — Lógica real de triple repetición FIDE (evaluación 0.0). Combinado con Hash Zobrist corregido.
- **Corrección en Ventanas de Aspiración** — Arreglado el error de límites para Negras y mejorada la estabilidad.
- **Ordenación de Jugadas** — Jugada TT, heurística de contramovimiento y preordenación raíz MVV-LVA.

### Bugs corregidos
- **Race Condition IA (Movimiento Fantasma)** — Corregido el bug de la "IA loca" al reiniciar durante una búsqueda. Añadidos tokens de generación y abortos de corrutinas.
- **Manejo de Jaquemate** — Corregido "¿Fue buena?" para identificar correctamente mates/ahogados y estados terminales. El mate en 1 ahora muestra solo una jugada.
- **Nivel Serio era imposible de seleccionar** — Corregido con comprobación `isNaN`.
- **Fix de enroque en `simulateMove`** — Ahora mueve correctamente tanto el rey como la torre.
- **Fuga de estado al cargar FEN** — Ahora resetea correctamente todos los relojes y hashes de repetición.
- **Garantía de Intercambio Rentable** — Evita que el Profesor sugiera jugadas que dejen piezas valiosas colgadas.
- **Barra "Pensando" arriba** — Corregidos los saltos de layout en móvil.

### Interno
- Flag `fenPositionLoaded` — distingue posiciones cargadas desde FEN de la jugada-0 de una partida normal, evitando que se muestren mensajes de bienvenida, hints de teoría de apertura y maxShow=20 en posiciones complejas.
- Código muerto (`evaluateRisks`) eliminado del pipeline de evaluación.
- Falsos positivos de rayos X eliminados (guarda `blockers === 1`).
- Filtro de intercambio justo: capturas de igual valor ya no disparan avisos de pieza colgada.

---

## v1.6.0 — La Edición del Motor
**9.387 líneas · 442 KB**

La mayor mejora de motor en la historia del proyecto. La búsqueda pasó de profundidad 6 a profundidad 10.

### Nuevas funciones
- **Late Move Reductions (LMR)** — jugadas tranquilas a partir del índice 3 buscadas a profundidad reducida, re-buscadas si superan alfa. Ganancia de velocidad significativa a profundidad 8+.
- **Null Move Pruning (NMP)** — R=2 para profundidad < 6, R=3 para profundidad ≥ 6. Se omite en jaque y cerca del final para evitar errores de zugzwang.
- **Ventanas de aspiración** — ventana inicial ±máx(50, |puntuaciónAnterior|×0,5) cp, ensanche exponencial en fallo, búsqueda con ventana completa tras 3 fallos consecutivos.
- **Nivel Rey Sabio** — profundidad 10, 35 segundos de tiempo, cero errores intencionados, cero ruido. Modo Entrenamiento se desactiva automáticamente en este nivel.
- **Regla de los 50 movimientos** — implementación completa con `halfMoveClock`.
- **Detección de triple repetición** — hashes de posición Zobrist de 64 bits, modal de reclamación bilingüe.
- **Tablas por material insuficiente** — RR, RAR, RCR, RARA mismo color.
- **Modo revisión de partida** — navegación completa por todos los movimientos al terminar.
- **Botón de pantalla completa**.
- **Libro de aperturas ampliado** — 29 → 48 posiciones.

### Correcciones
- Evaluación del motor unificada entre Worker e hilo principal (PST del rey cónica).
- `ttEvict()` — elimina entradas superficiales (profundidad ≤ 2) cuando la tabla de transposición se llena, preservando resultados profundos de iteraciones anteriores.

---

## v1.5.1 — Hotfix
**8.744 líneas · 384 KB**

- Parche para problemas de temporización del comentarista introducidos en v1.5.0.
- Correcciones menores de interfaz en la nueva pantalla de dificultad.

---

## v1.5.0 — Revisión de Dificultades
**8.703 líneas · 382 KB**

- **Nivel Rey Sabio añadido** (completado con LMR/NMP/Aspiración en v1.6.0).
- Pantalla de dificultad rediseñada con retratos de personajes y estimaciones de ELO.
- Sistema de memoria del comentarista para evitar repetición en movimientos recientes.
- Notas de contexto del Profesor ampliadas con detección de Rayos X y avisos de seguridad del rey.

---

## v1.4.0 — Mejora del Motor de Búsqueda
**8.470 líneas · 366 KB**

- **Principal Variation Search (PVS)** — primera jugada con ventana completa; resto con ventana nula `[α, α+1]`, re-buscada en fallo alto.
- **Heurística de jugadas asesinas** — jugadas tranquilas que causaron cortes beta a la profundidad actual se ordenan antes que otras jugadas tranquilas.
- **Heurística de historial** — bonificación profundidad² para jugadas tranquilas que previamente mejoraron alfa.
- **`evaluateAdvancedFeatures`** — estructura de peones (doblados, aislados, pasados), bonificación de pareja de alfiles, actividad de torres (columna abierta, séptima fila), movilidad del caballo, seguridad dinámica del rey (penalización cuadrática). Activo en Difícil y Rey Sabio.
- ¿Qué hago? del Profesor ampliado con pipeline de validación de libro de aperturas.

---

## v1.3.0 — Soporte FEN
**7.467 líneas · 316 KB**

- **Cargador de posiciones FEN** — los jugadores pueden escribir o pegar cualquier cadena FEN válida para empezar desde una posición arbitraria.
- Validación completa: disposición de piezas, turno, formato de derechos de enroque, legalidad del cuadrado de al paso y conteo de reyes.
- Mejoras menores del Profesor y correcciones del comentarista.

---

## v1.2.0 — Versión de Estabilidad
**7.466 líneas · 319 KB**

- Ojo Halcón refinado — deduplicación de casillas objetivo, distinción de flechas rojas y verdes.
- Mejoras en la navegación de la máquina del tiempo (botones, sincronización del scroll).
- Mejoras en los veredictos de ¿Fue buena?.
- Varios textos del comentarista mejorados.

---

## v1.1.1 — Máquina del Tiempo y Ojo Halcón
**7.350 líneas · 315 KB**

- **Máquina del tiempo del historial** — botones de navegación ⏮ ◀ ▶ para revisar posiciones anteriores.
- **Ojo Halcón** — escáner visual de amenazas con flechas sobre el tablero. Rojo = tus piezas en peligro, verde = capturas disponibles gratis.
- Detección de riesgos del Profesor mejorada.

---

## v1.0.0 — Versión Inicial
**7.111 líneas · 307 KB**

La primera versión completa. Ya contenía la pila pedagógica completa.

- Reglas FIDE completas: generación de jugadas legales, jaque, jaque mate, ahogado, captura al paso, enroque con seguimiento de derechos, coronación de peón.
- Cuatro niveles de dificultad: Fácil (Pollito), Medio (Estudiante), Difícil (Mago), con tasas de error intencionales y ruido de evaluación.
- IA en Web Worker con búsqueda alfa-beta, quietud, tabla de transposición.
- El Profesor: Análisis, ¿Qué hago?, ¿Fue buena?, Modo Entrenamiento con Sentido Araña y código de colores de jugadas, prevención de colgadas.
- El Comentarista con detección de aperturas, reconocimiento del Mate del Pastor, Regalo Griego, motivos históricos, tres estilos configurables.
- Libro de aperturas (29 posiciones).
- Bilingüe español/inglés, autodetectado desde el navegador.
- Cinco temas: Magia, Bosque, Océano, Clásico, Fútbol.
- Reacciones de personajes en victoria/derrota/tablas.
- Barra de ventaja, panel de piezas capturadas, historial de movimientos.
- Síntesis de audio con Web Audio API (sin archivos de audio empaquetados).
- Diseño responsive orientado a móvil.

---

## Cómo se construyó

Diseñado y dirigido por **Aaron Vazquez Fraga**.  
Código escrito casi en su totalidad por **Claude Sonnet** (Anthropic), **Gemini Pro** (Google) y **ChatGPT** (OpenAI).  
Las ideas, la pedagogía, las decisiones de producto y las más de 1000 partidas de prueba vinieron de una persona que quería una forma mejor de enseñar ajedrez a su hija.
