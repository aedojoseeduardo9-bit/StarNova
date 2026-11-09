/* Star Nova — modelos geométricos de los 16 enemigos (y el aura de los élite). Mira hacia +z, pies en y=0. */
import * as THREE from 'three';
import { mat, GEO, part, makeSombra, makeFarol, makeTotem } from './models.js';

const BELL = (() => {
  const pts = [[0, 0.9], [0.18, 0.88], [0.3, 0.75], [0.36, 0.45], [0.45, 0.15], [0.62, 0.02], [0.64, -0.04], [0, -0.04]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 10);
})();

function eye(parent, x, y, z, s = 1) {
  const e = new THREE.Group();
  e.position.set(x, y, z);
  e.add(part(GEO.ico(1), mat('#fff6d8', { emissive: 0x8a7a40 }), 0, 0, 0, 0.12 * s, 0.12 * s, 0.04 * s));
  e.add(part(GEO.ico(1), mat('#2b2350', { flat: false }), 0, 0, 0.03 * s, 0.055 * s, 0.055 * s, 0.03 * s));
  parent.add(e);
  return e;
}

function shell(build) {
  const root = new THREE.Group();
  const inner = new THREE.Group();
  root.add(inner);
  root.userData = { inner, spin: [] };
  build(inner, root.userData);
  return root;
}

