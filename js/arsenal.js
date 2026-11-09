/* Star Nova — arsenal de Pip: ataque principal equipado (21 tipos con rango), poder especial (13),
 * efectos al golpear (de ataques y de objetos) y aliados (torres, espíritus, orbes, luciérnagas). */
import * as THREE from 'three';
import { G, groups } from './physics.js';
import { ATTACKS, POWERS, tierMul } from './content/attacks.js';
import { Shot, StarFall, VoidHole, PoisonCloud, Turret, Spirit, OwlSpirit, Orbitals, Drones } from './combat.js';
import { mat, GEO, part } from './entities/models.js';
import { Audio } from './audio.js';

const Y = new THREE.Vector3(0, 1, 0);

export class Arsenal {
  constructor(game) {
    this.game = game;
    this.attack = { id: 'bellota', tier: 0 };
    this.power = 'lluvia';
    this.helpers = [];          // torres, espíritus, lechuzas, agujeros, nubes
    this.orbitals = new Orbitals(game);
    this.drones = new Drones(game);
    this.stormT = 4;
    this.cometT = 2.5;
    this.auraT = 0;
    // haz arcoíris
    this.beamMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: '#ffb3c7', transparent: true, opacity: 0.85, depthWrite: false }));
    this.beamMesh.visible = false;
    this.beamMesh.frustumCulled = false;
    game.scene.add(this.beamMesh);
    this.beamTick = 0;
  }

  get def() { return ATTACKS[this.attack.id]; }
  get pdef() { return POWERS[this.power]; }

  rageK() { const g = this.game; return g.stats.rage > 0 && g.hp < g.stats.maxHp * 0.4 ? 1 : 0; }
  baseDmg() {
    const g = this.game;
    return g.stats.dmg * tierMul(this.attack.tier) * g.buffMul('dmg') * (1 + 0.5 * this.rageK() * g.stats.rage);
  }
  rate() {
    const g = this.game;
    return this.def.rate / (g.stats.atk * g.buffMul('atk') * (1 + 0.3 * this.rageK()));
  }
  tierBonus() { return 1 + 0.15 * this.attack.tier; }
  powerCd() { return this.pdef.cd * this.game.stats.cdrMul; }

  shotOpts(extra = {}) {
    const d = this.def, t = this.attack.tier, g = this.game;
    const critChance = g.stats.crit + (d.critBonus || 0);
    const crit = Math.random() < critChance;
    const o = {
      dmg: this.baseDmg() * d.dmg * (crit ? g.stats.critMul : 1), crit,
      color: d.color, model: d.model, speed: d.speed, tier: t, proc: true,
      burn: d.burn, freeze: d.freeze ? d.freeze + 0.3 * t : 0, chain: d.chain ? d.chain + Math.floor(t / 2) : 0,
      pierce: d.pierce ? d.pierce + t : 0, splash: d.splash, poison: d.poison, cloud: d.cloud, leech: d.leech,
      stun: d.stun, voidHole: d.voidHole, bounces: d.bounces ? d.bounces + t : 0,
      trail: t >= 2 || ['star', 'orb'].includes(d.model),
      big: t >= 4 ? 1.35 : 1,
    };
    return Object.assign(o, extra);
  }

  /* Dispara el ataque principal equipado. */
  fire(from, target) {
    const g = this.game, d = this.def, t = this.attack.tier;
    const dir = target.clone().sub(from).normalize();
    const extra = (g.stats.projCount || 0) + (Math.random() < g.stats.multishot ? 1 : 0);
    const spreadDirs = (n, ang) => {
      const out = [];
      for (let i = 0; i < n; i++) out.push(dir.clone().applyAxisAngle(Y, (i - (n - 1) / 2) * ang));
      return out;
    };
    const add = (dirs, o) => { for (const v of dirs) g.addPlayerShot(new Shot(g, from.clone(), v, this.shotOpts(o))); };
    switch (d.kind) {
      case 'spread': add(spreadDirs(d.count + extra + (t >= 3 ? 2 : 0), d.spread * 0.6), { life: 0.6 }); break;
      case 'lob': {
        const flat = Math.hypot(target.x - from.x, target.z - from.z);
        const v = new THREE.Vector3(target.x - from.x, 0, target.z - from.z).normalize();
        const sp = Math.max(9, Math.min(22, Math.sqrt(Math.max(1, flat) * 22 / 1.2)));
        v.y = 0.7; v.normalize();
        const n = 1 + extra;
        for (let i = 0; i < n; i++) g.addPlayerShot(new Shot(g, from.clone(), v.clone().applyAxisAngle(Y, (i - (n - 1) / 2) * 0.15), this.shotOpts({ speed: sp, gravity: 1, life: 3 })));
        break;
      }
      case 'homing': add(spreadDirs((d.count || 1) + extra + (t >= 4 ? 1 : 0) + (t >= 5 ? 1 : 0), 0.35), { homing: true, life: 2.4 }); break;
      case 'boomerang': add(spreadDirs(1 + extra, 0.2), { boomerang: true }); break;
      case 'rapid': {
        const j = dir.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.04, (Math.random() - 0.5) * 0.04, (Math.random() - 0.5) * 0.04)).normalize();
        add([j, ...spreadDirs(extra, 0.1).slice(0, extra)]);
        break;
      }
      case 'ring': {
        const n = d.count + t * 2 + extra * 2;
        const dirs = [];
        for (let i = 0; i < n; i++) dirs.push(new THREE.Vector3(Math.cos(i / n * Math.PI * 2), 0.05, Math.sin(i / n * Math.PI * 2)));
        add(dirs, { gravity: 0, life: 0.8, pierce: 1 + t });
        break;
      }
      case 'mine': {
        const v = dir.clone(); v.y = Math.max(v.y, 0.15); v.normalize();
        g.addPlayerShot(new Shot(g, from.clone(), v, this.shotOpts({ speed: 9, gravity: 1, mine: true, life: 20, model: 'orb', r: 0.12 })));
        const mines = g.projectiles.filter(p => p.o && p.o.mine && !p.dead);
        if (mines.length > 6) mines[0].detonate();
        break;
      }
      case 'meteor': {
        for (let i = 0; i <= extra; i++) {
          const o = this.shotOpts();
          const p = target.clone().add(new THREE.Vector3((Math.random() - 0.5) * i, 0, (Math.random() - 0.5) * i));
          g.projectiles.push(new StarFall(g, p, o.dmg, 0.05 * i, { splash: d.splash + 0.2 * t, color: d.color, effects: o, size: 1 + t * 0.15 }));
        }
        break;
      }
      case 'beam': break; // se maneja en updateBeam
      default: add(spreadDirs(1 + extra, 0.12));
    }
    if (d.kind !== 'beam') { Audio.play('shoot'); g.player.anim.throwAnim(); }
  }

  /* Haz continuo: daña en intervalos al primer enemigo en la línea. */
  updateBeam(dt, active, from, target) {
    const g = this.game;
    if (!active || this.def.kind !== 'beam') { this.beamMesh.visible = false; return; }
    const dir = target.clone().sub(from);
    let len = Math.min(26, dir.length());
    dir.normalize();
    const end = from.clone().addScaledVector(dir, len);
    const e = g.hitEnemySegment(from, end, 0.25);
    if (e) { len = e.center().distanceTo(from); end.copy(e.center()); }
    this.beamMesh.visible = true;
    this.beamMesh.position.copy(from).addScaledVector(dir, len / 2);
    this.beamMesh.quaternion.setFromUnitVectors(Y, dir);
    const w = 0.6 + this.attack.tier * 0.15 + Math.sin(performance.now() / 50) * 0.15;
    this.beamMesh.scale.set(w, len, w);
    this.beamMesh.material.color.setHSL((performance.now() / 1500) % 1, 0.7, 0.75);
    this.beamTick -= dt;
    if (this.beamTick <= 0) {
      this.beamTick = this.rate();
      if (e) { const o = this.shotOpts(); g.damageEnemy(e, o.dmg, { crit: o.crit, proc: true, from, effects: { burn: 0.3 } }); }
      if (Math.random() < 0.6) g.fx.emit(end.x, end.y, end.z, (Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2, '#ffffff', 0.15, 0.3, -2);
    }
    if (Math.random() < 0.3) Audio.play('xp');
  }

  /* Aplica los efectos de un proyectil al golpear a un enemigo. */
  hitShot(e, shot) {
    const o = shot.o;
    this.game.damageEnemy(e, shot.dmg, { crit: shot.crit, proc: o.proc, from: shot.prev, knock: 2.5, effects: o });
  }

  /* Efectos del ataque (o) y de los objetos (procs) tras un golpe. */
  applyEffects(e, dmg, o, from) {
    const g = this.game, st = g.stats;
    if (e.dead) return;
    if (o) {
      if (o.burn) { e.burnT = 3; e.burnDps = Math.max(e.burnDps, dmg * o.burn); }
      if (o.freeze) this.slow(e, o.freeze, Math.max(0.05, 0.55 - 0.08 * (o.tier || 0)));
      if (o.poison) { e.poisonT = 4; e.poisonDps = Math.max(e.poisonDps, dmg * o.poison); }
      if (o.cloud) this.helpers.push(new PoisonCloud(g, e.center(), { r: o.cloud + 0.2 * (o.tier || 0), dps: dmg * 0.4, life: 3 }));
      if (o.leech) g.heal(dmg * o.leech, true);
      if (o.stun) e.stunT = Math.max(e.stunT, o.stun);
      if (o.voidHole) this.helpers.push(new VoidHole(g, e.center(), { r: 2.6 + 0.3 * (o.tier || 0), dps: dmg * 0.8, life: 2.2 }));
      if (o.chain) this.chain(e, dmg * 0.75, o.chain);
    }
    if (o && o.proc === false) return;
    // procs de objetos
    if (Math.random() < st.explode) g.explodeAt(e.center(), 1.8, st.dmg * 1.5, '#ff9a6b', false, { proc: false });
    if (Math.random() < st.bleed) { e.bleedT = 3; e.bleedDps = Math.max(e.bleedDps, st.dmg * 0.4); }
    if (Math.random() < st.freeze) this.slow(e, 1.6, 0.3);
    if (Math.random() < st.chain) this.chain(e, st.dmg * 0.9, 2 + st.chainExtra);
    if (Math.random() < st.poison) {
      e.poisonT = 4; e.poisonDps = Math.max(e.poisonDps, st.dmg * 0.35);
      for (const n of g.enemies) if (n !== e && !n.dead && n.pos.distanceTo(e.pos) < 2.5) { n.poisonT = 3; n.poisonDps = Math.max(n.poisonDps, st.dmg * 0.25); }
    }
    if (Math.random() < st.voidChance) this.helpers.push(new VoidHole(g, e.center(), { r: 2.8, dps: st.dmg * 1.2, life: 2 }));
    if (st.lifesteal) g.heal(dmg * st.lifesteal, true);
  }

  slow(e, time, k) {
    const cur = e.slowT > 0 ? e.slowK : 1;
    e.slowT = Math.max(e.slowT, time);
    e.slowK = Math.min(cur, k);
  }

  chain(from, dmg, n) {
    const g = this.game;
    const hit = new Set([from]);
    let cur = from;
    for (let i = 0; i < n; i++) {
      let best = null, bd = 6.5;
      for (const e of g.enemies) {
        if (e.dead || e.untargetable || hit.has(e)) continue;
        const d = e.center().distanceTo(cur.center());
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) break;
      g.fx.bolt(cur.center(), best.center(), '#fff27a');
      hit.add(best);
      g.damageEnemy(best, dmg, { proc: false, color: '#fff27a' });
      cur = best;
    }
    if (n > 0) Audio.play('hit');
  }

  /* ---------- poderes especiales (botón ★) ---------- */
  usePower() {
    const g = this.game, pl = g.player, st = g.stats;
    const dmg = st.dmg * g.buffMul('dmg');
    const target = g.powerTarget();
    Audio.play('special');
    switch (this.power) {
      case 'lluvia':
        for (let i = 0; i < 8; i++) {
          const a = Math.random() * Math.PI * 2, r = Math.random() * 3;
          g.projectiles.push(new StarFall(g, target.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)), dmg * 2.6, i * 0.09));
        }
        break;
      case 'agujero': this.helpers.push(new VoidHole(g, target.clone().add(new THREE.Vector3(0, 0.6, 0)), { r: 5, dps: dmg * 1.6, life: 3, pull: 7, big: 1.6 })); break;
      case 'meteoro': g.projectiles.push(new StarFall(g, target, dmg * 9, 0.25, { size: 3, splash: 5.5, color: '#ff9a6b' })); break;
      case 'burbuja':
        g.buffs.invuln = 3; g.heal(st.maxHp * 0.2);
        this.bubble(3);
        break;
      case 'tormenta':
        for (let i = 0; i < 12; i++) setTimeout(() => {
          if (g.state !== 'play') return;
          const list = g.enemies.filter(e => !e.dead && !e.untargetable && e.pos.distanceTo(pl.pos) < 16);
          const e = list[Math.floor(Math.random() * list.length)];
          const p = e ? e.center() : pl.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10));
          g.fx.bolt(p.clone().add(new THREE.Vector3(0, 9, 0)), p, '#fff27a', 0.25);
          if (e) { g.damageEnemy(e, dmg * 2, { proc: false, color: '#fff27a' }); e.stunT = Math.max(e.stunT, 0.3); }
          Audio.play('hit');
        }, i * 170);
        break;
      case 'novahelada':
        g.fx.ring(pl.pos.clone().add(new THREE.Vector3(0, 0.3, 0)), '#bfefff', 40, 10);
        g.fx.burst(pl.center, '#e8fbff', 40, 6);
        for (const e of g.enemies) if (!e.dead && e.pos.distanceTo(pl.pos) < 8) { this.slow(e, 3, 0.05); g.damageEnemy(e, dmg * 1.5, { proc: false, color: '#bfefff' }); }
        Audio.play('crystal');
        break;
      case 'torreta': this.helpers.push(new Turret(g, pl.pos.clone().add(new THREE.Vector3(Math.sin(pl.yaw), 0, Math.cos(pl.yaw))))); break;
      case 'espiritus': this.helpers.push(new Spirit(g, 0), new Spirit(g, 1)); break;
      case 'flor':
        g.buffs.healOverTime = 4; g.buffs.healRate = st.maxHp * 0.1;
        g.fx.burst(pl.center, '#9fe3b0', 30, 3);
        break;
      case 'frenesi': g.buffs.frenzy = 5; g.fx.burst(pl.center, '#ff7a6b', 30, 4); break;
      case 'terremoto':
        [0, 0.35, 0.7].forEach((d, i) => setTimeout(() => {
          if (g.state !== 'play') return;
          const r = 4 + i * 1.6;
          g.fx.ring(pl.pos.clone().add(new THREE.Vector3(0, 0.1, 0)), '#d8b48a', 36, r * 2);
          g.cam.shake = Math.max(g.cam.shake, 0.35);
          for (const e of g.enemies) if (!e.dead && e.pos.distanceTo(pl.pos) < r) { g.damageEnemy(e, dmg * 2, { knock: 4, from: pl.pos, up: 7, proc: false }); }
          Audio.play('rumble');
        }, d * 1000));
        break;
      case 'tiempo': g.timeSlowT = 4; g.fx.ring(pl.center, '#c7c3f0', 40, 14); break;
      case 'lechuza': this.helpers.push(new OwlSpirit(g, pl.center, g.cam.forward, dmg * 4)); break;
    }
    g.vibrate(25);
  }

  bubble(t) {
    const g = this.game;
    if (!this.bubbleMesh) {
      this.bubbleMesh = part(GEO.ico(2), mat('#bfefff', { basic: true, transparent: true, opacity: 0.25, depthWrite: false }), 0, 0, 0, 0.75);
      this.bubbleMesh.castShadow = false;
      g.scene.add(this.bubbleMesh);
    }
    this.bubbleMesh.visible = true;
  }

  /* Aliados y efectos periódicos de objetos. */
  update(dt, t) {
    const g = this.game, st = g.stats, pl = g.player;
    for (const h of this.helpers) if (!h.dead) h.update(dt, t);
    this.helpers = this.helpers.filter(h => { if (h.dead) { h.destroy(); return false; } return true; });
    this.orbitals.sync(Math.min(8, st.orbitals));
    this.orbitals.update(dt, t);
    this.drones.sync(Math.min(6, st.drone));
    this.drones.update(dt, t);
    if (this.bubbleMesh) {
      this.bubbleMesh.visible = g.buffs.invuln > 0;
      this.bubbleMesh.position.copy(pl.center);
    }
    // Aura Solar
    if (st.aura > 0) {
      this.auraT -= dt;
      if (this.auraT <= 0) {
        this.auraT = 0.5;
        for (const e of g.enemies) if (!e.dead && e.pos.distanceTo(pl.pos) < 2.6 + e.r) { e.burnT = Math.max(e.burnT, 1.5); e.burnDps = Math.max(e.burnDps, st.dmg * 0.35 * st.aura); }
      }
      if (Math.random() < 0.25) { const a = Math.random() * 6.28; g.fx.emit(pl.pos.x + Math.cos(a) * 2.4, pl.pos.y + 0.2, pl.pos.z + Math.sin(a) * 2.4, 0, 1, 0, '#ffcf6b', 0.15, 0.5, 0); }
    }
    // Nube de Tormenta
    if (st.storm > 0) {
      this.stormT -= dt;
      if (this.stormT <= 0) {
        this.stormT = 4 / st.storm;
        const list = g.enemies.filter(e => !e.dead && !e.untargetable && e.pos.distanceTo(pl.pos) < 18);
        const e = list[Math.floor(Math.random() * list.length)];
        if (e) { g.fx.bolt(e.center().add(new THREE.Vector3(0, 8, 0)), e.center(), '#fff27a', 0.25); g.damageEnemy(e, st.dmg * 2.2, { proc: true }); }
      }
    }
    // Cometa Fiel
    if (st.comet > 0) {
      this.cometT -= dt;
      if (this.cometT <= 0) {
        this.cometT = 2.5;
        let best = null, bd = 25;
        for (const e of g.enemies) { if (e.dead) continue; const d = e.center().distanceTo(pl.pos); if (d < bd) { bd = d; best = e; } }
        if (best) g.projectiles.push(new StarFall(g, best.pos.clone(), st.dmg * 2 * st.comet, 0));
      }
    }
  }
}

export { G, groups };
