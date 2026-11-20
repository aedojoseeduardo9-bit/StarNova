/* Star Nova — mundo 3: Planeta Prismara (Galaxia Soledad).
 * Islas de colores flotando en el espacio, con planetas enormes en el cielo. Los suelos son de metal líquido
 * arcoíris que hace ondas cuando Pip camina o cae encima. Para llegar a los Anillos Prisma no hay pasarelas:
 * se vuela con los Impulsores Cometa (estrellas en el suelo) y en el Mar de Mercurio rebotan las gelatinas.
 * Aquí vive Sola, la estrella que pintaba arcoíris para que alguien la encontrara.
 *   centro → Muelle Estelar      (Faro de Reposo, Eco, Lumen, Capitana Vela, el cohete)
 *   oeste  → Mar de Mercurio     (misión: Notas de Color · gelatinas trampolín y pilares de cromo)
 *   norte  → Anillos Prisma      (misión: Campanas de Cristal · planetoides unidos por impulsores)
 *   este   → Jardín Aurora       (misión: Los Faros Prisma → puente arcoíris al altar)
 *   sur    → Trono de la Soledad (jefe: La Polilla de la Soledad, tras la Puerta Eclipse) */
import * as THREE from 'three';
import { REGIONS, REGION_IDS } from '../world/palette.js';
import { Builder } from '../world/builder.js';
import { LiquidFloor, Launcher, Bouncer } from '../world/special.js';

const SPACE = (top, hor, bot, fog) => ({ sky: { top, hor, bot }, fog });
const REG = {
  muelle: Object.assign({
    name: 'Muelle Estelar', sub: 'donde descansan los cohetes', center: [0, 0], r: 16,
    ground: '#e8e4f8', rock: '#6a5aa8', stone: '#f4f0ff', stone2: '#c8b8f0', accent: '#ff9ad8', win: '#8a6ad8',
    leaf: ['#9adcff', '#ffc8f0'], roof: '#b89aff', shade: '#7a6ac8', night: 0.55,
  }, SPACE('#120c34', '#7a4aa8', '#2a1a5a', '#4a3478')),
  mercurio: Object.assign({
    name: 'Mar de Mercurio', sub: 'las notas de color', center: [-56, 0], r: 17,
    ground: '#dfe4f2', rock: '#5a6a9a', stone: '#f0f4ff', stone2: '#b8c4e0', accent: '#9adcff', win: '#5a7ab8',
    leaf: ['#9adcff', '#c8f0ff'], roof: '#8ab8e8', shade: '#6a7ab0', night: 0.6,
  }, SPACE('#0a1a3a', '#3a7aa8', '#14284a', '#2e5276')),
  anillos: Object.assign({
    name: 'Anillos Prisma', sub: 'las campanas de cristal', center: [0, -60], r: 22,
    ground: '#f4e8ff', rock: '#8a5aa8', stone: '#fff4fc', stone2: '#e0b8f0', accent: '#ffd36e', win: '#a85ad8',
    leaf: ['#ffc8f0', '#fff0a0'], roof: '#ff9ad8', shade: '#a86ac8', night: 0.6,
  }, SPACE('#1a0a30', '#a84a98', '#3a1450', '#6a3478')),
  aurora: Object.assign({
    name: 'Jardín Aurora', sub: 'los faros que sueñan', center: [56, 0], r: 14,
    ground: '#e4fff4', rock: '#4a8a8a', stone: '#f0fffa', stone2: '#a8e8d8', accent: '#8affc8', win: '#3a8a7a',
    leaf: ['#8affc8', '#c8fff0'], roof: '#5ad8b0', shade: '#4aa898', night: 0.6,
  }, SPACE('#06202a', '#2aa88a', '#0a3038', '#2a6a6a')),
  trono: Object.assign({
    name: 'Trono de la Soledad', sub: 'donde llora la polilla', center: [0, 66], r: 18,
    ground: '#e8e0f4', rock: '#3a2a5a', stone: '#f0e8ff', stone2: '#a898d0', accent: '#ffb8f0', win: '#ffe9a0',
    leaf: ['#c8a8ff', '#ffc8f0'], roof: '#8a6ad8', shade: '#4a3a7a', night: 0.85,
  }, SPACE('#05030f', '#4a2a6a', '#120a24', '#2a1a40')),
};

