/* Star Nova — cielo degradado, sol, estrellas, nubes y agujas lejanas entre la niebla. */
import * as THREE from 'three';
import { REGIONS, REGION_IDS, regionWeights } from './world/palette.js';

export class Sky {
  constructor(scene) {
    this.scene = scene;
    this.u = {
      top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, bot: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(-0.5, 0.35, -0.6).normalize() }, night: { value: 0 },
    };
    const m = new THREE.ShaderMaterial({
      uniforms: this.u, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
      fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 bot; uniform vec3 sunDir; uniform float night; varying vec3 vDir;
        void main(){ vec3 d = normalize(vDir); float h = d.y;
          vec3 c = h > 0.0 ? mix(hor, top, pow(clamp(h,0.0,1.0), 0.55)) : mix(hor, bot, pow(clamp(-h,0.0,1.0), 0.45));
          float s = max(dot(d, sunDir), 0.0);
          vec3 sun = mix(vec3(1.0,0.97,0.88), vec3(1.0,0.95,0.8), night);
          c += sun * (pow(s, 900.0) * 1.4 + pow(s, 24.0) * 0.18 + pow(s, 4.0) * 0.06);
          gl_FragColor = vec4(c, 1.0); }`,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), m);
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -10;
    scene.add(this.dome);

    // estrellas
    const n = 900, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 0.95 + 0.05, a = Math.random() * Math.PI * 2, r = 700;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = Math.cos(a) * s * r; pos[i * 3 + 1] = u * r; pos[i * 3 + 2] = Math.sin(a) * s * r;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({ color: '#fff8e0', size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.stars = new THREE.Points(sg, this.starMat);
    this.stars.frustumCulled = false;
    scene.add(this.stars);

    // nubes bajas (mar de nubes) y algunas altas
    const cg = new THREE.IcosahedronGeometry(1, 1);
    this.cloudMat = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true, transparent: true, opacity: 0.9 });
    const count = 140;
    this.clouds = new THREE.InstancedMesh(cg, this.cloudMat, count);
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    let k = 0;
    const rnd = mulberry(7);
    for (let i = 0; i < count; i++) {
      const low = i < 100;
      const a = rnd() * Math.PI * 2;
      const r = low ? 10 + rnd() * 140 : 150 + rnd() * 180;
      p.set(Math.cos(a) * r, low ? -9 - rnd() * 10 : 15 + rnd() * 50, Math.sin(a) * r);
      const s = low ? 3 + rnd() * 6 : 6 + rnd() * 12;
      sc.set(s * (1.4 + rnd()), s * 0.45, s * (1 + rnd()));
      q.setFromEuler(new THREE.Euler(0, rnd() * 3, 0));
      mtx.compose(p, q, sc);
      this.clouds.setMatrixAt(k++, mtx);
    }
    this.clouds.receiveShadow = false;
    scene.add(this.clouds);

    // islas flotantes lejanas (siluetas en la bruma)
    this.farMat = new THREE.MeshLambertMaterial({ color: '#f0c4b8', flatShading: true });
    const fc = 26;
    const topG = new THREE.CylinderGeometry(1, 1, 0.18, 8);
    const botG = new THREE.CylinderGeometry(0.95, 0.12, 0.9, 8);
    botG.translate(0, -0.54, 0);
    const spireG = new THREE.CylinderGeometry(0.05, 0.1, 0.9, 6);
    spireG.translate(0.25, 0.5, 0.1);
    this.farTop = new THREE.InstancedMesh(topG, this.farMat, fc);
    this.farBot = new THREE.InstancedMesh(botG, this.farMat, fc);
    this.farSpire = new THREE.InstancedMesh(spireG, this.farMat, fc);
    for (let i = 0; i < fc; i++) {
      const a = (i / fc) * Math.PI * 2 + rnd() * 0.15;
      const r = 150 + rnd() * 160;
      const s = 10 + rnd() * 18;
      p.set(Math.cos(a) * r, -12 + rnd() * 40, Math.sin(a) * r);
      sc.set(s, s, s);
      q.setFromEuler(new THREE.Euler(0, rnd() * 3, 0));
      mtx.compose(p, q, sc);
      this.farTop.setMatrixAt(i, mtx); this.farBot.setMatrixAt(i, mtx); this.farSpire.setMatrixAt(i, mtx);
    }
    scene.add(this.farTop, this.farBot, this.farSpire);

    this.fogColor = new THREE.Color();
    this.night = 0;
    this.extraNight = 0;
    this.deepNight = 0;          // noche cerrada en todo el cielo (solo la usan las escenas animadas)
    this._c = new THREE.Color();
  }

  /* Mezcla los colores del cielo según la región en la que está Pip. */
  update(dt, focus, t) {
    const w = regionWeights(focus.x, focus.z);
    const top = new THREE.Color(0, 0, 0), hor = new THREE.Color(0, 0, 0), bot = new THREE.Color(0, 0, 0), fog = new THREE.Color(0, 0, 0);
    let night = 0;
    for (const id of REGION_IDS) {
      const r = REGIONS[id], k = w[id];
      top.add(this._c.set(r.sky.top).multiplyScalar(k));
      hor.add(this._c.set(r.sky.hor).multiplyScalar(k));
      bot.add(this._c.set(r.sky.bot).multiplyScalar(k));
      fog.add(this._c.set(r.fog).multiplyScalar(k));
      night += (r.night || 0) * k;
    }
    night = Math.max(night, this.extraNight, this.deepNight);
    const nightTop = this._c.set('#1d2154');
    top.lerp(nightTop, Math.max(this.extraNight, this.deepNight) * 0.8);
    if (this.deepNight > 0) {
      hor.lerp(this._c.set('#8b80c6'), this.deepNight * 0.85);
      bot.lerp(this._c.set('#5b5698'), this.deepNight * 0.85);
      fog.lerp(this._c.set('#6c66a8'), this.deepNight * 0.8);
    }
    const ease = 1 - Math.exp(-dt * 2);
    this.u.top.value.lerp(top, ease);
    this.u.hor.value.lerp(hor, ease);
    this.u.bot.value.lerp(bot, ease);
    this.fogColor.lerp(fog, ease);
    this.night += (night - this.night) * ease;
    this.u.night.value = this.night;
    this.starMat.opacity = Math.min(1, this.night * 1.1) * (0.75 + Math.sin(t * 2) * 0.05);
    this.dome.position.copy(focus);
    this.stars.position.copy(focus);
    this.clouds.rotation.y = t * 0.004;
    this.cloudMat.color.copy(this.u.hor.value).lerp(this._c.set('#ffffff'), 0.55);
    this.farMat.color.copy(this.fogColor).lerp(this.u.top.value, 0.25);
  }
}

function mulberry(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
