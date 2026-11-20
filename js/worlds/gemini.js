/* Star Nova — mundo 2: Planeta Verdalia (Galaxia Gemini).
 * Un valle verde y vivo rodeado de montañas: praderas con flores, el Bosque Susurro, el Lago Espejo con su
 * cascada, el Río Cantarín y el Claro de los Gemelos. El suelo es un terreno continuo con colinas (no islas):
 * se puede caminar a cualquier parte. Aquí brillaban las estrellas gemelas Alba y Ocaso.
 *   centro → Pradera del Rocío (Fuente de Savia, Abuelo Sauce, Musgo, Tilo, el cohete)
 *   oeste  → Bosque Susurro     (misión: Las Flores Campana · secundaria: Guardabosques)
 *   norte  → Lago Espejo        (misión: Semillas de Luz; una está detrás de la cascada)
 *   este   → Río Cantarín       (misión: El Puente de Lianas → altar en la isla del barranco)
 *   sur    → Claro de los Gemelos (jefe: Los Gemelos de Raíz, tras la Puerta de Raíces) */
import * as THREE from 'three';
import { REGIONS, REGION_IDS } from '../world/palette.js';
import { Builder } from '../world/builder.js';
import { buildTerrain, Water, Waterfall } from '../world/special.js';

/* ---------- regiones (cielo, niebla, colores de la arquitectura) ---------- */
const REG = {
  pradera: {
    name: 'Pradera del Rocío', sub: 'donde aterrizó el cohete', center: [0, 0], r: 20,
    sky: { top: '#86c8ec', hor: '#eaf8e2', bot: '#bfe4c4' }, fog: '#d9efd6',
    ground: '#9bd47a', rock: '#8a7a5a', stone: '#efe6cf', stone2: '#cdbb92', accent: '#f2a65a', win: '#6a8a4a',
    leaf: ['#5aa84a', '#8fd06a'], roof: '#d8705a', shade: '#5f8f58',
  },
  bosque: {
    name: 'Bosque Susurro', sub: 'las campanas entre las ramas', center: [-60, 0], r: 24,
    sky: { top: '#62a88a', hor: '#dcf2cc', bot: '#8cc4a2' }, fog: '#b9dcb2',
    ground: '#6fae52', rock: '#7a6a4a', stone: '#d8d0b0', stone2: '#a89870', accent: '#e890b0', win: '#4a6a3a',
    leaf: ['#3a8a4a', '#6ab85a'], roof: '#c8604a', shade: '#2f6a48',
  },
  lago: {
    name: 'Lago Espejo', sub: 'la cascada y las semillas de luz', center: [0, -60], r: 24,
    sky: { top: '#72bcf0', hor: '#e2f4ff', bot: '#a8d8f0' }, fog: '#cbe7f3',
    ground: '#8ccc78', rock: '#8a8a7a', stone: '#e6ecdc', stone2: '#a8b8a0', accent: '#8ad8f0', win: '#4a7a8a',
    leaf: ['#4a9a6a', '#7ac88a'], roof: '#5aa8c8', shade: '#4f8a80',
  },
  rio: {
    name: 'Río Cantarín', sub: 'las flores de cristal', center: [66, 0], r: 22,
    sky: { top: '#8ed6c6', hor: '#f2fae2', bot: '#b2e0c8' }, fog: '#d3eedb',
    ground: '#92d070', rock: '#8a7a5a', stone: '#ece6cc', stone2: '#bfae86', accent: '#a8e8d0', win: '#5a8a6a',
    leaf: ['#5aa850', '#9ad870'], roof: '#d88a5a', shade: '#5a8a5e',
  },
  raices: {
    name: 'Claro de los Gemelos', sub: 'donde giran los guardianes', center: [0, 68], r: 18,
    sky: { top: '#4a3a6e', hor: '#cfb0dc', bot: '#6e5c8e' }, fog: '#a991c2',
    ground: '#7a9a66', rock: '#5a4a5a', stone: '#d8cce0', stone2: '#9a88aa', accent: '#c8a8ff', win: '#ffe9a0',
    leaf: ['#4a6a5a', '#7a8a6a'], roof: '#6a5a8a', shade: '#4a3f66', night: 0.6,
  },
};

/* ---------- el terreno: una sola función de altura (también la usan las misiones y los atajos) ---------- */
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;
export const RIVER = (z) => 64 + Math.sin(z * 0.05) * 4 + Math.sin(z * 0.013) * 3;
const LAKE = { x: 0, z: -60, r: 14.6, level: -0.55 };
const RIVER_LEVEL = -0.5;
const ALTAR = { x: 92, z: 0 };
const ARENA = { x: 0, z: 68 };

