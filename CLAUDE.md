# Star Nova — guía para Claude

Aventura **3D de mundo abierto** hecha con **Godot 4.7** que corre **nativa** en el teléfono (en horizontal), en PC/Mac
y en iPhone/iPad. El dueño habla **español**: responde siempre en español, claro y sin tecnicismos innecesarios.

> **El dueño NO quiere versión de navegador ni de página web** (lo ha pedido muchas veces): el juego es una **app
> nativa** y nada más. No crear páginas web del juego, no sugerir GitHub Pages ni "jugar en el navegador", no usar
> WebView. Todo se hace en `godot/` (GDScript, procesos nativos, la GPU y la CPU del aparato).

## Publicar (el dueño lo pidió: hacerlo SIEMPRE al terminar un cambio)
> **Cuenta de GitHub (nov 2026):** el proyecto vive SOLO en **`aedojoseeduardo9-bit/StarNova`**.
> La cuenta antigua (`aedoniororebolledo6-lgtm`) fue suspendida: **no usarla nunca más** (ni en enlaces,
> ni en remotos, ni en código). Si una sesión no tiene acceso de escritura a `aedojoseeduardo9-bit/StarNova`,
> compilar la APK en el contenedor (`bash tools/compilar_apk.sh <scratchpad>`), mandársela al dueño con
> **SendUserFile** junto con un **respaldo .zip** del proyecto (con `.git`), y pedirle una sesión nueva con ese repositorio.

Con GitHub disponible:
1. Trabajar en la rama asignada → push → esperar en verde **"Compilar Star Nova"** (`.github/workflows/build.yml`):
   corre "los ojos" (capturas + pruebas de los 3 mundos, release **`diagnostico`**) y compila las apps.
2. Mirar las capturas si el cambio es visual (ver "los ojos").
3. Crear el PR a `main` y fusionarlo **sin preguntar**: el dueño lo autorizó para siempre.
4. En `main`, `build.yml` reemplaza el release **`latest`**: `StarNova.apk` (Android), `StarNova_Mac.zip` (Intel y Apple),
   `StarNova_Windows.zip`, `StarNova_Linux.zip`, `StarNova_iOS_Xcode.zip` y `qr.png`.
   Enlace fijo: `https://github.com/aedojoseeduardo9-bit/StarNova/releases/latest/download/StarNova.apk`.
   El título del release es "Star Nova 0.8 (compilación N)"; la app compara su compilación (`application/config/build`,
   la pone CI) con ese número y muestra "Actualizar" en la pantalla de título.
5. Si la rama ya se fusionó antes, reiníciala desde `origin/main` antes de seguir.
6. Cambios solo de documentación (`*.md`, `docs/`) no compilan.
7. Android: paquete **`com.nioro.starnova`**, firmado con la llave de siempre (Secrets o caché privada de CI), así cada
   versión se instala encima de la anterior. La llave **nunca** va en el repositorio.

## Visión (lo que pidió el dueño)
- **Pip**, una ardilla diminuta, recorre islas flotantes para reunir los fragmentos de la estrella **Nova**.
- **Mundo abierto con misiones** (no niveles lineales): cada región tiene misiones que se hacen en cualquier orden.
- Sensación de **roguelite de acción en tercera persona** (inspiración: Risk of Rain 2): habilidades con recarga,
  enemigos que aparecen y se hacen más fuertes con el tiempo (reloj de dificultad), chispas, cofres y objetos.
- Estética **inspirada en Monument Valley**: arquitectura geométrica pastel, arcos, cúpulas, cielos en degradado,
  bruma. **Todo es original**: no copiar personajes, niveles, música ni arte de ese juego.
- **Gráficos (pedido actual del dueño):** mantener el ambiente, pero mucho más **HD**: más polígonos (Pip, torres con
  más detalle, enemigos, PNJ), **pasto**, más **brillo** y mejor luz. Que use de verdad la GPU y la CPU del teléfono.
- **Físicas en todo** (Jolt): personaje, enemigos, proyectiles, campanas, puentes, cajas, esquirlas.
- **Historia** (original): bajo las islas dormía la *Penumbra*; para que no la devoraran, Nova se rompió en fragmentos.
  Su amigo el Guardián se tragó la Penumbra y por eso ya no recuerda quién es. Cada fragmento guarda un recuerdo de
  Nova; Pip los reúne, despierta al Guardián y devuelve a Nova al cielo. Se cuenta con **escenas animadas**.
