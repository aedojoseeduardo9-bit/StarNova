/* Star Nova — cámara en tercera persona sobre el hombro, con colisión contra el escenario. */
import * as THREE from 'three';
import { G, groups } from './physics.js';

export class OrbitCam {
  constructor(camera, phys) {
    this.camera = camera;
    this.phys = phys;
    this.yaw = 0;
    this.pitch = 0.32;
    this.dist = 4.2;
    this.want = 4.2;
    this.cur = 4.2;
    this.shake = 0;
    this.target = new THREE.Vector3();
    this.forward = new THREE.Vector3();
  }
  /* Dónde estaría la cámara del juego ahora mismo (las escenas terminan aquí para enlazar con el juego). */
  pose(focus) {
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const back = new THREE.Vector3(Math.sin(this.yaw) * cp, sp, Math.cos(this.yaw) * cp);
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const pivot = focus.clone().addScaledVector(right, 0.38);
    return { p: pivot.clone().addScaledVector(back, this.cur), l: pivot.clone().add(new THREE.Vector3(0, 0.15, 0)) };
  }
  update(dt, input, focus, t) {
    this.yaw -= input.lookDX;
    this.pitch = THREE.MathUtils.clamp(this.pitch + input.lookDY, -0.55, 1.25);
    if (input.zoom) this.want = THREE.MathUtils.clamp(this.want + input.zoom * 0.5, 2.2, 9);
    this.target.lerp(focus, 1 - Math.exp(-dt * 14));
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const back = new THREE.Vector3(Math.sin(this.yaw) * cp, sp, Math.cos(this.yaw) * cp);
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const pivot = this.target.clone().addScaledVector(right, 0.38);
    // colisión de cámara
    let d = this.want;
    const hit = this.phys.ray(pivot, back, this.want + 0.3, groups(0xffff, G.TERRAIN | G.GATE));
    if (hit) d = Math.max(0.6, hit.toi - 0.3);
    this.cur = d < this.cur ? d : this.cur + (d - this.cur) * (1 - Math.exp(-dt * 4));
    const pos = pivot.clone().addScaledVector(back, this.cur);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      const s = this.shake * 0.6;
      pos.x += (Math.random() - 0.5) * s; pos.y += (Math.random() - 0.5) * s; pos.z += (Math.random() - 0.5) * s;
    }
    this.camera.position.copy(pos);
    this.camera.lookAt(pivot.x, pivot.y + 0.15, pivot.z);
    this.camera.getWorldDirection(this.forward);
  }
}