export function height(x, z) {
  const r0 = Math.hypot(x, z);
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
  const dr = Math.abs(x - RIVER(z));
  const da = Math.hypot(x - ALTAR.x, z - ALTAR.z);
  // colinas suaves (más altas en el bosque), aplanadas en la pradera, el claro, el lago y junto al río
  let h = 0.7 + Math.sin(x * 0.055 + 1.3) * Math.cos(z * 0.047) * 1.7 + Math.sin((x - z) * 0.09) * 0.6 + Math.sin(x * 0.21 + z * 0.17) * 0.22;
  h *= sm(10, 22, r0) * sm(16, 26, Math.hypot(x - ARENA.x, z - ARENA.z)) * sm(14, 26, dl) * sm(5, 12, dr) * sm(14, 22, da);
  h += Math.max(0, Math.sin(x * 0.12) * Math.sin(z * 0.1)) * 1.6 * (1 - sm(20, 32, Math.hypot(x + 60, z)));   // lomas del bosque
  // meseta del norte: acantilado tras el lago (con la cascada) y una rampa suave al este para subir
  const w = 4 + 16 * sm(10, 26, x);
  h += 9 * Math.min(1, Math.max(0, (-74 - z) / w));
  // lago (cuenca honda)
  h = lerp(h, -2.6, 1 - sm(12.5, 16, dl));
  // cauce del río
  h = lerp(h, -2.2, 1 - sm(2.6, 5.2, dr));
  // montañas que rodean el valle
  h += (18 + Math.sin(Math.atan2(z, x) * 7) * 4 + Math.sin(Math.atan2(z, x) * 17) * 1.5) * sm(104, 124, r0);
  // barranco alrededor de la isla del altar (si Pip cae, vuelve a tierra)
  h = lerp(h, -32, 1 - sm(12.6, 14.2, da));
  return h;
}

/* ---------- colores del terreno (por cara: low-poly) ---------- */
const C = (h) => new THREE.Color(h);
const TC = {
  grass: C('#92d070'), grass2: C('#a8dc7a'), forest: C('#5e9e4a'), forest2: C('#6fae52'), lake: C('#7cc070'),
  sand: C('#e2d2a0'), bed: C('#6aa8a0'), rock: C('#9a8f78'), rock2: C('#857a66'), cliff: C('#a89e86'),
  snow: C('#f4f8ff'), arena: C('#7a9a66'), arena2: C('#8a8a70'), plateau: C('#84c466'),
};
function hash(x, z) { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); }
function terrainColor(x, y, z, ny, out) {
  const r0 = Math.hypot(x, z), n = hash(Math.round(x * 2), Math.round(z * 2));
  const wet = Math.hypot(x - LAKE.x, z - LAKE.z) < 17.5 || Math.abs(x - RIVER(z)) < 6.8;     // orillas del lago y del río
  if (ny < 0.72) out.copy(n > 0.5 ? TC.rock : TC.cliff);
  else if (wet && y < -1.2) out.copy(TC.bed);
  else if (wet && y < 0.1) out.copy(TC.sand);
  else if (y > 13 && r0 > 104) out.copy(TC.snow);
  else if (r0 > 106) out.copy(TC.rock2).lerp(TC.forest, 0.35);
  else if (y > 6) out.copy(TC.plateau);
  else if (Math.hypot(x + 60, z) < 28) out.copy(n > 0.5 ? TC.forest : TC.forest2);
  else if (Math.hypot(x - ARENA.x, z - ARENA.z) < 20) out.copy(n > 0.6 ? TC.arena2 : TC.arena);
  else out.copy(n > 0.55 ? TC.grass2 : TC.grass);
  out.offsetHSL(0, 0, (n - 0.5) * 0.04);
}

