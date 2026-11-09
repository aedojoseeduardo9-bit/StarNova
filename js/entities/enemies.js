/* Star Nova — enemigos: 16 comportamientos ("ai"), estados (quemadura, veneno, sangrado, frío, aturdido)
 * y élites. Se mueven con cuerpos cinemáticos y el controlador de personaje de Rapier. */
import * as THREE from 'three';
import { R, G, groups, GRAVITY } from '../physics.js';
import { makeGuardian } from './models.js';
import { makeEnemyModel } from './enemyModels.js';
import { ENEMIES, ELITES } from '../content/enemies.js';
import { EnemyOrb, Debris } from '../combat.js';
import { Audio } from '../audio.js';

export { ENEMIES as ENEMY_DEFS };
const down = { x: 0, y: -1, z: 0 };
const tmp = new THREE.Vector3();

/* Estados alterados compartidos por enemigos y jefe. Devuelve el factor de velocidad. */
export function tickStatus(game, e, dt) {
  let dot = 0;
  if (e.burnT > 0) { e.burnT -= dt; dot += e.burnDps; if (Math.random() < 0.3) game.fx.emit(e.pos.x, e.pos.y + e.hh, e.pos.z, 0, 1.5, 0, '#ff9a5c', 0.14, 0.5, 0); }
  if (e.poisonT > 0) { e.poisonT -= dt; dot += e.poisonDps; if (Math.random() < 0.25) game.fx.emit(e.pos.x, e.pos.y + e.hh, e.pos.z, 0, 0.8, 0, '#a6d86a', 0.14, 0.6, 0); }
  if (e.bleedT > 0) { e.bleedT -= dt; dot += e.bleedDps; if (Math.random() < 0.2) game.fx.emit(e.pos.x, e.pos.y + e.hh, e.pos.z, 0, 1, 0, '#e06f7d', 0.12, 0.5, -4); }
  if (dot > 0) {
    e.hp -= dot * dt;
    e.dotAcc = (e.dotAcc || 0) + dot * dt;
    if (e.dotAcc > 6) { game.hud.number(e.center().add(tmp.set(0, e.hh, 0)), e.dotAcc, false, '#ffb38a'); e.dotAcc = 0; }
    if (e.hp <= 0) { game.killEnemy(e); return 0; }
  }
  let k = 1;
  if (e.slowT > 0) { e.slowT -= dt; k *= e.slowK; }
  if (e.stunT > 0) { e.stunT -= dt; k = 0; }
  if (game.timeSlowT > 0) k *= 0.2;
  if (e.iceMesh) e.iceMesh.visible = e.slowT > 0 && e.slowK < 0.35;
  return k;
}

