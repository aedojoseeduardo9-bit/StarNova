/* Star Nova — proyectiles, recogibles y esquirlas, todos con cuerpos de Rapier. */
import * as THREE from 'three';
import { R, G, groups } from './physics.js';
import { mat, GEO, part } from './entities/models.js';
import { Audio } from './audio.js';

const tmp = new THREE.Vector3();

function dynBody(game, x, y, z, desc, o = {}) {
  const bd = R.RigidBodyDesc.dynamic().setTranslation(x, y, z);
  if (o.ccd) bd.setCcdEnabled(true);
  if (o.gravity !== undefined) bd.setGravityScale(o.gravity);
  if (o.vel) bd.setLinvel(o.vel.x, o.vel.y, o.vel.z);
  if (o.ang) bd.setAngvel(o.ang);
  if (o.damp) bd.setLinearDamping(o.damp);
  const body = game.phys.world.createRigidBody(bd);
  const col = game.phys.world.createCollider(desc, body);
  return { body, col };
}

/* ---------------- Proyectiles del jugador ---------------- */
export class Acorn {
  constructor(game, from, dir, dmg, o = {}) {
    this.game = game;
    this.kind = 'acorn';
    this.dmg = dmg;
    this.crit = o.crit || false;
    this.proc = o.proc !== false;
    const v = dir.clone().multiplyScalar(o.speed || 30);
    const { body, col } = dynBody(game, from.x, from.y, from.z,
      R.ColliderDesc.ball(0.07).setDensity(4).setRestitution(0.45)
        .setCollisionGroups(groups(G.PROJ, G.TERRAIN | G.PROP | G.GATE))
        .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
      { ccd: true, gravity: 0.35, vel: v, ang: { x: 20, y: 0, z: 0 } });
    this.body = body; this.col = col;
    game.phys.own(col, this);
    const g = new THREE.Group();
    g.add(part(GEO.ico(1), mat('#b9774a'), 0, 0, 0.01, 0.07, 0.07, 0.09));
    g.add(part(GEO.ico(1), mat('#6e4630'), 0, 0, -0.05, 0.075, 0.075, 0.04));
    this.mesh = g;
    game.scene.add(g);
    this.prev = from.clone();
    this.life = 1.6;
    this.bounced = -1;
    this.dead = false;
  }
  onCollide(other) {
    if (other && other.onHit) other.onHit(this);
    if (this.bounced < 0) { this.bounced = 0; this.game.fx.puff(this.pos(), 3, '#e6c49c'); Audio.play('hit'); }
  }
  pos() { const t = this.body.translation(); return tmp.set(t.x, t.y, t.z); }
  update(dt) {
    this.life -= dt;
    if (this.bounced >= 0) this.bounced += dt;
    const p = this.pos();
    if (this.bounced < 0.15) {
      const e = this.game.hitEnemySegment(this.prev, p, 0.12);
      if (e) {
        this.game.damageEnemy(e, this.dmg, { crit: this.crit, proc: this.proc, from: this.prev, knock: 2.5 });
        this.dead = true;
      }
    }
    this.prev.copy(p);
    this.mesh.position.copy(p);
    const r = this.body.rotation();
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    if (this.life <= 0 || this.bounced > 0.5 || p.y < -20) this.dead = true;
  }
  destroy() { this.game.phys.removeBody(this.body); this.game.scene.remove(this.mesh); }
}

