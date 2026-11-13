/* Star Nova — probador: dibuja a Pip con un traje en un lienzo 2D (miniaturas y vista previa giratoria).
 * No crea otro contexto WebGL: usa el renderizador del juego, pinta en una esquina y copia la imagen.
 * Por eso draw() debe llamarse ANTES del dibujo normal del cuadro (que vuelve a cubrir todo el lienzo). */
import * as THREE from 'three';
import { makePip, PipAnimator } from './entities/pip.js';
import { applyOutfit } from './entities/outfits.js';

export class Wardrobe {
  constructor(game) {
    this.game = game;
    const s = this.scene = new THREE.Scene();
    s.background = new THREE.Color('#fff3e6');
    s.add(new THREE.HemisphereLight('#fff6ee', '#e6bccb', 1.3));
    const sun = new THREE.DirectionalLight('#fff1df', 1.9);
    sun.position.set(-1.6, 3, 2.6);
    s.add(sun);
    this.cam = new THREE.PerspectiveCamera(27, 1, 0.05, 20);
    this.cam.position.set(0, 0.56, 2.9);
    this.cam.lookAt(0, 0.4, 0);
    this.model = makePip();
    this.anim = new PipAnimator(this.model);
    this.anim.lookT = 1e9;                       // en el probador Pip no mira a los lados
    s.add(this.model);
    this.zero = new THREE.Vector3();
    this.size = new THREE.Vector2();
  }

  draw(canvas, id, yaw, dt = 0) {
    const r = this.game.renderer, gl = r.domElement;
    if ((this.model.userData.outfit || null) !== (id || null)) applyOutfit(this.model, id);
    this.anim.update(dt, { pos: this.zero, yaw, speed: 0, grounded: true, vy: 0, dash: 0, spin: 0, tailSpin: 0, invulnBlink: false });
    const pr = r.getPixelRatio();
    const px = Math.min(canvas.width, gl.width, gl.height);       // lado en píxeles reales
    const css = px / pr;
    r.getSize(this.size);
    r.setViewport(0, 0, css, css);
    r.setScissor(0, 0, css, css);
    r.setScissorTest(true);
    r.render(this.scene, this.cam);
    r.setScissorTest(false);
    r.setViewport(0, 0, this.size.x, this.size.y);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(gl, 0, gl.height - px, px, px, 0, 0, canvas.width, canvas.height);
  }
}
