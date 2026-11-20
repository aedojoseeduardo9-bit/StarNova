/* Star Nova — escenas animadas del gran viaje: el cohete, los viajes por el espacio, las llegadas a cada planeta
 * y la historia de las Galaxias Gemini y Soledad (recuerdos, jefes y finales). Usan el mismo motor que js/cinema.js
 * (planos con cámara, subtítulos y botón para saltar) y la misma regla: no cambian la partida. */
import * as THREE from 'three';
import { GEO, part } from './entities/models.js';
import { makeRocket } from './entities/npcs.js';
import { NPCS } from './content/npcs.js';
import { BOSSES } from './entities/bosses.js';
import { MEMORIES_GEMINI, MEMORIES_SOLEDAD, TRAVEL_LINES } from './content/story.js';
import { WORLDS } from './worlds/index.js';
import { Audio } from './audio.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = (k) => k * k * (3 - 2 * k);
const STAR_MAT = new THREE.MeshBasicMaterial({ color: '#fff3bf', fog: false });
const HALO = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.3, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
const FRAG_MAT = new THREE.MeshLambertMaterial({ color: '#ffe9a0', emissive: 0xc79a30, flatShading: true });
let STAR_GEO = null;
function starGeo() {
  if (STAR_GEO) return STAR_GEO;
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.45 : 1.1;
    if (i === 0) sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); else sh.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  STAR_GEO = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.1, bevelSegments: 1 });
  STAR_GEO.center();
  return STAR_GEO;
}
/* Una estrella con su halo (para las hermanas de Nova). */
function starActor(ctx, color, scale = 1) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(starGeo(), new THREE.MeshBasicMaterial({ color, fog: false }));
  m.scale.setScalar(scale);
  const h = part(GEO.ico(1), HALO(color), 0, 0, 0, scale * 2.2);
  h.castShadow = false;
  g.add(m, h);
  g.userData = { star: m, halo: h };
  ctx.add(g);
  ctx.always((dt, t) => { ctx.faceCam(m, t, 0.6); h.scale.setScalar(scale * (2.2 + Math.sin(t * 3) * 0.2)); });
  return g;
}
/* Estelas del hiperespacio alrededor de un punto, en la dirección -z. */
function warp(ctx, C, color = '#ffffff') {
  const N = 260, pos = new Float32Array(N * 6), data = [];
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = 2.5 + Math.random() * 26;
    data.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: -Math.random() * 220 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85, fog: false }));
  lines.frustumCulled = false;
  ctx.add(lines);
  const W = { speed: 60, update(dt) {
    const len = 1 + W.speed * 0.05;
    for (let i = 0; i < N; i++) {
      const d = data[i];
      d.z += W.speed * dt;
      if (d.z > 4) d.z -= 224;
      pos.set([C.x + d.x, C.y + d.y, C.z + d.z, C.x + d.x, C.y + d.y, C.z + d.z - len], i * 6);
    }
    geo.attributes.position.needsUpdate = true;
  } };
  ctx.always((dt) => W.update(dt));
  return W;
}
/* Arcoíris (medio aro de colores). */
function rainbow(ctx, at, radius, ry = 0) {
  const g = new THREE.Group();
  ['#ff7a8a', '#ffb86a', '#ffe08a', '#8adca0', '#8ac8ff', '#b89aff'].forEach((c, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(radius - i * radius * 0.04, radius * 0.02, 6, 48, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.75, fog: false, depthWrite: false }));
    g.add(m);
  });
  g.position.copy(at); g.rotation.y = ry;
  ctx.add(g);
  return g;
}

