/* Star Nova — los mundos (cada uno en una galaxia). El juego carga UN mundo por vez: viajar en el Cohete Avellana
 * guarda la partida y recarga la página en el mundo de destino (así nunca hay que desarmar un mundo entero).
 * Un mundo define: regiones (cielo, colores), build(game) → puntos del mapa, misiones, PNJ, jefe, enemigos,
 * música y escenas. Ver CLAUDE.md. */
import { setRegions } from '../world/palette.js';
import { setMissions } from '../missions.js';
import islas from './islas.js';
import gemini from './gemini.js';
import soledad from './soledad.js';

export const WORLDS = { islas, gemini, soledad };
export const WORLD_ORDER = ['islas', 'gemini', 'soledad'];
export let WORLD = islas;

/* Elige el mundo activo (una vez, al arrancar, antes de crear el juego). */
export function setWorld(id) {
  WORLD = WORLDS[id] || islas;
  setRegions(WORLD.regions);
  setMissions(WORLD.missions);
  return WORLD;
}
/* Mundo anterior en el viaje (el que hay que terminar para poder viajar a este). */
export function previousWorld(id) {
  const i = WORLD_ORDER.indexOf(id);
  return i > 0 ? WORLD_ORDER[i - 1] : null;
}
