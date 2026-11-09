/* Star Nova — objetos del mundo con física y lógica de misiones. */
import * as THREE from 'three';
import { R, G, ALL, groups } from './physics.js';
import { mat, GEO, part, makeOwl } from './entities/models.js';
import { Audio } from './audio.js';
import { CHESTS, RANKS, rollChest } from './content/chests.js';

const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

function bellGeometry() {
  const pts = [];
  const prof = [[0, 0.42], [0.08, 0.42], [0.13, 0.36], [0.16, 0.22], [0.2, 0.08], [0.29, -0.02], [0.3, -0.06], [0.0, -0.06]];
  for (const [x, y] of prof) pts.push(new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 10);
}
const BELL_GEO = bellGeometry();

/* Campana colgante (articulación esférica). Suena al golpearla o al tocarla. */
export class Bell {
  constructor(game, spot, index) {
    this.game = game; this.kind = 'bell'; this.index = index; this.freq = spot.freq; this.region = spot.region;
    this.anchor = v3(spot.anchor);
    const w = game.phys.world;
    const L = 0.75;
    this.body = w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(this.anchor.x, this.anchor.y - L, this.anchor.z).setAngularDamping(0.25).setLinearDamping(0.1));
    const col = w.createCollider(R.ColliderDesc.cylinder(0.24, 0.3).setTranslation(0, 0.12, 0).setDensity(2)
      .setCollisionGroups(groups(G.PROP, ALL)).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS), this.body);
    game.phys.own(col, this);
    w.createImpulseJoint(R.JointData.spherical({ x: this.anchor.x, y: this.anchor.y, z: this.anchor.z }, { x: 0, y: L, z: 0 }), game.phys.fixed, this.body, true);
    this.mesh = new THREE.Group();
    this.bellMat = new THREE.MeshLambertMaterial({ color: '#c9a26a', flatShading: true, emissive: 0x000000 });
    const bm = new THREE.Mesh(BELL_GEO, this.bellMat);
    bm.castShadow = true;
    this.mesh.add(bm);
    this.mesh.add(part(GEO.ico(1), mat('#8a6a3c'), 0, -0.08, 0, 0.08));
    this.rope = part(GEO.cyl(5), mat('#7d6a5a'), 0, 0.4 + L / 2 - 0.05, 0, 0.025, L - 0.3, 0.025);
    this.mesh.add(this.rope);
    game.scene.add(this.mesh);
    this.rung = false;
    this.cool = 0;
    this.glow = 0;
  }
  ring(strength = 1) {
    if (this.cool > 0) return;
    this.cool = 0.35;
    Audio.play('bell', this.freq);
    this.glow = 1;
    const t = this.body.translation();
    this.game.fx.ring(new THREE.Vector3(t.x, t.y, t.z), '#ffe7a0', 18, 4);
    if (!this.rung) { this.rung = true; this.game.missions.event('bell', this); }
  }
  onHit(proj) { this.ring(); const v = proj.body ? proj.body.linvel() : { x: 0, y: 0, z: 0 }; this.body.applyImpulse({ x: v.x * 0.05, y: 0, z: v.z * 0.05 }, true); }
  push(dir, f) { this.body.applyImpulse({ x: dir.x * f, y: 0.2 * f, z: dir.z * f }, true); this.ring(); }
  update(dt) {
    this.cool -= dt;
    this.glow = Math.max(0, this.glow - dt);
    const t = this.body.translation(), r = this.body.rotation();
    this.mesh.position.set(t.x, t.y, t.z);
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    const av = this.body.angvel();
    if (Math.hypot(av.x, av.z) > 3.2) this.ring();
    const pl = this.game.player.center;
    if (pl.distanceTo(new THREE.Vector3(t.x, t.y, t.z)) < 0.75) {
      const d = new THREE.Vector3(t.x - pl.x, 0, t.z - pl.z).normalize();
      this.push(d, 0.6);
    }
    const gold = this.rung ? 1 : 0;
    this.bellMat.color.set(gold ? '#ffd36e' : '#c9a26a');
    this.bellMat.emissive.setRGB(0.5 * this.glow + 0.12 * gold, 0.38 * this.glow + 0.08 * gold, 0.1 * this.glow);
  }
}

