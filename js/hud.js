/* Star Nova — interfaz en DOM + capa 2D para números de daño y marcadores. */
import * as THREE from 'three';
import { ITEMS, drawItemIcon, star } from './items.js';
import { MISSIONS } from './missions.js';
import { REGIONS } from './world/palette.js';

const $ = (id) => document.getElementById(id);
const DIFF_NAMES = ['Brisa', 'Llovizna', 'Lluvia', 'Chubasco', 'Tormenta', 'Diluvio', '¡NOVA!'];
const SKILLS = [
  { id: 'primary', key: 'Clic', name: 'Bellotazo' },
  { id: 'secondary', key: 'Q', name: 'Coletazo' },
  { id: 'utility', key: 'Shift', name: 'Voltereta' },
  { id: 'special', key: 'R', name: 'Lluvia estelar' },
];

export class HUD {
  constructor(game) {
    this.game = game;
    this.overlay = document.createElement('canvas');
    this.overlay.id = 'overlay';
    Object.assign(this.overlay.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
    $('game').after(this.overlay);
    this.ctx = this.overlay.getContext('2d');
    this.numbers = [];
    this.itemEls = {};
    this.buildSkills();
    this.buildFrags();
    this.itemPopT = 0;
    this.bannerT = 0;
  }

  show(v) { $('hud').classList.toggle('hidden', !v); $('crosshair').classList.toggle('hidden', !v); }

  buildSkills() {
    const wrap = $('skills');
    wrap.innerHTML = '';
    this.skillEls = {};
    for (const s of SKILLS) {
      const d = document.createElement('div');
      d.className = 'skill';
      d.title = s.name;
      const c = document.createElement('canvas');
      c.width = c.height = 92;
      drawSkillIcon(c.getContext('2d'), s.id, 92);
      d.append(c);
      const cd = document.createElement('div'); cd.className = 'cd'; d.append(cd);
      const ct = document.createElement('div'); ct.className = 'cdt'; d.append(ct);
      const k = document.createElement('span'); k.className = 'key'; k.textContent = s.key; d.append(k);
      wrap.append(d);
      this.skillEls[s.id] = { cd, ct };
    }
  }
  buildFrags() {
    const f = $('frags');
    f.innerHTML = '';
    for (let i = 0; i < 4; i++) { const d = document.createElement('div'); d.className = 'frag'; f.append(d); }
  }

  addItem(id) {
    const n = this.game.items[id];
    let el = this.itemEls[id];
    if (!el) {
      el = document.createElement('div');
      el.className = 'item';
      el.title = ITEMS[id].name + ' — ' + ITEMS[id].desc;
      const c = document.createElement('canvas'); c.width = c.height = 60;
      drawItemIcon(c.getContext('2d'), id, 60);
      const s = document.createElement('span');
      el.append(c, s);
      $('items').append(el);
      this.itemEls[id] = el;
    }
    el.querySelector('span').textContent = n > 1 ? 'x' + n : '';
    const pop = $('itemPop');
    drawItemIcon(pop.querySelector('canvas').getContext('2d'), id, 96);
    pop.querySelector('.name').textContent = ITEMS[id].name;
    pop.querySelector('.desc').textContent = ITEMS[id].desc;
    pop.classList.remove('hidden');
    this.itemPopT = 3;
  }

  toast(text) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    $('toasts').append(t);
    setTimeout(() => t.remove(), 3700);
    while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
  }

  banner(title, sub) {
    const b = $('banner');
    b.innerHTML = `<div class="t">${title}</div><div class="s">${sub || ''}</div>`;
    b.classList.add('show');
    this.bannerT = 3.2;
  }

  prompt(text) {
    const p = $('prompt');
    if (!text) { p.classList.add('hidden'); $('tbInteract').classList.add('hidden'); return; }
    p.textContent = text;
    p.classList.remove('hidden');
    $('tbInteract').classList.remove('hidden');
  }

