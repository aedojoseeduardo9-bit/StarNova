/* Star Nova — sonido sintetizado con WebAudio (sin archivos externos) */
import { randi, store } from './util.js';

export const Audio = { ctx: null, master: null, muted: store.get('muted', false), pad: null, musicVol: 0.8, duckK: 1 };
const A = Audio;
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];

A.init = function () {
  if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  A.ctx = new AC();
  A.master = A.ctx.createGain();
  A.master.gain.value = A.muted ? 0 : 0.55;
  // eco suave para dar sensación de espacio
  const delay = A.ctx.createDelay(1);
  delay.delayTime.value = 0.23;
  const fb = A.ctx.createGain(); fb.gain.value = 0.28;
  const wet = A.ctx.createGain(); wet.gain.value = 0.3;
  A.bus = A.ctx.createGain();
  A.bus.connect(A.master);
  A.bus.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(A.master);
  A.master.connect(A.ctx.destination);
  // la música (canciones y colchón de fondo) va por su propio volumen
  A.musicBus = A.ctx.createGain();
  A.musicBus.gain.value = A.musicVol * A.duckK;
  A.musicBus.connect(A.bus);
  A.startPad();
  // al salir de la app o cambiar de pestaña, silencio (y nada de notas amontonadas al volver)
  document.addEventListener('visibilitychange', () => {
    if (!A.ctx) return;
    if (document.hidden) A.ctx.suspend(); else A.ctx.resume();
  });
};

/* Volumen de la música (0..1, ajuste del jugador) y "agacharla" un rato (por ejemplo, con el menú abierto). */
A.setMusicVolume = function (v) { A.musicVol = Math.max(0, Math.min(1, v)); A.applyMusicGain(); };
A.duck = function (k) { if (A.duckK === k) return; A.duckK = k; A.applyMusicGain(); };
A.applyMusicGain = function () {
  if (A.musicBus) A.musicBus.gain.setTargetAtTime(A.musicVol * A.duckK, A.ctx.currentTime, 0.25);
};

A.setMuted = function (m) {
  A.muted = m;
  store.set('muted', m);
  if (A.master) A.master.gain.setTargetAtTime(m ? 0 : 0.55, A.ctx.currentTime, 0.05);
};

function tone(freq, dur, type, vol, when, slide) {
  if (!A.ctx) return;
  const t = A.ctx.currentTime + (when || 0);
  const o = A.ctx.createOscillator();
  const g = A.ctx.createGain();
  g.gain.value = 0;
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(A.bus);
  o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol, freq, when) {
  if (!A.ctx) return;
  const t = A.ctx.currentTime + (when || 0);
  const len = Math.floor(A.ctx.sampleRate * dur);
  const buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = A.ctx.createBufferSource();
  s.buffer = buf;
  const f = A.ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq || 800; f.Q.value = 0.8;
  const g = A.ctx.createGain(); g.gain.value = vol || 0.2;
  s.connect(f); f.connect(g); g.connect(A.bus);
  s.start(t);
}
const note = (i, base) => (base || 440) * Math.pow(2, PENTA[i % PENTA.length] / 12);
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

