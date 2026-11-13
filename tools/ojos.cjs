/* Star Nova — "los ojos": abre el juego en Chromium, recorre escenas con atajos de URL,
 * guarda capturas PNG y un informe (errores de consola, FPS, pruebas de movimiento).
 * Uso: node tools/ojos.cjs [carpeta_salida] [filtro]
 *   filtro: solo escenas cuyo nombre contenga ese texto (ej. "coral"). */
const path = require('path');
const fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('playwright-core')); }

const OUT = path.resolve(process.argv[2] || 'ojos');
const FILTER = process.argv[3] || '';

/* Perfiles de ejemplo para las capturas (se inyectan en localStorage antes de cargar la página). */
const M_DEMO = { campanas: [3, 1, 1], luciernagas: [3, 1, 1], puente: [1, 0, 1], guardian: [0, 0, 0], sombras: [5, 0, 1], explorador: [3, 0, 1], cofres: [2, 0, 1], elites: [0, 0, 1], golem: [0, 0, 1] };
const DEMO = {
  'perfil.1': {
    v: 1, name: 'Pip', created: 1, saved: Date.now(), time: 1560, level: 7, xp: 30, sparks: 240, hp: 150, kills: 86, frags: 2, region: 'coral',
    items: { bellota: 2, cascabel: 1, pluma: 1, miel: 2, te: 1, piedra: 1 }, attack: { id: 'rayo', tier: 3 }, power: 'agujero',
    missions: M_DEMO, tracked: 'puente', visited: ['claro', 'coral', 'menta'], owl: 1, pos: [-46, 0.4, 1], cam: [1.9, 0.3],
    world: { bells: [1, 1, 1], crystals: [1, 0], fireflies: [1, 1, 1], chests: [], extra: [], altar: 0, gate: 0, boss: 0 },
  },
  'perfil.3': { v: 1, name: 'Luna', created: 1, saved: Date.now(), time: 5400, level: 14, frags: 4, region: 'nova', world: { boss: 1 } },
};

