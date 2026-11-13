/* Star Nova — Pip, la ardilla diminuta: modelo con "esqueleto" de grupos y animación procedural.
 * El modelo mira hacia +z con los pies en y=0. Todas las piezas son primitivas suavizadas. */
import * as THREE from 'three';

const G = {
  ball: new THREE.IcosahedronGeometry(1, 3),
  lowBall: new THREE.IcosahedronGeometry(1, 1),
  cone: new THREE.ConeGeometry(1, 1, 10),
  torus: new THREE.TorusGeometry(1, 0.3, 8, 18),
  star: (() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.45 : 1;
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: false });
    g.center();
    return g;
  })(),
};

/* Materiales propios de Pip (no compartidos), para poder hacerlo destellar al recibir daño. */
function pipMat(color, o = {}) {
  return new THREE.MeshLambertMaterial({ color, emissive: o.emissive || 0x000000, flatShading: false });
}

function mesh(geo, material, x, y, z, sx, sy = sx, sz = sx) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  return m;
}
function pivot(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

export function makePip() {
  const M = {
    fur: pipMat('#cf7a3e'), fur2: pipMat('#e59a5c'), furDark: pipMat('#a95e2c'), cream: pipMat('#fbe6cf'),
    paw: pipMat('#8c4e2a'), eye: pipMat('#2a1a18'), white: pipMat('#ffffff', { emissive: 0x666666 }),
    pink: pipMat('#f4a7a2'), nose: pipMat('#5a2f2a'), scarf: pipMat('#6cc9b2'), scarf2: pipMat('#4fae98'),
    gold: pipMat('#ffd36e', { emissive: 0x7a5410 }), tailTip: pipMat('#ffe9d2'),
  };
  const root = new THREE.Group();
  const body = pivot(root, 0, 0.17, 0);            // cadera: todo el cuerpo cuelga de aquí
  const torso = pivot(body, 0, 0, 0);
  torso.add(mesh(G.ball, M.fur, 0, 0.05, -0.01, 0.15, 0.14, 0.17));
  torso.add(mesh(G.ball, M.cream, 0, 0.04, 0.105, 0.1, 0.115, 0.08));
  torso.add(mesh(G.ball, M.cream, 0, 0.13, 0.07, 0.085, 0.07, 0.07));   // pechito esponjoso

  // cabeza grande (proporción tierna)
  const neck = pivot(torso, 0, 0.17, 0.05);
  const head = pivot(neck, 0, 0.1, 0.02);
  head.add(mesh(G.ball, M.fur, 0, 0, 0, 0.155, 0.142, 0.15));
  head.add(mesh(G.ball, M.fur2, 0, 0.07, -0.02, 0.11, 0.07, 0.11));    // coronilla
  for (const s of [-1, 1]) head.add(mesh(G.ball, M.cream, s * 0.075, -0.045, 0.09, 0.07, 0.06, 0.055)); // mofletes
  head.add(mesh(G.ball, M.cream, 0, -0.035, 0.125, 0.06, 0.048, 0.05));  // hocico
  head.add(mesh(G.ball, M.nose, 0, -0.012, 0.172, 0.022, 0.017, 0.015));
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = pivot(head, s * 0.07, 0.025, 0.118);
    e.add(mesh(G.ball, M.eye, 0, 0, 0, 0.032, 0.04, 0.02));
    e.add(mesh(G.lowBall, M.white, s * -0.009, 0.014, 0.016, 0.011));
    e.add(mesh(G.lowBall, M.white, s * 0.008, -0.01, 0.017, 0.005));
    e.rotation.y = s * 0.28;
    eyes.push(e);
    head.add(mesh(G.ball, M.pink, s * 0.1, -0.035, 0.105, 0.026, 0.016, 0.01)); // rubor
  }
  const ears = [];
  for (const s of [-1, 1]) {
    const ear = pivot(head, s * 0.085, 0.11, -0.01);
    ear.rotation.z = -s * 0.22;
    ear.add(mesh(G.cone, M.fur, 0, 0.06, 0, 0.05, 0.13, 0.032));
    ear.add(mesh(G.cone, M.pink, 0, 0.055, 0.014, 0.03, 0.085, 0.01));
    const tuft = mesh(G.cone, M.furDark, s * 0.006, 0.135, 0, 0.022, 0.06, 0.016);
    tuft.rotation.z = -s * 0.3;
    ear.add(tuft);
    ears.push(ear);
  }

  // bufanda con dos puntas que ondean y broche de estrella
  const scarf = pivot(torso, 0, 0.145, 0.03);
  const ring = mesh(G.torus, M.scarf, 0, 0, 0, 0.1, 0.1, 0.1);
  ring.rotation.x = Math.PI / 2 + 0.2;
  scarf.add(ring);
  const tails = [];
  let parent = scarf;
  for (let i = 0; i < 2; i++) {
    const t = pivot(parent, i === 0 ? 0.06 : 0, i === 0 ? -0.01 : -0.05, i === 0 ? -0.07 : 0);
    t.add(mesh(G.ball, i ? M.scarf2 : M.scarf, 0, -0.025, 0, 0.03, 0.05, 0.012));
    tails.push(t);
    parent = t;
  }
  const pin = mesh(G.star, M.gold, 0.055, 0.0, 0.1, 0.035, 0.035, 0.035);
  scarf.add(pin);

  // brazos (para lanzar bellotas) y patas traseras
  const arms = [];
  for (const s of [-1, 1]) {
    const a = pivot(torso, s * 0.112, 0.09, 0.06);
    a.add(mesh(G.ball, M.fur, 0, -0.035, 0.01, 0.026, 0.048, 0.028));
    a.add(mesh(G.ball, M.fur2, 0, -0.078, 0.018, 0.022, 0.019, 0.022));
    arms.push(a);
  }
  const legs = [];
  for (const s of [-1, 1]) {
    const l = pivot(body, s * 0.085, -0.03, -0.04);
    l.add(mesh(G.ball, M.fur, 0, -0.02, 0, 0.055, 0.065, 0.07));
    l.add(mesh(G.ball, M.paw, 0, -0.11, 0.045, 0.035, 0.025, 0.06));
    legs.push(l);
  }

  // cola: cadena de 8 segmentos (cada uno cuelga del anterior) en forma de S
  const tail = [];
  parent = pivot(torso, 0, 0.0, -0.14);
  const tailRoot = parent;
  const sizes = [0.075, 0.095, 0.115, 0.13, 0.135, 0.125, 0.105, 0.075];
  for (let i = 0; i < sizes.length; i++) {
    const seg = pivot(parent, 0, i === 0 ? 0 : 0.085, i === 0 ? 0 : -0.01);
    const r = sizes[i];
    const m = i === sizes.length - 1 ? M.tailTip : (i % 3 === 2 ? M.fur2 : M.fur);
    seg.add(mesh(G.ball, m, 0, 0.04, 0, r, r * 0.95, r * 0.9));
    if (i >= 3) seg.add(mesh(G.ball, M.fur2, 0, 0.04, r * 0.45, r * 0.6, r * 0.6, r * 0.4)); // mechón claro
    tail.push(seg);
    parent = seg;
  }
  const mats = Object.values(M);
  root.userData = { body, torso, head, neck, eyes, ears, scarf, tails, pin, arms, legs, tail, tailRoot, mats, M };
  return root;
}