A.play = function (name, arg) {
  if (!A.ctx || A.muted) return;
  switch (name) {
    case 'shoot': tone(note(randi(3, 6), 520), 0.09, 'triangle', 0.07); break;
    case 'swipe': noise(0.16, 0.18, 1400); tone(300, 0.15, 'sine', 0.08, 0, 0.5); break;
    case 'dash': noise(0.22, 0.12, 2200); break;
    case 'special': for (let i = 0; i < 5; i++) tone(note(i + 3, 660), 0.4, 'sine', 0.08, i * 0.05); break;
    case 'jump': tone(380, 0.1, 'sine', 0.06, 0, 1.6); break;
    case 'hit': noise(0.06, 0.12, 900); break;
    case 'hurt': tone(180, 0.25, 'sawtooth', 0.07, 0, 0.5); break;
    case 'kill': tone(note(randi(0, 4), 330), 0.18, 'triangle', 0.09, 0, 0.6); noise(0.1, 0.08, 500); break;
    case 'coin': tone(note(randi(5, 9), 660), 0.12, 'sine', 0.05); break;
    case 'xp': tone(note(randi(4, 9), 880), 0.08, 'sine', 0.025); break;
    case 'chest': for (let i = 0; i < 4; i++) tone(note(i * 2, 440), 0.35, 'triangle', 0.08, i * 0.07); break;
    case 'item': for (let i = 0; i < 6; i++) tone(note(i + 2, 523), 0.5, 'sine', 0.07, i * 0.06); break;
    case 'level': for (let i = 0; i < 6; i++) tone(note(i * 2, 392), 0.45, 'triangle', 0.08, i * 0.08); break;
    case 'bell': tone(arg || 880, 2.2, 'sine', 0.16); tone((arg || 880) * 2.76, 1.2, 'sine', 0.05); tone((arg || 880) * 5.4, 0.6, 'sine', 0.02); break;
    case 'firefly': for (let i = 0; i < 3; i++) tone(note(i + 5, 880), 0.3, 'sine', 0.06, i * 0.06); break;
    case 'crystal': tone(1320, 1.4, 'sine', 0.1); tone(1980, 1.0, 'sine', 0.05, 0.05); break;
    case 'mission': for (let i = 0; i < 8; i++) tone(note(i, 392), 0.7, 'sine', 0.07, i * 0.09); break;
    case 'rumble': noise(1.2, 0.25, 120); tone(60, 1.2, 'sine', 0.15); break;
    case 'boss': tone(98, 1.5, 'sawtooth', 0.08); tone(147, 1.5, 'sawtooth', 0.05, 0.1); break;
    case 'select': tone(660, 0.08, 'sine', 0.06); break;
    case 'deny': tone(200, 0.12, 'square', 0.04); break;
    // eventos del mundo
    case 'anochecer': [79, 76, 72, 67, 64].forEach((m, i) => tone(hz(m), 1.1, 'sine', 0.08, i * 0.22)); break;
    case 'amanecer': [60, 64, 67, 72, 76, 79].forEach((m, i) => tone(hz(m), 1.0, 'triangle', 0.075, i * 0.16)); break;
    case 'oleada': [57, 58, 57].forEach((m, i) => tone(hz(m), 0.7, 'sawtooth', 0.07, i * 0.35)); tone(hz(33), 1.4, 'sine', 0.12, 0.2); noise(1.4, 0.25, 160, 0.2); break;
    case 'calma': [60, 67, 72, 76].forEach((m, i) => tone(hz(m), 1.8, 'sine', 0.075, i * 0.12)); break;
    default: break;
  }
};

/* Pad ambiental muy suave */
A.startPad = function () {
  if (!A.ctx || A.pad) return;
  const g = A.ctx.createGain();
  g.gain.value = 0.035;
  const f = A.ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 900;
  const freqs = [130.81, 196.0, 246.94, 329.63];
  const oscs = freqs.map((fr, i) => {
    const o = A.ctx.createOscillator();
    o.type = i % 2 ? 'triangle' : 'sine';
    o.frequency.value = fr;
    o.detune.value = (i - 1.5) * 6;
    const lfo = A.ctx.createOscillator();
    const lg = A.ctx.createGain();
    lfo.frequency.value = 0.05 + i * 0.03;
    lg.gain.value = 0.4;
    const og = A.ctx.createGain(); og.gain.value = 0.5;
    lfo.connect(lg); lg.connect(og.gain);
    o.connect(og); og.connect(f);
    o.start(); lfo.start();
    return o;
  });
  f.connect(g); g.connect(A.musicBus);
  A.pad = { g, oscs };
};

/* ---------- música (sintetizada, sin archivos) ----------
 * Cada canción es una lista de compases de 8 pasos (corcheas): acorde de fondo, bajo, melodía y, si la tiene,
 * percusión suave. Audio.score(canción, tono) la empieza o cambia con fundido; Audio.scoreStop() la apaga.
 * La usan las escenas animadas (js/cinema.js) y, durante el juego, js/music.js (día, noche, combate…).
 * Campos de una canción: bpm · lead ('caja' cajita de música | 'pulsa' cuerda pulsada | 'suave') ·
 * drone (nota grave fija) · bars: [{ chord, bass, bassSteps?, mel, pulse?, kick?, hat?, snare? }]
 * (kick/hat/snare: 8 ceros y unos). Las notas son números MIDI (60 = do central; 0 = silencio). */
