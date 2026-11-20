/* Star Nova — núcleo del juego: ciclo, reglas, cofres, director de enemigos, misiones y ajustes. */
import * as THREE from 'three';
import { Physics, G, groups } from './physics.js';
import { REGIONS, regionAt } from './world/palette.js';
import { Sky, dayPhase, nightOf, duskOf, DAY_CYCLE, DAY_TIMES } from './sky.js';
import { FX } from './fx.js';
import { Input } from './input.js';
import { OrbitCam } from './camera.js';
import { Player } from './entities/player.js';
import { Enemy, Boss, shatter } from './entities/enemies.js';
import { BOSSES } from './entities/bosses.js';
import { NPC, Rocket } from './entities/npcs.js';
import { NPCS } from './content/npcs.js';
import { WORLD, WORLDS, WORLD_ORDER, previousWorld } from './worlds/index.js';
import { Pickup } from './combat.js';
import { Bell, Crystal, Crate, PlankBridge, Firefly, Chest, Gate, Lantern, Campfire, Owl, NovaStar } from './props.js';
import { ITEMS, rollItem, computeStats, pickWeighted, RARITY } from './content/items.js';
import { ATTACKS, POWERS, rollAttack, rollPower } from './content/attacks.js';
import { CHESTS, CHEST_LIST } from './content/chests.js';
import { ENEMIES, ENEMY_LIST, ELITE_LIST } from './content/enemies.js';
import { Arsenal } from './arsenal.js';
import { Missions, MISSIONS } from './missions.js';
import { HUD } from './hud.js';
import { Audio } from './audio.js';
import { store } from './util.js';
import { Profiles, SLOTS, snapshot, restore, doneWorlds } from './save.js';
import { Menus, MENU_TABS } from './menus.js';
import { OUTFITS, applyOutfit } from './entities/outfits.js';
import { Cinema, SCENE_IDS } from './cinema.js';
import { MusicDirector } from './music.js';
import { OWL_INTRO, owlLines } from './content/story.js';

