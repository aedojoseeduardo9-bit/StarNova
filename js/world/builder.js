/* Star Nova — constructor de arquitectura.
 * Cada pieza agrega geometría (con color por vértice) y, si hace falta, su
 * colisionador fijo en Rapier. Al final `finish()` une todo en UNA malla por
 * región: pocas llamadas de dibujo = buen rendimiento en teléfonos. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { R } from '../physics.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3();
const _c = new THREE.Color();
const _shade = new THREE.Color();
const _t = new THREE.Color();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();

export const MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

export class Builder {
  constructor(game, pal) {
    this.game = game;
    this.phys = game.phys;
    this.pal = pal;
    this.geos = [];
  }

  /* Agrega una geometría transformada y coloreada. */
  add(geo, color, x, y, z, rx = 0, ry = 0, rz = 0) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    _e.set(rx, ry, rz);
    _q.setFromEuler(_e);
    _m.compose(_p.set(x, y, z), _q, _s);
    g.applyMatrix4(_m);
    _c.set(color);
    _shade.set(this.pal.shade || '#c08890');
    const pos = g.attributes.position.array;
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    // sombreado "horneado": las caras laterales toman el tono de sombra de la región (nunca gris)
    for (let i = 0; i + 2 < n; i += 3) {
      _a.fromArray(pos, i * 3); _b.fromArray(pos, i * 3 + 3); _d.fromArray(pos, i * 3 + 6);
      _b.sub(_a); _d.sub(_a); _b.cross(_d).normalize();
      const ny = _b.y;
      const k = ny > 0.55 ? 0 : ny < -0.55 ? 0.55 : 0.34 + (_b.x > 0.3 ? 0.06 : 0);
      _t.copy(_c).lerp(_shade, k);
      for (let v = 0; v < 3; v++) { col[(i + v) * 3] = _t.r; col[(i + v) * 3 + 1] = _t.g; col[(i + v) * 3 + 2] = _t.b; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (g.attributes.uv) g.deleteAttribute('uv');
    if (g.attributes.normal) g.deleteAttribute('normal');
    this.geos.push(g);
    return g;
  }

  hull(g, owner) {
    const desc = R.ColliderDesc.convexHull(new Float32Array(g.attributes.position.array));
    if (desc) this.phys.fixedCollider(desc.setFriction(0.9), owner);
  }

  /* Caja con base en y (x,z centro). */
  box(x, y, z, w, h, d, color, o = {}) {
    const ry = o.ry || 0;
    this.add(new THREE.BoxGeometry(w, h, d), color, x, y + h / 2, z, 0, ry, 0);
    if (o.collide !== false) {
      _q.setFromEuler(_e.set(0, ry, 0));
      const desc = R.ColliderDesc.cuboid(w / 2, h / 2, d / 2)
        .setTranslation(x, y + h / 2, z)
        .setRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w })
        .setFriction(0.9);
      this.phys.fixedCollider(desc, o.owner);
    }
  }

  cyl(x, y, z, r, h, color, o = {}) {
    const g = this.add(new THREE.CylinderGeometry(o.rTop !== undefined ? o.rTop : r, r, h, o.seg || 8, 1), color, x, y + h / 2, z, 0, o.ry || 0, 0);
    if (o.collide !== false) this.hull(g, o.owner);
    return g;
  }

  cone(x, y, z, r, h, color, o = {}) { return this.cyl(x, y, z, r, h, color, Object.assign({ rTop: 0, collide: false }, o)); }

  dome(x, y, z, r, color, o = {}) {
    const g = this.add(new THREE.SphereGeometry(r, o.seg || 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), color, x, y, z);
    if (o.collide) this.hull(g);
    return g;
  }

  orb(x, y, z, r, color, detail = 0) { this.add(new THREE.IcosahedronGeometry(r, detail), color, x, y, z); }

  /* Agrega una geometría ya orientada (se rota en Y y se traslada). */
  addShaped(geo, color, x, y, z, ry = 0) {
    geo.rotateY(ry);
    return this.add(geo, color, x, y, z);
  }

  /* Ventana en arco sobre una cara: (x,y,z) base de la ventana, ry orientación de la cara. */
  window(x, y, z, ry, w, h, color) {
    const sh = new THREE.Shape();
    sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, h);
    sh.absarc(0, h, w / 2, 0, Math.PI, false);
    sh.lineTo(-w / 2, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false, curveSegments: 6 });
    g.translate(0, 0, -0.04);
    this.addShaped(g, color, x, y, z, ry);
  }

  /* Relleno de arco (enjuta): rectángulo con un semicírculo vaciado abajo. */
  spandrel(x, y, z, span, depth, ry, color) {
    const r = span / 2, top = r + 0.25;
    const sh = new THREE.Shape();
    sh.moveTo(-r, 0); sh.lineTo(-r, top); sh.lineTo(r, top); sh.lineTo(r, 0);
    sh.absarc(0, 0, r, 0, Math.PI, false);
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 10 });
    g.translate(0, 0, -depth / 2);
    this.addShaped(g, color, x, y, z, ry);
    return top;
  }

  /* Torre cuadrada con ventanas, cornisa y techo. */
  tower(x, z, y, w, h, o = {}) {
    const p = this.pal;
    const body = o.color || p.stone;
    this.box(x, y, z, w, h, w, body, { owner: o.owner });
    // cornisa
    this.box(x, y + h - 0.01, z, w + 0.3, 0.28, w + 0.3, o.trim || p.stone2, { collide: o.roof === 'flat' || !o.roof });
    if (o.windows !== false) {
      const rows = Math.max(1, Math.floor((h - 1.2) / 2.2));
      for (let i = 0; i < rows; i++) {
        const wy = y + 1.0 + i * 2.2;
        const half = w / 2 + 0.03;
        this.window(x, wy, z + half, 0, 0.42, 0.6, p.win);
        this.window(x + half, wy, z, Math.PI / 2, 0.42, 0.6, p.win);
        this.window(x, wy, z - half, 0, 0.42, 0.6, p.win);
        this.window(x - half, wy, z, Math.PI / 2, 0.42, 0.6, p.win);
      }
    }
    const top = y + h + 0.27;
    if (o.roof === 'dome') {
      this.cyl(x, top, z, w * 0.42, 0.3, p.stone2, { seg: 10 });
      this.dome(x, top + 0.3, z, w * 0.42, o.roofColor || p.roof);
      this.cone(x, top + 0.3 + w * 0.42 - 0.05, z, 0.12, 0.6, p.accent, { seg: 6 });
      this.orb(x, top + 0.95 + w * 0.42, z, 0.12, p.accent);
    } else if (o.roof === 'cone') {
      this.cone(x, top, z, w * 0.62, w * 1.3, o.roofColor || p.roof, { seg: 4, ry: Math.PI / 4 });
    }
    return top;
  }

  /* Arco: dos pilares, enjuta curva y dintel. ry orienta el paso. */
  arch(x, z, y, span, h, depth, o = {}) {
    const p = this.pal;
    const ry = o.ry || 0;
    const c = Math.cos(ry), s = Math.sin(ry);
    const pw = o.pillar || 0.9;
    const off = span / 2 + pw / 2;
    for (const sg of [-1, 1]) {
      this.box(x + c * off * sg, y, z - s * off * sg, pw, h, depth, o.color || p.stone, { ry });
    }
    const top = this.spandrel(x, y + h - span / 2, z, span, depth, ry, o.color || p.stone);
    const ly = y + h - span / 2 + top;
    this.box(x, ly, z, span + pw * 2 + 0.3, 0.6, depth + 0.15, o.trim || p.stone2, { ry });
    return ly + 0.6;
  }

  /* Plataformas en espiral alrededor de un punto (para trepar torres). */
  spiral(cx, cz, y0, n, dy, radius, a0, da, o = {}) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = a0 + i * da;
      const px = cx + Math.cos(a) * radius, pz = cz + Math.sin(a) * radius;
      const top = y0 + (i + 1) * dy;
      this.box(px, top - 0.35, pz, o.size || 1.5, 0.35, o.size || 1.5, i % 2 ? this.pal.stone2 : this.pal.stone, { ry: -a });
      out.push([px, top, pz]);
    }
    return out;
  }

  tree(x, y, z, s = 1) {
    const p = this.pal;
    this.cyl(x, y, z, 0.13 * s, 1.1 * s, '#b48a72', { seg: 6 });
    this.orb(x, y + 1.55 * s, z, 0.75 * s, p.leaf[0]);
    this.orb(x - 0.32 * s, y + 1.85 * s, z + 0.2 * s, 0.5 * s, p.leaf[1]);
    this.orb(x + 0.35 * s, y + 1.3 * s, z - 0.15 * s, 0.45 * s, p.leaf[1]);
  }

  /* Isla flotante: losa superior + base rocosa invertida. */
  island(x, z, top, r, o = {}) {
    const p = this.pal;
    const seg = o.seg || 10;
    const g = this.add(new THREE.CylinderGeometry(r, r, 1.4, seg, 1), o.ground || p.ground, x, top - 0.7, z, 0, o.ry || 0.3, 0);
    this.hull(g, o.owner || { kind: 'ground' });
    this.add(new THREE.CylinderGeometry(r * 0.985, r * 0.92, 0.5, seg, 1), p.stone2, x, top - 1.65, z, 0, o.ry || 0.3, 0);
    this.add(new THREE.CylinderGeometry(r * 0.92, r * 0.16, r * 0.8, seg, 1), p.rock, x, top - 1.9 - r * 0.4, z, 0, o.ry || 0.3, 0);
    const n = Math.max(3, Math.round(r / 3));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.4;
      const rr = r * 0.55;
      this.add(new THREE.CylinderGeometry(r * 0.12, 0, r * 0.45, 5, 1), p.rock, x + Math.cos(a) * rr, top - 2.2 - r * 0.3, z + Math.sin(a) * rr);
    }
  }

  /* Pasarela recta entre dos puntos (a la misma altura), con pretiles y pilares. */
  walkway(x0, z0, x1, z1, y, w, o = {}) {
    const p = this.pal;
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const ry = Math.atan2(-dz, dx);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    this.box(cx, y - 0.5, cz, len, 0.5, w, p.stone, { ry, owner: { kind: 'ground' } });
    this.box(cx, y - 0.9, cz, len, 0.4, w - 0.4, p.stone2, { ry, collide: false });
    const px = Math.sin(ry), pz = Math.cos(ry); // perpendicular en planta
    if (o.rails !== false) {
      for (const sg of [-1, 1]) {
        this.box(cx + px * sg * (w / 2 - 0.12), y, cz + pz * sg * (w / 2 - 0.12), len, 0.42, 0.24, p.stone2, { ry });
      }
    }
    const nP = Math.floor(len / 7);
    for (let i = 1; i <= nP; i++) {
      const t = i / (nP + 1);
      this.cyl(x0 + dx * t, y - 9.5, z0 + dz * t, 0.45, 8.6, p.stone2, { seg: 8, collide: false });
      this.cyl(x0 + dx * t, y - 12.5, z0 + dz * t, 0, 3, p.rock, { rTop: 0.45, seg: 8, collide: false });
    }
  }

  finish(scene) {
    if (!this.geos.length) return null;
    const merged = mergeGeometries(this.geos, false);
    for (const g of this.geos) g.dispose();
    this.geos = [];
    merged.computeVertexNormals();
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, MAT);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }
}
