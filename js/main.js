// Vstupní bod: propojí hru, UI, ovládání, zvuk a úložiště.
import { Game } from './game.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import { Storage } from './storage.js';
import { Leaderboard } from './leaderboard.js';
import { getCharacter } from './characters.js';
import { renderThumbs } from './obstacles.js';

const storage = new Storage();
const board = new Leaderboard(storage);
const sfx = new Sfx(storage.muted);
let character = getCharacter(storage.character);

function fullscreenSupported() {
  const d = document.documentElement;
  return !!(d.requestFullscreen || d.webkitRequestFullscreen) && (document.fullscreenEnabled ?? document.webkitFullscreenEnabled ?? true);
}

function toggleFullscreen() {
  const d = document.documentElement;
  const isFs = document.fullscreenElement || document.webkitFullscreenElement;
  try {
    if (isFs) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else {
      const p = (d.requestFullscreen || d.webkitRequestFullscreen).call(d, { navigationUI: 'hide' });
      p?.then?.(() => screen.orientation?.lock?.('portrait').catch(() => {})).catch(() => {});
    }
  } catch { /* nepodporováno */ }
}

const ui = new UI({
  click: () => sfx.play('click'),
  play: () => game.start(),
  go: () => game.go(),
  openSelect: () => { ui.buildCards(character.id, storage); game.showSelect(); },
  back: () => game.showMenu(),
  selectChar: id => {
    character = getCharacter(id);
    storage.character = id;
    game.setCharacter(character);
    ui.setCharacter(character);
  },
  pause: () => game.pause(),
  resume: () => game.resume(),
  quit: () => {
    // kartony z rozběhnutého běhu se neztratí ani při odchodu do menu
    storage.addKartony(game.boxes);
    ui.setKartony(storage.kartony);
    game.showMenu();
  },
  toggleMute: () => {
    storage.muted = !storage.muted;
    sfx.setMuted(storage.muted);
    ui.setMuted(storage.muted);
  },
  fullscreen: toggleFullscreen,
  openBoard: () => {
    ui.showBoard(board.nick);
    loadBoard();
  },
  saveNick: name => {
    if (!board.setNick(name)) { ui.setNick(board.nick); return; }
    ui.setNick(board.nick);
    ui.boardStatus('Ukládám…');
    loadBoard();
  },
});

// ---------- online žebříček ----------

async function loadBoard() {
  try { await board.flush(); } catch { /* odešle se příště */ }
  try {
    const top = await board.top();
    let me = null;
    if (board.best && !top.some(r => r.player_id === board.playerId)) {
      const rank = await board.rank();
      if (rank) me = { rank, nickname: board.nick, character: board.character, score: board.best };
    }
    if (ui.boardOpen) ui.renderBoard(top, board.playerId, me);
  } catch {
    ui.boardStatus('Žebříček teď nejde načíst. Jsi připojený k internetu?');
  }
}

async function submitRun(res) {
  if (!board.nick) {
    board.submit(res); // bez přezdívky se rekord jen podrží, odešle se po jejím zadání
    ui.setOverRank('Zapiš se do žebříčku – klepni na <b>🏆 Žebříček</b>');
    return;
  }
  ui.setOverRank('Odesílám do žebříčku…');
  try {
    await board.submit(res);
    const rank = await board.rank();
    if (game.state === 'over') ui.setOverRank(rank ? `Tvoje místo v žebříčku: <b>${rank}.</b>` : '');
  } catch {
    if (game.state === 'over') ui.setOverRank('Jsi offline – rekord se do žebříčku odešle později.');
  }
}

let game;
try {
  game = new Game(document.getElementById('game'), {
    onStateChange: s => {
      ui.showState(s);
      input.enabled = s === 'playing' || s === 'intro' || s === 'ready';
    },
    onHud: (score, boxes, kratoms) => ui.hud(score, boxes, kratoms),
    onCollect: () => sfx.play('box'),
    onKratom: () => { sfx.play('kratom'); navigator.vibrate?.(25); },
    onBoost: on => ui.boost(on),
    onBump: () => { sfx.play('bump'); navigator.vibrate?.(40); },
    onCrash: () => { sfx.play('crash'); navigator.vibrate?.([80, 40, 120]); },
    onCountdown: n => { ui.countdown(n); sfx.play(n > 0 ? 'count' : 'go'); },
    onGameOver: res => {
      const rec = storage.record(res.character.id, res.score);
      storage.addKartony(res.boxes);
      submitRun(res);
      ui.gameOver(res, rec, storage);
      if (rec.newBest || rec.newCharBest) sfx.play('record');
    },
  });
} catch (err) {
  console.error(err);
  ui.loadingError('Tvůj prohlížeč nepodporuje WebGL, hru bohužel nejde spustit. 😢');
  throw err;
}

const input = new Input(
  action => {
    const r = game.action(action);
    if (r) sfx.play(r);
  },
  () => (game.state === 'paused' ? game.resume() : game.pause())
);

// Enter / mezerník spustí hru z menu nebo z obrazovky konce
window.addEventListener('keydown', e => {
  if (ui.boardOpen) {
    if (e.key === 'Escape') ui.hideBoard();
    return;
  }
  if ((e.key === 'Enter' || e.key === ' ') && ['menu', 'over', 'select'].includes(game.state)) {
    e.preventDefault();
    game.start();
  } else if (e.key === 'Enter' && game.state === 'ready') game.go();
});

// Automatická pauza při přepnutí aplikace / karty
document.addEventListener('visibilitychange', () => { if (document.hidden) game.pause(); });
window.addEventListener('blur', () => game.pause());
window.addEventListener('pagehide', () => game.pause());

// Zabránit zoomu gesty (iOS Safari ignoruje user-scalable=no)
for (const ev of ['gesturestart', 'gesturechange', 'dblclick']) {
  document.addEventListener(ev, e => e.preventDefault(), { passive: false });
}
document.addEventListener('contextmenu', e => { if (e.target.tagName !== 'INPUT') e.preventDefault(); });

// rekord uhraný bez připojení se odešle, jakmile je zase internet
window.addEventListener('online', () => board.flush().catch(() => {}));
board.flush().catch(() => {});

game.setCharacter(character);
ui.setCharacter(character);
ui.setBest(storage.best);
ui.setKartony(storage.kartony);
ui.setMuted(storage.muted);
ui.setFullscreenAvailable(fullscreenSupported());
ui.buildCards(character.id, storage);
try { ui.setTipImages(renderThumbs()); } catch { /* nápověda bude bez obrázků */ }
game.showMenu();
ui.hideLoading();

// pro ladění v konzoli
window.__game = game;