  refreshMissions() {
    const M = this.game.missions;
    const tr = $('tracker');
    tr.innerHTML = '';
    for (const m of MISSIONS) {
      const s = M.state[m.id];
      if (!s.discovered) continue;
      const d = document.createElement('div');
      d.className = 'm' + (s.done ? ' done' : '') + (M.tracked === m.id && !s.done ? ' tracked' : '');
      const prog = m.goal > 1 ? ` <span>${s.progress}/${m.goal}</span>` : '';
      d.innerHTML = `<b>${m.title}${prog}</b>${s.done ? '' : m.desc}`;
      tr.append(d);
    }
    // diario
    const list = $('journalList');
    list.innerHTML = '';
    for (const m of MISSIONS) {
      const s = M.state[m.id];
      const d = document.createElement('div');
      d.className = 'journal-m' + (s.done ? ' done' : '');
      if (!s.discovered) d.innerHTML = `<div class="reg">${REGIONS[m.region].name}</div><b>???</b><div>Explora ${REGIONS[m.region].name} para descubrir esta misión.</div>`;
      else {
        d.innerHTML = `<div class="reg">${REGIONS[m.region].name}</div><b>${m.title}</b>${s.done ? ' ✓' : (m.goal > 1 ? ` — ${s.progress}/${m.goal}` : '')}<div>${m.desc}</div>`;
        if (!s.done) {
          const btn = document.createElement('button');
          btn.textContent = M.tracked === m.id ? 'Siguiendo' : 'Seguir';
          btn.onclick = () => { M.tracked = m.id; this.refreshMissions(); };
          d.prepend(btn);
        }
      }
      list.append(d);
    }
    const n = M.fragments();
    document.querySelectorAll('.frag').forEach((f, i) => f.classList.toggle('on', i < n));
  }

  number(pos, value, crit, color) {
    this.numbers.push({ p: pos.clone(), v: Math.round(value), crit, color, t: 0 });
    if (this.numbers.length > 60) this.numbers.shift();
  }