export class StarFall {
  constructor(game, target, dmg, delay) {
    this.game = game;
    this.kind = 'star';
    this.dmg = dmg;
    this.delay = delay;
    this.target = target.clone();
    this.started = false;
    this.dead = false;
    this.mesh = part(GEO.oct(), mat('#ffe08a', { emissive: 0xc09030 }), 0, -999, 0, 0.22, 0.32, 0.22);
    game.scene.add(this.mesh);
  }
  start() {
    const t = this.target;
    const { body, col } = dynBody(this.game, t.x, t.y + 12, t.z,
      R.ColliderDesc.ball(0.2).setCollisionGroups(groups(G.PROJ, G.TERRAIN | G.PROP | G.GATE)).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
      { ccd: true, gravity: 0, vel: { x: 0, y: -26, z: 0 } });
    this.body = body; this.col = col;
    this.game.phys.own(col, this);
    this.started = true;
  }
  onCollide(other) { if (other && other.onHit) other.onHit(this); this.explode(); }
  explode() {
    if (this.dead) return;
    const t = this.body.translation();
    const p = new THREE.Vector3(t.x, t.y, t.z);
    this.game.explode(p, 2.4, this.dmg, '#ffe08a');
    this.dead = true;
  }
  update(dt) {
    if (!this.started) { this.delay -= dt; if (this.delay <= 0) this.start(); return; }
    const t = this.body.translation();
    this.mesh.position.set(t.x, t.y, t.z);
    this.mesh.rotation.y += dt * 12;
    this.game.fx.emit(t.x, t.y + 0.3, t.z, 0, 1, 0, '#fff2b8', 0.25, 0.4, 0);
    const p = tmp.set(t.x, t.y, t.z);
    for (const e of this.game.enemies) if (!e.dead && e.center().distanceTo(p) < e.r + 0.3) { this.explode(); return; }
    if (t.y < this.target.y - 4) this.explode();
  }
  destroy() { if (this.body) this.game.phys.removeBody(this.body); this.game.scene.remove(this.mesh); }
}

/* ---------------- Proyectiles enemigos ---------------- */
export class EnemyOrb {
  constructor(game, from, dir, dmg, o = {}) {
    this.game = game;
    this.kind = 'eorb';
    this.dmg = dmg;
    const v = dir.clone().multiplyScalar(o.speed || 7);
    const { body, col } = dynBody(game, from.x, from.y, from.z,
      R.ColliderDesc.ball(o.r || 0.16).setCollisionGroups(groups(G.EPROJ, G.TERRAIN | G.GATE)).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
      { gravity: 0, vel: v });
    this.body = body;
    game.phys.own(col, this);
    this.mesh = part(GEO.ico(1), mat(o.color || '#ff9ec0', { emissive: o.emissive || 0x9a3060 }), 0, 0, 0, o.r || 0.16);
    game.scene.add(this.mesh);
    this.life = o.life || 4;
    this.color = o.color || '#ff9ec0';
    this.dead = false;
  }
  onCollide() { this.dead = true; this.game.fx.burst(this.pos(), this.color, 6, 2); }
  pos() { const t = this.body.translation(); return tmp.set(t.x, t.y, t.z); }
  update(dt) {
    this.life -= dt;
    const p = this.pos();
    this.mesh.position.copy(p);
    if (Math.random() < 0.5) this.game.fx.emit(p.x, p.y, p.z, 0, 0, 0, this.color, 0.16, 0.25, 0);
    const pl = this.game.player;
    if (pl.center.distanceTo(p) < 0.38) { this.game.hurtPlayer(this.dmg, p); this.dead = true; }
    if (this.life <= 0) this.dead = true;
  }
  destroy() { this.game.phys.removeBody(this.body); this.game.scene.remove(this.mesh); }
}