/* Curva base de la cola (rotación x de cada segmento, en reposo). */
const TAIL_BASE = [-1.05, -0.55, -0.15, 0.2, 0.42, 0.55, 0.6, 0.55];

/* Animación procedural de Pip: respiración, galope, saltos, giros, lanzamiento, voltereta… */
export class PipAnimator {
  constructor(model) {
    this.m = model;
    this.u = model.userData;
    this.t = 0;
    this.phase = 0;
    this.blinkT = 2;
    this.earT = 3;
    this.lookT = 4;
    this.lookYaw = 0;
    this.prevYaw = 0;
    this.turn = 0;
    this.tailSwing = 0;
    this.tailVel = 0;
    this.flipT = 0;
    this.throwT = 0;
    this.throwSide = 1;
    this.landT = 0;
    this.hurtT = 0;
    this.scarfWave = 0;
  }

  flip() { this.flipT = 0.42; }
  throwAnim() { this.throwT = 0.22; this.throwSide = -this.throwSide; }
  land(strength) { this.landT = Math.min(0.22, 0.08 + strength * 0.012); }
  hurt() { this.hurtT = 0.45; }

  update(dt, s) {
    // s: { yaw, speed, grounded, vy, dash, spin, invulnBlink, tail }
    const u = this.u;
    this.t += dt;
    const t = this.t;
    const run = s.grounded && s.speed > 0.5;
    const runK = Math.min(1, s.speed / 6);
    this.phase += dt * (run ? 7 + s.speed * 1.6 : 0);
    const ph = this.phase;

    // giro: inclinación del cuerpo y latigazo de la cola
    let dyaw = s.yaw - this.prevYaw;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    this.prevYaw = s.yaw;
    const turnRate = dyaw / Math.max(dt, 1e-3);
    this.turn += (turnRate - this.turn) * Math.min(1, dt * 8);
    // resorte de la cola (movimiento secundario)
    const target = THREE.MathUtils.clamp(-this.turn * 0.12, -0.7, 0.7);
    this.tailVel += ((target - this.tailSwing) * 60 - this.tailVel * 9) * dt;
    this.tailSwing += this.tailVel * dt;

    this.m.position.copy(s.pos);
    this.m.rotation.set(0, s.yaw, 0);

    // cuerpo
    let bodyY = 0, pitch = 0, sx = 1, sy = 1;
    if (run) {
      bodyY = Math.abs(Math.sin(ph)) * 0.06 * runK;
      pitch = 0.15 * runK + Math.sin(ph * 2) * 0.1 * runK;
    } else if (s.grounded) {
      const br = Math.sin(t * 2.4) * 0.015;
      sy = 1 + br; sx = 1 - br * 0.5;
    } else {
      pitch = THREE.MathUtils.clamp(-s.vy * 0.035, -0.35, 0.4);
      const k = THREE.MathUtils.clamp(s.vy * 0.025, -0.12, 0.14);
      sy = 1 + k; sx = 1 - k * 0.6;
    }
    if (this.landT > 0) {
      this.landT -= dt;
      const k = Math.max(0, this.landT) * 1.8;
      sy *= 1 - k; sx *= 1 + k * 0.8; bodyY -= k * 0.1;
    }
    u.body.position.y = 0.17 + bodyY;
    u.body.scale.set(sx, sy, sx);
    u.body.rotation.x = pitch;
    u.body.rotation.z = THREE.MathUtils.clamp(-this.turn * 0.04, -0.3, 0.3) * (s.grounded ? 1 : 0.5);

    // voltereta del doble salto, bola de la voltereta (dash) y giro del coletazo
    if (this.flipT > 0) { this.flipT -= dt; u.body.rotation.x = -(1 - Math.max(0, this.flipT) / 0.42) * Math.PI * 2; }
    if (s.dash > 0) {
      u.body.rotation.x = s.spin;
      u.body.scale.set(0.85, 0.8, 0.85);
    }
    u.torso.rotation.y = s.tailSpin > 0 ? (1 - s.tailSpin / 0.35) * Math.PI * 2 : 0;

    // patas: galope (las delanteras y traseras alternan)
    const leg = run ? Math.sin(ph) * 1.1 * runK : (s.grounded ? 0 : -0.5);
    u.legs[0].rotation.x = leg; u.legs[1].rotation.x = leg * (run ? 0.85 : 1);
    // brazos: correr, saltar o lanzar
    let armL = run ? -Math.sin(ph) * 1.0 * runK : (s.grounded ? Math.sin(t * 2.4) * 0.05 : -0.9);
    let armR = armL;
    if (this.throwT > 0) {
      this.throwT -= dt;
      const k = 1 - Math.max(0, this.throwT) / 0.22;
      const swing = k < 0.35 ? -2.4 * (k / 0.35) : -2.4 + (k - 0.35) / 0.65 * 3.0;
      if (this.throwSide > 0) armR = swing; else armL = swing;
    }
    u.arms[0].rotation.x = armL; u.arms[1].rotation.x = armR;
    u.arms[0].rotation.z = s.grounded ? 0.15 : 0.6; u.arms[1].rotation.z = -u.arms[0].rotation.z;

    // cabeza: compensa el galope, mira alrededor en reposo
    this.lookT -= dt;
    if (this.lookT < 0) { this.lookT = 2.5 + Math.random() * 3; this.lookYaw = run ? 0 : (Math.random() - 0.5) * 1.2; }
    u.neck.rotation.y += ((run ? 0 : this.lookYaw) - u.neck.rotation.y) * Math.min(1, dt * 3);
    u.neck.rotation.x = -pitch * 0.7 + (run ? 0 : Math.sin(t * 0.9) * 0.05);
    u.head.rotation.z = Math.sin(t * 0.7) * 0.06 + (this.hurtT > 0 ? Math.sin(t * 40) * 0.15 : 0);

    // parpadeo (y ojos apretados al recibir daño)
    this.blinkT -= dt;
    const closed = this.blinkT < 0.1 || this.hurtT > 0.15;
    for (const e of u.eyes) e.scale.y += ((closed ? 0.12 : 1) - e.scale.y) * Math.min(1, dt * 30);
    if (this.blinkT < 0) this.blinkT = 2.2 + Math.random() * 3.5;

    // orejas: hacia atrás al correr, temblor de vez en cuando
    this.earT -= dt;
    const twitch = this.earT < 0.15 ? Math.sin(t * 60) * 0.25 : 0;
    if (this.earT < 0) this.earT = 2 + Math.random() * 4;
    u.ears.forEach((e, i) => { e.rotation.x = -0.5 * runK - (s.grounded ? 0 : 0.3) + (i ? twitch : 0); });

    // cola: forma de S + ola + resorte + reacción a velocidad
    const wave = run ? 0.18 : 0.1;
    const freq = run ? 9 : 2.2;
    u.tail.forEach((seg, i) => {
      const base = TAIL_BASE[i];
      const streamline = run ? -0.25 * runK * (i < 3 ? 1 : 0.5) : 0;
      const air = s.grounded ? 0 : 0.18;
      seg.rotation.x = base + streamline + air + Math.sin(t * freq - i * 0.7) * wave * (0.4 + i * 0.12);
      seg.rotation.z = this.tailSwing * (0.3 + i * 0.12) + Math.sin(t * 1.3 - i * 0.5) * 0.05;
    });

    // bufanda que ondea según la velocidad
    this.scarfWave += dt * (6 + s.speed * 3);
    u.tails[0].rotation.x = 0.6 + s.speed * 0.12 + Math.sin(this.scarfWave) * 0.15;
    u.tails[1].rotation.x = 0.3 + Math.sin(this.scarfWave - 1) * 0.25;
    u.pin.rotation.y = t * 2;

    // destello al recibir daño
    if (this.hurtT > 0) this.hurtT -= dt;
    const flash = this.hurtT > 0 && Math.floor(this.hurtT * 20) % 2 === 0 ? 0.5 : 0;
    u.mats[0].emissive.setRGB(flash, flash * 0.2, flash * 0.2);
    u.mats[1].emissive.setRGB(flash, flash * 0.2, flash * 0.2);
    this.m.visible = !s.invulnBlink;
  }
}
