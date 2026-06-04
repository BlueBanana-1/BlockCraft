export class Controls {
  constructor() {
    this.keys = {};
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.isLocked = false;
    this.sensitivity = 0.0020;

    // One-shot per-frame click events
    this.leftClickThisFrame = false;
    this.rightClickThisFrame = false;

    // Hotbar digit pressed this frame (0-8 for slots 1-9, or -1)
    this.hotbarKeyThisFrame = -1;
    this.scrollDelta = 0;

    // One-shot view toggle (R key)
    this.viewToggleThisFrame = false;
  }

  init(canvas) {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      // Prevent browser defaults for game keys
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      // Digit keys 1-9 → hotbar slots 0-8
      if (e.code.startsWith('Digit')) {
        const d = parseInt(e.code[5]);
        if (d >= 1 && d <= 9) this.hotbarKeyThisFrame = d - 1;
      }
      if (e.code === 'KeyR') this.viewToggleThisFrame = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousedown', (e) => {
      if (!this.isLocked) return;
      if (e.button === 0) this.leftClickThisFrame = true;
      if (e.button === 2) this.rightClickThisFrame = true;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isLocked) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });

    window.addEventListener('wheel', (e) => {
      if (this.isLocked) this.scrollDelta += e.deltaY;
    }, { passive: true });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === canvas;
    });
  }

  requestPointerLock(canvas) {
    canvas.requestPointerLock();
  }

  isKeyDown(code) { return !!this.keys[code]; }

  consumeMouseDeltas() {
    const dx = this.mouseDX, dy = this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;
    return { dx, dy };
  }

  consumeClicks() {
    const left = this.leftClickThisFrame;
    const right = this.rightClickThisFrame;
    this.leftClickThisFrame = false;
    this.rightClickThisFrame = false;
    return { left, right };
  }

  consumeHotbarKey() {
    const k = this.hotbarKeyThisFrame;
    this.hotbarKeyThisFrame = -1;
    return k;
  }

  consumeScroll() {
    const s = this.scrollDelta;
    this.scrollDelta = 0;
    return s;
  }

  consumeViewToggle() {
    const v = this.viewToggleThisFrame;
    this.viewToggleThisFrame = false;
    return v;
  }
}