/* Cristal: al golpearlo se activa. */
export class Crystal {
  constructor(game, spot, index) {
    this.game = game; this.kind = 'crystal'; this.index = index;
    this.p = v3(spot.pos);
    const c = game.phys.world.createCollider(R.ColliderDesc.ball(0.45).setTranslation(this.p.x, this.p.y, this.p.z)
      .setCollisionGroups(groups(G.PROP, ALL)), game.phys.fixed);
    game.phys.own(c, this);
    this.mat = new THREE.MeshLambertMaterial({ color: '#cfc3f2', flatShading: true, emissive: 0x2a2050, transparent: true, opacity: 0.92 });
    this.mesh = new THREE.Mesh(GEO.oct(), this.mat);
    this.mesh.scale.set(0.32, 0.6, 0.32);
    this.mesh.position.copy(this.p);
    this.mesh.castShadow = true;
    game.scene.add(this.mesh);
    this.active = false;
  }
  onHit() { this.activate(); }
  push() { this.activate(); }
  activate() {
    if (this.active) return;
    this.active = true;
    Audio.play('crystal');
    this.game.fx.burst(this.p, '#e8dcff', 30, 5, 0.18, 1);
    this.game.missions.event('crystal', this);
  }
  update(dt, t) {
    this.mesh.rotation.y += dt * (this.active ? 2.5 : 0.6);
    this.mesh.position.y = this.p.y + Math.sin(t * 1.6 + this.index) * 0.1;
    if (this.active) {
      this.mat.color.set('#fff3c4');
      this.mat.emissive.setRGB(0.55, 0.45, 0.25);
      if (Math.random() < 0.3) this.game.fx.sparkle(this.p, '#fff2c0', 1, 0.8);
    }
  }
}

/* Caja empujable. */
export class Crate {
  constructor(game, pos) {
    this.game = game; this.kind = 'crate';
    const w = game.phys.world;
    this.body = w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(pos[0], pos[1], pos[2]).setAngularDamping(0.4));
    const c = w.createCollider(R.ColliderDesc.cuboid(0.3, 0.3, 0.3).setDensity(0.5).setFriction(0.8).setCollisionGroups(groups(G.PROP, ALL)), this.body);
    game.phys.own(c, this);
    const g = new THREE.Group();
    g.add(part(GEO.box(), mat('#efc79f'), 0, 0, 0, 0.6));
    for (const s of [-1, 1]) {
      g.add(part(GEO.box(), mat('#d39c70'), 0, s * 0.25, 0, 0.63, 0.09, 0.63));
    }
    g.add(part(GEO.box(), mat('#d39c70'), 0, 0, 0, 0.09, 0.63, 0.63));
    this.mesh = g;
    game.scene.add(g);
  }
  onHit(proj) { const v = proj.body ? proj.body.linvel() : { x: 0, y: 0, z: 0 }; this.body.applyImpulse({ x: v.x * 0.03, y: 0.3, z: v.z * 0.03 }, true); }
  push(dir, f) { this.body.applyImpulse({ x: dir.x * f * 2, y: f * 1.2, z: dir.z * f * 2 }, true); }
  update() {
    const t = this.body.translation(), r = this.body.rotation();
    this.mesh.position.set(t.x, t.y, t.z);
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    if (t.y < -30) { this.body.setTranslation({ x: 0, y: 3, z: 6 }, true); this.body.setLinvel({ x: 0, y: 0, z: 0 }, true); }
  }
}

