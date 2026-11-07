/* Star Nova — enemigos (cuerpos cinemáticos movidos con el controlador de Rapier). */
import * as THREE from 'three';
import { R, G, groups, GRAVITY } from '../physics.js';
import { makeSombra, makeFarol, makeTotem, makeGuardian } from './models.js';
import { EnemyOrb, Debris } from '../combat.js';
import { Audio } from '../audio.js';

export const ENEMY_DEFS = {
  sombra: { name: 'Sombra', hp: 34, dmg: 9, speed: 3.2, r: 0.42, h: 0.62, xp: 7, sparks: 6, colors: ['#4d4a92', '#7c7bd0', '#2f2d66'], cost: 8 },
  farol: { name: 'Farol', hp: 26, dmg: 7, speed: 3.0, r: 0.42, h: 0.6, xp: 8, sparks: 7, colors: ['#c3a7e6', '#7f63b8', '#fff3c8'], cost: 11, flying: true },
  totem: { name: 'Tótem', hp: 150, dmg: 18, speed: 1.7, r: 0.6, h: 1.65, xp: 24, sparks: 18, colors: ['#9d5d86', '#c77fa4', '#e8a3c0'], cost: 26 },
};

const down = { x: 0, y: -1, z: 0 };

export class Enemy {
  constructor(game, type, pos) {
    this.game = game;
    this.type = type;
    const d = this.def = ENEMY_DEFS[type];
    this.maxHp = this.hp = d.hp * game.hpScale();
    this.dmgMul = game.dmgScale();
    this.r = d.r;
    this.pos = new THREE.Vector3(pos.x, pos.y, pos.z);
    this.vel = new THREE.Vector3();
    this.flying = !!d.flying;
    const hh = d.h / 2;
    this.hh = hh;
    this.body = game.phys.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(pos.x, pos.y + hh, pos.z));
    const desc = this.flying ? R.ColliderDesc.ball(0.38) : R.ColliderDesc.cuboid(d.r * 0.75, hh, d.r * 0.75);
    this.collider = game.phys.world.createCollider(desc.setCollisionGroups(groups(G.ENEMY, G.TERRAIN | G.PROP | G.GATE)), this.body);
    game.phys.own(this.collider, this);
    this.kind = 'enemy';
    this.model = type === 'sombra' ? makeSombra() : type === 'farol' ? makeFarol() : makeTotem();
    this.model.scale.setScalar(0.01);
    game.scene.add(this.model);
    this.spawnT = 0.6;
    this.grounded = false;
    this.hopT = Math.random();
    this.shootT = 1.5 + Math.random() * 2;
    this.slamT = 0;
    this.windup = 0;
    this.flash = 0;
    this.bleed = 0;
    this.bleedDps = 0;
    this.dead = false;
    this.yaw = 0;
    this.wander = Math.random() * Math.PI * 2;
    game.fx.burst(new THREE.Vector3(pos.x, pos.y + 0.4, pos.z), '#2f2d66', 18, 2.5, 0.2, 0.8);
  }

  center() { return new THREE.Vector3(this.pos.x, this.pos.y + this.hh, this.pos.z); }

  groundAhead(dx, dz) {
    const o = { x: this.pos.x + dx * 0.9, y: this.pos.y + 0.6, z: this.pos.z + dz * 0.9 };
    return this.game.phys.ray(o, down, 3.5, groups(0xffff, G.TERRAIN | G.PROP));
  }

  update(dt, t) {
    const game = this.game;
    const pl = game.player;
    if (this.spawnT > 0) { this.spawnT -= dt; this.model.scale.setScalar(Math.max(0.01, 1 - this.spawnT / 0.6)); }
    this.flash = Math.max(0, this.flash - dt);
    if (this.bleed > 0) { this.bleed -= dt; this.hp -= this.bleedDps * dt; if (Math.random() < 0.2) game.fx.emit(this.pos.x, this.pos.y + this.hh, this.pos.z, 0, 1, 0, '#e06f7d', 0.12, 0.5, -4); if (this.hp <= 0) { game.killEnemy(this); return; } }
    const to = new THREE.Vector3(pl.pos.x - this.pos.x, 0, pl.pos.z - this.pos.z);
    const dist = to.length();
    const chase = dist < 34;
    if (dist > 0.01) to.divideScalar(dist);
    let desired = new THREE.Vector3();

    if (this.flying) {
      const target = pl.center.clone().add(new THREE.Vector3(Math.cos(t * 0.7 + this.wander) * 3, 2.2 + Math.sin(t * 1.3 + this.wander) * 0.6, Math.sin(t * 0.7 + this.wander) * 3));
      const d = target.sub(this.center());
      const len = d.length();
      if (chase && len > 0.2) d.multiplyScalar(Math.min(this.def.speed, len * 2) / len); else d.set(0, Math.sin(t) * 0.3, 0);
      this.vel.lerp(d, 1 - Math.exp(-dt * 2));
      desired.copy(this.vel).multiplyScalar(dt);
      this.shootT -= dt;
      if (chase && dist < 22 && this.shootT <= 0 && this.spawnT <= 0) {
        this.shootT = 2.6 + Math.random() * 1.2;
        const from = this.center();
        const dir = pl.center.clone().sub(from).normalize();
        if (!game.phys.ray(from, dir, from.distanceTo(pl.center) - 0.4, groups(0xffff, G.TERRAIN))) {
          game.addProjectile(new EnemyOrb(game, from.addScaledVector(dir, 0.45), dir, this.def.dmg * this.dmgMul, { speed: 7.5 }));
          Audio.play('shoot');
        }
      }
      this.pos.add(desired);
      this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y + this.hh, z: this.pos.z });
    } else {
      // caminantes: la sombra avanza a brincos, el tótem camina y da pisotones
      const isTotem = this.type === 'totem';
      let mx = 0, mz = 0;
      if (chase) { mx = to.x; mz = to.z; } else { this.wander += (Math.random() - 0.5) * dt; mx = Math.cos(this.wander) * 0.4; mz = Math.sin(this.wander) * 0.4; }
      if ((mx || mz) && this.grounded && !this.groundAhead(mx, mz)) { mx = 0; mz = 0; this.wander += Math.PI; }
      if (isTotem) {
        if (this.windup > 0) {
          this.windup -= dt; mx = mz = 0;
          if (this.windup <= 0) { game.slam(this.pos.clone(), 2.8, this.def.dmg * this.dmgMul * 1.4); this.slamT = 2.2; }
        } else {
          this.slamT -= dt;
          if (chase && dist < 2.3 && this.slamT <= 0 && this.grounded) { this.windup = 0.75; }
        }
        const sp = this.def.speed * (chase ? 1 : 0.5);
        this.vel.x = mx * sp; this.vel.z = mz * sp;
      } else {
        this.hopT -= dt;
        if (this.grounded) {
          this.vel.x *= 0.7; this.vel.z *= 0.7;
          if (this.hopT <= 0 && this.spawnT <= 0) {
            this.hopT = 0.55 + Math.random() * 0.4;
            const sp = this.def.speed * (chase ? 1 : 0.5);
            this.vel.x = mx * sp; this.vel.z = mz * sp; this.vel.y = 5.2;
          }
        }
      }
      this.vel.y += GRAVITY * dt;
      desired.set(this.vel.x * dt, this.vel.y * dt, this.vel.z * dt);
      const cc = game.phys.ccEnemy;
      cc.computeColliderMovement(this.collider, desired, R.QueryFilterFlags.EXCLUDE_SENSORS, groups(G.ENEMY, G.TERRAIN | G.PROP | G.GATE));
      const m = cc.computedMovement();
      this.pos.x += m.x; this.pos.y += m.y; this.pos.z += m.z;
      this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y + this.hh, z: this.pos.z });
      this.grounded = cc.computedGrounded() && this.vel.y <= 0;
      if (this.grounded) this.vel.y = -0.5;
      if (this.pos.y < -16) { this.dead = true; return; }
    }

    // daño por contacto
    if (this.spawnT <= 0 && pl.center.distanceTo(this.center()) < this.r + 0.32) game.hurtPlayer(this.def.dmg * this.dmgMul, this.center());

    // orientación y animación
    const targetYaw = Math.atan2(to.x, to.z);
    let dy = targetYaw - this.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.yaw += dy * Math.min(1, dt * 5);
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.yaw;
    const u = this.model.userData;
    if (this.type === 'sombra') {
      const air = !this.grounded;
      u.inner.scale.set(air ? 0.9 : 1.08, air ? 1.15 : 0.9, air ? 0.9 : 1.08);
      u.inner.rotation.x = air ? -0.2 : 0;
    } else if (this.type === 'farol') {
      u.ring.rotation.z = t * 2;
      u.inner.position.y = Math.sin(t * 3 + this.wander) * 0.06;
    } else if (this.type === 'totem') {
      const w = this.windup > 0 ? 1 - this.windup / 0.75 : 0;
      u.inner.position.y = w * 0.4;
      u.inner.rotation.z = this.windup > 0 ? Math.sin(t * 40) * 0.05 : Math.sin(t * 4) * 0.03;
    }
    u.inner.visible = !(this.flash > 0 && Math.floor(t * 30) % 2 === 0);
  }

  destroy() {
    this.game.phys.removeBody(this.body);
    this.game.scene.remove(this.model);
  }
}

