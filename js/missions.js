/* Star Nova — misiones del mundo abierto (se pueden hacer en cualquier orden). */
import { REGIONS } from './world/palette.js';

export const MISSIONS = [
  { id: 'campanas', region: 'coral', title: 'Las Tres Campanas', desc: 'Haz sonar las tres campanas del Jardín de Coral.', goal: 3, unit: 'campanas', fragment: true },
  { id: 'luciernagas', region: 'menta', title: 'Luciérnagas Perdidas', desc: 'Rescata las tres luciérnagas en lo alto de las Torres de Menta.', goal: 3, unit: 'luciérnagas', fragment: true },
  { id: 'sombras', region: 'menta', title: 'Plaga de Sombras', desc: 'Derrota 12 sombras en las Torres de Menta.', goal: 12, unit: 'sombras', fragment: true },
  { id: 'puente', region: 'lavanda', title: 'El Puente Dormido', desc: 'Despierta los dos cristales, cruza el puente y toma el fragmento del altar.', goal: 3, unit: 'pasos', fragment: true },
  { id: 'guardian', region: 'nova', title: 'El Guardián de Nova', desc: 'Con 3 fragmentos se abre el santuario del sur. Vence al Guardián.', goal: 1, unit: '', final: true },
];

export class Missions {
  constructor(game) {
    this.game = game;
    this.state = {};
    for (const m of MISSIONS) this.state[m.id] = { progress: 0, done: false, discovered: m.id === 'guardian' ? false : false };
    this.tracked = 'campanas';
  }
  get(id) { return this.state[id]; }
  def(id) { return MISSIONS.find(m => m.id === id); }
  fragments() { return MISSIONS.filter(m => m.fragment && this.state[m.id].done).length; }

  discover(regionId) {
    let any = false;
    for (const m of MISSIONS) {
      if (m.region === regionId && !this.state[m.id].discovered) {
        this.state[m.id].discovered = true; any = true;
        this.game.hud.toast('Nueva misión: ' + m.title);
        if (!this.state[this.tracked] || this.state[this.tracked].done || !this.state[this.tracked].discovered) this.tracked = m.id;
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
    else this.game.hud.toast(m.title + ': ' + s.progress + ' / ' + m.goal);
    this.game.hud.refreshMissions();
  }

  complete(id) {
    const s = this.state[id], m = this.def(id);
    if (s.done) return;
    s.done = true;
    s.progress = m.goal;
    this.game.onMissionComplete(m);
    const next = MISSIONS.find(x => !this.state[x.id].done && this.state[x.id].discovered);
    if (next) this.tracked = next.id;
    this.game.hud.refreshMissions();
  }

  event(type, obj) {
    if (type === 'bell') this.advance('campanas');
    else if (type === 'firefly') this.advance('luciernagas');
    else if (type === 'kill' && obj.region === 'menta' && this.state.sombras.discovered) this.advance('sombras');
    else if (type === 'crystal') {
      this.advance('puente');
      if (this.game.props.crystals.every(c => c.active)) {
        this.game.props.bridge.build();
        this.game.hud.toast('¡El Puente de Lavanda despierta!');
      }
    } else if (type === 'altar') this.advance('puente');
    else if (type === 'boss') this.complete('guardian');
  }

  /* Posiciones objetivo de la misión seguida (para el marcador en pantalla). */
  targets(id = this.tracked) {
    const g = this.game, P = g.props;
    const s = this.state[id];
    if (!s || s.done) return [];
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
      default: return [];
    }
  }
}
