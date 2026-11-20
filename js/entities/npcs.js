/* Star Nova — PNJ (con quien hablar y comprar) y el Cohete Avellana. Modelos hechos con primitivas.
 * Los datos de cada PNJ (nombre, diálogos, tienda) están en js/content/npcs.js. */
import * as THREE from 'three';
import { R, G, ALL, groups } from '../physics.js';
import { mat, GEO, part } from './models.js';
import { NPCS } from '../content/npcs.js';

const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const eyes = (g, y, z, sep, s = 0.05) => {
  const out = [];
  for (const k of [-1, 1]) {
    const e = part(GEO.ico(1), mat('#2a1a22', { flat: false }), k * sep, y, z, s, s * 1.2, s * 0.6);
    g.add(e); out.push(e);
    g.add(part(GEO.ico(0), mat('#ffffff', { flat: false }), k * sep - k * s * 0.3, y + s * 0.4, z + s * 0.5, s * 0.35));
  }
  return out;
};

/* ---------- modelos de los PNJ (miran hacia +z, pies en y = 0) ---------- */
function topo() {
  const g = new THREE.Group(), body = mat('#6a5048'), light = mat('#c8a090');
  g.add(part(GEO.ico(2), body, 0, 0.45, 0, 0.42, 0.45, 0.4));
  g.add(part(GEO.ico(2), light, 0, 0.4, 0.22, 0.28, 0.3, 0.2));
  const head = new THREE.Group(); head.position.set(0, 0.95, 0.05); g.add(head);
  head.add(part(GEO.ico(2), body, 0, 0, 0, 0.3, 0.27, 0.3));
  head.add(part(GEO.ico(1), mat('#f29aa0'), 0, -0.03, 0.31, 0.08, 0.07, 0.07));         // nariz
  head.add(part(GEO.half ? GEO.half() : GEO.ico(1), mat('#f2c46c'), 0, 0.16, 0, 0.32, 0.18, 0.32)); // casco
  for (const k of [-1, 1]) {                                                              // gafas de mecánico
    const r = part(GEO.torus(), mat('#8a6a3a'), k * 0.12, 0.06, 0.24, 0.08, 0.08, 0.08); head.add(r);
    head.add(part(GEO.cyl(10), mat('#bfe6ff', { emissive: 0x204050 }), k * 0.12, 0.06, 0.25, 0.07, 0.02, 0.07));
    head.children[head.children.length - 1].rotation.x = Math.PI / 2;
  }
  for (const k of [-1, 1]) g.add(part(GEO.ico(1), mat('#f0b0a8'), k * 0.36, 0.35, 0.2, 0.12, 0.08, 0.14)); // manos
  g.add(part(GEO.box(), mat('#7fa0c8'), 0, 0.5, 0.36, 0.34, 0.3, 0.05));                // peto
  const wrench = part(GEO.box(), mat('#b8bcc8'), 0.42, 0.42, 0.28, 0.05, 0.38, 0.05); wrench.rotation.z = 0.5; g.add(wrench);
  g.userData.head = head;
  return g;
}
function erizo(c) {
  const g = new THREE.Group(), body = mat(c.body), spike = mat(c.spikes);
  g.add(part(GEO.ico(2), body, 0, 0.42, 0, 0.42, 0.4, 0.4));
  g.add(part(GEO.ico(2), mat('#f6e2cc'), 0, 0.42, 0.26, 0.26, 0.26, 0.16));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 1.6 - Math.PI * 0.8, row = i % 2;
    const sp = part(GEO.cone(4), spike, Math.sin(a) * 0.36, 0.55 + row * 0.12, -Math.cos(a) * 0.3 - 0.05, 0.08, 0.3, 0.08);
    sp.rotation.x = -0.9; sp.rotation.z = -Math.sin(a) * 0.8; g.add(sp);
  }
  const head = new THREE.Group(); head.position.set(0, 0.8, 0.18); g.add(head);
  head.add(part(GEO.ico(2), mat('#f6e2cc'), 0, 0, 0, 0.22, 0.2, 0.22));
  head.add(part(GEO.cone(6), mat('#f6e2cc'), 0, -0.02, 0.24, 0.08, 0.16, 0.08));
  head.children[1].rotation.x = Math.PI / 2;
  head.add(part(GEO.ico(1), mat('#2a1a22'), 0, -0.02, 0.33, 0.04));
  eyes(head, 0.05, 0.17, 0.09, 0.04);
  for (const k of [-1, 1]) head.add(part(GEO.ico(1), mat(c.extra), k * 0.15, 0.17, 0, 0.06, 0.07, 0.04));  // orejitas
  head.add(part(GEO.torus(), mat(c.extra), 0, 0.2, 0, 0.16, 0.16, 0.16));                  // pañuelo / corona
  head.children[head.children.length - 1].rotation.x = Math.PI / 2;
  g.add(part(GEO.ico(1), mat(c.extra), 0.38, 0.25, 0.25, 0.14));                           // ovillo / fruto
  g.userData.head = head;
  return g;
}
function tortuga() {
  const g = new THREE.Group(), skin = mat('#a8c88a');
  const shell = part(GEO.ico(2), mat('#6f9a5a'), 0, 0.55, -0.05, 0.55, 0.42, 0.62); g.add(shell);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    g.add(part(GEO.ico(0), mat('#8ab86a'), Math.cos(a) * 0.32, 0.82, Math.sin(a) * 0.36 - 0.05, 0.14, 0.06, 0.14));
  }
  g.add(part(GEO.cyl(10), mat('#d8c890'), 0, 0.32, -0.05, 0.56, 0.1, 0.62));
  for (const [x, z] of [[-0.35, 0.3], [0.35, 0.3], [-0.35, -0.38], [0.35, -0.38]]) g.add(part(GEO.cyl(6), skin, x, 0.14, z, 0.11, 0.28, 0.11));
  const head = new THREE.Group(); head.position.set(0, 0.75, 0.62); g.add(head);
  head.add(part(GEO.ico(2), skin, 0, 0, 0, 0.2, 0.18, 0.22));
  eyes(head, 0.05, 0.17, 0.08, 0.035);
  for (const k of [-1, 1]) {                                                               // lentes
    const r = part(GEO.torus(), mat('#d8b860'), k * 0.08, 0.05, 0.21, 0.055, 0.055, 0.05); head.add(r);
  }
  head.add(part(GEO.cone(6), mat('#f4f0e6'), 0, -0.2, 0.12, 0.09, 0.22, 0.06));          // barba
  head.children[head.children.length - 1].rotation.x = Math.PI;
  const stick = part(GEO.cyl(5), mat('#8a6a4a'), 0.5, 0.5, 0.45, 0.035, 1.0, 0.035); g.add(stick);
  g.add(part(GEO.ico(1), mat('#7fbf6a'), 0.5, 1.03, 0.45, 0.1));
  g.userData.head = head;
  return g;
}
function ciervo() {
  const g = new THREE.Group(), fur = mat('#c88a5a'), light = mat('#f4e2c8');
  g.add(part(GEO.ico(2), fur, 0, 0.62, 0, 0.26, 0.24, 0.42));
  for (const [x, z] of [[-0.14, 0.26], [0.14, 0.26], [-0.14, -0.26], [0.14, -0.26]]) g.add(part(GEO.cyl(6), fur, x, 0.25, z, 0.05, 0.5, 0.05));
  for (let i = 0; i < 5; i++) g.add(part(GEO.ico(0), light, (Math.random() - 0.5) * 0.3, 0.8, (Math.random() - 0.5) * 0.5, 0.04));
  const head = new THREE.Group(); head.position.set(0, 0.98, 0.36); g.add(head);
  head.add(part(GEO.ico(2), fur, 0, 0, 0, 0.17, 0.16, 0.2));
  head.add(part(GEO.ico(1), light, 0, -0.05, 0.15, 0.09, 0.08, 0.1));
  head.add(part(GEO.ico(1), mat('#2a1a22'), 0, -0.03, 0.24, 0.035));
  eyes(head, 0.05, 0.13, 0.08, 0.04);
  for (const k of [-1, 1]) {
    const ear = part(GEO.cone(4), fur, k * 0.15, 0.12, -0.02, 0.06, 0.18, 0.03); ear.rotation.z = -k * 1.0; head.add(ear);
    const ant = part(GEO.cone(5), mat('#e8d8b8'), k * 0.07, 0.2, -0.02, 0.025, 0.12, 0.025); head.add(ant);
  }
  g.add(part(GEO.ico(1), light, 0, 0.72, -0.42, 0.07));
  g.userData.head = head;
  return g;
}
function pulpo() {
  const g = new THREE.Group(), chrome = mat('#c8d0e8', { emissive: 0x303850 });
  const head = new THREE.Group(); head.position.set(0, 0.95, 0); g.add(head);
  head.add(part(GEO.ico(2), chrome, 0, 0, 0, 0.42, 0.48, 0.42));
  eyes(head, 0.02, 0.36, 0.14, 0.07);
  head.add(part(GEO.cyl(10), mat('#5a4a8a'), 0, 0.44, 0, 0.22, 0.3, 0.22));             // sombrero de copa
  head.add(part(GEO.cyl(12), mat('#5a4a8a'), 0, 0.3, 0, 0.34, 0.04, 0.34));
  head.add(part(GEO.cyl(10), mat('#ff9ad8', { emissive: 0x602040 }), 0, 0.36, 0, 0.225, 0.06, 0.225));
  const arms = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const arm = new THREE.Group(); arm.position.set(Math.cos(a) * 0.25, 0.6, Math.sin(a) * 0.25); arm.rotation.y = -a;
    for (let j = 0; j < 4; j++) arm.add(part(GEO.ico(1), mat(j % 2 ? '#d8e0f4' : '#b8c4e0', { emissive: 0x202840 }), 0.12 + j * 0.13, -0.15 - j * 0.1, 0, 0.09 - j * 0.015));
    g.add(arm); arms.push(arm);
  }
  g.userData.head = head; g.userData.arms = arms;
  return g;
}
function espiritu() {
  const g = new THREE.Group();
  const glow = mat('#e8f0ff', { emissive: 0x8090c0, transparent: true, opacity: 0.85 });
  const head = new THREE.Group(); head.position.set(0, 1.0, 0); g.add(head);
  head.add(part(GEO.ico(2), glow, 0, 0, 0, 0.32));
  eyes(head, 0.04, 0.27, 0.1, 0.05);
  const tail = part(GEO.cone(8), glow, 0, -0.45, 0, 0.28, 0.6, 0.28); tail.rotation.x = Math.PI; g.add(tail); tail.position.y = 0.55;
  const ring = part(GEO.torus(), mat('#ffd8ff', { emissive: 0x806080 }), 0, 0, 0, 0.42, 0.42, 0.1); ring.rotation.x = Math.PI / 2; head.add(ring);
  g.userData.head = head; g.userData.float = true;
  return g;
}
function zorra() {
  const g = new THREE.Group(), fur = mat('#ef8a4a'), white = mat('#fff4e8');
  g.add(part(GEO.ico(2), mat('#e8eef8'), 0, 0.5, 0, 0.3, 0.38, 0.28));                   // traje
  g.add(part(GEO.box(), mat('#7f8ac8'), 0, 0.55, -0.3, 0.36, 0.42, 0.16));               // mochila
  for (const k of [-1, 1]) g.add(part(GEO.cyl(6), mat('#e8eef8'), k * 0.13, 0.15, 0, 0.08, 0.3, 0.08));
  const head = new THREE.Group(); head.position.set(0, 1.02, 0.02); g.add(head);
  head.add(part(GEO.ico(2), fur, 0, 0, 0, 0.22, 0.2, 0.22));
  head.add(part(GEO.cone(6), white, 0, -0.04, 0.2, 0.09, 0.18, 0.09)); head.children[1].rotation.x = Math.PI / 2;
  head.add(part(GEO.ico(1), mat('#2a1a22'), 0, -0.04, 0.3, 0.035));
  eyes(head, 0.05, 0.17, 0.09, 0.04);
  for (const k of [-1, 1]) { const e = part(GEO.cone(4), fur, k * 0.13, 0.2, 0, 0.08, 0.2, 0.05); e.rotation.z = -k * 0.3; head.add(e); }
  head.add(part(GEO.ico(2), mat('#cfe8ff', { transparent: true, opacity: 0.3 }), 0, 0.02, 0, 0.36));   // casco burbuja
  const tail = part(GEO.ico(2), fur, 0, 0.35, -0.42, 0.14, 0.14, 0.32); tail.rotation.x = 0.6; g.add(tail);
  g.add(part(GEO.ico(1), white, 0, 0.32, -0.7, 0.09));
  g.userData.head = head;
  return g;
}
export function makeNpcModel(def) {
  switch (def.kind) {
    case 'topo': return topo();
    case 'erizo': return erizo(def.colors || { body: '#c9a58a', spikes: '#8a6a5a', extra: '#ef9a8f' });
    case 'tortuga': return tortuga();
    case 'ciervo': return ciervo();
    case 'pulpo': return pulpo();
    case 'espiritu': return espiritu();
    case 'zorra': return zorra();
    default: return topo();
  }
}

