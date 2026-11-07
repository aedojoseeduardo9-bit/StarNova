/* Star Nova — entrada: teclado + ratón (con bloqueo de puntero) y controles táctiles en horizontal.
 * Capa de acciones abstractas: el juego solo pregunta por "jump", "primary", etc. */
const ACTIONS = ['jump', 'primary', 'secondary', 'utility', 'special', 'interact', 'journal', 'pause', 'mute', 'track'];

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.held = {}; this.pressed = {};
    for (const a of ACTIONS) { this.held[a] = false; this.pressed[a] = false; }
    this.keys = new Set();
    this.mx = 0; this.my = 0;
    this.lookDX = 0; this.lookDY = 0;
    this.zoom = 0;
    this.touch = false;
    this.locked = false;
    this.enabled = false;
    this.stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.lookTouch = { id: null, x: 0, y: 0 };
    this.bindKeyboard();
    this.bindMouse();
    this.bindTouch();
  }

  setAction(a, down) {
    if (down && !this.held[a]) this.pressed[a] = true;
    this.held[a] = down;
  }
  consume() { for (const a of ACTIONS) this.pressed[a] = false; this.lookDX = 0; this.lookDY = 0; this.zoom = 0; }

  bindKeyboard() {
    const map = {
      Space: 'jump', ShiftLeft: 'utility', ShiftRight: 'utility', KeyR: 'special', KeyQ: 'secondary', KeyF: 'secondary',
      KeyE: 'interact', Enter: 'interact', Tab: 'journal', Escape: 'pause', KeyP: 'pause', KeyM: 'mute', KeyT: 'track',
      KeyJ: 'primary', KeyK: 'secondary',
    };
    addEventListener('keydown', (e) => {
      if (e.code === 'Tab') e.preventDefault();
      this.keys.add(e.code);
      const a = map[e.code];
      if (a) this.setAction(a, true);
      this.updateMove();
    });
    addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      const a = map[e.code];
      if (a) this.setAction(a, false);
      this.updateMove();
    });
    addEventListener('blur', () => { this.keys.clear(); for (const a of ACTIONS) this.held[a] = false; this.updateMove(); });
  }
  updateMove() {
    if (this.stick.id !== null) return;
    const k = this.keys;
    this.mx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    this.my = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
  }

  bindMouse() {
    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('mousedown', (e) => {
      if (this.touch || !this.enabled) return;
      if (!this.locked && c.requestPointerLock) { try { c.requestPointerLock(); } catch (err) { /* sin bloqueo */ } }
      if (e.button === 0) this.setAction('primary', true);
      if (e.button === 2) this.setAction('secondary', true);
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) this.setAction('primary', false);
      if (e.button === 2) this.setAction('secondary', false);
    });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === c; });
    addEventListener('mousemove', (e) => {
      if (this.touch) return;
      if (this.locked) { this.lookDX += e.movementX * 0.0024; this.lookDY += e.movementY * 0.0024; }
    });
    c.addEventListener('wheel', (e) => { this.zoom += Math.sign(e.deltaY); }, { passive: true });
  }

  enableTouchUI() {
    if (this.touch) return;
    this.touch = true;
    document.body.classList.add('is-touch');
    document.getElementById('touch').classList.remove('hidden');
  }

  bindTouch() {
    const zone = document.getElementById('stickZone');
    const base = document.getElementById('stickBase');
    const knob = document.getElementById('stickKnob');
    addEventListener('touchstart', () => this.enableTouchUI(), { passive: true, once: true });
    const R = 52;
    zone.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      this.enableTouchUI();
      zone.setPointerCapture(e.pointerId);
      const r = zone.getBoundingClientRect();
      this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
      base.style.left = (e.clientX - r.left) + 'px';
      base.style.top = (e.clientY - r.top) + 'px';
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.stick.id) return;
      let dx = e.clientX - this.stick.ox, dy = e.clientY - this.stick.oy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.mx = dx / R; this.my = -dy / R;
    });
    const end = (e) => {
      if (e.pointerId !== this.stick.id) return;
      this.stick.id = null; this.mx = 0; this.my = 0;
      knob.style.transform = '';
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    // mirar: arrastrar en cualquier parte del lienzo (lado derecho)
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      this.enableTouchUI();
      if (this.lookTouch.id !== null) return;
      this.lookTouch = { id: e.pointerId, x: e.clientX, y: e.clientY };
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookTouch.id) return;
      this.lookDX += (e.clientX - this.lookTouch.x) * 0.0062;
      this.lookDY += (e.clientY - this.lookTouch.y) * 0.0062;
      this.lookTouch.x = e.clientX; this.lookTouch.y = e.clientY;
    });
    const endLook = (e) => { if (e.pointerId === this.lookTouch.id) this.lookTouch.id = null; };
    c.addEventListener('pointerup', endLook);
    c.addEventListener('pointercancel', endLook);

    // botones de acción (también permiten mirar arrastrando el dedo desde el botón de ataque)
    document.querySelectorAll('.tb').forEach((b) => {
      const a = b.dataset.k;
      let id = null, lx = 0, ly = 0;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.enableTouchUI();
        id = e.pointerId; lx = e.clientX; ly = e.clientY;
        b.setPointerCapture(e.pointerId);
        b.classList.add('active');
        this.setAction(a, true);
      });
      b.addEventListener('pointermove', (e) => {
        if (e.pointerId !== id || a !== 'primary') return;
        this.lookDX += (e.clientX - lx) * 0.0062; this.lookDY += (e.clientY - ly) * 0.0062;
        lx = e.clientX; ly = e.clientY;
      });
      const up = (e) => { if (e.pointerId !== id) return; id = null; b.classList.remove('active'); this.setAction(a, false); };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
    });
  }
}
