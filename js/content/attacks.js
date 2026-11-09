/* Star Nova — 21 ataques principales (salen de los cofres con un rango que multiplica su poder)
 * y 13 poderes especiales (el botón ★). */
import { RARITY } from './icons.js';
import { pickWeighted } from './items.js';

/* kind: shot (proyectil), spread (abanico), lob (parábola), homing (buscador), boomerang, rapid,
 *       bounce (rebota entre enemigos), ring (anillo alrededor), mine (trampa), meteor (cae del cielo),
 *       beam (haz continuo). Efectos: burn, freeze, chain, pierce, splash, poison, leech, stun, void. */
const A = (id, name, glyph, color, desc, o) => Object.assign({ id, name, glyph, color, desc, kind: 'shot', rate: 0.32, dmg: 1, speed: 30, model: 'orb', minTier: 0, type: 'attack' }, o);

export const ATTACK_LIST = [
  A('bellota', 'Bellotazo', 'acorn', '#c98a4b', 'Una bellota rápida y fiel.', { model: 'acorn' }),
  A('ignea', 'Bellota Ígnea', 'ember', '#ff8a5c', 'Quema a los enemigos y estalla un poco.', { rate: 0.38, dmg: 1.1, burn: 0.45, splash: 1.3, model: 'acorn' }),
  A('escarcha', 'Escarcha', 'snow', '#9fe3ff', 'Ralentiza y congela.', { rate: 0.32, dmg: 0.95, freeze: 1.2 }),
  A('rayo', 'Rayo en Cadena', 'bolt', '#fff27a', 'El golpe salta entre enemigos cercanos.', { rate: 0.42, dmg: 1.0, chain: 2 }),
  A('semillas', 'Lluvia de Semillas', 'seed', '#a8d870', 'Cinco semillas en abanico, ideal de cerca.', { kind: 'spread', rate: 0.55, dmg: 0.55, count: 5, spread: 0.22, model: 'seed', speed: 26 }),
  A('pina', 'Piña Explosiva', 'pine', '#d8a050', 'Se lanza en arco y explota.', { kind: 'lob', rate: 0.75, dmg: 2.3, splash: 2.6, model: 'pine', speed: 17 }),
  A('espina', 'Espina Perforante', 'needle', '#e06f9d', 'Atraviesa a varios enemigos.', { rate: 0.36, dmg: 1.3, pierce: 3, speed: 42, model: 'thorn' }),
  A('buscadora', 'Estrella Buscadora', 'star', '#ffe08a', 'Persigue al enemigo más cercano.', { kind: 'homing', rate: 0.34, dmg: 1.15, model: 'star', speed: 20 }),
  A('boomerang', 'Hoja Bumerán', 'boomerang', '#9fd38a', 'Va y vuelve atravesando enemigos.', { kind: 'boomerang', rate: 0.6, dmg: 1.4, pierce: 99, model: 'leaf', speed: 22 }),
  A('rafaga', 'Ráfaga de Avellanas', 'twin', '#c99a6a', 'Disparo rapidísimo de avellanas.', { kind: 'rapid', rate: 0.11, dmg: 0.42, model: 'acorn', speed: 34 }),
  A('espora', 'Espora Tóxica', 'mushroom', '#a6d86a', 'Deja una nube de veneno al impactar.', { rate: 0.45, dmg: 0.8, poison: 0.5, cloud: 1.8 }),
  A('nuez', 'Nuez Saltarina', 'pebble', '#d8b48a', 'Rebota de enemigo en enemigo.', { kind: 'bounce', rate: 0.4, dmg: 1.05, bounces: 3, model: 'acorn' }),
  A('aguja', 'Aguja de Pino', 'needle', '#7fbf8a', 'Tiro lento y certero: críticos devastadores.', { rate: 0.8, dmg: 3.0, speed: 60, critBonus: 0.25, pierce: 1, model: 'thorn' }),
  A('baya', 'Baya Vampira', 'berry', '#e0507a', 'Cada golpe te devuelve vida.', { rate: 0.34, dmg: 1.0, leech: 0.12 }),
  A('trueno', 'Martillo de Trueno', 'hammer', '#c3a7e6', 'Lanzamiento pesado que aturde en área.', { kind: 'lob', rate: 0.95, dmg: 2.8, splash: 3, stun: 1.0, model: 'pine', speed: 15 }),
  A('remolino', 'Remolino de Hojas', 'spiral', '#9fd38a', 'Un anillo de hojas sale de Pip.', { kind: 'ring', rate: 0.7, dmg: 0.8, count: 8, model: 'leaf', speed: 16 }),
  A('trampa', 'Bellota Trampa', 'mine', '#ff9a8a', 'Deja trampas que explotan al acercarse un enemigo.', { kind: 'mine', rate: 0.9, dmg: 2.6, splash: 2.4, model: 'mine' }),
  A('cometita', 'Mini Cometa', 'comet', '#ffd36e', 'Un cometa cae donde apuntas.', { kind: 'meteor', rate: 0.6, dmg: 2.0, splash: 2.0, model: 'star', minTier: 1 }),
  A('arcoiris', 'Haz Arcoíris', 'beam', '#ffb3c7', 'Un haz continuo que quema todo lo que toca.', { kind: 'beam', rate: 0.1, dmg: 0.35, minTier: 3 }),
  A('prisma', 'Prisma de Nova', 'gem', '#d7b8ff', 'Ráfaga de estrellas buscadoras que estallan.', { kind: 'homing', rate: 0.45, dmg: 1.05, count: 3, splash: 1.2, model: 'star', speed: 20, minTier: 3 }),
  A('vaciosemilla', 'Semilla del Vacío', 'void', '#8f7ad8', 'Abre agujeros negros que atrapan a los enemigos.', { rate: 0.85, dmg: 1.4, voidHole: 1, model: 'orb', minTier: 4 }),
];
export const ATTACKS = Object.fromEntries(ATTACK_LIST.map(a => [a.id, a]));

