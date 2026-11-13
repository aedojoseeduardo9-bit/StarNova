/* Star Nova — escenas animadas ("videos" hechos con el propio mundo del juego).
 * Una escena es una lista de planos: { t: segundos, cam: { p: [desde, hasta], l: [desde, hasta], fov }, say, on(), tick(k, dt, t) }.
 * Mientras dura, el juego queda en estado 'cine' (nada se mueve salvo lo que la escena anima), con franjas
 * negras, subtítulos y un botón en la esquina: mantenerlo apretado salta la escena (en PC también Esc).
 * Regla: las escenas NO cambian la partida. Usan actores temporales (ctx.add) y, si tocan algo real,
 * registran cómo dejarlo igual (ctx.undo). Así se pueden saltar o repetir desde el menú sin romper nada.
 * Los textos están en js/content/story.js. */
import * as THREE from 'three';
import { REGIONS } from './world/palette.js';
import { makeSombra, makeGuardian, GEO, part } from './entities/models.js';
import { CHAPTERS, MEMORIES } from './content/story.js';
import { Audio } from './audio.js';

const $ = (id) => document.getElementById(id);
const HOLD = 0.9;                                   // segundos apretando para saltar
const ease = (k) => k * k * (3 - 2 * k);
const v = (x, y, z) => new THREE.Vector3(x, y, z);
const STAR_MAT = new THREE.MeshBasicMaterial({ color: '#fff3bf', fog: false });
const HALO_MAT = new THREE.MeshBasicMaterial({ color: '#ffe9a0', transparent: true, opacity: 0.3, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
const FRAG_MAT = new THREE.MeshLambertMaterial({ color: '#ffe9a0', emissive: 0xc79a30, flatShading: true });

/* Guardián de utilería (el de verdad es un enemigo con físicas). */
function propGuardian(ctx, x, y, z, yaw) {
  const m = ctx.add(makeGuardian());
  m.position.set(x, y, z);
  m.rotation.y = yaw;
  ctx.always((dt, t) => {
    m.userData.orbiters.forEach((o, i) => {
      const a = t * 0.9 + i * Math.PI / 2;
      o.position.set(Math.cos(a) * 2.6, 1.7 + Math.sin(t * 1.4 + i) * 0.3, Math.sin(a) * 2.6);
      o.rotation.set(t, t * 0.7, 0);
    });
    m.userData.core.scale.setScalar(0.45 + Math.sin(t * 3) * 0.05);
    m.userData.halo.rotation.z = t * 0.3;
  });
  return m;
}

/* ---------- las escenas ---------- */
const SCENES = {
  prologo(ctx) {
    const g = ctx.game, nc = REGIONS.nova.center, sp = g.spots.spawn;
    const C = v(nc[0], 15, nc[1]);                                   // Nova en lo alto del santuario
    ctx.night(1);
    ctx.hide(g.props.nova.mesh);
    ctx.pipAt([sp[0], 0.02, sp[2]], 0);
    const star = ctx.add(new THREE.Mesh(g.props.nova.mesh.geometry, STAR_MAT));
    star.position.copy(C); star.scale.setScalar(2.4);
    const halo = ctx.add(part(GEO.ico(1), HALO_MAT, C.x, C.y, C.z, 4.6));
    halo.castShadow = false;
    const guard = propGuardian(ctx, nc[0], 0, nc[1] + 3, Math.PI);
    const shadows = [];
    for (let i = 0; i < 10; i++) { const m = ctx.add(makeSombra(1.5 + (i % 3) * 0.6)); m.visible = false; shadows.push(m); }
    const frags = [[-55, 6, 0], [0, 8, -60], [53, 6, 0], [-14, 10, -30]].map(to => {
      const f = ctx.add(part(GEO.oct(), FRAG_MAT, C.x, C.y, C.z, 0.5));
      f.visible = false; f.userData.to = v(...to);
      return f;
    });
    let shake = 0;
    ctx.always((dt, t) => {
      ctx.faceCam(star, t);
      star.position.set(C.x + (Math.random() - 0.5) * shake, C.y + (Math.random() - 0.5) * shake, C.z);
      halo.scale.setScalar(4.6 + Math.sin(t * (2 + shake * 30)) * 0.4);
      if (star.visible && Math.random() < 0.5) g.fx.sparkle(C, '#fff2b8', 1, 2.4);
    });
    const ring = (k, r0, r1, y0, y1, spin) => shadows.forEach((m, i) => {
      const a = i / shadows.length * Math.PI * 2 + k * spin, r = r0 + (r1 - r0) * k;
      m.position.set(C.x + Math.cos(a) * r, y0 + (y1 - y0) * k + Math.sin(i * 1.7) * 1.2, C.z + Math.sin(a) * r);
      m.lookAt(C);
    });
    const face = v(sp[0], 0.5, sp[2]);
    const o = ctx.orbit();
    return [
      { t: 5.5, cam: { p: [v(0, 21, 30), v(0, 18.5, 39)], l: [C] }, say: 'Antes, las islas del cielo nunca conocieron la noche.' },
      { t: 5.5, cam: { p: [v(13, 17, 55), v(-11, 18.5, 53)], l: [C] }, say: 'Nova, la estrella pequeña, las cuidaba desde su santuario.' },
      { t: 4.5, cam: { p: [v(6.5, 1.0, 57), v(4.5, 1.5, 58)], l: [v(0, 2.2, 68), v(0, 4.6, 67)] }, say: 'Y a ella la cuidaba su mejor amigo: el Guardián.' },
      {
        t: 6, cam: { p: [v(0, 8, 38), v(0, 13, 43)], l: [v(0, 6, 65), C] }, say: 'Pero debajo de las islas dormía la Penumbra: sombras con hambre de luz.',
        on() { shadows.forEach(m => { m.visible = true; }); Audio.play('rumble'); },
        tick(k) { ring(ease(k), 17, 9, -9, C.y - 2, 2.2); },
      },
      {
        t: 5.5, cam: { p: [v(9, 17, 53), v(6.5, 16, 56)], l: [C] }, say: 'Una noche subieron todas a la vez. Para que no la devoraran, Nova tomó una decisión…',
        tick(k) { ring(ease(k), 9, 3.4, C.y - 2, C.y, 3.2); shake = k * 0.35; },
      },
      {
        t: 5.5, cam: { p: [v(0, 27, 90), v(0, 32, 99)], l: [v(0, 13, 55), v(0, 7, 20)] }, say: '…se rompió en fragmentos y los dejó caer sobre las islas.',
        on() {
          shake = 0; star.visible = false; halo.visible = false;
          g.fx.burst(C, '#fff2b8', 90, 14, 0.3, 1.6); g.fx.ring(C, '#ffffff', 40, 16);
          frags.forEach(f => { f.visible = true; });
          Audio.play('crystal'); Audio.play('rumble');
        },
        tick(k, dt, t) {
          ring(Math.min(1, k * 1.6), 3.4, 26, C.y, C.y + 5, 1.2);
          for (const f of frags) {
            f.position.lerpVectors(C, f.userData.to, ease(k));
            f.position.y += Math.sin(k * Math.PI) * 9;
            f.rotation.y = t * 5;
            f.scale.setScalar(0.5 + k * 1.3);
            g.fx.emit(f.position.x, f.position.y, f.position.z, 0, 0, 0, '#fff2b8', 0.5 + k * 0.9, 1.3, 0);
          }
        },
      },
      {
        t: 5.5, cam: { p: [v(1.3, 0.75, sp[2] + 2.3), v(0.95, 0.7, sp[2] + 1.9)], l: [face, v(sp[0], 0.62, sp[2])] }, say: 'En El Claro, una ardilla diminuta lo vio todo.',
        on() { shadows.forEach(m => { m.visible = false; }); guard.visible = false; frags.forEach((f, i) => { f.visible = i === 1; }); },
        tick(k, dt, t) {
          const f = frags[1];
          f.position.lerpVectors(v(22, 26, -18), v(-4, 9, -56), k);
          f.rotation.y = t * 5;
          f.scale.setScalar(0.7);
          g.fx.emit(f.position.x, f.position.y, f.position.z, 0, 0, 0, '#fff2b8', 0.6, 1.1, 0);
        },
      },
      {
        t: 5, cam: { p: [v(0.95, 0.7, sp[2] + 1.9), o.p], l: [v(sp[0], 0.62, sp[2]), o.l] }, say: 'Se llama Pip. Y esa noche decidió devolverle la luz al cielo.',
        on() { frags[1].visible = false; ctx.night(0); },
      },
    ];
  },

  /* Recuerdo de Nova que guarda el fragmento número n. */
  recuerdo(ctx, n) {
    const g = ctx.game, pl = g.player, P = pl.pos.clone(), mem = MEMORIES[n] || MEMORIES[1];
    const F = v(Math.sin(pl.yaw), 0, Math.cos(pl.yaw)), R = v(Math.cos(pl.yaw), 0, -Math.sin(pl.yaw));
    const at = (f, r, u) => P.clone().addScaledVector(F, f).addScaledVector(R, r).add(v(0, u, 0));
    const frag = ctx.add(part(GEO.oct(), FRAG_MAT, P.x, P.y + 1.15, P.z, 0.2));
    let sink = 0;
    ctx.always((dt, t) => {
      frag.rotation.y = t * 2.5;
      frag.position.y = P.y + 1.15 - sink * 0.7 + Math.sin(t * 2.2) * 0.05;
      frag.scale.setScalar(0.2 * (1 - sink));
      if (frag.visible && Math.random() < 0.35) g.fx.sparkle(frag.position, '#fff2b8', 1, 0.5);
    });
    const nc = REGIONS.nova.center;
    let path;                                                          // [cámara × 3, mirada × 3]
    if (mem.place === 'coral') {
      const b = g.props.bells[0].anchor;
      path = [v(-38, 9, 13), v(b.x + 7, b.y + 2.5, b.z + 8), v(b.x + 3.2, b.y + 0.6, b.z + 4.2), v(-55, 3, 0), v(b.x, b.y - 0.8, b.z), v(b.x, b.y - 0.8, b.z)];
    } else if (mem.place === 'menta') {
      path = [v(11, 3, -44), v(9, 10, -49), v(6.5, 16, -53), v(0, 6, -60), v(0, 11, -61), v(0, 15, -63)];
    } else if (mem.place === 'lavanda') {
      const a = g.spots.altar.pos;
      path = [v(38, 7, 10), v(56, 5.5, 8), v(a[0] - 9, a[1] + 2.2, 5), v(53, 2, 0), v(a[0], a[1], 0), v(a[0], a[1] + 0.4, 0)];
    } else {
      propGuardian(ctx, nc[0], 0, nc[1] + 3, Math.PI);
      path = [v(8, 2.2, 52), v(5.5, 2.6, 56), v(3.2, 2.2, 60.5), v(0, 2.4, 68), v(0, 2.2, 68), v(0, 2, 68)];
    }
    const o = ctx.orbit();
    const face = P.clone().add(v(0, 0.52, 0));
    return [
      { t: 4.8, cam: { p: [at(2.6, 1.2, 0.7), at(2.2, -0.5, 0.8)], l: [face, P.clone().add(v(0, 0.8, 0))] }, say: 'El fragmento late como un corazón pequeño. Dentro guarda un recuerdo de Nova…', on() { Audio.play('firefly'); } },
      { t: 6, cam: { p: [path[0], path[1]], l: [path[3], path[4]], linear: true }, say: ['Nova', mem.lines[0]], on() { ctx.tint(true); Audio.play('crystal'); } },
      { t: 6.2, cam: { p: [path[1], path[2]], l: [path[4], path[5]], linear: true }, say: ['Nova', mem.lines[1]] },
      {
        t: 4.6, cam: { p: [at(2.1, 0.6, 0.7), at(1.8, 0.3, 0.68)], l: [face] }, say: `Fragmento ${n} de 4. ${mem.end}`,
        on() { ctx.tint(false); },
        tick(k) { sink = ease(Math.min(1, k * 1.4)); if (sink >= 1 && frag.visible) { frag.visible = false; g.fx.burst(face, '#fff0b0', 30, 4, 0.18, 1); Audio.play('mission'); } },
      },
      { t: 1.8, cam: { p: [at(1.8, 0.3, 0.68), o.p], l: [face, o.l] } },
    ];
  },
  recuerdo1: (ctx) => SCENES.recuerdo(ctx, 1),
  recuerdo2: (ctx) => SCENES.recuerdo(ctx, 2),
  recuerdo3: (ctx) => SCENES.recuerdo(ctx, 3),
  recuerdo4: (ctx) => SCENES.recuerdo(ctx, 4),

  porton(ctx) {
    const g = ctx.game, G = g.props.gate, s = g.spots.gate, z = s.pos[2];
    const top = G.base.y + s.h / 2, low = top - s.h - 0.3;
    G.mesh.position.y = top;                                           // baja ante la cámara…
    ctx.undo(() => { if (G.open) G.snapOpen(); else G.mesh.position.y = top + G.y; });   // …y queda como deba quedar
    G.setLights(3);
    ctx.undo(() => G.setLights(Math.min(3, g.missions.fragments())));
    const o = ctx.orbit();
    return [
      { t: 4.6, cam: { p: [v(3, 1.5, z - 10), v(1.2, 1.9, z - 6.5)], l: [v(0, 2.6, z)] }, say: ['Abuela Lechuza', '«Tres luces… El portón del Santuario despierta, al sur del Claro.»'] },
      {
        t: 5.2, cam: { p: [v(1.2, 1.9, z - 6.5), v(0, 1.4, z - 4.6)], l: [v(0, 2.6, z), v(0, 1.8, z + 6)] }, say: 'Hace cien años que nadie lo cruza.',
        on() { Audio.play('rumble'); },
        tick(k) {
          G.mesh.position.y = top + (low - top) * ease(k);
          if (k < 0.95 && Math.random() < 0.6) g.fx.puff(v((Math.random() - 0.5) * 3, 0.1, z - 0.6), 2, '#d6d9f4');
        },
      },
      { t: 5.2, cam: { p: [v(0, 1.4, z - 4.6), v(0, 2.8, z + 5.5)], l: [v(0, 1.8, z + 6), v(0, 3.2, 65)] }, say: ['Abuela Lechuza', '«Ve con cuidado, Pip. Lo que duerme ahí dentro fue, una vez, el mejor amigo de Nova.»'], on() { G.mesh.position.y = low; } },
      { t: 1.8, cam: { p: [o.p.clone().add(v(0, 3.5, 0)), o.p], l: [o.l] } },
    ];
  },

  guardian(ctx) {
    const g = ctx.game, nc = REGIONS.nova.center, B = v(nc[0], 0, nc[1] + 2);
    if (g.boss && g.boss.model) ctx.hide(g.boss.model);
    const m = propGuardian(ctx, B.x, B.y, B.z, Math.PI);
    const o = ctx.orbit();
    return [
      { t: 4.2, cam: { p: [v(4, 0.7, B.z - 10), v(2.4, 1.1, B.z - 7.5)], l: [v(0, 1.2, B.z), v(0, 2.2, B.z)] }, say: ['El Guardián', '«…¿Quién… anda… ahí?»'], on() { Audio.play('rumble'); } },
      {
        t: 5, cam: { p: [v(-4.5, 1.4, B.z - 5.5), v(-6, 4.6, B.z - 7.5)], l: [v(0, 2.2, B.z)] }, say: ['El Guardián', '«Nadie toca la estrella. Lo prometí… lo prometí…»'],
        tick(k) {
          m.position.y = B.y + ease(k) * 1.1;
          for (let i = 0; i < 2; i++) { const a = Math.random() * 6.28; g.fx.emit(B.x + Math.cos(a) * 2.4, 0.2, B.z + Math.sin(a) * 2.4, 0, 2.2, 0, '#5a4fb0', 0.22, 1.1, 0); }
        },
      },
      { t: 4.4, cam: { p: [v(4.2, 2.3, B.z - 4.4), v(3.3, 2.7, B.z - 3.6)], l: [v(0, 2.7, B.z - 0.9)] }, say: 'Sus ojos ya no ven a Pip: solo ven sombras. Hay que despertarlo.' },
      { t: 1.8, cam: { p: [o.p.clone().add(v(0, 3, -3)), o.p], l: [v(0, 2.2, B.z), o.l] } },
    ];
  },

  final(ctx) {
    const g = ctx.game, nc = REGIONS.nova.center;
    const A = v(nc[0], 2.3, nc[1]);                                    // la estrella, sobre su pedestal
    ctx.night(1);
    ctx.hide(g.props.nova.mesh);
    if (g.boss && g.boss.model) ctx.hide(g.boss.model);
    ctx.pipAt([2.6, 0.02, nc[1] - 5], Math.atan2(-2.6, 5));
    const P = v(2.6, 0.02, nc[1] - 5);
    const star = ctx.add(new THREE.Mesh(g.props.nova.mesh.geometry, STAR_MAT));
    star.position.copy(A); star.scale.setScalar(0.25); star.visible = false;
    const halo = ctx.add(part(GEO.ico(1), HALO_MAT, A.x, A.y, A.z, 0.1));
    halo.castShadow = false;
    const guard = propGuardian(ctx, -5.2, 0, nc[1] - 3.5, Math.atan2(5.2, 3.5));
    guard.rotation.x = 0.22; guard.scale.set(1, 0.86, 1);
    const frags = [0, 1, 2, 3].map(i => ctx.add(part(GEO.oct(), FRAG_MAT, P.x, P.y + 1, P.z, 0.2)));
    let rise = 0, smoke = true, grow = 0.25;
    ctx.always((dt, t) => {
      ctx.faceCam(star, t, 0.7);
      star.position.y = A.y + rise * 15;
      star.scale.setScalar(grow + rise * 1.3);
      halo.position.copy(star.position);
      halo.scale.setScalar(star.visible ? (1.2 + rise * 2.6) * (1 + Math.sin(t * 3) * 0.08) : 0.01);
      if (star.visible && Math.random() < 0.6) g.fx.sparkle(star.position, '#fff2b8', 2, 1.2 + rise * 2);
      if (smoke) for (let i = 0; i < 2; i++) g.fx.emit(guard.position.x + (Math.random() - 0.5) * 3, 0.5 + Math.random() * 2.5, guard.position.z + (Math.random() - 0.5) * 3, (Math.random() - 0.5), 2.6, (Math.random() - 0.5), '#4a3f8c', 0.28, 1.4, 0);
    });
    const gp = guard.position;
    return [
      { t: 5.2, cam: { p: [v(-10, 1.8, nc[1] - 8.5), v(-8.5, 2.6, nc[1] - 7)], l: [v(gp.x, 1.8, gp.z)] }, say: 'La Penumbra sale del Guardián como humo viejo.', on() { Audio.play('rumble'); } },
      {
        t: 5.6, cam: { p: [v(P.x + 1.5, 0.8, P.z - 2.2), v(P.x + 2.2, 1.2, P.z - 3)], l: [v(P.x, 0.7, P.z), v(1, 1.6, nc[1] - 2)] }, say: ['Nova', '«Gracias, pequeña. Ya puedo volver a ser una sola.»'],
        on() { smoke = false; Audio.play('firefly'); },
        tick(k, dt, t) {
          frags.forEach((f, i) => {
            const a = t * 3 + i * Math.PI / 2, e = ease(Math.max(0, k * 1.5 - 0.5));
            const from = v(P.x + Math.cos(a) * 0.5, P.y + 0.9 + i * 0.08, P.z + Math.sin(a) * 0.5);
            f.position.lerpVectors(from, A, e);
            f.rotation.y = t * 4;
            g.fx.sparkle(f.position, '#fff2b8', 1, 0.3);
          });
        },
      },
      {
        t: 7, cam: { p: [v(7, 1.1, nc[1] - 11), v(10, 2.6, nc[1] - 16)], l: [A] }, look: () => star.position, say: 'Nova sube, despacio, hasta su lugar en el cielo.',
        on() { frags.forEach(f => { f.visible = false; }); star.visible = true; g.fx.burst(A, '#fff2b8', 70, 9, 0.26, 1.4); g.fx.ring(A, '#ffffff', 30, 9); Audio.play('mission'); },
        tick(k) { grow = 0.25 + Math.min(1, k * 4) * 0.65; rise = ease(k); },
      },
      {
        t: 5.2, cam: { p: [v(-8.5, 1.3, nc[1] - 6.5), v(-8, 1.9, nc[1] - 7.5)], l: [v(gp.x, 2.2, gp.z), v(gp.x, 3.4, gp.z)] }, say: ['El Guardián', '«…Nova. Lo prometí… y casi lo olvido.»'],
        tick(k) { guard.rotation.x = 0.22 * (1 - ease(k)); guard.scale.y = 0.86 + 0.14 * ease(k); },
      },
      { t: 6.2, cam: { p: [v(0, 30, -22), v(0, 38, -36)], l: [v(0, 13, 65)] }, say: 'Esa noche, por primera vez, las islas tuvieron una noche con estrellas.' },
      { t: 6.6, cam: { p: [v(P.x - 1.3, 0.45, P.z - 1.7), v(P.x - 1.0, 0.55, P.z - 1.4)], l: [v(P.x, 0.75, P.z), v(P.x, 1.0, P.z + 0.4)] }, say: 'Pero la Penumbra no desaparece: aprende a dormir. Y mientras duerma, alguien tendrá que seguir cuidando la luz.' },
    ];
  },
};

export const SCENE_IDS = CHAPTERS.map(c => c.id);

export class Cinema {
  constructor(game) {
    this.game = game;
    this.scene = null;
    this.ctx = null;
    this.hold = 0;
    this.holding = false;
    this.p = new THREE.Vector3();
    this.l = new THREE.Vector3();
    const b = $('cineSkip');
    const up = () => { this.holding = false; };
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.holding = true; });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  get playing() { return !!this.scene; }

  /* Empieza una escena. then(saltada) se llama al terminar (o enseguida si no se pudo empezar). */
  play(id, then) {
    const g = this.game;
    if (!SCENES[id] || this.scene) { if (then) then(false); return false; }
    const always = [];
    const ctx = this.ctx = {
      game: g, temp: [], undos: [], alwaysFns: always,
      add: (o) => { g.scene.add(o); ctx.temp.push(o); return o; },
      undo: (fn) => { ctx.undos.push(fn); },
      always: (fn) => { always.push(fn); },
      hide: (o) => { if (o && o.visible) { o.visible = false; ctx.undos.push(() => { o.visible = true; }); } },
      night: (k) => {
        if (!ctx.nightSet) { ctx.nightSet = true; ctx.undos.push(() => { g.sky.deepNight = 0; }); }
        g.sky.deepNight = k;
      },
      /* La estrella siempre de frente a la cámara, girando despacio. */
      faceCam: (o, t, speed = 0.5) => { o.quaternion.copy(g.camera.quaternion); o.rotateZ(t * speed); },
      tint: (on) => $('cine').classList.toggle('memory', on),
      pipAt: (pos, yaw) => {
        const pl = g.player, p0 = pl.pos.toArray(), y0 = pl.yaw;
        pl.teleport(pos); pl.yaw = yaw;
        ctx.undos.push(() => { pl.teleport(p0); pl.yaw = y0; });
      },
      orbit: () => g.cam.pose(g.player.pos.clone().add(v(0, 0.55, 0))),
    };
    const chapter = CHAPTERS.find(c => c.id === id);
    let shots;
    try { shots = SCENES[id](ctx); } catch (e) { console.error(e); this.cleanup(ctx); if (then) then(false); return false; }
    this.scene = { id, shots, i: -1, t: 0, then };
    this.fov0 = g.camera.fov;
    this.hold = 0; this.holding = false;
    g.state = 'cine';
    g.hud.clear();
    if (document.exitPointerLock) document.exitPointerLock();
    document.body.classList.add('cine');
    const box = $('cine');
    box.classList.remove('hidden', 'memory');
    void box.offsetWidth;                              // para que las franjas entren animadas
    box.classList.add('on');
    const tt = $('cineTitle');
    tt.querySelector('.k').textContent = chapter ? chapter.n : '';
    tt.querySelector('.t').textContent = chapter ? chapter.title : '';
    tt.classList.add('show');
    clearTimeout(this.titleT);
    this.titleT = setTimeout(() => tt.classList.remove('show'), 3400);
    this.next();
    return true;
  }

  next() {
    const S = this.scene;
    S.i++; S.t = 0;
    if (S.i >= S.shots.length) { this.finish(false); return; }
    const shot = S.shots[S.i];
    if (shot.on) shot.on();
    this.caption(shot.say);
    this.applyCam(shot, 0);
  }

  caption(say) {
    const box = $('cineText');
    const who = Array.isArray(say) ? say[0] : '', text = Array.isArray(say) ? say[1] : (say || '');
    box.querySelector('.who').textContent = who;
    box.querySelector('.line').textContent = text;
    box.classList.toggle('show', !!text);
    box.classList.toggle('voice', !!who);
  }

  applyCam(shot, k) {
    const c = shot.cam, cam = this.game.camera;
    if (!c) return;
    const e = c.linear ? k : ease(k);
    this.p.lerpVectors(c.p[0], c.p[1] || c.p[0], e);
    if (shot.look) this.l.copy(shot.look()); else this.l.lerpVectors(c.l[0], c.l[1] || c.l[0], e);
    cam.position.copy(this.p);
    cam.lookAt(this.l);
    const f = c.fov ? c.fov[0] + (c.fov[1] - c.fov[0]) * e : this.fov0;
    if (Math.abs(cam.fov - f) > 0.01) { cam.fov = f; cam.updateProjectionMatrix(); }
  }

  update(dt, t) {
    const S = this.scene;
    if (!S) return;
    const holding = this.holding || this.game.input.held.pause;
    this.hold = holding ? this.hold + dt : Math.max(0, this.hold - dt * 2);
    $('cineSkip').style.setProperty('--p', Math.min(1, this.hold / HOLD).toFixed(3));
    if (this.hold >= HOLD) { this.finish(true); return; }
    const shot = S.shots[S.i];
    S.t += dt;
    const k = Math.min(1, S.t / shot.t);
    if (shot.tick) shot.tick(k, dt, t);
    for (const fn of this.ctx.alwaysFns) fn(dt, t);
    this.applyCam(shot, k);
    if (S.t >= shot.t) this.next();
  }

  /* Adelanta la escena hasta el segundo indicado (para pruebas y capturas). */
  seek(secs) {
    for (let t = 0; t < secs && this.scene; t += 1 / 30) this.update(1 / 30, performance.now() / 1000 + t);
    $('cineTitle').classList.remove('show');
    this.game.sky.night = Math.max(this.game.sky.night, this.game.sky.deepNight);
  }

  cleanup(ctx) {
    for (const o of ctx.temp) if (o.parent) o.parent.remove(o);
    for (const fn of ctx.undos.reverse()) { try { fn(); } catch (e) { console.error(e); } }
  }

  finish(skipped) {
    const S = this.scene, g = this.game;
    if (!S) return;
    this.scene = null;
    this.hold = 0; this.holding = false;
    this.cleanup(this.ctx);
    this.ctx = null;
    clearTimeout(this.titleT);
    $('cineTitle').classList.remove('show');
    $('cineText').classList.remove('show');
    const box = $('cine');
    box.classList.remove('on', 'memory');
    setTimeout(() => { if (!this.scene) box.classList.add('hidden'); }, 500);
    $('cineSkip').style.setProperty('--p', 0);
    document.body.classList.remove('cine');
    g.onResize();                                        // devuelve el campo de visión normal
    g.cam.target.copy(g.player.pos).add(v(0, 0.55, 0));
    g.player.invuln = Math.max(g.player.invuln, 1.5);
    g.state = 'play';
    g.story.seen[S.id] = 1;
    g.saveSoon();
    if (S.then) S.then(skipped);
  }
}
