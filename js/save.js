/* Star Nova — perfiles de guardado: 3 ranuras en localStorage (starnova.perfil.1..3).
 * snapshot(juego) fotografía la partida; restore(juego, datos) la aplica EN SILENCIO sobre un mundo recién
 * creado (sin premios, rótulos ni sonidos). El mundo solo está "nuevo" al cargar la página: por eso
 * "Guardar y salir" y los viajes en cohete recargan la página.
 * Versión 2 (varios mundos): lo de Pip es común (nivel, objetos, chispas, trajes, historia) y cada mundo guarda
 * lo suyo en worlds[id] (misiones, campanas, cofres, oleadas, dónde estaba Pip…). Los perfiles v1 se migran solos. */
import { store } from './util.js';
import { MISSIONS } from './missions.js';
import { ITEMS } from './content/items.js';
import { ATTACKS, POWERS } from './content/attacks.js';
import { CHESTS } from './content/chests.js';
import { REGIONS } from './world/palette.js';
import { Chest } from './props.js';
import { OUTFITS, applyOutfit } from './entities/outfits.js';
import { WORLDS } from './worlds/index.js';

export const SLOTS = [1, 2, 3];
const VERSION = 2;
const key = (n) => 'perfil.' + n;
const WAVE_CALM_SAVE = 60;                // calma con la que vuelve una región que estaba terminando su ola

const num = (v, d) => (Number.isFinite(v) ? v : d);
const int = (v, a, b, d) => (Number.isFinite(v) ? Math.max(a, Math.min(b, Math.round(v))) : d);
const r2 = (v) => Math.round(v * 100) / 100;

