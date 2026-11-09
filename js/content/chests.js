/* Star Nova — 18 estilos de cofre en 6 rangos. Mientras más avanza la partida, más alto el rango. */
import { pickWeighted } from './items.js';

/* loot: drops [mín, máx], probabilidad de ataque y de poder, pesos de rareza de objeto y de rango de ataque.
 * rule: reglas especiales (sangre = cuesta vida; sombrío = aparecen enemigos élite; azar = premio variable). */
const C = (id, name, rank, desc, cost, look, loot, rule = null) => ({ id, name, rank, desc, cost, look, loot, rule, kind: 'chest' });

export const RANKS = ['Común', 'Poco común', 'Raro', 'Épico', 'Legendario', 'Mítico'];
export const RANK_COLORS = ['#e9e2d8', '#8fdcae', '#8cc6ff', '#c79bff', '#ffd36e', '#ff8fb5'];

export const CHEST_LIST = [
  // rango 0
  C('madera', 'Cofre de Madera', 0, 'El cofre de siempre.', 1.0, { shape: 'box', base: '#d8a878', trim: '#a7744c', gem: '#ffd36e' },
    { drops: [1, 1], attack: 0.22, power: 0.04, item: [82, 17, 1, 0, 0, 0], tier: [70, 27, 3, 0, 0, 0] }),
  C('canasta', 'Canasta de Bellotas', 0, 'Barata: un objeto común y chispas de vuelta.', 0.6, { shape: 'basket', base: '#e8c08a', trim: '#b5874f', gem: '#c98a4b' },
    { drops: [1, 1], attack: 0, power: 0, item: [100, 0, 0, 0, 0, 0], tier: [100, 0, 0, 0, 0, 0], refund: 0.4 }),
  C('musgosa', 'Caja Musgosa', 0, 'Cubierta de musgo: a veces trae dos cosas.', 1.1, { shape: 'box', base: '#a9c98a', trim: '#6f9a5c', gem: '#e8f5c0' },
    { drops: [1, 2], attack: 0.15, power: 0.03, item: [75, 23, 2, 0, 0, 0], tier: [65, 30, 5, 0, 0, 0] }),
  // rango 1
  C('plata', 'Cofre de Plata', 1, 'Mejores objetos y ataques.', 1.6, { shape: 'box', base: '#dfe6f0', trim: '#9aa6bf', gem: '#8cc6ff' },
    { drops: [1, 1], attack: 0.3, power: 0.07, item: [45, 45, 9, 1, 0, 0], tier: [25, 55, 18, 2, 0, 0] }),
  C('gemelo', 'Cofre Gemelo', 1, 'Siempre trae dos premios.', 2.2, { shape: 'trunk', base: '#f0d0e0', trim: '#c890b0', gem: '#ffb3c7' },
    { drops: [2, 2], attack: 0.2, power: 0.05, item: [55, 38, 7, 0, 0, 0], tier: [35, 50, 15, 0, 0, 0] }),
  C('coral', 'Baúl de Coral', 1, 'Guarda siempre un ataque.', 1.9, { shape: 'trunk', base: '#f6a99c', trim: '#d9707a', gem: '#fff0d8' },
    { drops: [1, 1], attack: 1, power: 0, item: [50, 45, 5, 0, 0, 0], tier: [15, 55, 27, 3, 0, 0] }),
  // rango 2
  C('oro', 'Cofre de Oro', 2, 'Brilla con premios raros.', 2.6, { shape: 'box', base: '#ffd56e', trim: '#c98a2a', gem: '#ff8fb5' },
    { drops: [1, 1], attack: 0.35, power: 0.1, item: [12, 55, 29, 4, 0, 0], tier: [5, 35, 47, 12, 1, 0] }),
  C('sangre', 'Cofre de Sangre', 2, 'No cuesta chispas: cuesta 25% de tu vida.', 0, { shape: 'trunk', base: '#c95a6a', trim: '#7a2a3a', gem: '#ffb0b0' },
    { drops: [1, 2], attack: 0.35, power: 0.1, item: [0, 45, 45, 10, 0, 0], tier: [0, 30, 55, 15, 0, 0] }, 'blood'),
  C('arsenal', 'Cofre del Arsenal', 2, 'Siempre trae un ataque de buen rango.', 3.0, { shape: 'box', base: '#a8b8c8', trim: '#5f6f8a', gem: '#ffe27a' },
    { drops: [1, 1], attack: 1, power: 0, item: [0, 50, 40, 10, 0, 0], tier: [0, 20, 55, 22, 3, 0] }),
  // rango 3
  C('cristal', 'Cofre de Cristal', 3, 'Transparente y lleno de magia.', 4.0, { shape: 'crystal', base: '#bfe9ff', trim: '#7fb7e8', gem: '#ffffff', glow: '#bfe9ff' },
    { drops: [2, 2], attack: 0.4, power: 0.15, item: [0, 30, 50, 18, 2, 0], tier: [0, 10, 50, 35, 5, 0] }),
  C('runico', 'Cofre Rúnico', 3, 'Siempre guarda un poder especial.', 4.2, { shape: 'rune', base: '#9a8ad0', trim: '#5a4a9a', gem: '#fff27a', glow: '#c79bff' },
    { drops: [1, 2], attack: 0.2, power: 1, item: [0, 25, 50, 22, 3, 0], tier: [0, 10, 50, 35, 5, 0] }),
  C('sombrio', 'Cofre Sombrío', 3, 'Premios épicos… pero despierta a enemigos élite.', 2.5, { shape: 'trunk', base: '#4d4a92', trim: '#2f2d66', gem: '#ff6fa8', glow: '#7c7bd0' },
    { drops: [2, 2], attack: 0.4, power: 0.2, item: [0, 0, 45, 50, 5, 0], tier: [0, 0, 40, 50, 10, 0] }, 'shadow'),
  // rango 4
  C('estelar', 'Cofre Estelar', 4, 'Hecho de polvo de estrellas.', 6.0, { shape: 'crystal', base: '#d7b8ff', trim: '#f2c46c', gem: '#fff6c8', glow: '#e8d8ff' },
    { drops: [2, 2], attack: 0.5, power: 0.25, item: [0, 0, 30, 50, 20, 0], tier: [0, 0, 20, 55, 25, 0] }),
  C('celestial', 'Cofre Celestial', 4, 'Tres premios del cielo.', 7.5, { shape: 'rune', base: '#bfe0ff', trim: '#ffd36e', gem: '#ffffff', glow: '#ffffff' },
    { drops: [3, 3], attack: 0.4, power: 0.2, item: [0, 10, 35, 40, 15, 0], tier: [0, 0, 30, 50, 20, 0] }),
  C('suerte', 'Cofre de la Suerte', 4, 'Puede traer de 1 a 5 premios. ¡Suerte!', 5.0, { shape: 'trunk', base: '#9fe3b0', trim: '#ffd36e', gem: '#ff8fb5', glow: '#c8ffd8' },
    { drops: [1, 5], attack: 0.35, power: 0.15, item: [0, 15, 35, 35, 15, 0], tier: [0, 10, 30, 40, 20, 0] }, 'luck'),
  // rango 5
  C('nova', 'Cofre Nova', 5, 'La luz misma de Nova. Premios míticos.', 9.0, { shape: 'crystal', base: '#fff0b0', trim: '#ff9fb0', gem: '#ffffff', glow: '#fff6c8' },
    { drops: [3, 3], attack: 0.6, power: 0.3, item: [0, 0, 0, 40, 45, 15], tier: [0, 0, 0, 30, 50, 20] }),
  C('cofrevacio', 'Cofre del Vacío', 5, 'Trae siempre un ataque mítico.', 10.0, { shape: 'rune', base: '#3a3170', trim: '#8f7ad8', gem: '#e8d8ff', glow: '#8f7ad8' },
    { drops: [1, 2], attack: 1, power: 0.2, item: [0, 0, 0, 30, 50, 20], tier: [0, 0, 0, 0, 0, 100] }),
  C('prismal', 'Cofre Prisma', 5, 'Cuatro premios con los colores del arcoíris.', 12.0, { shape: 'crystal', base: '#ffd8f0', trim: '#8cc6ff', gem: '#fff27a', glow: '#ffffff' },
    { drops: [4, 4], attack: 0.5, power: 0.3, item: [0, 0, 10, 40, 40, 10], tier: [0, 0, 10, 40, 40, 10] }),
];
export const CHESTS = Object.fromEntries(CHEST_LIST.map(c => [c.id, c]));

/* Rango según el avance de la partida (p ≈ 0 al inicio; ~5+ muy avanzado). */
export function rankWeights(p) {
  const w = [];
  for (let r = 0; r < 6; r++) {
    const center = Math.min(5, p * 0.9);
    const d = r - center;
    let v = Math.exp(-(d * d) / 1.2);
    if (r > Math.floor(p * 1.2) + 1) v = 0;          // no aparecen rangos demasiado altos para el momento
    if (r === 5 && p < 3.5) v = 0;
    w.push(v);
  }
  return w;
}
export function rollChest(p, luck = 0) {
  const rank = Math.min(5, pickWeighted(rankWeights(p + luck * 4)));
  const pool = CHEST_LIST.filter(c => c.rank === rank);
  return pool[Math.floor(Math.random() * pool.length)].id;
}
