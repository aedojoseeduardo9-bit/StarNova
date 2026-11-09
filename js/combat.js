/* Star Nova — proyectiles, trampas, zonas, aliados, recogibles y esquirlas, todos con Rapier o lógica simple. */
import * as THREE from 'three';
import { R, G, groups } from './physics.js';
import { mat, GEO, part } from './entities/models.js';
import { Audio } from './audio.js';

const tmp = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

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

/* Mallas de proyectil (geometría y material compartidos). */
function shotMesh(model, color) {
  const g = new THREE.Group();
  switch (model) {
    case 'acorn':
      g.add(part(GEO.ico(1), mat(color === '#c98a4b' ? '#b9774a' : color, { emissive: color === '#c98a4b' ? 0 : 0x402010 }), 0, 0, 0.01, 0.07, 0.07, 0.09));
      g.add(part(GEO.ico(1), mat('#6e4630'), 0, 0, -0.05, 0.075, 0.075, 0.04));
      break;
    case 'seed': g.add(part(GEO.ico(1), mat(color, { emissive: 0x204010 }), 0, 0, 0, 0.05, 0.05, 0.08)); break;
    case 'thorn': { const c = part(GEO.cone(5), mat(color, { emissive: 0x401020 }), 0, 0, 0, 0.05, 0.3, 0.05); c.rotation.x = Math.PI / 2; g.add(c); break; }
    case 'pine': g.add(part(GEO.ico(1), mat('#a0703a'), 0, 0, 0, 0.13, 0.17, 0.13)); g.add(part(GEO.ico(0), mat(color), 0, 0.03, 0, 0.15, 0.1, 0.15)); break;
    case 'star': g.add(part(GEO.oct(), mat(color, { emissive: 0xa08030 }), 0, 0, 0, 0.13, 0.18, 0.13)); break;
    case 'leaf': g.add(part(GEO.ico(1), mat(color, { emissive: 0x204010 }), 0, 0, 0, 0.16, 0.03, 0.09)); break;
    default: {
      g.add(part(GEO.ico(1), mat(color, { emissive: new THREE.Color(color).multiplyScalar(0.5).getHex() }), 0, 0, 0, 0.09));
      const halo = part(GEO.ico(1), mat(color, { basic: true, transparent: true, opacity: 0.3, depthWrite: false }), 0, 0, 0, 0.18);
      halo.castShadow = false;
      g.add(halo);
    }
  }
  return g;
}

