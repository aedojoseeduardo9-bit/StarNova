/* Star Nova — mapa del mundo abierto.
 * El Claro (centro) se une con cuatro regiones por pasarelas:
 *   oeste  → Jardín de Coral   (misión: Las Tres Campanas)
 *   norte  → Torres de Menta   (misiones: Luciérnagas Perdidas, Plaga de Sombras)
 *   este   → Puente de Lavanda (misión: El Puente Dormido)
 *   sur    → Santuario de Nova (misión final: El Guardián, requiere 3 fragmentos)
 * Devuelve los "puntos" donde el juego coloca objetos con física y lógica. */
import { Builder } from './builder.js';
import { REGIONS } from './palette.js';

export function buildWorld(game) {
  const scene = game.scene;
  const spots = {
    spawn: [0, 0.6, 5],
    campfire: [0, 0.22, 0],
    owl: [3.6, 1.7, -3.8],
    chests: [], crates: [], bells: [], fireflies: [], crystals: [], lanterns: [],
    altar: null, plankBridge: null, gate: null, arena: null, novaStar: null,
    spawnZones: [],
  };

  /* ---------------- El Claro ---------------- */
  {
    const b = new Builder(game, REGIONS.claro);
    const p = b.pal;
    b.island(0, 0, 0, 15, { seg: 12 });
    b.cyl(0, 0, 0, 4.6, 0.22, p.stone, { seg: 8 });
    b.cyl(0, 0, 0, 3.2, 0.24, p.stone2, { seg: 8, collide: false });
    // pilar de la lechuza
    b.cyl(3.6, 0, -3.8, 0.42, 1.5, p.stone2, { seg: 8 });
    b.cyl(3.6, 1.5, -3.8, 0.55, 0.2, p.stone, { seg: 8 });
    // glorieta con cúpula
    const gx = -7.5, gz = -5.5;
    b.cyl(gx, 0, gz, 2.4, 0.25, p.stone, { seg: 8 });
    for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) b.cyl(gx + dx, 0.25, gz + dz, 0.22, 2.6, p.stone, { seg: 8 });
    b.box(gx, 2.85, gz, 3.8, 0.35, 3.8, p.stone2);
    b.dome(gx, 3.2, gz, 1.7, p.roof);
    b.cone(gx, 4.8, gz, 0.14, 0.7, p.accent, { seg: 6 });
    // torre del faro y casitas
    b.tower(9, -4, 0, 2.6, 6.5, { roof: 'cone' });
    b.tower(-9.5, 5.5, 0, 2.2, 3.2, { roof: 'dome' });
    b.box(7.5, 0, 7.5, 3, 2.2, 2.4, p.stone, {});
    b.cone(7.5, 2.2, 7.5, 2.0, 1.4, p.roof, { seg: 4, ry: Math.PI / 4 });
    b.window(7.5, 0.5, 8.75, 0, 0.5, 0.7, p.win);
    // arcos en las cuatro salidas
    b.arch(-13.2, 0, 0, 3.2, 3.6, 1.2, { ry: Math.PI / 2 });
    b.arch(13.2, 0, 0, 3.2, 3.6, 1.2, { ry: Math.PI / 2 });
    b.arch(0, -13.2, 0, 3.2, 3.6, 1.2, {});
    b.arch(0, 13.2, 0, 3.2, 3.6, 1.2, {});
    for (const [x, z, s] of [[-10, 9, 1], [5, -10, 1.1], [11, 3, 0.9], [-4, 10.5, 0.8], [-11, -1.5, 0.9]]) b.tree(x, 0, z, s);
    b.finish(scene);
    spots.chests.push({ pos: [5.5, 0, 4.5], region: 'claro' });
    spots.crates.push([-3, 0.4, 7], [-3, 1.1, 7], [-2.2, 0.4, 7.2]);
    spots.lanterns.push({ anchor: [gx, 2.85, gz], len: 3 });
  }

  /* ---------------- Pasarelas ---------------- */
  {
    const b = new Builder(game, REGIONS.claro);
    b.walkway(-14, 0, -38.2, 0, 0, 3.2);
    b.walkway(0, -14, 0, -43.2, 0, 3.2);
    b.walkway(14, 0, 40.8, 0, 0, 3.2);
    b.walkway(0, 14, 0, 48.2, 0, 3.2);
    b.finish(scene);
  }

  /* ---------------- Jardín de Coral (oeste) ---------------- */
  {
    const cx = -55, cz = 0;
    const b = new Builder(game, REGIONS.coral);
    const p = b.pal;
    b.island(cx, cz, 0, 18, { seg: 12 });
    // Campana 1: torre con escalera en espiral
    const t1 = [cx - 7, cz - 8];
    const top1 = b.tower(t1[0], t1[1], 0, 3, 6, { roof: 'flat', windows: true });
    b.spiral(t1[0], t1[1], 0, 5, 1.05, 2.5, Math.PI * 0.5, Math.PI * 0.42);
    b.box(t1[0] - 0.9, top1, t1[1], 0.22, 1.7, 0.22, p.accent);
    b.box(t1[0] + 0.9, top1, t1[1], 0.22, 1.7, 0.22, p.accent);
    b.box(t1[0], top1 + 1.7, t1[1], 2.2, 0.22, 0.4, p.accent);
    spots.bells.push({ anchor: [t1[0], top1 + 1.7, t1[1]], freq: 660, region: 'coral' });
    // Campana 2: gran arco
    const a2 = [cx + 9, cz + 6];
    const archTop = b.arch(a2[0], a2[1], 0, 4.4, 4.6, 1.4, { ry: 0.6, pillar: 1.1 });
    spots.bells.push({ anchor: [a2[0], archTop - 1.25, a2[1]], freq: 784, region: 'coral' });
    // Campana 3: islote flotante con piedras-escalón
    const isl = [cx - 13, cz + 10.5, 5.2];
    const stones = [[cx - 5, 1.1, cz + 6.5], [cx - 7.6, 2.2, cz + 8.6], [cx - 9.4, 3.3, cz + 6.4], [cx - 11.2, 4.4, cz + 8.2]];
    for (const [x, y, z] of stones) { b.box(x, y - 0.4, z, 1.6, 0.4, 1.6, p.stone, {}); b.cyl(x, y - 1.6, z, 0, 1.2, p.rock, { rTop: 0.7, seg: 6, collide: false }); }
    b.island(isl[0], isl[1], isl[2], 3.2, { seg: 8 });
    b.box(isl[0] - 0.9, isl[2], isl[1], 0.22, 1.7, 0.22, p.accent);
    b.box(isl[0] + 0.9, isl[2], isl[1], 0.22, 1.7, 0.22, p.accent);
    b.box(isl[0], isl[2] + 1.7, isl[1], 2.2, 0.22, 0.4, p.accent);
    spots.bells.push({ anchor: [isl[0], isl[2] + 1.7, isl[1]], freq: 988, region: 'coral' });
    // decoración
    b.tower(cx + 4, cz - 11, 0, 2.4, 4.2, { roof: 'dome' });
    b.tower(cx - 15, cz - 2, 0, 2, 7.5, { roof: 'cone' });
    b.box(cx + 12, 0, cz - 4, 3.4, 1.4, 3.4, p.stone2, {});
    b.box(cx + 12, 1.4, cz - 4, 2.4, 1.0, 2.4, p.stone, {});
    b.dome(cx + 12, 2.4, cz - 4, 1.0, p.roof);
    for (const [x, z, s] of [[-3, 4, 1.1], [6, -3, 1], [-12, -9, 1.2], [2, 12, 0.9], [13, 6, 1], [-4, -14, 0.9], [9, 13, 0.8]]) b.tree(cx + x, 0, cz + z, s);
    b.finish(scene);
    spots.chests.push({ pos: [cx + 2, 0, cz - 9], region: 'coral' }, { pos: [isl[0] + 1.6, isl[2], isl[1] - 0.8], region: 'coral' });
    spots.crates.push([cx + 5, 0.5, cz + 2], [cx + 6.1, 0.5, cz + 2.3], [cx + 5.5, 1.5, cz + 2.1]);
    spots.spawnZones.push({ region: 'coral', c: [cx, cz], r: 15 });
  }

  /* ---------------- Torres de Menta (norte) ---------------- */
  {
    const cx = 0, cz = -60;
    const b = new Builder(game, REGIONS.menta);
    const p = b.pal;
    b.island(cx, cz, 0, 18, { seg: 12 });
    const towers = [
      { x: cx - 8, z: cz + 4, w: 3, h: 8, a0: 0.3 },
      { x: cx + 8, z: cz - 4, w: 3.4, h: 11, a0: 2.2 },
      { x: cx - 2, z: cz - 12, w: 3.8, h: 14, a0: 4.0 },
    ];
    for (const t of towers) {
      const top = b.tower(t.x, t.z, 0, t.w, t.h, { roof: 'flat' });
      const n = Math.ceil(t.h / 1.05) - 1;
      b.spiral(t.x, t.z, 0, n, 1.05, t.w / 2 + 1.2, t.a0, 0.95, { size: 1.4 });
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(t.x + dx * (t.w / 2 - 0.15), top, t.z + dz * (t.w / 2 - 0.15), 0.3, 0.5, 0.3, p.stone2, {});
      spots.fireflies.push({ pos: [t.x, top + 1.3, t.z], region: 'menta' });
    }
    b.tower(cx + 10, cz + 9, 0, 2, 5, { roof: 'cone' });
    b.tower(cx - 13, cz - 6, 0, 2.2, 6, { roof: 'dome' });
    b.arch(cx + 2, cz + 6, 0, 3, 3.4, 1, { ry: 0 });
    for (const [x, z, s] of [[5, 9, 1], [-12, 6, 1.1], [12, -10, 0.9], [-6, -16, 1], [14, 2, 0.9], [-15, -1, 1]]) b.tree(cx + x, 0, cz + z, s);
    b.finish(scene);
    spots.chests.push({ pos: [cx + 11, 0, cz + 4], region: 'menta' }, { pos: [cx - 2, 14.27, cz - 12], region: 'menta' });
    spots.crates.push([cx - 4, 0.5, cz + 10], [cx - 3, 0.5, cz + 10.4]);
    spots.spawnZones.push({ region: 'menta', c: [cx, cz], r: 15 });
  }

  /* ---------------- Puente de Lavanda (este) ---------------- */
  {
    const cx = 53, cz = 0;
    const b = new Builder(game, REGIONS.lavanda);
    const p = b.pal;
    b.island(cx, cz, 0, 13, { seg: 12 });
    // cristal A sobre pedestal
    b.cyl(cx - 3, 0, cz - 6, 0.7, 1.0, p.stone2, { seg: 8 });
    spots.crystals.push({ pos: [cx - 3, 1.9, cz - 6], region: 'lavanda' });
    // cristal B en lo alto de una torre
    const top = b.tower(cx + 4, cz + 6, 0, 2.6, 5, { roof: 'flat' });
    b.spiral(cx + 4, cz + 6, 0, 4, 1.05, 2.5, Math.PI, 1.0, { size: 1.4 });
    spots.crystals.push({ pos: [cx + 4, top + 0.9, cz + 6], region: 'lavanda' });
    // estribos del puente de tablones
    b.box(cx + 13.2, 0, cz, 1.6, 1.4, 0.4, p.stone2, { ry: 0 });
    b.cyl(cx + 12.6, 0, cz - 1.5, 0.25, 1.8, p.accent, { seg: 6 });
    b.cyl(cx + 12.6, 0, cz + 1.5, 0.25, 1.8, p.accent, { seg: 6 });
    // islote del altar
    const ax = 85;
    b.island(ax, cz, 0, 5, { seg: 8 });
    b.cyl(ax - 4.4, 0, cz - 1.5, 0.25, 1.8, p.accent, { seg: 6 });
    b.cyl(ax - 4.4, 0, cz + 1.5, 0.25, 1.8, p.accent, { seg: 6 });
    b.box(ax, 0, cz, 2.4, 0.3, 2.4, p.stone2, {});
    b.box(ax, 0.3, cz, 1.6, 0.3, 1.6, p.stone, {});
    b.cyl(ax, 0.6, cz, 0.35, 0.8, p.stone2, { seg: 8 });
    b.arch(ax + 2.6, cz, 0, 2.4, 3, 0.8, { ry: Math.PI / 2 });
    spots.altar = { pos: [ax, 2.1, cz] };
    spots.plankBridge = { from: [cx + 12.7, 0, cz], to: [ax - 4.6, 0, cz], width: 2.6 };
    b.tower(cx - 8, cz + 6, 0, 2, 4, { roof: 'dome' });
    for (const [x, z, s] of [[-6, -9, 1], [7, -7, 1.1], [-9, 1, 0.9], [2, 10, 0.8]]) b.tree(cx + x, 0, cz + z, s);
    b.finish(scene);
    spots.chests.push({ pos: [cx - 6, 0, cz + 2.5], region: 'lavanda' });
    spots.crates.push([cx + 2, 0.5, cz - 3]);
    spots.spawnZones.push({ region: 'lavanda', c: [cx, cz], r: 10 });
  }

  /* ---------------- Santuario de Nova (sur) ---------------- */
  {
    const cx = 0, cz = 65;
    const b = new Builder(game, REGIONS.nova);
    const p = b.pal;
    b.island(cx, cz, 0, 18, { seg: 12 });
    // muralla con portón en la entrada (z≈48)
    const wz = 48.4;
    b.box(-6.5, 0, wz, 10, 7, 1.4, p.stone, {});
    b.box(6.5, 0, wz, 10, 7, 1.4, p.stone, {});
    b.box(0, 4.4, wz, 3.2, 2.6, 1.4, p.stone, {});
    b.box(0, 7, wz, 23.4, 0.5, 1.8, p.stone2, {});
    for (const x of [-10, -6, 6, 10]) b.window(x, 2.2, wz - 0.71, 0, 0.6, 1.2, p.win);
    for (const x of [-11.2, -1.9, 1.9, 11.2]) { b.cyl(x, 7.5, wz, 0.5, 0.6, p.stone2, { seg: 8 }); b.cone(x, 8.1, wz, 0.5, 1.6, p.accent, { seg: 8 }); }
    spots.gate = { pos: [0, 0, wz], w: 3.2, h: 4.4, d: 0.8 };
    // anillo de pilares y estrella
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const x = cx + Math.cos(a) * 13.5, z = cz + Math.sin(a) * 13.5;
      if (z < cz - 11 && Math.abs(x) < 4) continue;
      b.cyl(x, 0, z, 0.55, 5.5, p.stone, { seg: 8 });
      b.cyl(x, 5.5, z, 0.75, 0.35, p.stone2, { seg: 8 });
    }
    b.cyl(cx, 0, cz, 3.2, 0.3, p.stone2, { seg: 10 });
    b.cyl(cx, 0.3, cz, 2.2, 0.3, p.stone, { seg: 10 });
    b.box(cx - 9, 0, cz + 2, 3, 1.2, 3, p.stone2, {});
    b.box(cx + 9, 0, cz + 2, 3, 1.2, 3, p.stone2, {});
    b.box(cx, 0, cz + 10, 4, 2.2, 2, p.stone2, {});
    for (const [x, z, s] of [[-14, 6, 1], [14, 6, 1], [-8, 14, 0.9], [8, 14, 0.9]]) b.tree(cx + x, 0, cz + z, s);
    b.finish(scene);
    spots.arena = { c: [cx, cz], r: 16, enter: cz - 12 };
    spots.novaStar = [cx, 0.6, cz];
  }

  return spots;
}
