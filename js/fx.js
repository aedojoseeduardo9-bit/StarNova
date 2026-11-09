/* Star Nova — partículas ligeras (un solo objeto Points para todo). */
import * as THREE from 'three';

const N = 900;
export class FX {
  constructor(scene) {
    this.pos = new Float32Array(N * 3);
    this.col = new Float32Array(N * 3);
    this.size = new Float32Array(N);
    this.alpha = new Float32Array(N);
    this.vel = new Float32Array(N * 3);
    this.life = new Float32Array(N);
    this.max = new Float32Array(N);
    this.grav = new Float32Array(N);
    this.size0 = new Float32Array(N);
    this.next = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.geo = g;
    this.uniforms = { uScale: { value: 400 } };
    const m = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `attribute float aSize; attribute float aAlpha; varying vec3 vC; varying float vA; uniform float uScale;
        void main(){ vC = color; vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position,1.0);
        gl_PointSize = aSize * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA;
        void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard;
        float a = smoothstep(0.5, 0.15, r) * vA; gl_FragColor = vec4(vC, a); }`,
      vertexColors: true, transparent: true, depthWrite: false,
    });
    this.scene = scene;
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this._c = new THREE.Color();
  }

  emit(x, y, z, vx, vy, vz, color, size, life, grav = 0) {
    const i = this.next; this.next = (this.next + 1) % N;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this._c.set(color);
    this.col[i * 3] = this._c.r; this.col[i * 3 + 1] = this._c.g; this.col[i * 3 + 2] = this._c.b;
    this.size[i] = this.size0[i] = size;
    this.life[i] = this.max[i] = life;
    this.alpha[i] = 1;
    this.grav[i] = grav;
  }

  puff(p, n = 8, color = '#ffffff') {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      this.emit(p.x, p.y + 0.05, p.z, Math.cos(a) * 1.4, Math.random() * 0.8, Math.sin(a) * 1.4, color, 0.18 + Math.random() * 0.12, 0.45, -1);
    }
  }
  ring(p, color = '#ffffff', n = 14, speed = 3) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.emit(p.x, p.y + 0.05, p.z, Math.cos(a) * speed, 0, Math.sin(a) * speed, color, 0.14, 0.4, 0);
    }
  }
  burst(p, color, n = 16, speed = 4, size = 0.14, life = 0.7) {
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      const v = speed * (0.4 + Math.random() * 0.6);
      this.emit(p.x, p.y, p.z, Math.cos(a) * s * v, u * v + 1, Math.sin(a) * s * v, color, size * (0.6 + Math.random() * 0.8), life * (0.6 + Math.random() * 0.6), -6);
    }
  }
  sparkle(p, color = '#fff2b8', n = 1, spread = 0.3) {
    for (let i = 0; i < n; i++) {
      this.emit(p.x + (Math.random() - 0.5) * spread, p.y + (Math.random() - 0.5) * spread, p.z + (Math.random() - 0.5) * spread,
        0, 0.4 + Math.random() * 0.4, 0, color, 0.1 + Math.random() * 0.1, 0.8, 0);
    }
  }

  /* Rayo (línea en zigzag) entre dos puntos. */
  bolt(a, b, color = '#fff27a', life = 0.18) {
    if (!this.bolts) { this.bolts = []; this.boltNext = 0; }
    let L = this.bolts[this.boltNext];
    if (!L) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9 * 3), 3));
      L = { line: new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, depthWrite: false })), life: 0, max: 1 };
      L.line.frustumCulled = false;
      this.scene.add(L.line);
      this.bolts[this.boltNext] = L;
    }
    this.boltNext = (this.boltNext + 1) % 16;
    const pos = L.line.geometry.attributes.position.array;
    const d = Math.max(0.3, a.distanceTo(b));
    for (let i = 0; i < 9; i++) {
      const k = i / 8, j = i === 0 || i === 8 ? 0 : 0.25 * Math.min(1, d / 3);
      pos[i * 3] = a.x + (b.x - a.x) * k + (Math.random() - 0.5) * j;
      pos[i * 3 + 1] = a.y + (b.y - a.y) * k + (Math.random() - 0.5) * j;
      pos[i * 3 + 2] = a.z + (b.z - a.z) * k + (Math.random() - 0.5) * j;
    }
    L.line.geometry.attributes.position.needsUpdate = true;
    L.line.material.color.set(color);
    L.line.material.opacity = 1;
    L.line.visible = true;
    L.life = L.max = life;
    for (let i = 0; i < 4; i++) this.emit(b.x, b.y, b.z, (Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3, color, 0.12, 0.3, -4);
  }

  /* Línea de aviso (francotiradores). from = null la borra. */
  warnLine(owner, from, to, timer) {
    if (!this.warns) this.warns = new Map();
    let L = this.warns.get(owner);
    if (!from) { if (L) { this.scene.remove(L); L.geometry.dispose(); this.warns.delete(owner); } return; }
    if (!L) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      L = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#ff8fb5', transparent: true, depthWrite: false }));
      L.frustumCulled = false;
      this.scene.add(L);
      this.warns.set(owner, L);
    }
    const p = L.geometry.attributes.position.array;
    const end = to.clone().sub(from).normalize().multiplyScalar(40).add(from);
    p[0] = from.x; p[1] = from.y; p[2] = from.z; p[3] = end.x; p[4] = end.y; p[5] = end.z;
    L.geometry.attributes.position.needsUpdate = true;
    L.material.opacity = timer < 0.3 ? (Math.floor(timer * 30) % 2 ? 1 : 0.3) : 0.55;
  }

  update(dt) {
    if (this.bolts) for (const L of this.bolts) {
      if (!L || L.life <= 0) continue;
      L.life -= dt;
      L.line.material.opacity = Math.max(0, L.life / L.max);
      if (L.life <= 0) L.line.visible = false;
    }
    for (let i = 0; i < N; i++) {
      if (this.life[i] <= 0) { if (this.alpha[i] !== 0) { this.alpha[i] = 0; } continue; }
      this.life[i] -= dt;
      const k = Math.max(0, this.life[i] / this.max[i]);
      this.vel[i * 3 + 1] += this.grav[i] * dt;
      const drag = Math.exp(-dt * 2);
      this.vel[i * 3] *= drag; this.vel[i * 3 + 2] *= drag;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.alpha[i] = k;
      this.size[i] = this.size0[i] * (0.5 + 0.5 * k);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
  }
}