/* ---------- misiones ---------- */
const centerOf = (g, id, y = 0.5) => g.v3(REGIONS[id].center[0], y + (id === 'anillos' ? 10 : 0), REGIONS[id].center[1] + (id === 'anillos' ? -4 : 0));
export const MISSIONS_SOLEDAD = [
  // Principales
  { id: 'notas', type: 'principal', region: 'mercurio', title: 'Las Notas de Color', desc: 'Junta las cinco Notas de Color del arcoíris roto en el Mar de Mercurio. Rebota en las gelatinas para llegar alto.', goal: 5, fragment: true,
    on: { firefly: true }, targets: (g) => g.props.fireflies.filter(f => !f.taken).map(f => f.p) },
  { id: 'campanas', type: 'principal', region: 'anillos', title: 'Campanas de Cristal', desc: 'Vuela con los Impulsores Cometa hasta los Anillos Prisma y haz sonar sus tres Campanas de Cristal.', goal: 3, fragment: true,
    on: { bell: true }, targets: (g) => g.props.bells.filter(b => !b.rung).map(b => b.anchor.clone().setY(b.anchor.y - 0.8)) },
  { id: 'faros', type: 'principal', region: 'aurora', title: 'Los Faros Prisma', desc: 'Enciende los dos Faros Prisma del Jardín Aurora, cruza el puente arcoíris y toma el fragmento del altar.', goal: 3, fragment: true,
    on: { crystal: true, altar: true },
    targets: (g) => {
      const c = g.props.crystals.filter(x => !x.active).map(x => x.p);
      if (c.length) return c;
      return g.altarFragment && !g.altarFragment.dead ? [g.altarFragment.p] : [];
    } },
  { id: 'polilla', type: 'principal', region: 'trono', title: 'La Polilla de la Soledad', desc: 'Con 3 fragmentos se abre la Puerta Eclipse, al sur. Vence a la Polilla para que Sola pueda verte.', goal: 1, final: true,
    on: { boss: true }, targets: (g) => [centerOf(g, 'trono', 1)] },
  // Secundarias
  { id: 'polvo', type: 'secundaria', region: null, title: 'Polvo de Estrella', desc: 'Recoge 20 pizcas de polvo de estrella que flotan por Prismara. Premio: un fragmento extra.', goal: 20, fragment: true,
    on: { stardust: true }, targets: (g) => g.stardust.filter(k => !k.dead).slice(0, 6).map(k => k.p) },
  { id: 'astronauta', type: 'secundaria', region: null, title: 'Astronauta de Prismara', desc: 'Visita las cinco regiones del planeta. Premio: objeto raro.', goal: 5, reward: [0, 20, 60, 20, 0, 0],
    on: { region: true }, visit: true, targets: (g) => REGION_IDS.filter(r => !g.missions.visited.has(r)).map(r => centerOf(g, r)) },
  { id: 'cofres', type: 'secundaria', region: null, title: 'Cofres del Espacio', desc: 'Abre 5 cofres en Prismara. Premio: objeto épico.', goal: 5, reward: [0, 0, 30, 60, 10, 0],
    on: { chest: true }, targets: (g) => g.props.chests.filter(c => !c.opened).map(c => c.p) },
  { id: 'coloso', type: 'secundaria', region: null, title: 'El Coloso de Cromo', desc: 'Derrota a un Coloso de Cromo (aparecen cuando el reloj avanza). Premio: objeto legendario.', goal: 1, reward: [0, 0, 0, 20, 75, 5],
    on: { kill: (o) => o.type === 'coloso' }, targets: (g) => g.enemies.filter(e => e.type === 'coloso' && !e.dead).map(e => e.pos) },
];

/* ---------- el mapa ---------- */
const RAINBOW = ['#ff8a9a', '#ffb36a', '#ffe08a', '#8ae8a0', '#8ad0ff', '#a89aff', '#e89aff'];
const hue = (i, n, l = 0.74) => '#' + new THREE.Color().setHSL(i / n, 0.8, l).getHexString();

/* Planetoide: isla redonda con suelo de mercurio y un anillo de cristal alrededor. */
function planetoid(b, S, x, z, top, r, ringColor) {
  b.island(x, z, top, r, { seg: 12 });
  if (ringColor) {
    const t = new THREE.TorusGeometry(r + 1.6, 0.16, 6, 36);
    b.add(t, ringColor, x, top - 1.2, z, Math.PI / 2 - 0.25, 0, 0.18);
  }
  S.extras.push(new LiquidFloor(b.game, { x, y: top, z, r: r * 0.9 }));
}

