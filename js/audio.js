// Jednoduché zvukové efekty generované přes Web Audio API (žádné soubory).
export class Sfx {
  constructor(muted = false) {
    this.muted = muted;
    this.ctx = null;
    const unlock = () => this.unlock();
    // Zvuk jde spustit až po interakci uživatele (hlavně iOS).
    for (const ev of ['touchend', 'pointerdown', 'keydown']) window.addEventListener(ev, unlock, { passive: true });
  }

  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
        // bílý šum pro náraz / skluz
        const len = this.ctx.sampleRate * 0.5;
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch { /* bez zvuku */ }
  }

  setMuted(m) { this.muted = m; }

  ok() { return this.ctx && !this.muted && this.ctx.state === 'running'; }

  tone(type, f0, f1, dur, vol = 0.3, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noiseBurst(dur, vol, freq, type = 'lowpass') {
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t); s.stop(t + dur);
  }

  play(name) {
    if (!this.ok()) return;
    try {
      switch (name) {
        case 'jump': this.tone('square', 260, 620, 0.16, 0.16); break;
        case 'slide': this.noiseBurst(0.25, 0.35, 1400, 'bandpass'); break;
        case 'lane': this.tone('sine', 520, 700, 0.06, 0.08); break;
        case 'box':
          this.tone('triangle', 880, 1100, 0.07, 0.22);
          this.tone('triangle', 1320, 1760, 0.09, 0.2, 0.06);
          break;
        case 'bump':
          this.tone('sawtooth', 180, 90, 0.15, 0.25);
          this.noiseBurst(0.1, 0.3, 800);
          break;
        case 'crash':
          this.noiseBurst(0.45, 0.8, 900);
          this.tone('sawtooth', 220, 40, 0.5, 0.35);
          break;
        case 'click': this.tone('sine', 660, 880, 0.05, 0.12); break;
        case 'record':
          [523, 659, 784, 1046].forEach((f, i) => this.tone('triangle', f, f * 1.01, 0.18, 0.2, i * 0.11));
          break;
        case 'count': this.tone('sine', 700, 700, 0.12, 0.2); break;
        case 'go': this.tone('sine', 1050, 1050, 0.2, 0.22); break;
      }
    } catch { /* ignorovat */ }
  }
}
