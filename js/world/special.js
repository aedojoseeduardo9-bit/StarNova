/* Star Nova — piezas especiales de los planetas nuevos:
 *  Terreno con colinas (Verdalia): malla low-poly con colores por vértice + colisionador de triángulos (Rapier).
 *  Agua animada (lagos y ríos), cascada, suelo de metal líquido que ondula al pisarlo (Prismara),
 *  Impulsor Cometa (lanza a Pip en arco a otra isla) y Gelatina trampolín.
 * Todo lo que necesita animarse tiene update(dt, t) y va en spots.extras. */
import * as THREE from 'three';
import { R } from '../physics.js';
import { GEO, part, mat } from '../entities/models.js';
import { Audio } from '../audio.js';

const _c = new THREE.Color();

/* ---------- Terreno ---------- */
export function buildTerrain(game, o) {
  const { size, seg, height, color } = o;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, height(pos.getX(i), pos.getZ(i)));
  // colisionador: los mismos triángulos
  const verts = new Float32Array(pos.array);
  const idx = new Uint32Array(geo.index.array);
  game.phys.fixedCollider(R.ColliderDesc.trimesh(verts, idx).setFriction(0.9));
  // malla low-poly con color por cara
  const flat = geo.toNonIndexed();
  geo.dispose();
  const p = flat.attributes.position, n = p.count, col = new Float32Array(n * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3();
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); d.fromBufferAttribute(p, i + 2);
    const cx = (a.x + b.x + d.x) / 3, cy = (a.y + b.y + d.y) / 3, cz = (a.z + b.z + d.z) / 3;
    b.sub(a); d.sub(a); b.cross(d).normalize();
    color(cx, cy, cz, Math.abs(b.y), _c);
    for (let v = 0; v < 3; v++) { col[(i + v) * 3] = _c.r; col[(i + v) * 3 + 1] = _c.g; col[(i + v) * 3 + 2] = _c.b; }
  }
  flat.setAttribute('color', new THREE.BufferAttribute(col, 3));
  flat.computeVertexNormals();
  const mesh = new THREE.Mesh(flat, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.receiveShadow = true;
  game.scene.add(mesh);
  return mesh;
}

/* ---------- Agua (lago o río) ---------- */
const waterUniforms = { uTime: { value: 0 } };
function waterMaterial(c1, c2) {
  const m = new THREE.MeshLambertMaterial({ color: c1, transparent: true, opacity: 0.82, emissive: new THREE.Color(c2).multiplyScalar(0.25) });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = waterUniforms.uTime;
    sh.uniforms.uC2 = { value: new THREE.Color(c2) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nuniform float uTime;\nuniform vec3 uC2;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float w = sin(vWP.x * 0.9 + uTime * 1.3) * sin(vWP.z * 0.8 - uTime * 1.1) + sin((vWP.x + vWP.z) * 0.35 + uTime * 0.7);
        diffuseColor.rgb = mix(diffuseColor.rgb, uC2, smoothstep(0.9, 1.6, w) * 0.65);`);
  };
  return m;
}
export class Water {
  constructor(game, o) {
    this.game = game;
    let geo;
    if (o.shape === 'disc') geo = new THREE.CircleGeometry(o.r, 40);
    else if (o.path) {                                   // río: una tira que sigue la curva x = path(z)
      const len = o.z1 - o.z0, n = Math.ceil(len / 3);
      geo = new THREE.PlaneGeometry(o.w, len, 1, n);
      geo.rotateX(-Math.PI / 2);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const z = p.getZ(i) + (o.z0 + o.z1) / 2; p.setZ(i, z); p.setX(i, p.getX(i) + o.path(z)); }
      geo.computeVertexNormals();
    } else geo = new THREE.PlaneGeometry(o.w, o.d, 1, 1);
    if (!o.path) geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(geo, waterMaterial(o.color || '#6ac0d8', o.color2 || '#d8f4ff'));
    if (o.path) this.mesh.position.set(0, o.level, 0);
    else this.mesh.position.set(o.x, o.level, o.z);
    if (o.ry) this.mesh.rotation.y = o.ry;
    game.scene.add(this.mesh);
  }
  update(dt, t) { waterUniforms.uTime.value = t; }
}

/* ---------- Cascada ---------- */
export class Waterfall {
  constructor(game, o) {
    this.game = game; this.o = o;
    const h = o.top - o.bottom;
    const m = new THREE.MeshBasicMaterial({ color: '#e8f8ff', transparent: true, opacity: 0.75, side: THREE.DoubleSide });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = waterUniforms.uTime;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vU;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvU = uv;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vU;\nuniform float uTime;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          float s = sin(vU.x * 40.0 + sin(vU.y * 6.0) * 2.0) * 0.5 + 0.5;
          float f = fract(vU.y * 3.0 + uTime * 1.6 + s * 0.3);
          diffuseColor.rgb = mix(vec3(0.55, 0.82, 0.95), vec3(1.0), smoothstep(0.55, 1.0, f) * 0.8 + s * 0.15);
          diffuseColor.a *= 0.65 + s * 0.3;`);
    };
    // la cortina puede ir inclinada: de (z0, abajo) a (z1, arriba), pegada a la pared de roca
    const z0 = o.z0 ?? o.z, z1 = o.z1 ?? o.z, len = Math.hypot(h, z0 - z1);
    const geo = new THREE.PlaneGeometry(o.w, len, 1, 1);
    this.mesh = new THREE.Mesh(geo, m);
    this.mesh.position.set(o.x, o.bottom + h / 2, (z0 + z1) / 2);
    this.mesh.rotation.x = -Math.atan2(z0 - z1, h);
    game.scene.add(this.mesh);
    o.z = z0;
  }
  update(dt, t) {
    const o = this.o, fx = this.game.fx;
    if (Math.random() < 0.8) fx.puff(new THREE.Vector3(o.x + (Math.random() - 0.5) * o.w, o.bottom + 0.2, o.z + 0.8), 2, '#f4fcff');
    if (Math.random() < 0.3) fx.emit(o.x + (Math.random() - 0.5) * o.w, o.bottom + 0.3, o.z + 0.4, (Math.random() - 0.5) * 2, 2.5, 1.2, '#ffffff', 0.18, 0.9, -6);
  }
}

