# ♟️ Airin Chess

> Un juego de ajedrez completo en un solo archivo HTML, construido para niños que aprenden a jugar.  
> Sin instalación. Sin internet. Sin cuentas. Abre el archivo `.html` en cualquier navegador.

[English README](README.md)

---

## Por qué existe este proyecto

Lo construí para mi hija de 9 años.

Quería aprender ajedrez, pero todas las aplicaciones que encontraba eran o demasiado difíciles (perdía constantemente y se rendía), demasiado simples (parecían un juguete), o estaban llenas de anuncios y distracciones. Quería algo que le enseñara el juego real — reglas FIDE, tácticas reales — pero que también le tendiera la mano cuando cometiera un error, le explicara *por qué* una jugada era mala y la celebrara cuando hiciera algo brillante.

El resultado es un juego que pone la pedagogía primero. El Profesor es más importante que la IA. Perder elegantemente ante una niña de 9 años es una característica del diseño, no un defecto.

---

## Objetivos y no-objetivos

### Objetivos

- **Enseñar, no derrotar.** El trabajo principal es explicar el juego, prevenir la frustración y construir el reconocimiento de patrones. El adversario IA es secundario.
- **Cero fricción.** Sin instalación, sin cuenta, sin internet tras la primera descarga. Funciona en un portátil de diez años igual que en un teléfono moderno.
- **Ajedrez real, no una versión simplificada.** Reglas FIDE completas: al paso, enroque, triple repetición, regla de los 50 movimientos, todo.
- **Indulgente abajo, desafiante arriba.** Fácil y Medio existen para que los principiantes sepan lo que es ganar. Difícil y Rey Sabio existen para cuando estén listos.
- **Maestría monolítica.** Todo — motor, entrenador, libro de aperturas, librería de entrenamiento, animaciones, sonidos — vive en un único archivo `.html` de ~860 KB. Cero dependencias.

### No-objetivos

- **Derrotar a jugadores titulados.** Esto no es Stockfish. El motor alcanza **~1652 ELO** en el nivel Mago y **~1830 ELO** en el nivel Rey Sabio (validado: torneos de 40 partidas vs UCI_Elo 1750, v2.23.0). La cifra exacta depende del hardware — ver nota de calibración más adelante.
- **Multijugador en línea.** Solo juego local.
- **Herramientas avanzadas de preparación.** El libro de aperturas está curado para enseñar, no para preparación profesional.
- **Rendimiento de referencia.** Un JavaScript limpio y legible tiene prioridad, aunque la v2.1.0 introdujo correcciones críticas en cuellos de botella de bajo nivel.

---

## Cómo jugar

**Localmente**

1. **Descarga** el archivo `.html`.
2. **Haz doble clic** sobre él. Se abre en cualquier navegador moderno (Chrome, Firefox, Safari, Edge).
3. **Elige** *vs IA* o *2 Jugadores* desde el menú principal.
4. **Haz clic en una pieza** para seleccionarla. Las casillas legales aparecen como puntos.
5. **Haz clic en un destino** para mover.

**En línea**

