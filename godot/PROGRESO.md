# Port nativo (Godot 4.7) — avance

El dueño pidió terminar TODAS las etapas del port nativo. Estrategia: lo que es dato, modelo, mundo, ícono o sonido
se **exporta de la web** con `node godot/tools/exportar_web.cjs` (genera `godot/data/`, `godot/iconos/`, `godot/audio/`);
la **lógica** se porta a mano a GDScript (archivo por archivo, mismo comportamiento que la web).

## Hecho
- Etapa 1: proyecto, Pip, movimiento, cámara, controles (teclado/ratón, mando, táctil), cielo, exportación.
- Etapa 2: Islas del Cielo completas — regiones, 16 enemigos + élites, oleadas con calma, misiones principales y
  secundarias, cofres (18 estilos), objetos, 21 ataques y 13 poderes, jefe El Guardián, muerte y revivir, HUD,
  menú por páginas (Misiones + Historia, Mochila, Trajes con probador 3D, Mapa, Compendio, Sistema), 3 perfiles.
- Etapa 3: Verdalia y Prismara (terreno, agua, cascada, metal líquido, impulsores, gelatinas), PNJ y tiendas con ropa
  exclusiva, Cohete Avellana y mapa galáctico, viajes entre mundos, las 26 escenas animadas, día y noche, estrellas,
  planetas, música por región/noche/combate/jefe con fundidos.
- Etapa 4: proyecto de Xcode para iPhone/iPad (`IPHONE.md`), calidad gráfica, importar partidas de la web con un código.
- Ojos nativos con pruebas de los 3 mundos (`tools/ojos_nativo.sh`).

## Ideas para después
- Afinar a ojo detalles de animación de algunos enemigos comparando capturas con la web.
- Firmar la app de iPhone en CI (necesita cuenta de desarrollador de Apple y un Mac en CI).
