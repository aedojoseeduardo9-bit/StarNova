/* Star Nova — exportador "web → Godot".
 * Abre la versión web en Chromium y graba a archivos todo lo que la versión nativa reutiliza tal cual:
 *   godot/data/contenido.json  objetos, ataques, poderes, cofres, enemigos, élites, rarezas
 *   godot/data/historia.json   capítulos, recuerdos, lechuza, viajes
 *   godot/data/pnj.json        PNJ (con sus frases según el avance)
 *   godot/data/mundos.json     los 3 mundos: regiones, misiones, textos, lugares, música
 *   godot/data/modelos.json    modelos 3D (enemigos, jefes, PNJ, lechuza, cohete, cofres, trajes…) con su geometría exacta
 *   godot/data/mundo_<id>.json + .bin  la arquitectura ya construida de cada mundo (mallas, colisiones y puntos del mapa)
 *   godot/iconos/*.png         íconos (objetos, ataques, poderes, enemigos, glifos)
 *   godot/audio/*.ogg          música (cada canción en cada tono que usa el juego) y efectos de sonido
 * Uso: node godot/tools/exportar_web.cjs [partes]   partes: datos,modelos,mundos,iconos,audio (por defecto todas)
 * Necesita ffmpeg para los .ogg. */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('playwright-core')); }

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'godot');
const PARTS = (process.argv[2] || 'datos,modelos,mundos,iconos,audio').split(',');
const W = (f, data) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); console.log('  →', path.relative(ROOT, f), (fs.statSync(f).size / 1024).toFixed(0) + ' KB'); };

/* Serializador de objetos de three.js (se inyecta en la página). */
const SER = `
window.__ser = (() => {
  const geos = {}, mats = {};
  const r4 = (v) => Math.round(v * 10000) / 10000;
  function geo(g) {
    if (!geos[g.uuid]) {
      const ni = g.index ? g.toNonIndexed() : g;
      if (!ni.attributes.normal) ni.computeVertexNormals();
      geos[g.uuid] = { p: Array.from(ni.attributes.position.array, r4), n: Array.from(ni.attributes.normal.array, (v) => Math.round(v * 1000) / 1000) };
    }
    return g.uuid;
  }
  function mat(m) {
    const k = m.uuid;
    if (!mats[k]) {
      mats[k] = {
        c: m.color ? m.color.getHexString() : 'ffffff', e: m.emissive ? m.emissive.getHexString() : '000000', ei: m.emissiveIntensity ?? 1,
        b: !!m.isMeshBasicMaterial, o: m.opacity, tr: !!m.transparent, f: m.flatShading !== false && !m.isMeshBasicMaterial,
        add: m.blending === 2, dw: m.depthWrite !== false, ds: m.side === 2, fog: m.fog !== false,
      };
    }
    return k;
  }
  function node(o) {
    const n = { p: o.position.toArray().map(r4), q: o.quaternion.toArray().map(r4), s: o.scale.toArray().map(r4) };
    if (!o.visible) n.v = 0;
    if (o.isMesh) { n.g = geo(o.geometry); n.m = mat(Array.isArray(o.material) ? o.material[0] : o.material); if (!o.castShadow) n.ns = 1; }
    if (o.children.length) n.c = o.children.filter(x => x.isMesh || x.isGroup || x.type === 'Object3D').map(node);
    return n;
  }
  function pathOf(root, obj) {
    const p = []; let x = obj;
    while (x && x !== root) { const par = x.parent; if (!par) return null; p.unshift(par.children.filter(y => y.isMesh || y.isGroup || y.type === 'Object3D').indexOf(x)); x = par; }
    return x === root ? p : null;
  }
  function refs(root, src) {
    const u = {};
    for (const k in src) {
      const v = src[k];
      if (v && v.isObject3D) { const p = pathOf(root, v); if (p) u[k] = { ref: p }; }
      else if (Array.isArray(v) && v.length && v[0] && v[0].isObject3D) u[k] = { refs: v.map(x => pathOf(root, x)) };
      else if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') u[k] = v;
      else if (Array.isArray(v) && v.every(x => typeof x === 'number')) u[k] = v;
    }
    return u;
  }
  function model(root, extra) { return { tree: node(root), user: refs(root, Object.assign({}, root.userData, extra || {})) }; }
  return { geo, mat, node, model, refs, pathOf, dump: () => ({ geos, mats }) };
})();
`;