- **Trajes** que se compran con chispas (y ropa exclusiva en las tiendas de cada mundo).
- **Día y noche** con **música que cambia** según la hora y lo que pasa (día, noche, combate, peligro, jefe).
- **Sombras en oleadas** (no ilimitadas: daban chispas sin fin): cada región trae una ola y luego queda en calma.
  Las invocadas no dan chispas.
- **Viaje por galaxias**: **3 mundos**. Al terminar uno, Pip sube al **Cohete Avellana** (lo armó Brío, el topo) y en el
  **mapa galáctico** elige a dónde viajar (una galaxia se abre al terminar la anterior):
  1. **Islas del Cielo** (Galaxia Nova); jefe: El Guardián.
  2. **Planeta Verdalia** (Galaxia Gemini): praderas, Bosque Susurro, Lago Espejo con cascada y nenúfares, Río
     Cantarín y un altar en un barranco. Estrellas **Alba y Ocaso**; jefe: **Los Gemelos de Raíz**.
  3. **Planeta Prismara** (Galaxia Soledad): islas en el espacio, **metal líquido arcoíris con ondas**, Impulsores
     Cometa y gelatinas trampolín. Estrella **Sola**; jefe: **La Polilla de la Soledad**.
  Cada mundo tiene sus PNJ, su tienda con **ropa exclusiva**, misiones, enemigos, música y escenas. Historia y PNJ en
  `docs/StarNova_Historia_y_Datos.docx`.

## Tecnología
- **Godot 4.7**, GDScript, renderizador *Compatibility* (OpenGL ES 3), físicas **Jolt**. Proyecto en `godot/`.
- Los datos del juego (objetos, ataques, poderes, cofres, enemigos, historia, PNJ, mundos, trajes, modelos) están en
  `godot/data/*.json`; las mallas, colisiones y puntos de cada mundo en `godot/data/mundo_<id>.json/.bin`; los íconos
  en `godot/iconos/` y la música y los sonidos en `godot/audio/*.ogg`. **Para añadir contenido basta editar esos datos.**
- **Luz**: en Compatibility la luz del sol y la ambiental se suman en espacio sRGB; los valores (sol 0.16, ambiente 0.28)
  están ajustados a mano. Si se cambia el renderizador o la luz, comparar capturas antes y después.
- **Arquitectura HD y pasto**: `godot/data/receta_<id>.json` guarda cada mundo pieza por pieza (caja, cilindro, torre,
  arco, ventana…). `python3 godot/tools/hd_mundo.py` (+ `pasto.py`) lo rearma con más polígonos (bordes biselados,
  columnas y cúpulas redondas, follaje con volumen, rocas con relieve, pinos de tres pisos, marcos y repisas en las
  ventanas, zócalos y molduras en las torres, capiteles en los arcos) y reparte el pasto. Sale
  `data/mundo_<id>_hd.json/.bin` (formato de `var_to_bytes`, carga instantánea). **No se suben a git**: los generan
  `ojos.sh`, `build.yml` y `compilar_apk.sh`. `--validar` comprueba que sin HD se obtiene exactamente la malla original.
  Las colisiones siguen siendo las de `mundo_<id>.json`. Calidad: **baja** = arquitectura sencilla sin pasto ni brillo;
  **media** (teléfonos) y **alta** = HD + pasto (media: la mitad, hasta 40 m) + brillo. Con HD, la versión sencilla solo
  dibuja las sombras (más barato). **Pasto solo en Verdalia** (suelo natural): en las Islas del Cielo y en Prismara el
  suelo es piedra pulida tipo concreto y ahí no va pasto (lo pidió el dueño; `CON_PASTO` en `pasto.py`).

## Ver el juego (los "ojos")
1. **En el contenedor** (usar siempre tras un cambio): `bash godot/tools/ojos.sh <godot> <carpeta> [islas gemini soledad]`
   (Xvfb + OpenGL por software). Deja capturas `<mundo>_NN_*.png` + `report.txt` con pruebas: perfil y prólogo, mover,
   salto, voltereta, lechuza y misiones, disparo, cofre y botín, campana, guardado, código de partida, jefe, desmayo,
   agua, traje exclusivo, impulsor y **todas las escenas dejan el mundo como estaba**. Falla si hay `FALLO` o errores de
   guion. Mira las capturas con **Read**. Godot para Linux:
   `https://github.com/godotengine/godot/releases/download/4.7-stable/`.
2. **En GitHub**: cada push publica capturas + informe en el release **`diagnostico`**. Descárgalas con
   `bash tools/capturas.sh <carpeta> [filtro]`.
3. **APK en el contenedor** (si no hay GitHub): `bash tools/compilar_apk.sh <carpeta_cache>` (Godot + SDK de Android
   en caché, llave local: esa APK no se instala encima de la de GitHub).
