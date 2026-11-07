/* Star Nova — utilidades comunes */
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const smooth = (t) => t * t * (3 - 2 * t);

const cache = new Map();
export const hex = function (h) {
  let c = cache.get(h);
  if (c) return c;
  const s = h.replace('#', '');
  c = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  cache.set(h, c);
  return c;
};
export const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const css = (c, a) => (a === undefined || a >= 1)
  ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'
  : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')';
export const mix = (h1, h2, t, a) => css(mixc(hex(h1), hex(h2), t), a);
export const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export const store = {
  get(k, d) { try { const v = localStorage.getItem('starnova.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('starnova.' + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } },
};
