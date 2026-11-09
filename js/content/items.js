/* Star Nova — 49 objetos pasivos acumulables, en 6 rarezas.
 * Cada objeto suma "estadísticas" por copia; los efectos especiales los aplica game.js. */
export { RARITY } from './icons.js';

const I = (id, name, rar, glyph, color, desc, stats) => ({ id, name, rar, glyph, color, desc, stats, kind: 'item' });

export const ITEM_LIST = [
  // Común (0)
  I('bellota', 'Bellota Afilada', 0, 'acorn', '#c98a4b', '+12% de daño', { dmgPct: 0.12 }),
  I('cascabel', 'Cascabel de Viento', 0, 'bell', '#f2c85b', '+12% de velocidad', { speedPct: 0.12 }),
  I('hongo', 'Hongo Luminoso', 0, 'mushroom', '#e88f9a', '+0.8 de vida por segundo', { regen: 0.8 }),
  I('pluma', 'Pluma de Gorrión', 0, 'feather', '#9fc6e8', '+1 salto en el aire', { airJumps: 1 }),
  I('piedra', 'Piedra Lunar', 0, 'moon', '#c7c3f0', '+8% de golpe crítico', { critPct: 0.08 }),
  I('te', 'Taza de Té', 0, 'cup', '#a8d8b0', '+12% de velocidad de ataque', { atkPct: 0.12 }),
  I('corteza', 'Corteza de Roble', 0, 'bark', '#a7835f', '+6 de armadura', { armor: 6 }),
  I('miel', 'Tarro de Miel', 0, 'honey', '#f6c35b', '+20 de vida máxima', { maxHp: 20 }),
  I('guijarro', 'Guijarro Brillante', 0, 'pebble', '#d8d0e8', '+12% de chispas', { sparkPct: 0.12 }),
  I('hojamensajera', 'Hoja Mensajera', 0, 'leaf', '#9fd38a', '+15% de experiencia', { xpPct: 0.15 }),
  I('musgo', 'Musgo Saltarín', 0, 'cloud', '#a9d9a0', '+15% de altura de salto', { jumpPct: 0.15 }),
  I('ramita', 'Ramita Ligera', 0, 'needle', '#c9a074', '+10% de velocidad de proyectil y +5% de daño', { projSpeed: 0.1, dmgPct: 0.05 }),
  // Poco común (1)
  I('gemela', 'Semilla Gemela', 1, 'twin', '#d9a35f', '15% de lanzar un proyectil extra', { multishot: 0.15 }),
  I('brasa', 'Brasa Errante', 1, 'ember', '#ff9a6b', '10% de que el golpe explote', { explodeChance: 0.1 }),
  I('trebol', 'Trébol de Cuatro', 1, 'clover', '#7fcf8e', '+25 de vida máxima y +3% de suerte', { maxHp: 25, luck: 0.03 }),
  I('iman', 'Imán de Ámbar', 1, 'magnet', '#f0a35e', 'Atrae chispas desde más lejos y +10% chispas', { magnetPct: 0.6, sparkPct: 0.1 }),
  I('espina', 'Hoja Espinosa', 1, 'leaf', '#e06f7d', '20% de causar sangrado', { bleedChance: 0.2 }),
  I('caracola', 'Caracola Gélida', 1, 'shell', '#9fe3ff', '12% de congelar al golpear', { freezeChance: 0.12 }),
  I('chispa', 'Chispa Inquieta', 1, 'bolt', '#fff27a', '12% de lanzar un rayo en cadena', { chainChance: 0.12 }),
  I('frambuesa', 'Frambuesa Vampira', 1, 'berry', '#e0507a', 'Recupera 4% del daño que haces', { lifesteal: 0.04 }),
  I('botas', 'Botitas de Nube', 1, 'boot', '#bfe0ff', '+1 salto en el aire y +8% de velocidad', { airJumps: 1, speedPct: 0.08 }),
  I('capullo', 'Capullo de Seda', 1, 'cocoon', '#f4ead8', '8% de esquivar golpes', { dodge: 0.08 }),
  I('erizo', 'Púas de Erizo', 1, 'spikes', '#b98a6a', 'Devuelve 60% del daño a quien te golpea', { thorns: 0.6 }),
  // Raro (2)
  I('lupa', 'Lupa de Cristal', 2, 'lens', '#8cc6ff', '+5% de crítico y críticos 40% más fuertes', { critPct: 0.05, critDmg: 0.4 }),
  I('vela', 'Vela Incansable', 2, 'candle', '#ffe2a8', '+3 de vida por cada enemigo derrotado', { healOnKill: 3 }),
  I('relojito', 'Relojito de Arena', 2, 'hourglass', '#f2d38a', '-12% de recarga de habilidades', { cdr: 0.12 }),
  I('orbe', 'Orbe Guardián', 2, 'orb', '#c3a7e6', 'Una bellota orbita a Pip y golpea a los enemigos', { orbitals: 1 }),
  I('martillo', 'Martillo de Bellota', 2, 'hammer', '#c98a4b', '+50% de daño a enemigos con poca vida', { executeLow: 0.5 }),
  I('escarabajo', 'Escarabajo Dorado', 2, 'bug', '#ffd36e', '+25% de chispas y cofres 8% más baratos', { sparkPct: 0.25, chestDiscount: 0.08 }),
  I('seta', 'Seta Venenosa', 2, 'mushroom', '#a6d86a', '15% de envenenar (se contagia)', { poisonChance: 0.15 }),
  I('tambor', 'Tambor de Trueno', 2, 'drum', '#e8a3c0', 'Al caer de un salto alto, lanzas una onda expansiva', { stomp: 1 }),
  I('luciernaga', 'Luciérnaga Amiga', 2, 'firefly', '#f6ffb0', 'Una luciérnaga dispara a los enemigos cercanos', { drone: 1 }),
  I('petalos', 'Escudo de Pétalos', 2, 'flower', '#ffb3c7', 'Escudo de 25 que se recarga', { shield: 25 }),
  // Épico (3)
  I('coronaflores', 'Corona de Flores', 3, 'flower', '#ff9fb2', '+2 de vida por segundo y +15% de vida máxima', { regen: 2, maxHpPct: 0.15 }),
  I('nube', 'Nube de Tormenta', 3, 'cloud', '#a8a3d8', 'Cada 4 s cae un rayo sobre un enemigo cercano', { stormCloud: 1 }),
  I('espejo', 'Espejo Lunar', 3, 'mirror', '#d8e4ff', '+1 proyectil en cada disparo', { projCount: 1 }),
  I('furia', 'Furia Salvaje', 3, 'fist', '#ff7a6b', 'Con menos de 40% de vida: +50% daño y +30% vel. de ataque', { rage: 1 }),
  I('aurasolar', 'Aura Solar', 3, 'sun', '#ffcf6b', 'Quema a los enemigos cerca de Pip', { aura: 1 }),
  I('glaciar', 'Corazón de Glaciar', 3, 'snow', '#9fe3ff', '25% de congelar; los congelados reciben +30% daño', { freezeChance: 0.25, frozenBonus: 0.3 }),
  I('cadena', 'Cadena Celeste', 3, 'chain', '#fff27a', '15% de rayo en cadena que salta a 2 enemigos más', { chainChance: 0.15, chainExtra: 2 }),
  // Legendario (4)
  I('corona', 'Corona de Nova', 4, 'crown', '#ffd36e', '+40% de daño y +20% de velocidad de ataque', { dmgPct: 0.4, atkPct: 0.2 }),
  I('alas', 'Alas de Cometa', 4, 'wings', '#e8f0ff', '+2 saltos en el aire y planeo al mantener saltar', { airJumps: 2, glide: 1 }),
  I('relojlunar', 'Reloj de Arena Lunar', 4, 'hourglass', '#c7c3f0', '-35% de recarga de habilidades', { cdr: 0.35 }),
  I('prismaescudo', 'Escudo Prisma', 4, 'shield', '#d7b8ff', 'Escudo de 60; al romperse lanza estrellas', { shield: 60, shieldNova: 1 }),
  I('cometa', 'Cometa Fiel', 4, 'comet', '#ffe08a', 'Cada 2.5 s un cometa golpea al enemigo más cercano', { comet: 1 }),
  I('corazon', 'Corazón de Nova', 4, 'heart', '#ff8fb0', 'Revive una vez al caer', { revive: 1 }),
  // Mítico (5)
  I('vacio', 'Bellota del Vacío', 5, 'void', '#8f7ad8', '10% de abrir un agujero negro al golpear', { voidChance: 0.1 }),
  I('fenix', 'Pluma de Fénix', 5, 'flame', '#ff9a6b', 'Revive con una explosión de fuego y vida completa', { revive: 1, reviveNova: 1 }),
  I('novaviva', 'Fragmento Vivo de Nova', 5, 'star', '#fff0b0', '+25% de crítico y los críticos hacen el doble', { critPct: 0.25, critDmg: 1.0 }),
];

