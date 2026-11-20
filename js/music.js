/* Star Nova — director de música durante el juego: elige la canción según lo que pasa.
 * Prioridad: jefe › peligro (élite o Gólem cerca) › combate (sombras cerca) › noche › día.
 * De día cada región toca la canción en su propio tono. Las escenas animadas tienen su propia música
 * (js/cinema.js), así que aquí no se toca nada mientras dura una escena. Las canciones están en js/audio.js. */
import { Audio } from './audio.js';

/* Tono (en semitonos) de cada región. */
const KEY = { claro: 0, coral: 2, menta: -3, lavanda: 5, nova: 0 };
const CHECK = 0.4;          // segundos entre revisiones
const CALM_AFTER = 7;       // segundos sin sombras cerca para volver a la música tranquila

export class MusicDirector {
  constructor(game) {
    this.g = game;
    this.t = 0;
    this.fight = 0;         // cuenta atrás de la música de combate
    this.mood = null;
  }

  /* Qué canción toca ahora mismo: [canción, tono] o null (silencio). */
  choose(elapsed = CHECK) {
    const g = this.g, st = g.state;
    if (st === 'title') return g.menus.profilesOpen ? ['cuento', 0] : null;
    if (st === 'dead') return null;
    if (st === 'ending') return ['esperanza', 0];
    if (g.boss && !g.boss.dead && !g.bossDone) return ['jefe', 0];
    const pl = g.player.pos;
    let near = 0, close = 0, danger = false;
    for (const e of g.enemies) {
      if (e.dead || e.isBoss || e.untargetable) continue;
      const d = e.pos.distanceTo(pl);
      if ((e.elite || e.def.ai === 'golem') && d < 24) danger = true;
      if (d < 16) near++;
      if (d < 9) close++;
    }
    if (danger) { this.fight = CALM_AFTER; return ['peligro', 0]; }
    if (near >= 2 || close >= 1) this.fight = CALM_AFTER;
    else this.fight = Math.max(0, this.fight - elapsed);
    if (this.fight > 0) return ['combate', 0];
    const key = KEY[g.region] || 0;
    if (g.sky.night > 0.55) return ['noche', key];                   // la noche del ciclo o el Santuario
    return ['dia', key];
  }

  update(dt) {
    this.t -= dt;
    if (this.t > 0) return;
    const elapsed = CHECK - this.t;
    this.t = CHECK;
    if (!Audio.ctx) return;
    const g = this.g;
    Audio.duck(g.state === 'menu' ? 0.45 : 1);                        // con el menú abierto, más bajito
    if (g.state === 'cine') return;                                   // las escenas llevan su propia música
    const pick = this.choose(elapsed);
    this.mood = pick ? pick[0] : null;
    if (pick) Audio.score(pick[0], pick[1]);
    else Audio.scoreStop(2);
  }
}