async function main() {
  const { serve } = await import(path.join(ROOT, 'tools', 'serve.mjs'));
  const server = await serve(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('  [error de página]', e.message));
  await page.goto(`${base}/godot/tools/exportar.html`);
  await page.addScriptTag({ content: SER });

  if (PARTS.includes('datos')) {
    console.log('Datos…');
    const d = await page.evaluate(async () => {
      const it = await import('/js/content/items.js'), at = await import('/js/content/attacks.js'), ch = await import('/js/content/chests.js');
      const en = await import('/js/content/enemies.js'), ic = await import('/js/content/icons.js'), st = await import('/js/content/story.js');
      const np = await import('/js/content/npcs.js');
      const contenido = {
        rarity: ic.RARITY, items: it.ITEM_LIST, attacks: at.ATTACK_LIST, powers: at.POWER_LIST,
        chests: ch.CHEST_LIST, ranks: ch.RANKS, rank_colors: ch.RANK_COLORS, enemies: en.ENEMY_LIST, elites: en.ELITE_LIST,
        glyphs: ic.GLYPH_NAMES,
      };
      const owl = {};
      for (const [k, a] of Object.entries({ base: [0, false, false], f1: [1, false, false], f2: [2, false, false], porton: [3, true, false], vencido: [3, true, true] })) owl[k] = st.owlLines(...a);
      const historia = { chapters: st.CHAPTERS, memories: st.MEMORIES, owl_intro: st.OWL_INTRO, owl, memories_gemini: st.MEMORIES_GEMINI, memories_soledad: st.MEMORIES_SOLEDAD, travel: st.TRAVEL_LINES };
      const mock = (frags, gate, done) => ({ bossDone: done, props: { gate: { open: gate } }, missions: { fragments: () => frags } });
      const pnj = {};
      for (const [id, n] of Object.entries(np.NPCS)) {
        const o = Object.assign({}, n); delete o.lines;
        o.lines = {};
        for (const [k, a] of Object.entries({ base: [0, false, false], f1: [1, false, false], f2: [2, false, false], porton: [3, true, false], vencido: [3, true, true] })) o.lines[k] = n.lines(mock(...a));
        pnj[id] = o;
      }
      // mundos
      const wi = await import('/js/worlds/index.js');
      const mundos = { order: wi.WORLD_ORDER, worlds: {} };
      for (const id of wi.WORLD_ORDER) {
        const w = wi.WORLDS[id], o = {};
        for (const k of ['id', 'order', 'name', 'galaxy', 'star', 'blurb', 'color', 'color2', 'regions', 'hub', 'bossRegion', 'guide', 'afterBossNight', 'fragSlots', 'gateNeed', 'finalMission', 'boss', 'music', 'sky', 'links', 'bridgeRegion', 'scenes', 'texts', 'gateLines', 'bossLines', 'places', 'placeYaw', 'bossPlace']) if (w[k] !== undefined) o[k] = w[k];
        o.missions = w.missions.map(m => {
          const x = {};
          for (const k of ['id', 'type', 'region', 'title', 'desc', 'goal', 'fragment', 'final', 'reward', 'visit']) if (m[k] !== undefined) x[k] = m[k];
          x.on = Object.fromEntries(Object.entries(m.on || {}).map(([k, v]) => [k, v === true ? true : String(v)]));
          return x;
        });
        mundos.worlds[id] = o;
      }
      const bosses = (await import('/js/entities/bosses.js')).BOSSES;
      const jefes = {};
      for (const [id, b] of Object.entries(bosses)) { const o = {}; for (const k in b) if (typeof b[k] !== 'function') o[k] = b[k]; jefes[id] = o; }
      mundos.bosses = jefes;
      const outfits = await import('/js/entities/outfits.js');
      return { contenido, historia, pnj, mundos, outfitsBase: outfits.OUTFIT_LIST.map(o => ({ id: o.id, name: o.name, price: o.price, desc: o.desc, colors: o.colors, hideScarf: o.hideScarf, shop: o.shop })) };
    });
    W(path.join(OUT, 'data/contenido.json'), JSON.stringify(d.contenido));
    W(path.join(OUT, 'data/historia.json'), JSON.stringify(d.historia));
    W(path.join(OUT, 'data/pnj.json'), JSON.stringify(d.pnj));
    W(path.join(OUT, 'data/mundos.json'), JSON.stringify(d.mundos));
    W(path.join(OUT, 'data/trajes_lista.json'), JSON.stringify(d.outfitsBase));
  }

  if (PARTS.includes('modelos')) {
    console.log('Modelos…');
    const m = await page.evaluate(async () => {
      const THREE = await import('three');
      const R = (await import('rapier')).default; await R.init();
      const S = window.__ser;
      const models = {};
      const em = await import('/js/entities/enemyModels.js'), en = await import('/js/content/enemies.js');
      for (const def of en.ENEMY_LIST) models['enemigo_' + def.id] = S.model(em.makeEnemyModel(def, null));
      const mo = await import('/js/entities/models.js');
      models.lechuza = S.model(mo.makeOwl());
      models.guardian = S.model(mo.makeGuardian());
      const bo = await import('/js/entities/bosses.js');
      models.gemelos = S.model(bo.makeGemelos());
      models.polilla = S.model(bo.makePolilla());
      const np = await import('/js/entities/npcs.js'), npd = await import('/js/content/npcs.js');
      for (const [id, def] of Object.entries(npd.NPCS)) models['pnj_' + id] = S.model(np.makeNpcModel(def));
      models.cohete = S.model(np.makeRocket());
      // utilería: se construye con un "juego" de mentira y se graba lo que añade a la escena
      const props = await import('/js/props.js'), chests = await import('/js/content/chests.js');
      const fake = () => {
        const scene = new THREE.Scene();
        const coll = { handle: 0, setTranslation() {}, setRotation() {}, translation: () => ({ x: 0, y: 0, z: 0 }), rotation: () => ({ x: 0, y: 0, z: 0, w: 1 }) };
        const body = Object.assign({ setNextKinematicTranslation() {}, setTranslation() {}, translation: () => ({ x: 0, y: 0, z: 0 }), rotation: () => ({ x: 0, y: 0, z: 0, w: 1 }), numColliders: () => 0, applyImpulse() {}, linvel: () => ({ x: 0, y: 0, z: 0 }) }, coll);
        const world = { createCollider: () => coll, createRigidBody: () => body, createImpulseJoint: () => ({}), removeRigidBody() {} };
        return { scene, phys: { world, fixed: body, own() {}, removeBody() {} }, progress: () => 0, stats: { luck: 0 }, fx: new Proxy({}, { get: () => () => {} }), missions: { event() {} }, hud: new Proxy({}, { get: () => () => {} }), v3: (x, y, z) => new THREE.Vector3(x, y, z) };
      };
      const grab = (g, extra) => { const root = new THREE.Group(); for (const o of [...g.scene.children]) root.add(o); return S.model(root, extra); };
      for (const c of chests.CHEST_LIST) {
        const g = fake(); const ch = new props.Chest(g, { pos: [0, 0, 0], ry: 0, type: c.id });
        ch.mesh.position.set(0, 0, 0); ch.mesh.rotation.y = 0; ch.mesh.scale.setScalar(1);
        models['cofre_' + c.id] = S.model(ch.mesh, { lid: ch.lid, ring: ch.ring, halo: ch.halo });
      }
      { const g = fake(); const b = new props.Bell(g, { anchor: [0, 0, 0], freq: 660 }, 0); models.campana = grab(g, { bell: b.mesh, rope: b.rope }); }
      { const g = fake(); const b = new props.Crystal(g, { pos: [0, 0, 0] }, 0); models.cristal = grab(g, { crystal: b.mesh }); }
      { const g = fake(); const b = new props.Firefly(g, { pos: [0, 0, 0] }, 0); models.luciernaga = grab(g, { fly: b.mesh }); }
      { const g = fake(); const b = new props.Firefly(g, { pos: [0, 0, 0], kind: 'semilla', color: '#fff6a0' }, 0); models.semilla = grab(g, { fly: b.mesh }); }
      { const g = fake(); const b = new props.Gate(g, { pos: [0, 0, 0], w: 3.2, h: 4.4, d: 0.8 }); models.porton = grab(g, { gate: b.mesh }); }
      { const g = fake(); const b = new props.Owl(g, [0, 0, 0]); models.lechuza_prop = grab(g, { owl: b.mesh }); }
      { const g = fake(); const b = new props.NovaStar(g, [0, 0, 0]); models.estrella = grab(g, { star: b.mesh }); }
      // trajes: piezas que se cuelgan del esqueleto de Pip
      const outfits = await import('/js/entities/outfits.js');
      const trajes = {};
      for (const o of outfits.OUTFIT_LIST) {
        const parts = [];
        if (o.build) o.build((slot, mesh) => parts.push({ slot, node: S.node(mesh) }));
        trajes[o.id] = parts;
      }
      return { models, trajes, ...S.dump() };
    });
    W(path.join(OUT, 'data/modelos.json'), JSON.stringify(m));
  }

  if (PARTS.includes('mundos')) {
    console.log('Mundos…');
    for (const id of ['islas', 'gemini', 'soledad']) {
      const p2 = await browser.newPage();
      p2.on('pageerror', (e) => console.log('  [error de página]', e.message));
      await p2.goto(`${base}/index.html?auto=1&mundo=${id}&ojos=1&hud=0`);
      await p2.waitForFunction(() => window.__starnova && window.__starnova.ready, null, { timeout: 90000 });
      await p2.waitForTimeout(800);
      const w = await p2.evaluate(async () => {
        const g = window.__starnova.game, THREE = await import('three');
        const { MAT } = await import('/js/world/builder.js');
        const meshes = [];
        const flt = (arr) => Array.from(arr, (v) => Math.round(v * 10000) / 10000);
        g.scene.traverse((o) => {
          if (!o.isMesh || !o.geometry.attributes.color) return;
          if (o.material !== MAT && !(o.material.vertexColors && o.material.isMeshLambertMaterial)) return;
          o.updateMatrixWorld(true);
          const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
          const ni = geo.index ? geo.toNonIndexed() : geo;
          meshes.push({ name: o.name || 'malla', p: flt(ni.attributes.position.array), c: Array.from(ni.attributes.color.array, (v) => Math.round(v * 1000) / 1000) });
        });
        // colisiones fijas (arquitectura y terreno)
        const ph = g.phys, R = (await import('rapier')).default;
        const fixedH = ph.fixed.handle, colliders = [];
        ph.world.forEachCollider((c) => {
          const par = c.parent();
          if (!par || par.handle !== fixedH) return;
          const grp = c.collisionGroups() >>> 16;
          if (!(grp & 1)) return;
          const t = c.translation(), r = c.rotation(), st = c.shapeType();
          const o = { t: [t.x, t.y, t.z], r: [r.x, r.y, r.z, r.w] };
          if (st === R.ShapeType.Cuboid) { const h = c.halfExtents(); o.box = [h.x, h.y, h.z]; }
          else if (st === R.ShapeType.ConvexPolyhedron) o.hull = flt(c.vertices());
          else if (st === R.ShapeType.TriMesh) { o.tri = flt(c.vertices()); o.idx = Array.from(c.indices()); }
          else if (st === R.ShapeType.Cylinder) o.cyl = [c.halfHeight(), c.radius()];
          else if (st === R.ShapeType.Ball) o.ball = c.radius();
          else return;
          colliders.push(o);
        });
        // puntos del mapa (sin funciones) y piezas animadas
        const S = g.spots, spots = {};
        for (const k in S) {
          if (typeof S[k] === 'function' || k === 'extras') continue;
          spots[k] = S[k] && S[k].isVector3 ? S[k].toArray() : S[k];
        }
        spots.extras = (S.extras || []).map((x) => {
          const name = x.constructor.name, o = { type: name };
          if (x.o) for (const k in x.o) if (typeof x.o[k] !== 'function') o[k] = x.o[k];
          if (name === 'Water') { x.mesh.updateMatrixWorld(true); const geo = x.mesh.geometry.clone().applyMatrix4(x.mesh.matrixWorld); const ni = geo.index ? geo.toNonIndexed() : geo; o.mesh = flt(ni.attributes.position.array); }
          if (name === 'Launcher') { o.from = x.p.toArray(); o.to = x.to; o.h = x.h; o.dur = x.dur; o.label = x.label; o.btn = x.btn; }
          if (name === 'Bouncer') { o.pos = x.p.toArray(); o.power = x.k; o.color = '#' + x.mesh.material.color.getHexString(); }
          return o;
        });
        return { meshes, colliders, spots };
      });
      // geometría grande en binario (float32), el resto en JSON
      const bins = [];
      let off = 0;
      const pack = (arr) => { const b = Buffer.from(new Float32Array(arr).buffer); bins.push(b); const r = { off, n: arr.length }; off += b.length; return r; };
      const packI = (arr) => { const b = Buffer.from(new Uint32Array(arr).buffer); bins.push(b); const r = { off, n: arr.length, u32: 1 }; off += b.length; return r; };
      for (const m of w.meshes) { m.p = pack(m.p); m.c = pack(m.c); }
      for (const c of w.colliders) { if (c.hull) c.hull = pack(c.hull); if (c.tri) { c.tri = pack(c.tri); c.idx = packI(c.idx); } }
      for (const x of w.spots.extras) if (x.mesh) x.mesh = pack(x.mesh);
      W(path.join(OUT, `data/mundo_${id}.json`), JSON.stringify({ meshes: w.meshes, colliders: w.colliders, spots: w.spots }));
      W(path.join(OUT, `data/mundo_${id}.bin`), Buffer.concat(bins));
      await p2.close();
    }
  }

  if (PARTS.includes('iconos')) {
    console.log('Íconos…');
    const icons = await page.evaluate(async () => {
      const ic = await import('/js/content/icons.js'), it = await import('/js/content/items.js'), at = await import('/js/content/attacks.js'), en = await import('/js/content/enemies.js');
      const cv = document.getElementById('c'), ctx = cv.getContext('2d'), out = {};
      const shot = (name, def, rar) => { ic.drawIcon(ctx, def, 128, rar); out[name] = cv.toDataURL('image/png'); };
      for (const i of it.ITEM_LIST) shot('obj_' + i.id, i, i.rar);
      for (const a of at.ATTACK_LIST) shot('atq_' + a.id, a, 0);
      for (const p of at.POWER_LIST) shot('pod_' + p.id, p, 0);
      for (const e of en.ENEMY_LIST) shot('ene_' + e.id, { glyph: 'eye', color: e.colors[0] }, 0);
      for (const g of ic.GLYPH_NAMES) shot('gli_' + g, { glyph: g, color: '#c98a4b' }, 0);
      return out;
    });
    for (const [k, v] of Object.entries(icons)) fs.writeFileSync(path.join(OUT, 'iconos', k + '.png'), Buffer.from(v.split(',')[1], 'base64'));
    console.log('  →', Object.keys(icons).length, 'íconos en godot/iconos/');
  }

  if (PARTS.includes('audio')) {
    console.log('Audio (música y efectos)…');
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'snaudio-'));
    const KEYS = { dia: [0, 2, -3, 5], bosque: [0, -2, 3, 5, -5], prisma: [0, 2, 7, 4, -3], noche: [0, 2, -3, 5, -2, 3, -5, 7, 4] };
    const songs = await page.evaluate(() => import('/js/audio.js').then(m => Object.keys(m.Audio.SCORES)));
    const jobs = [];
    for (const s of songs) for (const k of (KEYS[s] || [0])) jobs.push({ kind: 'song', s, k });
    const SFX = ['shoot', 'swipe', 'dash', 'special', 'jump', 'hit', 'hurt', 'kill', 'coin', 'xp', 'chest', 'item', 'level', 'firefly', 'crystal', 'mission', 'rumble', 'boss', 'select', 'deny', 'anochecer', 'amanecer', 'oleada', 'calma'];
    for (const s of SFX) jobs.push({ kind: 'sfx', s });
    for (const f of [660, 784, 880, 988, 1175, 1320]) jobs.push({ kind: 'sfx', s: 'bell', arg: f, name: 'bell_' + f });
    for (const job of jobs) {
      const wav = await page.evaluate(async (job) => {
        const { Audio } = await import('/js/audio.js');
        const RATE = 32000;
        const graph = (ctx) => {                                   // el mismo bus de la web: eco suave
          const master = ctx.createGain(); master.gain.value = 0.55;
          const delay = ctx.createDelay(1); delay.delayTime.value = 0.23;
          const fb = ctx.createGain(); fb.gain.value = 0.28;
          const wet = ctx.createGain(); wet.gain.value = 0.3;
          const bus = ctx.createGain();
          bus.connect(master); bus.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
          master.connect(ctx.destination);
          return bus;
        };
        if (job.kind === 'song') {
          const sc = Audio.SCORES[job.s], step = 60 / sc.bpm / 2, steps = sc.bars.length * 8, L = steps * step;
          const ctx = new OfflineAudioContext(2, Math.ceil((2 * L + 0.01) * RATE), RATE);
          const bus = graph(ctx);
          const g = ctx.createGain(); g.gain.value = 0.8; g.connect(bus);
          let t = 0;
          for (let i = 0; i < steps * 2; i++) t += Audio.scoreStep(ctx, g, sc, i, t, job.k);
          const buf = await ctx.startRendering();
          // un bucle perfecto: la segunda vuelta (ya trae el eco y las colas de la primera)
          const a = Math.round(L * RATE), b = Math.round(2 * L * RATE);
          const loop = new AudioBuffer({ length: b - a, numberOfChannels: 2, sampleRate: RATE });
          for (let c = 0; c < 2; c++) loop.copyToChannel(buf.getChannelData(c).subarray(a, b), c);
          // codificar por partes (cadenas largas)
          const n = loop.length, out = new Int16Array(n * 2), d0 = loop.getChannelData(0), d1 = loop.getChannelData(1);
          for (let i = 0; i < n; i++) { out[i * 2] = Math.max(-1, Math.min(1, d0[i])) * 32767; out[i * 2 + 1] = Math.max(-1, Math.min(1, d1[i])) * 32767; }
          const u8 = new Uint8Array(out.buffer); let str = '';
          for (let i = 0; i < u8.length; i += 0x8000) str += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
          return { b64: btoa(str), rate: RATE, ch: 2 };
        }
        const dur = ({ bell: 3, rumble: 2, mission: 1.8, anochecer: 2.4, amanecer: 2.2, oleada: 2.2, calma: 2.6, item: 1.2, level: 1.2, boss: 2 })[job.s] || 1.2;
        const ctx = new OfflineAudioContext(2, Math.ceil(dur * RATE), RATE);
        const bus = graph(ctx);
        Audio.ctx = ctx; Audio.bus = bus; Audio.muted = false;
        Audio.play(job.s, job.arg);
        const buf = await ctx.startRendering();
        Audio.ctx = null;
        const n = buf.length, out = new Int16Array(n * 2), d0 = buf.getChannelData(0), d1 = buf.getChannelData(1);
        for (let i = 0; i < n; i++) { out[i * 2] = Math.max(-1, Math.min(1, d0[i])) * 32767; out[i * 2 + 1] = Math.max(-1, Math.min(1, d1[i])) * 32767; }
        const u8 = new Uint8Array(out.buffer); let str = '';
        for (let i = 0; i < u8.length; i += 0x8000) str += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
        return { b64: btoa(str), rate: RATE, ch: 2 };
      }, job);
      const name = job.kind === 'song' ? `musica_${job.s}_${job.k}` : `sfx_${job.name || job.s}`;
      const pcm = path.join(tmp, name + '.raw');
      fs.writeFileSync(pcm, Buffer.from(wav.b64, 'base64'));
      const dst = path.join(OUT, 'audio', name + '.ogg');
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', String(wav.rate), '-ac', '2', '-i', pcm, '-c:a', 'libvorbis', '-q:a', job.kind === 'song' ? '3' : '4', dst]);
    }
    console.log('  →', jobs.length, 'sonidos en godot/audio/');
  }

  await browser.close();
  server.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