function build(game) {
  const scene = game.scene;
  const S = {
    spawn: [0, 0.6, 5],
    campfire: { pos: [0, 0.22, 0], look: 'faro' },
    owl: null,
    chests: [], crates: [], bells: [], fireflies: [], crystals: [], lanterns: [],
    altar: null, plankBridge: null, gate: null, arena: null, novaStar: null,
    spawnZones: [], extras: [], stardust: [],
  };
  const dust = (x, y, z) => S.stardust.push([x, y, z]);

  /* ---------------- Muelle Estelar (centro) ---------------- */
  {
    const b = new Builder(game, REG.muelle), p = b.pal;
    b.island(0, 0, 0, 15, { seg: 14 });
    S.extras.push(new LiquidFloor(game, { x: 0, y: 0, z: 0, r: 13.6 }));
    b.cyl(0, 0, 0, 3.4, 0.2, p.stone, { seg: 12 });
    // arcos de cristal en las cuatro salidas (cada uno de un color)
    b.arch(-13.4, 0, 0, 3.2, 3.8, 1.0, { ry: Math.PI / 2, color: '#9adcff', trim: '#f0f8ff' });
    b.arch(13.4, 0, 0, 3.2, 3.8, 1.0, { ry: Math.PI / 2, color: '#8affc8', trim: '#f0fff8' });
    b.arch(0, 13.4, 0, 3.2, 3.8, 1.0, { color: '#c8a8ff', trim: '#f8f0ff' });
    // agujas de colores y faroles
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2 + 0.4, x = Math.cos(a) * 10.5, z = Math.sin(a) * 10.5;
      if (Math.abs(z + 10.5) < 3 && Math.abs(x) < 4) continue;
      b.cyl(x, 0, z, 0.35, 2.6 + (i % 3) * 0.8, RAINBOW[i], { seg: 6 });
      b.add(new THREE.OctahedronGeometry(0.45, 0), RAINBOW[(i + 3) % 7], x, 3.3 + (i % 3) * 0.8, z);
    }
    // anillo flotante sobre el faro
    b.add(new THREE.TorusGeometry(4.2, 0.18, 6, 40), '#ffe08a', 0, 7.5, 0, Math.PI / 2, 0, 0);
    // la Boutique Mercurio de Lumen (cúpula de cristal) y la nave varada de la Capitana Vela
    b.cyl(-7.5, 0, 6.5, 2.4, 0.25, p.stone2, { seg: 10 });
    b.dome(-7.5, 0.25, 6.5, 2.2, '#c8e8ff', { seg: 10 });
    b.box(-7.5, 0.25, 8.6, 1.2, 1.6, 0.4, p.accent, { collide: false });
    b.add(new THREE.ConeGeometry(1.1, 3.2, 6), '#f0e8ff', 9.5, 1.2, -6.5, 0.2, 0.5, 1.2);
    b.add(new THREE.ConeGeometry(0.6, 1.4, 4), '#ff9a8a', 10.6, 0.6, -5.4, 0.3, 0, 1.5);
    b.add(new THREE.ConeGeometry(0.6, 1.4, 4), '#ff9a8a', 8.6, 0.6, -7.8, -0.3, 0, 1.1);
    // pista del cohete
    b.cyl(10.8, 0, 9.6, 3, 0.15, p.stone2, { seg: 12 });
    // pedestal del impulsor del norte (vuela a los Anillos Prisma)
    b.cyl(0, 0, -11.4, 1.5, 0.12, '#ffe08a', { seg: 10, collide: false });
    // pasarelas de cristal al oeste, este y sur
    b.walkway(-15, 0, -40.5, 0, 0, 4, {});
    b.walkway(15, 0, 43.5, 0, 0, 4, {});
    b.walkway(0, 15, 0, 47.6, 0, 4, {});
    b.finish(scene);
    S.extras.push(new Launcher(game, { from: [0, 0.12, -11.4], to: [0, 4.1, -29], h: 6, dur: 1.5, label: 'Impulsarse a los Anillos Prisma' }));
    S.chests.push({ pos: [5.5, 0, 4.5], region: 'muelle' }, { pos: [-4.5, 0, -9], region: 'muelle' });
    S.rocket = { pos: [10.8, 0.15, 9.6], ry: -2.3 };
    S.rocketExit = [11.4, 0.4, 7.1];
    S.rocketExitYaw = -0.6;
    S.npcs = [
      { id: 'eco', pos: [3.6, 0, -4.2], ry: -0.6 },
      { id: 'lumen', pos: [-6.2, 0, 4.4], ry: 0.8 },
      { id: 'vela', pos: [7.6, 0, -4.4], ry: -2.4 },
    ];
    for (const x of [-20, -27, -34]) dust(x, 1.2, 0);
    for (const x of [21, 28, 35]) dust(x, 1.2, 0);
    for (const z of [22, 30, 38]) dust(0, 1.2, z);
  }

  /* ---------------- Mar de Mercurio (oeste) ---------------- */
  {
    const b = new Builder(game, REG.mercurio), p = b.pal;
    const cx = -56, cz = 0;
    b.island(cx, cz, 0, 16, { seg: 14 });
    S.extras.push(new LiquidFloor(game, { x: cx, y: 0, z: cz, r: 14.8 }));
    // pilares de cromo de alturas distintas
    const pillars = [[-60, -6, 5.5], [-50, -9, 3.5], [-64, 6, 4.5], [-47, 6, 2.6], [-56, 11, 6.5], [-67, -3, 3]];
    for (const [x, z, h] of pillars) {
      b.cyl(x, 0, z, 1.1, h, '#e8ecf8', { seg: 10 });
      b.cyl(x, h, z, 1.35, 0.25, '#b8c4e0', { seg: 10 });
    }
    // plataforma flotante alta
    b.cyl(-66, 7, -10, 2, 0.4, '#f0f4ff', { seg: 10 });
    b.add(new THREE.TorusGeometry(2.4, 0.12, 6, 30), '#9adcff', -66, 7.2, -10, Math.PI / 2, 0, 0);
    // gotas de mercurio decorativas
    for (let i = 0; i < 10; i++) { const a = i * 2.4, r = 6 + (i % 4) * 2; b.orb(cx + Math.cos(a) * r, 0.25, cz + Math.sin(a) * r, 0.35, '#f4f8ff', 1); }
    b.finish(scene);
    // gelatinas trampolín junto a los pilares altos
    S.extras.push(
      new Bouncer(game, { pos: [-58.2, 0, -4.2], color: '#ff9ad8' }),
      new Bouncer(game, { pos: [-62.5, 0, 4.4], color: '#9affc8' }),
      new Bouncer(game, { pos: [-54.4, 0, 9.0], color: '#ffe08a', power: 18 }),
      new Bouncer(game, { pos: [-64, 0, -7.8], color: '#9adcff', power: 19.5 }),
    );
    // las cinco Notas de Color (cada una de un color del arcoíris)
    const notes = [[-48, 1.4, 8], [-60, 5.5 + 1.4, -6], [-66, 7.4 + 1.3, -10], [-52, 1.4, -11], [-56, 6.5 + 1.4, 11]];
    notes.forEach(([x, y, z], i) => S.fireflies.push({ pos: [x, y, z], region: 'mercurio', color: RAINBOW[[0, 1, 2, 4, 5][i]] }));
    S.chests.push({ pos: [cx - 9, 0, cz + 9], region: 'mercurio' }, { pos: [cx + 6, 0, cz - 4], region: 'mercurio' }, { pos: [-64, 4.75, 6], region: 'mercurio' });
    S.spawnZones.push({ region: 'mercurio', c: [cx, cz], r: 14 });
    for (const [x, z] of [[-50, 2], [-58, 0], [-62, -12], [-44, -4]]) dust(x, 1.2, z);
  }

  /* ---------------- Anillos Prisma (norte): planetoides e impulsores ---------------- */
  {
    const b = new Builder(game, REG.anillos), p = b.pal;
    const P = {
      p1: [0, -30, 4, 4.5], p2: [-13, -44, 8, 4.2], p3: [11, -48, 6, 4.5], p4: [0, -62, 10, 7.5], p5: [-15, -76, 14, 4.2], p6: [15, -78, 12, 4.2],
    };
    const ring = { p1: '#ffe08a', p2: '#ff9ad8', p3: '#9adcff', p4: '#ffffff', p5: '#8affc8', p6: '#c8a8ff' };
    for (const k in P) { const [x, z, top, r] = P[k]; planetoid(b, S, x, z, top, r, ring[k]); }
    // arcos con Campanas de Cristal en tres planetoides
    const bellAt = [['p2', 784], ['p5', 988], ['p6', 1175]];
    for (const [k, f] of bellAt) {
      const [x, z, top] = P[k];
      const lt = b.arch(x, z, top, 2.6, 3.8, 0.8, { color: '#f4e8ff', trim: ring[k] });
      S.bells.push({ anchor: [x, lt - 0.62, z], freq: f, region: 'anillos', colors: ['#c8d8ff', '#fff0ff'] });
    }
    // el gran planetoide: agujas y un anillo gigante inclinado
    const [x4, z4, t4] = P.p4;
    b.add(new THREE.TorusGeometry(11, 0.3, 8, 60), '#ffe08a', x4, t4 + 2, z4, Math.PI / 2 - 0.35, 0, 0.2);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; b.cyl(x4 + Math.cos(a) * 5, t4, z4 + Math.sin(a) * 5, 0.3, 2 + i % 2, RAINBOW[i], { seg: 6 }); }
    b.finish(scene);
    // impulsores: cada estrella lanza a Pip al siguiente planetoide
    const L = (from, to, h, label) => S.extras.push(new Launcher(game, { from, to, h, dur: 1.4, label }));
    const top = (k, dx = 0, dz = 0) => [P[k][0] + dx, P[k][2] + 0.1, P[k][1] + dz];
    L(top('p1', -1.6, -2.2), top('p2', 1.4, 1.6), 5, 'Impulsarse al planetoide rosa');
    L(top('p1', 1.6, -2.2), top('p3', -1.2, 2.0), 5, 'Impulsarse al planetoide azul');
    L(top('p1', 0, 2.6), [0, 0.5, -8], 6, 'Volver al Muelle Estelar');
    L(top('p2', 2.6, -1.9), top('p4', -3, 4), 5, 'Impulsarse al gran anillo');
    L(top('p3', -2.2, -1.4), top('p4', 3, 4.4), 6, 'Impulsarse al gran anillo');
    L(top('p4', -3.6, -3.6), top('p5', 1.6, 1.4), 5, 'Impulsarse al planetoide verde');
    L(top('p4', 3.6, -3.6), top('p6', -1.6, 1.6), 5, 'Impulsarse al planetoide lila');
    L(top('p4', 0, 5.6), [0, 0.5, -8], 9, 'Volver al Muelle Estelar');
    L(top('p5', 1.4, -2.2), top('p4', -1.6, -4.2), 4, 'Volver al gran anillo');
    L(top('p6', -1.4, -2.2), top('p4', 1.6, -4.2), 4, 'Volver al gran anillo');
    S.chests.push({ pos: top('p3', 1.8, -1.6), region: 'anillos' }, { pos: top('p4', 4.5, 1), region: 'anillos' }, { pos: top('p5', -1.6, 1), region: 'anillos' });
    S.spawnZones.push({ region: 'anillos', c: [0, -62], r: 8 });
    for (const k of ['p1', 'p2', 'p3', 'p5', 'p6']) { const [x, z, t] = P[k]; dust(x, t + 1.3, z); }
    dust(x4 - 2, t4 + 1.3, z4 + 2); dust(x4 + 2, t4 + 1.3, z4 + 2);
  }

  /* ---------------- Jardín Aurora y el altar (este) ---------------- */
  {
    const b = new Builder(game, REG.aurora), p = b.pal;
    const cx = 56, cz = 0, ax = 90;
    b.island(cx, cz, 0, 13, { seg: 12 });
    S.extras.push(new LiquidFloor(game, { x: cx, y: 0, z: cz, r: 11.8 }));
    // los dos Faros Prisma: torres de cristal con un faro arriba
    for (const [x, z, h] of [[cx - 3, -6, 2.2], [cx + 4, 6, 4.2]]) {
      b.cyl(x, 0, z, 1.0, h, '#d8fff0', { seg: 6 });
      b.cyl(x, h, z, 1.3, 0.2, '#8affc8', { seg: 6 });
    }
    S.crystals.push({ pos: [cx - 3, 3.1, -6], region: 'aurora', colors: ['#a8c8d0', '#c8fff8'] }, { pos: [cx + 4, 5.1, 6], region: 'aurora', colors: ['#a8c8d0', '#c8fff8'] });
    // escalones de cristal para subir al faro alto
    b.spiral(cx + 4, 6, 0, 3, 1.0, 2.6, Math.PI, 0.9, { size: 1.4 });
    // flores-aurora
    for (let i = 0; i < 12; i++) { const a = i * 0.52 + 0.2, r = 7 + (i % 3) * 1.4; b.cone(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r, 0.25, 1 + (i % 3) * 0.5, RAINBOW[i % 7], { seg: 5 }); }
    // isla del altar
    b.island(ax, cz, 0, 6.5, { seg: 10 });
    b.cyl(ax, 0, cz, 1.7, 0.6, p.stone, { seg: 8 });
    b.cyl(ax, 0.6, cz, 1.1, 0.4, p.stone2, { seg: 8 });
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; b.cyl(ax + Math.cos(a) * 4, 0, cz + Math.sin(a) * 4, 0.28, 2.4, RAINBOW[i], { seg: 6 }); }
    b.finish(scene);
    S.extras.push(new LiquidFloor(game, { x: ax, y: 0, z: cz, r: 5.8 }));
    S.altar = { pos: [ax, 2.1, cz] };
    S.plankBridge = { from: [cx + 12.7, 0, cz], to: [ax - 6.3, 0, cz], width: 2.6, rainbow: true };
    S.chests.push({ pos: [cx - 6, 0, cz + 6], region: 'aurora' }, { pos: [cx + 7, 0, cz - 5], region: 'aurora' });
    S.spawnZones.push({ region: 'aurora', c: [cx, cz], r: 11 });
    for (const [x, z] of [[cx - 7, -2], [cx + 2, -8], [cx + 8, 2]]) dust(x, 1.2, z);
  }

  /* ---------------- Trono de la Soledad (sur) ---------------- */
  {
    const b = new Builder(game, REG.trono), p = b.pal;
    const cx = 0, cz = 66, wz = 48.4;
    b.island(cx, cz, 0, 18, { seg: 14 });
    S.extras.push(new LiquidFloor(game, { x: cx, y: 0, z: cz, r: 16.5 }));
    // muralla con la Puerta Eclipse
    b.box(-6.5, 0, wz, 10, 7, 1.4, '#3a2a5a', {});
    b.box(6.5, 0, wz, 10, 7, 1.4, '#3a2a5a', {});
    b.box(0, 4.4, wz, 3.2, 2.6, 1.4, '#4a3a6a', {});
    b.box(0, 7, wz, 23.4, 0.5, 1.8, '#8a6ad8', {});
    for (const [i, x] of [-10, -6, 6, 10].entries()) b.window(x, 2.2, wz - 0.71, 0, 0.6, 1.2, RAINBOW[i * 2]);
    b.add(new THREE.TorusGeometry(2.2, 0.2, 6, 32), '#ffe9a0', 0, 9.2, wz, 0, 0, 0);
    S.gate = { pos: [0, 0, wz], w: 3.2, h: 4.4, d: 0.8, colors: ['#2a1a4a', '#a88ae8'] };
    // anillo de prismas
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const x = cx + Math.cos(a) * 14, z = cz + Math.sin(a) * 14;
      if (z < cz - 11 && Math.abs(x) < 4) continue;
      b.cyl(x, 0, z, 0.5, 5 + (i % 2) * 1.5, '#e8e0ff', { seg: 6 });
      b.add(new THREE.OctahedronGeometry(0.7, 0), RAINBOW[i % 7], x, 6.2 + (i % 2) * 1.5, z);
    }
    // el trono de Sola
    b.cyl(cx, 0, cz, 3.2, 0.3, p.stone2, { seg: 12 });
    b.cyl(cx, 0.3, cz, 2.2, 0.3, p.stone, { seg: 12 });
    b.box(cx, 0, cz + 11, 5, 1.2, 2.4, '#4a3a6a');
    b.box(cx, 1.2, cz + 12, 5, 3.4, 0.8, '#6a5a9a');
    for (let i = 0; i < 7; i++) b.add(new THREE.TorusGeometry(3.6 + i * 0.32, 0.12, 4, 30, Math.PI), RAINBOW[i], cx, 4.2, cz + 12.2, 0, 0, 0);
    b.finish(scene);
    S.chests.push({ pos: [cx - 10, 0, cz + 8], region: 'trono' });
    S.arena = { c: [cx, cz], r: 16, enter: cz - 12 };
    S.novaStar = { pos: [cx, 0.6, cz], color: '#ffc8f0' };
  }
  return S;
}

