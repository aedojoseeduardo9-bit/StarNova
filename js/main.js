/* Star Nova — arranque: carga Rapier (WASM) y crea el juego. */
import { initPhysics } from './physics.js';
import { Game } from './game.js';

const params = new URLSearchParams(location.search);
const loading = document.getElementById('loading');

async function boot() {
  try {
    await initPhysics();
    const game = new Game(document.getElementById('game'), params);
    game.init();
    window.__starnova = { game, ready: true };
    loading.classList.add('fade');
    setTimeout(() => loading.remove(), 700);
  } catch (err) {
    console.error(err);
    document.getElementById('loadingText').textContent = 'No se pudo iniciar: ' + (err && err.message ? err.message : err);
    window.__starnova = { error: String(err && err.stack || err) };
  }
}
boot();
