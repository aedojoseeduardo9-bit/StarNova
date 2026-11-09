/* Star Nova — íconos 2D dibujados a mano (sin imágenes). Un "glifo" + color + rareza. */
export const RARITY = [
  { name: 'Común', color: '#e9e2d8', mul: 1 },
  { name: 'Poco común', color: '#8fdcae', mul: 1.25 },
  { name: 'Raro', color: '#8cc6ff', mul: 1.55 },
  { name: 'Épico', color: '#c79bff', mul: 1.95 },
  { name: 'Legendario', color: '#ffd36e', mul: 2.5 },
  { name: 'Mítico', color: '#ff8fb5', mul: 3.3 },
];

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
const E = (ctx, x, y, rx, ry, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); };
const C = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); };
const FS = (ctx) => { ctx.fill(); ctx.stroke(); };
const P = (ctx, pts, close = true) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (close) ctx.closePath(); };

/* Biblioteca de glifos en un espacio de 64×64 centrado en 0,0. */
const GLYPHS = {
  acorn(c, k) { E(c, 0, 6, 12, 15); FS(c); c.fillStyle = '#7a4e33'; E(c, 0, -8, 15, 8); c.fill(); c.stroke(); },
  bell(c) { c.beginPath(); c.moveTo(-14, 10); c.quadraticCurveTo(-14, -16, 0, -16); c.quadraticCurveTo(14, -16, 14, 10); c.lineTo(18, 14); c.lineTo(-18, 14); c.closePath(); FS(c); C(c, 0, 18, 4); FS(c); },
  mushroom(c) { c.save(); c.fillStyle = '#f5e6d8'; c.fillRect(-5, 0, 10, 16); c.strokeRect(-5, 0, 10, 16); c.restore(); c.beginPath(); c.ellipse(0, 0, 18, 13, 0, Math.PI, 0); c.closePath(); FS(c); c.fillStyle = '#fff'; [[-7, -6], [6, -8], [0, -3]].forEach(([x, y]) => { C(c, x, y, 2.5); c.fill(); }); },
  feather(c) { c.rotate(-0.6); E(c, 0, 0, 8, 20); FS(c); P(c, [[0, -20], [0, 24]], false); c.stroke(); },
  moon(c) { C(c, 0, 0, 17); FS(c); c.fillStyle = 'rgba(255,255,255,.95)'; C(c, 7, -6, 14); c.fill(); },
  cup(c) { P(c, [[-14, -8], [14, -8], [10, 14], [-10, 14]]); FS(c); c.beginPath(); c.arc(16, 2, 6, -1.4, 1.4); c.stroke(); },
  bark(c) { P(c, [[-16, -14], [16, -18], [14, 16], [-14, 18]]); FS(c); P(c, [[-8, -10], [-6, 12]], false); c.stroke(); P(c, [[4, -12], [6, 10]], false); c.stroke(); },
  twin(c) { for (const x of [-8, 8]) { E(c, x, 4, 8, 12, x * 0.02); FS(c); } },
  ember(c) { c.beginPath(); c.moveTo(0, -20); c.quadraticCurveTo(16, -2, 10, 12); c.quadraticCurveTo(0, 22, -10, 12); c.quadraticCurveTo(-16, -2, 0, -20); FS(c); c.fillStyle = '#ffe08a'; E(c, 0, 8, 5, 8); c.fill(); },
  clover(c) { for (let i = 0; i < 4; i++) { c.save(); c.rotate(i * Math.PI / 2); C(c, 0, -10, 8); FS(c); c.restore(); } },
  magnet(c, k) { c.lineWidth = 9; c.strokeStyle = k; c.beginPath(); c.arc(0, -2, 13, Math.PI, 0); c.lineTo(13, 14); c.moveTo(-13, -2); c.lineTo(-13, 14); c.stroke(); c.fillStyle = '#eee'; c.fillRect(-18, 10, 10, 7); c.fillRect(8, 10, 10, 7); },
  leaf(c) { c.rotate(0.7); c.beginPath(); c.moveTo(0, -20); c.quadraticCurveTo(16, 0, 0, 20); c.quadraticCurveTo(-16, 0, 0, -20); FS(c); P(c, [[0, -18], [0, 18]], false); c.stroke(); },
  heart(c) { c.beginPath(); c.moveTo(0, 16); c.bezierCurveTo(-24, 0, -12, -20, 0, -8); c.bezierCurveTo(12, -20, 24, 0, 0, 16); FS(c); },
  comet(c, k) { c.save(); c.fillStyle = 'rgba(255,224,138,.5)'; P(c, [[-20, 18], [2, -6], [8, 2]]); c.fill(); c.restore(); star(c, 8, -6, 11, 5); FS(c); },
  star(c) { star(c, 0, 0, 20, 9); FS(c); },
  crown(c) { P(c, [[-18, 12], [-18, -8], [-8, 2], [0, -14], [8, 2], [18, -8], [18, 12]]); FS(c); c.fillStyle = '#ff8fb0'; C(c, 0, 4, 3.5); c.fill(); },
  wings(c) { for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, 6); c.quadraticCurveTo(s * 24, -18, s * 22, 4); c.quadraticCurveTo(s * 14, 0, s * 12, 12); c.closePath(); FS(c); } },
  hourglass(c) { P(c, [[-12, -18], [12, -18], [2, 0], [12, 18], [-12, 18], [-2, 0]]); FS(c); },
  shield(c) { c.beginPath(); c.moveTo(0, -18); c.lineTo(16, -12); c.quadraticCurveTo(16, 10, 0, 20); c.quadraticCurveTo(-16, 10, -16, -12); c.closePath(); FS(c); },
  orb(c) { C(c, 0, 0, 15); FS(c); c.fillStyle = 'rgba(255,255,255,.7)'; C(c, -5, -5, 5); c.fill(); },
  drop(c) { c.beginPath(); c.moveTo(0, -20); c.quadraticCurveTo(16, 4, 0, 18); c.quadraticCurveTo(-16, 4, 0, -20); FS(c); },
  bolt(c) { P(c, [[4, -20], [-12, 4], [-1, 4], [-5, 20], [12, -4], [1, -4]]); FS(c); },
  snow(c, k) { c.lineWidth = 4; c.strokeStyle = k; for (let i = 0; i < 3; i++) { c.save(); c.rotate(i * Math.PI / 3); P(c, [[0, -18], [0, 18]], false); c.stroke(); P(c, [[-5, -13], [0, -8], [5, -13]], false); c.stroke(); P(c, [[-5, 13], [0, 8], [5, 13]], false); c.stroke(); c.restore(); } },
  eye(c) { c.beginPath(); c.moveTo(-20, 0); c.quadraticCurveTo(0, -18, 20, 0); c.quadraticCurveTo(0, 18, -20, 0); FS(c); c.fillStyle = '#3a2f55'; C(c, 0, 0, 6); c.fill(); },
  shell(c) { c.beginPath(); c.moveTo(-16, 10); c.quadraticCurveTo(0, -26, 16, 10); c.closePath(); FS(c); for (const x of [-8, 0, 8]) { P(c, [[0, -10], [x, 10]], false); c.stroke(); } },
  flower(c) { for (let i = 0; i < 5; i++) { c.save(); c.rotate(i * Math.PI * 2 / 5); E(c, 0, -10, 6, 9); FS(c); c.restore(); } c.fillStyle = '#ffe08a'; C(c, 0, 0, 5); FS(c); },
  cloud(c) { c.beginPath(); c.arc(-8, 2, 9, Math.PI * 0.5, Math.PI * 1.5); c.arc(0, -6, 10, Math.PI, 0); c.arc(10, 2, 8, Math.PI * 1.5, Math.PI * 0.5); c.closePath(); FS(c); },
  mirror(c) { E(c, 0, -4, 12, 15); FS(c); c.fillRect(-3, 11, 6, 9); c.save(); c.fillStyle = 'rgba(255,255,255,.7)'; E(c, -4, -8, 3, 6, 0.4); c.fill(); c.restore(); },
  flame(c) { c.beginPath(); c.moveTo(0, -22); c.bezierCurveTo(14, -6, 16, 6, 0, 18); c.bezierCurveTo(-16, 6, -10, -6, -4, -10); c.quadraticCurveTo(-2, -2, 0, -22); FS(c); },
  spiral(c, k) { c.lineWidth = 4; c.strokeStyle = k; c.beginPath(); for (let a = 0; a < 14; a += 0.2) { const r = a * 1.4; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.stroke(); },
  gem(c) { P(c, [[-14, -6], [-6, -16], [6, -16], [14, -6], [0, 18]]); FS(c); P(c, [[-14, -6], [14, -6]], false); c.stroke(); },
  boot(c) { P(c, [[-8, -18], [6, -18], [6, 6], [18, 8], [18, 16], [-8, 16]]); FS(c); },
  bug(c) { E(c, 0, 4, 12, 15); FS(c); P(c, [[0, -10], [0, 18]], false); c.stroke(); c.fillStyle = '#3a2f55'; C(c, 0, -13, 6); c.fill(); },
  hammer(c) { c.save(); c.fillStyle = '#c9a074'; c.fillRect(-3, -6, 6, 26); c.strokeRect(-3, -6, 6, 26); c.restore(); roundRect(c, -16, -18, 32, 13, 3); FS(c); },
  needle(c) { c.rotate(0.8); P(c, [[0, -24], [4, 14], [0, 20], [-4, 14]]); FS(c); },
  pine(c) { E(c, 0, 2, 11, 17); FS(c); for (let y = -10; y < 16; y += 6) { P(c, [[-10, y], [0, y + 4], [10, y]], false); c.stroke(); } },
  ring(c, k) { c.lineWidth = 6; c.strokeStyle = k; C(c, 0, 0, 14); c.stroke(); },
  honey(c) { roundRect(c, -13, -10, 26, 28, 6); FS(c); c.save(); c.fillStyle = '#c98a4b'; c.fillRect(-15, -16, 30, 7); c.restore(); },
  pebble(c) { E(c, 0, 2, 17, 12, 0.2); FS(c); c.save(); c.fillStyle = 'rgba(255,255,255,.7)'; E(c, -6, -3, 5, 3, 0.2); c.fill(); c.restore(); },
  candle(c) { c.fillRect(-7, -4, 14, 22); c.strokeRect(-7, -4, 14, 22); c.save(); c.fillStyle = '#ffd36e'; E(c, 0, -12, 5, 8); c.fill(); c.restore(); },
  drum(c) { E(c, 0, -8, 16, 6); FS(c); c.fillRect(-16, -8, 32, 20); c.strokeRect(-16, -8, 32, 20); E(c, 0, -8, 16, 6); FS(c); },
  lens(c) { C(c, -4, -4, 12); FS(c); c.lineWidth = 6; P(c, [[5, 5], [17, 17]], false); c.stroke(); },
  firefly(c) { c.save(); c.fillStyle = 'rgba(255,255,200,.6)'; C(c, 0, 4, 14); c.fill(); c.restore(); E(c, 0, 4, 6, 9); FS(c); E(c, -9, -6, 7, 4, -0.5); FS(c); E(c, 9, -6, 7, 4, 0.5); FS(c); },
  berry(c) { for (const [x, y] of [[-6, 0], [6, 0], [0, 9], [0, -8]]) { C(c, x, y, 8); FS(c); } },
  cocoon(c) { E(c, 0, 0, 11, 18); FS(c); for (let y = -10; y < 14; y += 6) { P(c, [[-10, y], [10, y + 3]], false); c.stroke(); } },
  spikes(c) { star(c, 0, 0, 20, 10, 9); FS(c); },
  sun(c) { star(c, 0, 0, 22, 14, 10); FS(c); c.save(); c.fillStyle = '#fff3c4'; C(c, 0, 0, 9); c.fill(); c.restore(); },
  chain(c, k) { c.lineWidth = 5; c.strokeStyle = k; for (const [x, y] of [[-9, -9], [0, 0], [9, 9]]) { E(c, x, y, 8, 5, 0.8); c.stroke(); } },
  void(c) { c.save(); c.fillStyle = '#2a2350'; C(c, 0, 0, 16); c.fill(); c.restore(); c.lineWidth = 3; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, 0, 9 + i * 4, i, i + 3.6); c.stroke(); } },
  seed(c) { E(c, 0, 0, 8, 14, 0.4); FS(c); },
  boomerang(c) { c.beginPath(); c.moveTo(-18, 10); c.quadraticCurveTo(0, -24, 18, 10); c.quadraticCurveTo(0, -8, -18, 10); FS(c); },
  mine(c) { C(c, 0, 4, 13); FS(c); c.save(); c.fillStyle = '#ff7a7a'; C(c, 0, -12, 4); c.fill(); c.restore(); },
  beam(c) { const cols = ['#ff9fb2', '#ffd36e', '#9fe3b0', '#8cc6ff', '#c79bff']; cols.forEach((k, i) => { c.save(); c.strokeStyle = k; c.lineWidth = 4; c.beginPath(); c.arc(0, 16, 22 - i * 4, Math.PI, 0); c.stroke(); c.restore(); }); },
  turret(c) { roundRect(c, -12, 0, 24, 16, 3); FS(c); c.fillRect(-4, -18, 8, 20); c.strokeRect(-4, -18, 8, 20); },
  owl(c) { E(c, 0, 4, 15, 16); FS(c); c.save(); c.fillStyle = '#fff'; C(c, -6, -2, 5); c.fill(); C(c, 6, -2, 5); c.fill(); c.fillStyle = '#3a2f55'; C(c, -6, -2, 2.5); c.fill(); C(c, 6, -2, 2.5); c.fill(); c.restore(); },
  clock(c) { C(c, 0, 0, 17); FS(c); P(c, [[0, 0], [0, -11]], false); c.stroke(); P(c, [[0, 0], [8, 4]], false); c.stroke(); },
  bubble(c) { C(c, 0, 0, 17); c.save(); c.globalAlpha = 0.55; c.fill(); c.restore(); c.stroke(); c.save(); c.fillStyle = '#fff'; E(c, -6, -7, 4, 6, 0.6); c.fill(); c.restore(); },
  quake(c, k) { c.lineWidth = 4; c.strokeStyle = k; P(c, [[-20, 6], [-10, -6], [-2, 8], [6, -8], [14, 6], [20, -2]], false); c.stroke(); },
  clone(c) { c.save(); c.globalAlpha = 0.5; E(c, -6, 2, 9, 14); c.fill(); c.restore(); E(c, 6, 2, 9, 14); FS(c); },
  fist(c) { roundRect(c, -14, -12, 28, 24, 8); FS(c); for (const x of [-7, 0, 7]) { P(c, [[x, -12], [x, -2]], false); c.stroke(); } },
  cube(c) { P(c, [[0, -18], [16, -9], [16, 9], [0, 18], [-16, 9], [-16, -9]]); FS(c); P(c, [[-16, -9], [0, 0], [16, -9]], false); c.stroke(); P(c, [[0, 0], [0, 18]], false); c.stroke(); },
};

export const GLYPH_NAMES = Object.keys(GLYPHS);

/* Dibuja un ícono: def = { glyph, color }, rar = índice de rareza (borde). */
export function drawIcon(ctx, def, size, rar = 0) {
  const s = size;
  ctx.clearRect(0, 0, s, s);
  ctx.save();
  ctx.fillStyle = 'rgba(255,250,244,.96)';
  roundRect(ctx, 1, 1, s - 2, s - 2, s * 0.22); ctx.fill();
  ctx.lineWidth = Math.max(2, s * 0.06);
  ctx.strokeStyle = RARITY[rar] ? RARITY[rar].color : '#d8cfc6';
  if (rar === 0) ctx.strokeStyle = '#d8cfc6';
  ctx.stroke();
  ctx.translate(s / 2, s / 2);
  ctx.scale(s / 64, s / 64);
  ctx.fillStyle = def.color;
  ctx.strokeStyle = 'rgba(74,63,92,.55)';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  (GLYPHS[def.glyph] || GLYPHS.star)(ctx, def.color);
  ctx.restore();
}
