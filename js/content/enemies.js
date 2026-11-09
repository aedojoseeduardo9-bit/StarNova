/* Star Nova — 16 enemigos + 6 modificadores élite. La IA de cada "ai" está en js/entities/enemies.js. */
const D = (id, name, desc, o) => Object.assign({ id, name, desc, hp: 30, dmg: 9, speed: 3, r: 0.42, h: 0.62, xp: 7, sparks: 6, cost: 8, minDiff: 1, weight: 1, kind: 'enemy' }, o);

export const ENEMY_LIST = [
  D('sombra', 'Sombra', 'Cubo de tinta que avanza a brincos.', { ai: 'hopper', model: 'cube', colors: ['#4d4a92', '#7c7bd0', '#2f2d66'], hp: 34 }),
  D('farol', 'Farol', 'Orbe flotante que dispara burbujas.', { ai: 'flyer', model: 'orb', colors: ['#c3a7e6', '#7f63b8', '#fff3c8'], hp: 26, dmg: 7, flying: true, cost: 11, sparks: 7, xp: 8 }),
  D('totem', 'Tótem', 'Pesado y lento: da pisotones.', { ai: 'heavy', model: 'totem', colors: ['#9d5d86', '#c77fa4', '#e8a3c0'], hp: 150, dmg: 18, speed: 1.7, r: 0.6, h: 1.65, xp: 24, sparks: 18, cost: 26, minDiff: 1.6, weight: 0.5 }),
  D('chispita', 'Chispita', 'Pequeña y veloz; llega en grupo.', { ai: 'swarm', model: 'mini', colors: ['#ff9fb2', '#ffd0d8', '#c95a7a'], hp: 12, dmg: 5, speed: 5.5, r: 0.28, h: 0.36, xp: 3, sparks: 3, cost: 9, group: 3 }),
  D('erizo', 'Erizo de Piedra', 'Se enrolla y embiste rodando.', { ai: 'roller', model: 'spiky', colors: ['#b98a6a', '#e0c0a0', '#6f4a35'], hp: 55, dmg: 14, speed: 9, r: 0.45, h: 0.8, xp: 10, sparks: 9, cost: 14, minDiff: 1.3 }),
  D('vigia', 'Ojo Vigía', 'Pirámide quieta que dispara ráfagas.', { ai: 'turret', model: 'pyramid', colors: ['#f2c46c', '#ffe7a8', '#8a5a20'], hp: 60, dmg: 8, speed: 0, r: 0.5, h: 1.1, xp: 11, sparks: 10, cost: 13, minDiff: 1.2 }),
  D('bomba', 'Bomba Lila', 'Corre hacia ti y explota.', { ai: 'bomber', model: 'bomb', colors: ['#b49ae0', '#e0d0ff', '#5a3f8a'], hp: 22, dmg: 24, speed: 4.2, r: 0.38, h: 0.7, xp: 8, sparks: 7, cost: 11, minDiff: 1.4 }),
  D('gelatina', 'Gelatina Prisma', 'Al romperse se divide en dos.', { ai: 'splitter', model: 'jelly', colors: ['#9fe3d0', '#d8fff4', '#4fae98'], hp: 48, dmg: 10, speed: 2.6, r: 0.5, h: 0.7, xp: 9, sparks: 8, cost: 13, minDiff: 1.5 }),
  D('loto', 'Loto Sombrío', 'Cura a los demás enemigos desde lejos.', { ai: 'healer', model: 'lotus', colors: ['#e0a8d8', '#fff0fa', '#8a4f84'], hp: 40, dmg: 6, speed: 2.2, r: 0.45, h: 0.9, xp: 12, sparks: 12, cost: 15, minDiff: 1.8, weight: 0.6 }),
  D('muro', 'Muro Andante', 'Su escudo frontal bloquea casi todo: rodéalo.', { ai: 'shielder', model: 'slab', colors: ['#8e94d6', '#c9cdf3', '#4b50a6'], hp: 110, dmg: 14, speed: 1.6, r: 0.6, h: 1.5, xp: 16, sparks: 14, cost: 18, minDiff: 2, weight: 0.6 }),
  D('polilla', 'Polilla Fantasma', 'Desaparece y reaparece para atacarte en picada.', { ai: 'blinker', model: 'moth', colors: ['#e8f0ff', '#ffffff', '#8f8ac8'], hp: 30, dmg: 11, speed: 5, r: 0.4, h: 0.6, flying: true, xp: 10, sparks: 9, cost: 13, minDiff: 1.7 }),
  D('campanaoscura', 'Campana Oscura', 'Llama a chispitas cada pocos segundos.', { ai: 'summoner', model: 'darkbell', colors: ['#5a5fae', '#8e94d6', '#f2c46c'], hp: 70, dmg: 8, speed: 1.2, r: 0.5, h: 1.1, xp: 15, sparks: 14, cost: 18, minDiff: 2.2, weight: 0.5 }),
  D('aguja', 'Aguja Lunar', 'Apunta con un rayo de aviso y dispara muy rápido.', { ai: 'sniper', model: 'needle', colors: ['#c7c3f0', '#ffffff', '#6a64b0'], hp: 34, dmg: 20, speed: 2, r: 0.35, h: 1.2, flying: true, xp: 13, sparks: 12, cost: 16, minDiff: 2.3, weight: 0.6 }),
  D('topo', 'Topo de Cristal', 'Viaja bajo tierra y sale bajo tus pies.', { ai: 'burrower', model: 'mole', colors: ['#8cc6ff', '#d8f0ff', '#4a6a9a'], hp: 45, dmg: 15, speed: 4.5, r: 0.45, h: 0.7, xp: 12, sparks: 11, cost: 15, minDiff: 2.5, weight: 0.6 }),
  D('remolinoe', 'Remolino', 'Cono que gira y te arrastra hacia él.', { ai: 'twister', model: 'twister', colors: ['#a8e0e8', '#e8fbff', '#5aa0b0'], hp: 60, dmg: 9, speed: 2.8, r: 0.55, h: 1.2, xp: 13, sparks: 12, cost: 16, minDiff: 2.6, weight: 0.5 }),
  D('golem', 'Gólem de Arcos', 'Mini jefe: lanza rocas y aplasta el suelo.', { ai: 'golem', model: 'golem', colors: ['#d8c8b8', '#fff4ea', '#8a7a6a'], hp: 420, dmg: 26, speed: 1.4, r: 0.95, h: 2.4, xp: 70, sparks: 60, cost: 60, minDiff: 3, weight: 0.25 }),
];
export const ENEMIES = Object.fromEntries(ENEMY_LIST.map(e => [e.id, e]));