/* PNJ en el mundo: mira a Pip cuando se acerca, respira y muestra un rombito encima (dorado si vende). */
export class NPC {
  constructor(game, spot) {
    this.game = game;
    this.id = spot.id;
    this.def = NPCS[spot.id];
    this.p = v3(spot.pos);
    this.mesh = makeNpcModel(this.def);
    this.mesh.position.copy(this.p);
    this.mesh.rotation.y = spot.ry || 0;
    this.baseYaw = spot.ry || 0;
    this.mesh.scale.setScalar(spot.scale || 1.15);
    game.scene.add(this.mesh);
    const c = game.phys.world.createCollider(R.ColliderDesc.cylinder(0.5, 0.35).setTranslation(this.p.x, this.p.y + 0.5, this.p.z).setCollisionGroups(groups(G.PROP, ALL)), game.phys.fixed);
    game.phys.own(c, { kind: 'npc' });
    this.mark = part(GEO.oct(), mat(this.def.shop ? '#ffd36e' : '#bfe6ff', { emissive: this.def.shop ? 0x8a6010 : 0x305070 }), 0, 0, 0, 0.12, 0.2, 0.12);
    this.mark.castShadow = false;
    game.scene.add(this.mark);
    this.t0 = Math.random() * 10;
  }
  update(dt, t) {
    const pl = this.game.player.pos, u = this.mesh.userData;
    const near = pl.distanceTo(this.p) < 6;
    const want = near ? Math.atan2(pl.x - this.p.x, pl.z - this.p.z) : this.baseYaw;
    let d = want - this.mesh.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.mesh.rotation.y += d * Math.min(1, dt * 3);
    const tt = t + this.t0;
    this.mesh.position.y = this.p.y + (u.float ? 0.25 + Math.sin(tt * 2) * 0.12 : Math.abs(Math.sin(tt * 1.6)) * 0.02);
    if (u.head) u.head.rotation.z = Math.sin(tt * 0.9) * 0.08;
    if (u.arms) u.arms.forEach((a, i) => { a.rotation.z = Math.sin(tt * 2 + i) * 0.3; });
    this.mark.position.set(this.p.x, this.p.y + 1.9 + Math.sin(tt * 2.5) * 0.08, this.p.z);
    this.mark.rotation.y = tt * 2;
  }
}