/* ---------------- Proyectil del jugador (todos los tipos de ataque) ---------------- */
export class Shot {
  constructor(game, from, dir, o) {
    this.game = game;
    this.kind = 'shot';
    this.o = o;
    this.dmg = o.dmg;
    this.crit = !!o.crit;
    this.color = o.color || '#c98a4b';
    this.pierce = o.pierce || 0;
    this.bounces = o.bounces || 0;
    this.hitSet = new Set();
    const speed = (o.speed || 30) * (game.stats ? game.stats.projSpeed : 1);
    const v = dir.clone().multiplyScalar(speed);
    const grav = o.gravity !== undefined ? o.gravity : (o.homing || o.boomerang ? 0 : 0.3);
    const { body, col } = dynBody(game, from.x, from.y, from.z,
      R.ColliderDesc.ball(o.r || 0.08).setDensity(3).setRestitution(0.45)
        .setCollisionGroups(groups(G.PROJ, G.TERRAIN | G.PROP | G.GATE))
        .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
      { ccd: true, gravity: grav, vel: v, ang: { x: 18, y: 0, z: 0 } });
    this.body = body; this.col = col;
    game.phys.own(col, this);
    this.mesh = shotMesh(o.model || 'orb', this.color);
    if (o.big) this.mesh.scale.setScalar(o.big);
    game.scene.add(this.mesh);
    this.prev = from.clone();
    this.life = o.life || (o.boomerang ? 2.2 : 1.8);
    this.age = 0;
    this.bounced = -1;
    this.returning = false;
    this.dead = false;
    this.speed = speed;
  }
  pos() { const t = this.body.translation(); return tmp.set(t.x, t.y, t.z); }
  onCollide(other) {
    if (this.o.mine) { if (!this.landed) { this.landed = true; this.body.setLinearDamping(6); this.body.setAngularDamping(6); } return; }
    if (other && other.onHit) other.onHit(this);
    if (this.o.boomerang) { this.returning = true; return; }
    if (this.o.splash && this.bounced < 0) { this.detonate(); return; }
    if (this.bounced < 0) { this.bounced = 0; this.game.fx.puff(this.pos(), 3, '#e6c49c'); Audio.play('hit'); }
  }
  detonate() {
    if (this.dead) return;
    const p = this.pos().clone();
    this.game.explodeAt(p, this.o.splash * (1 + 0.08 * (this.o.tier || 0)), this.dmg * 0.85, this.color, false, this.o);
    this.dead = true;
  }
  retarget(from) {
    let best = null, bd = 9;
    for (const e of this.game.enemies) {
      if (e.dead || e.untargetable || this.hitSet.has(e)) continue;
      const d = e.center().distanceTo(from);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  update(dt) {
    this.life -= dt;
    this.age += dt;
    if (this.bounced >= 0) this.bounced += dt;
    const p = this.pos();
    const game = this.game;
    // buscador: curva hacia su objetivo
    if (this.o.homing) {
      if (!this.target || this.target.dead) this.target = this.retarget(p);
      if (this.target && this.age > 0.08) {
        const v = this.body.linvel();
        const want = this.target.center().sub(p).normalize().multiplyScalar(this.speed);
        const k = Math.min(1, dt * 7);
        this.body.setLinvel({ x: v.x + (want.x - v.x) * k, y: v.y + (want.y - v.y) * k, z: v.z + (want.z - v.z) * k }, true);
      }
    }
    // bumerán: vuelve a Pip
    if (this.o.boomerang) {
      if (this.age > 0.42) this.returning = true;
      if (this.returning) {
        const want = game.player.center.clone().sub(p);
        const d = want.length();
        want.normalize().multiplyScalar(this.speed * 1.1);
        this.body.setLinvel({ x: want.x, y: want.y, z: want.z }, true);
        if (d < 0.5) this.dead = true;
      }
      this.mesh.rotation.y += dt * 25;
    }
    // trampa: se queda quieta y explota al acercarse un enemigo
    if (this.o.mine) {
      if (this.age > 0.6) {
        this.mesh.children[0] && (this.mesh.children[0].material = this.age % 0.5 < 0.25 ? mat('#ff7a7a', { emissive: 0xa02020 }) : mat(this.color));
        for (const e of game.enemies) if (!e.dead && !e.untargetable && e.center().distanceTo(p) < 1.6 + e.r) { this.detonate(); return; }
      }
    } else if (this.bounced < 0.12) {
      // impacto contra enemigos (segmento entre la posición anterior y la actual)
      const e = game.hitEnemySegment(this.prev, p, this.o.big ? 0.3 : 0.12, this.hitSet);
      if (e) {
        game.hitWithShot(e, this);
        if (this.o.splash) { this.detonate(); return; }
        if (this.pierce > 0) { this.pierce--; this.hitSet.add(e); }
        else if (this.bounces > 0) {
          this.bounces--; this.hitSet.add(e);
          const n = this.retarget(p);
          if (n) { const d = n.center().sub(p).normalize().multiplyScalar(this.speed); this.body.setLinvel({ x: d.x, y: d.y, z: d.z }, true); this.body.setGravityScale(0, true); }
          else this.dead = true;
        } else if (!this.o.boomerang) this.dead = true;
        else this.hitSet.add(e);
      }
    }
    this.prev.copy(p);
    this.mesh.position.copy(p);
    if (this.o.model === 'thorn' || this.o.model === 'seed') {
      const v = this.body.linvel();
      tmp.set(v.x, v.y, v.z);
      if (tmp.lengthSq() > 0.01) this.mesh.lookAt(p.x + v.x, p.y + v.y, p.z + v.z);
    } else if (!this.o.boomerang) {
      const r = this.body.rotation();
      this.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
    if (this.o.trail && Math.random() < 0.5) game.fx.emit(p.x, p.y, p.z, 0, 0, 0, this.color, 0.12, 0.3, 0);
    if (this.life <= 0 && this.o.splash && !this.dead && !this.o.mine) { this.detonate(); return; }
    if (this.life <= 0 || (this.bounced > 0.5 && !this.o.mine) || p.y < -20) this.dead = true;
  }
  destroy() { this.game.phys.removeBody(this.body); this.game.scene.remove(this.mesh); }
}

/* Estrella o meteoro que cae del cielo sobre un punto. */
export class StarFall {
  constructor(game, target, dmg, delay, o = {}) {
    this.game = game;
    this.kind = 'star';
    this.dmg = dmg;
    this.delay = delay;
    this.o = o;
    this.target = target.clone();
    this.started = false;
    this.dead = false;
    this.size = o.size || 1;
    this.mesh = part(GEO.oct(), mat(o.color || '#ffe08a', { emissive: 0xc09030 }), 0, -999, 0, 0.22 * this.size, 0.32 * this.size, 0.22 * this.size);
    game.scene.add(this.mesh);
  }
  start() {
    const t = this.target;
    const { body, col } = dynBody(this.game, t.x, t.y + 12 * Math.max(1, this.size * 0.7), t.z,
      R.ColliderDesc.ball(0.2 * this.size).setCollisionGroups(groups(G.PROJ, G.TERRAIN | G.PROP | G.GATE)).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
      { ccd: true, gravity: 0, vel: { x: 0, y: -26, z: 0 } });
    this.body = body;
    this.game.phys.own(col, this);
    this.started = true;
  }
  onCollide(other) { if (other && other.onHit) other.onHit(this); this.explode(); }
  explode() {
    if (this.dead) return;
    const t = this.body.translation();
    this.game.explodeAt(new THREE.Vector3(t.x, t.y, t.z), (this.o.splash || 2.4), this.dmg, this.o.color || '#ffe08a', false, this.o.effects || null);
    if (this.size > 2) this.game.cam.shake = Math.max(this.game.cam.shake, 0.6);
    this.dead = true;
  }
  update(dt) {
    if (!this.started) { this.delay -= dt; if (this.delay <= 0) this.start(); return; }
    const t = this.body.translation();
    this.mesh.position.set(t.x, t.y, t.z);
    this.mesh.rotation.y += dt * 12;
    this.game.fx.emit(t.x, t.y + 0.3 * this.size, t.z, 0, 1, 0, this.o.color || '#fff2b8', 0.25 * this.size, 0.4, 0);
    const p = tmp.set(t.x, t.y, t.z);
    for (const e of this.game.enemies) if (!e.dead && !e.untargetable && e.center().distanceTo(p) < e.r + 0.3 * this.size) { this.explode(); return; }
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
      { gravity: o.gravity || 0, vel: v });
    this.body = body;
    game.phys.own(col, this);
    this.boulder = !!o.boulder;
    this.mesh = part(o.boulder ? GEO.ico(0) : GEO.ico(1), mat(o.color || '#ff9ec0', { emissive: o.emissive || 0x9a3060 }), 0, 0, 0, o.r || 0.16);
    game.scene.add(this.mesh);
    this.life = o.life || 4;
    this.color = o.color || '#ff9ec0';
    this.r = o.r || 0.16;
    this.dead = false;
  }
  onCollide() {
    this.dead = true;
    if (this.boulder) this.game.slam(this.pos().clone(), 2, this.dmg, false);
    else this.game.fx.burst(this.pos(), this.color, 6, 2);
  }
  pos() { const t = this.body.translation(); return tmp.set(t.x, t.y, t.z); }
  update(dt) {
    this.life -= dt;
    const p = this.pos();
    this.mesh.position.copy(p);
    if (this.boulder) this.mesh.rotation.x += dt * 6;
    else if (Math.random() < 0.5) this.game.fx.emit(p.x, p.y, p.z, 0, 0, 0, this.color, 0.16, 0.25, 0);
    const pl = this.game.player;
    if (pl.center.distanceTo(p) < 0.25 + this.r) { this.game.hurtPlayer(this.dmg, p); this.dead = true; }
    if (this.life <= 0) this.dead = true;
  }
  destroy() { this.game.phys.removeBody(this.body); this.game.scene.remove(this.mesh); }
}

/* ---------------- Zonas: agujero negro y nube de veneno ---------------- */
export class VoidHole {
  constructor(game, pos, o) {
    this.game = game; this.p = pos.clone(); this.o = o;
    this.life = o.life || 2.5; this.r = o.r || 3.2; this.dead = false; this.tick = 0;
    const g = new THREE.Group();
    g.add(part(GEO.ico(2), mat('#1d1640', { emissive: 0x0a0520 }), 0, 0, 0, 0.45 * (o.big || 1)));
    this.ring = part(GEO.torus(), mat('#8f7ad8', { basic: true, transparent: true, opacity: 0.7, depthWrite: false }), 0, 0, 0, this.r * 0.5, this.r * 0.5, 0.15);
    this.ring.rotation.x = Math.PI / 2;
    g.add(this.ring);
    g.position.copy(this.p);
    this.mesh = g;
    game.scene.add(g);
    Audio.play('rumble');
  }
  update(dt) {
    const game = this.game;
    this.life -= dt;
    this.ring.rotation.z += dt * 4;
    this.ring.scale.setScalar(this.r * 0.5 * (0.8 + Math.sin(this.life * 10) * 0.1));
    this.tick -= dt;
    for (const e of game.enemies) {
      if (e.dead || e.untargetable) continue;
      const c = e.center();
      const d = c.distanceTo(this.p);
      if (d < this.r + e.r) {
        if (!e.isBoss) { tmp.subVectors(this.p, c).setY(0).normalize().multiplyScalar(Math.min(d, (this.o.pull || 5) * dt)); e.pos.add(tmp); }
        if (this.tick <= 0) game.damageEnemy(e, this.o.dps * 0.25, { color: '#c8b8ff' });
      }
    }
    if (this.tick <= 0) this.tick = 0.25;
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * Math.PI * 2, r = this.r * (0.6 + Math.random() * 0.4);
      game.fx.emit(this.p.x + Math.cos(a) * r, this.p.y + (Math.random() - 0.5), this.p.z + Math.sin(a) * r, -Math.cos(a) * r * 2, 0, -Math.sin(a) * r * 2, '#8f7ad8', 0.14, 0.4, 0);
    }
    if (this.life <= 0) { this.dead = true; game.explodeAt(this.p, this.r * 0.8, this.o.dps * 0.6, '#8f7ad8', false); }
  }
  destroy() { this.game.scene.remove(this.mesh); }
}

export class PoisonCloud {
  constructor(game, pos, o) {
    this.game = game; this.p = pos.clone(); this.o = o;
    this.life = o.life || 3; this.r = o.r || 1.8; this.dead = false; this.tick = 0;
    this.mesh = part(GEO.ico(2), mat('#a6d86a', { basic: true, transparent: true, opacity: 0.28, depthWrite: false }), this.p.x, this.p.y, this.p.z, this.r, this.r * 0.5, this.r);
    this.mesh.castShadow = false;
    game.scene.add(this.mesh);
  }
  update(dt) {
    this.life -= dt; this.tick -= dt;
    if (this.tick <= 0) {
      this.tick = 0.5;
      for (const e of this.game.enemies) if (!e.dead && e.center().distanceTo(this.p) < this.r + e.r) { e.poisonT = Math.max(e.poisonT, 2); e.poisonDps = Math.max(e.poisonDps, this.o.dps); }
    }
    if (Math.random() < 0.5) this.game.fx.emit(this.p.x + (Math.random() - 0.5) * this.r * 2, this.p.y, this.p.z + (Math.random() - 0.5) * this.r * 2, 0, 0.6, 0, '#a6d86a', 0.2, 0.7, 0);
    this.mesh.material.opacity = 0.28 * Math.min(1, this.life);
    if (this.life <= 0) this.dead = true;
  }
  destroy() { this.game.scene.remove(this.mesh); }
}

/* ---------------- Aliados: torre, espíritus, lechuza, orbe guardián, luciérnaga ---------------- */
function nearestEnemy(game, p, range) {
  let best = null, bd = range;
  for (const e of game.enemies) { if (e.dead || e.untargetable) continue; const d = e.center().distanceTo(p); if (d < bd) { bd = d; best = e; } }
  return best;
}

export class Turret {
  constructor(game, pos) {
    this.game = game; this.p = pos.clone(); this.life = 10; this.cool = 0; this.dead = false;
    const g = new THREE.Group();
    g.add(part(GEO.cyl(8), mat('#f5dcc0'), 0, 0.3, 0, 0.3, 0.6, 0.3));
    g.add(part(GEO.box(), mat('#c98a4b'), 0, 0.7, 0, 0.36, 0.3, 0.36));
    this.head = new THREE.Group(); this.head.position.y = 0.75;
    this.head.add(part(GEO.cyl(6), mat('#6e4630'), 0, 0, 0.25, 0.07, 0.4, 0.07));
    this.head.children[0].rotation.x = Math.PI / 2;
    g.add(this.head);
    g.add(part(GEO.dome ? GEO.ico(1) : GEO.ico(1), mat('#ee9a8b'), 0, 0.95, 0, 0.22, 0.12, 0.22));
    g.position.copy(this.p);
    this.mesh = g; game.scene.add(g);
    game.fx.burst(this.p, '#ffe0c0', 16, 3);
  }
  update(dt) {
    this.life -= dt; this.cool -= dt;
    const from = this.p.clone().add(new THREE.Vector3(0, 0.8, 0));
    const e = nearestEnemy(this.game, from, 18);
    if (e) {
      const d = e.center().sub(from).normalize();
      this.head.rotation.y = Math.atan2(d.x, d.z);
      if (this.cool <= 0) {
        this.cool = 0.32;
        this.game.addPlayerShot(new Shot(this.game, from.addScaledVector(d, 0.4), d, { dmg: this.game.stats.dmg * 0.7, model: 'acorn', color: '#c98a4b', speed: 30 }));
      }
    }
    if (this.life <= 0) { this.dead = true; this.game.fx.burst(this.p, '#ffe0c0', 12, 2); }
  }
  destroy() { this.game.scene.remove(this.mesh); }
}

export class Spirit {
  constructor(game, idx, life = 8) {
    this.game = game; this.idx = idx; this.life = life; this.cool = idx * 0.2; this.dead = false;
    const g = new THREE.Group();
    const m = mat('#ffe0c0', { basic: true, transparent: true, opacity: 0.55, depthWrite: false });
    g.add(part(GEO.ico(1), m, 0, 0.2, 0, 0.15, 0.14, 0.17));
    g.add(part(GEO.ico(1), m, 0, 0.38, 0.08, 0.13));
    g.add(part(GEO.ico(1), m, 0, 0.35, -0.2, 0.12, 0.2, 0.1));
    g.children.forEach(c => { c.castShadow = false; });
    this.mesh = g; game.scene.add(g);
    this.p = new THREE.Vector3();
  }
  update(dt, t) {
    this.life -= dt; this.cool -= dt;
    const pl = this.game.player;
    const a = t * 1.5 + this.idx * Math.PI;
    this.p.set(pl.pos.x + Math.cos(a) * 1.1, pl.pos.y + 0.6 + Math.sin(t * 3 + this.idx) * 0.1, pl.pos.z + Math.sin(a) * 1.1);
    this.mesh.position.copy(this.p);
    this.mesh.rotation.y = pl.yaw;
    if (this.cool <= 0) {
      const e = nearestEnemy(this.game, this.p, 20);
      if (e) {
        this.cool = 0.4;
        const d = e.center().sub(this.p).normalize();
        this.game.addPlayerShot(new Shot(this.game, this.p.clone().addScaledVector(d, 0.3), d, { dmg: this.game.stats.dmg * 0.8, model: 'orb', color: '#ffe0c0', speed: 28 }));
      }
    }
    if (this.life <= 0) { this.dead = true; this.game.fx.burst(this.p, '#ffe0c0', 10, 2); }
  }
  destroy() { this.game.scene.remove(this.mesh); }
}

export class OwlSpirit {
  constructor(game, from, dir, dmg) {
    this.game = game; this.p = from.clone(); this.dir = dir.clone().setY(0).normalize(); this.dmg = dmg; this.life = 1.6; this.dead = false; this.hit = new Set();
    const g = new THREE.Group();
    const m = mat('#d8ccf0', { basic: true, transparent: true, opacity: 0.7, depthWrite: false });
    g.add(part(GEO.ico(1), m, 0, 0, 0, 0.5, 0.55, 0.45));
    for (const s of [-1, 1]) g.add(part(GEO.ico(1), m, s * 0.9, 0.15, 0, 0.8, 0.08, 0.4));
    g.children.forEach(c => { c.castShadow = false; });
    this.mesh = g; game.scene.add(g);
    Audio.play('special');
  }
  update(dt, t) {
    this.life -= dt;
    this.p.addScaledVector(this.dir, 16 * dt);
    this.mesh.position.copy(this.p);
    this.mesh.rotation.y = Math.atan2(this.dir.x, this.dir.z);
    this.mesh.children[1].rotation.z = Math.sin(t * 20) * 0.4;
    this.mesh.children[2].rotation.z = -Math.sin(t * 20) * 0.4;
    for (const e of this.game.enemies) {
      if (e.dead || this.hit.has(e)) continue;
      if (e.center().distanceTo(this.p) < 1.8 + e.r) { this.hit.add(e); this.game.damageEnemy(e, this.dmg, { knock: 8, from: this.p, up: 4 }); }
    }
    if (Math.random() < 0.8) this.game.fx.emit(this.p.x, this.p.y, this.p.z, 0, 0, 0, '#e8dcff', 0.3, 0.5, 0);
    if (this.life <= 0) this.dead = true;
  }
  destroy() { this.game.scene.remove(this.mesh); }
}

/* Orbes guardianes (objeto "Orbe Guardián"): bellotas que giran alrededor de Pip. */
export class Orbitals {
  constructor(game) { this.game = game; this.meshes = []; this.cool = new Map(); }
  sync(n) {
    while (this.meshes.length < n) { const m = shotMesh('acorn', '#c98a4b'); m.scale.setScalar(1.6); this.game.scene.add(m); this.meshes.push(m); }
    while (this.meshes.length > n) this.game.scene.remove(this.meshes.pop());
  }
  update(dt, t) {
    const n = this.meshes.length;
    if (!n) return;
    const pl = this.game.player;
    for (let i = 0; i < n; i++) {
      const a = t * 3 + (i / n) * Math.PI * 2;
      const m = this.meshes[i];
      m.position.set(pl.pos.x + Math.cos(a) * 1.25, pl.pos.y + 0.35, pl.pos.z + Math.sin(a) * 1.25);
      m.rotation.y = -a;
      for (const e of this.game.enemies) {
        if (e.dead || e.untargetable) continue;
        if (e.center().distanceTo(m.position) < e.r + 0.25) {
          const key = e;
          const last = this.cool.get(key) || 0;
          if (t - last > 0.5) { this.cool.set(key, t); this.game.damageEnemy(e, this.game.stats.dmg * 0.8, { knock: 3, from: m.position, proc: true }); }
        }
      }
    }
  }
}

/* Luciérnaga amiga: flota junto a Pip y dispara. */
export class Drones {
  constructor(game) { this.game = game; this.list = []; }
  sync(n) {
    while (this.list.length < n) {
      const g = new THREE.Group();
      g.add(part(GEO.ico(1), mat('#f6ffb0', { emissive: 0xb0c040 }), 0, 0, 0, 0.09));
      const h = part(GEO.ico(1), mat('#f4ffb8', { basic: true, transparent: true, opacity: 0.25, depthWrite: false }), 0, 0, 0, 0.28);
      h.castShadow = false; g.add(h);
      this.game.scene.add(g);
      this.list.push({ mesh: g, cool: Math.random() });
    }
    while (this.list.length > n) this.game.scene.remove(this.list.pop().mesh);
  }
  update(dt, t) {
    const pl = this.game.player;
    this.list.forEach((d, i) => {
      const a = t * 0.8 + i * 2;
      d.mesh.position.set(pl.pos.x + Math.cos(a) * 0.8, pl.pos.y + 1.1 + Math.sin(t * 2 + i) * 0.15, pl.pos.z + Math.sin(a) * 0.8);
      d.cool -= dt;
      if (d.cool <= 0) {
        const e = nearestEnemy(this.game, d.mesh.position, 16);
        if (e) {
          d.cool = 0.9;
          const dir = e.center().sub(d.mesh.position).normalize();
          this.game.addPlayerShot(new Shot(this.game, d.mesh.position.clone(), dir, { dmg: this.game.stats.dmg * 0.6, model: 'orb', color: '#f6ffb0', speed: 26 }));
        }
      }
    });
  }
}

/* ---------------- Recogibles ---------------- */
const PICK = {
  spark: { r: 0.09, color: '#ffd36e', em: 0x8a6010, geo: 'oct', s: 0.1 },
  xp: { r: 0.06, color: '#9ce8d2', em: 0x2a7a66, geo: 'ico', s: 0.065 },
  heal: { r: 0.14, color: '#ff9fb2', em: 0x7a2a3a, geo: 'ico', s: 0.15 },
  item: { r: 0.2, color: '#ffffff', em: 0x555555, geo: 'box', s: 0.26 },
  attack: { r: 0.2, color: '#ffffff', em: 0x555555, geo: 'oct', s: 0.3 },
  power: { r: 0.2, color: '#ffffff', em: 0x555555, geo: 'ico', s: 0.27 },
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
    this.special = type === 'item' || type === 'attack' || type === 'power' || type === 'fragment';
    if (!this.floating) {
      const { body } = dynBody(game, pos.x, pos.y, pos.z,
        R.ColliderDesc.ball(d.r).setRestitution(0.5).setFriction(0.6).setCollisionGroups(groups(G.PICKUP, G.TERRAIN | G.GATE)),
        { vel, damp: 0.3 });
      this.body = body;
    }
    this.p = new THREE.Vector3(pos.x, pos.y, pos.z);
    this.mesh = part(GEO[d.geo](d.geo === 'ico' ? 1 : undefined), mat(color, { emissive: o.emissive ?? d.em }), pos.x, pos.y, pos.z, d.s);
    if (this.special) {
      this.halo = part(GEO.ico(1), mat(o.halo || color, { basic: true, transparent: true, opacity: 0.3, depthWrite: false }), 0, 0, 0, 2.2);
      this.halo.castShadow = false;
      this.mesh.add(this.halo);
    }
    game.scene.add(this.mesh);
    this.age = 0;
    this.magnet = false;
    this.dead = false;
    this.waitFar = !!o.waitFar;            // armas soltadas: solo se recogen tras alejarse
    this.life = o.life || (type === 'xp' || type === 'spark' ? 40 : 1e9);
  }
  update(dt, t) {
    this.age += dt;
    this.life -= dt;
    const pl = this.game.player.center;
    const dist = this.p.distanceTo(pl);
    if (this.waitFar && dist > 1.8) this.waitFar = false;
    if (this.body) {
      const b = this.body.translation();
      this.p.set(b.x, b.y, b.z);
      const range = this.special ? 1.6 : this.game.stats.magnet;
      if (!this.magnet && !this.waitFar && this.age > 0.5 && dist < range) { this.magnet = true; this.body.setGravityScale(0, true); }
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
    if (this.special) {
      this.mesh.position.y += 0.15 + Math.sin(t * 3) * 0.08;
      if (Math.random() < 0.2) this.game.fx.sparkle(this.p, this.color, 1, 0.5);
    }
    if (!this.waitFar && dist < (this.floating ? 0.8 : 0.45) && this.age > 0.25) { this.game.collect(this); this.dead = true; }
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

export { UP };
