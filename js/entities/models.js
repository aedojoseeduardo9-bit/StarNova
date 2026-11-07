/* Star Nova — modelos low-poly hechos con primitivas (sin archivos externos). */
import * as THREE from 'three';

const matCache = new Map();
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  let m = matCache.get(key);
  if (!m) {
    m = o.basic
      ? new THREE.MeshBasicMaterial({ color, transparent: !!o.transparent, opacity: o.opacity ?? 1, fog: o.fog ?? true, depthWrite: o.depthWrite ?? true, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending })
      : new THREE.MeshLambertMaterial({ color, flatShading: o.flat !== false, emissive: o.emissive || 0x000000, emissiveIntensity: o.ei ?? 1, transparent: !!o.transparent, opacity: o.opacity ?? 1 });
    matCache.set(key, m);
  }
  return m;
}

const geoCache = new Map();
function cached(key, make) { let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; }
export const GEO = {
  ico: (d = 1) => cached('ico' + d, () => new THREE.IcosahedronGeometry(1, d)),
  box: () => cached('box', () => new THREE.BoxGeometry(1, 1, 1)),
  cone: (s = 6) => cached('cone' + s, () => new THREE.ConeGeometry(1, 1, s)),
  cyl: (s = 8) => cached('cyl' + s, () => new THREE.CylinderGeometry(1, 1, 1, s)),
  oct: () => cached('oct', () => new THREE.OctahedronGeometry(1, 0)),
  torus: () => cached('torus', () => new THREE.TorusGeometry(1, 0.32, 6, 12)),
};

export function part(geo, material, x, y, z, sx = 1, sy = sx, sz = sx) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  return m;
}

/* Pip, la ardilla diminuta. Mira hacia +z. Pies en y=0. */
export function makeSquirrel() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const fur = mat('#c9773f'), fur2 = mat('#de8f55'), cream = mat('#f8dfc4'), dark = mat('#3a2620', { flat: false }),
    paw = mat('#8f522f'), pink = mat('#f2a6a0'), scarf = mat('#6cc3ad'), gold = mat('#ffd36e', { emissive: 0x6b4a10 });
  body.add(part(GEO.ico(1), fur, 0, 0.21, -0.01, 0.16, 0.15, 0.2));
  body.add(part(GEO.ico(1), cream, 0, 0.2, 0.09, 0.11, 0.12, 0.08));
  const head = new THREE.Group();
  head.position.set(0, 0.38, 0.1);
  body.add(head);
  head.add(part(GEO.ico(1), fur, 0, 0.02, 0, 0.135, 0.125, 0.13));
  head.add(part(GEO.ico(1), cream, 0, -0.02, 0.1, 0.07, 0.06, 0.06));
  head.add(part(GEO.ico(0), dark, 0, 0.01, 0.165, 0.022));
  for (const s of [-1, 1]) {
    head.add(part(GEO.ico(1), dark, s * 0.07, 0.045, 0.1, 0.022, 0.026, 0.018));
    head.add(part(GEO.ico(0), mat('#ffffff', { flat: false }), s * 0.075, 0.055, 0.115, 0.007));
    head.add(part(GEO.ico(1), pink, s * 0.085, -0.025, 0.095, 0.02, 0.014, 0.01));
    const ear = part(GEO.cone(4), fur, s * 0.075, 0.15, -0.01, 0.045, 0.11, 0.03);
    ear.rotation.z = -s * 0.25;
    head.add(ear);
    const tuft = part(GEO.cone(4), fur2, s * 0.085, 0.215, -0.01, 0.02, 0.05, 0.015);
    tuft.rotation.z = -s * 0.35;
    head.add(tuft);
  }
  // bufanda y broche de estrella
  const sc = part(GEO.torus(), scarf, 0, 0.3, 0.05, 0.1, 0.1, 0.1);
  sc.rotation.x = Math.PI / 2 + 0.25;
  body.add(sc);
  const scTail = part(GEO.box(), scarf, 0.05, 0.25, -0.08, 0.05, 0.11, 0.02);
  scTail.rotation.x = 0.5;
  body.add(scTail);
  const pin = part(GEO.oct(), gold, 0.05, 0.3, 0.15, 0.03);
  body.add(pin);
  // patas
  const legs = [];
  for (const [x, z] of [[-0.07, 0.08], [0.07, 0.08], [-0.08, -0.07], [0.08, -0.07]]) {
    const l = part(GEO.ico(0), paw, x, 0.035, z, 0.045, 0.035, 0.055);
    body.add(l); legs.push(l);
  }
  // cola esponjosa: cadena de esferas
  const tail = new THREE.Group();
  tail.position.set(0, 0.17, -0.15);
  body.add(tail);
  const tailParts = [];
  const pts = [[0, 0.02, -0.04, 0.08], [0, 0.12, -0.13, 0.11], [0, 0.27, -0.17, 0.125], [0, 0.41, -0.13, 0.115], [0, 0.5, -0.03, 0.09], [0, 0.52, 0.06, 0.06]];
  pts.forEach(([x, y, z, r], i) => {
    const t = part(GEO.ico(1), i % 2 ? fur2 : fur, x, y, z, r, r, r);
    tail.add(t); tailParts.push(t);
  });
  root.userData = { body, head, tail, legs, scTail, pin, tailParts };
  return root;
}

