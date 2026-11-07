/* Star Nova — Pip: control del personaje con el controlador cinemático de Rapier. */
import * as THREE from 'three';
import { R, G, groups, GRAVITY } from '../physics.js';
import { makeSquirrel } from './models.js';
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
    this.model = makeSquirrel();
    game.scene.add(this.model);
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

    const speed = 5.6 * st.speed;
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
        this.vel.y = 8.0; this.jumpBuf = 0; this.coyote = 0; this.grounded = false;
        Audio.play('jump');
        game.fx.puff(this.pos, 6, '#ffffff');
      } else if (this.airJumps > 0) {
        this.airJumps--; this.vel.y = 7.0; this.jumpBuf = 0;
        Audio.play('jump');
        game.fx.ring(this.pos, '#fff3d0');
      }
    }
    if (!input.held.jump && this.vel.y > 2.5) this.vel.y += GRAVITY * 0.9 * dt; // salto variable
    this.vel.y += GRAVITY * dt * (this.vel.y < 0 ? 1.18 : 1);
    if (this.vel.y < -24) this.vel.y = -24;

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
      if (!wasGrounded && this.vel.y < -6) { this.landT = 0.18; game.fx.puff(this.pos, 5, '#ffffff'); }
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
    if (input.held.primary || game.aimHold > 0) targetYaw = Math.atan2(fwd.x, fwd.z);
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
    const u = this.model.userData;
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.yaw;
    const hs = Math.hypot(this.vel.x, this.vel.z);
    const running = this.grounded && hs > 0.6;
    this.walkPhase += dt * (running ? 6 + hs * 2.2 : 0);
    const ph = this.walkPhase;
    // brinco al correr (las ardillas saltan a pasitos)
    const hop = running ? Math.abs(Math.sin(ph)) * 0.06 : 0;
    u.body.position.y = hop - this.landT * 0.25;
    u.body.scale.set(1 + this.landT * 0.5, 1 - this.landT * 0.8, 1 + this.landT * 0.5);
    u.body.rotation.x = running ? 0.12 + Math.sin(ph * 2) * 0.05 : (this.grounded ? 0 : THREE.MathUtils.clamp(-this.vel.y * 0.04, -0.4, 0.4));
    if (this.spin > 0) u.body.rotation.x = this.spin;
    u.legs.forEach((l, i) => {
      const s = (i < 2 ? 1 : -1) * Math.sin(ph);
      l.position.z = (i < 2 ? 0.08 : -0.07) + (running ? s * 0.05 : 0);
      l.position.y = 0.035 + (running ? Math.max(0, s) * 0.04 : 0);
    });
    u.tail.rotation.x = -0.15 + Math.sin(t * 2.2) * 0.08 + (running ? Math.sin(ph) * 0.15 : 0) + (this.grounded ? 0 : 0.35);
    u.tail.rotation.z = Math.sin(t * 1.3) * 0.12;
    u.head.rotation.x = running ? -0.1 : Math.sin(t * 0.7) * 0.05;
    u.head.rotation.y = Math.sin(t * 0.45) * (running ? 0 : 0.25);
    u.scTail.rotation.x = 0.5 + hs * 0.12 + Math.sin(t * 9) * 0.1;
    u.pin.rotation.y = t * 2;
    this.model.visible = !(this.invuln > 0 && this.hurtT > 0 && Math.floor(t * 20) % 2 === 0);
  }
}
