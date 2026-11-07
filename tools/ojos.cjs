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
  report.push(`\nErrores de consola en total: ${errorsTotal}`);
  fs.writeFileSync(path.join(OUT, 'report.txt'), report.join('\n') + '\n');
  console.log(report.join('\n'));
  await browser.close();
  server.close();
})();