const STEP = 1 / 60;
const WHITE = new THREE.Color('#ffffff'), SUN_DAY = new THREE.Color('#fff1df'), SUN_NIGHT = new THREE.Color('#b9c2ff');
const AUTOSAVE = 30;      // segundos entre guardados automáticos
const WAVE_CALM = 75;     // segundos de calma de una región tras acabar su ola de sombras
const WAVE_WAIT = 40;     // si las últimas sombras de una ola no caen en este tiempo, la calma empieza igual
const $ = (id) => document.getElementById(id);


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
    this.settings = Object.assign({ sens: 1, autofire: true, vibration: true, camAssist: true, music: 0.8 }, store.get('ajustes', {}));
    Audio.setMusicVolume(this.settings.music);
    this.codex = store.get('compendio', { item: [], attack: [], power: [], chest: [], enemy: [], elite: [] });
    this.world = WORLD;                                   // el mundo cargado (ver js/worlds/)
    this.worldStates = {};                                // lo guardado de los otros mundos (se conserva al guardar)
    this.talked = {};                                     // PNJ con los que ya se habló en este mundo
    this.slot = 0;                                        // ranura en uso (0 = partida de prueba: no se guarda)
    this.profile = { name: 'Prueba', created: Date.now() };
    this.saveT = 0;
    this.lastSaved = 0;
    this.menuTab = 'misiones';
    this.outfits = { owned: [], on: null };               // trajes comprados y el que lleva puesto
    this.story = { seen: {} };                            // escenas de la historia ya vistas
    this.storyQueue = [];                                 // escenas esperando a que Pip pise el suelo
    this.storyOn = false;                                 // las partidas de prueba (?auto=1) no ponen escenas
    this.dialogLines = OWL_INTRO;
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
    this.spots = this.world.build(this);

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
    // oleadas: cada región con sombras tiene una reserva; al gastarse queda en calma (ver runDirector)
    this.waves = {};
    for (const z of this.spots.spawnZones) this.waves[z.region] = { state: 'ola', pool: this.waveSize(1), calm: 0, wait: 0 };
    this.aimHold = 0;
    this.region = null;
    this.state = 'title';
    this.god = this.params.get('dios') === '1';
    this.arsenal = new Arsenal(this);
    this.skills = new Skills(this);

    this.hud = new HUD(this);
    this.menus = new Menus(this);
    this.cinema = new Cinema(this);
    this.music = new MusicDirector(this);
    this.missions = new Missions(this);
    this.player = new Player(this, this.spots.spawn);
    const S = this.spots;
    // objetos del mundo: cada mundo trae los suyos (los que no tenga quedan vacíos o en null)
    this.props = {
      bells: (S.bells || []).map((s, i) => new Bell(this, s, i)),
      crystals: (S.crystals || []).map((s, i) => new Crystal(this, s, i)),
      fireflies: (S.fireflies || []).map((s, i) => new Firefly(this, s, i)),
      crates: (S.crates || []).map((p) => new Crate(this, p)),
      chests: (S.chests || []).map((s) => new Chest(this, s)),
      lanterns: (S.lanterns || []).map((s) => new Lantern(this, s)),
      bridge: S.plankBridge ? new PlankBridge(this, S.plankBridge) : null,
      gate: S.gate ? new Gate(this, S.gate) : null,
      campfire: S.campfire ? new Campfire(this, S.campfire) : null,
      owl: S.owl ? new Owl(this, S.owl) : null,
      nova: S.novaStar ? new NovaStar(this, S.novaStar) : null,
      npcs: (S.npcs || []).map((s) => new NPC(this, s)),
      rocket: S.rocket ? new Rocket(this, S.rocket) : null,
      extras: S.extras || [],                       // agua, impulsores, suelos de mercurio… (tienen update)
    };
    this.props.chests.forEach(c => this.see('chest', c.def.id));
    this.altarFragment = null;
    if (S.altar) {
      this.altarFragment = new Pickup(this, 'fragment', this.v3(...S.altar.pos), 0, { floating: true });
      this.pickups.push(this.altarFragment);
    }
    // polvo de estrella (Prismara): chispas sueltas que no vuelven a aparecer
    this.stardust = (S.stardust || []).map(p => { const k = new Pickup(this, 'spark', this.v3(...p), 4, { floating: true }); this.pickups.push(k); return k; });
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
    const places = this.world.places;
    if (P.get('t')) this.time = parseFloat(P.get('t')) || 0;
    if (DAY_TIMES[P.get('hora')] !== undefined) this.dayShift = (DAY_TIMES[P.get('hora')] - 0.05) * DAY_CYCLE - this.time;
    if (P.get('items')) for (const id of Object.keys(ITEMS)) if (ITEMS[id].rar < 4) this.addItem(id, true);
    if (P.get('arma')) { const [id, t] = P.get('arma').split(':'); if (ATTACKS[id]) this.equipAttack({ id, tier: parseInt(t || '0', 10) }, true); }
    if (P.get('poder') && POWERS[P.get('poder')]) this.equipPower(P.get('poder'), true);
    if (OUTFITS[P.get('traje')]) { this.outfits.owned.push(P.get('traje')); this.wearOutfit(P.get('traje')); }
    if (P.get('cofre')) {
      const ids = P.get('cofre') === 'todos' ? CHEST_LIST.map(c => c.id) : [P.get('cofre')];
      this.props.chests.forEach((c, i) => { const id = ids[i % ids.length]; if (CHESTS[id]) c.setType(id); });
    }
    const nf = parseInt(P.get('frag') || (P.get('jefe') ? String(this.world.gateNeed) : '0'), 10);
    if (nf > 0) {
      this.missions.discoverAll();
      for (const m of MISSIONS.filter(x => x.fragment).slice(0, nf)) this.missions.complete(m.id);
    }
    if (P.get('puente')) for (const c of this.props.crystals) c.activate();
    if (P.get('vencido')) this.markBossDone(true);
    const go = P.get('jefe') ? this.world.bossPlace : P.get('ir');
    if (go && places[go]) { this.player.teleport(places[go]); this.cam.target.copy(this.player.pos); }
    if (P.get('cam')) { const [y, p, d] = P.get('cam').split(',').map(Number); this.cam.yaw = y || 0; this.cam.pitch = p ?? 0.32; if (d) this.cam.want = this.cam.cur = d; }
    else if (go && this.world.placeYaw && this.world.placeYaw[go] !== undefined) this.cam.yaw = this.world.placeYaw[go];
    const slot = parseInt(P.get('perfil') || '0', 10);
    if (P.get('auto')) {
      this.start(false, !!P.get('llegada'));
      if (P.get('llegada')) this.arrive(true);
    }
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
    if (SCENE_IDS.includes(P.get('cine')) && this.state === 'play') {
      this.step(STEP, true);                               // coloca campanas, cajas y farolillos en su sitio
      this.cinema.play(P.get('cine'));
      if (P.get('cinet')) this.cinema.seek(parseFloat(P.get('cinet')) || 0);
    }
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
    $('btnContinue').onclick = () => this.continueAfterEnding();
    $('btnShopClose').onclick = () => this.closeShop();
    $('btnGalaxyClose').onclick = () => this.closeGalaxy();
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
    const sens = $('optSens'), auto = $('optAuto'), vib = $('optVib'), assist = $('optAssist'), music = $('optMusic');
    sens.value = this.settings.sens; auto.checked = this.settings.autofire; vib.checked = this.settings.vibration; assist.checked = this.settings.camAssist;
    music.value = this.settings.music;
    const save = () => {
      this.settings.sens = parseFloat(sens.value); this.settings.autofire = auto.checked;
      this.settings.vibration = vib.checked; this.settings.camAssist = assist.checked;
      this.settings.music = parseFloat(music.value);
      Audio.setMusicVolume(this.settings.music);
      store.set('ajustes', this.settings);
    };
    [sens, auto, vib, assist, music].forEach(el => { el.oninput = save; el.onchange = save; });
  }

  toggleMute() { Audio.setMuted(!Audio.muted); $('btnMute').textContent = Audio.muted ? '♪̸' : '♪'; }

  start(fromButton, quiet) {
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
    if (!quiet) this.welcome();
  }
  /* Rótulo y pistas al empezar a jugar (tras el prólogo, si lo hubo). */
  welcome() {
    const hub = REGIONS[this.world.hub];
    if (!this.loadedPos) this.hud.banner(hub.name, hub.sub);
    if (this.loadedPos) setTimeout(() => this.hud.toast('Partida de ' + this.profile.name + ' cargada'), 3800);
    const guide = this.world.guide ? NPCS[this.world.guide].name : 'la Abuela Lechuza';
    const talkedGuide = this.world.guide ? this.talked[this.world.guide] : this.owlDone;
    if (!talkedGuide && !this.params.get('ir') && !this.params.get('jefe')) setTimeout(() => this.hud.toast(this.k(`Habla con ${guide} (E) para empezar`, `Acércate a ${guide} y toca el botón ✋ para hablar`)), 2500);
  }

  /* ---------- historia: escenas animadas (ver js/cinema.js) ---------- */
  /* Pide una escena de la historia: se ve una sola vez y luego queda en Misiones → Historia. */
  playStory(id, then) {
    if (!this.storyOn || this.story.seen[id]) { if (then) then(); return; }
    this.storyQueue.push({ id, then });
  }
  replayStory(id) {
    if (this.state !== 'menu' && this.state !== 'play') return;
    this.closeMenu();
    this.cinema.play(id);
  }

  /* ---------- perfiles y guardado (ver js/save.js) ---------- */
  /* Entra al juego con una ranura: carga su partida o, si está vacía, crea el perfil.
   * Es el ÚNICO lugar donde nace una partida nueva (el menú del juego no tiene "partida nueva"). */
  playSlot(n, name, fromButton) {
    if (this.state !== 'title' || !SLOTS.includes(n)) return;
    let d = Profiles.read(n);
    if (!d) { d = Profiles.blank(name); Profiles.write(n, d); }
    const target = WORLDS[d.world] ? d.world : 'islas';
    if (target !== this.world.id) { this.travelReload({ slot: n, world: target }); return; }   // el perfil está en otro mundo
    this.slot = n;
    restore(this, d);
    store.set('ultimoMundo', this.world.id);
    this.storyOn = this.params.get('cine') !== '0';
    const arriving = !!(this.travel && this.travel.arrive);
    const intro = this.storyOn && !arriving && this.world.id === 'islas' && !this.story.seen.prologo;
    this.start(fromButton, intro || arriving);
    if (intro) {
      this.step(STEP, true);                               // coloca campanas, cajas y farolillos en su sitio
      this.cinema.play('prologo', () => this.welcome());
    } else if (arriving) this.arrive();
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
  /* Recién llegada en el cohete: Pip sale junto al cohete y se ve la escena de llegada. */
  arrive(test) {
    const S = this.spots;
    if (S.rocketExit) { this.player.teleport(S.rocketExit); this.player.lastSafe.copy(this.player.pos); this.cam.target.copy(this.player.pos); }
    if (S.rocketExitYaw !== undefined) this.cam.yaw = S.rocketExitYaw;
    this.loadedPos = false;
    this.step(STEP, true);
    const first = 'llegada_' + this.world.id;
    const sid = this.story.seen[first] || test === 'corta' ? 'aterrizaje' : first;
    if (!this.cinema.play(sid, () => this.welcome())) this.welcome();
  }
  saveAndQuit() {
    this.saveNow(true);
    this.slot = 0;                       // nada más que guardar mientras la página se recarga
    try { sessionStorage.setItem('starnova.perfiles', '1'); } catch (e) { /* sin almacenamiento */ }
    location.reload();
  }

  /* ---------- trajes (ver js/entities/outfits.js) ---------- */
  wearOutfit(id) {
    if (id && !this.outfits.owned.includes(id)) return;
    this.outfits.on = OUTFITS[id] ? id : null;
    applyOutfit(this.player.model, this.outfits.on);
    this.saveNow(true);
  }
  buyOutfit(id) {
    const o = OUTFITS[id];
    if (!o || this.outfits.owned.includes(id) || this.sparks < o.price) return false;
    if (o.shop && !(this.state === 'tienda' && this.shopNpc === o.shop)) return false;      // ropa exclusiva: solo en su tienda
    this.sparks -= o.price;
    this.outfits.owned.push(id);
    this.wearOutfit(id);
    return true;
  }

  /* ---------- menú por páginas (pausa el juego) ---------- */
  openMenu(tab) {
    if (this.state !== 'play' && this.state !== 'menu') return;
    if (tab === 'historia') { this.hud.missionTab = 'historia'; tab = 'misiones'; }
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
    if (this.state === 'cine') { this.cinema.finish(true); return 'saltar'; }
    if (this.state === 'tienda') { this.closeShop(); return 'cerrar'; }
    if (this.state === 'galaxia') { this.closeGalaxy(); return 'cerrar'; }
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

  vibrate(ms) { if (this.settings.vibration && this.touch && navigator.vibrate && !(navigator.userActivation && !navigator.userActivation.hasBeenActive)) { try { navigator.vibrate(ms); } catch (e) { /* sin vibración */ } } }

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
    // las invocadas (Campana Oscura, jefe) no dan chispas ni objetos: si no, serían una fuente infinita
    const sparks = e.summoned ? 0 : e.def.sparks * this.stats.sparkMul * (0.8 + 0.4 * this.diffCoef()) * mult;
    const ns = sparks > 0 ? Math.min(e.isBoss ? 24 : 6, Math.max(1, Math.round(sparks / 4))) : 0;
    for (let i = 0; i < ns; i++) this.pickups.push(new Pickup(this, 'spark', c, sparks / ns));
    const nx = e.isBoss ? 20 : e.summoned ? 1 : 3;
    for (let i = 0; i < nx; i++) this.pickups.push(new Pickup(this, 'xp', c, e.def.xp * mult * (e.summoned ? 0.3 : 1) / nx));
    if (!e.summoned && Math.random() < 0.07) this.pickups.push(new Pickup(this, 'heal', c, 1));
    if (this.stats.healOnKill) this.heal(this.stats.healOnKill, true);
    if (!e.summoned && (e.def.ai === 'golem' || (el && Math.random() < 0.35) || (e.type === 'totem' && Math.random() < 0.2))) this.dropItem(c, e.def.ai === 'golem' ? [0, 30, 45, 22, 3, 0] : [50, 40, 10, 0, 0, 0]);
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
  splash() {
    const pl = this.player;
    this.fx.burst(pl.center, '#bfe8ff', 26, 4, 0.16, 0.8);
    Audio.play('swipe');
    pl.teleport(pl.lastSafe);
    this.cam.target.copy(pl.pos);
    this.hud.toast('¡Splash! Pip no sabe nadar: vuelve a la orilla');
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
      const W = this.world, P = this.props, n = this.missions.fragments();
      this.sparks += 40;
      this.hud.toast(`Fragmento de ${W.star} obtenido (${n}/${W.fragSlots})`);
      this.fx.burst(this.player.center, '#fff0b0', 40, 5, 0.2, 1.2);
      if (P.gate) P.gate.setLights(Math.min(W.gateNeed, n));
      if (P.nova) P.nova.setLit(n / W.fragSlots * 0.5);
      setTimeout(() => this.playStory(W.scenes.memory + n), 1600);
      if (n >= W.gateNeed && P.gate && !P.gate.open) {
        P.gate.openGate();
        setTimeout(() => this.hud.toast(W.texts.gateOpen), 1500);
        if (this.missions.state[W.finalMission]) this.missions.state[W.finalMission].discovered = true;
        setTimeout(() => this.playStory(W.scenes.gate), 1700);
      }
    }
  }

  /* ---------- jefe final de cada mundo (ver js/entities/bosses.js) ---------- */
  startBoss() {
    if (this.boss) return;
    const a = this.spots.arena;
    this.boss = new Boss(this, this.v3(a.c[0], a.y || 0.3, a.c[1] + 2), BOSSES[this.world.boss]);
    this.enemies.push(this.boss);
    this.hud.banner(this.world.texts.bossName, this.world.texts.bossSub);
    this.playStory(this.world.scenes.boss);
  }
  /* El jefe quedó vencido (al pelear o al cargar la partida): la estrella despierta y se puede viajar. */
  markBossDone(quiet) {
    this.bossDone = true;
    const P = this.props;
    if (P.nova) { if (quiet) P.nova.awake = 12; else P.nova.wake(); }
    if (this.world.afterBossNight) this.sky.extraNight = 1;
    if (P.rocket) P.rocket.setReady(true);
  }
  bossDefeated() {
    this.markBossDone(false);
    this.missions.event('boss');
    // premio: un cofre Nova aparece en la arena
    const a = this.spots.arena;
    const ch = new Chest(this, { pos: [a.c[0] + 3, a.y || 0.6, a.c[1] - 2], region: this.world.bossRegion, type: 'nova' });
    this.props.chests.push(ch);
    this.saveSoon();
    const fin = this.world.scenes.final;
    if (this.storyOn && !this.story.seen[fin]) setTimeout(() => this.playStory(fin, () => this.showEnding()), 2600);
    else setTimeout(() => this.showEnding(), 6500);
  }
  showEnding() {
    this.state = 'ending';
    this.input.enabled = false;
    if (document.exitPointerLock) document.exitPointerLock();
    const T = this.world.texts, s = Math.floor(this.time);
    $('ending').querySelector('.kicker').textContent = T.endKicker;
    $('ending').querySelector('h2').textContent = T.endTitle;
    $('endStats').innerHTML = `Tiempo: ${Math.floor(s / 60)} min ${s % 60} s · Nivel ${this.level} · ${this.kills} sombras · ${Object.values(this.items).reduce((a, b) => a + b, 0)} objetos<br>${T.endText}`;
    $('ending').classList.remove('hidden');
  }
  /* Al cerrar la pantalla final: seguir explorando (y, en las Islas, Brío destapa el cohete). */
  continueAfterEnding() {
    $('ending').classList.add('hidden');
    this.state = 'play';
    this.input.enabled = true;
    this.saveSoon();
    const next = WORLD_ORDER[WORLD_ORDER.indexOf(this.world.id) + 1];
    if (this.world.scenes.rocket) this.playStory(this.world.scenes.rocket, () => this.hud.toast(next ? 'El Cohete Avellana te espera: súbete para viajar a otra galaxia' : ''));
  }

  /* ---------- interacción: cofres, PNJ, lechuza y cohete ---------- */
  nearestInteractable() {
    const p = this.player.pos, P = this.props;
    let best = null, bd = 1.8;
    for (const c of P.chests) {
      if (c.opened) continue;
      const d = c.p.distanceTo(p);
      if (d < bd) { bd = d; best = { type: 'chest', obj: c }; }
    }
    for (const n of P.npcs) {
      const d = Math.hypot(n.p.x - p.x, n.p.z - p.z);
      if (d < 2.2 && d < bd + 0.4) { bd = d; best = { type: 'npc', obj: n }; }
    }
    if (P.owl && Math.hypot(P.owl.p.x - p.x, P.owl.p.z - p.z) < 2.3) best = { type: 'owl' };
    if (P.rocket && P.rocket.ready && Math.hypot(P.rocket.p.x - p.x, P.rocket.p.z - p.z) < 3.2) best = { type: 'rocket' };
    return best;
  }
  interactLabel(it) {
    if (it.type === 'chest') return ['Abrir: ' + it.obj.label(), 'Abrir'];
    if (it.type === 'owl') return ['Hablar con la Abuela Lechuza', 'Hablar'];
    if (it.type === 'rocket') return ['Subir al Cohete Avellana', 'Subir'];
    const d = it.obj.def;
    return [d.shop ? `Tienda de ${d.name}` : `Hablar con ${d.name}`, d.shop ? 'Tienda' : 'Hablar'];
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
      // la primera charla enseña a jugar; después la lechuza cuenta más de la historia según el avance
      const first = !this.owlDone;
      const lines = first ? OWL_INTRO : owlLines(this.missions.fragments(), !!(this.props.gate && this.props.gate.open), !!this.bossDone);
      this.openDialog('Abuela Lechuza', lines, () => {
        this.owlDone = true;
        this.missions.discoverAll();
        this.saveSoon();
        // el jugador elige qué misión hacer primero
        if (first || !this.missions.tracked) setTimeout(() => this.openJournal(true, 'misiones'), 300);
      });
    } else if (it.type === 'npc') {
      const n = it.obj, d = n.def;
      this.openDialog(`${d.name}, ${d.title}`, d.lines(this), () => {
        const first = !this.talked[n.id];
        this.talked[n.id] = 1;
        // el guía de cada mundo cuenta las misiones: al terminar de hablar se descubren
        if (this.world.guide === n.id) {
          this.missions.discoverAll();
          if (first || !this.missions.tracked) setTimeout(() => this.openJournal(true, 'misiones'), 300);
        }
        if (d.shop) setTimeout(() => this.openShop(n.id), 150);
        this.saveSoon();
      });
    } else if (it.type === 'rocket') {
      this.openGalaxy();
    }
  }
  /* Diálogo genérico: quién habla, sus frases y qué pasa al terminar. */
  openDialog(who, lines, after) {
    this.dialog = { who, lines, i: 0, after };
    this.state = 'dialog';
    $('dialog').classList.remove('hidden');
    $('dialog').querySelector('.who').textContent = who;
    $('dialog').querySelector('.text').textContent = lines[0];
    $('dialog').querySelector('.hint').textContent = this.k('Haz clic o pulsa E para continuar', 'Toca para continuar');
    Audio.play('select');
  }
  advanceDialog() {
    const D = this.dialog;
    if (!D) return;
    D.i++;
    if (D.i >= D.lines.length) {
      $('dialog').classList.add('hidden');
      this.state = 'play';
      this.dialog = null;
      if (D.after) D.after();
      return;
    }
    $('dialog').querySelector('.text').textContent = D.lines[D.i];
    Audio.play('select');
  }

  /* ---------- tienda de un PNJ (ropa que solo se vende en su mundo) ---------- */
  openShop(npcId) {
    if (this.state !== 'play') return;
    this.state = 'tienda';
    this.shopNpc = npcId;
    if (document.exitPointerLock) document.exitPointerLock();
    $('shop').classList.remove('hidden');
    this.menus.renderShop(npcId);
  }
  closeShop() {
    if (this.state !== 'tienda') return;
    $('shop').classList.add('hidden');
    this.state = 'play';
    this.shopNpc = null;
  }

  /* ---------- mapa galáctico y viajes (ver js/worlds/) ---------- */
  /* ¿Se puede viajar a este mundo? (hay que haber terminado el anterior) */
  canTravel(id) {
    const prev = previousWorld(id);
    return !prev || doneWorlds(this).includes(prev);
  }
  openGalaxy() {
    if (this.state !== 'play') return;
    this.state = 'galaxia';
    if (document.exitPointerLock) document.exitPointerLock();
    $('galaxy').classList.remove('hidden');
    this.menus.renderGalaxy();
  }
  closeGalaxy() {
    if (this.state !== 'galaxia') return;
    $('galaxy').classList.add('hidden');
    this.state = 'play';
  }
  /* Viaje: escena de despegue en este mundo → se guarda → la página se recarga en el mundo de destino. */
  travelTo(dest) {
    if (!WORLDS[dest] || dest === this.world.id || !this.canTravel(dest)) return;
    this.closeGalaxy();
    const go = () => {
      if (this.slot) {
        this.saveNow(true);
        const d = Profiles.read(this.slot);
        if (d) { d.world = dest; Profiles.write(this.slot, d); }
      }
      this.slot = 0;                                   // nada más que guardar mientras la página se recarga
      this.travelReload({ slot: this.slot0 || 0, world: dest, arrive: true });
    };
    this.slot0 = this.slot;
    if (!this.cinema.play('viaje_' + dest, go, { dest })) go();
  }
  /* Recarga la página en otro mundo (con la ranura que hay que cargar al llegar). */
  travelReload(info) {
    try { sessionStorage.setItem('starnova.viaje', JSON.stringify(info)); } catch (e) { /* sin almacenamiento */ }
    const w = WORLDS[info.world];
    const ld = document.getElementById('loading');
    if (!ld) {
      const div = document.createElement('div');
      div.id = 'loading'; div.className = 'loading';
      div.innerHTML = '<div class="spinner"></div><div id="loadingText"></div>';
      document.getElementById('app').append(div);
    }
    document.getElementById('loadingText').textContent = info.arrive ? `Viajando a la ${w.galaxy}…` : `Cargando ${w.name}…`;
    if (!info.slot) {                                    // partida de prueba: se viaja con la URL
      const q = new URLSearchParams();
      if (this.params.get('ojos')) q.set('ojos', '1');
      q.set('auto', '1'); q.set('mundo', info.world);
      if (info.arrive) q.set('llegada', '1');
      setTimeout(() => { location.href = 'index.html?' + q; }, 60);
      return;
    }
    setTimeout(() => location.reload(), 60);
  }

  /* ---------- director de enemigos: oleadas por región (dificultad que crece con el tiempo) ----------
   * Cada región con sombras (Coral, Menta, Lavanda) tiene una reserva para su ola. Al gastarse ('fin'), y cuando caen
   * sus últimas sombras, la región queda en calma WAVE_CALM segundos; después llega otra ola, más fuerte según el reloj.
   * Así las sombras no son infinitas y no se pueden juntar chispas sin fin en un mismo sitio. */
  waveSize(c = this.diffCoef()) { return Math.round(48 * (1 + 0.3 * (c - 1))); }
  updateWaves(dt) {
    for (const id in this.waves) {
      const W = this.waves[id], here = this.region === id, name = REGIONS[id].name;
      if (W.state === 'fin') {
        W.wait += dt;
        if (W.wait > WAVE_WAIT || !this.enemies.some(e => !e.dead && e.zone === id)) {
          W.state = 'calma'; W.calm = WAVE_CALM;
          if (here) { this.hud.toast(`${name} queda en calma… por ahora`); Audio.play('calma'); }
        }
      } else if (W.state === 'calma') {
        W.calm -= dt;
        if (W.calm <= 0) {
          W.state = 'ola'; W.calm = 0; W.pool = this.waveSize();
          if (here) { this.hud.toast(`Las sombras vuelven a ${name}`); Audio.play('oleada'); }
        }
      }
    }
  }
  runDirector(dt) {
    const D = this.director;
    this.updateWaves(dt);
    D.t -= dt;
    const zone = this.spots.spawnZones.find(z => z.region === this.region);
    const W = zone && this.waves[zone.region];
    if (!W || W.state !== 'ola') return;
    const c = this.diffCoef();
    D.credits = Math.min(40, D.credits + dt * (0.9 + 0.5 * c));
    if (D.t > 0 || this.time < 12) return;
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
      for (let i = 0; i < n; i++) this.spawnEnemy(def.id, this.v3(hit.point.x + (i ? (Math.random() - 0.5) * 2 : 0), hit.point.y + (def.flying ? 2.5 : 0.05), hit.point.z + (i ? (Math.random() - 0.5) * 2 : 0)), { elite: i === 0 ? elite : null, zone: zone.region });
      const spent = def.cost * n * (elite ? 2.5 : 1);
      D.credits -= spent;
      W.pool -= spent;
      if (W.pool <= 0) { W.pool = 0; W.state = 'fin'; W.wait = 0; }        // ya no vienen más: quedan las que hay
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

    if (inp.pressed.pause) {
      if (this.state === 'menu') this.closeMenu();
      else if (this.state === 'tienda') this.closeShop();
      else if (this.state === 'galaxia') this.closeGalaxy();
      else this.openMenu('sistema');
    }
    else if (inp.pressed.journal) { if (this.state === 'menu') this.closeMenu(); else this.openMenu(); }
    if (inp.pressed.mute) this.toggleMute();
    if (this.state === 'dialog' && (inp.pressed.interact || inp.pressed.jump)) this.advanceDialog();

    // sensibilidad y cámara que acompaña al moverse (táctil)
    inp.lookDX *= this.settings.sens; inp.lookDY *= this.settings.sens;
    if (this.state === 'play' && this.touch && this.settings.camAssist && inp.lookTouch.id === null && Math.abs(inp.mx) > 0.25) inp.lookDX += inp.mx * 1.1 * dt;

    // escenas de la historia en espera: empiezan cuando Pip pisa el suelo
    if (this.state === 'play' && this.storyQueue.length && this.player.grounded && !this.cinema.playing) {
      const s = this.storyQueue.shift();
      this.cinema.play(s.id, s.then);
    }
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
    this.music.update(dt);
    if (this.state === 'cine') this.cinema.update(dt, t);
    else this.cam.update(dt, (this.state === 'play' || this.state === 'title') ? inp : { lookDX: 0, lookDY: 0, zoom: 0 }, focus, t);
    // haz arcoíris (necesita la cámara ya actualizada)
    const beamOn = this.state === 'play' && this.arsenal.def.kind === 'beam' && (inp.held.primary || (this.touch && this.settings.autofire && this.autoTarget));
    this.arsenal.updateBeam(dt, beamOn, this.player.muzzle, beamOn ? (inp.held.primary ? this.aimPoint() : this.autoTarget.center()) : null);
    this.fx.update(dt);
    this.sky.update(dt, this.camera.position, t);
    this.scene.fog.color.copy(this.sky.fogColor);
    this.updateDay();
    this.hemi.color.copy(this.sky.u.hor.value).lerp(WHITE, 0.35);
    this.sun.intensity = 2.1 * (1 - this.sky.night * 0.5);
    this.hemi.intensity = 1.05 * (1 - this.sky.night * 0.22);
    this.sun.color.copy(SUN_DAY).lerp(SUN_NIGHT, this.sky.night * 0.7);           // de noche, luz de luna
    this.sun.position.copy(this.player.pos).add(this.sunOffset);
    this.sun.target.position.copy(this.player.pos);
    this.player.animate(dt, t);
    if (this.state === 'menu' && this.menuTab === 'trajes') this.menus.wardrobeFrame(dt);
    else if (this.state === 'tienda') this.menus.shopFrame(dt);
    this.renderer.render(this.scene, this.camera);
    if (this.state !== 'title' && this.state !== 'cine') { this.hud.update(dt); this.hud.draw(this.camera, dt); }
    inp.consume();
  }

  /* ---------- ciclo de día y noche (ver sky.js) ---------- */
  updateDay() {
    const ph = dayPhase(this.time, this.dayShift || 0);
    this.sky.cycleNight = nightOf(ph);
    this.sky.cycleDusk = duskOf(ph);
    const night = this.sky.cycleNight > 0.5;
    if (this.isNight !== undefined && night !== this.isNight && this.state === 'play') {
      this.hud.toast(night ? 'Cae la noche sobre las islas' : 'Amanece en las islas');
      Audio.play(night ? 'anochecer' : 'amanecer');
    }
    if (night !== this.isNight) document.body.classList.toggle('is-night', night || this.region === 'nova');
    this.isNight = night;
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
    if (this.props.campfire && pl.pos.distanceTo(this.props.campfire.p) < 2.6) this.hp = Math.min(st.maxHp, this.hp + st.maxHp * 0.12 * dt);
    // agua honda (lagos y ríos): Pip no sabe nadar y vuelve a la orilla
    if (this.spots.inWater && this.spots.inWater(pl.pos)) this.splash();

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
    if (P.bridge) P.bridge.update(dt);
    if (P.gate) P.gate.update(dt);
    if (P.campfire) P.campfire.update(dt, this.time);
    if (P.owl) P.owl.update(dt, this.time);
    if (P.nova) P.nova.update(dt, this.time);
    for (const n of P.npcs) n.update(dt, this.time);
    if (P.rocket) P.rocket.update(dt, this.time);
    for (const x of P.extras) x.update(dt, this.time);
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
      document.body.classList.toggle('is-night', !!this.isNight || reg === 'nova');
      this.hud.banner(REGIONS[reg].name, REGIONS[reg].sub);
      if (reg !== 'claro') this.missions.discover(reg);
      this.missions.event('region', reg);
    }
    // jefe
    const ar = this.spots.arena;
    if (ar && P.gate && P.gate.open && !this.boss && !this.bossDone && Math.hypot(pl.pos.x - ar.c[0], pl.pos.z - ar.c[1]) < (ar.trigger || 13)) this.startBoss();

    // guardado automático (solo con los pies en el suelo)
    this.saveT += dt;
    if (this.saveT >= AUTOSAVE && pl.grounded) this.saveNow();

    // interacción
    const it = this.nearestInteractable();
    if (it) {
      const [what, btn] = this.interactLabel(it);
      this.hud.prompt(this.k('E · ' + what, what), btn);
      if (pressed.interact) this.interact(it);
    } else this.hud.prompt(null);
  }
}
