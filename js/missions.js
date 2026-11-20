/* Star Nova — misiones del mundo abierto. Cada mundo trae las suyas (ver js/worlds/): principales (la historia)
 * y secundarias (premios extra). El jugador elige en el menú cuál seguir; nada se elige solo.
 * Una misión: { id, type: 'principal'|'secundaria', region (null = todo el mundo), title, desc, goal,
 *   fragment?: da un fragmento · final?: la del jefe · reward?: pesos de rareza del premio,
 *   on: { evento: true | (obj, game, estado) => bool } — qué eventos la hacen avanzar,
 *   visit?: avanza una sola vez por región visitada · targets?: (game) => [Vector3] para el marcador } */
export const MISSIONS = [];
export function setMissions(list) { MISSIONS.length = 0; MISSIONS.push(...list); }

export class Missions {
  constructor(game) {
    this.game = game;
    this.state = {};
    for (const m of MISSIONS) this.state[m.id] = { progress: 0, done: false, discovered: m.region === null };
    this.tracked = null;          // lo elige el jugador
    this.visited = new Set();
  }
  get(id) { return this.state[id]; }
  def(id) { return MISSIONS.find(m => m.id === id); }
  fragments() { return MISSIONS.filter(m => m.fragment && this.state[m.id].done).length; }
  list(type) { return MISSIONS.filter(m => m.type === type); }

  track(id) {
    this.tracked = id;
    this.game.hud.refreshMissions();
    if (id) this.game.hud.toast('Siguiendo: ' + this.def(id).title);
  }

  discover(regionId) {
    let any = false;
    for (const m of MISSIONS) {
      if (m.region === regionId && !this.state[m.id].discovered) {
        this.state[m.id].discovered = true; any = true;
        this.game.hud.toast('Nueva misión ' + (m.type === 'principal' ? 'principal' : 'secundaria') + ': ' + m.title);
      }
    }
    if (any) this.game.hud.refreshMissions();
  }
  discoverAll() { for (const m of MISSIONS) this.state[m.id].discovered = true; this.game.hud.refreshMissions(); }

  advance(id, n = 1) {
    const s = this.state[id], m = this.def(id);
    if (!s || s.done) return;
    s.discovered = true;
    s.progress = Math.min(m.goal, s.progress + n);
    if (s.progress >= m.goal) this.complete(id);
    else if (this.tracked === id || m.type === 'principal') this.game.hud.toast(m.title + ': ' + s.progress + ' / ' + m.goal);
    this.game.hud.refreshMissions();
  }

  complete(id) {
    const s = this.state[id], m = this.def(id);
    if (!s || s.done) return;
    s.done = true;
    s.progress = m.goal;
    this.game.onMissionComplete(m);
    if (this.tracked === id) {
      this.tracked = null;
      setTimeout(() => this.game.hud.toast(this.game.k('Elige tu próxima misión en el menú (Tab)', 'Elige tu próxima misión en el menú')), 2200);
    }
    this.game.hud.refreshMissions();
  }

  /* Algo pasó en el mundo: 'bell', 'firefly', 'crystal', 'altar', 'boss', 'chest', 'kill', 'region'… */
  event(type, obj) {
    const g = this.game;
    for (const m of MISSIONS) {
      const s = this.state[m.id];
      if (s.done || !m.on || !(type in m.on)) continue;
      const rule = m.on[type];
      if (rule !== true && !rule(obj, g, s)) continue;
      if (m.visit && this.visited.has(obj)) continue;
      this.advance(m.id);
    }
    if (type === 'region') this.visited.add(obj);
    if (g.world.onEvent) g.world.onEvent(g, type, obj);
  }

  /* Posiciones objetivo de la misión seguida (para el marcador en pantalla y el mapa). */
  targets(id = this.tracked) {
    const s = this.state[id], m = this.def(id);
    if (!id || !s || s.done || !m || !m.targets) return [];
    return m.targets(this.game).filter(Boolean);
  }
}