/* ---------- Islas: Brío destapa el Cohete Avellana ---------- */
function cohete(ctx) {
  const g = ctx.game, R = g.props.rocket;
  if (!R) return null;
  const P = R.p.clone(), brio = g.props.npcs.find(n => n.id === 'brio');
  ctx.night(0.8);
  ctx.pipAt([P.x + 1.5, P.y + 0.02, P.z - 3.6], Math.atan2(-1.5, 3.6));
  const sky = v(P.x - 6, P.y + 26, P.z - 34);
  const nova = starActor(ctx, '#fff3bf', 1.6); nova.position.copy(sky);
  const tarp = new THREE.Group();
  tarp.add(part(GEO.ico(1), new THREE.MeshLambertMaterial({ color: '#a9b48a', flatShading: true }), 0, 1.3, 0, 1.6, 1.4, 1.6));
  tarp.position.copy(P); ctx.add(tarp);
  ctx.hide(R.mesh);
  if (R.tarp) ctx.hide(R.tarp);
  const B = brio ? brio.p.clone() : P.clone().add(v(-2, 0, 1.8));
  const o = ctx.orbit();
  let lift = 0;
  ctx.always((dt) => {
    if (lift > 0) { tarp.position.y = P.y + lift * lift * 14; tarp.rotation.z = lift * 2.5; tarp.scale.setScalar(Math.max(0.01, 1 - lift * 0.6)); }
  });
  return [
    { t: 5.6, music: 'recuerdo', cam: { p: [v(P.x + 3, 1.0, P.z - 6.5), v(P.x + 2.4, 1.3, P.z - 7.2)], l: [v(P.x + 1.5, 0.8, P.z - 3.6), sky] }, say: ['Nova', '«Pip… gracias. Pero no fui la única que cayó aquella noche.»'], on() { ctx.pip.lookUp = 1; } },
    { t: 7, cam: { p: [v(P.x + 2.4, 1.3, P.z - 7.2), v(P.x + 1, 3, P.z - 9)], l: [sky] }, say: ['Nova', '«Mis hermanas también perdieron su luz: las gemelas de Gemini… y Sola, allá en la Galaxia Soledad.»'] },
    { t: 5.6, cam: { p: [v(B.x - 2.6, 1.3, B.z - 3.4), v(B.x - 2.2, 1.4, B.z - 2.9)], l: [v(B.x, 0.9, B.z)] }, say: ['Brío', '«¡Para eso armé esto! Con los pedacitos de estrella que llovieron sobre el Claro…»'], on() { ctx.pip.lookUp = 0; } },
    {
      t: 4.4, music: 'esperanza', cam: { p: [v(P.x + 5, 1.8, P.z - 6), v(P.x + 6.5, 2.6, P.z - 2)], l: [v(P.x, 2, P.z)] }, say: ['Brío', '«¡El Cohete Avellana!»'],
      on() { R.mesh.visible = true; g.fx.burst(v(P.x, P.y + 2, P.z), '#fff0b0', 50, 6, 0.2, 1.2); Audio.play('mission'); ctx.pip.hop(); ctx.shake(0.2); },
      tick(k) { lift = Math.min(1, k * 1.2); if (k > 0.95) tarp.visible = false; },
    },
    { t: 7, cam: { p: [v(P.x + 6.5, 2.6, P.z - 2), v(P.x + 2, 2.2, P.z + 6)], l: [v(P.x, 2, P.z)], linear: true }, say: ['Brío', '«Funciona con luz de estrella. Súbete, elige una galaxia en el mapa… y ve a rescatar los otros cristales de estrella.»'] },
    { t: 1.8, cam: { p: [v(P.x + 2, 2.2, P.z + 6), o.p], l: [v(P.x, 2, P.z), o.l] } },
  ];
}

