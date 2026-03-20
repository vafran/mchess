# ♟️ Monolith Chess v2.0.0 — La Edición del Profesor

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
- **Maestría monolítica.** Todo — motor, entrenador, libro de aperturas, librería de entrenamiento, animaciones, sonidos — vive en un único archivo `.html` de ~560 KB. Cero dependencias.

### No-objetivos

- **Derrotar a jugadores titulados.** Esto no es Stockfish. El motor alcanza ~1750 ELO.
- **Multijugador en línea.** Solo juego local.
- **Herramientas avanzadas de preparación.** El libro de aperturas está curado para enseñar, no para preparación profesional.
- **Rendimiento de referencia.** Un JavaScript limpio y legible tiene prioridad.

---

## Cómo jugar

1. **Descarga** el archivo `.html`.
2. **Haz doble clic** sobre él. Se abre en cualquier navegador moderno (Chrome, Firefox, Safari, Edge).
3. **Elige** *vs IA* o *2 Jugadores* desde el menú principal.
4. **Haz clic en una pieza** para seleccionarla. Las casillas legales aparecen como puntos.
5. **Haz clic en un destino** para mover.

Eso es todo. El juego se encarga del resto.

---

## Niveles de dificultad

### 🐣 Fácil — *Pollito* (~630 ELO)

**Para:** Principiantes, niños pequeños, jugadores que aprenden las reglas.

Profundidad 2 · 40% de errores · ±12 cp de ruido · sin libro · sin quietud

### 📚 Medio — *Estudiante* (~1010 ELO)

**Para:** Jugadores que conocen las reglas y quieren su primera partida real.

Profundidad 4 · 20% de errores · ±6 cp de ruido · libro (primeros 2 movimientos) · quietud completa

### 🔥 Difícil — *Mago* (~1400 ELO)

**Para:** Jugadores casuales con experiencia que quieren una prueba real.

Profundidad 6 · 5% de errores · sin ruido · libro completo · todas las técnicas activas

### 👑 Maestro — *Rey Sabio* (~1750 ELO)

**Para:** Jugadores de club fuertes y amateurs avanzados.

Profundidad 10 · 0% de errores · 35s de tiempo · libro completo · evaluación completa · Modo Entrenamiento desactivado automáticamente

<img src="screenshots/ES/characters.png" alt="Personajes" width="300" />


### Tabla resumen

| Nivel | ELO est. | Prof. | Error | Ruido | Libro | Quietud |
|---|---|---|---|---|---|---|
| 🐣 Fácil | ~630 | 2 | 40% | ±12 cp | ❌ | ❌ |
| 📚 Medio | ~1010 | 4 | 20% | ±6 cp | primeros 2 mov. | ✅ |
| 🔥 Difícil | ~1400 | 6 | 5% | ninguno | ✅ completo | ✅ |
| 👑 Rey Sabio | ~1750 | 10 | 0% | ninguno | ✅ completo | ✅ |

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
- **🎉 Divertido** — humorístico y 

<img src="screenshots/ES/comment_scholarsmate_win.png" alt="Comentarista Jaque Pastor" width="650" />
<img src="screenshots/ES/comment_historic.png" alt="Comentario de eco histórico" width="650" />


---

## Librería de Entrenamiento

| Pestaña | Posiciones | Ejemplos |
|---|---|---|
| Aperturas | 7 | Mate del Pastor, Fried Liver, Gambito Budapest |
| Táctica | 15 | Tenedor, clavada, enfilada, descubierta, pasillo, zugzwang |
| Finales | 14 | Lucena, Philidor, regla del cuadrado, oposición, alfil equivocado |
| Aleatorio | 100 | Posiciones mixtas de partidas reales |

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
| Material insuficiente (RR, RAR, RCR, RARA mismo color) | ✅ |
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

---

## Novedades en v2.0.0

Esta versión es una reconstrucción completa de la capa pedagógica. El motor es el mismo. La enseñanza no.

### Teoría de aperturas en el Profesor

Los dos botones principales del Profesor ahora hablan el lenguaje de las aperturas de ajedrez.

**Análisis (🔍)** detecta si la posición actual tiene continuaciones teóricas conocidas. Si las tiene, dice *"Sigues dentro de la teoría — pulsa ¿Qué hago? para ver las jugadas teóricas."* Si has salido del libro, también lo dice con claridad.

**¿Qué hago? (🎯)** muestra una línea de cabecera con el nombre de la apertura y el número de continuaciones teóricas disponibles, justo encima de la lista de jugadas. Tras 1.Nf3 Nf6 ves: *"📚 Apertura Reti — 3 continuaciones teóricas disponibles abajo."* Tras 1.d4 Nf6 2.c4 e6 3.Nc3 Ab4: *"📚 Defensa Nimzoindia"*. La detección utiliza un algoritmo amplio que reconoce posiciones aunque la secuencia exacta no esté almacenada como clave del libro.

### Libro de aperturas ampliado

De 48 posiciones / 140 entradas a **97 posiciones / 274 entradas**. Nuevas líneas: Defensa Francesa (Winawer, Tarrasch, Avance, Cambio), Escandinava, Caro-Kann (Clásica, Karpov, Avance), Apertura Inglesa (Simétrica, Anglo-India, Cuatro Caballos), Nimzoindia (Rubinstein, Clásica, Sämisch), Grünfeld, India de Dama, Benoni, Reti con todas las respuestas negras, Sistema Londres ampliado.