export function cleanName(name) {
  const s = String(name || '').replace(/[<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12).trim();
  return s || 'Pip';
}

/* Perfil de la versión 1 (solo existían las Islas del Cielo) → versión 2. */
function migrate(d) {
  const started = !!d.world;
  const W = started ? { missions: d.missions, tracked: d.tracked, visited: d.visited, owl: d.owl, pos: d.pos, cam: d.cam, world: d.world, waves: d.waves, frags: d.frags } : null;
  return {
    v: VERSION, name: d.name, created: d.created, saved: d.saved, started: started ? 1 : 0,
    time: d.time, level: d.level, xp: d.xp, sparks: d.sparks, hp: d.hp, kills: d.kills,
    items: d.items, attack: d.attack, power: d.power, outfits: d.outfits, story: d.story,
    world: 'islas', worlds: W ? { islas: W } : {}, done: d.world && d.world.boss ? ['islas'] : [],
    frags: d.frags || 0, regionName: (REGIONS[d.region] || {}).name || 'El Claro',
  };
}

export const Profiles = {
  read(n) {
    let d = store.get(key(n), null);
    if (!d || typeof d !== 'object' || typeof d.name !== 'string') return null;
    if (d.v === 1) d = migrate(d);
    return d.v === VERSION ? d : null;
  },
  write(n, data) { return store.set(key(n), data); },
  remove(n) { store.del(key(n)); },
  copy(from, to) {
    const d = this.read(from);
    if (!d || this.read(to)) return false;
    return this.write(to, d);
  },
  list() { return SLOTS.map(n => this.read(n)); },
  /* Perfil recién creado: todavía sin partida (empieza la aventura desde el principio, en las Islas del Cielo). */
  blank(name) { return { v: VERSION, name: cleanName(name), created: Date.now(), saved: Date.now(), started: 0, time: 0, level: 1, world: 'islas', worlds: {}, done: [] }; },
  /* Resumen para la tarjeta de la ranura. */
  summary(d) {
    const s = Math.floor(num(d.time, 0));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    const w = WORLDS[d.world] || WORLDS.islas;
    return {
      name: cleanName(d.name),
      level: int(d.level, 1, 999, 1),
      stars: Array.isArray(d.done) ? d.done.filter(id => WORLDS[id]).length : 0,
      time: h ? `${h} h ${m} min` : m ? `${m} min` : 'recién empezada',
      world: w.name, galaxy: w.galaxy,
      region: d.regionName || w.regions[w.hub].name,
      ended: Array.isArray(d.done) && d.done.includes('soledad'),
    };
  },
};

/* Mundos terminados (jefe vencido), contando el actual. */
export function doneWorlds(g) {
  const out = new Set();
  for (const id in g.worldStates) if (g.worldStates[id] && g.worldStates[id].world && g.worldStates[id].world.boss) out.add(id);
  if (g.bossDone) out.add(g.world.id);
  return [...out].filter(id => WORLDS[id]);
}

/* Lo que guarda cada mundo. */
function worldSnapshot(g) {
  const M = g.missions, P = g.props, pl = g.player;
  const fighting = g.boss && !g.boss.dead && !g.bossDone;
  const door = g.world.places[g.world.bossRegion] || g.spots.spawn;
  const pos = fighting ? door : pl.lastSafe.toArray();
  const base = g.spots.chests.length;
  const chest = (c) => [c.def.id, c.opened ? 1 : 0, Math.max(0, Math.round(c.respawnT))];
  const missions = {};
  for (const m of MISSIONS) { const s = M.state[m.id]; missions[m.id] = [s.progress, s.done ? 1 : 0, s.discovered ? 1 : 0]; }
  return {
    missions, tracked: M.tracked, visited: [...M.visited], owl: g.owlDone ? 1 : 0,
    talked: Object.keys(g.talked),
    waves: Object.fromEntries(Object.entries(g.waves).map(([id, W]) => [id, [W.state, Math.round(W.pool), Math.round(W.calm)]])),
    pos: pos.map(r2), cam: [r2(g.cam.yaw), r2(g.cam.pitch)], frags: M.fragments(),
    world: {
      bells: P.bells.map(b => (b.rung ? 1 : 0)),
      crystals: P.crystals.map(c => (c.active ? 1 : 0)),
      fireflies: P.fireflies.map(f => (f.taken ? 1 : 0)),
      chests: P.chests.slice(0, base).map(chest),
      extra: P.chests.slice(base).map(c => ({ pos: c.p.toArray().map(r2), region: c.region, c: chest(c) })),
      altar: g.altarFragment && g.altarFragment.dead ? 1 : 0,
      gate: P.gate && P.gate.open ? 1 : 0,
      boss: g.bossDone ? 1 : 0,
      stardust: (g.stardust || []).map(s => (s.dead ? 1 : 0)),
    },
  };
}

/* Fotografía de la partida (solo datos simples). */
export function snapshot(g) {
  const items = {};
  for (const id in g.items) if (g.items[id] > 0) items[id] = g.items[id];
  const ws = worldSnapshot(g);
  return {
    v: VERSION, name: g.profile.name, created: g.profile.created, saved: Date.now(), started: 1,
    time: r2(g.time), level: g.level, xp: r2(g.xp), sparks: Math.floor(g.sparks), hp: r2(Math.max(1, g.hp)), kills: g.kills,
    items, attack: { id: g.arsenal.attack.id, tier: g.arsenal.attack.tier }, power: g.arsenal.power,
    outfits: { owned: [...g.outfits.owned], on: g.outfits.on },
    story: Object.keys(g.story.seen),
    world: g.world.id,
    worlds: Object.assign({}, g.worldStates, { [g.world.id]: ws }),
    done: doneWorlds(g),
    frags: ws.frags, regionName: (REGIONS[g.region] || REGIONS[g.world.hub]).name,
  };
}

/* Aplica una partida guardada sobre el mundo recién creado. Devuelve false si el perfil es nuevo. */
export function restore(g, d) {
  g.profile = { name: cleanName(d.name), created: num(d.created, Date.now()) };
  g.worldStates = d.worlds && typeof d.worlds === 'object' ? Object.assign({}, d.worlds) : {};
  if (!d.started) return false;

  // Pip: nivel, objetos, ataque y poder (lo mismo en todos los mundos)
  g.level = int(d.level, 1, 999, 1);
  g.xp = Math.max(0, num(d.xp, 0));
  g.sparks = Math.max(0, num(d.sparks, 0));
  g.time = Math.max(0, num(d.time, 0));
  g.kills = int(d.kills, 0, 1e9, 0);
  for (const id in d.items || {}) {
    const n = int(d.items[id], 0, 999, 0);
    if (!ITEMS[id] || !n) continue;
    g.items[id] = n;
    g.hud.addItem(id, true);
  }
  g.recompute();
  g.hp = Math.max(1, Math.min(g.stats.maxHp, num(d.hp, g.stats.maxHp)));
  g.shield = g.stats.maxShield;
  if (d.attack && ATTACKS[d.attack.id]) g.equipAttack({ id: d.attack.id, tier: int(d.attack.tier, 0, 5, 0) }, true);
  if (d.power && POWERS[d.power]) g.equipPower(d.power, true);

  // trajes
  const F = d.outfits || {};
  g.outfits.owned = (Array.isArray(F.owned) ? F.owned : []).filter((id, i, a) => OUTFITS[id] && a.indexOf(id) === i);
  g.outfits.on = g.outfits.owned.includes(F.on) ? F.on : null;
  applyOutfit(g.player.model, g.outfits.on);

  // escenas de la historia ya vistas
  g.story.seen = {};
  for (const id of Array.isArray(d.story) ? d.story : []) if (typeof id === 'string' && id.length < 24) g.story.seen[id] = 1;

  const W = g.worldStates[g.world.id];
  if (W) restoreWorld(g, W);
  g.hud.refreshMissions();
  g.hud.refreshLoadout();
  return true;
}

/* Lo de este mundo: misiones, oleadas, campanas, cofres, portón, jefe y dónde estaba Pip. */
function restoreWorld(g, d) {
  const M = g.missions, P = g.props, W = d.world || {}, world = g.world;

  // oleadas de sombras (si no, "guardar y salir" rellenaría todas las regiones)
  for (const id in g.waves) {
    const w = d.waves && d.waves[id];
    if (!Array.isArray(w) || !['ola', 'fin', 'calma'].includes(w[0])) continue;
    const S = g.waves[id];
    S.state = w[0] === 'fin' ? 'calma' : w[0];                  // al cargar no queda ninguna sombra viva
    S.pool = Math.max(0, num(w[1], S.pool));
    S.calm = S.state === 'calma' ? Math.max(1, num(w[2], WAVE_CALM_SAVE)) : 0;
    if (S.state === 'ola' && S.pool <= 0) { S.state = 'calma'; S.calm = WAVE_CALM_SAVE; }
  }

  // misiones (sin volver a dar premios)
  for (const m of MISSIONS) {
    const s = d.missions && d.missions[m.id];
    if (!Array.isArray(s)) continue;
    const st = M.state[m.id];
    st.done = !!s[1];
    st.progress = st.done ? m.goal : int(s[0], 0, m.goal, 0);
    st.discovered = !!s[2] || st.done || m.region === null;
  }
  M.visited = new Set((Array.isArray(d.visited) ? d.visited : []).filter(r => REGIONS[r]));
  M.tracked = d.tracked && M.state[d.tracked] && !M.state[d.tracked].done ? d.tracked : null;
  g.owlDone = !!d.owl;
  g.talked = {};
  for (const id of Array.isArray(d.talked) ? d.talked : []) if (typeof id === 'string') g.talked[id] = 1;

  // mundo: campanas, cristales, puente, coleccionables, cofres, portón, estrella
  const on = (list, i) => Array.isArray(list) && !!list[i];
  P.bells.forEach((b, i) => { if (on(W.bells, i)) b.rung = true; });
  P.crystals.forEach((c, i) => { if (on(W.crystals, i)) c.active = true; });
  if (P.bridge && P.crystals.length && P.crystals.every(c => c.active)) P.bridge.build(true);
  P.fireflies.forEach((f, i) => { if (on(W.fireflies, i)) { f.taken = true; g.scene.remove(f.mesh); } });
  (g.stardust || []).forEach((s, i) => { if (on(W.stardust, i)) s.dead = true; });
  const setChest = (c, s) => {
    if (!Array.isArray(s)) return;
    if (CHESTS[s[0]] && c.def.id !== s[0]) c.setType(s[0]);
    if (s[1]) { c.opened = true; c.lidT = 1; c.lid.rotation.x = -1.9; c.respawnT = Math.max(1, num(s[2], 30)); }
    g.see('chest', c.def.id);
  };
  P.chests.forEach((c, i) => setChest(c, Array.isArray(W.chests) ? W.chests[i] : null));
  for (const x of Array.isArray(W.extra) ? W.extra : []) {
    if (!x || !Array.isArray(x.pos) || !Array.isArray(x.c)) continue;
    const c = new Chest(g, { pos: x.pos, region: x.region, type: CHESTS[x.c[0]] ? x.c[0] : 'nova' });
    setChest(c, x.c);
    P.chests.push(c);
  }
  if (W.altar && g.altarFragment) g.altarFragment.dead = true;
  const n = M.fragments();
  if (P.gate) P.gate.setLights(Math.min(world.gateNeed, n));
  if (P.nova) P.nova.setLit(n / world.fragSlots * 0.5);
  if (P.gate && (W.gate || n >= world.gateNeed)) { P.gate.snapOpen(); if (M.state[world.finalMission]) M.state[world.finalMission].discovered = true; }
  if (W.boss) g.markBossDone(true);

  // lugar y cámara (lastSafe se queda en la salida: si el sitio guardado ya no existe, Pip vuelve allí)
  if (Array.isArray(d.pos) && d.pos.length === 3 && d.pos.every(Number.isFinite)) {
    g.player.teleport(d.pos);
    g.cam.target.copy(g.player.pos);
    if (Array.isArray(d.cam)) { g.cam.yaw = num(d.cam[0], 0); g.cam.pitch = num(d.cam[1], 0.32); }
    g.loadedPos = true;
  }
}