/* Puente de tablones unidos por articulaciones de bisagra. Aparece al despertar los cristales. */
export class PlankBridge {
  constructor(game, spot) {
    this.game = game; this.spot = spot;
    this.built = false;
    this.planks = [];
    this.t = 0;
  }
  build() {
    if (this.built) return;
    this.built = true;
    const game = this.game, w = game.phys.world;
    const a = v3(this.spot.from), b = v3(this.spot.to);
    const len = a.distanceTo(b);
    const n = Math.round(len / 0.9);
    const seg = len / n;
    const dir = b.clone().sub(a).normalize();
    const hw = this.spot.width / 2;
    let prev = null;
    for (let i = 0; i < n; i++) {
      const c = a.clone().addScaledVector(dir, seg * (i + 0.5));
      const body = w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(c.x, c.y - 0.09, c.z).setLinearDamping(0.6).setAngularDamping(1.2));
      const col = w.createCollider(R.ColliderDesc.cuboid(seg * 0.46, 0.08, hw).setDensity(1.2).setFriction(1.0)
        .setCollisionGroups(groups(G.PROP, ALL)), body);
      game.phys.own(col, { kind: 'plank', onHit() {} });
      const axis = { x: 0, y: 0, z: 1 };
      if (i === 0) w.createImpulseJoint(R.JointData.revolute({ x: a.x, y: a.y - 0.09, z: a.z }, { x: -seg / 2, y: 0, z: 0 }, axis), game.phys.fixed, body, true);
      else w.createImpulseJoint(R.JointData.revolute({ x: seg / 2, y: 0, z: 0 }, { x: -seg / 2, y: 0, z: 0 }, axis), prev, body, true);
      const m = new THREE.Group();
      m.add(part(GEO.box(), mat(i % 2 ? '#e2c29c' : '#d7b38a'), 0, 0, 0, seg * 0.92, 0.16, hw * 2));
      for (const s of [-1, 1]) m.add(part(GEO.box(), mat('#8d79c4'), 0, 0.11, s * (hw - 0.05), seg, 0.05, 0.05));
      m.scale.setScalar(0.001);
      game.scene.add(m);
      this.planks.push({ body, mesh: m, delay: i * 0.06 });
      prev = body;
    }
    w.createImpulseJoint(R.JointData.revolute({ x: seg / 2, y: 0, z: 0 }, { x: b.x, y: b.y - 0.09, z: b.z }, { x: 0, y: 0, z: 1 }), prev, game.phys.fixed, true);
    Audio.play('rumble');
  }
  update(dt) {
    if (!this.built) return;
    this.t += dt;
    for (const p of this.planks) {
      const tr = p.body.translation(), r = p.body.rotation();
      p.mesh.position.set(tr.x, tr.y, tr.z);
      p.mesh.quaternion.set(r.x, r.y, r.z, r.w);
      const k = Math.min(1, Math.max(0, (this.t - p.delay) / 0.35));
      if (k < 1) { p.mesh.scale.setScalar(Math.max(0.001, k)); if (Math.random() < 0.4) this.game.fx.sparkle(new THREE.Vector3(tr.x, tr.y, tr.z), '#e8dcff', 1, 1.5); }
      else p.mesh.scale.setScalar(1);
    }
  }
}