/* ---------- misiones ---------- */
const centerOf = (g, id, y = 0.5) => g.v3(REGIONS[id].center[0], height(REGIONS[id].center[0], REGIONS[id].center[1]) + y, REGIONS[id].center[1]);
export const MISSIONS_GEMINI = [
  // Principales
  { id: 'flores', type: 'principal', region: 'bosque', title: 'Las Flores Campana', desc: 'Haz sonar las tres Flores Campana que cuelgan de los árboles gigantes del Bosque Susurro (lánzales bellotas).', goal: 3, fragment: true,
    on: { bell: true }, targets: (g) => g.props.bells.filter(b => !b.rung).map(b => b.anchor.clone().setY(b.anchor.y - 0.8)) },
  { id: 'semillas', type: 'principal', region: 'lago', title: 'Semillas de Luz', desc: 'Recoge las cuatro Semillas de Luz del Lago Espejo. Salta por los nenúfares: una está detrás de la cascada.', goal: 4, fragment: true,
    on: { firefly: true }, targets: (g) => g.props.fireflies.filter(f => !f.taken).map(f => f.p) },
  { id: 'lianas', type: 'principal', region: 'rio', title: 'El Puente de Lianas', desc: 'Cruza el Río Cantarín, despierta las dos Flores de Cristal y toma el fragmento del altar del barranco.', goal: 3, fragment: true,
    on: { crystal: true, altar: true },
    targets: (g) => {
      const c = g.props.crystals.filter(x => !x.active).map(x => x.p);
      if (c.length) return c;
      return g.altarFragment && !g.altarFragment.dead ? [g.altarFragment.p] : [];
    } },
  { id: 'gemelos', type: 'principal', region: 'raices', title: 'Los Gemelos de Raíz', desc: 'Con 3 fragmentos se abre la Puerta de Raíces, al sur. Rompe la cadena de Penumbra que ata a los Gemelos.', goal: 1, final: true,
    on: { boss: true }, targets: (g) => [centerOf(g, 'raices', 1)] },
  // Secundarias
  { id: 'guardabosques', type: 'secundaria', region: 'bosque', title: 'Guardabosques', desc: 'Derrota 12 criaturas en el Bosque Susurro. Premio: un fragmento extra de las gemelas.', goal: 12, fragment: true,
    on: { kill: (o, g, s) => o.region === 'bosque' && s.discovered }, targets: (g) => [centerOf(g, 'bosque')] },
  { id: 'exploradora', type: 'secundaria', region: null, title: 'Exploradora de Verdalia', desc: 'Visita las cinco regiones del planeta. Premio: objeto raro.', goal: 5, reward: [0, 20, 60, 20, 0, 0],
    on: { region: true }, visit: true, targets: (g) => REGION_IDS.filter(r => !g.missions.visited.has(r)).map(r => centerOf(g, r)) },
  { id: 'cofres', type: 'secundaria', region: null, title: 'Tesoros del Bosque', desc: 'Abre 5 cofres en Verdalia. Premio: objeto épico.', goal: 5, reward: [0, 0, 30, 60, 10, 0],
    on: { chest: true }, targets: (g) => g.props.chests.filter(c => !c.opened).map(c => c.p) },
  { id: 'gigante', type: 'secundaria', region: null, title: 'El Gigante de Musgo', desc: 'Derrota a un Gigante de Musgo (aparecen cuando el reloj avanza). Premio: objeto legendario.', goal: 1, reward: [0, 0, 0, 20, 75, 5],
    on: { kill: (o) => o.type === 'gigantemusgo' }, targets: (g) => g.enemies.filter(e => e.type === 'gigantemusgo' && !e.dead).map(e => e.pos) },
];

/* ---------- el mapa ---------- */
function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const H = height;
const FLOWERS = ['#ff8fb0', '#ffd35a', '#ffffff', '#a8c8ff', '#ff7a6a', '#d8a0ff', '#ffb0e0'];

/* Una tabla inclinada entre dos puntos 3D (puentes de troncos, rampas). */
function plank(b, a, c, w, th, color) {
  const dx = c[0] - a[0], dy = c[1] - a[1], dz = c[2] - a[2];
  const hl = Math.hypot(dx, dz), len = Math.hypot(hl, dy);
  const g = b.add(new THREE.BoxGeometry(len, th, w), color, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2 - th / 2, (a[2] + c[2]) / 2, 0, Math.atan2(-dz, dx), Math.atan2(dy, hl));
  b.hull(g, { kind: 'ground' });
}
function mushroom(b, x, z, s, cap) {
  const y = H(x, z);
  b.cyl(x, y - 0.1, z, 0.16 * s, 0.9 * s, '#f4ead8', { seg: 6 });
  b.dome(x, y + 0.75 * s, z, 0.62 * s, cap, { seg: 8, collide: true });
  for (let i = 0; i < 4; i++) { const a = i * 1.7; b.orb(x + Math.cos(a) * 0.35 * s, y + 0.75 * s + 0.42 * s, z + Math.sin(a) * 0.35 * s, 0.08 * s, '#ffffff'); }
}
function bigTree(b, x, z, s, leaf) {
  const y = H(x, z);
  b.cyl(x, y - 0.3, z, 0.22 * s, 1.6 * s, '#8a6448', { seg: 7 });
  b.orb(x, y + 2.2 * s, z, 1.05 * s, leaf[0], 1);
  b.orb(x - 0.5 * s, y + 2.7 * s, z + 0.3 * s, 0.75 * s, leaf[1]);
  b.orb(x + 0.55 * s, y + 1.9 * s, z - 0.25 * s, 0.7 * s, leaf[1]);
}
function pine(b, x, z, s, leaf) {
  const y = H(x, z);
  b.cyl(x, y - 0.2, z, 0.16 * s, 1.0 * s, '#7a5a40', { seg: 6 });
  b.cone(x, y + 0.7 * s, z, 0.9 * s, 1.6 * s, leaf[0], { seg: 7 });
  b.cone(x, y + 1.6 * s, z, 0.68 * s, 1.3 * s, leaf[1], { seg: 7 });
  b.cone(x, y + 2.4 * s, z, 0.45 * s, 1.0 * s, leaf[0], { seg: 7 });
}

