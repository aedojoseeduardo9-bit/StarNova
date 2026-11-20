/* Star Nova — jefes finales de cada mundo (datos + modelos). La pelea la lleva la clase Boss de enemies.js.
 * Cada jefe está hecho de nuestros propios personajes: el Guardián (bloques), los Gemelos de Raíz (dos tótems del
 * bosque atados por la Penumbra) y la Polilla de la Soledad (una Polilla Fantasma gigante, con alas de arcoíris).
 * Campos: name, sub, hp, dmg, colors, r, hh, box (medio tamaño del colisionador), model(), animate(u, t, enraged, boss),
 * order (fases en bucle: ring, slam-up, hover, summon, spin, blink), summon [normal, enfurecido], orb (color de sus balas),
 * twin (dos cuerpos que giran uno alrededor del otro), hoverY. */
import * as THREE from 'three';
import { mat, GEO, part, makeGuardian } from './models.js';

/* ---------- Los Gemelos de Raíz (Galaxia Gemini) ---------- */
function makeTotemTwin(light) {
  const g = new THREE.Group();
  const c = light ? ['#7fb86a', '#a8d68a', '#f2e6a0'] : ['#4b3f6e', '#6a5a96', '#b8a4ff'];
  const bark = mat(light ? '#8a6a4a' : '#3d3150');
  g.add(part(GEO.cyl(8), bark, 0, 0.9, 0, 0.95, 1.8, 0.95));
  g.add(part(GEO.cyl(8), mat(c[0]), 0, 2.2, 0, 0.85, 1.0, 0.85));
  g.add(part(GEO.cyl(8), bark, 0, 3.1, 0, 0.7, 0.9, 0.7));
  // cara tallada
  const eye = mat(light ? '#fff6c8' : '#ff9ad8', { emissive: light ? 0x8a7a20 : 0x902070 });
  for (const s of [-1, 1]) g.add(part(GEO.box(), eye, s * 0.3, 2.35, 0.82, 0.22, 0.14, 0.1));
  g.add(part(GEO.box(), mat('#2a2030'), 0, 2.0, 0.84, 0.36, 0.08, 0.06));
  // copa de hojas
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    g.add(part(GEO.ico(1), mat(i % 2 ? c[0] : c[1]), Math.cos(a) * 0.7, 3.8 + (i % 2) * 0.2, Math.sin(a) * 0.7, 0.6));
  }
  g.add(part(GEO.oct(), mat(c[2], { emissive: light ? 0x806a20 : 0x5a3a90 }), 0, 4.5, 0, 0.35, 0.55, 0.35));
  // raíces
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const r = part(GEO.cone(5), bark, Math.cos(a) * 0.9, 0.2, Math.sin(a) * 0.9, 0.22, 0.9, 0.22);
    r.rotation.z = Math.cos(a) * 1.1; r.rotation.x = -Math.sin(a) * 1.1;
    g.add(r);
  }
  return g;
}
export function makeGemelos() {
  const root = new THREE.Group();
  const inner = new THREE.Group();
  root.add(inner);
  const a = makeTotemTwin(true), b = makeTotemTwin(false);
  inner.add(a, b);
  // la cadena de Penumbra que los ata
  const chain = [];
  for (let i = 0; i < 7; i++) {
    const l = part(GEO.torus(), mat('#3a2e5c', { emissive: 0x1a1030 }), 0, 2.4, 0, 0.22, 0.22, 0.22);
    inner.add(l); chain.push(l);
  }
  root.userData = { inner, twins: [a, b], chain };
  return root;
}

/* ---------- La Polilla de la Soledad (Galaxia Soledad) ---------- */
export function makePolilla() {
  const root = new THREE.Group();
  const inner = new THREE.Group();
  root.add(inner);
  const body = mat('#e8e4ff', { emissive: 0x30284a });
  inner.add(part(GEO.ico(2), body, 0, 2.2, 0, 0.6, 1.5, 0.6));
  inner.add(part(GEO.ico(2), body, 0, 3.6, 0.15, 0.55));
  for (const s of [-1, 1]) {
    inner.add(part(GEO.ico(1), mat('#2a2050', { emissive: 0x6050c0 }), s * 0.22, 3.7, 0.6, 0.14));
    const ant = part(GEO.cyl(5), mat('#c8c0ff'), s * 0.25, 4.3, 0.2, 0.04, 0.9, 0.04);
    ant.rotation.z = -s * 0.5; inner.add(ant);
  }
  const wings = [];
  const cols = [['#ff9aa8', '#ffd38a'], ['#9adcff', '#c8a8ff']];
  for (let row = 0; row < 2; row++) for (const s of [-1, 1]) {
    const w = new THREE.Group();
    w.position.set(s * 0.4, row ? 1.7 : 2.7, -0.1);
    const wm = mat(cols[row][0], { emissive: row ? 0x203a50 : 0x502030, transparent: true, opacity: 0.88 });
    const leaf = part(GEO.ico(1), wm, s * (row ? 1.3 : 1.8), 0, 0, row ? 1.4 : 2.0, row ? 1.0 : 1.5, 0.08);
    w.add(leaf);
    w.add(part(GEO.ico(1), mat(cols[row][1], { emissive: 0x403020 }), s * (row ? 1.5 : 2.1), 0.1, 0.06, 0.45, 0.45, 0.05));
    inner.add(w); wings.push(w);
  }
  const halo = part(GEO.torus(), mat('#ffffff', { emissive: 0x8070c0 }), 0, 4.8, 0, 0.7, 0.7, 0.25);
  halo.rotation.x = Math.PI / 2; inner.add(halo);
  root.userData = { inner, wings, halo };
  return root;
}