/* Luciérnaga perdida (se recoge al tocarla). */
export class Firefly {
  constructor(game, spot, index) {
    this.game = game; this.index = index; this.p = v3(spot.pos);
    this.mesh = new THREE.Group();
    this.mesh.add(part(GEO.ico(1), mat('#f6ffb0', { emissive: 0xb0c040 }), 0, 0, 0, 0.12));
    const halo = part(GEO.ico(1), mat('#f4ffb8', { basic: true, transparent: true, opacity: 0.22, depthWrite: false }), 0, 0, 0, 0.4);
    halo.castShadow = false;
    this.mesh.add(halo);
    for (const s of [-1, 1]) {
      const wing = part(GEO.ico(0), mat('#ffffff', { transparent: true, opacity: 0.7 }), s * 0.1, 0.06, 0, 0.1, 0.03, 0.06);
      this.mesh.add(wing);
    }
    game.scene.add(this.mesh);
    this.taken = false;
  }
  update(dt, t) {
    if (this.taken) return;
    this.mesh.position.set(this.p.x + Math.sin(t * 1.3 + this.index) * 0.3, this.p.y + Math.sin(t * 2.1 + this.index) * 0.2, this.p.z + Math.cos(t * 1.1 + this.index) * 0.3);
    this.mesh.children[2].rotation.z = Math.sin(t * 30) * 0.6;
    this.mesh.children[3].rotation.z = -Math.sin(t * 30) * 0.6;
    if (Math.random() < 0.15) this.game.fx.sparkle(this.mesh.position, '#f4ffb0', 1, 0.4);
    if (this.game.player.center.distanceTo(this.mesh.position) < 0.85) {
      this.taken = true;
      this.game.scene.remove(this.mesh);
      Audio.play('firefly');
      this.game.fx.burst(this.mesh.position, '#f4ffb0', 24, 3, 0.16, 1);
      this.game.missions.event('firefly', this);
    }
  }
}