/* ---------- Despegue y viaje por el espacio (en el mundo de salida) ---------- */
function viaje(ctx, dest) {
  const g = ctx.game, w = WORLDS[dest];
  let R = g.props.rocket, P;
  if (R && R.ready) P = R.p.clone();
  else {                                                     // repetición desde el menú en un mundo sin cohete a la vista
    const m = ctx.add(makeRocket());
    P = g.player.pos.clone().add(v(3, 0, -3));
    m.position.copy(P);
    R = { mesh: m, p: P };
  }
  const M = R.mesh, flame = M.userData.flame, y0 = M.position.y;
  ctx.undo(() => { M.position.y = y0; flame.visible = false; });
  ctx.pipAt([P.x + 2.6, P.y + 0.02, P.z + 1.2], Math.atan2(-2.6, -1.2));
  const pip0 = g.player.pos.clone(), win = v(P.x, P.y + 2.2, P.z);
  // espacio: todo pasa muy alto, lejos de las islas (la niebla las esconde)
  const C = v(P.x, 900, P.z);
  const ship = ctx.add(makeRocket());
  ship.position.copy(C).add(v(0, -1.6, -9)); ship.rotation.x = -Math.PI / 2; ship.visible = false;
  ship.userData.flame.visible = true;
  const neb = [];
  for (const [x, y, z, r, c] of [[-120, 40, -320, 90, w.color], [140, -60, -380, 110, w.color2], [0, 120, -420, 70, '#ffffff']]) {
    const n = part(GEO.ico(2), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.18, fog: false, depthWrite: false }), C.x + x, C.y + y, C.z + z, r);
    n.castShadow = false; n.visible = false; ctx.add(n); neb.push(n);
  }
  let W = null;
  const lines = TRAVEL_LINES[dest] || [];
  const smoke = (n, s = 1) => { for (let i = 0; i < n; i++) g.fx.puff(v(P.x + (Math.random() - 0.5) * 3 * s, P.y + 0.2, P.z + (Math.random() - 0.5) * 3 * s), 2, '#f4ece4'); };
  const count = (n) => ({ t: 1.0, cam: { p: [v(P.x + 4.5, 0.6, P.z + 4.5), v(P.x + 4.3, 0.7, P.z + 4.3)], l: [v(P.x, 1.5, P.z)] }, say: n + '…', on() { Audio.play('select'); ctx.shake(0.05 * (4 - n)); }, tick() { smoke(1, 0.6); } });
  return [
    {
      t: 3.4, music: 'viaje', cam: { p: [v(P.x + 6, 1.4, P.z + 3), v(P.x + 5.4, 1.8, P.z + 2)], l: [v(P.x + 1, 1.6, P.z)] }, say: 'Pip se sube al Cohete Avellana.',
      tick(k) {
        const e = ease(Math.min(1, k * 1.3));
        g.player.pos.lerpVectors(pip0, win, e); g.player.pos.y += Math.sin(e * Math.PI) * 1.4;
        g.player.yaw = Math.atan2(win.x - pip0.x, win.z - pip0.z);
        if (e > 0.98) ctx.hidePip();
      },
      on() { ctx.pip.hop(); },
    },
    count(3), count(2), count(1),
    {
      t: 3.8, cam: { p: [v(P.x + 7, 0.5, P.z + 7), v(P.x + 8, 0.8, P.z + 8)], l: [v(P.x, 2, P.z)] }, look: () => M.position.clone().add(v(0, 1.5, 0)), say: '¡Despegue!',
      on() { flame.visible = true; Audio.play('rumble'); Audio.play('special'); g.fx.burst(v(P.x, P.y + 0.3, P.z), '#ffd38a', 60, 8, 0.25, 1); ctx.shake(0.6); },
      tick(k) { M.position.y = y0 + k * k * 46; smoke(3, 1.4); if (Math.random() < 0.6) g.fx.emit(M.position.x, M.position.y, M.position.z, 0, -6, 0, '#ffb26b', 0.4, 0.5, 0); },
    },
    {
      t: 3.4, cam: { p: [v(P.x + 14, 75, P.z + 14), v(P.x + 12, 95, P.z + 12)], l: [v(P.x, 60, P.z)] }, look: () => M.position.clone(),
      on() { ctx.night(1); },
      tick(k) { M.position.y = y0 + 46 + k * 130; g.fx.emit(M.position.x, M.position.y - 0.5, M.position.z, 0, -8, 0, '#ffd38a', 0.5, 0.4, 0); },
    },
    {
      t: 6.2, cam: { p: [C.clone(), C.clone().add(v(0, 0.3, 0))], l: [C.clone().add(v(0, -0.5, -20))] }, say: lines[0],
      on() { ctx.flash('#ffffff', 0.5); ctx.space(1); g.sky.update(10, C, 0); ship.visible = true; neb.forEach(n => { n.visible = true; }); W = warp(ctx, C, '#ffffff'); Audio.play('crystal'); },
      tick(k, dt, t) { ship.rotation.z = Math.sin(t * 1.2) * 0.15; ship.position.y = C.y - 1.6 + Math.sin(t * 2) * 0.12; neb.forEach((n, i) => { n.position.z += dt * (4 + i); }); },
    },
    { t: 6.6, cam: { p: [C.clone().add(v(2.5, 0.6, -4)), C.clone().add(v(-2.5, 0.2, -5))], l: [C.clone().add(v(0, -1.6, -9))], linear: true }, say: lines[1], tick(k, dt, t) { ship.rotation.z = Math.sin(t * 1.2) * 0.15; } },
    { t: 6, cam: { p: [C.clone().add(v(-1.6, 1.6, -15)), C.clone().add(v(-0.6, 0.6, -13))], l: [C.clone().add(v(0, -1.6, -9))] }, say: lines[2], tick(k, dt, t) { ship.rotation.z = Math.sin(t * 1.2) * 0.15; if (W) W.speed = 60 + k * 120; } },
    { t: 1.6, cam: { p: [C.clone(), C.clone().add(v(0, 0, -1))], l: [C.clone().add(v(0, -1.6, -40))] }, on() { ctx.flash('#ffffff', 1.4); Audio.play('mission'); }, tick() { if (W) W.speed = 400; } },
  ];
}

