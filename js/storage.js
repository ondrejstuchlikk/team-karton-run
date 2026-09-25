// Uložení rekordů a nastavení do localStorage (vše obalené v try/catch –
// v anonymním režimu nebo při zakázaném úložišti hra běží dál bez ukládání).
const KEY = 'teamKartonRun.v1';

const defaults = () => ({ best: 0, perChar: {}, character: 'ondra', muted: false, kartony: 0 });

export class Storage {
  constructor() {
    this.data = defaults();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) Object.assign(this.data, JSON.parse(raw));
    } catch { /* nedostupné úložiště */ }
    if (typeof this.data.perChar !== 'object' || !this.data.perChar) this.data.perChar = {};
    if (!Number.isFinite(this.data.kartony)) this.data.kartony = 0;
    // požádat prohlížeč, ať data nemaže při nedostatku místa (když to nepovolí, nic se neděje)
    try { navigator.storage?.persist?.().catch(() => {}); } catch { /* nepodporováno */ }
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignorovat */ }
  }

  get best() { return this.data.best || 0; }
  bestFor(id) { return this.data.perChar[id] || 0; }

  get character() { return this.data.character; }
  set character(id) { this.data.character = id; this.save(); }

  get muted() { return !!this.data.muted; }
  set muted(m) { this.data.muted = m; this.save(); }

  /** Nasbírané kartony ze všech běhů dohromady (peněženka). */
  get kartony() { return this.data.kartony; }

  addKartony(n) {
    if (!(n > 0)) return;
    this.data.kartony += n;
    this.save();
  }

  /** Zapíše výsledek, vrátí {newBest, newCharBest}. */
  record(id, score) {
    const newBest = score > this.best;
    const newCharBest = score > this.bestFor(id);
    if (newBest) this.data.best = score;
    if (newCharBest) this.data.perChar[id] = score;
    if (newBest || newCharBest) this.save();
    return { newBest, newCharBest };
  }
}