4. **Después de cualquier cambio visual, mira las capturas** antes de dar el trabajo por terminado.
   Si el dueño manda capturas de su teléfono, úsalas también.

### Atajos (para pruebas y capturas), tras `--` en la línea de órdenes
`godot --path godot -- --auto --ir=coral`. `--auto` empieza sin pantalla de título, como partida de prueba (no guarda).
- `--mundo=islas|gemini|soledad` · `--ir=<lugar>` (Islas: `claro|coral|campana|menta|torre|lavanda|puente|altar|nova|santuario`;
  Gemini: `pradera|bosque|lago|cascada|meseta|rio|puente|altar|raices|santuario|cohete|campana`; Soledad:
  `muelle|mercurio|anillos|planetoide|impulsor|aurora|puente|altar|trono|santuario|cohete`) · `--cam=yaw,pitch,dist`.
- `--dios` · `--t=600` (dificultad) · `--items` · `--frag=N` · `--puente` · `--jefe` · `--enemigos=N --tipo=sombra,erizo --elite`.
- `--arma=rayo:3` · `--poder=agujero` · `--cofre=oro|todos` · `--traje=maga` · `--hora=dia|tarde|noche|amanecer`.
- `--menu=misiones|historia|mochila|trajes|mapa|compendio|sistema` · `--perfiles` · `--perfil=2 --nombre=Nuez`.
- `--cine=<escena> --cinet=12` · `--llegada` · `--vencido` · `--tienda=ovillo|musgo|lumen` · `--galaxia` · `--final`.
- `--hud=0` (fotos sin interfaz) · `--tactil` (controles táctiles en PC) · `--luz=sol,ambiente` · `--calidad=baja|media|alta`
  · `--brillo=umbral,intensidad`.
- `--ojos=CARPETA --ojos_set=islas` lo pone `tools/ojos.sh`.

## Mapa del código (`godot/scripts/`)
- `main.gd` — **núcleo**: estados (`title`, `play`, `menu`, `dialog`, `cine`, `tienda`, `galaxia`, `dead`, `ending`), reglas,
  combate, daño/críticos, cofres, director de enemigos en oleadas, interacción, misiones, jefe, muerte, viajes, atajos.
  Se carga UN mundo por escena: viajar o "Guardar y salir" recarga la escena (`Juego.viaje`).
- `juego.gd` (autoload `Juego`): viaje pendiente, ajustes, compendio, calidad gráfica y **recuperar las partidas de la
  versión anterior de la app** (Android). Guarda en `user://`.
- `datos.gd` (autoload `Datos`): lee `data/*.json`, `compute_stats`, `roll_item/attack/power/chest`.
- `modelos.gd` (modelos de `data/modelos.json` con sus partes con nombre) · `mundo.gd` (carga un mundo, su versión HD y el
  pasto + agua, cascada, metal líquido, impulsor, gelatina) · `builder.gd` (piezas de arquitectura) · `palette.gd` (regiones).
- `enemigos.gd` (16 IA, élites, estados, `Boss` de los 3 jefes, esquirlas) · `combate.gd` (proyectiles, zonas,
  aliados, recogibles) · `arsenal.gd` (ataques, poderes, efectos) · `utileria.gd` (campanas, cristales, luciérnagas,
  cofres, puente, portón, farolillos, lechuza, estrella, PNJ, cohete) · `props.gd` (hoguera, cajas).
- `misiones.gd` · `guardado.gd` (3 perfiles; `snapshot`/`restore`) · `trajes.gd`.
- `hud.gd` (autoload `Hud`) · `touch_ui.gd` · `menus.gd` (título, perfiles, menú por páginas, tienda, galaxia, muerte,
  final, importar partida, botón "Actualizar") · `controls.gd` (teclado/ratón, mando y táctil).
- `cine.gd` + `cine_ctx.gd` + `cine_escenas.gd` (las 26 escenas; **no cambian la partida**: actores temporales y deshacer).
- `sfx.gd` (autoload `Sfx`: sonidos y música con fundidos) · `sky_env.gd` (cielo, estrellas, planetas, noche, espacio) ·
  `fx.gd` (partículas) · `player.gd` · `pip.gd` (modelo y animación de Pip) · `camera_rig.gd` · `ojos.gd` (pruebas).
