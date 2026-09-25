// Ovládání HTML obrazovek (menu, výběr postavy, HUD, pauza, konec hry).
import { CHARACTERS, avatarURL, getCharacter } from './characters.js';

const $ = id => document.getElementById(id);

const SCREENS_FOR_STATE = {
  menu: ['menu'],
  select: ['select'],
  ready: ['hud', 'tip'],
  intro: ['hud'],
  playing: ['hud'],
  countdown: ['hud'],
  paused: ['hud', 'pause'],
  dying: ['hud'],
  over: ['over'],
};

const ICON_SOUND_ON = '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>';
const ICON_SOUND_OFF = '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';

export class UI {
  constructor(h) {
    this.h = h;
    const click = (id, fn) => $(id).addEventListener('click', e => { e.preventDefault(); h.click?.(); fn(); });
    click('btnPlay', h.play);
    click('btnSelectPlay', h.play);
    click('btnChar', h.openSelect);
    click('btnBack', h.back);
    click('btnPause', h.pause);
    click('btnResume', h.resume);
    click('btnQuit', h.quit);
    click('btnAgain', h.play);
    click('btnChange', h.openSelect);
    click('btnMute', h.toggleMute);
    click('btnPauseMute', h.toggleMute);
    click('btnFull', h.fullscreen);
    click('btnBoard', h.openBoard);
    click('btnOverBoard', h.openBoard);
    click('btnBoardClose', () => this.hideBoard());
    click('btnNickEdit', () => this.showNickForm(true));
    $('nickForm').addEventListener('submit', e => {
      e.preventDefault();
      h.click?.();
      $('nickInput').blur();
      h.saveNick($('nickInput').value);
    });
    // nápověda před startem: klepnutí kamkoli = start
    $('tip').addEventListener('click', e => { e.preventDefault(); h.click?.(); h.go(); });

    this.score = $('hudScore');
    this.boxes = $('hudBoxes');
    this.boxesWrap = $('hudBoxesWrap');
    this.kratom = $('hudKratom');
    this.kratomWrap = $('hudKratomWrap');
    this.countdownEl = $('countdown');
    this.hintEl = $('hint');

    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    document.body.classList.toggle('touch', touch);
    this.hintEl.innerHTML = touch
      ? '<span>←</span><span>→</span><span>↑</span><span>↓</span><small>Swipni prstem</small>'
      : '<span>←</span><span>→</span><span>↑</span><span>↓</span><small>Šipky nebo WASD</small>';
  }

  setTipImages(t) {
    $('tipCup').src = t.kratom;
    $('tipBottle').src = t.bottle;
    $('tipBarrel').src = t.barrel;
  }

  hideLoading() { $('loading').classList.remove('show'); }

  loadingError(msg) { $('loadingText').textContent = msg; }

  showState(state) {
    const show = SCREENS_FOR_STATE[state] || [];
    for (const id of ['menu', 'select', 'hud', 'tip', 'pause', 'over']) {
      $(id).classList.toggle('show', show.includes(id));
    }
    document.body.dataset.state = state;
    this.hideBoard();
    if (state === 'intro') this.flashHint();
    if (!['countdown', 'playing', 'intro'].includes(state)) this.countdownEl.classList.remove('show');
  }

