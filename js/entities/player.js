/* Star Nova — Pip: control del personaje con el controlador cinemático de Rapier. */
import * as THREE from 'three';
import { R, G, groups, GRAVITY } from '../physics.js';
import { makePip, PipAnimator } from './pip.js';
import { Audio } from '../audio.js';

const HALF = 0.1, RAD = 0.17;          // cápsula: alto total 0.54
const CENTER = HALF + RAD;

export class Player {
  constructor(game, pos) {
    this.game = game;
    const phys = game.phys;
    this.pos = new THREE.Vector3(pos[0], pos[1], pos[2]); // pies
    this.vel = new THREE.Vector3();
    this.body = phys.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(this.pos.x, this.pos.y + CENTER, this.pos.z));
    this.collider = phys.world.createCollider(
      R.ColliderDesc.capsule(HALF, RAD).setCollisionGroups(groups(G.PLAYER, G.TERRAIN | G.PROP | G.GATE)),
      this.body);
    phys.own(this.collider, this);
    this.kind = 'player';
    this.model = makePip();
    game.scene.add(this.model);
    this.anim = new PipAnimator(this.model);
    this.tailT = 0;
    this.slowT = 0;
    this.burnT = 0;
    this.fallPeak = 0;
    this.yaw = 0;
    this.grounded = false;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.airJumps = 1;
    this.dashT = 0;
    this.dashDir = new THREE.Vector3();
    this.invuln = 0;
    this.hurtT = 0;
    this.walkPhase = 0;
    this.lastSafe = this.pos.clone();
    this.safeT = 0;
    this.landT = 0;
    this.spin = 0;
  }

  get center() { return new THREE.Vector3(this.pos.x, this.pos.y + CENTER, this.pos.z); }
  get muzzle() {
    const f = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    return new THREE.Vector3(this.pos.x + f.x * 0.25, this.pos.y + 0.36, this.pos.z + f.z * 0.25);
  }

  teleport(p) {
    this.pos.set(p[0] ?? p.x, p[1] ?? p.y, p[2] ?? p.z);
    this.vel.set(0, 0, 0);
    this.body.setTranslation({ x: this.pos.x, y: this.pos.y + CENTER, z: this.pos.z }, true);
    this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y + CENTER, z: this.pos.z });
  }

  update(dt, input, cam) {
    const game = this.game;
    const st = game.stats;
    const fwd = new THREE.Vector3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw));
    const right = new THREE.Vector3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
    const wish = new THREE.Vector3().addScaledVector(right, input.mx).addScaledVector(fwd, input.my);
    const wl = Math.min(1, wish.length());
    if (wl > 0.01) wish.normalize().multiplyScalar(wl);

    if (this.slowT > 0) this.slowT -= dt;
    const speed = 5.6 * st.speed * game.buffMul('speed') * (this.slowT > 0 ? 0.6 : 1);
    if (this.dashT > 0) {
      this.dashT -= dt;
      this.vel.x = this.dashDir.x * 15;
      this.vel.z = this.dashDir.z * 15;
      this.vel.y = Math.max(this.vel.y, -2);
      this.spin += dt * 22;
    } else {
      const acc = this.grounded ? 42 : 16;
      const tx = wish.x * speed, tz = wish.z * speed;
      const k = 1 - Math.exp(-acc * dt / Math.max(1, speed) * 2.4);
      this.vel.x += (tx - this.vel.x) * k;
      this.vel.z += (tz - this.vel.z) * k;
      this.spin = 0;
    }

    // saltos con tiempo de gracia y búfer
    this.coyote -= dt;
    this.jumpBuf -= dt;
    if (input.pressed.jump) this.jumpBuf = 0.14;
    if (this.jumpBuf > 0) {
      if (this.grounded || this.coyote > 0) {
        this.vel.y = 8.0 * Math.sqrt(st.jump); this.jumpBuf = 0; this.coyote = 0; this.grounded = false;
        Audio.play('jump');
        game.fx.puff(this.pos, 6, '#ffffff');
      } else if (this.airJumps > 0) {
        this.airJumps--; this.vel.y = 7.0 * Math.sqrt(st.jump); this.jumpBuf = 0;
        Audio.play('jump');
        game.fx.ring(this.pos, '#fff3d0');
        this.anim.flip();
        game.vibrate(10);
      }
    }
    if (!input.held.jump && this.vel.y > 2.5) this.vel.y += GRAVITY * 0.9 * dt; // salto variable
    this.vel.y += GRAVITY * dt * (this.vel.y < 0 ? 1.18 : 1);
    if (this.vel.y < -24) this.vel.y = -24;
    // planeo (Alas de Cometa): mantener saltar mientras cae
    this.gliding = st.glide && !this.grounded && input.held.jump && this.vel.y < -1.5;
    if (this.gliding) { this.vel.y = Math.max(this.vel.y, -2.2); if (Math.random() < 0.3) game.fx.emit(this.pos.x, this.pos.y + 0.3, this.pos.z, 0, -0.5, 0, '#e8f0ff', 0.12, 0.5, 0); }
    if (!this.grounded) this.fallPeak = Math.min(this.fallPeak, this.vel.y);

    // voltereta
    if (input.pressed.utility && game.skills.ready('utility')) {
      game.skills.use('utility');
      const d = wish.lengthSq() > 0.01 ? wish.clone().normalize() : new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      this.dashDir.copy(d);
      this.dashT = 0.24;
      this.invuln = Math.max(this.invuln, 0.3);
      Audio.play('dash');
      game.fx.puff(this.pos, 10, '#ffffff');
    }

    // mover con el controlador de personaje
    const desired = { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt };
    const cc = game.phys.cc;
    cc.computeColliderMovement(this.collider, desired, R.QueryFilterFlags.EXCLUDE_SENSORS, groups(G.PLAYER, G.TERRAIN | G.PROP | G.GATE));
    const m = cc.computedMovement();
    this.pos.x += m.x; this.pos.y += m.y; this.pos.z += m.z;
    this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y + CENTER, z: this.pos.z });
    const wasGrounded = this.grounded;
    this.grounded = cc.computedGrounded() && this.vel.y <= 0.5;
    if (desired.y > 0 && m.y < desired.y * 0.4) this.vel.y = Math.min(this.vel.y, 0);
    if (this.grounded) {
      if (!wasGrounded) {
        if (this.fallPeak < -6) { this.anim.land(-this.fallPeak); game.fx.puff(this.pos, 5, '#ffffff'); }
        if (this.fallPeak < -11 && st.stomp > 0) game.stomp(this.pos.clone(), st.stomp);
        this.fallPeak = 0;
      }
      this.vel.y = -0.5;
      this.coyote = 0.11;
      this.airJumps = st.airJumps;
      this.safeT += dt;
      if (this.safeT > 0.4) {
        this.safeT = 0;
        // solo es "seguro" si hay suelo fijo justo debajo
        const hit = game.phys.ray({ x: this.pos.x, y: this.pos.y + 0.2, z: this.pos.z }, { x: 0, y: -1, z: 0 }, 0.6, groups(0xffff, G.TERRAIN));
        if (hit) this.lastSafe.copy(this.pos);
      }
    }
    // empuje por bloqueo horizontal (evita "pegarse")
    if (Math.abs(desired.x) > 1e-4 && Math.abs(m.x) < Math.abs(desired.x) * 0.2) this.vel.x *= 0.5;
    if (Math.abs(desired.z) > 1e-4 && Math.abs(m.z) < Math.abs(desired.z) * 0.2) this.vel.z *= 0.5;

    // orientación: hacia donde apunta la cámara si dispara, si no hacia donde camina
    let targetYaw = this.yaw;
    if (this.faceYaw != null) targetYaw = this.faceYaw;
    else if (input.held.primary || game.aimHold > 0) targetYaw = Math.atan2(fwd.x, fwd.z);
    else if (wish.lengthSq() > 0.02) targetYaw = Math.atan2(wish.x, wish.z);
    let dy = targetYaw - this.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.yaw += dy * (1 - Math.exp(-dt * 16));

    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.landT = Math.max(0, this.landT - dt);

    // caída al vacío
    if (this.pos.y < -14) game.fellOff();
  }

  animate(dt, t) {
    if (this.tailT > 0) this.tailT -= dt;
    this.anim.update(dt, {
      pos: this.pos, yaw: this.yaw, speed: Math.hypot(this.vel.x, this.vel.z), grounded: this.grounded, vy: this.vel.y,
      dash: this.dashT, spin: this.spin, tailSpin: Math.max(0, this.tailT),
      invulnBlink: this.invuln > 0 && this.hurtT > 0 && Math.floor(t * 20) % 2 === 0,
    });
  }
}