const SCENES = [
  { name: '01_titulo', q: '', wait: 2500 },
  { name: '02_claro', q: 'auto=1&cam=0.5,0.35,5', wait: 3500 },
  { name: '03_lechuza', q: 'auto=1&ir=claro&cam=2.6,0.25,3.5', wait: 3000, keys: [['KeyE', 300]] },
  { name: '04_coral', q: 'auto=1&ir=coral&cam=1.9,0.3,6', wait: 4000 },
  { name: '05_campana_torre', q: 'auto=1&ir=campana&cam=2.4,0.25,7', wait: 4000 },
  { name: '06_menta', q: 'auto=1&ir=menta&cam=0.2,0.35,7', wait: 4000 },
  { name: '07_torre_cima', q: 'auto=1&ir=torre&cam=0.8,0.5,5', wait: 3500 },
  { name: '08_lavanda', q: 'auto=1&ir=lavanda&cam=-1.3,0.3,6', wait: 4000 },
  { name: '09_puente_tablones', q: 'auto=1&ir=puente&puente=1&cam=-1.0,0.35,6', wait: 5000 },
  { name: '10_portal_nova', q: 'auto=1&ir=nova&cam=3.3,0.25,6', wait: 4000 },
  { name: '11_combate', q: 'auto=1&ir=coral&enemigos=6&dios=1&cam=1.6,0.35,6', wait: 2500, hold: ['primary', 2000] },
  { name: '12_jefe', q: 'auto=1&jefe=1&dios=1&cam=3.14,0.35,8', wait: 6500 },
  { name: '13_diario', q: 'auto=1&diario=1&frag=2', wait: 2500 },
  { name: '14_objetos', q: 'auto=1&items=1&ir=claro&cam=-0.6,0.3,4', wait: 3000 },
  { name: '15_movil', q: 'auto=1&ir=coral&cam=1.9,0.3,5', wait: 3500, mobile: true },
  { name: '16_cofres', q: 'auto=1&ir=claro&cofre=todos&cam=-0.4,0.45,6', wait: 3000 },
  { name: '17_arma_rayo', q: 'auto=1&ir=coral&arma=rayo:3&enemigos=5&tipo=sombra,chispita&dios=1&cam=1.6,0.3,6', wait: 2000, hold: ['primary', 2500] },
  { name: '18_enemigos', q: 'auto=1&ir=coral&enemigos=16&dios=1&cam=1.6,0.45,9', wait: 2500 },
  { name: '19_elites', q: 'auto=1&ir=menta&enemigos=6&tipo=sombra,totem,erizo&elite=1&dios=1&cam=0.2,0.4,8', wait: 2500 },
  { name: '20_compendio', q: 'auto=1&compendio=1&items=1', wait: 2000 },
  { name: '21_pip', q: 'auto=1&ir=claro&hud=0&cam=3.3,0.15,1.6', wait: 2500 },
  { name: '22_movil_combate', q: 'auto=1&ir=coral&arma=prisma:4&enemigos=4&tipo=sombra,farol&dios=1&cam=1.6,0.3,5', wait: 3500, mobile: true },
  { name: '23_movil_pausa', q: 'auto=1&pausa=1', wait: 1500, mobile: true },
  { name: '25_movil_misiones', q: 'auto=1&diario=1', wait: 1800, mobile: true },
  { name: '26_movil_jugando', q: 'auto=1&ir=menta&cam=0.2,0.35,6', wait: 3500, mobile: true },
  { name: '27_perfiles_vacios', q: 'perfiles=1', wait: 1500, mobile: true },
  { name: '28_perfiles', q: 'perfiles=1', wait: 1500, mobile: true, store: DEMO },
  { name: '29_perfiles_pc', q: 'perfiles=1', wait: 1500, store: DEMO },
  { name: '30_menu_mochila', q: 'auto=1&items=1&arma=rayo:3&menu=mochila', wait: 1800, mobile: true },
  { name: '31_menu_mapa', q: 'perfil=1&menu=mapa', wait: 1800, mobile: true, store: DEMO },
  { name: '32_menu_sistema', q: 'perfil=1&menu=sistema', wait: 1800, mobile: true, store: DEMO },
  { name: '33_menu_mapa_pc', q: 'perfil=1&menu=mapa', wait: 1800, store: DEMO },
  { name: '34_partida_cargada', q: 'perfil=1', wait: 3500, mobile: true, store: DEMO },
  { name: '24_poder', q: 'auto=1&ir=coral&poder=agujero&enemigos=6&tipo=sombra&dios=1&cam=1.6,0.4,7', wait: 1500, keys: [['KeyR', 600]] },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { serve } = await import(path.join(__dirname, 'serve.mjs'));
  const server = await serve(0);
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const report = [];
  let sha = '';
  try { sha = require('child_process').execSync('git rev-parse --short HEAD').toString().trim(); } catch (e) { /* sin git */ }
  report.push(`Star Nova — informe de los ojos · commit ${sha} · ${new Date().toISOString()}`);
  let errorsTotal = 0;
  for (const sc of SCENES) {
    if (FILTER && !sc.name.includes(FILTER)) continue;
    const ctx = await browser.newContext(sc.mobile
      ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }
      : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    if (sc.store) await ctx.addInitScript((data) => { for (const k in data) localStorage.setItem('starnova.' + k, JSON.stringify(data[k])); }, sc.store);
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    const url = `http://127.0.0.1:${port}/index.html?ojos=1&${sc.q}`;
    const t0 = Date.now();
    await page.goto(url);
    try { await page.waitForFunction(() => window.__starnova && (window.__starnova.ready || window.__starnova.error), null, { timeout: 60000 }); }
    catch (e) { errors.push('no arrancó en 60 s'); }
    const boot = Date.now() - t0;
    if (sc.mobile) await page.evaluate(() => window.__starnova.game && window.__starnova.game.input.enableTouchUI());
    const f0 = await page.evaluate(() => window.__starnova.game ? window.__starnova.game.frames : 0);
    if (sc.keys) for (const [k, ms] of sc.keys) { await page.waitForTimeout(ms); await page.keyboard.press(k); }
    if (sc.hold) {
      await page.waitForTimeout(500);
      await page.evaluate((a) => window.__starnova.game.input.setAction(a, true), sc.hold[0]);
      await page.waitForTimeout(sc.hold[1]);
      await page.evaluate((a) => window.__starnova.game.input.setAction(a, false), sc.hold[0]);
    }
    await page.waitForTimeout(sc.wait);
    const info = await page.evaluate(() => {
      const s = window.__starnova; if (!s || !s.game) return { error: s && s.error };
      const g = s.game, p = g.player.pos;
      return { frames: g.frames, pos: [p.x.toFixed(2), p.y.toFixed(2), p.z.toFixed(2)], hp: Math.round(g.hp), enemies: g.enemies.length, region: g.region, state: g.state, kills: g.kills, calls: g.renderer.info.render.calls, tris: g.renderer.info.render.triangles };
    });
    const secs = (Date.now() - t0 - boot) / 1000;
    const fps = info.frames ? ((info.frames - f0) / secs).toFixed(1) : '?';
    await page.screenshot({ path: path.join(OUT, sc.name + '.png') });
    errorsTotal += errors.length;
    report.push(`\n[${sc.name}] arranque ${boot} ms · ~${fps} fps (software) · estado ${info.state} · región ${info.region} · pos ${info.pos} · vida ${info.hp} · enemigos ${info.enemies} · derrotados ${info.kills} · dibujos ${info.calls} · triángulos ${info.tris}`);
    if (info.error) report.push('  ERROR: ' + info.error);
    for (const e of errors.slice(0, 8)) report.push('  consola: ' + e.slice(0, 400));
    await ctx.close();
  }

  // prueba de movimiento: caminar hacia delante y saltar
  if (!FILTER || FILTER === 'mover') {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port}/index.html?ojos=1&auto=1`);
    await page.waitForFunction(() => window.__starnova && window.__starnova.ready, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    const a = await page.evaluate(() => window.__starnova.game.player.pos.toArray());
    await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); await page.keyboard.up('KeyW');
    const b = await page.evaluate(() => window.__starnova.game.player.pos.toArray());
    await page.keyboard.press('Space'); await page.waitForTimeout(250);
    const c = await page.evaluate(() => window.__starnova.game.player.pos.toArray());
    const moved = Math.hypot(b[0] - a[0], b[2] - a[2]);
    report.push(`\n[prueba_mover] avanzó ${moved.toFixed(2)} m (esperado > 1) → ${moved > 1 ? 'OK' : 'FALLO'} · salto: altura ${(c[1] - b[1]).toFixed(2)} m → ${c[1] - b[1] > 0.2 ? 'OK' : 'FALLO'}`);
    await ctx.close();
  }
  // prueba de guardado: crear un perfil, avanzar, "Guardar y salir", continuar y borrar
  if (!FILTER || FILTER === 'guardar') {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    const ready = () => page.waitForFunction(() => window.__starnova && window.__starnova.ready, null, { timeout: 60000 });
    const fails = [];
    const check = (ok, what) => { if (!ok) fails.push(what); };
    try {
      await page.goto(`http://127.0.0.1:${port}/index.html?ojos=1`);
      await ready();
      await page.click('#btnStart');
      await page.click('.slot[data-slot="2"] .go');
      await page.fill('#nameInput', 'Nuez');
      await page.click('#btnNameOk');
      await page.waitForTimeout(600);
      const a = await page.evaluate(() => {
        const g = window.__starnova.game;
        g.addItem('bellota', true);
        g.sparks = 123;
        g.props.bells.forEach(b => b.ring());            // completa "Las Tres Campanas" (+40 chispas y un fragmento)
        g.missions.track('luciernagas');
        g.player.teleport([-46, 0.4, 1]);
        return { state: g.state, slot: g.slot, name: g.profile.name };
      });
      check(a.state === 'play' && a.slot === 2 && a.name === 'Nuez', 'no empezó el perfil nuevo');
      await page.waitForTimeout(1800);                    // Pip pisa suelo firme en el Jardín de Coral
      await page.click('#btnPause');
      const noNew = await page.evaluate(() => !/nueva partida/i.test(document.getElementById('menu').innerText));
      check(noNew, 'el menú todavía ofrece "Nueva partida"');
      await page.screenshot({ path: path.join(OUT, '35_guardar_y_salir.png') });
      await Promise.all([page.waitForNavigation(), page.click('#btnSaveQuit')]);
      await ready();
      const b = await page.evaluate(() => ({
        perfiles: !document.getElementById('profiles').classList.contains('hidden'),
        texto: document.querySelector('.slot[data-slot="2"]').innerText,
        estrellas: document.querySelectorAll('.slot[data-slot="2"] .stars .on').length,
      }));
      check(b.perfiles, 'tras salir no volvió a los perfiles');
      check(/Nuez/.test(b.texto) && b.estrellas === 1, 'la ranura no muestra el perfil guardado');
      await page.click('.slot[data-slot="2"] .go');
      await page.waitForTimeout(1500);
      const c = await page.evaluate(() => {
        const g = window.__starnova.game, p = g.player.pos;
        return {
          state: g.state, bellota: g.items.bellota, sparks: Math.floor(g.sparks), frags: g.missions.fragments(), campanas: g.missions.state.campanas.done,
          rung: g.props.bells.every(x => x.rung), tracked: g.missions.tracked, dist: Math.hypot(p.x + 46, p.z - 1), y: p.y,
        };
      });
      check(c.state === 'play', 'no continuó la partida');
      check(c.bellota === 1 && c.sparks === 163, `objetos o chispas mal restaurados (${c.bellota}, ${c.sparks})`);
      check(c.frags === 1 && c.campanas && c.rung, 'misión o campanas mal restauradas');
      check(c.tracked === 'luciernagas', 'misión seguida mal restaurada');
      check(c.dist < 3 && c.y > -1, `lugar mal restaurado (a ${c.dist.toFixed(1)} m, altura ${c.y.toFixed(1)})`);
      await page.click('#btnPause');
      await Promise.all([page.waitForNavigation(), page.click('#btnSaveQuit')]);
      await ready();
      await page.click('.slot[data-slot="2"] .acts button:nth-child(2)');   // Borrar
      await page.click('.slot[data-slot="2"] .danger');                     // Sí, borrar
      const gone = await page.evaluate(() => localStorage.getItem('starnova.perfil.2') === null && document.querySelector('.slot[data-slot="2"]').classList.contains('empty'));
      check(gone, 'no se borró el perfil');
      for (const e of errs) fails.push('error: ' + e.slice(0, 200));
    } catch (e) { fails.push('excepción: ' + String(e.message || e).split('\n')[0].slice(0, 300)); }
    report.push(`\n[prueba_guardado] crear perfil → avanzar → guardar y salir → continuar → borrar → ${fails.length ? 'FALLO: ' + fails.join(' · ') : 'OK'}`);
    await ctx.close();
  }
  report.push(`\nErrores de consola en total: ${errorsTotal}`);
  fs.writeFileSync(path.join(OUT, 'report.txt'), report.join('\n') + '\n');
  console.log(report.join('\n'));
  await browser.close();
  server.close();
})();
