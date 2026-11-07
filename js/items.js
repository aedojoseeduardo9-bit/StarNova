/* Star Nova — objetos acumulables (estilo roguelite) y sus íconos. */
export const RARITY = [
  { name: 'Común', color: '#f6f1ea', weight: 78 },
  { name: 'Poco común', color: '#9fe0b5', weight: 19 },
  { name: 'Raro', color: '#ff9fa8', weight: 3 },
];

export const ITEMS = {
  bellota: { name: 'Bellota Afilada', rar: 0, desc: '+15% de daño', color: '#c98a4b', glyph: 'acorn' },
  cascabel: { name: 'Cascabel de Viento', rar: 0, desc: '+12% de velocidad', color: '#f2c85b', glyph: 'bell' },
  hongo: { name: 'Hongo Luminoso', rar: 0, desc: '+0.8 de vida por segundo', color: '#e88f9a', glyph: 'mushroom' },
  pluma: { name: 'Pluma de Gorrión', rar: 0, desc: '+1 salto en el aire', color: '#9fc6e8', glyph: 'feather' },
  piedra: { name: 'Piedra Lunar', rar: 0, desc: '+10% de golpe crítico', color: '#c7c3f0', glyph: 'moon' },
  te: { name: 'Taza de Té', rar: 0, desc: '+12% de velocidad de ataque', color: '#a8d8b0', glyph: 'cup' },
  corteza: { name: 'Corteza de Roble', rar: 0, desc: '+6 de armadura', color: '#a7835f', glyph: 'bark' },
  gemela: { name: 'Semilla Gemela', rar: 1, desc: '15% de lanzar una bellota extra', color: '#d9a35f', glyph: 'twin' },
  brasa: { name: 'Brasa Errante', rar: 1, desc: '10% de que el golpe explote', color: '#ff9a6b', glyph: 'ember' },
  trebol: { name: 'Trébol de Cuatro', rar: 1, desc: '+25 de vida máxima', color: '#7fcf8e', glyph: 'clover' },
  iman: { name: 'Imán de Ámbar', rar: 1, desc: 'Atrae chispas desde lejos, +15% chispas', color: '#f0a35e', glyph: 'magnet' },
  espina: { name: 'Hoja Espinosa', rar: 1, desc: '20% de causar sangrado', color: '#e06f7d', glyph: 'leaf' },
  corazon: { name: 'Corazón de Nova', rar: 2, desc: 'Revive una vez al caer', color: '#ff8fb0', glyph: 'heart' },
  cometa: { name: 'Cometa Fiel', rar: 2, desc: 'Cada 3 s un cometa golpea al enemigo más cercano', color: '#ffe08a', glyph: 'comet' },
};