/* ---------- Llegada a un planeta (primera vez: con historia; después: aterrizaje corto) ---------- */
function llegada(ctx, first) {
  const g = ctx.game, w = g.world, R = g.props.rocket;
  if (!R) return null;
  const P = R.p.clone(), M = R.mesh, flame = M.userData.flame, y0 = M.position.y;
  ctx.undo(() => { M.position.y = y0; flame.visible = false; });
  ctx.hidePip();
  const exit = g.player.pos.clone();
  const guide = w.guide ? g.props.npcs.find(n => n.id === w.guide) : null;
  const o = ctx.orbit();
  const H = 80;
  const shots = [];
  if (first) shots.push({
    t: 4.6, music: 'viaje', cam: { p: [v(P.x + 40, 95, P.z + 60), v(P.x + 30, 80, P.z + 45)], l: [v(P.x - 10, 0, P.z - 25)] }, say: [w.galaxy, w.texts.arrival[0]],
    on() { ctx.flash('#ffffff', 0.8); ctx.fogFar(520); M.position.y = y0 + H; flame.visible = true; },
    tick(k) { M.position.y = y0 + H * (1 - k * 0.3); },
  });
  shots.push(
    {
      t: 3.6, music: first ? null : 'viaje', cam: { p: [v(P.x + 9, 2, P.z + 9), v(P.x + 8, 1.4, P.z + 8)], l: [v(P.x, y0 + 30, P.z)] }, look: () => M.position.clone().add(v(0, 1, 0)),
      on() { flame.visible = true; if (first) ctx.fogFar(165); if (!first) { M.position.y = y0 + H; ctx.flash('#ffffff', 0.6); } Audio.play('rumble'); },
      tick(k) { const top = first ? H * 0.7 : H; M.position.y = y0 + top * Math.pow(1 - k, 2.2); if (Math.random() < 0.6) g.fx.emit(M.position.x, M.position.y, M.position.z, 0, -6, 0, '#ffb26b', 0.4, 0.5, 0); },
    },
    {
      t: 2.4, cam: { p: [v(P.x + 7, 1.2, P.z + 6), v(P.x + 6.4, 1.4, P.z + 5.4)], l: [v(P.x, 1.6, P.z)] },
      on() { M.position.y = y0; flame.visible = false; ctx.shake(0.5); g.fx.burst(v(P.x, P.y + 0.3, P.z), '#f4ece4', 60, 6, 0.3, 1.2); Audio.play('rumble'); },
    },
    {
      t: first ? 5.6 : 3.4, cam: { p: [v(exit.x + 2.4, 1.1, exit.z + 3), v(exit.x + 1.8, 0.9, exit.z + 2.4)], l: [v(exit.x, 0.6, exit.z)] }, say: first ? ['', w.texts.arrival[1]] : `${w.galaxy} · ${w.name}`,
      on() { ctx.showPip(); g.player.pos.set(P.x, P.y + 2.2, P.z); ctx.pip.hop(); Audio.play('jump'); },
      tick(k) { const e = ease(Math.min(1, k * 1.8)); g.player.pos.lerpVectors(v(P.x, P.y + 2.2, P.z), exit, e); g.player.pos.y += Math.sin(e * Math.PI) * 1.2; if (e >= 1) ctx.pip.lookUp = 0.8; },
    },
  );
  if (first && guide) shots.push({
    t: 6.4, cam: { p: [guide.p.clone().add(v(2.2, 1.3, 2.6)), guide.p.clone().add(v(1.6, 1.1, 2.1))], l: [guide.p.clone().add(v(0, 0.8, 0))] }, say: [guide.def.name, w.texts.arrival[2]],
    on() { ctx.pip.lookUp = 0; },
  });
  shots.push({ t: 1.8, cam: { p: [first && guide ? guide.p.clone().add(v(1.6, 1.1, 2.1)) : v(exit.x + 1.8, 0.9, exit.z + 2.4), o.p], l: [v(exit.x, 0.6, exit.z), o.l] } });
  return shots;
}