/* ---------- Cohete Avellana: con forma de bellota, para viajar entre galaxias ---------- */
export function makeRocket() {
  const g = new THREE.Group();
  const nut = mat('#c98a4b'), nut2 = mat('#b0743c'), cap = mat('#7a5232'), cream = mat('#fff4e6');
  g.add(part(GEO.ico(2), nut, 0, 1.75, 0, 1.15, 1.55, 1.15));                              // cuerpo (la avellana)
  for (let i = 0; i < 6; i++) {                                                             // vetas
    const a = (i / 6) * Math.PI * 2;
    g.add(part(GEO.box(), nut2, Math.cos(a) * 1.08, 1.6, Math.sin(a) * 1.08, 0.08, 1.9, 0.08));
    g.children[g.children.length - 1].rotation.y = -a;
  }
  const capG = new THREE.Group(); capG.position.y = 2.9; g.add(capG);                      // capuchón
  capG.add(part(GEO.ico(1), cap, 0, 0.1, 0, 1.25, 0.65, 1.25));
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2, r = i % 2 ? 0.75 : 1.05;
    capG.add(part(GEO.ico(0), mat('#8a6040'), Math.cos(a) * r, 0.25 + (i % 2) * 0.22, Math.sin(a) * r, 0.18));
  }
  capG.add(part(GEO.cyl(6), mat('#6a4428'), 0, 0.85, 0, 0.12, 0.6, 0.12));                 // rabito
  capG.add(part(GEO.ico(1), mat('#7fbf6a'), 0.25, 1.1, 0, 0.22, 0.08, 0.14));               // hojita
  const win = new THREE.Group(); win.position.set(0, 1.95, 1.08); g.add(win);               // ventanilla
  win.add(part(GEO.torus(), mat('#f2c46c', { emissive: 0x5a3c08 }), 0, 0, 0, 0.42, 0.42, 0.5));
  win.add(part(GEO.cyl(16), mat('#bfe6ff', { emissive: 0x2a4a60, transparent: true, opacity: 0.75 }), 0, 0, 0, 0.38, 0.05, 0.38));
  win.children[1].rotation.x = Math.PI / 2;
  for (let i = 0; i < 3; i++) {                                                             // aletas
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const fin = part(GEO.box(), mat('#ef9a8f'), Math.cos(a) * 1.15, 0.6, Math.sin(a) * 1.15, 0.12, 1.2, 0.8);
    fin.rotation.y = -a + Math.PI / 2; g.add(fin);
    g.add(part(GEO.cyl(6), cream, Math.cos(a) * 1.5, 0.1, Math.sin(a) * 1.5, 0.12, 0.2, 0.12));   // patas
  }
  g.add(part(GEO.cyl(10), mat('#9a9aa8'), 0, 0.25, 0, 0.55, 0.5, 0.55, 0, 0, 0));           // tobera
  g.children[g.children.length - 1].scale.set(0.55, 0.5, 0.55);
  const flame = new THREE.Group(); flame.position.y = -0.1; g.add(flame);                   // fuego (solo al volar)
  for (const [c, s, e] of [['#ffb26b', 0.55, 0xc05010], ['#ffe08a', 0.36, 0xd0a020], ['#fff6d8', 0.2, 0xe0d0a0]]) {
    const f = part(GEO.cone(8), mat(c, { emissive: e, transparent: true, opacity: 0.9 }), 0, -s * 1.2, 0, s, s * 2.6, s);
    f.rotation.x = Math.PI; f.castShadow = false; flame.add(f);
  }
  flame.visible = false;
  g.userData = { flame, window: win };
  return g;
}