1. **Ve a** el sitio de GitHub Pages: [https://airinchess.com](https://airinchess.com)  
2. **Juega directamente** en el navegador. No se necesita descargar nada.

---

## Niveles de dificultad

<img src="screenshots/ES/characters.png" alt="Personajes" width="300" />

| Nivel | ELO est. | Prof. | Tope de tiempo | Error | Libro |
|---|---|---|---|---|---|
| 🐣 Fácil | ~630 | 2 | 0,5s | 40% | ❌ |
| 📚 Medio | ~1010 | 5 | 5s | 15% | primeros 2 mov. |
| 🔥 Mago | ~1652 (validado) | hasta 30 | 15s | 0% | ✅ completo |
| 👑 Rey Sabio | ~1830 (validado) | hasta 30 | 30s | 0% | ✅ completo |

> **Hardware de calibración ELO:** CoolPC Black VIII — AMD Ryzen 7 3700X @ 4.4 GHz, 16 GB DDR4 3200 MHz (~95k NPS en condiciones de torneo).
>
> ⚠️ **Nota sobre el hardware:** Airin es un motor JavaScript puro que se ejecuta en el navegador. Su fuerza escala directamente con la velocidad de la CPU del dispositivo — el presupuesto de tiempo (15s / 30s) es fijo, pero la profundidad de búsqueda alcanzada dentro de ese presupuesto no lo es. En un PC de juego de gama media puedes esperar los valores ELO validados anteriores. En un portátil típico, aproximadamente 50–100 ELO menos; en un teléfono o tableta, 150–250 ELO menos. Fácil y Medio son en la práctica independientes del hardware — sus límites de profundidad (2 y 4) siempre se alcanzan mucho antes de agotar el tiempo en cualquier dispositivo moderno. El Mago y el Rey Sabio buscan tan profundo como el tiempo lo permite, por lo que su fuerza escala con el hardware del usuario.

---

## El Profesor

El corazón del juego. Tutor de ajedrez interactivo, contextual y bilingüe en todo momento.

### 🔍 Análisis
Evalúa control del centro, amenazas de rayos X, seguridad de piezas, seguridad del rey, balance material, fase de la partida y estado de la teoría de apertura.

<img src="screenshots/ES/coach_analysis.png" alt="Analisis" width="650" />

### 🎯 ¿Qué hago?
Sugerencias de jugadas respaldadas por el motor, con indicadores de riesgo, explicaciones estratégicas, cabeceras de teoría de apertura y clic para resaltar en el tablero. **Ley de Kasparov:** cuando existe jaque mate, se muestra solo. **Ley del Comercio Justo:** las capturas de igual valor nunca activan avisos de pieza colgada.

<img src="screenshots/ES/coach_openings.png" alt="WHat Should I Do?" width="650" />

### 💡 ¿Fue buena?
Veredicto post-jugada (Excelente / Buena / Aceptable / Inexactitud / Error) con flecha de refutación para los errores.

<img src="screenshots/ES/coach_wasitgood.png" alt="¿Fué buenas?" width="650" />

### 🦅 Ojo Halcón
Escáner visual de amenazas. Flechas rojas = tus piezas en peligro. Flechas verdes = capturas gratuitas disponibles.

<img src="screenshots/ES/hawkeye.png" alt="Ojo de Hacón" width="650" />

### 🎓 Modo Entrenamiento
Sentido Araña (piezas atacadas brillan), casillas de destino con código de colores, prevención de colgadas con confirmación. Se desactiva automáticamente en el nivel Rey Sabio.

<img src="screenshots/coach_trainingmode.png" alt="Coach Modo Entrenamiento" width="500" />

---

## El Comentarista

Narra cada movimiento en tiempo real. Reconoce nombres de aperturas, formación del Mate del Pastor, Regalo Griego, incursiones de caballo, motivos históricos y cambios importantes de material.

Tres estilos, con etiquetas ahora visibles bajo el deslizador:
- **🧐 Serio** — técnico y preciso
- **⚖️ Mixto** — equilibrado (por defecto)
- **🎉 Divertido** — humorístico y dramático

<img src="screenshots/ES/comment_scholarsmate_win.png" alt="Comentarista Jaque Pastor" width="650" />
<img src="screenshots/ES/comment_historic.png" alt="Comentario de eco histórico" width="650" />


---

## Librería de Entrenamiento

| Pestaña | Posiciones | Ejemplos |
|---|---|---|
| Aperturas | 7 | Mate del Pastor, Fried Liver, Gambito Budapest |
| Táctica | 15 | Tenedor, clavada, enfilada, descubierta, pasillo, zugzwang |
| Finales | 14 | Lucena, Philidor, regla del cuadrado, oposición, alfil equivocado |
| Aleatorio | 30 | Puzzles tácticos curados con tema: mate, tenedor, clavada, ensarte, sacrificio, coronación |

<img src="screenshots/ES/training.png" alt="Librearía FEN de entrenamiento" width="500" />


---

## Reglas FIDE

| Regla | Estado |
|---|---|
| Generación de jugadas legales — todas las piezas | ✅ |
| Jaque, jaque mate, ahogado | ✅ |
| Captura al paso | ✅ |
| Enroque — ambos lados, derechos, bloqueado en jaque | ✅ |
| Coronación — auto-dama o elección del jugador | ✅ |
| Material insuficiente (KK, KBK, KNK, KBKB mismo color) | ✅ |
| Triple repetición con modal de reclamación | ✅ |
| Regla de los 50 movimientos | ✅ |
| Deshacer restaura el estado completo | ✅ |

---

## Opciones

| Opción | Valores |
|---|---|
| Idioma | 🇪🇸 Español / 🇬🇧 English (autodetectado en el primer acceso) |
| Tema visual | 🪄 Magia · 🌲 Bosque · 🌊 Océano · 🏛️ Clásico · ⚽ Fútbol |
| Estilo del comentarista | Serio · Mixto · Divertido |
| Sonido | Activado / Desactivado |
| Modo Entrenamiento | Activado / Desactivado |


## Problemas conocidos

| # | Gravedad | Descripción | Fix previsto |
|---|---|---|---|
| 1 | Baja | **Ahogado en posiciones ganadas (solo Rey Sabio)** — En finales simplificados muy poco frecuentes (dama + peones vs rey solo), el motor puede hacer un movimiento que ahogue al rey rival en lugar de darle jaque mate, convirtiendo una victoria en tablas. Causa: la búsqueda de quietud evalúa la posición final con `evaluate()` sin comprobar si el rival tiene jugadas legales. Ocurre aproximadamente 1 de cada 50 finales ganados con rey enemigo solo. | v2.14.0 — fix en la quiescence search |

---

## Lo nuevo en v2.23.0 — *Publicación de Producción*

Sustituye a v2.22.5 (~1732 ELO, 27,5%) como versión de producción. Incluye diez parches de motor, un rediseño completo de la interfaz y mejoras pedagógicas significativas.

### 🚀 Motor: Diez Mejoras Acumuladas (v2.22.6 → v2.22.15)

Cada parche fue validado con un torneo dedicado antes de su inclusión.

- **v2.22.6** — Regla del Cuadrado: bug de evaluación fantasma eliminado (otorgaba hasta +942cp por peones pasados en cualquier final)
- **v2.22.7/10** — Filtro anti-colgadas: puerta BLOCKED(mate) añadida; puerta BLOCKED(worse) refinada
- **v2.22.8/9** — PASS_DANGER: bug de asimetría corregido; valor base reducido para evitar tablas maratonianas
- **v2.22.11** — Filtro anti-colgadas extendido a capturas perdedoras (SEE < 0 en capturas)
- **v2.22.12** — Puerta de Centralización del Rey: bono de actividad limitado a finales genuinos
- **v2.22.13** — Ceguera de repetición corregida: jugadas repetidas reciben −9000; confirmadas 266 activaciones en 32 partidas
- **v2.22.14** — Puerta BLOCKED reducida de 100cp a 50cp
- **v2.22.15** — Torre en 7.ª fila: bono tapered +40cp MG / +25cp EG

**Resultados del torneo (40 partidas cada uno, PC, UCI_Elo 1750):**
- Nivel Mago (15s/jugada): 11V 7E 22D — **36,3% — ~1652 ELO [IC: 1542–1762]**
- Nivel Rey Sabio (30s/jugada): 21V 7E 12D — **61,3% — ~1830 ELO [IC: 1721–1938]**

### 🎓 Mejoras Pedagógicas y del Comentarista

- **Detección de colgadas en la apertura** — el comentarista marca piezas colgadas desde la jugada 1; el Modo Entrenamiento también avisa cuando el jugador ignora una dama o torre ya bajo ataque
- **Desambiguación PGN** — la notación SAN emite correctamente `Cbd2`/`Tfe1` cuando dos piezas del mismo tipo pueden alcanzar la misma casilla; la importación en Lichess/Chess.com ya no rechaza las exportaciones
- **Precisión de la barra de ventaja** — mapeo sigmoidal (tanh) sustituye la escala lineal; coincide con el comportamiento de Lichess y no satura en ±700cp
- **Calidad de jugada con 7 niveles** — colgada / error / imprecisión / neutral / bien / buena / muy buena / brillante, cada uno con emoji y mensaje distintos
- **Comentarista modo divertido ampliado** — frases más variadas para todos los tipos de pieza en español e inglés
- **Correcciones de falsos positivos del Profesor** — puerta de sacrificio, guardia worstEval, umbral ajustado

### 🖥️ Rediseño de Interfaz

- **Carrusel de jugadas** — tira horizontal compacta bajo el tablero; sustituye el listado lateral
- **Disposición responsiva renovada** — tablero + barra de ventaja en fila 1, tira de jugadas en fila 2
- **Barra superior rediseñada** — título integrado, menú hamburguesa en línea
- **Etiquetas de estilo en aperturas** — cada sugerencia muestra una insignia de color (⚡ Agresiva, 🧱 Sólida, 🔀 Flexible…)
- **Frases dinámicas de jugadas de libro** — comentarios variados cuando se juega una jugada teórica

---


## Historial completo de versiones

Consulta [docs/CHANGELOG_es.md](docs/CHANGELOG_es.md) para el historial completo de versiones.

## Arquitectura interna

### Diseño monolítico

~860 KB. Un único archivo `.html`. Sin dependencias externas, sin llamadas a CDN, sin cookies, sin peticiones de red tras la carga.

### Motor de búsqueda

Web Worker + motor de respaldo en el hilo principal. Pila alpha-beta: Profundización Iterativa, PVS, NMP (R adaptativo), LMR (fórmula logarítmica), Poda de Futilidad (profundidad ≤ 2, márgenes 175/350 cp), Ventanas de Aspiración (±75 cp), Búsqueda de Quietud (máx. 5 sin jaque / 8 en jaque, poda SEE, poda delta), Extensiones de Jaque, Extensiones de Peón Avanzado.

Tabla de transposición de 1 048 576 entradas (20 MB, `Int32Array`) con hashing Zobrist y preferencia por profundidad. Las entradas EXACT nunca se sobreescriben por entradas UPPER/LOWER. Cada entrada guarda la mejor jugada. Tablero en `Int8Array(64)` plano — 45–80k NPS en hardware típico.

Ordenación de jugadas: jugada TT (prioridad 1.000.000) → capturas MVV-LVA → coronaciones → jugadas asesinas → contramovimiento → heurística de historial → tropismo al rey. Las jugadas raíz se preordenan con MVV-LVA antes de la primera iteración.

### Evaluación

Tablas PST duales estilo PeSTO (`PST_MG` / `PST_EG`) con interpolación tapered entera (`(mgVal × ph + egVal × (24-ph)) / 24 | 0`). Estructura de peones: doblados −15, aislados −40, pasados escalados por fase + Regla del Cuadrado. Pareja de alfiles (+40). Escudo/Tormenta del rey (mediojuego). Actividad de torres (columna abierta +40, séptima fila +35, torres conectadas +15). Seguridad dinámica del rey. Detección de caballo-outpost. Penalización de mal alfil.

Valores de piezas: C=325, A=335, T=500, D=900. Interpolación tapered mediojuego/final.

### Libro de aperturas

~826 entradas en ~100 posiciones, con pesos teóricos en Difícil/Rey Sabio, aleatorio uniforme en Medio (2 movimientos), desactivado en Fácil.

### Audio

Todos los sonidos sintetizados en tiempo de ejecución con la Web Audio API. Sin archivos de audio empaquetados.

---

## Soporte móvil

Viewport bloqueado · `touch-action: manipulation` · tablero `min(96vw, 520px)` · pantalla completa webkit · fallback del Worker.  
Probado en Chrome para Android, Safari para iOS, Firefox para Android.

---

## Compatibilidad

Requiere ES2017+. Probado en Chrome 90+, Firefox 88+, Safari 14+.

---

## Historial de versiones

[ChangeLog](docs/CHANGELOG_es.md)

---
<a name="colaboracion"></a>
## Ejemplos de colaboración con la IA

[Colaboración IA](docs/AI_COLLABORATION_es.md)

## Cómo contribuir

Airin es un único archivo `.html` sin paso de compilación, sin bundler y sin gestor de paquetes. Se abre en cualquier navegador y funciona directamente — lo que significa que muchas contribuciones se pueden probar en minutos.

### Contribuciones sencillas — sin torneo necesario

| Área | Qué hacer |
|---|---|
| Bugs | Abre un Issue con pasos para reproducir + captura de pantalla |
| Frases del comentarista | Añade entradas al objeto `I18N` en los bloques `es:` y `en:` |
| Libro de aperturas | Añade líneas a `OPENING_BOOK` (SAN separado por comas → `[{m, w}]`). Solo jugadas teóricas inequívocas — una jugada errónea del libro se ejecuta en todas las partidas |
| Posiciones de entrenamiento | Añade FENs a la Biblioteca de Entrenamiento con tema y descripción |
| UI / CSS | Edita estilos en línea o variables CSS; prueba abriendo el archivo directamente |

### Cambios al motor — torneo requerido

El motor de búsqueda es un alfa-beta de ~1.200 líneas dentro de un Web Worker. Cualquier cambio en la evaluación, los parámetros de búsqueda o el orden de jugadas requiere validación por torneo antes de poder fusionarse:

- **Validación de desarrollo (cada parche):** torneo de 20 partidas (~4 horas a 15s/jugada, ~7–8 horas a 30s/jugada)
- **Aprobación para release (fusión a main):** torneo de 40 partidas con UCI_Elo (~7,5 horas a 15s/jugada, ~14–16 horas a 30s/jugada)

```bash
cd stockfish_tests
# Desarrollo — valida cada parche (~4h a 15s)
node arena_tournament.js --batch --sf-mode uci_elo --sf-value 1750 --games 20
# Release — requerido antes de abrir un PR a main (~7,5h a 15s)
node arena_tournament.js --batch --sf-mode uci_elo --sf-value 1750 --games 40
```

Requiere Node.js, Puppeteer y `stockfish.exe` en la raíz del proyecto.

**La regla:** un cambio por PR. Nunca combines dos cambios al motor — si el ELO cae, no podrás aislar la causa. Ejecuta los torneos en un PC de escritorio (los portátiles sufren throttling térmico y producen estimaciones de ELO poco fiables). Incluye el JSON del torneo en la descripción del PR.

### Notas de arquitectura

- El juego completo vive en `mChess.html` (~860 KB, ~16.500 líneas). No hay otros archivos fuente.
- **Dos motores:** el Web Worker (juega todas las partidas reales) y el motor del hilo principal (solo para el Entrenador/análisis, nunca juega). Los cambios en uno no afectan al otro.
- **El código del Worker** es un string JS dentro de `createEngineWorker()` — edítalo como JS normal; el navegador lo vuelve a analizar en cada carga.
- **Bump de versión obligatorio** en cada cambio al motor — 4 lugares en el HTML: comentario `<!--`, `<title>`, texto del botón y `console.log`.
- **Pruebas:** abre el archivo via `file:///` directamente. No se necesita servidor.


---

## Pruebas con Stockfish (Entrenamiento del Motor)

Las heurísticas y pesos posicionales del motor han sido **entrenados y ajustados jugando torneos automatizados contra Stockfish**. Esta carpeta agrupa las utilidades para ejecutar partidas automáticas entre `mChess.html` y Stockfish, recoger resultados y generar análisis rápidos.

- Ubicación: [stockfish_tests](stockfish_tests)
- Comandos rápidos (desde la raíz del proyecto):

```bash
# Ejecutar un torneo de 20 partidas en modo batch (sin interrupciones, guarda JSON automáticamente)
node stockfish_tests/arena_tournament.js --batch --depth 7 --games 20

# Inspeccionar resultados
node stockfish_tests/analyze_results.js
```

Notas:
- `arena_tournament.js` abre `../mChess.html` (carpeta padre) y por defecto espera `stockfish.exe` en la raíz. Puede usarse la variable de entorno `STOCKFISH_PATH` para especificar otro ejecutable.
- Los resultados y sugerencias se guardan en `stockfish_tests`.

## Licencia

Apache License 2.0  
Copyright 2026 Aaron Vazquez Fraga

---

## Cómo se construyó

Airin Chess fue diseñado y dirigido por Aaron Vazquez Fraga. El código fue escrito casi en su totalidad por asistentes de inteligencia artificial.

La mayor parte de la implementación — arquitectura del motor, técnicas de búsqueda, el sistema del Profesor, el libro de aperturas, la librería de entrenamiento y la mayoría de las correcciones de bugs — fue escrita por **Claude Sonnet** (Anthropic). **Gemini Pro** (Google) contribuyó a decisiones estructurales tempranas y enfoques alternativos. **ChatGPT** (OpenAI) ayudó con problemas concretos en las fases iniciales del desarrollo.

Las ideas, la pedagogía, las decisiones de producto, las más de 1000 partidas de prueba y la dirección de cada iteración vinieron de una persona que quería una forma mejor de enseñar ajedrez a su hija. El código vino de los modelos.

Este es un registro honesto de cómo se construyó el proyecto. Es también, quizás, un documento de cómo se ve la colaboración entre humanos e IA cuando funciona bien.

---

*Airin Chess v2.22.6 — Un juego de ajedrez hecho para una niña de 9 años, que accidentalmente se convirtió en un motor serio.* *~860 KB. Sin dependencias. Abre el archivo y juega.*
