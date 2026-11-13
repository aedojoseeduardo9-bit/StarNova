/* Star Nova — vestuario de Pip: 10 trajes hechos con primitivas (se compran con chispas en el menú).
 * Cada traje puede cambiar colores del pelaje/bufanda y colgar piezas del "esqueleto" de Pip
 * (head, torso, ears, tail…). applyOutfit(modelo, id) quita el traje anterior y pone el nuevo. */
import * as THREE from 'three';

const GEO = {
  ball: new THREE.IcosahedronGeometry(1, 2),
  half: new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),          // media esfera (gorros, cascos)
  cone: new THREE.ConeGeometry(1, 1, 14),
  disc: new THREE.CylinderGeometry(1, 1, 1, 18),
  torus: new THREE.TorusGeometry(1, 0.26, 8, 22),
  thin: new THREE.TorusGeometry(1, 0.1, 6, 22),
  poncho: new THREE.CylinderGeometry(0.45, 1, 1, 16, 1, true),      // falda abierta (ponchos y capitas)
  star: (() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.45 : 1;
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false });
    g.center();
    return g;
  })(),
};

const mats = new Map();
function m(color, emissive = 0x000000) {
  const k = color + '|' + emissive;
  let x = mats.get(k);
  if (!x) { x = new THREE.MeshLambertMaterial({ color, emissive, side: THREE.DoubleSide }); mats.set(k, x); }
  return x;
}
function p(geo, material, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
  const o = new THREE.Mesh(geo, material);
  o.position.set(x, y, z);
  o.scale.set(sx, sy, sz);
  o.rotation.set(rx, ry, rz);
  o.castShadow = true;
  return o;
}
/* Capita corta sobre los hombros (no estorba a la cola). */
const cape = (color, len = 0.15) => p(GEO.poncho, m(color), 0, 0.2 - len / 2, 0.0, 0.215, len, 0.225);

/* Colores de Pip sin traje (los mismos de pip.js). */
const BASE = {
  fur: '#cf7a3e', fur2: '#e59a5c', furDark: '#a95e2c', cream: '#fbe6cf', paw: '#8c4e2a',
  scarf: '#6cc9b2', scarf2: '#4fae98', tailTip: '#ffe9d2', gold: '#ffd36e',
};

const O = (id, name, price, desc, o) => Object.assign({ id, name, price, desc, colors: null, hideScarf: false, build: null }, o);

