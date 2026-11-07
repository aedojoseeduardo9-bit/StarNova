# Investigación: motores y repositorios para Star Nova

Búsqueda en GitHub (noviembre 2026) de motores, físicas, controladores de personaje y estilos visuales
para una aventura **3D de mundo abierto** que se juegue en el **teléfono en horizontal**.

## Motores de juego / render 3D
| Repositorio | Estrellas | Qué aporta | Decisión |
|---|---|---|---|
| [mrdoob/three.js](https://github.com/mrdoob/three.js) | ~118k | Render 3D web más usado; enorme ecosistema | **Elegido** (render) |
| [godotengine/godot](https://github.com/godotengine/godot) | ~120k | Motor completo, exporta APK nativo, escenas, editor | Alternativa para un APK nativo futuro |
| [bevyengine/bevy](https://github.com/bevyengine/bevy) | ~50k | Motor ECS en Rust, muy rápido | Interesante, pero compila lento y cuesta más iterar |
| [BabylonJS/Babylon.js](https://github.com/BabylonJS/Babylon.js) | ~26k | Motor web completo | Válido; Three.js tiene más ejemplos y librerías |
| [playcanvas/engine](https://github.com/playcanvas/engine) | ~17k | Motor web ligero, WebGPU | Válido; su editor es en la nube |
| O3DE | — | Motor AAA (Linux Foundation) | Demasiado pesado para un juego móvil web |

**Por qué Three.js**: se juega abriendo un enlace (sin instalar), funciona en el teléfono, y Claude puede
**ver y probar** el juego dentro del contenedor (capturas automáticas con Chromium). Con Godot no hay
forma práctica de verlo aquí.

## Físicas
| Repositorio | Estrellas | Notas |
|---|---|---|
| [dimforge/rapier](https://github.com/dimforge/rapier) | ~6k | Físicas 2D/3D en Rust → WASM. **Elegido**. Trae controlador de personaje cinemático, articulaciones, CCD |
| [avianphysics/avian](https://github.com/avianphysics/avian) | ~3k | Físicas ECS para Bevy |
| [appsinacup/godot-rapier-physics](https://github.com/appsinacup/godot-rapier-physics) | ~1k | Rapier dentro de Godot (útil si algún día se porta) |
| Jolt (jolt-ts y otros) | — | Muy bueno (lo usa Horizon), bindings web aún jóvenes |

## Control del personaje y entrada
- **Controlador cinemático** (lo recomendado para plataformas): se usa el `KinematicCharacterController`
  de Rapier (pendientes, escalones automáticos, pegarse al suelo, empujar cuerpos dinámicos).
  Inspiración: *ecctrl* (pmndrs) y controladores de Unity/Godot.
- Entrada desacoplada en **acciones** (`jump`, `primary`…) para teclado, ratón y táctil: `js/input.js`.
- [yoannmoinet/nipplejs](https://github.com/yoannmoinet/nipplejs) (~2k): joystick virtual. Se hizo uno propio
  más simple para no añadir dependencias.

## Gráficos, sombreado y estilo
- [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) (~3k): bloom/efectos para el futuro.
- [gkjohnson/three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) (~3.6k): rayos rápidos contra mallas
  (útil si se pasa a terrenos con malla compleja).
- [mayacoda/toon-shader](https://github.com/mayacoda/toon-shader), *The Book of Shaders*: sombreado tipo cel.
- Estilo actual: geometría plana (flat shading) + **sombreado horneado por cara** con el tono de cada región,
  niebla de color, cielo degradado y bruma — inspirado en el lenguaje visual de Monument Valley, con
  diseños propios.

## Mundo abierto (streaming)
- [FunSoftWareTechologies/OpenWorlds](https://github.com/FunSoftWareTechologies/OpenWorlds),
  [NASA-AMMOS/3DTilesRendererJS](https://github.com/NASA-AMMOS/3DTilesRendererJS): ideas de carga por zonas.
- Plan: cuando el mapa crezca, dividir en **regiones** (ya lo está: una malla por región) y cargar/descargar
  por distancia; LOD para islas lejanas.