const BUILDERS = {
  cube: (d) => makeSombra(1, d.colors),
  orb: () => makeFarol(),
  totem: () => makeTotem(),
  mini: (d) => makeSombra(0.55, d.colors),
  spiky: (d) => shell((g, u) => {
    const ball = new THREE.Group();
    ball.position.y = 0.42;
    ball.add(part(GEO.ico(1), mat(d.colors[0]), 0, 0, 0, 0.36));
    const v = new THREE.IcosahedronGeometry(0.36, 0).attributes.position;
    const seen = new Set();
    for (let i = 0; i < v.count; i++) {
      const p = new THREE.Vector3().fromBufferAttribute(v, i);
      const k = p.toArray().map(n => n.toFixed(2)).join();
      if (seen.has(k)) continue; seen.add(k);
      const c = part(GEO.cone(4), mat(d.colors[2]), p.x * 1.15, p.y * 1.15, p.z * 1.15, 0.08, 0.26, 0.08);
      c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().normalize());
      ball.add(c);
    }
    eye(ball, 0, 0.05, 0.34, 0.9);
    g.add(ball);
    u.roll = ball;
  }),
  pyramid: (d) => shell((g, u) => {
    g.add(part(GEO.cone(4), mat(d.colors[0]), 0, 0.5, 0, 0.55, 1.0, 0.55));
    g.children[0].rotation.y = Math.PI / 4;
    const ring = part(GEO.torus(), mat(d.colors[2]), 0, 0.35, 0, 0.5, 0.5, 0.25);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    const e = eye(g, 0, 0.55, 0.27, 1.1);
    u.eye = e; u.spin.push(ring);
  }),
  bomb: (d) => shell((g, u) => {
    g.add(part(GEO.ico(2), mat(d.colors[0]), 0, 0.36, 0, 0.36));
    g.add(part(GEO.cyl(6), mat('#6f5a4a'), 0, 0.78, 0, 0.04, 0.16, 0.04));
    const spark = part(GEO.ico(1), mat('#ffe08a', { emissive: 0xffa040 }), 0, 0.9, 0, 0.07);
    g.add(spark);
    eye(g, 0, 0.4, 0.34);
    u.spark = spark;
  }),
  jelly: (d) => shell((g, u) => {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(d.colors[0], { transparent: true, opacity: 0.75 }));
    body.castShadow = true;
    g.add(body);
    g.add(part(GEO.ico(1), mat(d.colors[2], { emissive: 0x1a5a4a }), 0, 0.18, 0, 0.16));
    eye(g, -0.14, 0.26, 0.4, 0.8); eye(g, 0.14, 0.26, 0.4, 0.8);
    u.squish = true;
  }),
  lotus: (d) => shell((g, u) => {
    const flower = new THREE.Group();
    flower.position.y = 0.5;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const p = part(GEO.ico(1), mat(i % 2 ? d.colors[0] : d.colors[1]), Math.cos(a) * 0.26, 0.05, Math.sin(a) * 0.26, 0.2, 0.06, 0.12);
      p.rotation.y = -a; p.rotation.z = 0.5;
      flower.add(p);
    }
    flower.add(part(GEO.ico(1), mat('#fff3c8', { emissive: 0x907040 }), 0, 0.12, 0, 0.14));
    g.add(flower);
    eye(flower, 0, 0.14, 0.12, 0.7);
    u.spin.push(flower);
  }),
  slab: (d) => shell((g, u) => {
    g.add(part(GEO.box(), mat(d.colors[0]), 0, 0.75, -0.05, 0.9, 1.5, 0.55));
    const sh = part(GEO.box(), mat(d.colors[1]), 0, 0.72, 0.3, 1.05, 1.25, 0.12);
    g.add(sh);
    g.add(part(GEO.oct(), mat(d.colors[2], { emissive: 0x202060 }), 0, 0.85, 0.38, 0.16, 0.24, 0.05));
    const slit = mat('#ffe2a0', { emissive: 0xb07a20 });
    g.add(part(GEO.box(), slit, -0.18, 1.32, 0.24, 0.14, 0.05, 0.02));
    g.add(part(GEO.box(), slit, 0.18, 1.32, 0.24, 0.14, 0.05, 0.02));
    u.shield = sh;
  }),
  moth: (d) => shell((g, u) => {
    g.add(part(GEO.ico(1), mat(d.colors[2]), 0, 0, 0, 0.13, 0.13, 0.28));
    const wings = [];
    for (const s of [-1, 1]) {
      const w = new THREE.Group();
      w.position.set(s * 0.08, 0.04, 0);
      w.add(part(GEO.ico(1), mat(d.colors[0], { transparent: true, opacity: 0.85 }), s * 0.32, 0, 0, 0.34, 0.03, 0.26));
      w.add(part(GEO.ico(1), mat('#c8b8ff', { emissive: 0x302060 }), s * 0.36, 0.02, 0.02, 0.09, 0.02, 0.09));
      g.add(w); wings.push(w);
    }
    eye(g, -0.06, 0.06, 0.24, 0.6); eye(g, 0.06, 0.06, 0.24, 0.6);
    u.wings = wings;
  }),
  darkbell: (d) => shell((g, u) => {
    const b = new THREE.Mesh(BELL, mat(d.colors[0]));
    b.castShadow = true;
    g.add(b);
    g.add(part(GEO.ico(1), mat(d.colors[2], { emissive: 0x6a4a10 }), 0, 0.05, 0, 0.14));
    eye(g, 0, 0.55, 0.36, 1.1);
    u.swing = b;
  }),
  needle: (d) => shell((g, u) => {
    g.add(part(GEO.cone(6), mat(d.colors[0]), 0, 0.1, 0, 0.18, 1.1, 0.18));
    g.children[0].rotation.x = Math.PI;
    const ring = part(GEO.torus(), mat(d.colors[2], { emissive: 0x2a2060 }), 0, 0.45, 0, 0.3, 0.3, 0.2);
    g.add(ring);
    eye(g, 0, 0.5, 0.17, 0.9);
    u.spin.push(ring);
  }),
  mole: (d) => shell((g, u) => {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(d.colors[2])));
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3;
      const c = part(GEO.oct(), mat(d.colors[0], { emissive: 0x203a5a }), Math.cos(a) * 0.2, 0.42 + (i % 2) * 0.05, Math.sin(a) * 0.2 - 0.05, 0.1, 0.24, 0.1);
      c.rotation.z = (i - 2) * 0.25;
      g.add(c);
    }
    g.add(part(GEO.ico(1), mat('#ffb3c7'), 0, 0.2, 0.47, 0.08));
    eye(g, -0.15, 0.32, 0.38, 0.7); eye(g, 0.15, 0.32, 0.38, 0.7);
  }),
  twister: (d) => shell((g, u) => {
    for (let i = 0; i < 3; i++) {
      const c = part(GEO.cone(7), mat(d.colors[i], { transparent: true, opacity: 0.85 }), 0, 0.35 + i * 0.32, 0, 0.25 + i * 0.16, 0.5, 0.25 + i * 0.16);
      c.rotation.x = Math.PI;
      g.add(c); u.spin.push(c);
    }
    eye(g, 0, 0.95, 0.42, 1);
  }),
  golem: (d) => shell((g, u) => {
    const c = d.colors;
    for (const s of [-1, 1]) {
      g.add(part(GEO.box(), mat(c[0]), s * 0.45, 0.45, 0, 0.42, 0.9, 0.5));
    }
    g.add(part(GEO.box(), mat(c[1]), 0, 1.15, 0, 1.5, 0.6, 0.8));
    g.add(part(GEO.box(), mat(c[0]), 0, 1.7, 0, 1.1, 0.55, 0.7));
    const arms = [];
    for (const s of [-1, 1]) {
      const a = new THREE.Group();
      a.position.set(s * 0.95, 1.55, 0);
      a.add(part(GEO.box(), mat(c[2]), 0, -0.4, 0, 0.35, 0.95, 0.35));
      g.add(a); arms.push(a);
    }
    g.add(part(GEO.box(), mat(c[1]), 0, 2.15, 0.05, 0.6, 0.45, 0.55));
    eye(g, 0, 2.18, 0.34, 1.3);
    g.add(part(GEO.oct(), mat('#f2c46c', { emissive: 0x6b4a10 }), 0, 1.2, 0.42, 0.2, 0.28, 0.05));
    u.arms = arms;
  }),
};

export function makeEnemyModel(def, elite) {
  const root = (BUILDERS[def.model] || BUILDERS.cube)(def);
  root.userData.spin = root.userData.spin || [];
  if (elite) {
    const halo = part(GEO.torus(), mat(elite.color, { basic: true, transparent: true, opacity: 0.8, depthWrite: false }), 0, def.h * 0.55, 0, def.r * 1.6, def.r * 1.6, 0.25);
    halo.rotation.x = Math.PI / 2;
    halo.castShadow = false;
    root.add(halo);
    root.userData.halo = halo;
    root.userData.eliteScale = 1.22;
  }
  return root;
}