/* Cofre con rango y estilo (ver js/content/chests.js). Tras abrirse, reaparece con un rango acorde al avance. */
export class Chest {
  constructor(game, spot) {
    this.game = game; this.kind = 'chest';
    this.p = v3(spot.pos);
    this.region = spot.region;
    this.ry = spot.ry || Math.random() * Math.PI * 2;
    const c = game.phys.world.createCollider(R.ColliderDesc.cuboid(0.4, 0.3, 0.3).setTranslation(this.p.x, this.p.y + 0.3, this.p.z)
      .setRotation({ x: 0, y: Math.sin(this.ry / 2), z: 0, w: Math.cos(this.ry / 2) })
      .setCollisionGroups(groups(G.PROP, ALL)), game.phys.fixed);
    game.phys.own(c, { kind: 'chestBody' });
    this.setType(spot.type || rollChest(game.progress(), game.stats ? game.stats.luck : 0));
  }
  setType(id) {
    if (this.mesh) this.game.scene.remove(this.mesh);
    this.def = CHESTS[id];
    this.opened = false;
    this.lidT = 0;
    this.respawnT = 0;
    const L = this.def.look;
    const g = new THREE.Group();
    const base = mat(L.base), trim = mat(L.trim), gem = mat(L.gem, { emissive: new THREE.Color(L.gem).multiplyScalar(0.45).getHex() });
    this.lid = new THREE.Group();
    this.lid.position.set(0, 0.4, -0.25);
    if (L.shape === 'basket') {
      g.add(part(GEO.cyl(10), base, 0, 0.18, 0, 0.36, 0.36, 0.28));
      for (const y of [0.08, 0.2, 0.32]) g.add(part(GEO.torus(), trim, 0, y, 0, 0.37, 0.37, 0.12));
      g.children.slice(-3).forEach(t => { t.rotation.x = Math.PI / 2; });
      for (let i = 0; i < 4; i++) g.add(part(GEO.ico(1), mat('#b9774a'), Math.cos(i * 1.6) * 0.15, 0.38, Math.sin(i * 1.6) * 0.12, 0.08, 0.08, 0.1));
      const h = part(GEO.torus(), trim, 0, 0.36, 0, 0.3, 0.3, 0.12);
      this.lid.add(h); this.lid.position.set(0, 0, 0);
    } else if (L.shape === 'crystal') {
      g.add(part(GEO.box(), mat(L.base, { transparent: true, opacity: 0.6 }), 0, 0.2, 0, 0.74, 0.4, 0.5));
      g.add(part(GEO.oct(), gem, 0, 0.22, 0, 0.14, 0.2, 0.14));
      for (const x of [-0.37, 0.37]) for (const z of [-0.25, 0.25]) g.add(part(GEO.box(), trim, x, 0.2, z, 0.06, 0.42, 0.06));
      this.lid.add(part(GEO.box(), mat(L.base, { transparent: true, opacity: 0.7 }), 0, 0.07, 0.25, 0.78, 0.14, 0.54));
      this.lid.add(part(GEO.oct(), gem, 0, 0.2, 0.25, 0.08, 0.12, 0.08));
    } else if (L.shape === 'rune') {
      g.add(part(GEO.box(), base, 0, 0.2, 0, 0.76, 0.4, 0.52));
      const rune = mat(L.gem, { emissive: new THREE.Color(L.gem).multiplyScalar(0.7).getHex() });
      for (const x of [-0.2, 0, 0.2]) g.add(part(GEO.box(), rune, x, 0.2, 0.265, 0.05, 0.22, 0.01));
      this.lid.add(part(GEO.box(), trim, 0, 0.07, 0.25, 0.8, 0.14, 0.55));
      this.lid.add(part(GEO.oct(), gem, 0, 0.2, 0.25, 0.08, 0.12, 0.08));
      const ring = part(GEO.torus(), rune, 0, 0.75, 0, 0.45, 0.45, 0.1);
      ring.rotation.x = Math.PI / 2; ring.castShadow = false;
      g.add(ring); this.ring = ring;
    } else if (L.shape === 'trunk') {
      g.add(part(GEO.box(), base, 0, 0.2, 0, 0.75, 0.4, 0.5));
      for (const x of [-0.25, 0.25]) g.add(part(GEO.box(), trim, x, 0.2, 0, 0.08, 0.42, 0.52));
      const top = part(GEO.cyl(10), base, 0, 0.0, 0.25, 0.26, 0.76, 0.26);
      top.rotation.z = Math.PI / 2;
      this.lid.add(top);
      for (const x of [-0.25, 0.25]) { const b = part(GEO.cyl(10), trim, x, 0.0, 0.25, 0.27, 0.08, 0.27); b.rotation.z = Math.PI / 2; this.lid.add(b); }
      this.lid.add(part(GEO.oct(), gem, 0, 0.0, 0.53, 0.06));
      this.lid.position.y = 0.42;
    } else {
      g.add(part(GEO.box(), base, 0, 0.2, 0, 0.75, 0.4, 0.5));
      g.add(part(GEO.box(), trim, 0, 0.2, 0, 0.78, 0.08, 0.53));
      this.lid.add(part(GEO.box(), base, 0, 0.07, 0.25, 0.78, 0.15, 0.52));
      this.lid.add(part(GEO.box(), trim, 0, 0.07, 0.25, 0.8, 0.05, 0.54));
      this.lid.add(part(GEO.oct(), gem, 0, 0.05, 0.52, 0.06));
    }
    g.add(this.lid);
    if (L.glow) {
      const halo = part(GEO.ico(1), mat(L.glow, { basic: true, transparent: true, opacity: 0.16, depthWrite: false }), 0, 0.3, 0, 0.75);
      halo.castShadow = false;
      g.add(halo); this.halo = halo;
    } else this.halo = null;
    g.position.copy(this.p);
    g.rotation.y = this.ry;
    g.scale.setScalar(1 + this.def.rank * 0.07);
    this.mesh = g;
    this.game.scene.add(g);
  }
  cost() { return this.def.rule === 'blood' ? 0 : this.game.chestCost(this.def.cost); }
  label() {
    const d = this.def;
    const price = d.rule === 'blood' ? '25% de vida' : this.cost() + ' chispas';
    return `${d.name} (${RANKS[d.rank]}) · ${price}`;
  }
  open() {
    this.opened = true;
    this.respawnT = 70 + Math.random() * 40;
    Audio.play('chest');
    this.game.fx.burst(this.p.clone().add(new THREE.Vector3(0, 0.5, 0)), this.def.look.gem, 26 + this.def.rank * 8, 4 + this.def.rank);
    this.game.openChestLoot(this);
  }
  update(dt, t) {
    if (this.opened) {
      if (this.lidT < 1) { this.lidT = Math.min(1, this.lidT + dt * 3); this.lid.rotation.x = -this.lidT * 1.9; }
      this.respawnT -= dt;
      if (this.respawnT <= 0) {
        this.setType(rollChest(this.game.progress(), this.game.stats.luck));
        this.game.fx.burst(this.p.clone().add(new THREE.Vector3(0, 0.4, 0)), this.def.look.gem, 30, 3);
        if (this.def.rank >= 3) this.game.hud.toast(`Apareció un ${this.def.name} (${RANKS[this.def.rank]})`);
      }
      return;
    }
    if (this.ring) { this.ring.rotation.z = t; this.ring.position.y = 0.75 + Math.sin(t * 2) * 0.05; }
    if (this.halo) this.halo.scale.setScalar(0.75 + Math.sin(t * 2.5) * 0.05);
    if (this.def.rank >= 2 && Math.random() < 0.05 * this.def.rank) this.game.fx.sparkle(this.p.clone().add(new THREE.Vector3(0, 0.5, 0)), this.def.look.gem, 1, 0.9);
  }
}