export const ITEMS = Object.fromEntries(ITEM_LIST.map(i => [i.id, i]));

export function pickWeighted(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = Math.random() * total;
  for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x <= 0) return i; }
  return weights.length - 1;
}

/* Elige un objeto según pesos por rareza [común, poco común, raro, épico, legendario, mítico]. */
export function rollItem(rarWeights = [78, 19, 3, 0, 0, 0]) {
  let rar = pickWeighted(rarWeights);
  let pool = ITEM_LIST.filter(i => i.rar === rar);
  while (!pool.length && rar > 0) { rar--; pool = ITEM_LIST.filter(i => i.rar === rar); }
  return pool[Math.floor(Math.random() * pool.length)].id;
}

/* Suma las estadísticas de todos los objetos y el nivel. */
export function computeStats(level, counts) {
  const s = {};
  let cdrMul = 1;
  for (const id in counts) {
    const it = ITEMS[id], n = counts[id];
    if (!it || !n) continue;
    for (const k in it.stats) {
      if (k === 'cdr') cdrMul *= Math.pow(1 - it.stats[k], n);
      else s[k] = (s[k] || 0) + it.stats[k] * n;
    }
  }
  const g = (k) => s[k] || 0;
  return {
    dmg: (12 + 2.4 * (level - 1)) * (1 + g('dmgPct')),
    atk: 1 + g('atkPct'),
    speed: Math.min(2.4, 1 + g('speedPct')),
    jump: 1 + g('jumpPct'),
    regen: 0.6 + 0.1 * (level - 1) + g('regen'),
    crit: Math.min(1, 0.01 + g('critPct')),
    critMul: 2 + g('critDmg'),
    armor: g('armor'),
    maxHp: (100 + 14 * (level - 1) + g('maxHp')) * (1 + g('maxHpPct')),
    airJumps: 1 + g('airJumps'),
    magnet: 3 * (1 + g('magnetPct')),
    sparkMul: 1 + g('sparkPct'),
    xpMul: 1 + g('xpPct'),
    projSpeed: 1 + g('projSpeed'),
    multishot: Math.min(1, g('multishot')),
    projCount: g('projCount'),
    explode: Math.min(0.6, g('explodeChance')),
    bleed: Math.min(0.8, g('bleedChance')),
    freeze: Math.min(0.7, g('freezeChance')),
    chain: Math.min(0.7, g('chainChance')),
    chainExtra: g('chainExtra'),
    poison: Math.min(0.8, g('poisonChance')),
    voidChance: Math.min(0.4, g('voidChance')),
    lifesteal: g('lifesteal'),
    dodge: Math.min(0.6, g('dodge')),
    thorns: g('thorns'),
    executeLow: g('executeLow'),
    frozenBonus: g('frozenBonus'),
    healOnKill: g('healOnKill'),
    chestDiscount: Math.min(0.6, g('chestDiscount')),
    luck: g('luck'),
    orbitals: g('orbitals'),
    drone: g('drone'),
    stomp: g('stomp'),
    aura: g('aura'),
    storm: g('stormCloud'),
    comet: g('comet'),
    rage: g('rage'),
    glide: g('glide') > 0,
    maxShield: g('shield'),
    shieldNova: g('shieldNova') > 0,
    cdrMul,
  };
}