export const ELITE_LIST = [
  { id: 'ardiente', name: 'Ardiente', color: '#ff8a5c', desc: 'Deja fuego al caminar y sus golpes queman.', hpMul: 2.6, dmgMul: 1.3, speedMul: 1, kind: 'elite' },
  { id: 'helado', name: 'Helado', color: '#9fe3ff', desc: 'Sus golpes te ralentizan.', hpMul: 2.6, dmgMul: 1.2, speedMul: 1, kind: 'elite' },
  { id: 'veloz', name: 'Veloz', color: '#9fe3b0', desc: 'Mucho más rápido.', hpMul: 2.2, dmgMul: 1.2, speedMul: 1.7, kind: 'elite' },
  { id: 'blindado', name: 'Blindado', color: '#c9cdf3', desc: 'Doble de resistente y reduce el daño.', hpMul: 4.0, dmgMul: 1.3, speedMul: 0.85, armor: 0.4, kind: 'elite' },
  { id: 'vampirico', name: 'Vampírico', color: '#e0507a', desc: 'Se cura al golpearte.', hpMul: 2.8, dmgMul: 1.3, speedMul: 1.1, kind: 'elite' },
  { id: 'explosivo', name: 'Explosivo', color: '#ffd36e', desc: 'Explota al ser derrotado.', hpMul: 2.4, dmgMul: 1.2, speedMul: 1.1, kind: 'elite' },
];
export const ELITES = Object.fromEntries(ELITE_LIST.map(e => [e.id, e]));
