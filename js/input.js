// Ovládání: swipe (reaguje už během pohybu prstu) + klávesnice.
export class Input {
  /**
   * @param {(action:'left'|'right'|'up'|'down') => void} onAction
   * @param {() => void} onPause
   */
  constructor(onAction, onPause) {
    this.onAction = onAction;
    this.onPause = onPause;
    this.enabled = false;
    this.touch = null;

    const opts = { passive: false };
    window.addEventListener('touchstart', e => this.start(e), opts);
    window.addEventListener('touchmove', e => this.move(e), opts);
    window.addEventListener('touchend', e => this.end(e), opts);
    window.addEventListener('touchcancel', e => this.end(e), opts);
    window.addEventListener('keydown', e => this.key(e));
    // Myší tah na desktopu (pro testování bez klávesnice)
    window.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') this.begin(e.clientX, e.clientY, 'mouse', e.target); });
    window.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && this.touch?.id === 'mouse') this.drag(e.clientX, e.clientY); });
    window.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') this.touch = null; });
  }

  threshold() {
    // ~5 % kratší strany displeje, min 22 px – citlivé, ale bez náhodných spuštění
    return Math.max(22, Math.min(window.innerWidth, window.innerHeight) * 0.05);
  }

  begin(x, y, id, target) {
    if (!this.enabled || target?.closest?.('button')) { this.touch = null; return; }
    this.touch = { id, x, y, t: performance.now() };
  }

  drag(x, y) {
    const t = this.touch;
    if (!t || t.fired || !this.enabled) return;
    const dx = x - t.x, dy = y - t.y;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ax, ay) < this.threshold()) return;
    let action;
    if (ax > ay) action = dx > 0 ? 'right' : 'left';
    else action = dy > 0 ? 'down' : 'up';
    this.onAction(action);
    // Jeden dotyk = jedna akce, nezávisle na délce tahu. Další až po zvednutí prstu.
    t.fired = true;
  }

  start(e) {
    const tch = e.changedTouches[0];
    if (!tch) return;
    this.begin(tch.clientX, tch.clientY, tch.identifier, e.target);
    if (this.touch) e.preventDefault();
  }

  move(e) {
    if (!this.touch) return;
    for (const tch of e.changedTouches) {
      if (tch.identifier === this.touch.id) { this.drag(tch.clientX, tch.clientY); break; }
    }
    e.preventDefault();
  }

  end(e) {
    if (!this.touch) return;
    for (const tch of e.changedTouches) {
      if (tch.identifier === this.touch.id) { this.touch = null; break; }
    }
  }

  key(e) {
    const k = e.key;
    const map = {
      ArrowLeft: 'left', a: 'left', A: 'left',
      ArrowRight: 'right', d: 'right', D: 'right',
      ArrowUp: 'up', w: 'up', W: 'up', ' ': 'up',
      ArrowDown: 'down', s: 'down', S: 'down',
    };
    if (k === 'Escape' || k === 'p' || k === 'P') { this.onPause(); return; }
    const action = map[k];
    if (!action) return;
    if (e.target?.tagName === 'BUTTON' && k === ' ') e.preventDefault();
    if (!this.enabled) return;
    e.preventDefault();
    if (e.repeat) return;
    this.onAction(action);
  }
}
