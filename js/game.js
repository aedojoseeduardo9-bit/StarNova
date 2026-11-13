/* Star Nova — núcleo del juego: ciclo, reglas, cofres, director de enemigos, misiones y ajustes. */
import * as THREE from 'three';
import { Physics, G, groups } from './physics.js';
import { buildWorld } from './world/layout.js';
import { REGIONS, regionAt } from './world/palette.js';
import { Sky } from './sky.js';
import { FX } from './fx.js';
import { Input } from './input.js';
import { OrbitCam } from './camera.js';
import { Player } from './entities/player.js';
import { Enemy, Guardian, shatter } from './entities/enemies.js';
import { Pickup } from './combat.js';
import { Bell, Crystal, Crate, PlankBridge, Firefly, Chest, Gate, Lantern, Campfire, Owl, NovaStar } from './props.js';
import { ITEMS, rollItem, computeStats, pickWeighted, RARITY } from './content/items.js';
import { ATTACKS, POWERS, rollAttack, rollPower } from './content/attacks.js';
import { CHESTS, CHEST_LIST } from './content/chests.js';
import { ENEMIES, ENEMY_LIST, ELITE_LIST } from './content/enemies.js';
import { Arsenal } from './arsenal.js';
import { Missions } from './missions.js';
import { HUD } from './hud.js';
import { Audio } from './audio.js';
import { store } from './util.js';
import { Profiles, SLOTS, snapshot, restore } from './save.js';
import { Menus, MENU_TABS } from './menus.js';

const STEP = 1 / 60;
const AUTOSAVE = 30;      // segundos entre guardados automáticos
const $ = (id) => document.getElementById(id);

const OWL_LINES = [
  '¡Pip! Qué bueno que despertaste. Soy la Abuela Lechuza, guardiana del Claro.',
  'Anoche la estrella Nova cayó del cielo y se partió. Sus fragmentos se esconden entre las islas.',
  'Al oeste, en el Jardín de Coral, tres campanas esperan que alguien las haga sonar.',
  'Al norte, en las Torres de Menta, se perdieron tres luciérnagas… y las sombras andan inquietas.',
  'Al este, el Puente de Lavanda duerme. Dicen que dos cristales saben despertarlo.',
  'Con tres fragmentos, el portón del Santuario de Nova, al sur, se abrirá. Cuidado: el Guardián vigila.',
  'Los cofres cambian con el tiempo: mientras más avances, más poderosos serán. ¡Ábrelos con chispas!',
  'Las sombras también se hacen más fuertes con el tiempo. ¡Buen viaje, pequeña!',
];

class Skills {
  constructor(game) {
    this.game = game;
    this.cd = { primary: 0, secondary: 0, utility: 0, special: 0 };
    this.max = { secondary: 2.6, utility: 3.2 };
  }
  dur(id) {
    const g = this.game;
    if (id === 'primary') return g.arsenal.rate();
    if (id === 'special') return g.arsenal.powerCd();
    return this.max[id] * g.stats.cdrMul;
  }
  ready(id) { return this.cd[id] <= 0; }
  use(id) { this.cd[id] = this.dur(id); }
  update(dt) { for (const k in this.cd) this.cd[k] = Math.max(0, this.cd[k] - dt); }
  fraction(id) { return Math.min(1, this.cd[id] / Math.max(0.01, this.dur(id))); }
  left(id) { return this.cd[id]; }
}

export class Game {
  constructor(canvas, params) {
    this.canvas = canvas;
    this.params = params;
    this.mobile = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || !!window.StarNovaAndroid;
    this.v3 = (x, y, z) => new THREE.Vector3(x, y, z);
    this.settings = Object.assign({ sens: 1, autofire: true, vibration: true, camAssist: true }, store.get('ajustes', {}));
    this.codex = store.get('compendio', { item: [], attack: [], power: [], chest: [], enemy: [], elite: [] });
    this.slot = 0;                                        // ranura en uso (0 = partida de prueba: no se guarda)
    this.profile = { name: 'Prueba', created: Date.now() };
    this.saveT = 0;
    this.lastSaved = 0;
    this.menuTab = 'misiones';
  }

  get touch() { return this.input && this.input.touch; }
  /* Texto distinto para PC y para pantalla táctil (en táctil nunca se muestran teclas). */
  k(pc, touch) { return this.touch ? touch : pc; }