const SCORES = {
  // ----- escenas animadas -----
  // asombro tranquilo (cuento)
  cuento: { bpm: 66, bars: [
    { chord: [48, 55, 64, 71], bass: 36, mel: [76, 0, 79, 0, 84, 0, 79, 0] },
    { chord: [45, 52, 60, 67], bass: 33, mel: [76, 0, 81, 0, 84, 0, 81, 0] },
    { chord: [41, 48, 57, 64], bass: 29, mel: [77, 0, 81, 0, 84, 0, 81, 0] },
    { chord: [43, 50, 59, 64], bass: 31, mel: [74, 0, 79, 0, 83, 0, 79, 76] },
  ] },
  // las sombras suben (tensión)
  penumbra: { bpm: 84, drone: 33, bars: [
    { chord: [45, 52, 57, 60], bass: 33, mel: [0, 0, 76, 0, 0, 77, 0, 0], pulse: 45 },
    { chord: [45, 52, 57, 60], bass: 33, mel: [0, 0, 76, 0, 77, 0, 76, 0], pulse: 45 },
    { chord: [41, 48, 53, 60], bass: 29, mel: [0, 0, 77, 0, 0, 81, 0, 0], pulse: 41 },
    { chord: [40, 47, 56, 59], bass: 28, mel: [0, 80, 0, 77, 0, 76, 0, 0], pulse: 40 },
  ] },
  // un recuerdo tierno
  recuerdo: { bpm: 58, bars: [
    { chord: [53, 57, 60, 64], bass: 41, mel: [81, 0, 0, 84, 0, 0, 77, 0] },
    { chord: [50, 57, 60, 65], bass: 38, mel: [81, 0, 0, 77, 0, 0, 74, 0] },
    { chord: [46, 53, 58, 62], bass: 34, mel: [82, 0, 0, 77, 0, 0, 74, 0] },
    { chord: [48, 55, 60, 64], bass: 36, mel: [79, 0, 0, 76, 0, 0, 72, 0] },
  ] },
  // el Guardián: grave y triste
  guardian: { bpm: 52, drone: 26, bars: [
    { chord: [38, 45, 50, 53], bass: 26, mel: [62, 0, 0, 0, 69, 0, 0, 0] },
    { chord: [34, 41, 46, 50], bass: 22, mel: [65, 0, 0, 0, 62, 0, 0, 0] },
    { chord: [31, 43, 46, 50], bass: 19, mel: [58, 0, 0, 0, 62, 0, 0, 0] },
    { chord: [33, 45, 49, 52], bass: 21, mel: [61, 0, 0, 0, 64, 0, 57, 0] },
  ] },
  // Nova vuelve al cielo
  esperanza: { bpm: 76, bars: [
    { chord: [48, 55, 60, 64], bass: 36, mel: [72, 76, 79, 84, 79, 76, 79, 84] },
    { chord: [47, 55, 62, 67], bass: 35, mel: [74, 79, 83, 86, 83, 79, 83, 86] },
    { chord: [45, 52, 60, 64], bass: 33, mel: [72, 76, 81, 84, 81, 76, 81, 84] },
    { chord: [41, 53, 57, 60], bass: 29, mel: [72, 77, 81, 84, 81, 77, 81, 89] },
    { chord: [48, 55, 60, 64], bass: 36, mel: [76, 79, 84, 88, 84, 79, 84, 88] },
    { chord: [43, 55, 59, 62], bass: 31, mel: [74, 79, 83, 86, 83, 79, 86, 91] },
  ] },

  // ----- durante el juego (js/music.js) -----
  // de día: paseo luminoso entre islas (cada región la toca en su propio tono)
  dia: { bpm: 74, bars: [
    { chord: [48, 55, 60, 64], bass: 36, bassSteps: [0, 4], mel: [72, 0, 76, 79, 0, 76, 74, 0] },
    { chord: [45, 52, 57, 60], bass: 33, bassSteps: [0, 4], mel: [72, 0, 69, 72, 76, 0, 74, 0] },
    { chord: [41, 48, 57, 64], bass: 29, bassSteps: [0, 4], mel: [69, 0, 72, 77, 76, 0, 72, 0] },
    { chord: [43, 50, 55, 59], bass: 31, bassSteps: [0, 4], mel: [74, 0, 71, 74, 79, 0, 0, 0] },
    { chord: [48, 55, 60, 64], bass: 36, bassSteps: [0, 4], mel: [79, 0, 76, 72, 74, 0, 76, 0] },
    { chord: [40, 47, 55, 59], bass: 28, bassSteps: [0, 4], mel: [71, 0, 74, 76, 79, 0, 76, 0] },
    { chord: [41, 48, 53, 57], bass: 29, bassSteps: [0, 4], mel: [77, 0, 76, 74, 72, 0, 69, 0] },
    { chord: [43, 50, 55, 60], bass: 31, bassSteps: [0, 4], mel: [74, 0, 72, 0, 0, 0, 0, 0] },
  ] },
  // de noche: nana lenta, notas largas
  noche: { bpm: 56, lead: 'suave', bars: [
    { chord: [45, 52, 59, 60], bass: 33, mel: [76, 0, 0, 0, 72, 0, 0, 0] },
    { chord: [41, 48, 52, 57], bass: 29, mel: [74, 0, 0, 0, 69, 0, 0, 72] },
    { chord: [48, 52, 55, 59], bass: 36, mel: [71, 0, 0, 0, 67, 0, 0, 0] },
    { chord: [43, 47, 52, 55], bass: 31, mel: [69, 0, 71, 0, 72, 0, 0, 0] },
    { chord: [45, 52, 59, 60], bass: 33, mel: [79, 0, 0, 76, 0, 0, 72, 0] },
    { chord: [41, 48, 52, 57], bass: 29, mel: [77, 0, 0, 74, 0, 0, 69, 0] },
    { chord: [40, 47, 52, 55], bass: 28, mel: [71, 0, 0, 0, 72, 0, 74, 0] },
    { chord: [45, 52, 57, 60], bass: 33, mel: [69, 0, 0, 0, 0, 0, 0, 0] },
  ] },
  // combate: sombras cerca
  combate: { bpm: 112, lead: 'pulsa', bars: [
    { chord: [50, 57, 62, 65], bass: 38, bassSteps: [0, 3, 4, 6], mel: [74, 0, 77, 0, 76, 74, 72, 0], kick: [1, 0, 0, 0, 1, 0, 0, 0], hat: [0, 1, 0, 1, 0, 1, 0, 1], snare: [0, 0, 1, 0, 0, 0, 1, 0] },
    { chord: [46, 53, 58, 62], bass: 34, bassSteps: [0, 3, 4, 6], mel: [74, 0, 70, 0, 72, 0, 74, 0], kick: [1, 0, 0, 0, 1, 0, 0, 0], hat: [0, 1, 0, 1, 0, 1, 0, 1], snare: [0, 0, 1, 0, 0, 0, 1, 0] },
    { chord: [48, 55, 60, 64], bass: 36, bassSteps: [0, 3, 4, 6], mel: [76, 0, 72, 0, 79, 0, 77, 76], kick: [1, 0, 0, 0, 1, 0, 0, 0], hat: [0, 1, 0, 1, 0, 1, 0, 1], snare: [0, 0, 1, 0, 0, 0, 1, 0] },
    { chord: [45, 52, 57, 61], bass: 33, bassSteps: [0, 3, 4, 6], mel: [73, 0, 76, 0, 81, 0, 79, 0], kick: [1, 0, 0, 1, 1, 0, 0, 0], hat: [0, 1, 0, 1, 0, 1, 1, 1], snare: [0, 0, 1, 0, 0, 0, 1, 1] },
  ] },
  // peligro: élite o Gólem de Arcos cerca
  peligro: { bpm: 100, lead: 'pulsa', drone: 28, bars: [
    { chord: [40, 47, 52, 55], bass: 28, bassSteps: [0, 2, 4, 6], mel: [0, 0, 76, 0, 77, 0, 76, 0], kick: [1, 0, 0, 0, 1, 0, 0, 0], hat: [0, 0, 1, 0, 0, 0, 1, 0], pulse: 52 },
    { chord: [41, 48, 53, 57], bass: 29, bassSteps: [0, 2, 4, 6], mel: [0, 0, 77, 0, 76, 0, 74, 0], kick: [1, 0, 0, 0, 1, 0, 0, 0], hat: [0, 0, 1, 0, 0, 0, 1, 0], pulse: 53 },
    { chord: [40, 47, 52, 55], bass: 28, bassSteps: [0, 2, 4, 6], mel: [0, 0, 71, 0, 72, 0, 71, 0], kick: [1, 0, 0, 0, 1, 0, 1, 0], hat: [0, 0, 1, 0, 0, 0, 1, 0], pulse: 52 },
    { chord: [38, 45, 50, 54], bass: 26, bassSteps: [0, 2, 4, 6], mel: [69, 0, 71, 0, 72, 0, 74, 0], kick: [1, 0, 0, 0, 1, 0, 1, 1], hat: [0, 0, 1, 0, 0, 1, 1, 1], pulse: 50 },
  ] },
  // jefe: el Guardián pelea
  jefe: { bpm: 126, lead: 'pulsa', drone: 24, bars: [
    { chord: [48, 55, 60, 63], bass: 36, bassSteps: [0, 1, 2, 3, 4, 5, 6, 7], mel: [72, 0, 75, 0, 79, 0, 75, 72], kick: [1, 0, 0, 1, 1, 0, 0, 0], hat: [0, 1, 0, 1, 0, 1, 0, 1], snare: [0, 0, 1, 0, 0, 0, 1, 0] },
    { chord: [44, 51, 56, 60], bass: 32, bassSteps: [0, 1, 2, 3, 4, 5, 6, 7], mel: [72, 0, 75, 0, 80, 0, 79, 77], kick: [1, 0, 0, 1, 1, 0, 0, 0], hat: [0, 1, 0, 1, 0, 1, 0, 1], snare: [0, 0, 1, 0, 0, 0, 1, 0] },
    { chord: [51, 58, 63, 67], bass: 39, bassSteps: [0, 1, 2, 3, 4, 5, 6, 7], mel: [79, 0, 82, 0, 79, 0, 75, 0], kick: [1, 0, 0, 1, 1, 0, 0, 0], hat: [0, 1, 0, 1, 0, 1, 0, 1], snare: [0, 0, 1, 0, 0, 0, 1, 0] },
    { chord: [43, 50, 55, 59], bass: 31, bassSteps: [0, 1, 2, 3, 4, 5, 6, 7], mel: [74, 0, 79, 0, 83, 0, 86, 0], kick: [1, 0, 1, 1, 1, 0, 1, 1], hat: [1, 1, 1, 1, 1, 1, 1, 1], snare: [0, 0, 1, 0, 0, 0, 1, 1] },
  ] },
};