export default {
  id: 'soledad', order: 2,
  name: 'Planeta Prismara', galaxy: 'Galaxia Soledad', star: 'Sola',
  blurb: 'Islas de colores en pleno espacio, con suelos de metal líquido que hacen ondas al pisarlos.',
  color: '#c89aff', color2: '#8adcff',
  regions: REG,
  hub: 'muelle', bossRegion: 'trono',
  build,
  guide: 'eco',
  missions: MISSIONS_SOLEDAD,
  fragSlots: 4, gateNeed: 3, finalMission: 'polilla',
  boss: 'polilla',
  enemies: (e) => e.world === 'soledad',
  music: { day: 'prisma', keys: { muelle: 0, mercurio: 2, anillos: 7, aurora: 4, trono: -3 } },
  sky: { far: false, clouds: false, stars: 0.85, planets: [['#ff9ad8', 70, 0.6, 140, '#ffe08a'], ['#8adcff', 40, 2.4, 60, null], ['#ffe08a', 26, -1.2, 220, '#c8a8ff'], ['#8affc8', 18, 3.6, 100, null]] },
  links: [['muelle', 'mercurio'], ['muelle', 'anillos'], ['muelle', 'aurora'], ['muelle', 'trono']],
  bridgeRegion: 'aurora',
  scenes: { memory: 'soledad_recuerdo', gate: 'soledad_puerta', boss: 'soledad_jefe', final: 'soledad_final', rocket: null },
  texts: {
    gateOpen: 'La Puerta Eclipse se abrió (al sur del muelle)',
    bridge: '¡Un puente de arcoíris cruza hasta el altar!',
    hubNote: 'El Faro de Reposo cura · Eco',
    endKicker: 'fin del gran viaje', endTitle: 'Cuatro estrellas, juntas',
    endText: 'Sola ya no está sola. Nova, Alba, Ocaso y Sola brillan juntas, y la Penumbra duerme tranquila. Puedes seguir explorando las tres galaxias en el Cohete Avellana.',
    bossName: 'La Polilla de la Soledad', bossSub: 'nacida de mil años de espera',
    nightFall: 'Las luces de Prismara se apagan un poco', dawn: 'Los colores de Prismara despiertan',
    arrival: [
      'Un planeta de colores flota en mitad del espacio, rodeado de anillos.',
      'El suelo brilla como un espejo líquido… ¡y hace ondas a cada paso!',
      '«…hola… hola… ¡Ay, perdón! ¿De verdad hay alguien? ¡Ven, ven!»',
    ],
  },
  gateLines: [
    ['Eco', '«Tres colores… La Puerta Eclipse se está abriendo, al sur del muelle.»'],
    'La puerta se desliza sin ruido. Del otro lado llega un aleteo muy triste.',
    ['Eco', '«Ahí dentro está la Polilla. Nació de la tristeza de Sola. Ten cuidado: desaparece y aparece.»'],
  ],
  bossLines: [
    'Mil alas de colores se juntan en una sola: la Polilla de la Soledad.',
    ['La Polilla', '«¡Vete! Todos se van. Mejor que te vayas ahora.»'],
    'Pip aprieta su bellota. Esta vez, alguien no se va a ir.',
  ],
  memoryFocus: (g, n) => [g.v3(-56, 3, 0), g.v3(0, 12, -62), g.v3(0, 3, 66), g.v3(0, 3, 0)][(n - 1) % 4],
  places: {
    muelle: [0, 0.6, 5], mercurio: [-44, 0.5, 0], anillos: [0, 10.5, -58], aurora: [44, 0.5, 0], puente: [66, 0.5, 0],
    altar: [86.5, 0.5, 0], trono: [0, 0.5, 40], santuario: [0, 0.5, 54], cohete: [8.5, 0.5, 6.5], planetoide: [0, 4.5, -28],
    impulsor: [0, 0.5, -10.9],
  },
  placeYaw: { aurora: -Math.PI / 2, puente: -Math.PI / 2, altar: -Math.PI / 2, mercurio: Math.PI / 2, trono: Math.PI, santuario: Math.PI },
  bossPlace: 'santuario',
};