export class Enemy {
  constructor(game, type, pos, o = {}) {
    this.game = game;
    this.type = type;
    const d = this.def = ENEMIES[type];
    this.elite = o.elite ? ELITES[o.elite] : null;
    const el = this.elite;
    this.small = !!o.small;
    const sizeK = (this.small ? 0.6 : 1) * (el ? 1.22 : 1);
    this.maxHp = this.hp = d.hp * game.hpScale() * (el ? el.hpMul : 1) * (this.small ? 0.45 : 1);
    this.dmgMul = game.dmgScale() * (el ? el.dmgMul : 1);
    this.speed = d.speed * (el ? el.speedMul : 1);
    this.armor = el && el.armor ? el.armor : 0;
    this.r = d.r * sizeK;
    this.hh = d.h / 2 * sizeK;
    this.pos = new THREE.Vector3(pos.x, pos.y, pos.z);
    this.vel = new THREE.Vector3();
    this.flying = !!d.flying;
    this.body = game.phys.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(pos.x, pos.y + this.hh, pos.z));
    const desc = this.flying ? R.ColliderDesc.ball(Math.min(0.45, this.r)) : R.ColliderDesc.cuboid(this.r * 0.72, this.hh, this.r * 0.72);
    this.collider = game.phys.world.createCollider(desc.setCollisionGroups(groups(G.ENEMY, G.TERRAIN | G.PROP | G.GATE)), this.body);
    game.phys.own(this.collider, this);
    this.kind = 'enemy';
    this.model = makeEnemyModel(d, el);
    this.scale = sizeK;
    this.model.scale.setScalar(0.01);
    game.scene.add(this.model);
    // capa de hielo para cuando está congelado
    this.iceMesh = new THREE.Mesh(game.iceGeo, game.iceMat);
    this.iceMesh.scale.set(this.r * 1.5, this.hh * 1.25, this.r * 1.5);
    this.iceMesh.position.y = this.hh / sizeK;
    this.iceMesh.visible = false;
    this.model.add(this.iceMesh);
    this.spawnT = 0.6;
    this.grounded = false;
    this.t = Math.random() * 3;
    this.timer = 1 + Math.random() * 1.5;
    this.state = 'idle';
    this.flash = 0;
    this.burnT = this.poisonT = this.bleedT = this.slowT = this.stunT = 0;
    this.burnDps = this.poisonDps = this.bleedDps = 0;
    this.slowK = 1;
    this.dead = false;
    this.yaw = 0;
    this.wander = Math.random() * Math.PI * 2;
    this.untargetable = false;
    game.fx.burst(new THREE.Vector3(pos.x, pos.y + 0.4, pos.z), d.colors[2], 16, 2.5, 0.2, 0.8);
  }

  center() { return new THREE.Vector3(this.pos.x, this.pos.y + this.hh, this.pos.z); }

  groundAhead(dx, dz) {
    const o = { x: this.pos.x + dx * (this.r + 0.5), y: this.pos.y + 0.6, z: this.pos.z + dz * (this.r + 0.5) };
    return this.game.phys.ray(o, down, 3.5, groups(0xffff, G.TERRAIN | G.PROP));
  }

  /* Caminar con gravedad usando el controlador de personaje. */
  walk(dt, mx, mz, speed, hopV = 0) {
    if ((mx || mz) && this.grounded && !this.groundAhead(mx, mz)) { mx = 0; mz = 0; this.wander += Math.PI; }
    this.vel.x = mx * speed; this.vel.z = mz * speed;
    if (hopV && this.grounded) this.vel.y = hopV;
    this.vel.y += GRAVITY * dt;
    const desired = { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt };
    const cc = this.game.phys.ccEnemy;
    cc.computeColliderMovement(this.collider, desired, R.QueryFilterFlags.EXCLUDE_SENSORS, groups(G.ENEMY, G.TERRAIN | G.PROP | G.GATE));
    const m = cc.computedMovement();
    this.pos.x += m.x; this.pos.y += m.y; this.pos.z += m.z;
    this.grounded = cc.computedGrounded() && this.vel.y <= 0;
    if (this.grounded) this.vel.y = -0.5;
  }
  fly(dt, target, speed, ease = 2) {
    const d = target.clone().sub(this.center());
    const len = d.length();
    if (len > 0.05) d.multiplyScalar(Math.min(speed, len * 2) / len); else d.set(0, 0, 0);
    this.vel.lerp(d, 1 - Math.exp(-dt * ease));
    this.pos.addScaledVector(this.vel, dt);
  }
  shoot(target, speed, dmgK = 1, o = {}) {
    const from = this.center().add(tmp.set(0, o.dy || 0, 0));
    const dir = target.clone().sub(from).normalize();
    if (o.los !== false && this.game.phys.ray(from, dir, Math.max(0.1, from.distanceTo(target) - 0.4), groups(0xffff, G.TERRAIN))) return false;
    this.game.addProjectile(new EnemyOrb(this.game, from.addScaledVector(dir, this.r + 0.15), dir, this.def.dmg * this.dmgMul * dmgK, Object.assign({ speed }, o)));
    return true;
  }

  update(dt, t) {
    const game = this.game, pl = game.player;
    this.t += dt;
    if (this.spawnT > 0) { this.spawnT -= dt; }
    this.flash = Math.max(0, this.flash - dt);
    const k = tickStatus(game, this, dt);
    if (this.dead) return;
    const to = new THREE.Vector3(pl.pos.x - this.pos.x, 0, pl.pos.z - this.pos.z);
    const dist = to.length();
    if (dist > 0.01) to.divideScalar(dist);
    const chase = dist < 34;
    const sp = this.speed * k;
    const ready = this.spawnT <= 0;
    let faceYaw = Math.atan2(to.x, to.z);
    let contact = true;

    switch (this.def.ai) {
      case 'hopper': case 'splitter': {
        this.timer -= dt * k;
        let hop = 0;
        if (this.grounded && this.timer <= 0 && ready) { this.timer = (this.def.ai === 'splitter' ? 0.8 : 0.55) + Math.random() * 0.4; hop = this.def.ai === 'splitter' ? 4 : 5.2; }
        const mx = chase ? to.x : Math.cos(this.wander) * 0.4, mz = chase ? to.z : Math.sin(this.wander) * 0.4;
        if (this.grounded && !hop) { this.vel.x *= 0.7; this.vel.z *= 0.7; this.walk(dt, 0, 0, 0); }
        else this.walk(dt, mx, mz, hop || !this.grounded ? sp : 0, hop);
        break;
      }
      case 'swarm':
        this.walk(dt, chase ? to.x : 0, chase ? to.z : 0, sp, this.grounded && Math.random() < dt * 1.5 ? 3 : 0);
        break;
      case 'heavy': case 'golem': {
        if (this.state === 'windup') {
          this.timer -= dt * k;
          this.walk(dt, 0, 0, 0);
          if (this.timer <= 0) { game.slam(this.pos.clone(), this.def.ai === 'golem' ? 4 : 2.8, this.def.dmg * this.dmgMul * 1.3, this.def.ai === 'golem'); this.state = 'idle'; this.timer = 2.2; }
        } else {
          this.timer -= dt * k;
          if (this.def.ai === 'golem' && this.timer <= 0 && dist > 5 && dist < 26 && ready) {
            this.timer = 3.5;
            const tgt = pl.center.clone().addScaledVector(pl.vel, 0.6);
            const flat = Math.hypot(tgt.x - this.pos.x, tgt.z - this.pos.z);
            const dir = new THREE.Vector3(tgt.x - this.pos.x, flat * 0.55 + (tgt.y - this.pos.y - 2) * 0.5, tgt.z - this.pos.z).normalize();
            this.game.addProjectile(new EnemyOrb(game, this.center().add(tmp.set(0, 1.2, 0)), dir, this.def.dmg * this.dmgMul * 0.9, { speed: Math.sqrt(flat * 22 / 1.1) * 0.9, gravity: 1, r: 0.35, color: '#d8c8b8', emissive: 0x302820, life: 5, boulder: true }));
            this.throwT = 0.5;
          }
          if (chase && dist < (this.def.ai === 'golem' ? 3.4 : 2.3) && this.timer <= 0.5 && this.grounded) { this.state = 'windup'; this.timer = this.def.ai === 'golem' ? 1.0 : 0.75; }
          this.walk(dt, chase ? to.x : 0, chase ? to.z : 0, sp);
        }
        break;
      }
      case 'flyer': {
        const target = pl.center.clone().add(tmp.set(Math.cos(t * 0.7 + this.wander) * 3, 2.2 + Math.sin(t * 1.3 + this.wander) * 0.6, Math.sin(t * 0.7 + this.wander) * 3));
        this.fly(dt, chase ? target : this.center(), sp);
        this.timer -= dt * k;
        if (chase && dist < 22 && this.timer <= 0 && ready) { this.timer = 2.6 + Math.random() * 1.2; if (this.shoot(pl.center, 7.5)) Audio.play('shoot'); }
        break;
      }
      case 'roller': {
        const u = this.model.userData;
        if (this.state === 'charge') {
          this.timer -= dt;
          this.walk(dt, this.chargeDir.x, this.chargeDir.z, sp);
          u.roll.rotation.x += dt * sp / 0.4;
          if (Math.random() < 0.5) game.fx.emit(this.pos.x, this.pos.y + 0.1, this.pos.z, 0, 0.5, 0, '#e6d6cc', 0.18, 0.4, 0);
          if (this.timer <= 0) { this.state = 'rest'; this.timer = 1.1; }
          faceYaw = Math.atan2(this.chargeDir.x, this.chargeDir.z);
        } else if (this.state === 'windup') {
          this.timer -= dt * k;
          this.walk(dt, 0, 0, 0);
          u.roll.rotation.x += dt * 25;
          if (this.timer <= 0) { this.state = 'charge'; this.timer = 1.2; this.chargeDir = to.clone(); }
        } else {
          this.timer -= dt * k;
          this.walk(dt, chase ? to.x : 0, chase ? to.z : 0, sp * 0.25);
          u.roll.rotation.x += dt * sp * 0.25 / 0.4;
          if (chase && dist < 10 && this.timer <= 0 && ready) { this.state = 'windup'; this.timer = 0.6; }
          if (this.state !== 'windup' && this.timer <= 0) this.state = 'idle';
        }
        break;
      }
      case 'turret': {
        this.walk(dt, 0, 0, 0);
        this.timer -= dt * k;
        if (this.burst > 0) {
          this.burstT -= dt;
          if (this.burstT <= 0) { this.burstT = 0.18; this.burst--; this.shoot(pl.center, 11, 0.8, { color: '#ffe08a', emissive: 0x9a7010 }); }
        } else if (chase && dist < 24 && this.timer <= 0 && ready) { this.timer = 2.4; this.burst = 3; this.burstT = 0; Audio.play('shoot'); }
        contact = dist < this.r + 0.5;
        break;
      }
      case 'bomber': {
        const u = this.model.userData;
        if (this.state === 'fuse') {
          this.timer -= dt;
          this.walk(dt, 0, 0, 0);
          const s = 1 + (0.6 - this.timer) * 0.6;
          this.model.scale.setScalar(this.scale * s);
          u.spark.scale.setScalar(0.07 + Math.random() * 0.06);
          if (this.timer <= 0) {
            game.explodeAt(this.center(), 2.4, this.def.dmg * this.dmgMul, '#c8a8ff', true);
            this.selfDestruct = true;
            game.killEnemy(this);
            return;
          }
        } else {
          this.walk(dt, chase ? to.x : 0, chase ? to.z : 0, sp, this.grounded && Math.random() < dt * 0.8 ? 3 : 0);
          if (dist < 1.5 && ready) { this.state = 'fuse'; this.timer = 0.6; Audio.play('deny'); }
          u.spark.scale.setScalar(0.06 + Math.sin(t * 20) * 0.02);
        }
        contact = false;
        break;
      }
      case 'healer': {
        let mx = 0, mz = 0;
        if (dist < 7) { mx = -to.x; mz = -to.z; } else if (dist > 13) { mx = to.x; mz = to.z; }
        else { mx = -to.z * 0.5; mz = to.x * 0.5; }
        this.walk(dt, mx, mz, sp);
        this.timer -= dt * k;
        if (this.timer <= 0 && ready) {
          this.timer = 3;
          let best = null, bk = 0.99;
          for (const o of game.enemies) {
            if (o === this || o.dead || o.isBoss) continue;
            const f = o.hp / o.maxHp;
            if (f < bk && o.pos.distanceTo(this.pos) < 12) { bk = f; best = o; }
          }
          if (best) {
            best.hp = Math.min(best.maxHp, best.hp + best.maxHp * 0.3);
            game.fx.bolt(this.center(), best.center(), '#9fe3b0');
            game.fx.burst(best.center(), '#9fe3b0', 12, 2);
          }
        }
        contact = false;
        break;
      }
      case 'shielder':
        this.walk(dt, chase ? to.x : 0, chase ? to.z : 0, sp);
        break;
      case 'blinker': {
        const u = this.model.userData;
        if (this.state === 'fade') {
          this.timer -= dt;
          this.model.scale.setScalar(Math.max(0.01, this.scale * this.timer / 0.35));
          this.untargetable = true;
          if (this.timer <= 0) {
            const a = Math.random() * Math.PI * 2;
            this.pos.set(pl.pos.x + Math.cos(a) * 3.2, pl.pos.y + 2.4, pl.pos.z + Math.sin(a) * 3.2);
            this.state = 'appear'; this.timer = 0.35;
            game.fx.burst(this.center(), '#e8f0ff', 14, 2);
          }
        } else if (this.state === 'appear') {
          this.timer -= dt;
          this.model.scale.setScalar(this.scale * (1 - this.timer / 0.35));
          if (this.timer <= 0) { this.state = 'dive'; this.timer = 0.7; this.untargetable = false; this.vel.copy(pl.center.clone().sub(this.center()).normalize().multiplyScalar(10)); }
        } else if (this.state === 'dive') {
          this.timer -= dt;
          this.pos.addScaledVector(this.vel, dt * k);
          if (this.timer <= 0) { this.state = 'idle'; this.timer = 2.2; }
        } else {
          const target = pl.center.clone().add(tmp.set(Math.cos(t + this.wander) * 6, 3, Math.sin(t + this.wander) * 6));
          this.fly(dt, chase ? target : this.center(), sp);
          this.timer -= dt * k;
          if (chase && this.timer <= 0 && ready) { this.state = 'fade'; this.timer = 0.35; }
        }
        u.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(t * 18) * 0.6; });
        break;
      }
      case 'summoner': {
        this.walk(dt, chase && dist > 8 ? to.x : 0, chase && dist > 8 ? to.z : 0, sp);
        this.timer -= dt * k;
        if (chase && this.timer <= 0 && ready) {
          this.timer = 6;
          const n = game.enemies.filter(e => !e.dead).length;
          if (n < 24) for (let i = 0; i < 2; i++) {
            const a = Math.random() * Math.PI * 2;
            game.spawnEnemy('chispita', new THREE.Vector3(this.pos.x + Math.cos(a) * 1.5, this.pos.y + 0.3, this.pos.z + Math.sin(a) * 1.5), { force: true });
          }
          Audio.play('bell', 220);
          this.model.userData.swing.rotation.z = 0.4;
        }
        this.model.userData.swing.rotation.z *= Math.exp(-dt * 2);
        this.model.userData.swing.rotation.x = Math.sin(t * 1.5) * 0.08;
        break;
      }
      case 'sniper': {
        const away = dist < 14 ? -1 : dist > 19 ? 1 : 0;
        const target = new THREE.Vector3(this.pos.x + to.x * away * 3, pl.pos.y + 5, this.pos.z + to.z * away * 3);
        if (this.state === 'aim') {
          this.timer -= dt * Math.max(0.3, k);
          if (this.timer > 0.3) this.aimAt = pl.center.clone();
          game.fx.warnLine(this, this.center(), this.aimAt, this.timer);
          if (this.timer <= 0) {
            this.shoot(this.aimAt, 30, 1, { los: false, color: '#ffffff', emissive: 0x8080ff, r: 0.12 });
            Audio.play('special');
            this.state = 'idle'; this.timer = 3.2;
            game.fx.warnLine(this, null);
          }
          this.vel.multiplyScalar(0.9);
        } else {
          this.fly(dt, chase ? target : this.center(), sp);
          this.timer -= dt * k;
          if (chase && dist < 28 && this.timer <= 0 && ready) { this.state = 'aim'; this.timer = 1.4; this.aimAt = pl.center.clone(); }
        }
        contact = false;
        break;
      }
      case 'burrower': {
        if (this.state === 'under' || this.state === 'idle') {
          if (this.state === 'idle') { this.state = 'under'; this.timer = 0; }
          this.untargetable = true;
          this.model.visible = false;
          this.walk(dt, chase ? to.x : 0, chase ? to.z : 0, sp);
          if (Math.random() < 0.6) game.fx.emit(this.pos.x + (Math.random() - 0.5) * 0.4, this.pos.y + 0.05, this.pos.z + (Math.random() - 0.5) * 0.4, 0, 1.2, 0, '#d8c8b8', 0.2, 0.5, -3);
          if (dist < 1.2 && ready) {
            this.state = 'emerge'; this.timer = 0.45;
            this.model.visible = true; this.untargetable = false;
            game.fx.burst(this.pos.clone(), '#d8f0ff', 20, 4);
            if (Math.abs(pl.pos.y - this.pos.y) < 1.2) { game.hurtPlayer(this.def.dmg * this.dmgMul, this.pos.clone()); pl.vel.y = 7; }
          }
        } else if (this.state === 'emerge') {
          this.timer -= dt;
          this.model.position.y = this.pos.y + (0.45 - this.timer) * 0.6;
          this.walk(dt, 0, 0, 0);
          if (this.timer <= 0) { this.state = 'surface'; this.timer = 2.6; }
        } else {
          this.timer -= dt;
          this.walk(dt, 0, 0, 0);
          if (this.timer <= 0) { this.state = 'under'; game.fx.burst(this.pos.clone(), '#d8c8b8', 12, 2); }
        }
        contact = this.state === 'surface';
        break;
      }
      case 'twister': {
        this.walk(dt, chase ? to.x : 0, chase ? to.z : 0, sp);
        if (dist < 5.5 && ready) {
          const pull = (1 - dist / 5.5) * 7 * k;
          pl.vel.x -= to.x * pull * dt * 4; pl.vel.z -= to.z * pull * dt * 4;
          if (Math.random() < 0.4) {
            const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 4;
            game.fx.emit(this.pos.x + Math.cos(a) * r, this.pos.y + Math.random() * 1.5, this.pos.z + Math.sin(a) * r, -Math.cos(a) * 3, 0.5, -Math.sin(a) * 3, '#e8fbff', 0.16, 0.5, 0);
          }
        }
        break;
      }
      default:
        this.walk(dt, chase ? to.x : 0, chase ? to.z : 0, sp);
    }
    if (this.dead) return;
    if (this.pos.y < -16) { this.dead = true; return; }
    this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y + this.hh, z: this.pos.z });

    // élites: efectos de aura
    const el = this.elite;
    if (el && el.id === 'ardiente') {
      if (Math.random() < 0.4) game.fx.emit(this.pos.x + (Math.random() - 0.5) * 0.6, this.pos.y + 0.1, this.pos.z + (Math.random() - 0.5) * 0.6, 0, 1.2, 0, '#ff9a5c', 0.18, 0.6, 0);
      if (dist < this.r + 1.2) pl.burnT = Math.max(pl.burnT || 0, 1.2);
    }

    // daño por contacto
    if (contact && ready && !this.untargetable && pl.center.distanceTo(this.center()) < this.r + 0.32) {
      if (game.hurtPlayer(this.def.dmg * this.dmgMul, this.center(), this)) this.onHitPlayer();
    }

    // orientación y animación
    let dy = faceYaw - this.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.yaw += dy * Math.min(1, dt * 5);
    if (this.def.ai !== 'burrower' || this.state !== 'emerge') this.model.position.copy(this.pos);
    this.model.rotation.y = this.yaw;
    if (this.spawnT > 0 && this.def.ai !== 'blinker') this.model.scale.setScalar(Math.max(0.01, this.scale * (1 - this.spawnT / 0.6)));
    else if (this.def.ai !== 'blinker' && this.def.ai !== 'bomber') this.model.scale.setScalar(this.scale);
    this.animate(dt, t);
  }

  onHitPlayer() {
    const el = this.elite, pl = this.game.player;
    if (!el) return;
    if (el.id === 'helado') pl.slowT = 1.6;
    if (el.id === 'ardiente') pl.burnT = 2.5;
    if (el.id === 'vampirico') { this.hp = Math.min(this.maxHp, this.hp + this.def.dmg * this.dmgMul * 3); this.game.fx.burst(this.center(), '#e0507a', 10, 2); }
  }

  animate(dt, t) {
    const u = this.model.userData;
    const m = this.def.model;
    if (m === 'cube' || m === 'mini') {
      const air = !this.grounded;
      u.inner.scale.set(air ? 0.9 : 1.08, air ? 1.15 : 0.9, air ? 0.9 : 1.08);
    } else if (m === 'orb') {
      u.ring.rotation.z = t * 2;
      u.inner.position.y = Math.sin(t * 3 + this.wander) * 0.06;
    } else if (m === 'totem') {
      const w = this.state === 'windup' ? 1 - this.timer / 0.75 : 0;
      u.inner.position.y = w * 0.4;
      u.inner.rotation.z = this.state === 'windup' ? Math.sin(t * 40) * 0.05 : Math.sin(t * 4) * 0.03;
    } else if (m === 'jelly') {
      const s = 1 + Math.sin(t * 6) * 0.06;
      u.inner.scale.set(s, 2 - s, s);
    } else if (m === 'pyramid' && u.eye) {
      u.eye.position.y = 0.55 + Math.sin(t * 2) * 0.03;
    } else if (m === 'golem') {
      const raise = this.state === 'windup' ? -2.4 * (1 - this.timer) : 0;
      const thr = (this.throwT = Math.max(0, (this.throwT || 0) - dt)) > 0 ? -2.6 : 0;
      u.arms[0].rotation.x += (raise + Math.sin(t * 2) * 0.1 - u.arms[0].rotation.x) * Math.min(1, dt * 8);
      u.arms[1].rotation.x += (Math.min(raise, thr) + Math.sin(t * 2 + 1) * 0.1 - u.arms[1].rotation.x) * Math.min(1, dt * 8);
    } else if (m === 'twister') {
      u.inner.position.y = Math.sin(t * 2) * 0.05;
    }
    for (const s of u.spin) s.rotation.y += dt * 3;
    if (u.halo) { u.halo.rotation.z = t * 2; u.halo.position.y = this.hh / this.scale * 1.1 + Math.sin(t * 3) * 0.05; }
    u.inner.visible = !(this.flash > 0 && Math.floor(t * 30) % 2 === 0);
  }

  destroy() {
    this.game.fx.warnLine(this, null);
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
    this.def = { name: 'El Guardián de Nova', ai: 'boss', dmg: 22, xp: 300, sparks: 160, colors: ['#3e4288', '#5a5fae', '#8e94d6'] };
    this.maxHp = this.hp = 2600 * game.hpScale();
    this.dmgMul = game.dmgScale();
    this.armor = 0;
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
    this.burnT = this.poisonT = this.bleedT = this.slowT = this.stunT = 0;
    this.burnDps = this.poisonDps = this.bleedDps = 0;
    this.slowK = 1;
    this.dead = false;
    this.cycle = 0;
    Audio.play('boss');
  }
  center() { return new THREE.Vector3(this.pos.x, this.pos.y + this.hh, this.pos.z); }
  update(dt, t) {
    const game = this.game, pl = game.player;
    this.flash = Math.max(0, this.flash - dt);
    this.stunT = Math.min(this.stunT, 0.3);
    const k = Math.max(0.4, tickStatus(game, this, dt));
    if (this.dead) return;
    const enraged = this.hp < this.maxHp * 0.4;
    const spd = (enraged ? 1.35 : 1) * k;
    this.timer -= dt * spd;
    const hover = new THREE.Vector3(pl.pos.x * 0.5 + this.home.x * 0.5, this.home.y + 5.5, pl.pos.z * 0.5 + this.home.z * 0.5);
    switch (this.phase) {
      case 'intro': case 'hover':
        this.pos.lerp(hover, 1 - Math.exp(-dt * 1.4));
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
          const types = enraged ? ['sombra', 'bomba', 'farol', 'chispita'] : ['sombra', 'chispita'];
          for (let i = 0; i < (enraged ? 4 : 2); i++) {
            const a = Math.random() * Math.PI * 2;
            game.spawnEnemy(types[i % types.length], new THREE.Vector3(this.home.x + Math.cos(a) * 6, this.home.y + (types[i % types.length] === 'farol' ? 3 : 0.3), this.home.z + Math.sin(a) * 6), { force: true });
          }
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
