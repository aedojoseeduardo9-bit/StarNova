/* Star Nova — pantallas de menú: selección de perfil (3 ranuras) y menú del juego por páginas
 * (Misiones · Mochila · Mapa · Compendio · Sistema). Misiones y Compendio los dibuja hud.js. */
import { Profiles, SLOTS } from './save.js';
import { ITEMS, RARITY } from './content/items.js';
import { ATTACKS, POWERS } from './content/attacks.js';
import { drawIcon, star } from './content/icons.js';
import { MISSIONS } from './missions.js';
import { REGIONS, REGION_IDS } from './world/palette.js';
import { Audio } from './audio.js';

const $ = (id) => document.getElementById(id);
export const MENU_TABS = ['misiones', 'mochila', 'mapa', 'compendio', 'sistema'];
const PAGES = { misiones: 'journalList', mochila: 'bag', mapa: 'mapPage', compendio: 'codex', sistema: 'system' };

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const btn = (text, cls, fn) => { const b = el('button', cls, text); b.onclick = fn; return b; };
const rarColor = (r) => (RARITY[r].color === '#e9e2d8' ? '#9a8f86' : RARITY[r].color);
const stars = (n) => { const s = el('span', 'stars'); for (let k = 0; k < 4; k++) s.append(el('i', k < n ? 'on' : '')); return s; };
const playTime = (secs) => {
  const s = Math.floor(secs), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h} h ${m} min` : m ? `${m} min` : 'recién empezada';
};
const since = (t) => {
  if (!t) return 'aún sin guardar';
  const s = Math.max(0, (Date.now() - t) / 1000);
  return s < 60 ? 'guardado hace un momento' : s < 3600 ? `guardado hace ${Math.floor(s / 60)} min` : `guardado hace ${Math.floor(s / 3600)} h`;
};

export class Menus {
  constructor(game) {
    this.game = game;
    this.copyFrom = 0;      // ranura que se está copiando
    this.confirmDel = 0;    // ranura que pide confirmación para borrarse
    this.newSlot = 0;       // ranura vacía que espera un nombre
    this.bagSel = null;
    this.bind();
  }

  bind() {
    const g = this.game;
    $('btnProfilesBack').onclick = () => { Audio.play('select'); this.back(); };
    $('btnNameOk').onclick = () => this.confirmName();
    $('btnNameCancel').onclick = () => { this.newSlot = 0; $('nameBox').classList.add('hidden'); };
    const inp = $('nameInput');
    // lo que se escribe en el nombre no debe llegar a los controles del juego
    inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') this.confirmName(); });
    inp.addEventListener('keyup', (e) => e.stopPropagation());
    document.querySelectorAll('#menuTabs [data-tab]').forEach(b => { b.onclick = () => { Audio.play('select'); g.openMenu(b.dataset.tab); }; });
    $('menuPrev').onclick = () => g.flipMenu(-1);
    $('menuNext').onclick = () => g.flipMenu(1);
    $('btnSave').onclick = () => {
      const ok = g.saveNow(true);
      const b = $('btnSave');
      b.textContent = ok ? 'Guardado ✓' : 'No se pudo guardar';
      clearTimeout(this.saveMsgT);
      this.saveMsgT = setTimeout(() => { b.textContent = 'Guardar'; }, 1600);
      this.renderSystem();
    };
    $('btnSaveQuit').onclick = () => g.saveAndQuit();
  }

  /* ---------- perfiles ---------- */
  get profilesOpen() { return !$('profiles').classList.contains('hidden'); }
  showProfiles(v) {
    this.copyFrom = 0; this.confirmDel = 0; this.newSlot = 0;
    $('title').classList.toggle('hidden', v);
    $('profiles').classList.toggle('hidden', !v);
    $('nameBox').classList.add('hidden');
    if (v) this.renderProfiles();
  }
  /* Botón "atrás": cierra lo que esté abierto. Devuelve false si ya no hay nada que cerrar. */
  back() {
    if (!this.profilesOpen) return false;
    if (!$('nameBox').classList.contains('hidden')) { this.newSlot = 0; $('nameBox').classList.add('hidden'); return true; }
    if (this.copyFrom || this.confirmDel) { this.copyFrom = 0; this.confirmDel = 0; this.renderProfiles(); return true; }
    this.showProfiles(false);
    return true;
  }

  renderProfiles(msg) {
    const g = this.game, list = $('slotList');
    const all = Profiles.list();
    const free = all.some(d => !d);
    list.innerHTML = '';
    SLOTS.forEach((n, i) => {
      const d = all[i];
      const row = el('div', 'slot' + (d ? '' : ' empty'));
      row.dataset.slot = n;
      const info = el('div', 'info'), acts = el('div', 'acts');
      if (d) {
        const s = Profiles.summary(d);
        const name = el('div', 'name', s.name);
        name.append(stars(s.frags));
        info.append(name);
        if (this.confirmDel === n) {
          info.append(el('div', 'meta warn', '¿Borrar este perfil para siempre?'));
          acts.append(
            btn('No', '', () => { this.confirmDel = 0; this.renderProfiles(); }),
            btn('Sí, borrar', 'danger', () => { Profiles.remove(n); this.confirmDel = 0; Audio.play('deny'); this.renderProfiles('Perfil borrado'); }));
        } else {
          info.append(el('div', 'meta', `Nivel ${s.level} · ${s.time} · ${s.region}${s.ended ? ' · Nova brilla' : ''}`));
          if (this.copyFrom === n) acts.append(btn('Cancelar', '', () => { this.copyFrom = 0; this.renderProfiles(); }));
          else if (this.copyFrom) row.classList.add('dim');
          else {
            if (free) acts.append(btn('Copiar', '', () => { this.copyFrom = n; this.confirmDel = 0; Audio.play('select'); this.renderProfiles(); }));
            acts.append(
              btn('Borrar', '', () => { this.confirmDel = n; Audio.play('select'); this.renderProfiles(); }),
              btn('Continuar', 'go', () => g.playSlot(n, null, true)));
          }
        }
      } else {
        info.append(el('div', 'name', 'Ranura vacía'), el('div', 'meta', this.copyFrom ? 'Libre para recibir la copia' : 'Empieza aquí una aventura nueva'));
        if (this.copyFrom) {
          acts.append(btn('Copiar aquí', 'go', () => {
            const ok = Profiles.copy(this.copyFrom, n);
            this.copyFrom = 0;
            Audio.play(ok ? 'item' : 'deny');
            this.renderProfiles(ok ? 'Perfil copiado' : 'No se pudo copiar');
          }));
        } else acts.append(btn('Nueva aventura', 'go', () => this.askName(n)));
      }
      row.append(el('div', 'num', n), info, acts);
      list.append(row);
    });
    $('profileMsg').textContent = msg || (this.copyFrom ? 'Elige una ranura vacía para guardar la copia' : '');
  }

  askName(n) {
    this.newSlot = n;
    const inp = $('nameInput');
    inp.value = 'Pip';
    $('nameBox').classList.remove('hidden');
    Audio.play('select');
    if (!this.game.touch) { inp.focus(); inp.select(); }   // en táctil no se abre el teclado solo: basta con tocar "Empezar"
  }
  confirmName() {
    const n = this.newSlot;
    if (!n) return;
    this.newSlot = 0;
    $('nameInput').blur();
    $('nameBox').classList.add('hidden');
    this.game.playSlot(n, $('nameInput').value, true);
  }

  /* ---------- menú del juego ---------- */
  showTab(tab) {
    const g = this.game;
    document.querySelectorAll('#menuTabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    for (const t of MENU_TABS) $(PAGES[t]).classList.toggle('hidden', t !== tab);
    if (tab === 'misiones') g.hud.refreshMissions();
    else if (tab === 'mochila') this.renderBag();
    else if (tab === 'mapa') this.renderMap();
    else if (tab === 'compendio') g.hud.refreshCodex();
    else this.renderSystem();
  }

  /* Mochila: ataque y poder equipados, cómo está Pip y los objetos reunidos. */
  renderBag() {
    const g = this.game, A = g.arsenal, st = g.stats, box = $('bag');
    box.innerHTML = '';
    const atk = ATTACKS[A.attack.id], pw = POWERS[A.power], tier = RARITY[A.attack.tier];
    const card = (label, def, rar, title, sub, desc, color) => {
      const c = el('div', 'bag-card');
      const cv = document.createElement('canvas'); cv.width = cv.height = 92;
      drawIcon(cv.getContext('2d'), def, 92, rar);
      const t = el('div');
      const s = el('div', 'sub', sub);
      if (color) s.style.color = color;
      t.append(el('div', 'lbl', label), el('b', null, title), s, el('div', null, desc));
      c.append(cv, t);
      return c;
    };
    const top = el('div', 'bag-top');
    top.append(
      card('Ataque', atk, A.attack.tier, atk.name, `${tier.name} · daño ×${tier.mul}`, atk.desc, rarColor(A.attack.tier)),
      card('Poder', pw, 3, pw.name, 'Poder especial', pw.desc, '#a57be0'));
    box.append(top);

    const pct = (v) => Math.round(v * 100) + '%';
    const chips = el('div', 'bag-stats');
    for (const [k, v] of [
      ['Nivel', g.level], ['Vida', `${Math.ceil(Math.max(0, g.hp))} / ${Math.round(st.maxHp)}`], ['Daño', st.dmg.toFixed(1)],
      ['Ritmo de ataque', '×' + st.atk.toFixed(2)], ['Velocidad', '×' + st.speed.toFixed(2)], ['Crítico', pct(st.crit)],
      ['Armadura', Math.round(st.armor)], ['Chispas', Math.floor(g.sparks)], ['Derrotados', g.kills],
    ]) { const c = el('span', null, k + ' '); c.append(el('b', null, v)); chips.append(c); }
    box.append(chips);

    const ids = Object.keys(g.items).filter(id => g.items[id] > 0 && ITEMS[id]).sort((a, b) => ITEMS[b].rar - ITEMS[a].rar);
    const total = ids.reduce((n, id) => n + g.items[id], 0);
    box.append(el('h3', 'bag-h', `Objetos (${total})`));
    const detail = el('div', 'bag-detail');
    const grid = el('div', 'bag-items');
    const show = (id) => {
      this.bagSel = id;
      detail.innerHTML = '';
      grid.querySelectorAll('.bag-item').forEach(b => b.classList.toggle('on', b.dataset.id === id));
      if (!id) { detail.textContent = ids.length ? g.k('Haz clic en un objeto para ver qué hace', 'Toca un objeto para ver qué hace') : 'Aún no tienes objetos. Salen de los cofres: ábrelos con chispas.'; return; }
      const it = ITEMS[id];
      const name = el('b', null, it.name + (g.items[id] > 1 ? ' ×' + g.items[id] : ''));
      const rar = el('span', 'rar', RARITY[it.rar].name);
      rar.style.color = rarColor(it.rar);
      detail.append(name, rar, el('span', null, it.desc));
    };
    for (const id of ids) {
      const b = el('button', 'bag-item');
      b.dataset.id = id;
      const cv = document.createElement('canvas'); cv.width = cv.height = 76;
      drawIcon(cv.getContext('2d'), ITEMS[id], 76, ITEMS[id].rar);
      b.append(cv);
      if (g.items[id] > 1) b.append(el('span', null, 'x' + g.items[id]));
      b.onclick = () => show(this.bagSel === id ? null : id);
      grid.append(b);
    }
    box.append(detail, grid);
    show(ids.includes(this.bagSel) ? this.bagSel : null);
  }

  /* Región conocida: ya se visitó o alguien habló de ella (hay una misión descubierta allí). */
  knows(id) {
    const M = this.game.missions;
    return id === 'claro' || M.visited.has(id) || MISSIONS.some(m => m.region === id && M.state[m.id].discovered);
  }

  /* Mapa: las islas vistas desde arriba (el norte arriba), dónde está Pip y la misión seguida. */
  renderMap() {
    const g = this.game, M = g.missions, cv = $('mapCanvas');
    const S = Math.max(140, Math.round(cv.clientHeight || cv.clientWidth || 240));
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = cv.height = Math.round(S * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const half = 94, ox = 7, oz = 3;
    const K = S / (half * 2);
    const X = (x) => (x - ox + half) * K, Y = (z) => (z - oz + half) * K;

    // cielo
    const sky = ctx.createLinearGradient(0, 0, 0, S);
    sky.addColorStop(0, '#e2f3ec'); sky.addColorStop(0.5, '#fdeadb'); sky.addColorStop(1, '#d9d3f1');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (const [x, z, r] of [[-62, -52, 12], [-50, -58, 9], [58, -44, 13], [70, -50, 8], [-58, 52, 11], [52, 58, 14], [64, 52, 9]]) {
      ctx.beginPath(); ctx.arc(X(x), Y(z), r * K, 0, Math.PI * 2); ctx.fill();
    }
    const c0 = REGIONS.claro.center;
    const line = (x1, z1, x2, z2, w, color, dash) => {
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineWidth = w; ctx.strokeStyle = color; ctx.setLineDash(dash || []);
      ctx.beginPath(); ctx.moveTo(X(x1), Y(z1)); ctx.lineTo(X(x2), Y(z2)); ctx.stroke();
      ctx.restore();
    };
    // pasarelas desde El Claro
    for (const id of REGION_IDS) {
      if (id === 'claro') continue;
      const c = REGIONS[id].center;
      line(c0[0], c0[1], c[0], c[1], Math.max(5, 4.4 * K), 'rgba(74,63,92,.28)');
      line(c0[0], c0[1], c[0], c[1], Math.max(3, 3 * K), '#fff6ee');
    }
    // puente de tablones e islote del altar
    const br = g.spots.plankBridge, al = g.spots.altar;
    if (br && al && this.knows('lavanda')) {
      const built = g.props.bridge.built;
      line(br.from[0], br.from[2], br.to[0], br.to[2], Math.max(2.5, 2.4 * K), built ? '#c9a57c' : 'rgba(141,119,200,.75)', built ? null : [3, 5]);
      ctx.beginPath(); ctx.arc(X(al.pos[0]), Y(al.pos[2]), 5.5 * K, 0, Math.PI * 2);
      ctx.fillStyle = REGIONS.lavanda.ground; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = REGIONS.lavanda.accent; ctx.stroke();
    }
    // islas
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fs = Math.max(9, Math.min(13, S * 0.042));
    for (const id of REGION_IDS) {
      const R = REGIONS[id], known = this.knows(id);
      const x = X(R.center[0]), y = Y(R.center[1]), r = R.r * K;
      ctx.beginPath(); ctx.arc(x, y + 2, r, 0, Math.PI * 2);
      ctx.fillStyle = known ? R.shade : '#b9b0c0'; ctx.fill();            // borde inferior (grosor de la isla)
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = known ? R.ground : '#e2dbe4'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = known ? R.accent : '#b9b0c0'; ctx.stroke();
      if (known) {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; ctx.lineTo(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55); }
        ctx.closePath();
        ctx.fillStyle = R.stone2; ctx.globalAlpha = 0.7; ctx.fill(); ctx.globalAlpha = 1;
      } else {
        ctx.font = `700 ${Math.round(r * 0.9)}px Quicksand, sans-serif`;
        ctx.fillStyle = 'rgba(74,63,92,.45)'; ctx.fillText('?', x, y + 1);
      }
      const main = MISSIONS.find(m => m.region === id && m.type === 'principal');
      if (main && M.state[main.id].done) {
        star(ctx, x + r * 0.72, y - r * 0.72, Math.max(6, r * 0.34), Math.max(2.6, r * 0.15), 4);
        ctx.fillStyle = '#ffd97a'; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(74,63,92,.6)'; ctx.stroke();
      }
      ctx.font = `700 ${fs}px Quicksand, sans-serif`;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,250,244,.9)'; ctx.fillStyle = '#4a3f5c';
      const label = known ? R.name : '???';
      const ly = id === 'menta' ? y - r - fs * 0.8 : y + r + fs * 0.95;
      ctx.strokeText(label, x, ly); ctx.fillText(label, x, ly);
    }
    // objetivos de la misión seguida
    for (const t of M.targets()) {
      star(ctx, X(t.x), Y(t.z), 7, 3.2);
      ctx.fillStyle = '#ffe08a'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(74,63,92,.7)'; ctx.stroke();
    }
    // Pip (la punta mira hacia donde mira Pip)
    const p = g.player.pos, yaw = g.player.yaw;
    ctx.save();
    ctx.translate(X(p.x), Y(p.z));
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,250,244,.75)'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(232,132,60,.8)'; ctx.stroke();
    ctx.rotate(Math.atan2(Math.cos(yaw), Math.sin(yaw)));
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, -6.5); ctx.lineTo(-2.5, 0); ctx.lineTo(-6, 6.5); ctx.closePath();
    ctx.fillStyle = '#e8843c'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#7a3f1c'; ctx.stroke();
    ctx.restore();
    // rosa de los vientos
    ctx.font = `700 ${fs}px Quicksand, sans-serif`;
    ctx.fillStyle = 'rgba(74,63,92,.7)';
    ctx.fillText('N', S - 16, 24);
    ctx.beginPath(); ctx.moveTo(S - 16, 6); ctx.lineTo(S - 11, 15); ctx.lineTo(S - 21, 15); ctx.closePath(); ctx.fill();

    // lista de regiones
    const list = $('mapList');
    list.innerHTML = '';
    for (const id of REGION_IDS) {
      const R = REGIONS[id], known = this.knows(id);
      const row = el('div', 'map-row' + (known ? '' : ' unk') + (g.region === id ? ' here' : ''));
      const dot = el('i', 'dot');
      dot.style.background = known ? R.accent : '#b9b0c0';
      const t = el('div');
      t.append(el('b', null, known ? R.name : '???'));
      if (!known) t.append(el('div', null, 'Sin explorar'));
      else if (id === 'claro') t.append(el('div', null, 'La hoguera cura · Abuela Lechuza'));
      for (const m of MISSIONS) {
        if (m.region !== id || !known) continue;
        const s = M.state[m.id];
        if (!s.discovered) continue;
        t.append(el('div', s.done ? 'ok' : '', s.done ? '✓ ' + m.title : m.title + (m.goal > 1 ? ` ${s.progress}/${m.goal}` : '')));
      }
      row.append(dot, t);
      if (g.region === id) row.append(el('span', 'here-tag', 'Estás aquí'));
      list.append(row);
    }
  }

  /* Sistema: el perfil en uso, guardar y los ajustes. Aquí NO se crean partidas nuevas (eso es en los perfiles). */
  renderSystem() {
    const g = this.game, box = $('sysProfile');
    box.innerHTML = '';
    const has = g.slot > 0;
    $('btnSave').classList.toggle('hidden', !has);
    $('btnSaveQuit').classList.toggle('hidden', !has);
    const info = el('div', 'info');
    const name = el('div', 'name', has ? g.profile.name : 'Partida de prueba');
    name.append(stars(g.missions.fragments()));
    const region = (REGIONS[g.region] || REGIONS.claro).name;
    info.append(name, el('div', 'meta', `Nivel ${g.level} · ${playTime(g.time)} · ${region} · ${has ? since(g.lastSaved) : 'sin perfil: no se guarda'}`));
    box.append(el('div', 'num', has ? g.slot : '–'), info);
  }
}