/* El Guardián de Nova: jefe final con fases. */
export class Guardian {
  constructor(game, pos) {
    this.game = game;
    this.kind = 'enemy';
    this.type = 'guardian';
    this.isBoss = true;
    this.def = { name: 'El Guardián de Nova', dmg: 22, xp: 300, sparks: 160, colors: ['#3e4288', '#5a5fae', '#8e94d6'] };
    this.maxHp = this.hp = 2600 * game.hpScale();
    this.dmgMul = game.dmgScale();
    this.r = 1.9;
    this.hh = 1.7;
    this.home = new THREE.Vector3(pos.x, pos.y, pos.z);
    this.pos = new THREE.Vector3(pos.x, pos.y + 8, pos.z);
    this.body = game.phys.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(this.pos.x, this.pos.y + this.hh, this.pos.z));
    this.collider = game.phys.world.createCollider(R.ColliderDesc.cuboid(1.5, 1.6, 1.5).setCollisionGroups(groups(G.ENEMY, G.PROJ)), this.body);
    game.phys.own(this.collider, this);
    this.model = makeGuardian();
    game.scene.add(this.model);
    this.phase = 'intro';
    this.timer = 2.5;
    this.yaw = 0;
    this.flash = 0;
    this.bleed = 0; this.bleedDps = 0;
    this.dead = false;
    this.cycle = 0;
    this.slamY = 0;
    Audio.play('boss');
  }
  center() { return new THREE.Vector3(this.pos.x, this.pos.y + this.hh, this.pos.z); }
  update(dt, t) {
    const game = this.game, pl = game.player;
    this.flash = Math.max(0, this.flash - dt);
    if (this.bleed > 0) { this.bleed -= dt; this.hp -= this.bleedDps * dt; if (this.hp <= 0) { game.killEnemy(this); return; } }
    const enraged = this.hp < this.maxHp * 0.4;
    const spd = enraged ? 1.35 : 1;
    this.timer -= dt * spd;
    const hover = new THREE.Vector3(pl.pos.x * 0.5 + this.home.x * 0.5, this.home.y + 5.5, pl.pos.z * 0.5 + this.home.z * 0.5);
    switch (this.phase) {
      case 'intro':
        this.pos.lerp(hover, 1 - Math.exp(-dt * 1.2));
        if (this.timer <= 0) this.next();
        break;
      case 'hover':
        this.pos.lerp(hover, 1 - Math.exp(-dt * 1.5));
        if (this.timer <= 0) this.next();
        break;
      case 'ring': {
        this.pos.lerp(hover, 1 - Math.exp(-dt * 1.5));
        this.ringT = (this.ringT ?? 0) - dt * spd;
        if (this.ringT <= 0 && this.shots > 0) {
          this.ringT = 0.55; this.shots--;
          const n = enraged ? 18 : 14;
          const from = this.center();
          const toP = pl.center.clone().sub(from);
          const tilt = Math.atan2(toP.y, Math.hypot(toP.x, toP.z));
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + this.shots * 0.2;
            const dir = new THREE.Vector3(Math.cos(a) * Math.cos(tilt), Math.sin(tilt), Math.sin(a) * Math.cos(tilt)).normalize();
            game.addProjectile(new EnemyOrb(game, from.clone().addScaledVector(dir, 2), dir, this.def.dmg * this.dmgMul * 0.6, { speed: 6.5, r: 0.22, color: '#ffe08a', emissive: 0x9a7010, life: 6 }));
          }
          Audio.play('special');
        }
        if (this.timer <= 0) this.next();
        break;
      }
      case 'slam-up':
        this.pos.x += (pl.pos.x - this.pos.x) * Math.min(1, dt * 2.5);
        this.pos.z += (pl.pos.z - this.pos.z) * Math.min(1, dt * 2.5);
        this.pos.y += (this.home.y + 9 - this.pos.y) * Math.min(1, dt * 3);
        if (this.timer <= 0) { this.phase = 'slam-down'; this.vy = 0; }
        break;
      case 'slam-down':
        this.vy -= 60 * dt;
        this.pos.y += this.vy * dt;
        if (this.pos.y <= this.home.y) {
          this.pos.y = this.home.y;
          game.slam(this.pos.clone(), 5.5, this.def.dmg * this.dmgMul * 1.2, true);
          this.phase = 'recover'; this.timer = 1.4;
        }
        break;
      case 'recover':
        if (this.timer <= 0) this.next();
        break;
      case 'summon':
        this.pos.lerp(hover, 1 - Math.exp(-dt * 1.5));
        if (!this.summoned) {
          this.summoned = true;
          for (let i = 0; i < (enraged ? 3 : 2); i++) {
            const a = Math.random() * Math.PI * 2;
            game.spawnEnemy('sombra', new THREE.Vector3(this.home.x + Math.cos(a) * 6, this.home.y + 0.3, this.home.z + Math.sin(a) * 6));
          }
          if (enraged) game.spawnEnemy('farol', new THREE.Vector3(this.home.x, this.home.y + 3, this.home.z + 5));
        }
        if (this.timer <= 0) this.next();
        break;
    }
    this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y + this.hh, z: this.pos.z });
    if (pl.center.distanceTo(this.center()) < 2.2) game.hurtPlayer(this.def.dmg * this.dmgMul, this.center());
    const yaw = Math.atan2(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z);
    this.yaw += (yaw - this.yaw) * Math.min(1, dt * 2);
    const u = this.model.userData;
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.yaw;
    u.halo.rotation.z = t * 0.8;
    u.core.rotation.y = t * 3;
    u.orbiters.forEach((o, i) => {
      const a = t * (enraged ? 2.4 : 1.4) + (i / 4) * Math.PI * 2;
      o.position.set(Math.cos(a) * 2.8, 1.8 + Math.sin(t * 2 + i) * 0.5, Math.sin(a) * 2.8);
      o.rotation.set(t, t * 1.3, 0);
    });
    u.inner.visible = !(this.flash > 0 && Math.floor(t * 30) % 2 === 0);
  }
  next() {
    const order = ['ring', 'slam-up', 'hover', 'summon', 'ring', 'slam-up'];
    this.phase = order[this.cycle % order.length];
    this.cycle++;
    this.summoned = false;
    if (this.phase === 'ring') { this.timer = 3.2; this.shots = 3; this.ringT = 0.3; }
    else if (this.phase === 'slam-up') this.timer = 1.6;
    else if (this.phase === 'hover') this.timer = 2.0;
    else if (this.phase === 'summon') this.timer = 2.0;
  }
  destroy() { this.game.phys.removeBody(this.body); this.game.scene.remove(this.model); }
}

export function shatter(game, center, colors, n = 12, size = 0.09) {
  const max = 140;
  for (let i = 0; i < n; i++) {
    if (game.debris.length > max) { const d = game.debris.shift(); d.destroy(); }
    const v = { x: (Math.random() - 0.5) * 6, y: 2 + Math.random() * 5, z: (Math.random() - 0.5) * 6 };
    const p = { x: center.x + (Math.random() - 0.5) * 0.4, y: center.y + (Math.random() - 0.5) * 0.4, z: center.z + (Math.random() - 0.5) * 0.4 };
    game.debris.push(new Debris(game, p, colors[i % colors.length], size * (0.6 + Math.random() * 0.8), v));
  }
}
