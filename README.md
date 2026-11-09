# ⭐ Star Nova

Aventura **3D de mundo abierto** en el navegador. **Pip**, una ardilla diminuta, viaja por islas flotantes
de arquitectura pastel para devolverle la luz a la estrella **Nova**.

- Misiones en cualquier orden por cuatro regiones (Coral, Menta, Lavanda y el Santuario de Nova).
- Acción roguelite: habilidades, enemigos que se hacen más fuertes con el tiempo, cofres y objetos acumulables.
- Físicas reales en todo (Rapier): campanas colgantes, puentes de tablones, cajas, esquirlas.
- Se juega en **PC** (teclado y ratón) o en el **teléfono en horizontal** (controles táctiles).

## Jugar
- En línea (cuando esté activado GitHub Pages): `https://aedojoseeduardo9-bit.github.io/StarNova/`
- En local: `node tools/serve.mjs 8080` y abrir `http://127.0.0.1:8080/`

## Controles
| Acción | PC | Teléfono |
|---|---|---|
| Moverse / mirar | WASD / ratón | Joystick izquierdo / arrastrar a la derecha |
| Saltar (doble salto) | Espacio | ⤒ |
| Bellotazo | Clic | ● |
| Coletazo | Q o clic derecho | ◎ |
| Voltereta | Shift | » |
| Lluvia estelar | R | ★ |
| Interactuar | E | E |
| Misiones / pausa / sonido | Tab / Esc / M | botones arriba |

## Tecnología
Three.js + Rapier 3D (en `vendor/`, sin compilación). Detalles para desarrollo en [`CLAUDE.md`](CLAUDE.md)
y la investigación de motores en [`docs/investigacion.md`](docs/investigacion.md).

Inspirado en el estilo visual de juegos como Monument Valley y en la acción de Risk of Rain 2;
todos los personajes, niveles y gráficos son originales.
