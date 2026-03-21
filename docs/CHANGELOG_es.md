# Historial de cambios — Monolith Chess

Todos los cambios relevantes del proyecto están documentados aquí.  
Formato: versión · tamaño · qué cambió.

[Ir a README_es.md](../README_es.md)

---

## v2.0.0 — La Edición del Profesor
**12.262 líneas · 603 KB**

Esta versión incluye una gran actualización arquitectónica del motor junto con una reconstrucción completa de la capa pedagógica. El motor ya no es solo un soporte; ahora es un núcleo táctico refinado.

### Nuevas funciones
- **Teoría de aperturas en el Profesor** — Análisis y ¿Qué hago? ahora nombran la apertura en la que estás y muestran cuántas continuaciones teóricas quedan disponibles. Funciona incluso cuando la secuencia exacta de movimientos no está almacenada como clave del libro.
- **Libro de aperturas ampliado** — 48 → 97 posiciones, 140 → 274 entradas. Nuevas líneas: Defensa Francesa (Winawer, Tarrasch, Avance, Cambio), Escandinava, Caro-Kann (Clásica, Karpov, Avance), Apertura Inglesa (Simétrica, Anglo-India, Cuatro Caballos), Nimzoindia (Rubinstein, Clásica, Sämisch), Grünfeld, India de Dama, Benoni, Reti con todas las respuestas negras, Sistema Londres ampliado.
- **Librería de Entrenamiento** — 36 posiciones curadas en tres pestañas (Aperturas, Táctica, Finales) accesibles desde el menú principal. Cada posición tiene nombre y descripción de la tarea en ambos idiomas.
- **100 retos aleatorios** — extraídos de partidas reales, con mediojuegos de la Siciliana, estructuras de la Española, defensas indias y finales.
- **Botón Entrenamiento en el menú principal** — ya no está enterrado en Opciones.
- **Selector de modo en el modal FEN** — permite elegir modo (2 Jugadores / vs IA) y dificultad antes de cargar cualquier posición, eliminando el laberinto de menús.
- **Soporte completo para jugar como Negras** — Corregido un bug crítico del motor de estados que hacía que la IA dejara de responder si el humano elegía jugar con las piezas negras.
- **Modal Acerca de** — versión, autor, licencia y reconocimiento de las IAs, completamente adaptado a cada tema visual.

### Mejoras del Motor
- **Antirepetición 2.0** — Lógica real de triple repetición FIDE en la raíz de la búsqueda. Las posiciones repetidas se evalúan como 0 (Tablas), permitiendo al motor forzar el empate estratégicamente si va perdiendo o evitarlo si va ganando.
- **Corrección arquitectónica de Hash Zobrist** — Solucionado un desajuste en el filtro del hilo principal que ignoraba derechos de enroque y peón al paso, evitando bucles infinitos en partidas de alto nivel.
- **Corrección en Ventanas de Aspiración** — Arreglado un error de inversión de límites para las piezas negras y mejorada la estabilidad de la ventana a grandes profundidades.
- **Refinamiento del Libro de Aperturas** — Pesos ajustados para evitar desarrollos de caballos al borde (Ca4) e intercambios prematuros (Cd4xc6) en la Apertura Bird y el Sistema Londres.
- **Optimizaciones de Rendimiento** — Refactorización de rutas críticas en el Web Worker para mayor estabilidad durante el cálculo intensivo.

### Bugs corregidos
- **Mate en 1 muestra exactamente una jugada** — la garantía pedagógica forzaba incorrectamente una segunda opción irrelevante cuando la partida ya estaba ganada. Añadido sort mate-primero; el filtro trunca a uno al detectar mate.
- **Nivel Serio era imposible de seleccionar** — `parseInt("0") || 1` devuelve `1` porque `0` es falsy en JavaScript. Corregido con comprobación explícita de `isNaN`.
- **Etiquetas del slider ahora visibles** — Serio / Mixto / Divertido aparecen bajo ambos controles deslizantes.
- **Confeti de victoria solo cuando gana el humano** — en modo IA el confeti se lanzaba en ambos resultados.
- **`simulateMove` ahora maneja el enroque** — movía al Rey pero dejaba la Torre en su casilla original. El Profesor evaluaba mal la seguridad del rey y no detectaba jaquematos después de cualquier enroque.
- **Toque en tablero durante revisión de historial** — tocar el tablero mientras se revisa el pasado ahora vuelve al presente de forma limpia antes de procesar el clic.
- **Movimiento fantasma de la IA** — si se reiniciaba la partida mientras la IA calculaba, el movimiento resultante caía sobre el tablero nuevo corrompiéndolo. Solucionado con un snapshot `startPly` en `triggerAI`.
- **Deshacer durante revisión del historial** — `undoMove` ahora llama a `exitHistoryView()` primero, evitando que el botón cohete 🚀 quede visible indefinidamente.
- **Temporizadores del Ojo Halcón y del Profesor** — clics rápidos lanzaban `setTimeout` solapados; el temporizador anterior expiraba y borraba las flechas del clic más reciente. Solucionado con guardas `clearTimeout`.
- **Fuga de estado al cargar FEN** — cargar un FEN en mitad de una partida ahora limpia correctamente `positionHashes`, `halfMoveClock`, `moveNumber` y las tres variables de snapshot. Antes la regla de los 50 movimientos o la triple repetición podían dispararse en mitad de un puzzle usando datos de la partida anterior.
- **`snapshotBeforeRules` era código huérfano fuera de `undoMove`** — estaba después de la llave de cierre de la función por accidente, sin ejecutarse nunca al deshacer.
- **Garantía de Intercambio Rentable** — el Profesor podía sugerir jugadas que salvaban una pieza mientras abandonaban otra ya colgada. Añadida inyección de capturas gratuitas/rentables en la lista de jugadas, y una Penalización por Pieza Abandonada aplicada de forma consistente en las tres rutas del Profesor (renderProfessorOptions, requestBestMove, continueProfessorSearch).
- **Bug de la "Dama Esnob"** — la lógica de inyección de capturas rechazaba cualquier captura donde la pieza objetivo valía menos que la atacante antes de comprobar si era gratis. Una Dama no podía capturar un Caballo libre porque `30 < 90` disparaba un return temprano antes de evaluar `safeAfter`.
- **203 líneas de código muerto eliminadas** — un bloque de fallback enorme dentro de `continueProfessorSearch` era matemáticamente inalcanzable porque `engineSearch()` devuelve una Promise que captura sus propios errores con `.catch()`. El `return` tras configurar la Promise hacía que todo lo siguiente fuera código zombi. Función reducida de 230 a 28 líneas.
- **`updateVsAiButton` tenía el español hardcodeado** — la función escribía `'🤖 vs IA'` directamente en lugar de llamar a `t('btnVsAi')`, así que el botón nunca se traducía al inglés.
- **Barra "Pensando" movida arriba** — era una píldora flotante en la parte inferior que causaba desplazamientos de layout en móvil. Ahora es una banda fija en la parte superior de la pantalla con animación de progreso continua.

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