/* Rango de un ataque: multiplica el daño y mejora sus efectos. */
export const TIERS = RARITY;
export function tierMul(t) { return RARITY[Math.max(0, Math.min(5, t))].mul; }

export function rollAttack(tierWeights) {
  const tier = pickWeighted(tierWeights);
  const pool = ATTACK_LIST.filter(a => a.id !== 'bellota' && a.minTier <= tier);
  const a = pool[Math.floor(Math.random() * pool.length)];
  return { id: a.id, tier };
}

const W = (id, name, glyph, color, desc, cd, o = {}) => Object.assign({ id, name, glyph, color, desc, cd, type: 'power' }, o);
export const POWER_LIST = [
  W('lluvia', 'Lluvia Estelar', 'star', '#ffd36e', '8 estrellas caen donde apuntas.', 10),
  W('agujero', 'Agujero Negro', 'void', '#8f7ad8', 'Atrae y tritura a los enemigos durante 3 s.', 14),
  W('meteoro', 'Gran Meteoro', 'comet', '#ff9a6b', 'Un meteoro gigante con una explosión enorme.', 16),
  W('burbuja', 'Burbuja Protectora', 'bubble', '#9fe3ff', 'Invulnerable 3 s y recuperas 20% de vida.', 18),
  W('tormenta', 'Tormenta Eléctrica', 'bolt', '#fff27a', '12 rayos sobre los enemigos cercanos.', 13),
  W('novahelada', 'Nova Helada', 'snow', '#bfefff', 'Congela a todos los enemigos cercanos.', 12),
  W('torreta', 'Torre de Bellotas', 'turret', '#c98a4b', 'Una torre que dispara sola durante 10 s.', 16),
  W('espiritus', 'Espíritus Ardilla', 'clone', '#ffe0c0', 'Dos espíritus disparan contigo durante 8 s.', 18),
  W('flor', 'Flor Sanadora', 'flower', '#9fe3b0', 'Recuperas 40% de vida en 4 s.', 20),
  W('frenesi', 'Frenesí', 'fist', '#ff7a6b', '+100% de vel. de ataque y +40% de velocidad por 5 s.', 15),
  W('terremoto', 'Terremoto', 'quake', '#d8b48a', 'Tres ondas expansivas que lanzan por los aires.', 12),
  W('tiempo', 'Reloj Detenido', 'clock', '#c7c3f0', 'Los enemigos van 80% más lento durante 4 s.', 16),
  W('lechuza', 'Llamada de la Lechuza', 'owl', '#a99bc8', 'Una lechuza espectral arrasa en línea recta.', 11),
];
export const POWERS = Object.fromEntries(POWER_LIST.map(p => [p.id, p]));
export function rollPower() {
  const pool = POWER_LIST.filter(p => p.id !== 'lluvia');
  return pool[Math.floor(Math.random() * pool.length)].id;
}