export const OUTFIT_LIST = [
  O('coral', 'Bufanda Coral', 60, 'La bufanda de las campanas, con un lacito a juego.', {
    colors: { scarf: '#ef8f86', scarf2: '#d9706b' },
    build(add) {
      for (const s of [-1, 1]) add('ear0', p(GEO.ball, m('#ef8f86'), s * 0.028, 0.012, 0.03, 0.03, 0.022, 0.014, 0, 0, s * 0.5));
      add('ear0', p(GEO.ball, m('#d9706b'), 0, 0.012, 0.036, 0.014));
    },
  }),
  O('bellota', 'Gorro de Bellota', 120, 'El sombrero de una bellota gigante. Abriga las orejas.', {
    build(add) {
      add('head', p(GEO.half, m('#8a5a34'), 0, 0.075, -0.005, 0.158, 0.105, 0.155));
      add('head', p(GEO.torus, m('#a9713f'), 0, 0.08, -0.005, 0.15, 0.15, 0.09, Math.PI / 2));
      add('head', p(GEO.disc, m('#6e4526'), 0.01, 0.2, -0.005, 0.016, 0.06, 0.016, 0, 0, -0.25));
    },
  }),
  O('flores', 'Corona de Flores', 200, 'Flores del Jardín de Coral trenzadas con hojas tiernas.', {
    colors: { scarf: '#9fd38a', scarf2: '#7fbd6c' },
    build(add) {
      const petals = ['#ffb3c1', '#fff1a8', '#ffffff', '#ffc9a8', '#d9c3ff', '#ffb3c1', '#fff1a8'];
      add('head', p(GEO.thin, m('#7fbd6c'), 0, 0.105, -0.01, 0.125, 0.125, 0.125, Math.PI / 2));
      petals.forEach((c, i) => {
        const a = (i / petals.length) * Math.PI * 2 + 0.4;
        const x = Math.sin(a) * 0.125, z = Math.cos(a) * 0.125 - 0.01;
        add('head', p(GEO.ball, m(c), x, 0.115, z, 0.034, 0.026, 0.034));
        add('head', p(GEO.ball, m('#f2c46c'), x * 1.08, 0.127, (z + 0.01) * 1.08 - 0.01, 0.013));
      });
    },
  }),
  O('exploradora', 'Capa de Exploradora', 300, 'Sombrero de ala ancha y capa para los días de viento.', {
    build(add) {
      add('head', p(GEO.disc, m('#d9b98a'), 0, 0.1, -0.005, 0.225, 0.012, 0.225));
      add('head', p(GEO.half, m('#d9b98a'), 0, 0.1, -0.005, 0.125, 0.095, 0.125));
      add('head', p(GEO.torus, m('#5aa999'), 0, 0.118, -0.005, 0.122, 0.122, 0.06, Math.PI / 2));
      add('torso', cape('#5aa999', 0.17));
    },
  }),
  O('aviadora', 'Gafas de Aviadora', 400, 'Gorro de cuero y gafas para volar entre las islas.', {
    colors: { scarf: '#fff4e2', scarf2: '#ecd9bd' },
    build(add) {
      add('head', p(GEO.half, m('#8b5a3c'), 0, 0.03, -0.012, 0.162, 0.135, 0.16));
      for (const s of [-1, 1]) add('head', p(GEO.ball, m('#8b5a3c'), s * 0.13, -0.03, -0.01, 0.045, 0.075, 0.06));
      add('head', p(GEO.thin, m('#5d3a26'), 0, 0.085, 0.01, 0.15, 0.15, 0.2, Math.PI / 2 - 0.25));
      for (const s of [-1, 1]) {
        add('head', p(GEO.torus, m('#f2c46c'), s * 0.055, 0.105, 0.118, 0.04, 0.04, 0.04, -0.35));
        add('head', p(GEO.disc, m('#bfe6ff', 0x24506a), s * 0.055, 0.105, 0.118, 0.034, 0.008, 0.034, Math.PI / 2 - 0.35));
      }
    },
  }),
  O('poncho', 'Poncho de Lavanda', 520, 'Tejido en el Puente de Lavanda, con franjas de cristal.', {
    hideScarf: true,
    build(add) {
      add('torso', p(GEO.poncho, m('#a996d8'), 0, 0.08, 0.0, 0.25, 0.23, 0.26));
      add('torso', p(GEO.thin, m('#f8f4ff'), 0, 0.045, 0.0, 0.205, 0.213, 0.2, Math.PI / 2));
      add('torso', p(GEO.thin, m('#7f69c4'), 0, -0.02, 0.0, 0.243, 0.253, 0.2, Math.PI / 2));
      add('torso', p(GEO.torus, m('#f8f4ff'), 0, 0.19, 0.005, 0.1, 0.105, 0.12, Math.PI / 2));
      add('ear1', p(GEO.ball, m('#d9c3ff'), 0, 0.01, 0.03, 0.03, 0.03, 0.016));
      add('ear1', p(GEO.ball, m('#f2c46c'), 0, 0.01, 0.042, 0.012));
    },
  }),
  O('hojalata', 'Armadura de Hojalata', 650, 'Hecha con latas viejas. No protege, ¡pero impone!', {
    hideScarf: true,
    build(add) {
      const steel = m('#b9c6d6', 0x1c2430), dark = m('#8796ab', 0x141a22);
      add('head', p(GEO.half, steel, 0, 0.045, -0.008, 0.165, 0.125, 0.162));
      add('head', p(GEO.thin, dark, 0, 0.05, -0.008, 0.162, 0.162, 0.2, Math.PI / 2));
      add('head', p(GEO.cone, m('#ef8f86'), 0, 0.215, -0.02, 0.028, 0.12, 0.06));
      add('head', p(GEO.ball, m('#ef8f86'), 0, 0.2, -0.07, 0.03, 0.06, 0.05));
      add('torso', p(GEO.ball, steel, 0, 0.07, 0.03, 0.135, 0.115, 0.14));
      add('torso', p(GEO.star, m('#ffd36e', 0x7a5410), 0, 0.085, 0.172, 0.035, 0.035, 0.03));
      for (const s of [-1, 1]) add('torso', p(GEO.ball, dark, s * 0.125, 0.115, 0.05, 0.05, 0.04, 0.05));
    },
  }),
  O('maga', 'Sombrero de Maga', 800, 'Sombrero puntiagudo y capa: los poderes brillan más bonito.', {
    colors: { scarf: '#f2c46c', scarf2: '#d9a94e' },
    build(add) {
      const v = m('#6b54b0'), v2 = m('#52408f');
      add('head', p(GEO.disc, v2, 0, 0.1, -0.005, 0.22, 0.012, 0.22));
      add('head', p(GEO.cone, v, 0.0, 0.24, -0.02, 0.118, 0.28, 0.118, -0.12));
      add('head', p(GEO.ball, v, 0.0, 0.385, -0.05, 0.03));
      add('head', p(GEO.torus, m('#f2c46c', 0x5a3c08), 0, 0.118, -0.007, 0.112, 0.112, 0.06, Math.PI / 2));
      add('head', p(GEO.star, m('#ffe08a', 0x8a6410), 0, 0.2, 0.086, 0.04, 0.04, 0.03, -0.12));
      add('torso', cape('#6b54b0', 0.18));
    },
  }),
  O('noche', 'Sombra de Medianoche', 1000, 'Pelaje de noche cerrada y una cinta que deja estela.', {
    colors: { fur: '#4a4470', fur2: '#6c66a8', furDark: '#2f2d55', cream: '#dcd6f4', paw: '#2f2d55', tailTip: '#bdb6ff', scarf: '#f2c46c', scarf2: '#d9a94e' },
    build(add) {
      add('head', p(GEO.thin, m('#8d77c8', 0x2a1f55), 0, 0.07, -0.005, 0.152, 0.152, 0.26, Math.PI / 2 - 0.1));
      for (const s of [0, 1]) add('head', p(GEO.ball, m('#8d77c8', 0x2a1f55), -0.03 + s * 0.06, 0.03 - s * 0.03, -0.185 - s * 0.03, 0.022, 0.075, 0.01, 0.5, 0, 0.3 - s * 0.6));
      add('torso', p(GEO.ball, m('#e9e2ff', 0x7d6ad0), -0.06, 0.15, 0.12, 0.02));
    },
  }),
  O('nova', 'Traje de Nova', 1500, 'Tejido con luz de estrella. Dicen que la propia Nova lo bordó.', {
    colors: { fur: '#f0c66a', fur2: '#ffe7a6', furDark: '#d39f44', cream: '#fffaf0', paw: '#c98f3a', tailTip: '#ffffff', scarf: '#ffffff', scarf2: '#ffe9b0' },
    build(add) {
      const glow = m('#fff3c0', 0xb8902a);
      add('head', p(GEO.thin, glow, 0, 0.27, -0.01, 0.1, 0.1, 0.1, Math.PI / 2 + 0.15));
      add('head', p(GEO.star, glow, 0, 0.075, 0.14, 0.036, 0.036, 0.03, -0.3));
      add('torso', cape('#fff6dc', 0.16));
      add('tail7', p(GEO.star, glow, 0, 0.11, 0, 0.055, 0.055, 0.05));
    },
  }),
];
export const OUTFITS = Object.fromEntries(OUTFIT_LIST.map(o => [o.id, o]));

/* Viste al modelo de Pip con un traje (o lo deja sin traje si id es nulo). */
export function applyOutfit(model, id) {
  const u = model.userData;
  for (const o of u.outfitParts || []) if (o.parent) o.parent.remove(o);
  u.outfitParts = [];
  for (const k in BASE) u.M[k].color.set(BASE[k]);
  u.scarf.visible = true;
  u.outfit = null;
  const def = OUTFITS[id];
  if (!def) return;
  u.outfit = id;
  if (def.colors) for (const k in def.colors) if (u.M[k]) u.M[k].color.set(def.colors[k]);
  if (def.hideScarf) u.scarf.visible = false;
  const where = { head: u.head, torso: u.torso, ear0: u.ears[0], ear1: u.ears[1], tail7: u.tail[7] };
  if (def.build) def.build((slot, mesh) => { (where[slot] || u.torso).add(mesh); u.outfitParts.push(mesh); });
}
