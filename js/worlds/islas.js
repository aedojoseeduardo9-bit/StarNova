/* Star Nova — mundo 1: Islas del Cielo (Galaxia Nova). El mapa está en js/world/layout.js. */
import { ISLAS_REGIONS, REGIONS, REGION_IDS } from '../world/palette.js';
import { buildWorld } from '../world/layout.js';

const centerOf = (g, id, y = 0.5) => g.v3(REGIONS[id].center[0], y, REGIONS[id].center[1]);

export const MISSIONS_ISLAS = [
  // Principales
  { id: 'campanas', type: 'principal', region: 'coral', title: 'Las Tres Campanas', desc: 'Haz sonar las tres campanas del Jardín de Coral.', goal: 3, fragment: true,
    on: { bell: true }, targets: (g) => g.props.bells.filter(b => !b.rung).map(b => b.anchor.clone().setY(b.anchor.y - 0.8)) },
  { id: 'luciernagas', type: 'principal', region: 'menta', title: 'Luciérnagas Perdidas', desc: 'Rescata las tres luciérnagas en lo alto de las Torres de Menta.', goal: 3, fragment: true,
    on: { firefly: true }, targets: (g) => g.props.fireflies.filter(f => !f.taken).map(f => f.p) },
  { id: 'puente', type: 'principal', region: 'lavanda', title: 'El Puente Dormido', desc: 'Despierta los dos cristales, cruza el puente y toma el fragmento del altar.', goal: 3, fragment: true,
    on: { crystal: true, altar: true },
    targets: (g) => {
      const c = g.props.crystals.filter(x => !x.active).map(x => x.p);
      if (c.length) return c;
      return g.altarFragment && !g.altarFragment.dead ? [g.altarFragment.p] : [];
    } },
  { id: 'guardian', type: 'principal', region: 'nova', title: 'El Guardián de Nova', desc: 'Con 3 fragmentos se abre el santuario del sur. Enfrenta al Guardián y despiértalo.', goal: 1, final: true,
    on: { boss: true }, targets: (g) => [centerOf(g, 'nova', 1)] },
  // Secundarias
  { id: 'sombras', type: 'secundaria', region: 'menta', title: 'Plaga de Sombras', desc: 'Derrota 12 enemigos en las Torres de Menta. Premio: un fragmento extra de Nova.', goal: 12, fragment: true,
    on: { kill: (o, g, s) => o.region === 'menta' && s.discovered }, targets: (g) => [centerOf(g, 'menta')] },
  { id: 'explorador', type: 'secundaria', region: null, title: 'Exploradora del Cielo', desc: 'Visita las cinco regiones del mundo. Premio: objeto raro.', goal: 5, reward: [0, 20, 60, 20, 0, 0],
    on: { region: true }, visit: true, targets: (g) => REGION_IDS.filter(r => !g.missions.visited.has(r)).map(r => centerOf(g, r)) },
  { id: 'cofres', type: 'secundaria', region: null, title: 'Coleccionista', desc: 'Abre 5 cofres de cualquier tipo. Premio: objeto épico.', goal: 5, reward: [0, 0, 30, 60, 10, 0],
    on: { chest: true }, targets: (g) => g.props.chests.filter(c => !c.opened).map(c => c.p) },
  { id: 'elites', type: 'secundaria', region: null, title: 'Cazadora de Élites', desc: 'Derrota 3 enemigos élite. Premio: objeto épico o legendario.', goal: 3, reward: [0, 0, 0, 65, 35, 0],
    on: { kill: (o) => o.elite }, targets: (g) => g.enemies.filter(e => e.elite && !e.dead).map(e => e.pos) },
  { id: 'golem', type: 'secundaria', region: null, title: 'El Gólem Dormido', desc: 'Derrota a un Gólem de Arcos (aparecen cuando el reloj avanza). Premio: objeto legendario.', goal: 1, reward: [0, 0, 0, 20, 75, 5],
    on: { kill: (o) => o.type === 'golem' }, targets: (g) => g.enemies.filter(e => e.type === 'golem' && !e.dead).map(e => e.pos) },
];

/* El mapa de siempre + lo nuevo: el cohete de Brío (tapado hasta vencer al Guardián) y los PNJ del Claro. */
function build(game) {
  const s = buildWorld(game);
  s.rocket = { pos: [10.8, 0, 9.6], ry: -2.3, tarp: true };
  s.rocketExit = [11.4, 0.4, 7.1];
  s.rocketExitYaw = -0.6;
  s.npcs = [
    { id: 'brio', pos: [8.3, 0, 11.4], ry: -2.6 },
    { id: 'ovillo', pos: [-4.4, 0, 3.4], ry: 1.2 },
  ];
  return s;
}

export default {
  id: 'islas', order: 0,
  name: 'Islas del Cielo', galaxy: 'Galaxia Nova', star: 'Nova',
  blurb: 'Islas pastel flotando en un cielo de algodón. Aquí cayó Nova.',
  color: '#ef9a8f', color2: '#a996d8',
  regions: ISLAS_REGIONS,
  hub: 'claro', bossRegion: 'nova',
  build,
  guide: null,                       // en las Islas guía la Abuela Lechuza (clase propia)
  afterBossNight: true,
  missions: MISSIONS_ISLAS,
  fragSlots: 4, gateNeed: 3, finalMission: 'guardian',
  boss: 'guardian',
  enemies: (e) => !e.world,
  music: { day: 'dia', keys: { claro: 0, coral: 2, menta: -3, lavanda: 5, nova: 0 } },
  links: [['claro', 'coral'], ['claro', 'menta'], ['claro', 'lavanda'], ['claro', 'nova']],
  bridgeRegion: 'lavanda',
  scenes: { memory: 'recuerdo', gate: 'porton', boss: 'guardian', final: 'final', rocket: 'cohete' },
  texts: {
    gateOpen: 'El portón del Santuario de Nova se abrió (al sur)',
    hubNote: 'La hoguera cura · Abuela Lechuza',
    endKicker: 'fin del primer viaje', endTitle: 'Nova brilla de nuevo',
    endText: 'Las islas vuelven a brillar. Pero las sombras no descansan… y un Cofre Nova te espera en el santuario.',
    bossName: 'El Guardián de Nova', bossSub: 'protector de la estrella dormida',
  },
  places: {
    claro: [0, 0.6, 5], coral: [-46, 0.4, 1], menta: [0, 0.4, -45], lavanda: [44, 0.4, 0], nova: [0, 0.4, 44],
    santuario: [0, 0.4, 54], altar: [82.5, 0.4, 0], puente: [62, 0.4, 0], torre: [8, 11.4, -64], campana: [-55, 0.4, -2],
    cohete: [8.5, 0.4, 6.5],
  },
  placeYaw: { lavanda: -Math.PI / 2, puente: -Math.PI / 2, nova: Math.PI, santuario: Math.PI },
  bossPlace: 'santuario',
};