/* ---------------- Recogibles ---------------- */
const PICK = {
  spark: { r: 0.09, color: '#ffd36e', em: 0x8a6010, geo: 'oct', s: 0.1 },
  xp: { r: 0.06, color: '#9ce8d2', em: 0x2a7a66, geo: 'ico', s: 0.065 },
  heal: { r: 0.14, color: '#ff9fb2', em: 0x7a2a3a, geo: 'ico', s: 0.15 },
  item: { r: 0.2, color: '#ffffff', em: 0x555555, geo: 'box', s: 0.26 },
  fragment: { r: 0.25, color: '#fff0b0', em: 0xb08a30, geo: 'oct', s: 0.3 },
};
export class Pickup {
  constructor(game, type, pos, value, o = {}) {
    this.game = game;
    this.type = type;
    this.value = value;
    this.kind = 'pickup';
    const d = PICK[type];
    const color = o.color || d.color;
    this.color = color;
    const vel = o.vel || { x: (Math.random() - 0.5) * 3, y: 3 + Math.random() * 3, z: (Math.random() - 0.5) * 3 };
    this.floating = !!o.floating;
    if (!this.floating) {
      const { body, col } = dynBody(game, pos.x, pos.y, pos.z,
        R.ColliderDesc.ball(d.r).setRestitution(0.5).setFriction(0.6).setCollisionGroups(groups(G.PICKUP, G.TERRAIN | G.GATE)),
        { vel, damp: 0.3 });
      this.body = body;
    }
    this.p = new THREE.Vector3(pos.x, pos.y, pos.z);
    this.mesh = part(GEO[d.geo](d.geo === 'ico' ? 1 : undefined), mat(color, { emissive: o.emissive ?? d.em }), pos.x, pos.y, pos.z, d.s);
    if (type === 'item' || type === 'fragment') {
      this.halo = part(GEO.ico(1), mat(color, { basic: true, transparent: true, opacity: 0.25, depthWrite: false }), 0, 0, 0, 2.2);
      this.halo.castShadow = false;
      this.mesh.add(this.halo);
    }
    game.scene.add(this.mesh);
    this.age = 0;
    this.magnet = false;
    this.dead = false;
    this.life = o.life || (type === 'xp' || type === 'spark' ? 40 : 1e9);
  }
  update(dt, t) {
    this.age += dt;
    this.life -= dt;
    const pl = this.game.player.center;
    if (this.body) {
      const b = this.body.translation();
      this.p.set(b.x, b.y, b.z);
      const range = this.type === 'item' || this.type === 'fragment' ? 1.6 : this.game.stats.magnet;
      if (!this.magnet && this.age > 0.5 && this.p.distanceTo(pl) < range) {
        this.magnet = true;
        this.body.setGravityScale(0, true);
        this.col = null;
      }
      if (this.magnet) {
        tmp.subVectors(pl, this.p);
        const d = tmp.length();
        tmp.multiplyScalar(Math.min(22, 4 + this.age * 8) / Math.max(d, 0.001));
        this.body.setLinvel({ x: tmp.x, y: tmp.y, z: tmp.z }, true);
      }
      if (this.p.y < -20) this.dead = true;
    } else {
      this.p.y += Math.sin(t * 2 + this.age) * dt * 0.2;
    }
    this.mesh.position.copy(this.p);
    this.mesh.rotation.y += dt * 2.5;
    if (this.type === 'item' || this.type === 'fragment') {
      this.mesh.position.y += 0.15 + Math.sin(t * 3) * 0.08;
      if (Math.random() < 0.2) this.game.fx.sparkle(this.p, this.color, 1, 0.5);
    }
    if (this.p.distanceTo(pl) < (this.floating ? 0.8 : 0.45) && this.age > 0.25) { this.game.collect(this); this.dead = true; }
    if (this.life <= 0) this.dead = true;
  }
  destroy() { if (this.body) this.game.phys.removeBody(this.body); this.game.scene.remove(this.mesh); }
}

/* ---------------- Esquirlas físicas ---------------- */
export class Debris {
  constructor(game, pos, color, size, vel) {
    this.game = game;
    const { body } = dynBody(game, pos.x, pos.y, pos.z,
      R.ColliderDesc.cuboid(size, size, size).setRestitution(0.3).setFriction(0.8).setDensity(1).setCollisionGroups(groups(G.DEBRIS, G.TERRAIN | G.DEBRIS | G.PROP | G.GATE)),
      { vel, ang: { x: (Math.random() - 0.5) * 12, y: (Math.random() - 0.5) * 12, z: (Math.random() - 0.5) * 12 } });
    this.body = body;
    this.mesh = part(GEO.box(), mat(color), pos.x, pos.y, pos.z, size * 2);
    game.scene.add(this.mesh);
    this.life = 2.5 + Math.random() * 1.5;
    this.size = size * 2;
    this.dead = false;
  }
  update(dt) {
    this.life -= dt;
    const t = this.body.translation(), r = this.body.rotation();
    this.mesh.position.set(t.x, t.y, t.z);
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    if (this.life < 0.5) this.mesh.scale.setScalar(this.size * Math.max(0.01, this.life / 0.5));
    if (this.life <= 0 || t.y < -20) this.dead = true;
  }
  destroy() { this.game.phys.removeBody(this.body); this.game.scene.remove(this.mesh); }
}