  init() {
    const canvas = this.canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.mobile, powerPreference: 'high-performance', preserveDrawingBuffer: !!this.params.get('ojos') });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, this.mobile ? 1.5 : 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = this.scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#fbe1cf', 30, 165);
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.05, 2500);
    this.hemi = new THREE.HemisphereLight('#fff4ec', '#d9a7bd', 1.05);
    scene.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight('#fff1df', 2.1);
    sun.castShadow = true;
    const sm = this.mobile ? 1024 : 2048;
    sun.shadow.mapSize.set(sm, sm);
    const sc = sun.shadow.camera;
    sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 120;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    scene.add(sun, sun.target);
    this.sunOffset = new THREE.Vector3(-28, 46, 20);
    this.iceGeo = new THREE.IcosahedronGeometry(1, 1);
    this.iceMat = new THREE.MeshLambertMaterial({ color: '#bfefff', transparent: true, opacity: 0.45, flatShading: true, emissive: 0x204060 });

    this.phys = new Physics();
    this.fx = new FX(scene);
    this.sky = new Sky(scene);
    this.input = new Input(canvas, this);
    if (this.mobile) this.input.enableTouchUI();
    this.cam = new OrbitCam(this.camera, this.phys);
    this.spots = buildWorld(this);

    this.items = {};
    this.level = 1;
    this.xp = 0;
    this.sparks = 0;
    this.time = 0;
    this.stats = computeStats(this.level, this.items);
    this.hp = this.stats.maxHp;
    this.shield = 0;
    this.shieldCd = 0;
    this.buffs = { invuln: 0, frenzy: 0, healOverTime: 0, healRate: 0 };
    this.timeSlowT = 0;
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.debris = [];
    this.kills = 0;
    this.director = { credits: 4, t: 0 };
    this.aimHold = 0;
    this.region = null;
    this.state = 'title';
    this.god = this.params.get('dios') === '1';
    this.arsenal = new Arsenal(this);
    this.skills = new Skills(this);

    this.hud = new HUD(this);
    this.menus = new Menus(this);
    this.missions = new Missions(this);
    this.player = new Player(this, this.spots.spawn);
    const S = this.spots;
    this.props = {
      bells: S.bells.map((s, i) => new Bell(this, s, i)),
      crystals: S.crystals.map((s, i) => new Crystal(this, s, i)),
      fireflies: S.fireflies.map((s, i) => new Firefly(this, s, i)),
      crates: S.crates.map((p) => new Crate(this, p)),
      chests: S.chests.map((s) => new Chest(this, s)),
      lanterns: S.lanterns.map((s) => new Lantern(this, s)),
      bridge: new PlankBridge(this, S.plankBridge),
      gate: new Gate(this, S.gate),
      campfire: new Campfire(this, S.campfire),
      owl: new Owl(this, S.owl),
      nova: new NovaStar(this, S.novaStar),
    };
    this.props.chests.forEach(c => this.see('chest', c.def.id));
    this.altarFragment = new Pickup(this, 'fragment', this.v3(...S.altar.pos), 0, { floating: true });
    this.pickups.push(this.altarFragment);
    this.owlLine = 0;
    this.see('attack', 'bellota');
    this.see('power', 'lluvia');

    this.bindUI();
    this.onResize();
    addEventListener('resize', () => this.onResize());
    this.applyDebug();
    // tras "Guardar y salir" la página se recarga y vuelve directo a los perfiles
    let back = false;
    try { back = sessionStorage.getItem('starnova.perfiles') === '1'; sessionStorage.removeItem('starnova.perfiles'); } catch (e) { /* sin almacenamiento */ }
    if (back && this.state === 'title') this.menus.showProfiles(true);
    this.hud.refreshMissions();
    this.hud.refreshLoadout();
    this.last = performance.now();
    this.acc = 0;
    this.frames = 0;
    requestAnimationFrame((t) => this.frame(t));
  }

  /* ---------- atajos de prueba (URL) — ver CLAUDE.md ---------- */
  applyDebug() {
    const P = this.params;
    const places = {
      claro: [0, 0.6, 5], coral: [-46, 0.4, 1], menta: [0, 0.4, -45], lavanda: [44, 0.4, 0], nova: [0, 0.4, 44],
      santuario: [0, 0.4, 54], altar: [82.5, 0.4, 0], puente: [62, 0.4, 0], torre: [8, 11.4, -64], campana: [-55, 0.4, -2],
    };
    if (P.get('t')) this.time = parseFloat(P.get('t')) || 0;
    if (P.get('items')) for (const id of Object.keys(ITEMS)) if (ITEMS[id].rar < 4) this.addItem(id, true);
    if (P.get('arma')) { const [id, t] = P.get('arma').split(':'); if (ATTACKS[id]) this.equipAttack({ id, tier: parseInt(t || '0', 10) }, true); }
    if (P.get('poder') && POWERS[P.get('poder')]) this.equipPower(P.get('poder'), true);
    if (P.get('cofre')) {
      const ids = P.get('cofre') === 'todos' ? CHEST_LIST.map(c => c.id) : [P.get('cofre')];
      this.props.chests.forEach((c, i) => { const id = ids[i % ids.length]; if (CHESTS[id]) c.setType(id); });
    }
    const nf = parseInt(P.get('frag') || (P.get('jefe') ? '3' : '0'), 10);
    if (nf > 0) {
      this.missions.discoverAll();
      for (const id of ['campanas', 'luciernagas', 'sombras', 'puente'].slice(0, nf)) this.missions.complete(id);
    }
    if (P.get('puente')) for (const c of this.props.crystals) c.activate();
    const go = P.get('jefe') ? 'santuario' : P.get('ir');
    if (go && places[go]) { this.player.teleport(places[go]); this.cam.target.copy(this.player.pos); }
    if (P.get('cam')) { const [y, p, d] = P.get('cam').split(',').map(Number); this.cam.yaw = y || 0; this.cam.pitch = p ?? 0.32; if (d) this.cam.want = this.cam.cur = d; }
    else if (go === 'lavanda' || go === 'puente') this.cam.yaw = -Math.PI / 2;
    else if (go === 'nova' || go === 'santuario') this.cam.yaw = Math.PI;
    const slot = parseInt(P.get('perfil') || '0', 10);
    if (P.get('auto')) this.start();
    else if (SLOTS.includes(slot)) this.playSlot(slot, P.get('nombre'));
    if (P.get('enemigos')) {
      const n = parseInt(P.get('enemigos'), 10);
      const forced = P.get('tipo') ? P.get('tipo').split(',') : null;
      const pool = forced || ENEMY_LIST.map(e => e.id);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const p = this.player.pos;
        const type = pool[i % pool.length];
        const fly = ENEMIES[type] && ENEMIES[type].flying;
        const elite = P.get('elite') ? ELITE_LIST[i % ELITE_LIST.length].id : null;
        this.spawnEnemy(type, this.v3(p.x + Math.cos(a) * 6, p.y + (fly ? 2 : 0.3), p.z + Math.sin(a) * 6), { force: true, elite });
      }
    }
    if (P.get('diario')) this.openMenu('misiones');
    if (P.get('compendio')) this.openMenu('compendio');
    if (P.get('pausa')) this.openMenu('sistema');
    if (P.get('menu')) this.openMenu(P.get('menu'));
    if (P.get('perfiles') && this.state === 'title') this.menus.showProfiles(true);
    if (P.get('final')) setTimeout(() => this.showEnding(), 300);
    if (P.get('hud') === '0') { this.hud.show(false); this.hideHud = true; }
  }

  bindUI() {
    $('btnStart').onclick = () => { Audio.init(); Audio.play('select'); this.menus.showProfiles(true); };
    $('btnResume').onclick = () => this.closeMenu();
    $('btnJournal').onclick = () => this.openMenu();
    $('btnMute').onclick = () => this.toggleMute();
    $('btnPause').onclick = () => this.openMenu('sistema');
    $('btnRespawn').onclick = () => this.respawn();
    $('btnContinue').onclick = () => { $('ending').classList.add('hidden'); this.state = 'play'; this.input.enabled = true; this.saveSoon(); };
    $('dialog').onclick = () => this.advanceDialog();
    $('btnMute').textContent = Audio.muted ? '♪̸' : '♪';
    // menú: pasar de página con el teclado
    addEventListener('keydown', (e) => {
      if (this.state !== 'menu' || (e.target && e.target.tagName === 'INPUT')) return;
      if (e.code === 'KeyQ' || e.code === 'ArrowLeft') this.flipMenu(-1);
      else if (e.code === 'KeyE' || e.code === 'ArrowRight') this.flipMenu(1);
    });
    // guardar al salir de la app o cambiar de pestaña
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.saveNow(true); });
    addEventListener('pagehide', () => this.saveNow(true));
    // ajustes
    const sens = $('optSens'), auto = $('optAuto'), vib = $('optVib'), assist = $('optAssist');
    sens.value = this.settings.sens; auto.checked = this.settings.autofire; vib.checked = this.settings.vibration; assist.checked = this.settings.camAssist;
    const save = () => {
      this.settings.sens = parseFloat(sens.value); this.settings.autofire = auto.checked;
      this.settings.vibration = vib.checked; this.settings.camAssist = assist.checked;
      store.set('ajustes', this.settings);
    };
    [sens, auto, vib, assist].forEach(el => { el.oninput = save; el.onchange = save; });
  }

  toggleMute() { Audio.setMuted(!Audio.muted); $('btnMute').textContent = Audio.muted ? '♪̸' : '♪'; }

  start(fromButton) {
    if (this.state === 'play') return;
    $('title').classList.add('hidden');
    $('profiles').classList.add('hidden');
    document.body.classList.add('playing');
    this.state = 'play';
    this.input.enabled = true;
    if (!this.hideHud) this.hud.show(true);
    if (fromButton) {
      Audio.init();
      if (this.mobile && !window.StarNovaAndroid) {
        const el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
      }
    }
    if (!this.loadedPos) this.hud.banner(REGIONS.claro.name, REGIONS.claro.sub);
    if (this.loadedPos) setTimeout(() => this.hud.toast('Partida de ' + this.profile.name + ' cargada'), 3800);
    if (!this.owlDone && !this.params.get('ir') && !this.params.get('jefe')) setTimeout(() => this.hud.toast(this.k('Habla con la Abuela Lechuza (E) para empezar', 'Acércate a la Abuela Lechuza y toca el botón ✋ para hablar')), 2500);
  }

  /* ---------- perfiles y guardado (ver js/save.js) ---------- */
  /* Entra al juego con una ranura: carga su partida o, si está vacía, crea el perfil.
   * Es el ÚNICO lugar donde nace una partida nueva (el menú del juego no tiene "partida nueva"). */
  playSlot(n, name, fromButton) {
    if (this.state !== 'title' || !SLOTS.includes(n)) return;
    let d = Profiles.read(n);
    if (!d) { d = Profiles.blank(name); Profiles.write(n, d); }
    this.slot = n;
    restore(this, d);
    this.start(fromButton);
    this.saveNow(true);
  }
  /* Guarda la partida en la ranura en uso. Con quiet no muestra el avisito "guardado". */
  saveNow(quiet) {
    if (!this.slot || this.state === 'title' || this.state === 'dead') return false;
    const ok = Profiles.write(this.slot, snapshot(this));
    this.saveT = 0;
    if (ok) this.lastSaved = Date.now();
    if (!quiet || !ok) this.hud.saved(ok);
    return ok;
  }
  /* Pide un guardado en un momento (tras recoger algo, cumplir una misión, subir de nivel…). */
  saveSoon() { this.saveT = Math.max(this.saveT, AUTOSAVE - 1.5); }
  saveAndQuit() {
    this.saveNow(true);
    this.slot = 0;                       // nada más que guardar mientras la página se recarga
    try { sessionStorage.setItem('starnova.perfiles', '1'); } catch (e) { /* sin almacenamiento */ }
    location.reload();
  }

  /* ---------- menú por páginas (pausa el juego) ---------- */
  openMenu(tab) {
    if (this.state !== 'play' && this.state !== 'menu') return;
    this.menuTab = MENU_TABS.includes(tab) ? tab : this.menuTab;
    if (this.state === 'play') {
      this.state = 'menu';
      this.saveNow(true);
      if (document.exitPointerLock) document.exitPointerLock();
    }
    $('menu').classList.remove('hidden');
    this.menus.showTab(this.menuTab);
  }
  closeMenu() {
    if (this.state !== 'menu') return;
    this.state = 'play';
    $('menu').classList.add('hidden');
  }
  flipMenu(dir) {
    const i = MENU_TABS.indexOf(this.menuTab);
    Audio.play('select');
    this.openMenu(MENU_TABS[(i + dir + MENU_TABS.length) % MENU_TABS.length]);
  }
  /* Compatibilidad: la app de Android llama a pause(true) al pasar a segundo plano. */
  pause(v) {
    if (!v) { this.closeMenu(); return; }
    if (this.state === 'play') this.openMenu('sistema'); else this.saveNow(true);
  }
  openJournal(v, tab) { if (v) this.openMenu(tab || 'misiones'); else this.closeMenu(); }

  /* Botón "atrás" de Android: abre el menú, cierra lo abierto o sale desde la pantalla de título. */
  backButton() {
    if (this.state === 'play') { this.openMenu('sistema'); return 'pausa'; }
    if (this.state === 'menu') { this.closeMenu(); return 'sigue'; }
    if (this.state === 'dialog') { this.advanceDialog(); return 'dialogo'; }
    if (this.state === 'dead' || this.state === 'ending') return 'nada';
    if (this.menus.back()) return 'cerrar';
    return 'salir';
  }

  onResize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1.2 ? 72 : 62;
    this.camera.updateProjectionMatrix();
    this.fx.uniforms.uScale.value = h * 0.9;
  }

  vibrate(ms) { if (this.settings.vibration && this.touch && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* sin vibración */ } } }

  /* ---------- compendio ---------- */
  see(cat, id) {
    const list = this.codex[cat];
    if (!list || list.includes(id)) return;
    list.push(id);
    store.set('compendio', this.codex);
  }

  /* ---------- reglas ---------- */
  diffCoef() { return 1 + this.time / 110; }
  hpScale() { return 1 + 0.38 * (this.diffCoef() - 1); }
  dmgScale() { return 1 + 0.22 * (this.diffCoef() - 1); }
  /* Avance de la partida (sube el rango de los cofres). */
  progress() {
    const frags = this.missions ? this.missions.fragments() : 0;
    return (this.diffCoef() - 1) * 0.9 + frags * 0.35 + (this.level - 1) * 0.08 + (this.bossDone ? 2 : 0);
  }
  chestCost(mult = 1) { return Math.max(1, Math.round(25 * (1 + 0.3 * (this.diffCoef() - 1)) * mult * (1 - this.stats.chestDiscount))); }
  xpNext() { return Math.round(40 * Math.pow(this.level, 1.35)); }
  buffMul(kind) {
    const f = this.buffs.frenzy > 0;
    if (kind === 'atk') return f ? 2 : 1;
    if (kind === 'speed') return f ? 1.4 : 1;
    return 1;
  }
  recompute() {
    const old = this.stats ? this.stats.maxHp : 0;
    this.stats = computeStats(this.level, this.items);
    if (old && this.stats.maxHp > old) this.hp += this.stats.maxHp - old;
    this.hp = Math.min(this.hp, this.stats.maxHp);
    this.shield = Math.min(this.shield, this.stats.maxShield);
  }
  heal(v, quiet) {
    const before = this.hp;
    this.hp = Math.min(this.stats.maxHp, this.hp + v);
    if (!quiet && this.hp - before > 1) this.hud.number(this.player.center.add(new THREE.Vector3(0, 0.6, 0)), this.hp - before, false, '#9fe3b0');
  }

  addItem(id, silent) {
    this.items[id] = (this.items[id] || 0) + 1;
    this.recompute();
    if (this.stats.maxShield > 0 && this.shield === 0) this.shield = this.stats.maxShield;
    this.hud.addItem(id, silent);
    this.see('item', id);
    if (!silent) { Audio.play('item'); this.vibrate(20); this.saveSoon(); }
  }
  equipAttack(v, silent) {
    const old = this.arsenal.attack;
    if (!silent && old && !(old.id === 'bellota' && old.tier === 0)) {
      this.pickups.push(new Pickup(this, 'attack', this.player.center, old, { color: ATTACKS[old.id].color, halo: RARITY[old.tier].color, waitFar: true, vel: { x: 0, y: 3, z: 0 } }));
    }
    this.arsenal.attack = { id: v.id, tier: v.tier };
    this.see('attack', v.id);
    this.hud.refreshLoadout();
    if (!silent) { this.hud.popup('attack', v); Audio.play('item'); this.vibrate(25); this.saveSoon(); }
  }
  equipPower(id, silent) {
    const old = this.arsenal.power;
    if (!silent && old && old !== 'lluvia') this.pickups.push(new Pickup(this, 'power', this.player.center, old, { color: POWERS[old].color, waitFar: true, vel: { x: 0, y: 3, z: 0 } }));
    this.arsenal.power = id;
    this.skills.cd.special = 0;
    this.see('power', id);
    this.hud.refreshLoadout();
    if (!silent) { this.hud.popup('power', id); Audio.play('item'); this.vibrate(25); this.saveSoon(); }
  }
  dropItem(pos, rarW) {
    const id = rollItem(rarW);
    this.pickups.push(new Pickup(this, 'item', pos, id, { color: ITEMS[id].color, halo: RARITY[ITEMS[id].rar].color, vel: { x: (Math.random() - 0.5) * 3, y: 6, z: (Math.random() - 0.5) * 3 } }));
  }
  /* Abre el botín de un cofre según su estilo y rango. */
  openChestLoot(chest) {
    const d = chest.def, L = d.loot;
    const p = chest.p.clone().add(new THREE.Vector3(0, 0.8, 0));
    let n = L.drops[0] + Math.floor(Math.random() * (L.drops[1] - L.drops[0] + 1));
    if (d.rule === 'luck') n = 1 + pickWeighted([30, 30, 20, 13, 7]);
    const vel = () => ({ x: (Math.random() - 0.5) * 4, y: 6 + Math.random() * 2, z: (Math.random() - 0.5) * 4 });
    for (let i = 0; i < n; i++) {
      const first = i === 0;
      if ((first && L.attack >= 1) || (!(first && L.power >= 1) && Math.random() < L.attack)) {
        const a = rollAttack(L.tier);
        this.pickups.push(new Pickup(this, 'attack', p, a, { color: ATTACKS[a.id].color, halo: RARITY[a.tier].color, vel: vel() }));
      } else if ((first && L.power >= 1) || Math.random() < L.power) {
        const id = rollPower();
        this.pickups.push(new Pickup(this, 'power', p, id, { color: POWERS[id].color, halo: '#ffffff', vel: vel() }));
      } else {
        const id = rollItem(L.item);
        this.pickups.push(new Pickup(this, 'item', p, id, { color: ITEMS[id].color, halo: RARITY[ITEMS[id].rar].color, vel: vel() }));
      }
    }
    if (L.refund) { const r = Math.round(chest.cost() * L.refund); for (let i = 0; i < 4; i++) this.pickups.push(new Pickup(this, 'spark', p, r / 4)); }
    this.missions.event('chest');
    this.saveSoon();
    if (d.rule === 'shadow') {
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2;
        const pool = ENEMY_LIST.filter(e => !e.flying && e.minDiff <= Math.max(1.6, this.diffCoef()) && e.ai !== 'golem');
        const type = pool[Math.floor(Math.random() * pool.length)].id;
        this.spawnEnemy(type, this.v3(chest.p.x + Math.cos(a) * 4, chest.p.y + 0.3, chest.p.z + Math.sin(a) * 4), { elite: ELITE_LIST[Math.floor(Math.random() * ELITE_LIST.length)].id });
      }
      this.hud.toast('¡El cofre sombrío despertó a dos enemigos élite!');
    }
    this.vibrate(30);
  }
  addXp(v) {
    this.xp += v * this.stats.xpMul;
    while (this.xp >= this.xpNext()) {
      this.xp -= this.xpNext();
      this.level++;
      this.recompute();
      this.hp = this.stats.maxHp;
      Audio.play('level');
      this.hud.toast('¡Nivel ' + this.level + '!');
      this.fx.burst(this.player.center, '#9ce8d2', 30, 4);
      this.vibrate(30);
      this.saveSoon();
    }
  }
  collect(p) {
    if (p.type === 'spark') { this.sparks += p.value; Audio.play('coin'); }
    else if (p.type === 'xp') { this.addXp(p.value); Audio.play('xp'); }
    else if (p.type === 'heal') { this.heal(this.stats.maxHp * 0.15); Audio.play('coin'); this.fx.burst(this.player.center, '#ff9fb2', 12, 2); }
    else if (p.type === 'item') this.addItem(p.value);
    else if (p.type === 'attack') this.equipAttack(p.value);
    else if (p.type === 'power') this.equipPower(p.value);
    else if (p.type === 'fragment') { Audio.play('firefly'); this.missions.event('altar'); }
  }

  /* ---------- combate ---------- */
  nearestTarget(range, maxAngle) {
    const cam = this.camera.position, dir = this.cam.forward, pl = this.player.center;
    let best = null, bd = range;
    for (const e of this.enemies) {
      if (e.dead || e.untargetable) continue;
      const c = e.center();
      const d = c.distanceTo(pl);
      if (d > bd) continue;
      if (maxAngle) { const a = c.clone().sub(cam).normalize().angleTo(dir); if (a > maxAngle) continue; }
      const v = c.clone().sub(pl);
      if (this.phys.ray(pl, v.clone().normalize(), Math.max(0.1, d - 0.4), groups(0xffff, G.TERRAIN))) continue;
      bd = d; best = e;
    }
    return best;
  }
  aimPoint() {
    const cam = this.camera;
    const dir = this.cam.forward.clone();
    const origin = cam.position.clone();
    let far = 90;
    const hit = this.phys.ray(origin, dir, far, groups(0xffff, G.TERRAIN | G.PROP | G.GATE));
    if (hit) far = hit.toi;
    let best = null, bt = far;
    for (const e of this.enemies) {
      if (e.dead || e.untargetable) continue;
      const c = e.center();
      const t = c.clone().sub(origin).dot(dir);
      if (t < 0 || t > bt) continue;
      const d = origin.clone().addScaledVector(dir, t).distanceTo(c);
      if (d < e.r + 0.15) { best = e; bt = t; }
    }
    if (!best && this.touch) {
      const e = this.nearestTarget(30, 0.45);
      if (e) { $('crosshair').classList.add('hit'); return e.center(); }
    }
    $('crosshair').classList.toggle('hit', !!best);
    return origin.addScaledVector(dir, bt);
  }
  /* Punto donde caen los poderes: el enemigo cercano (táctil) o la mira, nunca encima de Pip. */
  powerTarget() {
    const pl = this.player.pos;
    if (this.touch) { const e = this.nearestTarget(22); if (e) return e.pos.clone(); }
    let t = this.aimPoint();
    if (t.distanceTo(pl) < 3.5) {
      const f = this.cam.forward.clone().setY(0).normalize();
      t = pl.clone().addScaledVector(f, 6);
      const hit = this.phys.ray({ x: t.x, y: pl.y + 6, z: t.z }, { x: 0, y: -1, z: 0 }, 14, groups(0xffff, G.TERRAIN));
      if (hit) t.y = hit.point.y;
    }
    return t;
  }
  firePrimary(target) {
    const pl = this.player;
    this.arsenal.fire(pl.muzzle, target || this.aimPoint());
  }
  addPlayerShot(s) { this.projectiles.push(s); }
  hitWithShot(e, shot) { this.arsenal.hitShot(e, shot); }

  tailSwipe() {
    const pl = this.player;
    const c = pl.center;
    const R = 2.2;
    pl.tailT = 0.35;
    Audio.play('swipe');
    this.fx.ring(pl.pos.clone().add(new THREE.Vector3(0, 0.25, 0)), '#ffe0c0', 22, 6);
    for (const e of this.enemies) {
      if (e.dead || e.untargetable) continue;
      if (e.center().distanceTo(c) < R + e.r) this.damageEnemy(e, this.stats.dmg * 2.2 * this.arsenal.tierBonus(), { knock: 9, from: c, up: 4, proc: true });
    }
    for (const p of this.projectiles) if (p.kind === 'eorb' && p.pos().distanceTo(c) < R) { p.dead = true; this.fx.burst(p.pos(), '#ffffff', 6, 2); }
    const pushers = [...this.props.bells, ...this.props.crates, ...this.props.lanterns, ...this.props.crystals];
    for (const o of pushers) {
      const t = o.body ? o.body.translation() : (o.links ? o.links[o.links.length - 1].body.translation() : o.p);
      const d = new THREE.Vector3(t.x - c.x, 0, t.z - c.z);
      if (d.length() < R + 0.6) o.push(d.normalize(), 2.2);
    }
    this.vibrate(15);
  }

  hitEnemySegment(a, b, rad, skip) {
    const ab = b.clone().sub(a);
    const len2 = Math.max(1e-6, ab.lengthSq());
    for (const e of this.enemies) {
      if (e.dead || e.untargetable || (e.spawnT > 0.3) || (skip && skip.has(e))) continue;
      const c = e.center();
      const t = Math.max(0, Math.min(1, c.clone().sub(a).dot(ab) / len2));
      const p = a.clone().addScaledVector(ab, t);
      if (p.distanceTo(c) < e.r + rad) return e;
    }
    return null;
  }

  damageEnemy(e, dmg, o = {}) {
    if (e.dead || e.untargetable) return;
    const st = this.stats;
    // muro andante: el escudo frontal bloquea casi todo
    if (e.def.ai === 'shielder' && o.from) {
      const f = new THREE.Vector3(Math.sin(e.yaw), 0, Math.cos(e.yaw));
      const to = o.from.clone().sub(e.pos).setY(0).normalize();
      if (f.dot(to) > 0.45) { dmg *= 0.2; if (Math.random() < 0.5) this.fx.burst(e.center().addScaledVector(f, e.r), '#c9cdf3', 5, 2); }
    }
    if (e.armor) dmg *= 1 - e.armor;
    if (e.slowT > 0 && e.slowK < 0.35 && st.frozenBonus) dmg *= 1 + st.frozenBonus;
    if (st.executeLow && e.hp < e.maxHp * 0.3) dmg *= 1 + st.executeLow;
    e.hp -= dmg;
    e.flash = 0.12;
    this.hud.number(e.center().add(new THREE.Vector3(0, e.hh + 0.2, 0)), dmg, o.crit, o.color);
    if (!o.quiet) Audio.play('hit');
    if (o.knock && e.vel && !e.isBoss && e.def.ai !== 'turret') {
      const from = o.from || this.player.center;
      const d = e.center().sub(from).setY(0).normalize();
      const k = e.def.ai === 'golem' || e.def.ai === 'shielder' ? 0.2 : 1;
      e.vel.x += d.x * o.knock * k; e.vel.z += d.z * o.knock * k;
      if (o.up && !e.flying) e.vel.y = o.up * k;
    }
    if (e.hp <= 0) { this.killEnemy(e); return; }
    if (o.effects || o.proc) this.arsenal.applyEffects(e, dmg, o.effects ? Object.assign({}, o.effects, { proc: o.proc }) : { proc: o.proc }, o.from);
  }

  killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    this.kills++;
    const c = e.center();
    const el = e.elite;
    shatter(this, c, e.def.colors, e.isBoss ? 40 : e.def.ai === 'golem' ? 26 : 12, e.isBoss || e.def.ai === 'golem' ? 0.2 : 0.08 * (e.small ? 0.7 : 1));
    this.fx.burst(c, e.def.colors[1], 20, 4);
    Audio.play('kill');
    this.cam.shake = Math.max(this.cam.shake, e.isBoss ? 1 : e.def.ai === 'golem' ? 0.4 : 0.06);
    if (!e.isBoss) { this.see('enemy', e.type); if (el) this.see('elite', el.id); }
    const mult = (el ? 2.5 : 1) * (e.small ? 0.5 : 1);
    const sparks = e.def.sparks * this.stats.sparkMul * (0.8 + 0.4 * this.diffCoef()) * mult;
    const ns = Math.min(e.isBoss ? 24 : 6, Math.max(1, Math.round(sparks / 4)));
    for (let i = 0; i < ns; i++) this.pickups.push(new Pickup(this, 'spark', c, sparks / ns));
    const nx = e.isBoss ? 20 : 3;
    for (let i = 0; i < nx; i++) this.pickups.push(new Pickup(this, 'xp', c, e.def.xp * mult / nx));
    if (Math.random() < 0.07) this.pickups.push(new Pickup(this, 'heal', c, 1));
    if (this.stats.healOnKill) this.heal(this.stats.healOnKill, true);
    if (e.def.ai === 'golem' || (el && Math.random() < 0.35) || (e.type === 'totem' && Math.random() < 0.2)) this.dropItem(c, e.def.ai === 'golem' ? [0, 30, 45, 22, 3, 0] : [50, 40, 10, 0, 0, 0]);
    if (e.def.ai === 'splitter' && !e.small) {
      for (const s of [-1, 1]) this.spawnEnemy('gelatina', this.v3(e.pos.x + s * 0.6, e.pos.y + 0.3, e.pos.z), { small: true, force: true });
    }
    if (el && el.id === 'explosivo') {
      const p = c.clone();
      this.fx.ring(p, '#ffd36e', 20, 3);
      setTimeout(() => { if (this.state === 'play') this.explodeAt(p, 2.6, e.def.dmg * e.dmgMul * 1.5, '#ffd36e', true); }, 450);
    }
    this.missions.event('kill', { region: regionAt(e.pos.x, e.pos.z), elite: !!el, type: e.type });
    if (e.isBoss) this.bossDefeated();
  }

  spawnEnemy(type, pos, o = {}) {
    const e = new Enemy(this, type, pos, o);
    if (o.force) e.spawnT = 0.3;
    this.enemies.push(e);
    return e;
  }
  addProjectile(p) { this.projectiles.push(p); }

  /* Explosión: daña enemigos (y a Pip si hurtsPlayer), empuja objetos. */
  explodeAt(p, r, dmg, color, hurtsPlayer, effects) {
    this.fx.burst(p, color, 26, 6, 0.2, 0.8);
    this.fx.ring(p, color, 18, r * 2);
    Audio.play('hit');
    this.cam.shake = Math.max(this.cam.shake, 0.12 + r * 0.02);
    for (const e of this.enemies) if (!e.dead && e.center().distanceTo(p) < r + e.r) this.damageEnemy(e, dmg, { knock: 5, from: p, up: 3, proc: false, quiet: true, effects: effects ? Object.assign({}, effects, { splash: 0, chain: 0, voidHole: 0, cloud: 0, proc: false }) : null });
    for (const o of [...this.props.crates, ...this.props.bells]) {
      const t = o.body.translation();
      const d = new THREE.Vector3(t.x - p.x, t.y - p.y, t.z - p.z);
      if (d.length() < r + 0.8) o.push(d.normalize(), 2);
    }
    if (hurtsPlayer && this.player.center.distanceTo(p) < r) this.hurtPlayer(dmg, p);
  }
  explode(p, r, dmg, color) { this.explodeAt(p, r, dmg, color, false, { proc: false }); }

  stomp(p, n) {
    const r = 2.5 + n * 0.5;
    this.fx.ring(p.clone().add(new THREE.Vector3(0, 0.1, 0)), '#e8a3c0', 24, r * 2);
    this.cam.shake = Math.max(this.cam.shake, 0.15);
    for (const e of this.enemies) if (!e.dead && e.pos.distanceTo(p) < r + e.r) this.damageEnemy(e, this.stats.dmg * 1.5 * n, { knock: 6, from: p, up: 5, proc: true });
  }

  slam(p, r, dmg, big) {
    this.fx.ring(p.clone().add(new THREE.Vector3(0, 0.1, 0)), '#ffffff', big ? 40 : 24, big ? 12 : 7);
    this.fx.burst(p, '#e6d6f2', big ? 40 : 18, big ? 7 : 4);
    this.cam.shake = Math.max(this.cam.shake, big ? 0.5 : 0.2);
    Audio.play('rumble');
    const pl = this.player;
    const d = Math.hypot(pl.pos.x - p.x, pl.pos.z - p.z);
    if (d < r && Math.abs(pl.pos.y - p.y) < 1.4) {
      if (this.hurtPlayer(dmg, p)) pl.vel.y = 7;
    }
    for (const o of this.props.crates) {
      const t = o.body.translation();
      if (Math.hypot(t.x - p.x, t.z - p.z) < r) o.push(new THREE.Vector3(t.x - p.x, 0, t.z - p.z).normalize(), 1.5);
    }
  }

  /* Daño a Pip: invulnerable, esquivar, escudo, armadura y púas. Devuelve true si golpeó. */
  hurtPlayer(dmg, from, src) {
    const pl = this.player;
    if (pl.invuln > 0 || this.god || this.state !== 'play' || this.buffs.invuln > 0) return false;
    if (Math.random() < this.stats.dodge) {
      pl.invuln = 0.4;
      this.hud.number(pl.center.add(new THREE.Vector3(0, 0.5, 0)), '¡Esquivado!', false, '#bfe0ff');
      return false;
    }
    let d = dmg * 100 / (100 + this.stats.armor);
    if (src && this.stats.thorns && !src.dead) this.damageEnemy(src, d * this.stats.thorns * 2, { proc: false, color: '#d8b48a' });
    this.shieldCd = 4;
    if (this.shield > 0) {
      const a = Math.min(this.shield, d);
      this.shield -= a; d -= a;
      this.fx.burst(pl.center, '#d7b8ff', 8, 2);
      if (this.shield <= 0 && this.stats.shieldNova) this.explodeAt(pl.center, 4, this.stats.dmg * 3, '#d7b8ff', false, { proc: false });
    }
    if (d > 0) this.hp -= d;
    pl.invuln = 0.7; pl.hurtT = 0.7;
    pl.anim.hurt();
    if (from) {
      const k = pl.center.sub(from).setY(0).normalize();
      pl.vel.x += k.x * 6; pl.vel.z += k.z * 6; pl.vel.y = Math.max(pl.vel.y, 3);
    }
    Audio.play('hurt');
    this.vibrate(45);
    this.cam.shake = Math.max(this.cam.shake, 0.22);
    if (d > 0) this.hud.number(pl.center.add(new THREE.Vector3(0, 0.5, 0)), d, false, '#ff8f8f');
    if (this.hp <= 0) this.die();
    return true;
  }

  die() {
    if (this.items.corazon > 0 || this.items.fenix > 0) {
      const fenix = this.items.fenix > 0;
      if (fenix) this.items.fenix--; else this.items.corazon--;
      this.recompute();
      this.hud.refreshItems();
      this.hp = this.stats.maxHp * (fenix ? 1 : 0.6);
      this.player.invuln = 2;
      this.hud.toast(fenix ? '¡La Pluma de Fénix te devolvió la vida!' : 'El Corazón de Nova te devolvió la vida');
      this.fx.burst(this.player.center, fenix ? '#ff9a6b' : '#ff8fb0', 40, 5);
      if (fenix) this.explodeAt(this.player.center, 6, this.stats.dmg * 8, '#ff9a6b', false, { burn: 0.5, proc: false });
      return;
    }
    this.state = 'dead';
    this.input.enabled = false;
    if (document.exitPointerLock) document.exitPointerLock();
    $('dead').classList.remove('hidden');
  }
  respawn() {
    $('dead').classList.add('hidden');
    this.player.teleport([0.5, 0.6, 2.5]);
    this.hp = this.stats.maxHp;
    this.sparks = Math.floor(this.sparks / 2);
    for (const e of this.enemies) if (!e.isBoss) { e.dead = true; }
    this.state = 'play';
    this.input.enabled = true;
    this.saveSoon();
  }
  fellOff() {
    const pl = this.player;
    pl.teleport(pl.lastSafe);
    this.cam.target.copy(pl.pos);
    if (!this.god) {
      this.hp -= this.stats.maxHp * 0.12;
      this.hud.toast('¡Uf! Pip vuelve a tierra firme');
      if (this.hp <= 0) this.die();
    }
  }

  onMissionComplete(m) {
    this.saveSoon();
    Audio.play('mission');
    this.hud.banner(m.type === 'secundaria' ? 'Misión secundaria cumplida' : 'Misión cumplida', m.title);
    this.vibrate(60);
    if (m.reward) {
      this.sparks += 60;
      const f = this.cam.forward.clone().setY(0).normalize();
      this.dropItem(this.player.center.addScaledVector(f, 1.2).add(new THREE.Vector3(0, 0.6, 0)), m.reward);
      this.hud.toast('Premio: +60 chispas y un objeto');
    }
    if (m.fragment) {
      const n = this.missions.fragments();
      this.sparks += 40;
      this.hud.toast('Fragmento de Nova obtenido (' + n + '/4)');
      this.fx.burst(this.player.center, '#fff0b0', 40, 5, 0.2, 1.2);
      this.props.gate.setLights(Math.min(3, n));
      this.props.nova.setLit(n / 4 * 0.5);
      if (n >= 3 && !this.props.gate.open) {
        this.props.gate.openGate();
        setTimeout(() => this.hud.toast('El portón del Santuario de Nova se abrió (al sur)'), 1500);
        this.missions.state.guardian.discovered = true;
      }
    }
  }

  startBoss() {
    if (this.boss) return;
    const c = REGIONS.nova.center;
    this.boss = new Guardian(this, this.v3(c[0], 0.3, c[1] + 2));
    this.enemies.push(this.boss);
    this.hud.banner('El Guardián de Nova', 'protector de la estrella dormida');
  }
  bossDefeated() {
    this.bossDone = true;
    this.missions.event('boss');
    this.props.nova.wake();
    this.sky.extraNight = 1;
    // premio: un cofre Nova aparece en el santuario
    const nc = REGIONS.nova.center;
    const ch = new Chest(this, { pos: [nc[0] + 3, 0.6, nc[1] - 2], region: 'nova', type: 'nova' });
    this.props.chests.push(ch);
    this.saveSoon();
    setTimeout(() => this.showEnding(), 6500);
  }
  showEnding() {
    this.state = 'ending';
    this.input.enabled = false;
    if (document.exitPointerLock) document.exitPointerLock();
    const s = Math.floor(this.time);
    $('endStats').innerHTML = `Tiempo: ${Math.floor(s / 60)} min ${s % 60} s · Nivel ${this.level} · ${this.kills} sombras · ${Object.values(this.items).reduce((a, b) => a + b, 0)} objetos<br>Las islas vuelven a brillar. Pero las sombras no descansan… y un Cofre Nova te espera en el santuario.`;
    $('ending').classList.remove('hidden');
  }

  /* ---------- interacción ---------- */
  nearestInteractable() {
    const p = this.player.pos;
    let best = null, bd = 1.8;
    for (const c of this.props.chests) {
      if (c.opened) continue;
      const d = c.p.distanceTo(p);
      if (d < bd) { bd = d; best = { type: 'chest', obj: c }; }
    }
    const o = this.props.owl.p;
    if (Math.hypot(o.x - p.x, o.z - p.z) < 2.3) best = { type: 'owl' };
    return best;
  }
  interact(it) {
    if (it.type === 'chest') {
      const ch = it.obj;
      if (ch.def.rule === 'blood') {
        if (this.hp <= this.stats.maxHp * 0.3) { Audio.play('deny'); this.hud.toast('Te falta vida para pagar el Cofre de Sangre'); return; }
        this.hp -= this.stats.maxHp * 0.25;
        this.fx.burst(this.player.center, '#c95a6a', 16, 3);
        ch.open();
        return;
      }
      const cost = ch.cost();
      if (this.sparks >= cost) { this.sparks -= cost; ch.open(); }
      else { Audio.play('deny'); this.hud.toast('Necesitas ' + cost + ' chispas'); }
    } else if (it.type === 'owl') {
      this.owlLine = 0;
      this.openDialog();
    }
  }
  openDialog() {
    this.state = 'dialog';
    $('dialog').classList.remove('hidden');
    $('dialog').querySelector('.who').textContent = 'Abuela Lechuza';
    $('dialog').querySelector('.text').textContent = OWL_LINES[this.owlLine];
    $('dialog').querySelector('.hint').textContent = this.k('Haz clic o pulsa E para continuar', 'Toca para continuar');
    Audio.play('select');
  }
  advanceDialog() {
    this.owlLine++;
    if (this.owlLine >= OWL_LINES.length) {
      $('dialog').classList.add('hidden');
      this.state = 'play';
      this.owlDone = true;
      this.missions.discoverAll();
      this.saveSoon();
      // el jugador elige qué misión hacer primero
      if (!this.missions.tracked) setTimeout(() => this.openJournal(true, 'misiones'), 300);
      return;
    }
    $('dialog').querySelector('.text').textContent = OWL_LINES[this.owlLine];
    Audio.play('select');
  }

  /* ---------- director de enemigos (dificultad que crece con el tiempo) ---------- */
  runDirector(dt) {
    const D = this.director;
    D.t -= dt;
    const zone = this.spots.spawnZones.find(z => z.region === this.region);
    const c = this.diffCoef();
    D.credits += dt * (0.9 + 0.5 * c) * (zone ? 1 : 0);
    if (D.t > 0 || !zone || this.time < 12) return;
    D.t = 1.3;
    const alive = this.enemies.filter(e => !e.dead && !e.isBoss).length;
    const cap = Math.round(4 + 2 * c);
    if (alive >= cap) return;
    const able = ENEMY_LIST.filter(e => e.minDiff <= c && e.cost * (e.group || 1) * 0.6 <= D.credits);
    if (!able.length) return;
    const def = able[pickWeighted(able.map(e => e.weight))];
    const eliteChance = c < 1.8 ? 0 : Math.min(0.35, (c - 1.8) * 0.12);
    const elite = def.ai !== 'golem' && Math.random() < eliteChance ? ELITE_LIST[Math.floor(Math.random() * ELITE_LIST.length)].id : null;
    const pl = this.player.pos;
    for (let tries = 0; tries < 6; tries++) {
      const a = Math.random() * Math.PI * 2, r = 9 + Math.random() * 12;
      const x2 = pl.x + Math.cos(a) * r, z2 = pl.z + Math.sin(a) * r;
      if (Math.hypot(x2 - zone.c[0], z2 - zone.c[1]) > zone.r) continue;
      const hit = this.phys.ray({ x: x2, y: pl.y + 14, z: z2 }, { x: 0, y: -1, z: 0 }, 30, groups(0xffff, G.TERRAIN));
      if (!hit || Math.abs(hit.point.y - pl.y) > 7) continue;
      const n = def.group || 1;
      for (let i = 0; i < n; i++) this.spawnEnemy(def.id, this.v3(hit.point.x + (i ? (Math.random() - 0.5) * 2 : 0), hit.point.y + (def.flying ? 2.5 : 0.05), hit.point.z + (i ? (Math.random() - 0.5) * 2 : 0)), { elite: i === 0 ? elite : null });
      D.credits -= def.cost * n * (elite ? 2.5 : 1);
      if (def.ai === 'golem') this.hud.toast('¡Un Gólem de Arcos se acerca!');
      else if (elite) this.hud.toast(`¡${def.name} ${ELITE_LIST.find(x => x.id === elite).name} cerca!`);
      return;
    }
  }

  /* ---------- ciclo ---------- */
  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.frames++;
    const t = now / 1000;
    const inp = this.input;

    if (inp.pressed.pause) { if (this.state === 'menu') this.closeMenu(); else this.openMenu('sistema'); }
    else if (inp.pressed.journal) { if (this.state === 'menu') this.closeMenu(); else this.openMenu(); }
    if (inp.pressed.mute) this.toggleMute();
    if (this.state === 'dialog' && (inp.pressed.interact || inp.pressed.jump)) this.advanceDialog();

    // sensibilidad y cámara que acompaña al moverse (táctil)
    inp.lookDX *= this.settings.sens; inp.lookDY *= this.settings.sens;
    if (this.state === 'play' && this.touch && this.settings.camAssist && inp.lookTouch.id === null && Math.abs(inp.mx) > 0.25) inp.lookDX += inp.mx * 1.1 * dt;

    if (this.state === 'play') {
      this.acc += dt;
      let first = true;
      let steps = 0;
      while (this.acc >= STEP && steps < 5) {
        this.step(STEP, first);
        first = false;
        this.acc -= STEP;
        steps++;
      }
      if (steps >= 5) this.acc = 0;
    } else if (this.state === 'title') {
      inp.lookDX = -dt * 0.08;
      inp.lookDY = 0;
    }

    const focus = this.player.pos.clone().add(new THREE.Vector3(0, 0.55, 0));
    this.cam.update(dt, (this.state === 'play' || this.state === 'title') ? inp : { lookDX: 0, lookDY: 0, zoom: 0 }, focus, t);
    // haz arcoíris (necesita la cámara ya actualizada)
    const beamOn = this.state === 'play' && this.arsenal.def.kind === 'beam' && (inp.held.primary || (this.touch && this.settings.autofire && this.autoTarget));
    this.arsenal.updateBeam(dt, beamOn, this.player.muzzle, beamOn ? (inp.held.primary ? this.aimPoint() : this.autoTarget.center()) : null);
    this.fx.update(dt);
    this.sky.update(dt, this.camera.position, t);
    this.scene.fog.color.copy(this.sky.fogColor);
    this.hemi.color.copy(this.sky.u.hor.value).lerp(new THREE.Color('#ffffff'), 0.35);
    this.sun.intensity = 2.1 * (1 - this.sky.night * 0.45);
    this.sun.position.copy(this.player.pos).add(this.sunOffset);
    this.sun.target.position.copy(this.player.pos);
    this.player.animate(dt, t);
    this.renderer.render(this.scene, this.camera);
    if (this.state !== 'title') { this.hud.update(dt); this.hud.draw(this.camera, dt); }
    inp.consume();
  }

  step(dt, first) {
    const inp = this.input;
    const pressed = inp.pressed;
    if (!first) for (const k in pressed) pressed[k] = false;
    this.time += dt;
    this.skills.update(dt);
    const pl = this.player;
    const B = this.buffs;
    B.invuln = Math.max(0, B.invuln - dt);
    B.frenzy = Math.max(0, B.frenzy - dt);
    if (B.healOverTime > 0) { B.healOverTime -= dt; this.heal(B.healRate * dt, true); }
    if (this.timeSlowT > 0) this.timeSlowT -= dt;

    // disparo: manual o automático (táctil)
    this.autoTarget = null;
    if (this.touch && this.settings.autofire && !inp.held.primary) this.autoTarget = this.nearestTarget(20);
    const firing = inp.held.primary || !!this.autoTarget;
    if (firing) this.aimHold = 0.6; else this.aimHold = Math.max(0, this.aimHold - dt);
    if (firing && this.arsenal.def.kind !== 'beam' && this.skills.ready('primary')) {
      this.skills.use('primary');
      this.firePrimary(inp.held.primary ? null : this.autoTarget.center());
    }
    if (this.autoTarget && !inp.held.primary) {
      const d = this.autoTarget.center().sub(pl.pos);
      pl.faceYaw = Math.atan2(d.x, d.z);
    } else pl.faceYaw = null;
    if (pressed.secondary && this.skills.ready('secondary')) { this.skills.use('secondary'); this.tailSwipe(); }
    if (pressed.special && this.skills.ready('special')) { this.skills.use('special'); this.arsenal.usePower(); }
    if (pressed.track) {
      const ids = Object.keys(this.missions.state).filter(id => this.missions.state[id].discovered && !this.missions.state[id].done);
      if (ids.length) { this.missions.tracked = ids[(ids.indexOf(this.missions.tracked) + 1) % ids.length]; this.hud.refreshMissions(); }
    }

    pl.update(dt, inp, this.cam);

    // vida, escudo, quemadura de élites y hoguera
    const st = this.stats;
    this.hp = Math.min(st.maxHp, this.hp + st.regen * dt);
    if (st.maxShield > 0) {
      this.shieldCd -= dt;
      if (this.shieldCd <= 0) this.shield = Math.min(st.maxShield, this.shield + st.maxShield * 0.25 * dt);
    }
    if (pl.burnT > 0) { pl.burnT -= dt; if (!this.god && B.invuln <= 0) this.hp -= 3 * this.dmgScale() * dt; if (Math.random() < 0.3) this.fx.emit(pl.pos.x, pl.pos.y + 0.3, pl.pos.z, 0, 1, 0, '#ff9a5c', 0.12, 0.4, 0); if (this.hp <= 0) this.die(); }
    if (pl.pos.distanceTo(this.props.campfire.p) < 2.6) this.hp = Math.min(st.maxHp, this.hp + st.maxHp * 0.12 * dt);

    for (const e of this.enemies) if (!e.dead) e.update(dt, this.time);
    for (const p of this.projectiles) if (!p.dead) p.update(dt);
    this.arsenal.update(dt, this.time);
    const P = this.props;
    for (const b of P.bells) b.update(dt);
    for (const c of P.crystals) c.update(dt, this.time);
    for (const f of P.fireflies) f.update(dt, this.time);
    for (const c of P.crates) c.update(dt);
    for (const c of P.chests) c.update(dt, this.time);
    for (const l of P.lanterns) l.update(dt);
    P.bridge.update(dt);
    P.gate.update(dt);
    P.campfire.update(dt, this.time);
    P.owl.update(dt, this.time);
    P.nova.update(dt, this.time);
    for (const p of this.pickups) if (!p.dead) p.update(dt, this.time);
    for (const d of this.debris) if (!d.dead) d.update(dt);

    this.runDirector(dt);

    this.phys.step((a, b) => {
      if (a && a.onCollide) a.onCollide(b);
      if (b && b.onCollide) b.onCollide(a);
    });

    // limpieza
    this.enemies = this.enemies.filter(e => { if (e.dead) { e.destroy(); return false; } return true; });
    this.projectiles = this.projectiles.filter(p => { if (p.dead) { p.destroy(); return false; } return true; });
    this.pickups = this.pickups.filter(p => { if (p.dead) { p.destroy(); return false; } return true; });
    this.debris = this.debris.filter(d => { if (d.dead) { d.destroy(); return false; } return true; });

    // regiones
    const reg = regionAt(pl.pos.x, pl.pos.z);
    if (reg && reg !== this.region) {
      this.region = reg;
      this.hud.banner(REGIONS[reg].name, REGIONS[reg].sub);
      if (reg !== 'claro') this.missions.discover(reg);
      this.missions.event('region', reg);
    }
    // jefe
    const nc = REGIONS.nova.center;
    if (P.gate.open && !this.boss && !this.bossDone && Math.hypot(pl.pos.x - nc[0], pl.pos.z - nc[1]) < 13) this.startBoss();

    // guardado automático (solo con los pies en el suelo)
    this.saveT += dt;
    if (this.saveT >= AUTOSAVE && pl.grounded) this.saveNow();

    // interacción
    const it = this.nearestInteractable();
    if (it) {
      const what = it.type === 'chest' ? 'Abrir: ' + it.obj.label() : 'Hablar con la Abuela Lechuza';
      this.hud.prompt(this.k('E · ' + what, what), it.type === 'chest' ? 'Abrir' : 'Hablar');
      if (pressed.interact) this.interact(it);
    } else this.hud.prompt(null);
  }
}