/* ---------- Recuerdo de un fragmento en Gemini o Soledad ---------- */
function memoria(ctx, n) {
  const g = ctx.game, w = g.world, mems = w.id === 'gemini' ? MEMORIES_GEMINI : MEMORIES_SOLEDAD, mem = mems[n] || mems[1];
  const pl = g.player, P = pl.pos.clone();
  const F = v(Math.sin(pl.yaw), 0, Math.cos(pl.yaw)), Rr = v(Math.cos(pl.yaw), 0, -Math.sin(pl.yaw));
  const at = (f, r, u) => P.clone().addScaledVector(F, f).addScaledVector(Rr, r).add(v(0, u, 0));
  const frag = ctx.add(part(GEO.oct(), FRAG_MAT, P.x, P.y + 1.15, P.z, 0.2));
  let sink = 0;
  ctx.always((dt, t) => {
    frag.rotation.y = t * 2.5;
    frag.position.y = P.y + 1.15 - sink * 0.7 + Math.sin(t * 2.2) * 0.05;
    frag.scale.setScalar(0.2 * (1 - sink));
  });
  const focus = w.memoryFocus(g, n);
  const orbitAt = (a, r, h) => focus.clone().add(v(Math.cos(a) * r, h, Math.sin(a) * r));
  const face = P.clone().add(v(0, 0.52, 0));
  const o = ctx.orbit();
  return [
    { t: 5.2, music: 'recuerdo', cam: { p: [at(2.6, 1.2, 0.7), at(2.2, -0.5, 0.8)], l: [face, P.clone().add(v(0, 0.8, 0))] }, say: 'El fragmento late como un corazón pequeño. Dentro guarda un recuerdo…', on() { Audio.play('firefly'); ctx.pip.lookUp = 0.9; } },
    { t: 6.4, cam: { p: [orbitAt(0.3, 16, 7), orbitAt(1.1, 13, 5.5)], l: [focus, focus], linear: true }, say: [mem.who, mem.lines[0]], on() { ctx.tint(true); Audio.play('crystal'); } },
    { t: 6.6, cam: { p: [orbitAt(1.1, 13, 5.5), orbitAt(1.9, 10, 4)], l: [focus, focus], linear: true }, say: [mem.who, mem.lines[1]] },
    {
      t: 4.6, cam: { p: [at(2.1, 0.6, 0.7), at(1.8, 0.3, 0.68)], l: [face] }, say: `Fragmento ${n} de ${w.fragSlots}. ${mem.end}`,
      on() { ctx.tint(false); },
      tick(k) { sink = ease(Math.min(1, k * 1.4)); if (sink >= 1 && frag.visible) { frag.visible = false; g.fx.burst(face, '#fff0b0', 30, 4, 0.18, 1); Audio.play('mission'); ctx.pip.lookUp = 0; ctx.pip.hop(); } },
    },
    { t: 1.8, cam: { p: [at(1.8, 0.3, 0.68), o.p], l: [face, o.l] } },
  ];
}

/* ---------- El jefe de Gemini o Soledad aparece ---------- */
function jefe(ctx) {
  const g = ctx.game, w = g.world, cfg = BOSSES[w.boss], a = g.spots.arena;
  const B = v(a.c[0], a.y || 0, a.c[1] + 2);
  if (g.boss && g.boss.model) ctx.hide(g.boss.model);
  const m = ctx.add(cfg.model());
  m.position.copy(B).add(v(0, -6, 0));
  const fake = { orbitR: cfg.orbit || 0, spinK: 0.6 };
  ctx.always((dt, t) => { cfg.animate(m.userData, t, false, fake); if (cfg.twin) m.rotation.y = t * 0.6; });
  const L = w.bossLines, o = ctx.orbit();
  return [
    {
      t: 4.6, music: 'guardian', cam: { p: [v(B.x + 5, 1.2, B.z - 12), v(B.x + 3, 1.6, B.z - 10)], l: [v(B.x, 2, B.z), v(B.x, 3, B.z)] }, say: L[0],
      on() { Audio.play('rumble'); ctx.shake(0.4); },
      tick(k) { m.position.y = B.y - 6 + ease(Math.min(1, k * 1.2)) * 6; if (Math.random() < 0.5) g.fx.puff(v(B.x + (Math.random() - 0.5) * 6, B.y + 0.1, B.z + (Math.random() - 0.5) * 6), 2, '#d6d0c8'); },
    },
    { t: 5.2, cam: { p: [v(B.x - 7, 2.2, B.z - 6), v(B.x - 8, 5, B.z - 2)], l: [v(B.x, 3, B.z)], linear: true }, say: L[1] },
    { t: 4.8, cam: { p: [v(B.x + 2.8, 2.4, B.z - 5.4), v(B.x + 2.2, 2.8, B.z - 4.6)], l: [v(B.x, 3.2, B.z)] }, say: L[2] },
    { t: 1.8, cam: { p: [o.p.clone().add(v(0, 3, -3)), o.p], l: [v(B.x, 2.5, B.z), o.l] } },
  ];
}