/* Sombra: cubo geométrico con un ojo. */
export function makeSombra(scale = 1, palette = ['#4d4a92', '#7c7bd0', '#2f2d66']) {
  const root = new THREE.Group();
  const inner = new THREE.Group();
  root.add(inner);
  const s = 0.62 * scale;
  inner.add(part(GEO.box(), mat(palette[0]), 0, s / 2, 0, s, s, s));
  inner.add(part(GEO.box(), mat(palette[1]), 0, s + 0.02 * scale, 0, s * 0.82, 0.05 * scale, s * 0.82));
  const eye = new THREE.Group();
  eye.position.set(0, s * 0.58, s / 2 + 0.01);
  eye.add(part(GEO.ico(1), mat('#fff6d8', { emissive: 0x8a7a40 }), 0, 0, 0, 0.13 * scale, 0.13 * scale, 0.04 * scale));
  eye.add(part(GEO.ico(1), mat('#2b2350', { flat: false }), 0, 0, 0.03 * scale, 0.06 * scale, 0.06 * scale, 0.03 * scale));
  inner.add(eye);
  root.userData = { inner, eye, size: s };
  return root;
}

/* Farol: orbe flotante con anillo. */
export function makeFarol() {
  const root = new THREE.Group();
  const inner = new THREE.Group();
  root.add(inner);
  inner.add(part(GEO.ico(1), mat('#c3a7e6', { emissive: 0x3b2366 }), 0, 0, 0, 0.32));
  const ring = part(GEO.torus(), mat('#7f63b8'), 0, 0, 0, 0.48, 0.48, 0.3);
  ring.rotation.x = Math.PI / 2.3;
  inner.add(ring);
  inner.add(part(GEO.ico(1), mat('#fff3c8', { emissive: 0x9a8040 }), 0, 0.02, 0.27, 0.12, 0.12, 0.05));
  inner.add(part(GEO.ico(0), mat('#2b2350'), 0, 0.02, 0.31, 0.055, 0.055, 0.03));
  root.userData = { inner, ring };
  return root;
}

/* Tótem: dos cubos apilados con rendijas brillantes. */
export function makeTotem() {
  const root = new THREE.Group();
  const inner = new THREE.Group();
  root.add(inner);
  inner.add(part(GEO.box(), mat('#9d5d86'), 0, 0.45, 0, 0.9, 0.9, 0.9));
  inner.add(part(GEO.box(), mat('#c77fa4'), 0, 1.25, 0, 0.75, 0.7, 0.75));
  inner.add(part(GEO.box(), mat('#e8a3c0'), 0, 1.62, 0, 0.55, 0.06, 0.55));
  const glow = mat('#ffe2a0', { emissive: 0xb07a20 });
  inner.add(part(GEO.box(), glow, -0.15, 1.3, 0.38, 0.14, 0.06, 0.02));
  inner.add(part(GEO.box(), glow, 0.15, 1.3, 0.38, 0.14, 0.06, 0.02));
  inner.add(part(GEO.box(), glow, 0, 0.5, 0.46, 0.4, 0.06, 0.02));
  root.userData = { inner };
  return root;
}

/* El Guardián: zigurat flotante con un núcleo dorado. */
export function makeGuardian() {
  const root = new THREE.Group();
  const inner = new THREE.Group();
  root.add(inner);
  const c = ['#3e4288', '#5a5fae', '#8e94d6'];
  inner.add(part(GEO.box(), mat(c[0]), 0, 0.6, 0, 3.2, 1.2, 3.2));
  inner.add(part(GEO.box(), mat(c[1]), 0, 1.7, 0, 2.4, 1.0, 2.4));
  inner.add(part(GEO.box(), mat(c[2]), 0, 2.6, 0, 1.6, 0.8, 1.6));
  inner.add(part(GEO.box(), mat('#f2c46c', { emissive: 0x6b4a10 }), 0, 3.15, 0, 1.0, 0.3, 1.0));
  const core = part(GEO.oct(), mat('#ffe9a8', { emissive: 0xc08a30 }), 0, 1.7, 1.25, 0.45);
  inner.add(core);
  const halo = part(GEO.torus(), mat('#f2c46c', { emissive: 0x5a3c08 }), 0, 2.2, -0.2, 2.1, 2.1, 0.5);
  inner.add(halo);
  const orbiters = [];
  for (let i = 0; i < 4; i++) {
    const o = part(GEO.box(), mat(c[2]), 0, 0, 0, 0.5, 0.5, 0.5);
    inner.add(o); orbiters.push(o);
  }
  root.userData = { inner, core, halo, orbiters };
  return root;
}

/* Lechuza sabia del Claro. */
export function makeOwl() {
  const root = new THREE.Group();
  const body = mat('#a99bc8'), belly = mat('#efe6f7'), dark = mat('#3b3157', { flat: false }), beak = mat('#f2c46c');
  root.add(part(GEO.ico(1), body, 0, 0.42, 0, 0.36, 0.44, 0.32));
  root.add(part(GEO.ico(1), belly, 0, 0.36, 0.14, 0.25, 0.3, 0.2));
  const head = new THREE.Group();
  head.position.set(0, 0.85, 0);
  root.add(head);
  head.add(part(GEO.ico(1), body, 0, 0, 0, 0.3, 0.26, 0.28));
  const eyes = [];
  for (const s of [-1, 1]) {
    head.add(part(GEO.ico(1), belly, s * 0.12, 0.02, 0.2, 0.11, 0.11, 0.06));
    const e = part(GEO.ico(1), dark, s * 0.12, 0.02, 0.255, 0.05, 0.05, 0.02);
    head.add(e); eyes.push(e);
    const ear = part(GEO.cone(4), body, s * 0.17, 0.25, 0, 0.07, 0.16, 0.06);
    ear.rotation.z = -s * 0.4;
    head.add(ear);
  }
  const bk = part(GEO.cone(4), beak, 0, -0.06, 0.27, 0.04, 0.09, 0.04);
  bk.rotation.x = Math.PI;
  head.add(bk);
  root.userData = { head, eyes };
  return root;
}
