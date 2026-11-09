# Star Nova — guía para Claude

Aventura **3D de mundo abierto** para el navegador (se juega en el teléfono **en horizontal** o en PC).
El dueño habla **español**: responde siempre en español, claro y sin tecnicismos innecesarios.

## Publicar (el dueño lo pidió: hacerlo SIEMPRE al terminar un cambio)
> **Aviso (nov 2026):** GitHub suspendió la cuenta del dueño (`aedoniororebolledo6-lgtm`). Mientras no se
> recupere, no se puede hacer push, PR ni CI. Entonces: compilar la APK en el contenedor
> (`bash tools/compilar_apk.sh <scratchpad>`), mandársela al dueño con **SendUserFile**, y entregarle
> también un **respaldo .zip** del proyecto (con `.git`), porque el contenedor se borra al terminar la sesión.

Con GitHub disponible:
1. Trabajar en la rama asignada → push → esperar en verde **"Compilar APK"** (`build.yml`, en ramas solo
   compila) y **"Ojos (capturas)"** (`ojos.yml`).
2. Mirar las capturas si el cambio es visual (ver "los ojos").
3. Crear el PR a `main` y fusionarlo **sin preguntar**: el dueño lo autorizó para siempre.
4. En `main`, `build.yml` compila la APK y reemplaza el release **`latest`** (`StarNova.apk` + `qr.png`).
   Enlace fijo: `https://github.com/aedoniororebolledo6-lgtm/Star-Nova/releases/latest/download/StarNova.apk`.
   La app compara su número de compilación con el título del release `latest` ("compilación N") y muestra
   el botón "Actualizar" en la pantalla de título.
5. Si la rama ya se fusionó antes, reiníciala desde `origin/main` antes de seguir.
6. Cambios solo de documentación (`*.md`, `docs/`, `tools/`, `ci/`) no compilan una APK nueva.
7. Si la compilación falla, el error queda en el release **`build-error`**.

## Visión (lo que pidió el dueño)
- **Pip**, una ardilla diminuta, recorre islas flotantes para reunir los fragmentos de la estrella **Nova**.
- **Mundo abierto con misiones** (no niveles lineales): cada región tiene misiones que se hacen en cualquier orden.
- Sensación de **roguelite de acción en tercera persona** (inspiración: Risk of Rain 2): habilidades con recarga,
  enemigos que aparecen y se hacen más fuertes con el tiempo (reloj de dificultad), chispas, cofres y
  objetos que se acumulan.
- Estética **inspirada en Monument Valley**: arquitectura geométrica pastel, arcos, cúpulas, cielos en
  degradado, bruma. **Todo es original**: no copiar personajes, niveles, música ni arte de ese juego.
- **Físicas en todo** (motor Rapier): personaje, enemigos, proyectiles, campanas, puentes, cajas, esquirlas.

## Tecnología (y por qué)
- **Three.js 0.180** (render 3D) + **Rapier 3D 0.21** (físicas, el mismo motor que usa Bevy). Ambos están
  copiados en `vendor/` (no hace falta internet ni compilar). Licencias en `vendor/`.
- JavaScript con módulos ES y `importmap` en `index.html`. **Sin paso de compilación**: se edita y se recarga.
- Investigación de motores y repositorios: `docs/investigacion.md` (Godot, Bevy, Babylon, PlayCanvas, etc.).
- Si algún día se quiere APK nativo: empaquetar la web (Capacitor/TWA) o portar a Godot (ver la investigación).

## Ver el juego (los "ojos")
1. **En el contenedor** (rápido, usar siempre tras un cambio visual):
   ```bash
   node tools/ojos.cjs <carpeta_scratchpad>          # todas las escenas + prueba de movimiento
   node tools/ojos.cjs <carpeta_scratchpad> coral    # solo escenas cuyo nombre contenga "coral"
   ```
   Abre Chromium (WebGL por software), recorre escenas con atajos de URL, guarda `NN_nombre.png` y
   `report.txt` (errores de consola, FPS aproximados, posición, enemigos, llamadas de dibujo, pruebas).
   Mira las capturas con **Read**. Los FPS por software son bajos (~8–20): solo sirven para comparar.