function build(game) {
  const scene = game.scene;
  const S = {
    spawn: [0, 0.6, 5],
    campfire: { pos: [0, 0.22, 0], look: 'savia' },
    owl: null,
    chests: [], crates: [], bells: [], fireflies: [], crystals: [], lanterns: [],
    altar: null, plankBridge: null, gate: null, arena: null, novaStar: null,
    spawnZones: [], extras: [],
  };
  const R = rng(20261120);

  /* terreno, agua y cascada */
  buildTerrain(game, { size: 248, seg: 124, height, color: terrainColor });
  S.extras.push(
    new Water(game, { shape: 'disc', x: LAKE.x, z: LAKE.z, r: 15.4, level: LAKE.level, color: '#5ab4d0', color2: '#e8fbff' }),
    new Water(game, { path: RIVER, z0: -126, z1: 126, w: 10.5, level: RIVER_LEVEL, color: '#62bcd4', color2: '#f0fcff' }),
    new Waterfall(game, { x: 0, w: 6.5, bottom: LAKE.level, top: 9.3, z0: -73.0, z1: -77.8 }),
  );
  S.inWater = (p) => (Math.hypot(p.x - LAKE.x, p.z - LAKE.z) < LAKE.r && p.y < LAKE.level - 0.3) || (Math.abs(p.x - RIVER(p.z)) < 4.1 && p.y < RIVER_LEVEL - 0.3);
  S.heightAt = height;

  /* ---------------- Pradera del Rocío (centro) ---------------- */
  {
    const b = new Builder(game, REG.pradera), p = b.pal;
    // Fuente de Savia: anillo de piedras con un estanque de savia
    b.cyl(0, -0.05, 0, 3.4, 0.25, p.stone, { seg: 10 });
    b.cyl(0, -0.05, 0, 2.5, 0.27, '#9adca0', { seg: 10, collide: false });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.cyl(Math.cos(a) * 4.2, 0, Math.sin(a) * 4.2, 0.35, 0.5 + (i % 2) * 0.3, p.stone2, { seg: 6 }); }
    // el gran sauce del abuelo
    b.cyl(-9, -0.2, -6, 0.9, 4.8, '#8a6448', { seg: 8 });
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; b.orb(-9 + Math.cos(a) * 2.4, 4.6 + (i % 3) * 0.4, -6 + Math.sin(a) * 2.4, 1.6, i % 2 ? p.leaf[0] : p.leaf[1]); }
    b.orb(-9, 6.2, -6, 2.2, p.leaf[1]);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; b.cyl(-9 + Math.cos(a) * 3.4, 1.6, -6 + Math.sin(a) * 3.4, 0.12, 3, p.leaf[0], { seg: 4, collide: false }); }
    // puesto de Musgo (toldo rayado) y la casita de Tilo
    b.box(-6.6, 0, 5.2, 3, 1, 1.4, '#b08a5a');
    for (const [dx, dz] of [[-1.4, -0.6], [1.4, -0.6], [-1.4, 0.6], [1.4, 0.6]]) b.cyl(-6.6 + dx, 0, 5.2 + dz, 0.08, 2.4, '#8a6448', { seg: 5, collide: false });
    for (let i = 0; i < 5; i++) b.box(-6.6 - 1.4 + i * 0.7 + 0.35, 2.4, 5.2, 0.7, 0.12, 1.8, i % 2 ? '#fff4e0' : '#e8705a', { collide: false });
    b.box(12, 0, -8, 3.4, 2.2, 3, '#e8d8b8');
    b.cone(12, 2.2, -8, 2.6, 1.8, '#d8705a', { seg: 4, ry: Math.PI / 4 });
    b.window(12, 0.5, -6.48, 0, 0.6, 0.8, p.win);
    // pista del cohete
    b.cyl(10.8, -0.1, 9.6, 3.2, 0.2, p.stone2, { seg: 12 });
    b.cyl(10.8, -0.1, 9.6, 2.4, 0.22, p.stone, { seg: 12, collide: false });
    // cajas, arbolitos y un cartel
    S.crates.push([4.5, 0.4, -9], [5.4, 0.4, -9.3], [4.9, 1.2, -9.1]);
    for (const [x, z, s] of [[14, 3, 1.2], [-14, 8, 1.1], [6, 15, 1], [-4, -15, 1.3], [16, -14, 1.1], [-16, -2, 1]]) bigTree(b, x, z, s, p.leaf);
    b.finish(scene);
    S.chests.push({ pos: [6.5, 0, 4], region: 'pradera' }, { pos: [-4, 0, -11], region: 'pradera' });
    S.rocket = { pos: [10.8, 0.1, 9.6], ry: -2.3 };
    S.rocketExit = [11.4, 0.4, 7.1];
    S.rocketExitYaw = -0.6;
    S.npcs = [
      { id: 'sauce', pos: [-5.2, 0, -2.6], ry: 0.9 },
      { id: 'musgo', pos: [-6.6, 0, 3.6], ry: 0 },
      { id: 'tilo', pos: [9.6, 0, -5.4], ry: -2.2 },
    ];
  }

  /* ---------------- Bosque Susurro (oeste) ---------------- */
  {
    const b = new Builder(game, REG.bosque), p = b.pal;
    const cx = -60, cz = 0;
    // tres árboles gigantes con una Flor Campana colgando de una rama
    const giants = [[-52, -11, 1], [-70, 5, -1], [-56, 15, 1]];
    giants.forEach(([x, z, side], i) => {
      const y = H(x, z);
      b.cyl(x, y - 0.5, z, 1.4, 10.5, '#7a5638', { seg: 9 });
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + 0.3; b.cyl(x + Math.cos(a) * 1.5, y - 0.3, z + Math.sin(a) * 1.5, 0.5, 1.4, '#6a4a30', { seg: 5, rTop: 0.1 }); }
      // copa
      for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; b.orb(x + Math.cos(a) * 3.2, y + 10.5 + (k % 2) * 0.8, z + Math.sin(a) * 3.2, 2.4, k % 2 ? p.leaf[0] : p.leaf[1], 1); }
      b.orb(x, y + 12.2, z, 3.2, p.leaf[1], 1);
      // rama y flor campana
      const bx = x + side * 4.2;
      b.box(x + side * 2.3, y + 7, z, 4.2, 0.55, 0.55, '#7a5638', { collide: false });
      b.orb(bx, y + 7.9, z, 0.8, p.leaf[0]);
      S.bells.push({ anchor: [bx, y + 6.8, z], freq: [660, 784, 988][i], region: 'bosque', colors: ['#d890c0', '#fff0a0'] });
    });
    // árboles, pinos, setas, troncos caídos y flores
    for (let i = 0; i < 70; i++) {
      const a = R() * Math.PI * 2, r = 4 + Math.sqrt(R()) * 24, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (giants.some(([gx, gz]) => Math.hypot(gx - x, gz - z) < 5)) continue;
      if (R() < 0.45) pine(b, x, z, 1.2 + R() * 1.3, p.leaf); else bigTree(b, x, z, 1.2 + R() * 1.4, p.leaf);
    }
    for (let i = 0; i < 16; i++) { const a = R() * Math.PI * 2, r = 3 + R() * 20; mushroom(b, cx + Math.cos(a) * r, cz + Math.sin(a) * r, 0.8 + R() * 1.1, R() < 0.6 ? '#e0584a' : '#e8a04a'); }
    for (const [x, z, ry] of [[-48, 4, 0.4], [-64, -12, -0.8], [-74, 16, 1.2]]) {
      const y = H(x, z);
      const g = b.add(new THREE.CylinderGeometry(0.55, 0.6, 5, 8), '#8a6448', x, y + 0.4, z, 0, ry, Math.PI / 2);
      b.hull(g, { kind: 'ground' });
      b.orb(x, y + 1, z, 0.4, p.leaf[1]);
    }
    // ruinas cubiertas de musgo (arco viejo)
    b.arch(-60, -2, H(-60, -2) - 0.2, 3, 4.2, 1.1, { color: '#c8c0a0', trim: '#8aa86a' });
    b.finish(scene);
    S.chests.push({ pos: [-47, H(-47, -6), -6], region: 'bosque' }, { pos: [-66, H(-66, -4), -4], region: 'bosque' }, { pos: [-72, H(-72, 12), 12], region: 'bosque' }, { pos: [-58, H(-58, 22), 22], region: 'bosque' });
    S.spawnZones.push({ region: 'bosque', c: [cx, cz], r: 20 });
  }

  /* ---------------- Lago Espejo y la cascada (norte) ---------------- */
  {
    const b = new Builder(game, REG.lago), p = b.pal;
    // nenúfares (se puede saltar de uno a otro) y la repisa detrás de la cascada
    const pads = [[-0.6, -45.7, 1.0], [1.5, -48.6, 1.15], [-1, -51.7, 1.1], [1.8, -54.8, 1.1], [-0.8, -57.8, 1.1], [-5.6, -59.6, 1.6], [1.6, -61, 1.1], [-1, -64.2, 1.1], [1.8, -67.3, 1.1], [0, -70.3, 1.15]];
    for (const [x, z, r] of pads) {
      b.cyl(x, LAKE.level - 0.28, z, r, 0.3, '#5aa84a', { seg: 9 });
      b.orb(x + r * 0.4, LAKE.level + 0.12, z - r * 0.3, 0.16, R() < 0.5 ? '#ff9ac8' : '#fff4f8');
    }
    b.box(0, -2.6, -73.9, 5.6, 2.85, 2.6, '#b8b8a8');
    // piedras y la roca musgosa del oeste (con escalones)
    b.cyl(-19, H(-19, -58) - 0.3, -58, 2.2, 3.4, '#9a9a8a', { seg: 7 });
    b.orb(-19.9, H(-19, -58) + 3.1, -58.7, 0.9, p.leaf[0]);
    b.cyl(-16.4, H(-16.4, -55.6) - 0.3, -55.6, 0.9, 1.4, '#a8a898', { seg: 6 });
    b.cyl(-17.2, H(-17.2, -53.2) - 0.3, -53.2, 0.7, 0.7, '#a8a898', { seg: 6 });
    // juncos y flores de la orilla
    for (let i = 0; i < 60; i++) {
      const a = R() * Math.PI * 2, r = 15.5 + R() * 3, x = LAKE.x + Math.cos(a) * r, z = LAKE.z + Math.sin(a) * r;
      if (z < -72) continue;
      const y = H(x, z);
      if (R() < 0.6) b.cone(x, y - 0.1, z, 0.07, 1.1 + R() * 0.6, p.leaf[0], { seg: 4 });
      else b.orb(x, y + 0.15, z, 0.14, FLOWERS[Math.floor(R() * FLOWERS.length)]);
    }
    // meseta: rocas sueltas y árboles en lo alto
    for (const [x, z, s] of [[-12, -84, 1.5], [14, -86, 1.3], [-4, -92, 1.6], [24, -80, 1.2], [-22, -88, 1.4]]) bigTree(b, x, z, s, p.leaf);
    b.finish(scene);
    S.fireflies.push(
      { pos: [0, 1.4, -73.7], region: 'lago', kind: 'semilla', color: '#fff6a0' },                         // detrás de la cascada
      { pos: [-5.6, LAKE.level + 1.5, -59.6], region: 'lago', kind: 'semilla', color: '#fff6a0' },          // el nenúfar grande
      { pos: [6, H(6, -83) + 1.4, -83], region: 'lago', kind: 'semilla', color: '#fff6a0' },                // en la meseta
      { pos: [-19, H(-19, -58) + 4.3, -58], region: 'lago', kind: 'semilla', color: '#fff6a0' },            // la roca musgosa
    );
    S.chests.push({ pos: [14, H(14, -50), -50], region: 'lago' }, { pos: [-14, H(-14, -45), -45], region: 'lago' }, { pos: [-8, H(-8, -86), -86], region: 'lago' });
    S.spawnZones.push({ region: 'lago', c: [0, -52], r: 18 });
  }

  /* ---------------- Río Cantarín y la isla del altar (este) ---------------- */
  {
    const b = new Builder(game, REG.rio), p = b.pal;
    // puente de troncos y piedras para cruzar el río
    const zb = -4, xr = RIVER(zb);
    const a0 = [xr - 6.6, H(xr - 6.6, zb) + 0.05, zb], a1 = [xr + 6.6, H(xr + 6.6, zb) + 0.05, zb];
    plank(b, a0, a1, 2.6, 0.4, '#a8845a');
    for (const s of [-1, 1]) plank(b, [a0[0], a0[1] + 0.8, zb + s * 1.2], [a1[0], a1[1] + 0.8, zb + s * 1.2], 0.18, 0.18, '#8a6448');
    for (let i = -2; i <= 2; i++) { const z = 16 + i * 0.3, x = RIVER(z) + i * 2.4; b.cyl(x, -1.6, z + (i % 2) * 0.6, 0.85, 1.4, '#a8a898', { seg: 7 }); }
    // flores de cristal: una en una roca y otra en un tocón
    b.cyl(72, H(72, -9) - 0.3, -9, 1.3, 1.6, '#a8a898', { seg: 7 });
    b.cyl(73, H(73, 10) - 0.3, 10, 1.0, 1.0, '#8a6448', { seg: 8 });
    S.crystals.push({ pos: [72, H(72, -9) + 2.3, -9], region: 'rio', colors: ['#b8d8c0', '#c8fff0'] }, { pos: [73, H(73, 10) + 1.7, 10], region: 'rio', colors: ['#b8d8c0', '#c8fff0'] });
    // isla del altar en medio del barranco
    b.island(ALTAR.x, ALTAR.z, 0, 6.4, { seg: 10, ground: '#92d070' });
    b.cyl(ALTAR.x, 0, ALTAR.z, 1.7, 0.6, p.stone, { seg: 8 });
    b.cyl(ALTAR.x, 0.6, ALTAR.z, 1.1, 0.4, p.stone2, { seg: 8 });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; b.cyl(ALTAR.x + Math.cos(a) * 3.8, 0, ALTAR.z + Math.sin(a) * 3.8, 0.3, 2.6, p.stone, { seg: 6 }); b.orb(ALTAR.x + Math.cos(a) * 3.8, 2.8, ALTAR.z + Math.sin(a) * 3.8, 0.45, p.leaf[1]); }
    // pilares de la orilla donde se ata el puente de lianas
    for (const s of [-1, 1]) { b.cyl(76.8, 0, s * 1.8, 0.35, 2.2, '#8a6448', { seg: 6 }); b.cyl(85.2, 0, s * 1.8, 0.35, 2.2, '#8a6448', { seg: 6 }); }
    // juncos de la orilla y sauces
    for (let i = 0; i < 50; i++) {
      const z = -40 + R() * 80, x = RIVER(z) + (R() < 0.5 ? -1 : 1) * (4.6 + R() * 2.5), y = H(x, z);
      if (y < -0.4) continue;
      if (R() < 0.6) b.cone(x, y - 0.1, z, 0.07, 1 + R() * 0.7, p.leaf[0], { seg: 4 });
      else b.orb(x, y + 0.15, z, 0.14, FLOWERS[Math.floor(R() * FLOWERS.length)]);
    }
    for (const [x, z, s] of [[52, -16, 1.4], [54, 18, 1.2], [76, -20, 1.3], [78, 22, 1.5], [70, 30, 1.1], [48, 2, 1.1]]) bigTree(b, x, z, s, p.leaf);
    b.finish(scene);
    S.altar = { pos: [ALTAR.x, 2.1, ALTAR.z] };
    S.plankBridge = { from: [77.4, 0, 0], to: [85.6, 0, 0], width: 2.4, colors: ['#7a9a4a', '#9aba5a', '#4a6a3a'] };
    S.chests.push({ pos: [57, H(57, 10), 10], region: 'rio' }, { pos: [74, H(74, -24), -24], region: 'rio' }, { pos: [ALTAR.x - 3, 0, ALTAR.z + 2.4], region: 'rio' });
    S.spawnZones.push({ region: 'rio', c: [64, 0], r: 16 });
  }

  /* ---------------- Claro de los Gemelos (sur) ---------------- */
  {
    const b = new Builder(game, REG.raices), p = b.pal;
    const cx = ARENA.x, cz = ARENA.z, rr = 18.2;
    // anillo de rocas con la Puerta de Raíces al norte
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      if (Math.abs(a - Math.PI * 1.5) < 0.2) continue;                     // hueco de la puerta
      const x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
      b.box(x, -1.2, z, 5.4, 8 + (i % 3) * 1.2, 2.4, i % 2 ? p.rock : '#6a5a6a', { ry: -a - Math.PI / 2 });
    }
    const gz = cz - rr + 0.2;
    b.box(-3.4, -0.5, gz, 3.6, 7.5, 2.4, p.rock);
    b.box(3.4, -0.5, gz, 3.6, 7.5, 2.4, p.rock);
    b.box(0, 4.4, gz, 3.2, 3, 2.4, '#6a5a6a');
    // raíces gigantes que trepan por la puerta
    for (const s of [-1, 1]) {
      b.add(new THREE.CylinderGeometry(0.35, 0.55, 8, 6), '#5a4a3a', s * 2.2, 3.6, gz - 1.3, 0, 0, s * 0.5);
      b.add(new THREE.CylinderGeometry(0.25, 0.4, 6, 6), '#5a4a3a', s * 3.6, 5.8, gz - 1.25, 0, 0, -s * 0.9);
    }
    S.gate = { pos: [0, 0, gz], w: 3.2, h: 4.4, d: 0.8, colors: ['#5a4a3a', '#7a9a4a'] };
    // círculo de piedras, cristales morados y raíces en el suelo
    b.cyl(cx, -0.1, cz, 3.4, 0.35, p.stone2, { seg: 10 });
    b.cyl(cx, 0.25, cz, 2.2, 0.3, p.stone, { seg: 10 });
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + 0.2, x = cx + Math.cos(a) * 12, z = cz + Math.sin(a) * 12;
      b.add(new THREE.OctahedronGeometry(0.7, 0), '#c8a8ff', x, 1.2, z, 0, a, 0.3);
      b.cyl(x, -0.1, z, 0.7, 0.4, p.stone2, { seg: 6 });
    }
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; b.add(new THREE.CylinderGeometry(0.3, 0.5, 7, 6), '#5a4a3a', cx + Math.cos(a) * 7, 0, cz + Math.sin(a) * 7, Math.PI / 2, -a, 0); }
    // camino desde la pradera
    for (let i = 0; i < 9; i++) { const z = 22 + i * 3.2; b.cyl(Math.sin(i * 0.9) * 1.2, H(0, z) - 0.15, z, 0.9, 0.22, p.stone, { seg: 7, collide: false }); }
    b.finish(scene);
    S.chests.push({ pos: [cx - 10, 0, cz + 7], region: 'raices' });
    S.arena = { c: [cx, cz], r: 16, enter: cz - 12 };
    S.novaStar = { pos: [cx, 0.6, cz], color: '#ffe9a0', twin: '#c8a8ff' };
  }

  /* ---------------- flores y hierba por todo el valle ---------------- */
  {
    const b = new Builder(game, REG.pradera);
    for (let i = 0; i < 520; i++) {
      const x = (R() - 0.5) * 200, z = (R() - 0.5) * 200;
      const r0 = Math.hypot(x, z);
      if (r0 > 100 || r0 < 5) continue;
      if (Math.hypot(x - LAKE.x, z - LAKE.z) < 16.5 || Math.abs(x - RIVER(z)) < 5.6 || Math.hypot(x - ALTAR.x, z - ALTAR.z) < 15) continue;
      if (Math.hypot(x - ARENA.x, z - ARENA.z) < 19) continue;
      const y = H(x, z);
      if (R() < 0.55) b.orb(x, y + 0.14, z, 0.13 + R() * 0.06, FLOWERS[Math.floor(R() * FLOWERS.length)]);
      else b.cone(x, y - 0.05, z, 0.12, 0.45 + R() * 0.3, R() < 0.5 ? '#7ac85a' : '#5aa84a', { seg: 3 });
    }
    // arbolitos sueltos por las praderas
    for (let i = 0; i < 40; i++) {
      const x = (R() - 0.5) * 190, z = (R() - 0.5) * 190, r0 = Math.hypot(x, z);
      if (r0 > 98 || r0 < 18 || Math.hypot(x + 60, z) < 28 || Math.hypot(x - LAKE.x, z - LAKE.z) < 18 || Math.abs(x - RIVER(z)) < 7) continue;
      if (Math.hypot(x - ALTAR.x, z - ALTAR.z) < 16 || Math.hypot(x - ARENA.x, z - ARENA.z) < 21) continue;
      if (R() < 0.4) pine(b, x, z, 1 + R(), REG.pradera.leaf); else bigTree(b, x, z, 0.9 + R() * 0.8, REG.pradera.leaf);
    }
    b.finish(scene);
  }
  return S;
}

