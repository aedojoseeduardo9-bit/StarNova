/* Star Nova — paletas por región (estilo pastel geométrico). */
export const REGIONS = {
  claro: {
    name: 'El Claro', sub: 'el hogar de la hoguera', center: [0, 0], r: 15,
    sky: { top: '#f4b9b0', hor: '#fde7d4', bot: '#f6c3b2' }, fog: '#fbe1cf',
    ground: '#fbeee1', rock: '#e8b3a7', stone: '#fff4ea', stone2: '#f1cbb8', accent: '#ea8f87', win: '#b56c78',
    leaf: ['#93c99a', '#c4e5a6'], roof: '#ee9a8b', shade: '#e3929c',
  },
  coral: {
    name: 'Jardín de Coral', sub: 'donde cantan las campanas', center: [-55, 0], r: 18,
    sky: { top: '#f29d97', hor: '#ffd9c6', bot: '#f6b2a2' }, fog: '#fdd3c1',
    ground: '#ffe4d8', rock: '#e59a93', stone: '#ffeae0', stone2: '#f6b4a3', accent: '#e47c7e', win: '#a2556a',
    leaf: ['#f29486', '#ffc4b2'], roof: '#ef8578', shade: '#dc7088',
  },
  menta: {
    name: 'Torres de Menta', sub: 'las agujas del norte', center: [0, -60], r: 18,
    sky: { top: '#94d0c3', hor: '#e2f6ee', bot: '#b2ddd1' }, fog: '#d2eee4',
    ground: '#e6f6ee', rock: '#8bc3b6', stone: '#e9f7f1', stone2: '#9fd6c6', accent: '#5aa999', win: '#3c7a7a',
    leaf: ['#6bb39e', '#a1dbc4'], roof: '#68b3a2', shade: '#4fa59c',
  },
  lavanda: {
    name: 'Puente de Lavanda', sub: 'el cristal que sueña', center: [53, 0], r: 13,
    sky: { top: '#ad99de', hor: '#efe7fb', bot: '#c9bbe8' }, fog: '#e1d7f5',
    ground: '#f3eefc', rock: '#a596d1', stone: '#f8f4ff', stone2: '#c8b8e9', accent: '#8d77c8', win: '#5c4d91',
    leaf: ['#a98fd4', '#d3c3ef'], roof: '#9a83cf', shade: '#8e78d0',
  },
  nova: {
    name: 'Santuario de Nova', sub: 'donde duerme la estrella', center: [0, 65], r: 18,
    sky: { top: '#262a66', hor: '#8b80c6', bot: '#5b5698' }, fog: '#6c66a8',
    ground: '#d6d9f4', rock: '#545996', stone: '#e3e5fb', stone2: '#8e95d2', accent: '#f2c46c', win: '#f6d27a',
    leaf: ['#6a70b6', '#a0a6e4'], roof: '#6a70b4', night: 1, shade: '#4b50a6',
  },
};

export const REGION_IDS = Object.keys(REGIONS);

/* Pesos de mezcla de cada región según la posición (para cielo y niebla). */
export function regionWeights(x, z) {
  const w = {};
  let sum = 0;
  for (const id of REGION_IDS) {
    const r = REGIONS[id];
    const d = Math.hypot(x - r.center[0], z - r.center[1]);
    const v = 1 / Math.pow(Math.max(0, d - r.r * 0.55) + 5, 3);
    w[id] = v; sum += v;
  }
  for (const id of REGION_IDS) w[id] /= sum;
  return w;
}

export function regionAt(x, z) {
  let best = 'claro', bd = Infinity;
  for (const id of REGION_IDS) {
    const r = REGIONS[id];
    const d = Math.hypot(x - r.center[0], z - r.center[1]) / r.r;
    if (d < bd) { bd = d; best = id; }
  }
  return bd < 1.25 ? best : null;
}
