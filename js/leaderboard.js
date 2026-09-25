// Online žebříček přes Supabase (REST API přímo přes fetch, bez knihovny).
// Posílá se jen nový osobní rekord hráče – žebříček stejně ukazuje nejlepší výsledek
// každého hráče. Bez připojení se rekord podrží v localStorage a odešle se později.
const API = 'https://gpwsguxfjmmcipcrqcdk.supabase.co/rest/v1';
const KEY = 'sb_publishable_XvsWw-EmDNIqF2gK2cayvQ_jWgjnx_i'; // veřejný klíč, smí být v kódu
export const TOP_COUNT = 10;
export const NICK_MAX = 16;

async function api(path, { headers, ...opts } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(API + path, {
      ...opts,
      headers: { apikey: KEY, 'Content-Type': 'application/json', ...headers },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // crypto.randomUUID chybí mimo HTTPS (např. test na telefonu přes http://192.168…)
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Oříznutí mezer a délky (počítá znaky jako Postgres char_length, tedy i emoji jako 1). */
export function cleanNick(name) {
  return Array.from(String(name).replace(/\s+/g, ' ').trim()).slice(0, NICK_MAX).join('');
}

export class Leaderboard {
  constructor(storage) {
    this.storage = storage;
    const lb = this.lb;
    if (!lb.playerId) lb.playerId = uuid();
    // rekord uhraný ještě před zavedením žebříčku se odešle hned po zadání přezdívky
    if (!lb.sentBest && !lb.pending && storage.best > 0) {
      const perChar = storage.data.perChar;
      const character = Object.keys(perChar).sort((a, b) => perChar[b] - perChar[a])[0] || storage.character;
      lb.pending = { character, score: storage.best, distance: 0, boxes: 0 };
    }
    storage.save();
    this.flushing = null;
  }

  get lb() { return this.storage.leaderboard; }
  get playerId() { return this.lb.playerId; }
  get nick() { return this.lb.nick || ''; }
  /** Nejlepší skóre, které už je v žebříčku. */
  get best() { return this.lb.sentBest || 0; }
  get character() { return this.lb.last?.character || this.storage.character; }

  setNick(name) {
    const nick = cleanNick(name);
    if (!nick || nick === this.nick) return false;
    this.lb.nick = nick;
    // přezdívka se v žebříčku bere z posledního záznamu -> poslat rekord znovu pod novým jménem
    if (!this.lb.pending && this.lb.last) this.lb.pending = this.lb.last;
    this.storage.save();
    return true;
  }

  /** Uloží výsledek běhu, pokud je to nový osobní rekord, a zkusí ho odeslat. */
  submit(res) {
    const lb = this.lb;
    if (res.score > this.best && res.score > (lb.pending?.score || 0)) {
      lb.pending = { character: res.character.id, score: res.score, distance: res.distance, boxes: res.boxes };
      this.storage.save();
    }
    return this.flush();
  }

  /** Odešle čekající rekord. Bez přezdívky nedělá nic, při chybě sítě vyhodí výjimku. */
  flush() {
    if (!this.flushing) this.flushing = this.send().finally(() => { this.flushing = null; });
    return this.flushing;
  }

  async send() {
    const lb = this.lb;
    const entry = lb.pending;
    if (!entry || !this.nick) return;
    await api('/scores', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ player_id: lb.playerId, nickname: this.nick, ...entry }),
    });
    lb.sentBest = Math.max(this.best, entry.score);
    lb.last = entry;
    if (lb.pending === entry) lb.pending = null;
    this.storage.save();
  }

  /** TOP hráči: [{player_id, nickname, character, score}] */
  async top() {
    const res = await api(`/leaderboard?select=player_id,nickname,character,score&order=score.desc,created_at.asc&limit=${TOP_COUNT}`);
    return res.json();
  }

  /** Umístění hráče podle jeho rekordu v žebříčku (null, když tam ještě není). */
  async rank() {
    if (!this.best) return null;
    const res = await api(`/leaderboard?select=player_id&score=gt.${this.best}&limit=1`, {
      method: 'HEAD',
      headers: { Prefer: 'count=exact' },
    });
    const total = Number(res.headers.get('content-range')?.split('/')[1]);
    return Number.isFinite(total) ? total + 1 : null;
  }
}
