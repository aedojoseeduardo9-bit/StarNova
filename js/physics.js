/* Star Nova — capa de físicas (Rapier 3D).
 * Todo lo que se mueve o choca pasa por aquí: suelo y arquitectura (fijos),
 * Pip y enemigos (cinemáticos con controlador de personaje), proyectiles,
 * campanas, puentes de tablones, cajas y esquirlas (dinámicos). */
import R from 'rapier';

export { R };
export const GRAVITY = -22;

/* Grupos de colisión (bits). */
export const G = {
  TERRAIN: 1, PLAYER: 2, ENEMY: 4, PROJ: 8, DEBRIS: 16, PROP: 32, PICKUP: 64, EPROJ: 128, GATE: 256,
};
export const ALL = 0xffff;
export const groups = (member, filter) => ((member & 0xffff) << 16) | (filter & 0xffff);

export async function initPhysics() { await R.init(); }

export class Physics {
  constructor() {
    this.world = new R.World({ x: 0, y: GRAVITY, z: 0 });
    this.world.timestep = 1 / 60;
    this.events = new R.EventQueue(true);
    this.owners = new Map();           // handle de colisionador -> objeto del juego
    this.fixed = this.world.createRigidBody(R.RigidBodyDesc.fixed());
    this.cc = this.makeController();    // controlador de Pip
    this.ccEnemy = this.makeController(); // compartido por enemigos que caminan
    this.ccEnemy.setApplyImpulsesToDynamicBodies(false);
  }

  makeController() {
    const cc = this.world.createCharacterController(0.02);
    cc.setUp({ x: 0, y: 1, z: 0 });
    cc.setMaxSlopeClimbAngle(52 * Math.PI / 180);
    cc.setMinSlopeSlideAngle(40 * Math.PI / 180);
    cc.enableAutostep(0.32, 0.12, true);
    cc.enableSnapToGround(0.3);
    cc.setSlideEnabled(true);
    cc.setApplyImpulsesToDynamicBodies(true);
    cc.setCharacterMass(1.2);
    return cc;
  }

  own(collider, obj) { this.owners.set(collider.handle, obj); return collider; }
  ownerOf(handle) { return this.owners.get(handle); }

  /* Colisionador fijo (arquitectura, islas). */
  fixedCollider(desc, owner) {
    desc.setCollisionGroups(groups(G.TERRAIN, ALL));
    const c = this.world.createCollider(desc, this.fixed);
    if (owner) this.own(c, owner);
    return c;
  }

  removeBody(body) {
    if (!body) return;
    for (let i = 0; i < body.numColliders(); i++) this.owners.delete(body.collider(i).handle);
    this.world.removeRigidBody(body);
  }

  /* Rayo contra el escenario; devuelve {point, normal, toi, collider} o null. */
  ray(origin, dir, maxToi, filterGroups = groups(ALL, G.TERRAIN | G.PROP | G.GATE), exclude) {
    const ray = new R.Ray(origin, dir);
    const hit = this.world.castRayAndGetNormal(ray, maxToi, true, R.QueryFilterFlags.EXCLUDE_SENSORS, filterGroups, exclude);
    if (!hit) return null;
    return {
      toi: hit.timeOfImpact,
      point: { x: origin.x + dir.x * hit.timeOfImpact, y: origin.y + dir.y * hit.timeOfImpact, z: origin.z + dir.z * hit.timeOfImpact },
      normal: hit.normal,
      collider: hit.collider,
    };
  }

  step(onCollision) {
    this.world.step(this.events);
    this.events.drainCollisionEvents((h1, h2, started) => {
      if (!started) return;
      const a = this.owners.get(h1), b = this.owners.get(h2);
      if (onCollision) onCollision(a, b, h1, h2);
    });
  }
}