/* Ruido blanco (un segundo) para la percusión: uno por contexto de audio, se reutiliza siempre. */
const NOISE = new WeakMap();
function noiseBuf(ctx) {
  let b = NOISE.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    NOISE.set(ctx, b);
  }
  return b;
}

/* Programa un paso (corchea) de la canción en el instante t, hacia el nodo out. key = semitonos. Devuelve la duración del paso. */
function scoreStep(ctx, out, sc, i, t, key = 0) {
  const stepDur = 60 / sc.bpm / 2;
  const bar = sc.bars[Math.floor(i / 8) % sc.bars.length], k = i % 8;
  const note = (m) => hz(m + key);
  const env = (node, vol, a, hold, r) => {
    node.gain.value = 0;                     // en silencio hasta su momento (si no, el ruido "se cuela" una muestra antes: chasquido)
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(vol, t + a);
    node.gain.setValueAtTime(vol, t + a + hold);
    node.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + r);
  };
  const voice = (type, freq, vol, a, hold, r, cutoff) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    env(g, vol, a, hold, r);
    if (cutoff) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; o.connect(f); f.connect(g); } else o.connect(g);
    g.connect(out);
    o.start(t); o.stop(t + a + hold + r + 0.05);
  };
  const hit = (freq, vol, len, type, q) => {                       // golpe de ruido filtrado (platillo, caja)
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf(ctx);
    f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    env(g, vol, 0.002, 0.005, len);
    s.connect(f); f.connect(g); g.connect(out);
    s.start(t, Math.random() * 0.5); s.stop(t + len + 0.05);
  };
  const len = stepDur * 8;
  if (k === 0) {
    for (const m of bar.chord) voice('triangle', note(m), 0.022, 0.5, len - 0.7, 0.9, 1100);    // colchón del acorde
    if (!bar.bassSteps) voice('sine', note(bar.bass), 0.07, 0.04, len * 0.5, len * 0.5);         // bajo largo
    if (sc.drone) voice('sawtooth', note(sc.drone), 0.03, 0.6, len - 0.6, 0.8, 220);             // zumbido grave
  }
  if (bar.bassSteps && bar.bassSteps.includes(k)) voice('triangle', note(bar.bass), 0.075, 0.01, stepDur * 0.55, stepDur * 0.4, 600);
  if (bar.pulse && k % 2 === 0) voice('triangle', note(bar.pulse), 0.05, 0.01, 0.03, 0.22);       // latido
  if (bar.kick && bar.kick[k]) {                                                                   // bombo
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    env(g, 0.075, 0.003, 0.02, 0.16);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.25);
  }
  if (bar.hat && bar.hat[k]) hit(7500, 0.018, 0.05, 'highpass');                                  // platillo
  if (bar.snare && bar.snare[k]) { hit(1900, 0.05, 0.14, 'bandpass', 0.9); voice('triangle', 185, 0.03, 0.002, 0.01, 0.08); }
  const m = bar.mel[k];
  if (m) {
    const lead = sc.lead || 'caja';
    if (lead === 'pulsa') {                                                                        // cuerda pulsada
      voice('triangle', note(m), 0.05, 0.004, 0.02, stepDur * 1.6, 2600);
      voice('sine', note(m) * 2, 0.012, 0.004, 0.01, stepDur);
    } else if (lead === 'suave') {                                                                 // nota larga y suave
      voice('sine', note(m), 0.05, 0.08, stepDur * 1.5, 1.8);
      voice('sine', note(m) * 2, 0.008, 0.08, stepDur, 1.0);
    } else {                                                                                       // cajita de música
      voice('sine', note(m), 0.055, 0.006, 0.02, 1.5);
      voice('sine', note(m) * 2, 0.014, 0.006, 0.02, 0.8);
      voice('sine', note(m) * 3.01, 0.006, 0.006, 0.01, 0.4);
    }
  }
  return stepDur;
}
A.SCORES = SCORES;
A.scoreStep = scoreStep;

