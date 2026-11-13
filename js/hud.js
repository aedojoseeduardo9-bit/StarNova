/* Star Nova — interfaz: HUD en DOM + capa 2D (números de daño, barras de enemigos, marcador de misión). */
import * as THREE from 'three';
import { ITEMS, ITEM_LIST, RARITY } from './content/items.js';
import { drawIcon, star } from './content/icons.js';
import { ATTACKS, ATTACK_LIST, POWERS, POWER_LIST } from './content/attacks.js';
import { CHEST_LIST, RANKS, RANK_COLORS } from './content/chests.js';
import { ENEMY_LIST, ELITE_LIST } from './content/enemies.js';
import { MISSIONS } from './missions.js';
import { REGIONS } from './world/palette.js';

const $ = (id) => document.getElementById(id);
const DIFF_NAMES = ['Brisa', 'Llovizna', 'Lluvia', 'Chubasco', 'Tormenta', 'Diluvio', '¡NOVA!'];
const SKILLS = [
  { id: 'primary', key: 'Clic' },
  { id: 'secondary', key: 'Q' },
  { id: 'utility', key: 'Shift' },
  { id: 'special', key: 'R' },
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
    this.touchBtns = {};
    document.querySelectorAll('.tb').forEach(b => { this.touchBtns[b.dataset.k] = b; });
    const j = this.touchBtns.jump && this.touchBtns.jump.querySelector('canvas');
    if (j) { j.width = j.height = 96; drawSkillIcon(j.getContext('2d'), 'jump', 96); }
  }

  show(v) { $('hud').classList.toggle('hidden', !v); $('crosshair').classList.toggle('hidden', !v); }

  buildSkills() {
    const wrap = $('skills');
    wrap.innerHTML = '';
    this.skillEls = {};
    for (const s of SKILLS) {
      const d = document.createElement('div');
      d.className = 'skill';
      const c = document.createElement('canvas');
      c.width = c.height = 92;
      d.append(c);
      const cd = document.createElement('div'); cd.className = 'cd'; d.append(cd);
      const ct = document.createElement('div'); ct.className = 'cdt'; d.append(ct);
      const k = document.createElement('span'); k.className = 'key'; k.textContent = s.key; d.append(k);
      wrap.append(d);
      this.skillEls[s.id] = { cd, ct, canvas: c };
    }
  }
  /* Redibuja los íconos del ataque y del poder equipados (barra de PC y botones táctiles). */
  refreshLoadout() {
    const A = this.game.arsenal;
    const atk = ATTACKS[A.attack.id], pw = POWERS[A.power];
    const draw = (canvas, id) => {
      if (!canvas) return;
      canvas.width = canvas.height = 96;
      const ctx = canvas.getContext('2d');
      if (id === 'primary') drawIcon(ctx, atk, 96, A.attack.tier);
      else if (id === 'special') drawIcon(ctx, pw, 96, 3);
      else drawSkillIcon(ctx, id, 96);
    };
    for (const s of SKILLS) {
      draw(this.skillEls[s.id].canvas, s.id);
      const b = this.touchBtns[s.id];
      if (b) draw(b.querySelector('canvas'), s.id);
    }
    const t = RARITY[A.attack.tier];
    $('loadout').innerHTML = `<span style="color:${t.color === '#e9e2d8' ? 'inherit' : t.color}">${atk.name} · ${t.name}</span>·<span>${pw.name}</span>`;
  }
  buildFrags() {
    const f = $('frags');
    f.innerHTML = '';
    for (let i = 0; i < 4; i++) { const d = document.createElement('div'); d.className = 'frag'; f.append(d); }
  }

  addItem(id, silent) {
    const n = this.game.items[id];
    let el = this.itemEls[id];
    if (!el) {
      el = document.createElement('div');
      el.className = 'item';
      el.title = ITEMS[id].name + ' — ' + ITEMS[id].desc;
      const c = document.createElement('canvas'); c.width = c.height = 60;
      drawIcon(c.getContext('2d'), ITEMS[id], 60, ITEMS[id].rar);
      const s = document.createElement('span');
      el.append(c, s);
      $('items').append(el);
      this.itemEls[id] = el;
    }
    el.querySelector('span').textContent = n > 1 ? 'x' + n : '';
    el.classList.toggle('hidden', !n);
    if (!silent) this.popup('item', id);
  }
  refreshItems() { for (const id in this.itemEls) this.addItem(id, true); }

  popup(type, v) {
    const pop = $('itemPop');
    const ctx = pop.querySelector('canvas').getContext('2d');
    let name, desc, tier;
    if (type === 'item') { const it = ITEMS[v]; drawIcon(ctx, it, 96, it.rar); name = it.name; desc = it.desc; tier = RARITY[it.rar]; }
    else if (type === 'attack') { const a = ATTACKS[v.id]; drawIcon(ctx, a, 96, v.tier); name = 'Nuevo ataque: ' + a.name; desc = a.desc + ' (daño ×' + RARITY[v.tier].mul + ')'; tier = RARITY[v.tier]; }
    else { const p = POWERS[v]; drawIcon(ctx, p, 96, 3); name = 'Nuevo poder: ' + p.name; desc = p.desc; tier = { name: 'Poder especial', color: '#c79bff' }; }
    pop.querySelector('.name').innerHTML = `<div class="tier" style="color:${tier.color === '#e9e2d8' ? '#9a8f86' : tier.color}">${tier.name}</div>${name}`;
    pop.querySelector('.desc').textContent = desc;
    pop.classList.remove('hidden');
    this.itemPopT = 3.2;
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

  prompt(text, btnLabel) {
    const p = $('prompt');
    if (!text) { p.classList.add('hidden'); $('tbInteract').classList.add('hidden'); return; }
    p.textContent = text;
    p.classList.remove('hidden');
    $('tbInteract').classList.remove('hidden');
    if (btnLabel) $('tbInteractText').textContent = btnLabel;
  }

  /* Avisito discreto de guardado (junto a los botones, sin tapar el juego). */
  saved(ok) {
    const e = $('saveIcon');
    e.textContent = ok ? '✦ guardado' : 'no se pudo guardar';
    e.classList.add('show');
    clearTimeout(this.savedT);
    this.savedT = setTimeout(() => e.classList.remove('show'), ok ? 1500 : 3500);
  }

  /* Compendio: todo el contenido del juego; lo no descubierto aparece como "???". */
  refreshCodex() {
    const g = this.game, C = g.codex;
    const box = $('codex');
    box.innerHTML = '';
    const sections = [
      ['Objetos', ITEM_LIST, 'item', (x) => ({ glyph: x.glyph, color: x.color, rar: x.rar, name: x.name, desc: `${RARITY[x.rar].name} · ${x.desc}` })],
      ['Ataques', ATTACK_LIST, 'attack', (x) => ({ glyph: x.glyph, color: x.color, rar: x.minTier, name: x.name, desc: x.desc })],
      ['Poderes', POWER_LIST, 'power', (x) => ({ glyph: x.glyph, color: x.color, rar: 3, name: x.name, desc: x.desc })],
      ['Cofres', CHEST_LIST, 'chest', (x) => ({ glyph: 'cube', color: x.look.base, rar: x.rank, name: x.name, desc: `${RANKS[x.rank]} · ${x.desc}` })],
      ['Enemigos', ENEMY_LIST, 'enemy', (x) => ({ glyph: 'eye', color: x.colors[0], rar: 0, name: x.name, desc: x.desc })],
      ['Élites', ELITE_LIST, 'elite', (x) => ({ glyph: 'spikes', color: x.color, rar: 4, name: 'Élite ' + x.name, desc: x.desc })],
    ];
    let total = 0, found = 0;
    for (const [title, list, cat, f] of sections) {
      const sec = document.createElement('div');
      sec.className = 'codex-sec';
      const seen = C[cat] || [];
      total += list.length; found += list.filter(x => seen.includes(x.id)).length;
      sec.innerHTML = `<h3>${title} <span class="codex-count">${list.filter(x => seen.includes(x.id)).length} / ${list.length}</span></h3>`;
      const grid = document.createElement('div');
      grid.className = 'codex-grid';
      for (const x of list) {
        const known = seen.includes(x.id);
        const d = f(x);
        const card = document.createElement('div');
        card.className = 'codex-card' + (known ? '' : ' unk');
        const c = document.createElement('canvas'); c.width = c.height = 68;
        drawIcon(c.getContext('2d'), known ? d : { glyph: 'star', color: '#d8cfc6' }, 68, known ? d.rar : 0);
        const txt = document.createElement('div');
        txt.innerHTML = known ? `<b>${d.name}</b>${d.desc}` : '<b>???</b>Aún no lo descubres';
        card.append(c, txt);
        grid.append(card);
      }
      sec.append(grid);
      box.append(sec);
    }
    const head = document.createElement('div');
    head.className = 'codex-count';
    head.textContent = `Descubierto: ${found} de ${total}`;
    box.prepend(head);
  }

  /* Botoncito de la misión seguida (no tapa la pantalla) + menú de misiones principales y secundarias. */
  refreshMissions() {
    const g = this.game, M = g.missions;
    const chip = $('trackChip');
    const tm = M.tracked ? M.def(M.tracked) : null;
    if (tm) {
      const s = M.state[tm.id];
      chip.textContent = '★ ' + tm.title + (tm.goal > 1 ? ` ${s.progress}/${tm.goal}` : '');
      chip.classList.remove('pick');
    } else {
      const anyOpen = Object.keys(M.state).some(id => M.state[id].discovered && !M.state[id].done);
      chip.textContent = anyOpen ? '★ Elegir misión' : '★ Misiones';
      chip.classList.toggle('pick', anyOpen);
    }
    chip.onclick = () => g.openJournal(true, 'misiones');
    this.renderMissionMenu();
    const n = M.fragments();
    document.querySelectorAll('.frag').forEach((f, i) => f.classList.toggle('on', i < n));
  }

  renderMissionMenu() {
    const g = this.game, M = g.missions;
    const list = $('journalList');
    list.innerHTML = '';
    if (!M.tracked) {
      const ask = document.createElement('div');
      ask.className = 'mission-ask';
      ask.textContent = '¿Qué misión quieres hacer primero?';
      list.append(ask);
    }
    const sub = document.createElement('div');
    sub.className = 'subtabs';
    this.missionTab = this.missionTab || 'principal';
    for (const [id, label] of [['principal', 'Principales'], ['secundaria', 'Secundarias']]) {
      const b = document.createElement('button');
      const open = M.list(id).filter(m => M.state[m.id].discovered && !M.state[m.id].done).length;
      b.textContent = label + (open ? ` (${open})` : '');
      b.classList.toggle('on', this.missionTab === id);
      b.onclick = () => { this.missionTab = id; this.renderMissionMenu(); };
      sub.append(b);
    }
    list.append(sub);
    for (const m of M.list(this.missionTab)) {
      const s = M.state[m.id];
      const d = document.createElement('div');
      d.className = 'journal-m' + (s.done ? ' done' : '') + (M.tracked === m.id ? ' tracked' : '');
      const where = m.region ? REGIONS[m.region].name : 'Todo el mundo';
      if (!s.discovered) {
        d.innerHTML = `<div class="reg">${where}</div><b>???</b><div>Explora ${where} para descubrir esta misión.</div>`;
      } else {
        d.innerHTML = `<div class="reg">${where}</div><b>${m.title}</b>${s.done ? ' ✓' : (m.goal > 1 ? ` — ${s.progress}/${m.goal}` : '')}<div>${m.desc}</div>`;
        if (!s.done) {
          const btn = document.createElement('button');
          btn.textContent = M.tracked === m.id ? 'Siguiendo ★' : 'Seguir';
          btn.onclick = () => { M.track(M.tracked === m.id ? null : m.id); if (M.tracked) g.openJournal(false); };
          d.prepend(btn);
        }
      }
      list.append(d);
    }
  }

  number(pos, value, crit, color) {
    this.numbers.push({ p: pos.clone(), v: typeof value === 'number' ? Math.round(value) : value, crit, color, t: 0 });
    if (this.numbers.length > 60) this.numbers.shift();
  }

  update(dt) {
    const g = this.game, st = g.stats;
    $('sparks').textContent = Math.floor(g.sparks);
    $('lvl').textContent = g.level;
    const hpk = Math.max(0, g.hp / st.maxHp);
    $('hpFill').style.width = (hpk * 100).toFixed(1) + '%';
    $('shieldFill').style.width = (Math.min(1, g.shield / st.maxHp) * 100).toFixed(1) + '%';
    $('hpText').textContent = Math.ceil(Math.max(0, g.hp)) + ' / ' + Math.round(st.maxHp) + (g.shield > 0.5 ? ' +' + Math.round(g.shield) : '');
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
      const b = this.touchBtns[sk.id];
      if (b) b.style.setProperty('--cd', sk.id === 'primary' ? 0 : k.toFixed(3));
    }
    if (this.itemPopT > 0) { this.itemPopT -= dt; if (this.itemPopT <= 0) $('itemPop').classList.add('hidden'); }
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) $('banner').classList.remove('show'); }
    if (g.boss && !g.boss.dead) {
      $('bossbar').classList.remove('hidden');
      $('bossFill').style.width = (Math.max(0, g.boss.hp / g.boss.maxHp) * 100).toFixed(1) + '%';
    } else $('bossbar').classList.add('hidden');
  }

  /* Capa 2D: números de daño, barras de enemigos y marcador de misión. */
  draw(camera, dt) {
    const cv = this.overlay, ctx = this.ctx;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const v = new THREE.Vector3();
    const toScreen = (p) => { v.copy(p).project(camera); if (v.z > 1) return null; return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H]; };
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // barras de vida de enemigos (dañados, élites y gólems)
    const pp = this.game.player.pos;
    for (const e of this.game.enemies) {
      if (e.dead || e.isBoss || e.untargetable) continue;
      const big = e.elite || e.def.ai === 'golem';
      if (e.hp >= e.maxHp && !big) continue;
      if (e.pos.distanceTo(pp) > 26) continue;
      const s = toScreen(e.center().add(new THREE.Vector3(0, e.hh + 0.35, 0)));
      if (!s) continue;
      const w = big ? 70 : 40;
      ctx.fillStyle = 'rgba(40,30,70,.45)';
      ctx.fillRect(s[0] - w / 2, s[1], w, 5);
      ctx.fillStyle = e.elite ? e.elite.color : '#ff9fa8';
      ctx.fillRect(s[0] - w / 2, s[1], w * Math.max(0, e.hp / e.maxHp), 5);
      if (big) {
        ctx.font = '700 11px Quicksand, sans-serif';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(60,45,80,.7)';
        const name = e.def.name + (e.elite ? ' ' + e.elite.name : '');
        ctx.strokeText(name, s[0], s[1] - 8); ctx.fillStyle = '#fffaf3'; ctx.fillText(name, s[0], s[1] - 8);
      }
    }
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      n.t += dt;
      if (n.t > 0.9) { this.numbers.splice(i, 1); continue; }
      v.copy(n.p); v.y += n.t * 0.9;
      v.project(camera);
      if (v.z > 1) continue;
      const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
      const a = 1 - Math.max(0, n.t - 0.5) / 0.4;
      const size = n.crit ? 22 : typeof n.v === 'string' ? 14 : 16;
      ctx.font = `700 ${size}px Quicksand, sans-serif`;
      ctx.globalAlpha = a;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(60,45,80,.75)';
      ctx.strokeText(n.v, x, y);
      ctx.fillStyle = n.color || (n.crit ? '#ff9f7a' : '#ffffff');
      ctx.fillText(n.v, x, y);
    }
    ctx.globalAlpha = 1;
    if (this.game.state !== 'play') return;
    const targets = this.game.missions.targets();
    if (!targets.length) return;
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
  if (id === 'secondary') {
    ctx.strokeStyle = '#de8f55'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.arc(0, 0, 16, 0.3, Math.PI * 1.7); ctx.stroke();
    ctx.strokeStyle = '#4a3f5c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 22, 0.3, Math.PI * 1.7); ctx.stroke();
  } else if (id === 'utility') {
    ctx.strokeStyle = '#7fc6b4'; ctx.lineWidth = 7;
    for (const x of [-10, 6]) { ctx.beginPath(); ctx.moveTo(x - 6, -14); ctx.lineTo(x + 8, 0); ctx.lineTo(x - 6, 14); ctx.stroke(); }
  } else if (id === 'jump') {
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(16, 0); ctx.lineTo(6, 0); ctx.lineTo(6, 16); ctx.lineTo(-6, 16); ctx.lineTo(-6, 0); ctx.lineTo(-16, 0); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
