# Historial de cambios — Monolith Chess

Todos los cambios relevantes del proyecto están documentados aquí.  
Formato: versión · tamaño · qué cambió.

[Ir a README_es.md](../README_es.md)

---

## v2.12.0 — Teoría de Aperturas y Mejora del Comentarista
**~14.000 líneas · ~685 KB**

Esta actualización refuerza significativamente el juego temprano del motor mediante una expansión masiva del libro de aperturas y pule la conciencia táctica del comentarista.

### Características — Libro de Aperturas
- **Expansión Masiva del Libro (~60+ entradas)** — Añadidas líneas teóricas profundas para:
  - **Gambito de Dama y Defensa Eslava**: Rutas detalladas para sistemas Exchange, Ortodoxa y Merano (hasta 7-8 movimientos).
  - **Apertura Italiana / Giuoco Piano**: Cobertura profunda de las líneas `c3-d4` y `Ng5` (Fegatello).
  - **Defensa Francesa y Caro-Kann**: Añadidas las variantes más comunes de Avance, Intercambio y Clásica.
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