export class Rocket {
  constructor(game, spot) {
    this.game = game;
    this.p = v3(spot.pos);
    this.ry = spot.ry || 0;
    this.mesh = makeRocket();
    this.mesh.position.copy(this.p);
    this.mesh.rotation.y = this.ry;
    game.scene.add(this.mesh);
    this.collider = game.phys.world.createCollider(R.ColliderDesc.cylinder(1.6, 1.2).setTranslation(this.p.x, this.p.y + 1.6, this.p.z).setCollisionGroups(groups(G.PROP, ALL)), game.phys.fixed);
    game.phys.own(this.collider, { kind: 'rocket' });
    // lona que lo tapa mientras Brío lo construye (Islas del Cielo)
    this.tarp = null;
    if (spot.tarp) {
      this.tarp = new THREE.Group();
      this.tarp.add(part(GEO.ico(1), mat('#a9b48a'), 0, 1.3, 0, 1.6, 1.4, 1.6));
      this.tarp.add(part(GEO.cyl(6), mat('#8a7a5a'), 0, 0.15, 0, 1.7, 0.3, 1.7));
      for (let i = 0; i < 4; i++) this.tarp.add(part(GEO.box(), mat('#d8c8a0'), Math.cos(i * 1.57) * 1.2, 0.9, Math.sin(i * 1.57) * 1.2, 0.08, 1.4, 0.08));
      this.tarp.position.copy(this.p);
      game.scene.add(this.tarp);
    }
    this.setReady(!spot.tarp);
  }
  /* Listo para volar (se ve el cohete) o todavía tapado con la lona. */
  setReady(v) {
    this.ready = v;
    this.mesh.visible = v;
    if (this.tarp) this.tarp.visible = !v;
  }
  update(dt, t) {
    if (!this.ready) return;
    const f = this.mesh.userData.flame;
    if (f.visible) f.children.forEach((c, i) => { c.scale.y = 1 + Math.sin(t * (24 + i * 7)) * 0.2; });
  }
}