2. **En CI**: cada push corre `.github/workflows/ojos.yml` y publica capturas + informe en el release
   **`diagnostico`**. Descárgalas con `bash tools/capturas.sh <carpeta> [filtro]`.
   El trabajo falla si `report.txt` tiene `consola:`, `ERROR` o `FALLO`.
3. **APK en el contenedor** (si CI no está disponible): `bash tools/compilar_apk.sh <carpeta_scratchpad>`
   descarga Gradle + SDK de Android (dl.google.com sí está permitido) y compila. Su llave es local:
   esa APK no se instala encima de la de CI (habría que desinstalar).
4. Servidor local para probar a mano: `node tools/serve.mjs 8080` → `http://127.0.0.1:8080/`.
5. **Después de cualquier cambio visual, mira las capturas** antes de dar el trabajo por terminado.
   Si el dueño manda capturas de su teléfono, úsalas también.

### Atajos de URL (para pruebas y capturas)
`index.html?auto=1` empieza sin pantalla de título. Se combinan con `&`:
- `ir=claro|coral|campana|menta|torre|lavanda|puente|altar|nova|santuario` — aparecer en ese lugar.
- `cam=yaw,pitch,dist` — orientar la cámara (yaw 0 = mirando al norte, -z).
- `dios=1` (sin daño) · `t=600` (segundos de partida: sube la dificultad) · `items=1` (todos los objetos).
- `frag=N` (completa N misiones de fragmento; con 3 se abre el santuario) · `puente=1` (activa los cristales).
- `jefe=1` (3 fragmentos + dentro del santuario: empieza el jefe) · `enemigos=N` (N enemigos alrededor;
  `tipo=sombra,erizo` elige tipos, `elite=1` los hace élite).
- `arma=rayo:3` (ataque y rango 0–5) · `poder=agujero` · `cofre=oro` o `cofre=todos` (estilos de cofre)
  · `compendio=1` (abre el compendio).
- `diario=1` · `pausa=1` · `final=1` (pantalla final) · `hud=0` (sin interfaz, para fotos bonitas).
- `ojos=1` lo pone `tools/ojos.cjs` (conserva el búfer de dibujo para las capturas).
- En la consola del navegador: `window.__starnova.game` da acceso a todo el estado.

## Mapa del código
- `index.html` — interfaz (HUD, pantallas, controles táctiles) e `importmap`. `css/style.css` — estilos.
- `js/main.js` — arranque: inicia Rapier (WASM) y crea `Game`.
- `js/game.js` — **núcleo**: ciclo fijo de 60 pasos/s, habilidades, daño/críticos/efectos de objetos,
  director de enemigos (dificultad por tiempo), interacción (cofres, lechuza), misiones, jefe, atajos.
- `js/physics.js` — mundo Rapier, **grupos de colisión** (`G`), controladores de personaje, rayos.
- `js/world/palette.js` — paletas y nombres de las 5 regiones; mezcla de cielo por posición.
- `js/world/builder.js` — piezas de arquitectura (caja, cilindro, torre, arco, cúpula, isla, pasarela…);
  une la geometría de cada región en **una malla** y crea los colisionadores fijos. Sombreado horneado
  por cara (las caras laterales toman el color `shade` de la región).
- `js/world/layout.js` — **el mapa**: dónde está cada isla, torre, campana, cristal, cofre, etc.
- `js/entities/models.js` — modelos low-poly hechos con primitivas (Pip, Sombra, Farol, Tótem, Guardián, Lechuza).
- `js/entities/player.js` — Pip: movimiento (controlador cinemático), doble salto, voltereta, animación.
- `js/entities/enemies.js` — IA de los 16 enemigos (`ai`: hopper, flyer, heavy, swarm, roller, turret, bomber,
  splitter, healer, shielder, blinker, summoner, sniper, burrower, twister, golem), estados (`tickStatus`),
  élites, el jefe `Guardian` y `shatter` (esquirlas).