  update(dt) {
    const g = this.game, st = g.stats;
    $('sparks').textContent = Math.floor(g.sparks);
    $('lvl').textContent = g.level;
    const hpk = Math.max(0, g.hp / st.maxHp);
    $('hpFill').style.width = (hpk * 100).toFixed(1) + '%';
    $('hpText').textContent = Math.ceil(Math.max(0, g.hp)) + ' / ' + Math.round(st.maxHp);
    $('xpFill').style.width = (g.xp / g.xpNext() * 100).toFixed(1) + '%';
    const s = Math.floor(g.time);
    $('timer').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    const c = g.diffCoef();
    $('diffName').textContent = DIFF_NAMES[Math.min(DIFF_NAMES.length - 1, Math.floor(c - 1))];
    $('diffFill').style.width = (Math.min(1, (c - 1) / (DIFF_NAMES.length - 1)) * 100).toFixed(1) + '%';
    for (const sk of SKILLS) {
      const k = g.skills.fraction(sk.id);
      const left = g.skills.left(sk.id);
      const el = this.skillEls[sk.id];
      el.cd.style.height = (k * 100).toFixed(1) + '%';
      el.ct.textContent = left > 0.5 && sk.id !== 'primary' ? Math.ceil(left) : '';
    }
    if (this.itemPopT > 0) { this.itemPopT -= dt; if (this.itemPopT <= 0) $('itemPop').classList.add('hidden'); }
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) $('banner').classList.remove('show'); }
    if (g.boss && !g.boss.dead) {
      $('bossbar').classList.remove('hidden');
      $('bossFill').style.width = (Math.max(0, g.boss.hp / g.boss.maxHp) * 100).toFixed(1) + '%';
    } else $('bossbar').classList.add('hidden');
  }

  /* Capa 2D: números de daño y marcador de misión. */
  draw(camera, dt) {
    const cv = this.overlay, ctx = this.ctx;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const v = new THREE.Vector3();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      n.t += dt;
      if (n.t > 0.9) { this.numbers.splice(i, 1); continue; }
      v.copy(n.p); v.y += n.t * 0.9;
      v.project(camera);
      if (v.z > 1) continue;
      const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
      const a = 1 - Math.max(0, n.t - 0.5) / 0.4;
      const size = n.crit ? 22 : 16;
      ctx.font = `700 ${size}px Quicksand, sans-serif`;
      ctx.globalAlpha = a;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(60,45,80,.75)';
      ctx.strokeText(n.v, x, y);
      ctx.fillStyle = n.color || (n.crit ? '#ff9f7a' : '#ffffff');
      ctx.fillText(n.v, x, y);
    }
    ctx.globalAlpha = 1;
    // marcador de la misión seguida
    if (this.game.state !== 'play') return;
    const targets = this.game.missions.targets();
    if (!targets.length) return;
    const pp = this.game.player.pos;
    let best = targets[0], bd = Infinity;
    for (const t of targets) { const d = t.distanceTo(pp); if (d < bd) { bd = d; best = t; } }
    v.copy(best); v.y += 0.6;
    const camSpace = v.clone().applyMatrix4(camera.matrixWorldInverse);
    v.project(camera);
    let x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
    const behind = camSpace.z > 0;
    const m = 46;
    const off = behind || x < m || x > W - m || y < m || y > H - m;
    if (behind) { x = W - x; y = H - y; }
    if (off) {
      const cx = W / 2, cy = H / 2;
      let dx = x - cx, dy = y - cy;
      if (behind && Math.abs(dy) < 1) dy = 1;
      const k = Math.min((W / 2 - m) / Math.abs(dx || 1e-3), (H / 2 - m) / Math.abs(dy || 1e-3));
      x = cx + dx * k; y = cy + dy * k;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(dy, dx));
      ctx.fillStyle = 'rgba(255,214,120,.95)';
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-6, -10); ctx.lineTo(-6, 10); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(x, y - (off ? 0 : 6 + Math.sin(performance.now() / 300) * 3));
    star(ctx, 0, 0, 10, 4.5);
    ctx.fillStyle = '#ffe08a'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(74,63,92,.6)'; ctx.stroke();
    ctx.font = '700 12px Quicksand, sans-serif';
    ctx.fillStyle = '#fffaf3';
    ctx.strokeStyle = 'rgba(74,63,92,.6)'; ctx.lineWidth = 3;
    const txt = Math.round(bd) + ' m';
    ctx.strokeText(txt, 0, 20); ctx.fillText(txt, 0, 20);
    ctx.restore();
  }
}

function drawSkillIcon(ctx, id, s) {
  ctx.clearRect(0, 0, s, s);
  ctx.save();
  ctx.translate(s / 2, s / 2);
  ctx.scale(s / 64, s / 64);
  ctx.lineWidth = 3; ctx.strokeStyle = '#4a3f5c'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (id === 'primary') {
    ctx.fillStyle = '#c98a4b'; ctx.beginPath(); ctx.ellipse(0, 5, 11, 14, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7a4e33'; ctx.beginPath(); ctx.ellipse(0, -8, 14, 7, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (id === 'secondary') {
    ctx.strokeStyle = '#de8f55'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.arc(0, 0, 16, 0.3, Math.PI * 1.7); ctx.stroke();
    ctx.strokeStyle = '#4a3f5c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 22, 0.3, Math.PI * 1.7); ctx.stroke();
  } else if (id === 'utility') {
    ctx.strokeStyle = '#7fc6b4'; ctx.lineWidth = 7;
    for (const x of [-10, 6]) { ctx.beginPath(); ctx.moveTo(x - 6, -14); ctx.lineTo(x + 8, 0); ctx.lineTo(x - 6, 14); ctx.stroke(); }
  } else {
    star(ctx, 0, 0, 20, 9); ctx.fillStyle = '#ffd36e'; ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
