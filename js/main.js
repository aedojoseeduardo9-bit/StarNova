/* Star Nova — arranque: elige el mundo (galaxia), carga Rapier (WASM) y crea el juego.
 * Viajar en cohete o continuar un perfil que está en otro mundo recarga la página con sessionStorage
 * 'starnova.viaje' = { slot, world, arrive }: aquí se lee para cargar ese mundo y entrar directo a la partida. */
import { initPhysics } from './physics.js';
import { Game } from './game.js';
import { setWorld, WORLDS } from './worlds/index.js';
import { Audio } from './audio.js';
import { store } from './util.js';

const params = new URLSearchParams(location.search);
const loading = document.getElementById('loading');
let travel = null;
try { travel = JSON.parse(sessionStorage.getItem('starnova.viaje') || 'null'); sessionStorage.removeItem('starnova.viaje'); } catch (e) { travel = null; }
let worldId = params.get('mundo') || (travel && travel.world) || store.get('ultimoMundo', 'islas');
if (!WORLDS[worldId]) worldId = 'islas';
setWorld(worldId);
// el sonido necesita un toque del jugador para empezar (sobre todo tras un viaje, que recarga la página)
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => Audio.init(), { passive: true });

async function boot() {
  try {
    await initPhysics();
    const game = new Game(document.getElementById('game'), params);
    game.travel = travel;
    game.init();
    if (travel && travel.slot) game.playSlot(travel.slot, null, false);
    window.__starnova = { game, ready: true };
    loading.classList.add('fade');
    setTimeout(() => loading.remove(), 700);
  } catch (err) {
    console.error(err);
    document.getElementById('loadingText').textContent = 'No se pudo iniciar: ' + (err && err.message ? err.message : err);
    window.__starnova = { error: String(err && err.stack || err) };
  }
}
/* En la app de Android: muestra la versión y avisa si hay una compilación nueva en GitHub. */
const REPO = 'aedojoseeduardo9-bit/StarNova';
async function checkUpdate() {
  const A = window.StarNovaAndroid;
  if (!A) return;
  let mine = 0;
  try { mine = A.build(); document.getElementById('version').textContent = 'versión ' + A.version(); } catch (e) { return; }
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/tags/latest`, { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    const m = /compilaci[oó]n\s*#?(\d+)/i.exec(j.name || '');
    const latest = m ? parseInt(m[1], 10) : 0;
    if (mine > 0 && latest > mine) {
      const b = document.getElementById('btnUpdate');
      b.textContent = 'Actualizar a la versión 0.6.' + latest;
      b.classList.remove('hidden');
      b.onclick = () => { location.href = `https://github.com/${REPO}/releases/latest/download/StarNova.apk`; };
    }
  } catch (e) { /* sin internet: se juega igual */ }
}

boot();
checkUpdate();