/* Portón del santuario: cuerpo cinemático que baja cuando hay 3 fragmentos. */
export class Gate {
  constructor(game, spot) {
    this.game = game; this.spot = spot;
    const p = v3(spot.pos);
    this.base = p;
    this.body = game.phys.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x, p.y + spot.h / 2, p.z));
    game.phys.world.createCollider(R.ColliderDesc.cuboid(spot.w / 2, spot.h / 2, spot.d / 2).setCollisionGroups(groups(G.GATE, ALL)), this.body);
    const g = new THREE.Group();
    g.add(part(GEO.box(), mat('#6c71b8'), 0, 0, 0, spot.w, spot.h, spot.d));
    g.add(part(GEO.box(), mat('#8e94d6'), 0, 0, 0.02, spot.w * 0.8, spot.h * 0.86, spot.d));
    this.sockets = [];
    for (let i = 0; i < 3; i++) {
      const s = part(GEO.oct(), new THREE.MeshLambertMaterial({ color: '#4a4f8c', flatShading: true, emissive: 0x000000 }), (i - 1) * 0.8, 0.6, -spot.d / 2 - 0.05, 0.22);
      g.add(s); this.sockets.push(s);
    }
    g.add(part(GEO.oct(), mat('#f2c46c', { emissive: 0x4a3008 }), 0, -0.5, -spot.d / 2 - 0.05, 0.3, 0.5, 0.1));
    this.mesh = g;
    g.position.set(p.x, p.y + spot.h / 2, p.z);
    game.scene.add(g);
    this.open = false;
    this.y = 0;
  }
  setLights(n) {
    this.sockets.forEach((s, i) => {
      const on = i < n;
      s.material.color.set(on ? '#ffe39a' : '#4a4f8c');
      s.material.emissive.setRGB(on ? 0.6 : 0, on ? 0.45 : 0, on ? 0.15 : 0);
    });
  }
  openGate() { if (this.open) return; this.open = true; Audio.play('rumble'); }
  update(dt) {
    if (this.open && this.y > -this.spot.h - 0.3) {
      this.y = Math.max(-this.spot.h - 0.3, this.y - dt * 1.4);
      const p = this.base;
      this.body.setNextKinematicTranslation({ x: p.x, y: p.y + this.spot.h / 2 + this.y, z: p.z });
      this.mesh.position.y = p.y + this.spot.h / 2 + this.y;
      this.game.cam.shake = Math.max(this.game.cam.shake, 0.08);
      if (Math.random() < 0.5) this.game.fx.puff(new THREE.Vector3(p.x + (Math.random() - 0.5) * 3, p.y, p.z - 0.6), 2, '#d6d9f4');
    }
  }
}