A.scoreStop = function (fade = 1.2) {
  const M = A.music;
  if (!M) return;
  A.music = null;
  clearInterval(M.timer);
  if (!A.ctx) return;
  const t = A.ctx.currentTime;
  M.g.gain.cancelScheduledValues(t);
  M.g.gain.setValueAtTime(M.g.gain.value, t);
  M.g.gain.linearRampToValueAtTime(0, t + fade);
  if (A.pad) A.pad.g.gain.setTargetAtTime(0.035, t + fade, 1.5);                     // vuelve el colchón de fondo
  setTimeout(() => { try { M.g.disconnect(); } catch (e) { /* ya desconectado */ } }, (fade + 2.5) * 1000);
};

/* Empieza (o cambia con fundido a) una canción. key: semitonos para tocarla en otro tono. */
A.score = function (mood, key = 0) {
  if (!A.ctx || !SCORES[mood]) return;
  if (A.music && A.music.mood === mood && A.music.key === key) return;
  A.scoreStop(1.4);
  if (A.pad) A.pad.g.gain.setTargetAtTime(0, A.ctx.currentTime, 0.6);                 // el colchón se aparta
  const g = A.ctx.createGain();
  const t0 = A.ctx.currentTime + 0.12;
  g.gain.setValueAtTime(0, A.ctx.currentTime);
  g.gain.linearRampToValueAtTime(1, t0 + 1.2);
  g.connect(A.musicBus);
  const M = A.music = { mood, key, g, step: 0, next: t0, timer: 0 };
  const sc = SCORES[mood];
  const tick = () => {
    if (A.music !== M) return;
    if (M.next < A.ctx.currentTime - 0.5) M.next = A.ctx.currentTime + 0.05;       // la pestaña estuvo dormida: no amontonar notas
    while (M.next < A.ctx.currentTime + 0.6) M.next += scoreStep(A.ctx, g, sc, M.step++, M.next, key);
  };
  tick();
  M.timer = setInterval(tick, 200);
};