Posiciones que antes generaban un falso *"ya saliste del libro"* en la jugada 2 — como 1.Cf3 Cf6 o 1.d4 e6 — ahora se detectan correctamente como líneas teóricas.

### Librería de Entrenamiento

Un nuevo botón **🧩 Entrenamiento** aparece directamente en el menú principal — ya no está enterrado en Opciones. Abre una biblioteca de 36 posiciones de aprendizaje organizadas en tres pestañas:

- **Aperturas (7)** — Mate del Pastor, Trampa de Legal, Gambito Budapest, Fried Liver, Gambito de Rey, error de la Petrov, tenedor de los Cuatro Caballos
- **Táctica (15)** — Mate del pasillo, tenedor de caballo, clavada absoluta, ataque a la descubierta, jaque doble, enfilada, trampa de dama, jaque ahogado, mate de Anastasia, mate Árabe, zugzwang, sacrificio de alfil en h6, batería, y más
- **Finales (14)** — Escalera, mate de dama, oposición de reyes, coronación, Lucena, Philidor, regla del cuadrado, alfil del color equivocado, dos alfiles vs rey, y más

El botón **🎲 Reto Aleatorio** carga una de 100 posiciones adicionales curadas al azar, con partidas de la Siciliana, estructuras de la Española, defensas indias y finales puros.

### Corrección del jaque mate en 1

Cuando existe un jaque mate en 1, el Profesor ahora muestra exactamente una jugada con la cabecera *"🏆 ¡Jaque Mate en 1! Esta jugada termina la partida."* Antes, la garantía pedagógica forzaba que apareciera una segunda jugada irrelevante incluso cuando la partida ya estaba ganada.

### Corrección del bug del estilo del comentarista

El nivel "Más serio" (nivel 0) era imposible de seleccionar — `parseInt("0") || 1` devuelve `1` en JavaScript porque `0` es falsy. Corregido con una comprobación explícita de `isNaN`. Ambos menús ahora también muestran etiquetas de escala (*Serio | Mixto | Divertido*) directamente debajo del control deslizante.

### Corrección de la detección de victorias

En el modo IA, el confeti ahora solo se lanza cuando gana el humano. Antes se lanzaba en ambos casos.

---

## Arquitectura interna

### Diseño monolítico

~560 KB. Un único archivo `.html`. Sin dependencias externas, sin llamadas a CDN, sin cookies, sin peticiones de red tras la carga.

### Motor de búsqueda

Web Worker + motor de respaldo en el hilo principal. Ambos implementan la misma pila alpha-beta: Profundización Iterativa, PVS, NMP (R=2/3), LMR, Poda de Futilidad, Ventanas de Aspiración, Búsqueda de Quietud (profundidad máxima 8, poda delta), Extensiones de Jaque.

Tabla de transposición de 200K entradas con hashing Zobrist y desalojo inteligente por profundidad en el Worker. Tabla de 50K en el hilo principal.

Ordenación de jugadas: capturas MVV-LVA → coronaciones → jugadas asesinas → heurística de historial → tropismo al rey → bonificación central.

### Evaluación

Tablas PST estilo PeSTO, evaluación cónica del rey (interpolación mediojuego ↔ final), estructura de peones (doblados −15, aislados −20, pasados rango×15), pareja de alfiles (+30), actividad de torres (columna abierta +25, séptima fila +20), seguridad dinámica del rey (penalización cuadrática, tope en 80).

### Libro de aperturas

97 posiciones con pesos teóricos en Difícil/Rey Sabio, aleatorio uniforme en Medio (2 movimientos), desactivado en Fácil.

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

---

## Licencia

Apache License 2.0  
Copyright 2026 Aaron Vazquez Fraga

---

## Cómo se construyó

Monolith Chess fue diseñado y dirigido por Aaron Vazquez Fraga. El código fue escrito casi en su totalidad por asistentes de inteligencia artificial.

La mayor parte de la implementación — arquitectura del motor, técnicas de búsqueda, el sistema del Profesor, el libro de aperturas, la librería de entrenamiento y la mayoría de las correcciones de bugs — fue escrita por **Claude Sonnet** (Anthropic). **Gemini Pro** (Google) contribuyó a decisiones estructurales tempranas y enfoques alternativos. **ChatGPT** (OpenAI) ayudó con problemas concretos en las fases iniciales del desarrollo.

Las ideas, la pedagogía, las decisiones de producto, las más de 1000 partidas de prueba y la dirección de cada iteración vinieron de una persona que quería una forma mejor de enseñar ajedrez a su hija. El código vino de los modelos.

Este es un registro honesto de cómo se construyó el proyecto. Es también, quizás, un documento de cómo se ve la colaboración entre humanos e IA cuando funciona bien.

---

*Monolith Chess v2.0.0 — Un juego de ajedrez hecho para una niña de 9 años que, sin querer, acabó siendo un motor serio.*  
*~560 KB. Cero dependencias. Abre el archivo y juega.*