- `js/combat.js` — `Shot` (todos los proyectiles de Pip), `StarFall`, `EnemyOrb`, `VoidHole`, `PoisonCloud`,
  aliados (`Turret`, `Spirit`, `OwlSpirit`, `Orbitals`, `Drones`), `Pickup` (chispas, xp, vida, objeto, ataque,
  poder, fragmento) y `Debris`.
- `js/props.js` — campanas (articulación esférica), cristales, cajas, puente de tablones (bisagras),
  luciérnagas, cofres, portón, farolillos (cadena), hoguera, lechuza, estrella Nova.
- **Contenido (123 entradas, datos puros)** en `js/content/`:
  `items.js` (49 objetos en 6 rarezas + `computeStats`), `attacks.js` (21 ataques con rango 0–5 + 13 poderes),
  `chests.js` (18 estilos de cofre en 6 rangos + `rollChest(progreso)`), `enemies.js` (16 enemigos + 6 élites),
  `icons.js` (rarezas y ~60 glifos 2D para íconos). Para añadir contenido basta con agregar una entrada:
  un objeto usa claves de `stats` que ya entiende `computeStats`; un ataque usa un `kind` y efectos existentes;
  un enemigo usa un `ai` y un `model` existentes (o se añade uno nuevo en `enemies.js` / `enemyModels.js`).
- `js/arsenal.js` — ataque equipado (cómo dispara cada `kind`), haz continuo, poderes, efectos al golpear
  (quemar, congelar, cadena, veneno, robo de vida, aturdir, agujero negro…) y aliados/efectos periódicos.
- `js/entities/pip.js` — modelo de Pip (grupos tipo esqueleto) y `PipAnimator` (galope, cola con resorte,
  parpadeo, orejas, voltereta del doble salto, lanzamiento, aplastarse al caer, daño).
- `js/entities/enemyModels.js` — modelos geométricos de los 16 enemigos y el aura de los élite.
- `js/missions.js` — misiones, progreso y objetivos del marcador.
- `js/hud.js` — HUD en DOM + capa 2D (números de daño, barras/nombres de enemigos, marcador de misión),
  íconos y recarga en los botones táctiles, ventana de premio y el **Compendio** (pestaña del diario).
- `js/sky.js` — cielo degradado, estrellas, nubes, islas lejanas. `js/fx.js` — partículas (un solo `Points`).
- `js/input.js` — acciones abstractas (teclado/ratón/táctil). `js/camera.js` — cámara sobre el hombro.
- `js/audio.js` — sonidos sintetizados con WebAudio (sin archivos). `js/util.js` — utilidades.
- `tools/ojos.cjs` (capturas), `tools/serve.mjs` (servidor), `tools/capturas.sh` (bajar capturas de CI).
- `.github/workflows/ojos.yml` (capturas en cada push), `build.yml` (APK + QR), `pages.yml` (versión web).
- `tools/compilar_apk.sh` — compila la APK en el contenedor (Gradle + SDK de Android descargados en caché).
- `android/` — app de Android (Kotlin, sin librerías): `MainActivity.kt` es una WebView que sirve el juego
  desde los assets en `https://appassets.androidplatform.net/` (los módulos ES funcionan sin internet),
  pantalla completa en horizontal, botón Atrás → `game.backButton()`, puente `window.StarNovaAndroid`
  (`build()`, `version()`, `exit()`). Antes de compilar se copian `index.html`, `css/`, `js/`, `vendor/`…
  a `android/app/src/main/assets/` (carpeta ignorada por git). La llave de firma nunca va en el repo.
  Versiones: AGP 8.10.1, Kotlin 1.9.24, Gradle 8.14.3, compileSdk 36, minSdk 26.

