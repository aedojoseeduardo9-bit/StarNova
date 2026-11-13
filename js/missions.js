/* Star Nova — misiones del mundo abierto. Principales (la historia de Nova) y secundarias (premios extra).
 * El jugador elige en el menú cuál seguir; nada se elige solo. */
import { REGIONS, REGION_IDS } from './world/palette.js';

export const MISSIONS = [
  // Principales
  { id: 'campanas', type: 'principal', region: 'coral', title: 'Las Tres Campanas', desc: 'Haz sonar las tres campanas del Jardín de Coral.', goal: 3, fragment: true },
  { id: 'luciernagas', type: 'principal', region: 'menta', title: 'Luciérnagas Perdidas', desc: 'Rescata las tres luciérnagas en lo alto de las Torres de Menta.', goal: 3, fragment: true },
  { id: 'puente', type: 'principal', region: 'lavanda', title: 'El Puente Dormido', desc: 'Despierta los dos cristales, cruza el puente y toma el fragmento del altar.', goal: 3, fragment: true },
  { id: 'guardian', type: 'principal', region: 'nova', title: 'El Guardián de Nova', desc: 'Con 3 fragmentos se abre el santuario del sur. Enfrenta al Guardián y despiértalo.', goal: 1, final: true },
  // Secundarias
  { id: 'sombras', type: 'secundaria', region: 'menta', title: 'Plaga de Sombras', desc: 'Derrota 12 enemigos en las Torres de Menta. Premio: un fragmento extra de Nova.', goal: 12, fragment: true },
  { id: 'explorador', type: 'secundaria', region: null, title: 'Exploradora del Cielo', desc: 'Visita las cinco regiones del mundo. Premio: objeto raro.', goal: 5, reward: [0, 20, 60, 20, 0, 0] },
  { id: 'cofres', type: 'secundaria', region: null, title: 'Coleccionista', desc: 'Abre 5 cofres de cualquier tipo. Premio: objeto épico.', goal: 5, reward: [0, 0, 30, 60, 10, 0] },
  { id: 'elites', type: 'secundaria', region: null, title: 'Cazadora de Élites', desc: 'Derrota 3 enemigos élite. Premio: objeto épico o legendario.', goal: 3, reward: [0, 0, 0, 65, 35, 0] },
  { id: 'golem', type: 'secundaria', region: null, title: 'El Gólem Dormido', desc: 'Derrota a un Gólem de Arcos (aparecen cuando el reloj avanza). Premio: objeto legendario.', goal: 1, reward: [0, 0, 0, 20, 75, 5] },
];

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
    if (s.done) return;
    s.discovered = true;
    s.progress = Math.min(m.goal, s.progress + n);
    if (s.progress >= m.goal) this.complete(id);
    else if (this.tracked === id || m.type === 'principal') this.game.hud.toast(m.title + ': ' + s.progress + ' / ' + m.goal);
    this.game.hud.refreshMissions();
  }

  complete(id) {
    const s = this.state[id], m = this.def(id);
    if (s.done) return;
    s.done = true;
    s.progress = m.goal;
    this.game.onMissionComplete(m);
    if (this.tracked === id) {
      this.tracked = null;
      setTimeout(() => this.game.hud.toast(this.game.k('Elige tu próxima misión en el menú (Tab)', 'Elige tu próxima misión en el menú Misiones')), 2200);
    }
    this.game.hud.refreshMissions();
  }

  event(type, obj) {
    const g = this.game;
    if (type === 'bell') this.advance('campanas');
    else if (type === 'firefly') this.advance('luciernagas');
    else if (type === 'kill') {
      if (obj.region === 'menta' && this.state.sombras.discovered) this.advance('sombras');
      if (obj.elite) this.advance('elites');
      if (obj.type === 'golem') this.advance('golem');
    } else if (type === 'crystal') {
      this.advance('puente');
      if (g.props.crystals.every(c => c.active)) {
        g.props.bridge.build();
        g.hud.toast('¡El Puente de Lavanda despierta!');
      }
    } else if (type === 'altar') this.advance('puente');
    else if (type === 'boss') this.complete('guardian');
    else if (type === 'chest') this.advance('cofres');
    else if (type === 'region') {
      if (!this.visited.has(obj)) { this.visited.add(obj); this.advance('explorador'); }
    }
  }

  /* Posiciones objetivo de la misión seguida (para el marcador en pantalla). */
  targets(id = this.tracked) {
    const g = this.game, P = g.props;
    const s = this.state[id];
    if (!id || !s || s.done) return [];
    const near = (list) => list.filter(Boolean);
    switch (id) {
      case 'campanas': return P.bells.filter(b => !b.rung).map(b => b.anchor.clone().setY(b.anchor.y - 0.8));
      case 'luciernagas': return P.fireflies.filter(f => !f.taken).map(f => f.p);
      case 'sombras': return [g.v3(REGIONS.menta.center[0], 0.5, REGIONS.menta.center[1])];
      case 'puente': {
        const c = P.crystals.filter(x => !x.active).map(x => x.p);
        if (c.length) return c;
        return g.altarFragment && !g.altarFragment.dead ? [g.altarFragment.p] : [];
      }
      case 'guardian': return [g.v3(REGIONS.nova.center[0], 1, REGIONS.nova.center[1])];
      case 'explorador': return REGION_IDS.filter(r => !this.visited.has(r)).map(r => g.v3(REGIONS[r].center[0], 0.5, REGIONS[r].center[1]));
      case 'cofres': return near(P.chests.filter(c => !c.opened).map(c => c.p));
      case 'elites': return g.enemies.filter(e => e.elite && !e.dead).map(e => e.pos);
      case 'golem': return g.enemies.filter(e => e.type === 'golem' && !e.dead).map(e => e.pos);
      default: return [];
    }
  }
}