export function rollItem() {
  const total = RARITY.reduce((s, r) => s + r.weight, 0);
  let x = Math.random() * total, rar = 0;
  for (let i = 0; i < RARITY.length; i++) { x -= RARITY[i].weight; if (x <= 0) { rar = i; break; } }
  const pool = Object.keys(ITEMS).filter(k => ITEMS[k].rar === rar);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function computeStats(level, n) {
  const c = (k) => n[k] || 0;
  return {
    dmg: (12 + 2.4 * (level - 1)) * (1 + 0.15 * c('bellota')),
    atk: 1 + 0.12 * c('te'),
    speed: 1 + 0.12 * c('cascabel'),
    regen: 0.6 + 0.8 * c('hongo') + 0.1 * (level - 1),
    crit: 0.01 + 0.1 * c('piedra'),
    armor: 6 * c('corteza'),
    maxHp: 100 + 14 * (level - 1) + 25 * c('trebol'),
    airJumps: 1 + c('pluma'),
    magnet: 3 * (1 + 0.6 * c('iman')),
    sparkMul: 1 + 0.15 * c('iman'),
    twin: 1 - Math.pow(0.85, c('gemela')),
    ember: Math.min(0.5, 0.1 * c('brasa')),
    bleed: Math.min(0.8, 0.2 * c('espina')),
    comet: c('cometa'),
  };
}

/* Dibuja el ícono de un objeto en un canvas 2D. */
export function drawItemIcon(ctx, id, size) {
  const it = ITEMS[id];
  const s = size;
  ctx.clearRect(0, 0, s, s);
  ctx.save();
  ctx.fillStyle = 'rgba(255,250,244,.95)';
  roundRect(ctx, 1, 1, s - 2, s - 2, s * 0.22); ctx.fill();
  ctx.lineWidth = Math.max(2, s * 0.06);
  ctx.strokeStyle = RARITY[it.rar].color === '#f6f1ea' ? '#d8cfc6' : RARITY[it.rar].color;
  ctx.stroke();
  ctx.translate(s / 2, s / 2);
  ctx.scale(s / 64, s / 64);
  ctx.fillStyle = it.color;
  ctx.strokeStyle = 'rgba(74,63,92,.55)';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  const P = new Path2D();
  switch (it.glyph) {
    case 'acorn': ctx.beginPath(); ctx.ellipse(0, 6, 12, 15, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#7a4e33'; ctx.beginPath(); ctx.ellipse(0, -8, 15, 8, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'bell': ctx.beginPath(); ctx.moveTo(-14, 10); ctx.quadraticCurveTo(-14, -16, 0, -16); ctx.quadraticCurveTo(14, -16, 14, 10); ctx.lineTo(18, 14); ctx.lineTo(-18, 14); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 18, 4, 0, 7); ctx.fill(); ctx.stroke(); break;
    case 'mushroom': ctx.fillStyle = '#f5e6d8'; ctx.fillRect(-5, 0, 10, 16); ctx.strokeRect(-5, 0, 10, 16); ctx.fillStyle = it.color; ctx.beginPath(); ctx.ellipse(0, 0, 18, 13, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; [[-7, -6], [6, -8], [0, -3]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill(); }); break;
    case 'feather': ctx.rotate(-0.6); ctx.beginPath(); ctx.ellipse(0, 0, 8, 20, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 24); ctx.stroke(); break;
    case 'moon': ctx.beginPath(); ctx.arc(0, 0, 17, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(7, -6, 14, 0, 7); ctx.fill(); break;
    case 'cup': ctx.beginPath(); ctx.moveTo(-14, -8); ctx.lineTo(14, -8); ctx.lineTo(10, 14); ctx.lineTo(-10, 14); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(16, 2, 6, -1.4, 1.4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-4, -14); ctx.quadraticCurveTo(0, -20, 4, -14); ctx.stroke(); break;
    case 'bark': ctx.beginPath(); ctx.moveTo(-16, -14); ctx.lineTo(16, -18); ctx.lineTo(14, 16); ctx.lineTo(-14, 18); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(-6, 12); ctx.moveTo(4, -12); ctx.lineTo(6, 10); ctx.stroke(); break;
    case 'twin': for (const x of [-8, 8]) { ctx.beginPath(); ctx.ellipse(x, 4, 8, 12, x * 0.02, 0, 7); ctx.fill(); ctx.stroke(); } break;
    case 'ember': ctx.beginPath(); ctx.moveTo(0, -20); ctx.quadraticCurveTo(16, -2, 10, 12); ctx.quadraticCurveTo(0, 22, -10, 12); ctx.quadraticCurveTo(-16, -2, 0, -20); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.ellipse(0, 8, 5, 8, 0, 0, 7); ctx.fill(); break;
    case 'clover': for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 2); ctx.beginPath(); ctx.arc(0, -10, 8, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); } break;
    case 'magnet': ctx.lineWidth = 9; ctx.strokeStyle = it.color; ctx.beginPath(); ctx.arc(0, -2, 13, Math.PI, 0); ctx.lineTo(13, 14); ctx.moveTo(-13, -2); ctx.lineTo(-13, 14); ctx.stroke(); ctx.fillStyle = '#eee'; ctx.fillRect(-18, 10, 10, 7); ctx.fillRect(8, 10, 10, 7); break;
    case 'leaf': ctx.rotate(0.7); ctx.beginPath(); ctx.moveTo(0, -20); ctx.quadraticCurveTo(16, 0, 0, 20); ctx.quadraticCurveTo(-16, 0, 0, -20); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, 18); ctx.stroke(); break;
    case 'heart': ctx.beginPath(); ctx.moveTo(0, 16); ctx.bezierCurveTo(-24, 0, -12, -20, 0, -8); ctx.bezierCurveTo(12, -20, 24, 0, 0, 16); ctx.fill(); ctx.stroke(); break;
    case 'comet': ctx.fillStyle = 'rgba(255,224,138,.5)'; ctx.beginPath(); ctx.moveTo(-20, 18); ctx.lineTo(2, -6); ctx.lineTo(8, 2); ctx.closePath(); ctx.fill(); star(ctx, 8, -6, 11, 5); ctx.fillStyle = it.color; ctx.fill(); ctx.stroke(); break;
    default: break;
  }
  void P;
  ctx.restore();
}

export function star(ctx, x, y, r, r2, n = 5) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r2 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