/* Farolillo colgante: cadena de eslabones con articulaciones. */
export class Lantern {
  constructor(game, spot) {
    this.game = game;
    const w = game.phys.world;
    const a = v3(spot.anchor);
    const n = spot.len || 3;
    const L = 0.3;
    let prev = game.phys.fixed, prevAnchor = { x: a.x, y: a.y, z: a.z };
    this.links = [];
    for (let i = 0; i < n; i++) {
      const isLamp = i === n - 1;
      const body = w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(a.x, a.y - L * (i + 1), a.z).setAngularDamping(0.5).setLinearDamping(0.2));
      const col = w.createCollider((isLamp ? R.ColliderDesc.cuboid(0.16, 0.2, 0.16) : R.ColliderDesc.ball(0.04)).setDensity(isLamp ? 1 : 0.5)
        .setCollisionGroups(groups(G.PROP, G.PROJ | G.DEBRIS)).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS), body);
      game.phys.own(col, this);
      w.createImpulseJoint(R.JointData.spherical(prevAnchor, { x: 0, y: L / 2 + (isLamp ? 0.1 : 0), z: 0 }), prev, body, true);
      prev = body; prevAnchor = { x: 0, y: -L / 2, z: 0 };
      const mesh = isLamp ? new THREE.Group() : part(GEO.cyl(5), mat('#7d6a5a'), 0, 0, 0, 0.02, L, 0.02);
      if (isLamp) {
        mesh.add(part(GEO.cyl(6), mat('#f2c46c'), 0, 0.17, 0, 0.12, 0.06, 0.12));
        mesh.add(part(GEO.cyl(6), mat('#fff3c8', { emissive: 0xd0a040 }), 0, 0, 0, 0.14, 0.3, 0.14));
        mesh.add(part(GEO.cone(6), mat('#ee9a8b'), 0, 0.27, 0, 0.18, 0.16, 0.18));
        const glow = part(GEO.ico(1), mat('#ffe7a8', { basic: true, transparent: true, opacity: 0.18, depthWrite: false }), 0, 0, 0, 0.5);
        glow.castShadow = false;
        mesh.add(glow);
      }
      game.scene.add(mesh);
      this.links.push({ body, mesh });
    }
  }
  onHit(proj) { const last = this.links[this.links.length - 1].body; const v = proj.body ? proj.body.linvel() : { x: 1, y: 0, z: 0 }; last.applyImpulse({ x: v.x * 0.01, y: 0, z: v.z * 0.01 }, true); }
  push(dir, f) { const last = this.links[this.links.length - 1].body; last.applyImpulse({ x: dir.x * f * 0.3, y: 0, z: dir.z * f * 0.3 }, true); }
  update() {
    for (const l of this.links) {
      const t = l.body.translation(), r = l.body.rotation();
      l.mesh.position.set(t.x, t.y, t.z);
      l.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }
}