- Capas de física: 1 terreno · 2 Pip · 4 objetos · 8 enemigos · 16 proyectiles de Pip · 32 enemigos · 64 portón ·
  128 esquirlas · 256 recogibles. En GDScript las lambdas copian las variables simples: el estado compartido va en un
  diccionario. El árbol se pausa fuera de `play`; `Main`, `Hud`, `Sfx`, `Juego`, menús y escenas usan `PROCESS_MODE_ALWAYS`.
- `export_presets.cfg`: Android, Linux, Windows, macOS (universal) e iOS (proyecto de Xcode, ver `godot/IPHONE.md`).
- `tools/compilar_apk.sh` (APK en el contenedor) · `tools/capturas.sh` (bajar capturas) · `godot/tools/ojos.sh`.

## Reglas del proyecto
- Unidades: **1 = 1 metro**. Pip mide ~0.55. Gravedad −22. Arriba es +y; el norte es −z.
- Textos visibles **en español**. Estilo de la interfaz: suave, redondeado, tipografía serif para títulos.
- **En táctil nunca se muestran teclas de PC** (el dueño lo pidió): usa `game.k(textoPC, textoTáctil)`.
- **No poner paneles que tapen el juego**: en pantalla solo el botoncito de la misión seguida. Nada de textos de
  explicación bajo la barra de vida.
- **Interfaz distinta por aparato** (lo pidió el dueño; `Hud.set_touch`): en **Android/iPhone** el HUD de siempre (vida y
  objetos abajo al centro, botones Menú/♪/❚❚ arriba a la derecha, botones táctiles); en **PC/Mac** uno propio: medalla del
  nivel con vida, experiencia y objetos abajo a la izquierda, habilidades grandes con recarga en abanico abajo a la
  derecha y sin botones en pantalla (teclado: Esc pausa, Tab menú, M sonido). Un solo proyecto para todos.
- **Nada de "texto molesto"** (el dueño lo pidió): la pantalla de inicio solo lleva **STAR NOVA** y **Comenzar** (más
  "Actualizar" cuando hay una compilación nueva): sin lema, sin descripción, sin controles, sin versión. En el juego no
  hay avisos de ayuda ("habla con…", "elige tu misión…", teclas) ni la versión; la versión está en Menú → Sistema.
  Los íconos de habilidades en PC van sin letras.
- **Menú como en una aventura clásica**: título → **perfiles** → juego. Una partida nueva solo nace al elegir una ranura
  vacía; el menú del juego no tiene "Nueva partida". Se guarda solo (cada 30 s, al abrir el menú, al cumplir misiones…).
- **No crear fuentes infinitas de chispas** (oleadas con calma; los invocados no dan chispas).
- Nada de identificadores de modelo en commits, PR ni código.
- **Nunca** subir llaves, contraseñas ni tokens al repositorio (es público). Van en Secrets o en la caché de CI.

## Control de avance
Hecho:
- [x] Mundo abierto con 3 mundos (Islas del Cielo, Verdalia, Prismara), regiones, cielo y niebla por región.
- [x] Pip: correr, doble salto, voltereta, coletazo, cámara con colisión; animación completa.
- [x] Combate: 21 ataques con rango, 13 poderes, 49 objetos en 6 rarezas, 18 cofres, 32 enemigos + 6 élites, 3 jefes.
- [x] Misiones principales y secundarias, el jugador elige cuál seguir; sombras en oleadas con calma.
- [x] Historia con 26 escenas animadas; trajes, tiendas con ropa exclusiva, 8 PNJ, Cohete Avellana y mapa galáctico.
- [x] Día y noche, música según la situación, 3 perfiles de guardado, compendio.
- [x] App nativa (Godot) en Android, Mac, Windows, Linux e iPhone/iPad; calidad gráfica; importar partidas con código.
- [x] Sin versión web: la app nativa reemplaza a la anterior (mismo paquete) y recupera sus partidas.

Pendiente / ideas:
- [x] Gráficos HD (1.ª parte): arquitectura con ~5× polígonos y detalles, pasto con viento (Verdalia), brillo, Pip HD (más
  polígonos, pelaje con borde de luz, ojos que brillan).
- [ ] Gráficos HD (2.ª parte): enemigos, PNJ y jefes con más polígonos (`data/modelos.json`); agua con reflejos;
  terreno de Verdalia más suave.
- [ ] Más misiones por región y PNJ; misiones repetibles (escoltas, defender la hoguera, carreras).
- [ ] Mezcla de sonido más rica; que la noche cambie algo del juego (criaturas nocturnas).
- [ ] Más capítulos de historia y PNJ con sus propias escenas.
- [ ] Llave de firma permanente en Secrets (`SIGNING_KEYSTORE_B64`, `SIGNING_PASSWORD`).