export const BOSSES = {
  guardian: {
    name: 'El Guardián de Nova', hp: 2600, dmg: 22, xp: 300, sparks: 160, colors: ['#3e4288', '#5a5fae', '#8e94d6'],
    r: 1.9, hh: 1.7, box: [1.5, 1.6, 1.5], hoverY: 5.5, model: makeGuardian,
    order: ['ring', 'slam-up', 'hover', 'summon', 'ring', 'slam-up'],
    summon: [['sombra', 'chispita'], ['sombra', 'bomba', 'farol', 'chispita']],
    orb: { color: '#ffe08a', emissive: 0x9a7010 },
    animate(u, t, enraged) {
      u.halo.rotation.z = t * 0.8;
      u.core.rotation.y = t * 3;
      u.orbiters.forEach((o, i) => {
        const a = t * (enraged ? 2.4 : 1.4) + (i / 4) * Math.PI * 2;
        o.position.set(Math.cos(a) * 2.8, 1.8 + Math.sin(t * 2 + i) * 0.5, Math.sin(a) * 2.8);
        o.rotation.set(t, t * 1.3, 0);
      });
    },
  },
  gemelos: {
    name: 'Los Gemelos de Raíz', hp: 3400, dmg: 24, xp: 420, sparks: 220, colors: ['#7fb86a', '#4b3f6e', '#a8d68a'],
    r: 1.4, hh: 2.2, box: [1.0, 2.2, 1.0], hoverY: 3, twin: true, orbit: 3.2, model: makeGemelos,
    order: ['ring', 'spin', 'slam-up', 'summon', 'hover', 'spin'],
    summon: [['musguito', 'abejorro'], ['musguito', 'espora', 'abejorro', 'zarza']],
    orb: { color: '#c8f0a0', emissive: 0x406a20 },
    animate(u, t, enraged, boss) {
      const spin = boss.spinK || 0;
      u.twins.forEach((tw, i) => {
        tw.position.set(i ? -boss.orbitR : boss.orbitR, Math.sin(t * 2 + i * Math.PI) * 0.25, 0);
        tw.rotation.y = t * (0.5 + spin * 6) * (i ? -1 : 1);
      });
      u.chain.forEach((l, i) => {
        const k = i / (u.chain.length - 1);
        l.position.set(boss.orbitR * (1 - 2 * k), 2.4 + Math.sin(k * Math.PI) * -0.5 + Math.sin(t * 3 + i) * 0.1, 0);
        l.rotation.set(t + i, i % 2 ? Math.PI / 2 : 0, 0);
      });
    },
  },
  polilla: {
    name: 'La Polilla de la Soledad', hp: 3900, dmg: 26, xp: 520, sparks: 260, colors: ['#e8e4ff', '#ff9aa8', '#9adcff'],
    r: 1.7, hh: 2.6, box: [1.4, 2.0, 1.4], hoverY: 6, model: makePolilla,
    order: ['ring', 'blink', 'slam-up', 'summon', 'blink', 'ring'],
    summon: [['ecopolilla', 'prismita'], ['ecopolilla', 'prismita', 'cometita', 'gota']],
    orb: { color: '#ffb8f0', emissive: 0x8a3070, rainbow: true },
    animate(u, t, enraged) {
      const f = enraged ? 16 : 10;
      u.wings.forEach((w, i) => { const s = i % 2 ? -1 : 1; w.rotation.y = s * (0.25 + Math.sin(t * f + (i > 1 ? 0.6 : 0)) * 0.55); });
      u.halo.rotation.z = t * 1.5;
      u.inner.position.y = Math.sin(t * 2) * 0.3;
    },
  },
};