/* Hoguera del Claro: cura y es el punto de regreso. */
export class Campfire {
  constructor(game, pos) {
    this.game = game;
    this.p = v3(pos);
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const s = part(GEO.ico(0), mat('#e6d6cc'), Math.cos(a) * 0.45, 0.06, Math.sin(a) * 0.45, 0.13, 0.08, 0.13);
      g.add(s);
    }
    for (let i = 0; i < 3; i++) {
      const log = part(GEO.cyl(6), mat('#a97d62'), 0, 0.08, 0, 0.06, 0.6, 0.06);
      log.rotation.z = Math.PI / 2; log.rotation.y = (i / 3) * Math.PI;
      g.add(log);
    }
    this.flames = [];
    for (const [c, s, e] of [['#ffb26b', 0.28, 0xc05010], ['#ffd780', 0.18, 0xd09020], ['#fff3c8', 0.09, 0xe0c060]]) {
      const f = part(GEO.cone(5), mat(c, { emissive: e }), 0, 0.3, 0, s, s * 2.2, s);
      f.castShadow = false;
      g.add(f); this.flames.push(f);
    }
    g.position.copy(this.p);
    game.scene.add(g);
    this.light = new THREE.PointLight('#ffb070', 6, 9, 1.6);
    this.light.position.copy(this.p).add(new THREE.Vector3(0, 0.8, 0));
    game.scene.add(this.light);
  }
  update(dt, t) {
    this.flames.forEach((f, i) => {
      const k = 1 + Math.sin(t * (9 + i * 3) + i) * 0.12;
      f.scale.y = f.scale.x * 2.2 * k;
      f.position.y = 0.3 + (f.scale.y - f.scale.x * 2.2) * 0.3;
      f.rotation.y = t * (1 + i);
    });
    this.light.intensity = 5.5 + Math.sin(t * 13) * 0.6 + Math.sin(t * 7.3) * 0.4;
    if (Math.random() < 0.3) this.game.fx.emit(this.p.x + (Math.random() - 0.5) * 0.2, this.p.y + 0.6, this.p.z + (Math.random() - 0.5) * 0.2, 0, 1.5, 0, '#ffcf80', 0.1, 1.0, 0);
  }
}

/* La Abuela Lechuza: da las misiones. */
export class Owl {
  constructor(game, pos) {
    this.game = game;
    this.p = v3(pos);
    this.mesh = makeOwl();
    this.mesh.position.copy(this.p);
    this.mesh.scale.setScalar(0.85);
    game.scene.add(this.mesh);
    this.blink = 2;
  }
  update(dt, t) {
    const pl = this.game.player.pos;
    const yaw = Math.atan2(pl.x - this.p.x, pl.z - this.p.z);
    this.mesh.rotation.y += (yaw - this.mesh.rotation.y) * Math.min(1, dt * 3);
    this.mesh.userData.head.rotation.z = Math.sin(t * 0.8) * 0.12;
    this.blink -= dt;
    const closed = this.blink < 0.12;
    this.mesh.userData.eyes.forEach(e => { e.scale.y = closed ? 0.008 : 0.05; });
    if (this.blink < 0) this.blink = 2 + Math.random() * 3;
  }
}

/* La estrella Nova: dormida en el santuario hasta vencer al Guardián. */
export class NovaStar {
  constructor(game, pos) {
    this.game = game;
    this.p = v3(pos);
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      const r = i % 2 ? 0.45 : 1.1;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) sh.moveTo(x, y); else sh.lineTo(x, y);
    }
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.1, bevelSegments: 1 });
    geo.center();
    this.mat = new THREE.MeshLambertMaterial({ color: '#8e94d6', flatShading: true, emissive: 0x111122 });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.position.copy(this.p).add(new THREE.Vector3(0, 1.4, 0));
    this.mesh.castShadow = true;
    game.scene.add(this.mesh);
    this.awake = 0;
    this.lit = 0;
  }
  setLit(k) { this.lit = k; }
  wake() { this.awake = 0.001; }
  update(dt, t) {
    const lit = Math.max(this.lit, this.awake > 0 ? 1 : 0);
    this.mat.color.set(lit > 0.5 ? '#fff0b0' : '#8e94d6');
    this.mat.emissive.setRGB(0.1 + lit * 0.7, 0.1 + lit * 0.55, 0.15 + lit * 0.2);
    this.mesh.rotation.y = t * (0.4 + this.awake * 0.3);
    if (this.awake > 0) {
      this.awake += dt;
      this.mesh.position.y = this.p.y + 1.4 + Math.min(14, this.awake * this.awake * 1.4);
      this.mesh.scale.setScalar(1 + Math.min(2, this.awake * 0.3));
      if (Math.random() < 0.8) this.game.fx.sparkle(this.mesh.position, '#fff2b8', 2, 2.5);
    } else {
      this.mesh.position.y = this.p.y + 1.4 + Math.sin(t) * 0.15;
    }
  }
}