/* ---------- Final de Gemini: Alba y Ocaso ---------- */
function finalGemini(ctx) {
  const g = ctx.game, a = g.spots.arena, cfg = BOSSES.gemelos;
  const A = v(a.c[0], a.y || 0, a.c[1] + 2);
  if (g.boss && g.boss.model) ctx.hide(g.boss.model);
  ctx.night(0.7);
  ctx.pipAt([A.x + 2.4, A.y + 0.02, A.z - 6], Math.atan2(-2.4, 6));
  const P = v(A.x + 2.4, A.y, A.z - 6);
  const m = ctx.add(cfg.model());
  m.position.copy(A);
  const fake = { orbitR: 3.2, spinK: 0.3 };
  let crack = 0, sink = 0;
  ctx.always((dt, t) => {
    cfg.animate(m.userData, t, false, fake);
    m.userData.chain.forEach((l, i) => { l.position.x += (Math.random() - 0.5) * crack * 0.2; l.visible = crack < 1; });
    m.position.y = A.y - sink * 5;
  });
  const alba = starActor(ctx, '#ffe9a0', 0.7), ocaso = starActor(ctx, '#c8a8ff', 0.7);
  alba.visible = ocaso.visible = false;
  const crystal = ctx.add(part(GEO.oct(), new THREE.MeshLambertMaterial({ color: '#b8ffd0', emissive: 0x3a8a5a, flatShading: true }), A.x, A.y + 6, A.z, 0.35, 0.55, 0.35));
  crystal.visible = false;
  let rise = 0, hug = 0, give = 0;
  ctx.always((dt, t) => {
    const r = 3.2 * (1 - hug * 0.85), h = A.y + 2 + rise * 9;
    alba.position.set(A.x + Math.cos(t * 1.4) * r, h, A.z + Math.sin(t * 1.4) * r);
    ocaso.position.set(A.x - Math.cos(t * 1.4) * r, h, A.z - Math.sin(t * 1.4) * r);
    if (alba.visible && Math.random() < 0.6) { g.fx.sparkle(alba.position, '#fff2b8', 1, 0.6); g.fx.sparkle(ocaso.position, '#e0c8ff', 1, 0.6); }
    if (crystal.visible) { crystal.rotation.y = t * 3; crystal.position.lerpVectors(v(A.x, A.y + 11, A.z), P.clone().add(v(0, 1.2, 0)), ease(give)); }
  });
  const sky = v(A.x, A.y + 11, A.z), o = ctx.orbit();
  return [
    { t: 5, music: 'guardian', cam: { p: [v(A.x + 8, 2, A.z - 9), v(A.x + 6.5, 2.4, A.z - 7.5)], l: [v(A.x, 2.4, A.z)] }, say: 'La cadena de Penumbra que ataba a los Gemelos se agrieta…', tick(k) { crack = k * 0.9; ctx.shake(k * 0.15); } },
    {
      t: 5.6, cam: { p: [v(A.x - 7, 1.6, A.z - 8), v(A.x - 9, 3, A.z - 10)], l: [v(A.x, 2, A.z)] }, say: 'Los Gemelos de Raíz vuelven a ser lo que eran: dos viejos árboles que cuidaban a las gemelas.',
      on() { crack = 1; g.fx.burst(v(A.x, A.y + 2.4, A.z), '#5a3f8c', 60, 6, 0.25, 1.2); Audio.play('rumble'); ctx.flash('#3a2a5a', 0.4); },
      tick(k) { sink = ease(Math.max(0, k - 0.3) / 0.7) * 0.4; },
    },
    {
      t: 6.4, music: 'esperanza', cam: { p: [v(P.x + 1.5, 0.7, P.z - 2.4), v(P.x + 2, 1, P.z - 3)], l: [v(A.x, A.y + 3, A.z), sky] }, say: ['Alba', '«Ocaso… perdóname por no ver que estabas triste.»'],
      on() { alba.visible = ocaso.visible = true; ctx.pip.lookUp = 1; Audio.play('crystal'); },
      tick(k) { rise = ease(k) * 0.6; },
    },
    { t: 6.4, cam: { p: [v(A.x + 9, 4, A.z - 8), v(A.x + 6, 7, A.z - 10)], l: [sky] }, say: ['Ocaso', '«Y tú perdóname a mí. Yo no era tu sombra: era tu hermana.»'], tick(k) { rise = 0.6 + k * 0.4; hug = ease(k); } },
    {
      t: 6.6, cam: { p: [v(P.x + 1.6, 0.8, P.z - 2.4), v(P.x + 1.3, 0.9, P.z - 2)], l: [P.clone().add(v(0, 1.2, 0)), P.clone().add(v(0, 1, 0))] }, say: ['Alba y Ocaso', '«Toma, Pip: nuestro cristal de estrella. Y el camino a la Galaxia Soledad.»'],
      on() { crystal.visible = true; Audio.play('mission'); ctx.pip.lookUp = 0.4; },
      tick(k) { give = Math.min(1, k * 1.3); if (give >= 1 && crystal.visible) { crystal.visible = false; g.fx.burst(P.clone().add(v(0, 1, 0)), '#b8ffd0', 40, 5); ctx.pip.hop(); ctx.pip.lookUp = 0; } },
    },
    { t: 6.4, cam: { p: [v(A.x, 34, A.z - 70), v(A.x, 40, A.z - 82)], l: [v(A.x, 12, A.z)] }, say: 'Esa noche, en Verdalia, brillaron dos estrellas que nunca más se soltaron.' },
    { t: 1.8, cam: { p: [v(P.x + 1.3, 0.9, P.z - 2), o.p], l: [P.clone().add(v(0, 1, 0)), o.l] } },
  ];
}

