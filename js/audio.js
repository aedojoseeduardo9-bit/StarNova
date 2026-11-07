/* Star Nova — sonido sintetizado con WebAudio (sin archivos externos) */
import { randi, store } from './util.js';

export const Audio = { ctx: null, master: null, muted: store.get('muted', false), pad: null };
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
  A.startPad();
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
  f.connect(g); g.connect(A.master);
  A.pad = { g, oscs };
};