/* ---------- Suelo de metal líquido (Prismara): arcoíris y ondas donde pisa Pip ---------- */
const liquidUniforms = { uTime: { value: 0 }, uRip: { value: Array.from({ length: 10 }, () => new THREE.Vector4(0, 0, -99, 0)) } };
let ripI = 0;
function liquidMaterial() {
  const m = new THREE.MeshLambertMaterial({ color: '#dfe4f2' });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = liquidUniforms.uTime;
    sh.uniforms.uRip = liquidUniforms.uRip;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nuniform float uTime;\nuniform vec4 uRip[10];\nfloat gRip;\nvec3 gRb;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 p = vWP.xz;
        float hue = fract(p.x * 0.012 + p.y * 0.009 + uTime * 0.04);
        gRb = 0.55 + 0.45 * cos(6.2831 * (hue + vec3(0.0, 0.33, 0.67)));
        gRip = 0.0;
        for (int i = 0; i < 10; i++) {
          vec4 r = uRip[i];
          float age = uTime - r.z;
          if (age > 0.0 && age < 2.6) {
            float d = distance(p, r.xy);
            float w = d - age * 3.4;
            gRip += r.w * exp(-w * w * 5.0) * (1.0 - age / 2.6);
          }
        }
        float sheen = 0.5 + 0.5 * sin(p.x * 0.55 + uTime * 1.4) * sin(p.y * 0.45 - uTime * 1.1);
        vec3 metal = mix(vec3(0.82, 0.85, 0.95), gRb, 0.42) + sheen * 0.1;
        diffuseColor.rgb = metal + gRip * (gRb * 0.7 + 0.25);`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += gRb * (0.08 + gRip * 0.55);');
  };
  return m;
}
export class LiquidFloor {
  constructor(game, o) {
    this.game = game; this.o = o;
    const geo = new THREE.CircleGeometry(o.r, 48);
    geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(geo, liquidMaterial());
    this.mesh.position.set(o.x, o.y + 0.03, o.z);
    this.mesh.receiveShadow = true;
    game.scene.add(this.mesh);
    this.stepT = 0;
    this.was = true;
  }
  static ripple(x, z, k = 1) {
    const v = liquidUniforms.uRip.value[ripI++ % 10];
    v.set(x, z, liquidUniforms.uTime.value, k);
  }
  update(dt, t) {
    liquidUniforms.uTime.value = t;
    const pl = this.game.player, p = pl.pos, o = this.o;
    const on = Math.hypot(p.x - o.x, p.z - o.z) < o.r && Math.abs(p.y - o.y) < 0.6;
    if (!on) { this.was = false; return; }
    const sp = Math.hypot(pl.vel.x, pl.vel.z);
    this.stepT -= dt;
    if (pl.grounded && !this.was) { LiquidFloor.ripple(p.x, p.z, 1.6); Audio.play('bell', 1320); }   // aterrizaje: onda grande
    else if (pl.grounded && sp > 1 && this.stepT <= 0) { this.stepT = 0.26; LiquidFloor.ripple(p.x, p.z, 0.8); }
    this.was = pl.grounded;
  }
}

/* ---------- Impulsor Cometa: una estrella en el suelo que lanza a Pip a otra isla ---------- */
let STAR = null;
function starGeo() {
  if (STAR) return STAR;
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.45 : 1;
    if (i === 0) sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); else sh.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  STAR = new THREE.ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: false });
  STAR.center();
  return STAR;
}
export class Launcher {
  constructor(game, o) {
    this.game = game;
    this.p = new THREE.Vector3(...o.from);
    this.to = o.to;
    this.h = o.h || 7;
    this.dur = o.dur || 1.5;
    this.label = o.label || 'Impulsarse con la estrella';
    this.btn = o.btn || 'Impulsar';
    this.mesh = new THREE.Group();
    const star = new THREE.Mesh(starGeo(), mat('#ffe08a', { emissive: 0xa07a10 }));
    star.scale.setScalar(0.9);
    star.rotation.x = -Math.PI / 2;
    star.position.y = 0.15;
    this.mesh.add(star);
    const ring = part(GEO.torus(), mat('#ffffff', { emissive: 0x8070c0 }), 0, 0.2, 0, 1.15, 1.15, 0.2);
    ring.rotation.x = Math.PI / 2;
    this.mesh.add(ring);
    this.star = star;
    this.mesh.position.copy(this.p);
    game.scene.add(this.mesh);
  }
  canUse(p) { return !this.game.player.flight && Math.hypot(p.x - this.p.x, p.z - this.p.z) < 1.4 && Math.abs(p.y - this.p.y) < 1.2; }
  use() {
    this.game.player.launch(this.to, this.h, this.dur);
    Audio.play('special');
    this.game.fx.burst(this.p.clone().add(new THREE.Vector3(0, 0.5, 0)), '#ffe08a', 30, 5);
    this.game.vibrate(30);
  }
  update(dt, t) {
    this.star.rotation.z = t * 2;
    this.star.position.y = 0.15 + Math.sin(t * 3) * 0.05;
    if (Math.random() < 0.3) this.game.fx.sparkle(this.p.clone().add(new THREE.Vector3(0, 0.4, 0)), '#fff2b8', 1, 0.8);
  }
}

/* ---------- Gelatina trampolín: rebote alto al caer encima ---------- */
export class Bouncer {
  constructor(game, o) {
    this.game = game;
    this.p = new THREE.Vector3(...o.pos);
    this.k = o.power || 17;
    this.mesh = part(GEO.ico(2), mat(o.color || '#9adcff', { emissive: 0x204060 }), this.p.x, this.p.y + 0.25, this.p.z, 1.0, 0.45, 1.0);
    game.scene.add(this.mesh);
    this.squash = 0;
    game.phys.fixedCollider(R.ColliderDesc.cylinder(0.25, 1.0).setTranslation(this.p.x, this.p.y + 0.25, this.p.z));
  }
  update(dt) {
    const pl = this.game.player, p = pl.pos;
    if (pl.grounded && Math.hypot(p.x - this.p.x, p.z - this.p.z) < 1.0 && p.y > this.p.y + 0.3 && p.y < this.p.y + 0.9) {
      pl.vel.y = this.k; pl.grounded = false; pl.boost = 0.9; pl.airJumps = this.game.stats.airJumps;
      this.squash = 1;
      Audio.play('jump');
      this.game.fx.ring(this.p.clone().add(new THREE.Vector3(0, 0.5, 0)), '#cfefff', 14, 3);
    }
    this.squash = Math.max(0, this.squash - dt * 4);
    this.mesh.scale.set(1 + this.squash * 0.3, 0.45 * (1 - this.squash * 0.5), 1 + this.squash * 0.3);
  }
}