/* ---------- Final de Soledad (epílogo del gran viaje) ---------- */
function finalSoledad(ctx) {
  const g = ctx.game, a = g.spots.arena, cfg = BOSSES.polilla;
  const A = v(a.c[0], a.y || 0, a.c[1] + 2);
  if (g.boss && g.boss.model) ctx.hide(g.boss.model);
  ctx.night(0.9);
  ctx.pipAt([A.x + 2.2, A.y + 0.02, A.z - 6.5], Math.atan2(-2.2, 6.5));
  const P = v(A.x + 2.2, A.y, A.z - 6.5);
  const moth = ctx.add(cfg.model());
  moth.position.copy(A).add(v(0, 1, 0));
  let fade = 1;
  ctx.always((dt, t) => { cfg.animate(moth.userData, t, false); moth.scale.setScalar(Math.max(0.01, fade)); moth.visible = fade > 0.02; });
  const sola = starActor(ctx, '#ffc8f0', 0.55); sola.visible = false;
  const sisters = [['#fff3bf', 1.0], ['#ffe9a0', 0.7], ['#c8a8ff', 0.7]].map(([c, s]) => { const st = starActor(ctx, c, s); st.visible = false; return st; });
  let gather = 0, up = 0;
  const S0 = v(A.x, A.y + 2.4, A.z);
  ctx.always((dt, t) => {
    sola.position.copy(S0).add(v(Math.sin(t * 7) * 0.05 * (1 - gather), up * 14, 0));
    sisters.forEach((st, i) => {
      const ang = t * 0.8 + i * Math.PI * 2 / 3, r = 2.6 + (1 - gather) * 10;
      st.position.set(S0.x + Math.cos(ang) * r, S0.y + (1 - gather) * 16 + up * 14 + Math.sin(t * 2 + i) * 0.3, S0.z + Math.sin(ang) * r);
    });
    if (sola.visible && Math.random() < 0.5) g.fx.sparkle(sola.position, '#' + new THREE.Color().setHSL((t * 0.3) % 1, 0.8, 0.75).getHexString(), 1, 0.8);
  });
  let bows = null;
  const sky = v(A.x, A.y + 16, A.z), o = ctx.orbit();
  return [
    {
      t: 5.4, music: 'guardian', cam: { p: [v(A.x + 7, 2.4, A.z - 9), v(A.x + 5.5, 2.8, A.z - 7.5)], l: [v(A.x, 3, A.z)] }, say: 'La Polilla de la Soledad se deshace en mil colores.',
      tick(k, dt, t) { fade = 1 - ease(k); if (Math.random() < 0.9) g.fx.emit(A.x + (Math.random() - 0.5) * 4, A.y + 1 + Math.random() * 4, A.z + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2, 2, (Math.random() - 0.5) * 2, '#' + new THREE.Color().setHSL(Math.random(), 0.85, 0.7).getHexString(), 0.25, 1.4, 0); },
    },
    { t: 6.4, music: 'recuerdo', cam: { p: [v(P.x + 1.2, 1.2, P.z - 1.8), v(P.x + 0.8, 1.3, P.z - 1.4)], l: [S0] }, say: ['Sola', '«¿De… de verdad viniste? ¿Hasta aquí? ¿Por mí?»'], on() { sola.visible = true; ctx.pip.lookUp = 0.7; Audio.play('crystal'); } },
    { t: 5.2, cam: { p: [v(P.x - 1.4, 0.6, P.z + 1.6), v(P.x - 1.1, 0.7, P.z + 1.3)], l: [P.clone().add(v(0, 0.6, 0))] }, say: 'Pip asiente con la cabeza. Viajó por tres galaxias para llegar hasta aquí.', on() { ctx.pip.lookUp = 0; ctx.pip.hop(); } },
    {
      t: 7.4, music: 'esperanza', cam: { p: [v(A.x + 10, 3, A.z - 10), v(A.x + 8, 6, A.z - 12)], l: [S0, v(A.x, A.y + 5, A.z)] }, say: ['Nova', '«Bienvenida, hermana. Nunca más vas a estar sola.»'],
      on() { sisters.forEach(s => { s.visible = true; }); Audio.play('mission'); bows = [rainbow(ctx, v(A.x, A.y - 4, A.z + 6), 22, 0.3), rainbow(ctx, v(A.x - 30, A.y - 10, A.z + 30), 40, -0.4)]; bows.forEach(b => b.scale.setScalar(0.01)); },
      tick(k) { gather = ease(k); if (bows) bows.forEach(b => b.scale.setScalar(0.01 + ease(k))); },
    },
    { t: 6.6, cam: { p: [v(A.x, 6, A.z - 26), v(A.x, 10, A.z - 34)], l: [sky] }, say: 'Las cuatro estrellas brillaron juntas. La Penumbra, sin nadie a quien asustar, se quedó dormida.', tick(k) { up = ease(k); } },
    { t: 6.8, cam: { p: [v(P.x - 1.3, 0.45, P.z - 1.7), v(P.x - 1.0, 0.55, P.z - 1.4)], l: [v(P.x, 0.75, P.z), v(P.x, 1.0, P.z + 0.4)] }, say: 'Y una ardilla diminuta volvió a casa en un cohete con forma de avellana.', on() { ctx.pip.lookUp = 1; } },
    { t: 6, cam: { p: [v(A.x + 40, 30, A.z - 60), v(A.x + 50, 36, A.z - 70)], l: [v(A.x, 8, A.z)] }, say: 'Fin del gran viaje de Pip. Las sombras siguen ahí afuera… y los cofres también.', on() { ctx.pip.lookUp = 0; } },
  ];
}

export const WORLD_SCENES = {
  cohete,
  viaje_gemini: (ctx) => viaje(ctx, 'gemini'),
  viaje_soledad: (ctx) => viaje(ctx, 'soledad'),
  llegada_gemini: (ctx) => llegada(ctx, true),
  llegada_soledad: (ctx) => llegada(ctx, true),
  aterrizaje: (ctx) => llegada(ctx, false),
  gemini_recuerdo1: (ctx) => memoria(ctx, 1), gemini_recuerdo2: (ctx) => memoria(ctx, 2), gemini_recuerdo3: (ctx) => memoria(ctx, 3),
  soledad_recuerdo1: (ctx) => memoria(ctx, 1), soledad_recuerdo2: (ctx) => memoria(ctx, 2), soledad_recuerdo3: (ctx) => memoria(ctx, 3),
  gemini_jefe: jefe, soledad_jefe: jefe,
  gemini_final: finalGemini, soledad_final: finalSoledad,
};