const at = (x, z, dy = 0.5) => [x, height(x, z) + dy, z];

export default {
  id: 'gemini', order: 1,
  name: 'Planeta Verdalia', galaxy: 'Galaxia Gemini', star: 'las Gemelas',
  blurb: 'Un planeta verde y vivo: praderas, bosques, ríos, un lago espejo y una cascada.',
  color: '#6ac46a', color2: '#f2d36a',
  regions: REG,
  hub: 'pradera', bossRegion: 'raices',
  build,
  guide: 'sauce',
  missions: MISSIONS_GEMINI,
  fragSlots: 4, gateNeed: 3, finalMission: 'gemelos',
  boss: 'gemelos',
  enemies: (e) => e.world === 'gemini',
  music: { day: 'bosque', keys: { pradera: 0, bosque: -2, lago: 3, rio: 5, raices: -5 } },
  sky: { far: false },
  links: [['pradera', 'bosque'], ['pradera', 'lago'], ['pradera', 'rio'], ['pradera', 'raices']],
  bridgeRegion: 'rio',
  scenes: { memory: 'gemini_recuerdo', gate: 'gemini_puerta', boss: 'gemini_jefe', final: 'gemini_final', rocket: null },
  texts: {
    gateOpen: 'La Puerta de Raíces se abrió (al sur de la pradera)',
    bridge: '¡Las lianas tejen un puente hasta el altar!',
    hubNote: 'La Fuente de Savia cura · Abuelo Sauce',
    endKicker: 'fin del segundo viaje', endTitle: 'Alba y Ocaso brillan juntas',
    endText: 'Verdalia vuelve a cantar. Las gemelas te mostraron el camino a la Galaxia Soledad: el Cohete Avellana te espera en la pradera.',
    bossName: 'Los Gemelos de Raíz', bossSub: 'dos guardianes atados por la Penumbra',
    nightFall: 'Cae la noche sobre Verdalia', dawn: 'Amanece en Verdalia',
    arrival: [
      'El cohete atraviesa las nubes de un planeta verde, verde, verde.',
      'Huele a lluvia y a flores. ¡Bienvenida a Verdalia!',
      '«¡Una visita del cielo! Acércate, pequeña: tengo mucho que contarte.»',
    ],
  },
  gateLines: [
    ['Abuelo Sauce', '«¿Oyes eso, Pip? Las raíces se mueven… La Puerta de Raíces despierta.»'],
    'Las raíces se apartan una a una, como dedos viejos que por fin sueltan algo.',
    ['Abuelo Sauce', '«Ahí dentro giran los Gemelos. No les tengas miedo… pero esquiva.»'],
  ],
  bossLines: [
    'Del suelo del claro brotan dos tótems enormes, atados por una cadena de sombra.',
    ['Gemelo del Alba', '«¡Fuera de aquí! ¡Nadie volverá a separar a las gemelas!»'],
    ['Gemelo del Ocaso', '«…ayúdanos… la cadena… no nos deja parar de girar…»'],
  ],
  memoryFocus: (g, n) => [g.v3(-60, 6, 0), g.v3(0, 2, -62), g.v3(0, 3, 68), g.v3(0, 2, 0)][(n - 1) % 4],
  places: {
    pradera: [0, 0.6, 5], bosque: at(-46, 0), lago: at(0, -43), cascada: at(0, -44.4), rio: at(54, -4), puente: at(76, 0),
    altar: [ALTAR.x - 2.5, 0.5, ALTAR.z], raices: at(0, 40), santuario: [0, 0.5, 56], cohete: [8.5, 0.5, 6.5],
    meseta: at(6, -84), campana: at(-48, -11),
  },
  placeYaw: { rio: -Math.PI / 2, puente: -Math.PI / 2, altar: -Math.PI / 2, raices: Math.PI, santuario: Math.PI, bosque: Math.PI / 2 },
  bossPlace: 'santuario',
};