## Reglas del proyecto
- Unidades: **1 = 1 metro**. Pip mide ~0.55. Gravedad −22. Arriba es +y; el norte es −z.
- Todo lo que choca va por Rapier. Usa los grupos de `physics.js` (`groups(miembro, filtro)`); al crear
  un colisionador que el juego deba reconocer, regístralo con `phys.own(collider, objeto)`.
  Si el objeto tiene `onHit(proyectil)` o `push(dir, fuerza)`, las bellotas y el coletazo lo afectan.
- Los objetos con cuerpo deben tener `destroy()` que llame a `phys.removeBody` y quite la malla.
- Rendimiento en teléfono: la arquitectura estática va por `Builder` (una malla por región). No crear
  geometrías ni materiales por cuadro; reutiliza `mat()` y `GEO` de `models.js`. Máximo 1 luz puntual.
- Textos visibles **en español**. Estilo de la interfaz: suave, redondeado, tipografía serif para títulos.
- **En táctil nunca se muestran teclas de PC** (el dueño lo pidió). Usa `game.k(textoPC, textoTáctil)` y las
  clases CSS `pc-only` / `touch-only`. El cuerpo lleva `is-touch` en teléfonos y en la app de Android.
- Ajustes guardados en `localStorage` (`starnova.ajustes`): sensibilidad, disparo automático (táctil),
  cámara que acompaña, vibración. El compendio se guarda en `starnova.compendio`.
- Nada de identificadores de modelo en commits, PR ni código.
- Licencias: Three.js (MIT) y Rapier (Apache-2.0) en `vendor/`; mantener sus avisos.
- **Nunca** subir llaves, contraseñas ni tokens al repositorio (es público). Van en Secrets o en la caché de CI.

## Control de avance
Hecho (v0.1):
- [x] Mundo abierto: El Claro + 4 regiones unidas por pasarelas; cielo y niebla cambian por región.
- [x] Pip con controlador de personaje (Rapier): correr, doble salto, voltereta, cámara con colisión.
- [x] Habilidades: bellotazo (clic), coletazo (Q), voltereta (Shift), lluvia estelar (R).
- [x] Enemigos: Sombra, Farol, Tótem + director que escala con el tiempo; jefe El Guardián.
- [x] Chispas, experiencia y niveles, cofres, 14 objetos acumulables (3 rarezas).
- [x] Misiones: Tres Campanas, Luciérnagas, Plaga de Sombras, Puente Dormido, Guardián (+ final).
- [x] Físicas: campanas colgantes, puente de tablones con bisagras, cajas, farolillos en cadena, esquirlas.
- [x] Controles táctiles en horizontal (joystick + botones + ayuda de puntería), aviso de girar el teléfono.
- [x] Ojos: `tools/ojos.cjs` + workflow con release `diagnostico`; publicación en GitHub Pages.
- [x] APK de Android (WebView con el juego dentro), QR en el release `latest`, aviso de actualización.

Hecho (v0.2):
- [x] Pip nuevo: modelo más tierno y animación procedural completa.
- [x] Controles táctiles: botones con íconos y recarga, joystick flotante con zona muerta, disparo
  automático, cámara que acompaña, sensibilidad, vibración; sin teclas de PC en táctil.
- [x] Más de 100 contenidos: 49 objetos, 21 ataques con rango, 13 poderes, 18 cofres en 6 rangos,
  16 enemigos, 6 élites (+ Compendio). Los cofres reaparecen con rango según el avance.

Pendiente / ideas:
- [ ] Guardado de progreso (misiones, objetos) en `localStorage`.
- [ ] Más misiones por región y PNJ; misiones repetibles (escoltas, defender la hoguera, carreras).
- [ ] Música adaptativa; mezcla de sonido más rica.
- [ ] Carga por zonas (streaming) si el mundo crece mucho; nivel de detalle (LOD) para islas lejanas.
- [ ] Postproceso suave (bloom en estrellas/cristales) con opción para teléfonos lentos.
- [ ] Recuperar GitHub (cuenta suspendida) o mudar el proyecto a otro alojamiento, y subir este historial.
- [ ] Llave de firma permanente en Secrets (`SIGNING_KEYSTORE_B64`, `SIGNING_PASSWORD`) cuando haya GitHub.