  flashHint() {
    const el = this.hintEl;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  buildCards(currentId, storage) {
    const wrap = $('cards');
    wrap.innerHTML = '';
    this.cards = {};
    for (const ch of CHARACTERS) {
      const b = document.createElement('button');
      b.className = 'card';
      b.style.setProperty('--c', ch.color);
      b.innerHTML = `
        <img src="${avatarURL(ch, 160)}" alt="">
        <div class="card-name">${ch.name}</div>
        <div class="card-tag">${ch.tagline}</div>
        <div class="card-best">🏆 ${storage.bestFor(ch.id)}</div>`;
      b.addEventListener('click', e => { e.preventDefault(); this.h.click?.(); this.h.selectChar(ch.id); });
      wrap.appendChild(b);
      this.cards[ch.id] = b;
    }
    this.markSelected(currentId);
  }

  markSelected(id) {
    for (const [k, el] of Object.entries(this.cards || {})) el.classList.toggle('selected', k === id);
  }

  setCharacter(ch) {
    $('menuCharName').textContent = ch.name;
    $('menuAvatar').src = avatarURL(ch, 96);
    $('hudAvatar').src = avatarURL(ch, 96);
    document.documentElement.style.setProperty('--char', ch.color);
    this.markSelected(ch.id);
  }

  setBest(best) { $('menuBest').textContent = best; }

  setKartony(n) { $('menuKartony').textContent = n; }

  setMuted(m) {
    $('btnMute').innerHTML = m ? ICON_SOUND_OFF : ICON_SOUND_ON;
    $('btnPauseMute').textContent = m ? '🔇 Zvuk vyp.' : '🔊 Zvuk zap.';
  }

  setFullscreenAvailable(ok) { $('btnFull').style.display = ok ? '' : 'none'; }

  hud(score, boxes, kratoms) {
    this.score.textContent = score;
    this.counter(this.boxes, this.boxesWrap, boxes);
    this.counter(this.kratom, this.kratomWrap, kratoms);
  }

  counter(el, wrap, n) {
    if (el.textContent === String(n)) return;
    el.textContent = n;
    if (n > 0) {
      wrap.classList.remove('pop');
      void wrap.offsetWidth;
      wrap.classList.add('pop');
    }
  }

  boost(on) { this.kratomWrap.classList.toggle('boost', on); }

  countdown(n) {
    const el = this.countdownEl;
    el.textContent = n > 0 ? n : 'BĚŽ!';
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  // ---------- žebříček ----------

  get boardOpen() { return $('board').classList.contains('show'); }

  showBoard(nick) {
    $('board').classList.add('show');
    this.setNick(nick);
    $('boardList').replaceChildren();
    this.boardStatus('Načítám…');
  }

  hideBoard() { $('board').classList.remove('show'); }

  setNick(nick) {
    $('boardNick').textContent = nick;
    $('nickInput').value = nick;
    this.showNickForm(!nick);
  }

  showNickForm(on) {
    $('nickForm').style.display = on ? '' : 'none';
    $('boardMe').style.display = on || !$('boardNick').textContent ? 'none' : '';
    // na mobilu by automatická klávesnice zakryla žebříček, takže fokus jen na počítači
    if (on && !document.body.classList.contains('touch')) $('nickInput').focus();
  }

  boardStatus(text) { $('boardStatus').textContent = text; }

  /**
   * @param rows TOP hráči z žebříčku
   * @param meId player_id tohoto hráče
   * @param me {rank, nickname, character, score} – vlastní řádek, když hráč není v TOP
   */
  renderBoard(rows, meId, me) {
    const list = $('boardList');
    const row = (rank, r, isMe) => {
      const li = document.createElement('li');
      li.classList.toggle('me', isMe);
      const ch = getCharacter(r.character);
      const img = new Image();
      img.src = avatarURL(ch, 64);
      img.style.background = ch.color;
      img.alt = '';
      const cells = [['rank', `${rank}.`], ['name', r.nickname], ['pts', r.score]]
        .map(([cls, text]) => {
          const el = document.createElement(cls === 'pts' ? 'b' : 'span');
          el.className = cls;
          el.textContent = text; // přezdívky píší hráči -> jen textContent, nikdy innerHTML
          return el;
        });
      li.append(cells[0], img, cells[1], cells[2]);
      return li;
    };
    const items = rows.map((r, i) => row(i + 1, r, r.player_id === meId));
    if (me) {
      const gap = document.createElement('li');
      gap.className = 'gap';
      gap.textContent = '⋮';
      items.push(gap, row(me.rank, me, true));
    }
    list.replaceChildren(...items);
    this.boardStatus(rows.length ? '' : 'Zatím tu nikdo není. Buď první! 🏃');
  }

  /** Řádek s umístěním na obrazovce konce hry (text může obsahovat <b>). */
  setOverRank(html) { $('overRank').innerHTML = html || ''; }

  gameOver(res, rec, storage) {
    const ch = res.character;
    $('overAvatar').src = avatarURL(ch, 160);
    $('overAvatar').style.borderColor = ch.color;
    $('overScore').textContent = res.score;
    $('overDist').textContent = res.distance + ' m';
    $('overBoxes').textContent = res.boxes;
    $('overKratom').textContent = res.kratoms;
    $('overBest').textContent = storage.best;
    $('overCharLabel').textContent = `Rekord (${ch.name})`;
    $('overCharBest').textContent = storage.bestFor(ch.id);
    const nb = $('overNew');
    nb.textContent = rec.newBest ? '🏆 NOVÝ REKORD!' : `⭐ Nový rekord pro ${ch.gen}!`;
    nb.classList.toggle('show', rec.newBest || rec.newCharBest);
    $('overWallet').textContent = storage.kartony;
    this.setBest(storage.best);
    this.setKartony(storage.kartony);
  }
}
