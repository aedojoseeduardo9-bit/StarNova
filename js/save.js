/* Star Nova — perfiles de guardado: 3 ranuras en localStorage (starnova.perfil.1..3).
 * snapshot(juego) fotografía la partida; restore(juego, datos) la aplica EN SILENCIO sobre un mundo recién
 * creado (sin premios, rótulos ni sonidos). El mundo solo está "nuevo" al cargar la página: por eso
 * "Guardar y salir" recarga la página y vuelve a la pantalla de perfiles. */
import { store } from './util.js';
import { MISSIONS } from './missions.js';
import { ITEMS } from './content/items.js';
import { ATTACKS, POWERS } from './content/attacks.js';
import { CHESTS } from './content/chests.js';
import { REGIONS } from './world/palette.js';
import { Chest } from './props.js';

export const SLOTS = [1, 2, 3];
const VERSION = 1;
const key = (n) => 'perfil.' + n;
const BOSS_DOOR = [0, 0.4, 44];            // fuera del santuario (si se guardó en plena pelea con el jefe)

const num = (v, d) => (Number.isFinite(v) ? v : d);
const int = (v, a, b, d) => (Number.isFinite(v) ? Math.max(a, Math.min(b, Math.round(v))) : d);
const r2 = (v) => Math.round(v * 100) / 100;

export function cleanName(name) {
  const s = String(name || '').replace(/[<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12).trim();
  return s || 'Pip';
}

export const Profiles = {
  read(n) {
    const d = store.get(key(n), null);
    return d && typeof d === 'object' && d.v === VERSION && typeof d.name === 'string' ? d : null;
  },
  write(n, data) { return store.set(key(n), data); },
  remove(n) { store.del(key(n)); },
  copy(from, to) {
    const d = this.read(from);
    if (!d || this.read(to)) return false;
    return this.write(to, d);
  },
  list() { return SLOTS.map(n => this.read(n)); },
  /* Perfil recién creado: todavía sin mundo guardado (empieza la aventura desde el principio). */
  blank(name) { return { v: VERSION, name: cleanName(name), created: Date.now(), saved: Date.now(), time: 0, level: 1, frags: 0, region: 'claro' }; },
  /* Resumen para la tarjeta de la ranura. */
  summary(d) {
    const s = Math.floor(num(d.time, 0));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return {
      name: cleanName(d.name),
      level: int(d.level, 1, 999, 1),
      frags: int(d.frags, 0, 4, 0),
      time: h ? `${h} h ${m} min` : m ? `${m} min` : 'recién empezada',
      region: (REGIONS[d.region] || REGIONS.claro).name,
      ended: !!(d.world && d.world.boss),
    };
  },
};

/* Fotografía de la partida (solo datos simples). */
export function snapshot(g) {
  const M = g.missions, P = g.props, pl = g.player;
  const fighting = g.boss && !g.boss.dead && !g.bossDone;
  const pos = fighting ? BOSS_DOOR : pl.lastSafe.toArray();
  const base = g.spots.chests.length;
  const chest = (c) => [c.def.id, c.opened ? 1 : 0, Math.max(0, Math.round(c.respawnT))];
  const missions = {};
  for (const m of MISSIONS) { const s = M.state[m.id]; missions[m.id] = [s.progress, s.done ? 1 : 0, s.discovered ? 1 : 0]; }
  const items = {};
  for (const id in g.items) if (g.items[id] > 0) items[id] = g.items[id];
  return {
    v: VERSION, name: g.profile.name, created: g.profile.created, saved: Date.now(),
    time: r2(g.time), level: g.level, xp: r2(g.xp), sparks: Math.floor(g.sparks), hp: r2(Math.max(1, g.hp)), kills: g.kills,
    frags: M.fragments(), region: g.region || 'claro',
    items, attack: { id: g.arsenal.attack.id, tier: g.arsenal.attack.tier }, power: g.arsenal.power,
    missions, tracked: M.tracked, visited: [...M.visited], owl: g.owlDone ? 1 : 0,
    pos: pos.map(r2), cam: [r2(g.cam.yaw), r2(g.cam.pitch)],
    world: {
      bells: P.bells.map(b => (b.rung ? 1 : 0)),
      crystals: P.crystals.map(c => (c.active ? 1 : 0)),
      fireflies: P.fireflies.map(f => (f.taken ? 1 : 0)),
      chests: P.chests.slice(0, base).map(chest),
      extra: P.chests.slice(base).map(c => ({ pos: c.p.toArray().map(r2), region: c.region, c: chest(c) })),
      altar: g.altarFragment.dead ? 1 : 0,
      gate: P.gate.open ? 1 : 0,
      boss: g.bossDone ? 1 : 0,
    },
  };
}

/* Aplica una partida guardada sobre el mundo recién creado. Devuelve false si el perfil es nuevo. */
export function restore(g, d) {
  const M = g.missions, P = g.props, W = d.world;
  g.profile = { name: cleanName(d.name), created: num(d.created, Date.now()) };
  if (!W) return false;

  // Pip: nivel, objetos, ataque y poder
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

  // mundo: campanas, cristales, puente, luciérnagas, cofres, portón, estrella
  const on = (list, i) => Array.isArray(list) && !!list[i];
  P.bells.forEach((b, i) => { if (on(W.bells, i)) b.rung = true; });
  P.crystals.forEach((c, i) => { if (on(W.crystals, i)) c.active = true; });
  if (P.crystals.length && P.crystals.every(c => c.active)) P.bridge.build(true);
  P.fireflies.forEach((f, i) => { if (on(W.fireflies, i)) { f.taken = true; g.scene.remove(f.mesh); } });
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
  if (W.altar) g.altarFragment.dead = true;
  const n = M.fragments();
  P.gate.setLights(Math.min(3, n));
  P.nova.setLit(n / 4 * 0.5);
  if (W.gate || n >= 3) { P.gate.snapOpen(); M.state.guardian.discovered = true; }
  if (W.boss) { g.bossDone = true; P.nova.awake = 12; g.sky.extraNight = 1; }

  // lugar y cámara (lastSafe se queda en el Claro: si el sitio guardado ya no existe, Pip vuelve allí)
  if (Array.isArray(d.pos) && d.pos.length === 3 && d.pos.every(Number.isFinite)) {
    g.player.teleport(d.pos);
    g.cam.target.copy(g.player.pos);
    if (Array.isArray(d.cam)) { g.cam.yaw = num(d.cam[0], 0); g.cam.pitch = num(d.cam[1], 0.32); }
    g.loadedPos = true;
  }
  g.hud.refreshMissions();
  g.hud.refreshLoadout();
  return true;
}
