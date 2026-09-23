// Vstupní bod: propojí hru, UI, ovládání, zvuk a úložiště.
import { Game } from './game.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import { Storage } from './storage.js';
import { getCharacter } from './characters.js';

const storage = new Storage();
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
  quit: () => game.showMenu(),
  toggleMute: () => {
    storage.muted = !storage.muted;
    sfx.setMuted(storage.muted);
    ui.setMuted(storage.muted);
  },
  fullscreen: toggleFullscreen,
});

let game;
try {
  game = new Game(document.getElementById('game'), {
    onStateChange: s => {
      ui.showState(s);
      input.enabled = s === 'playing' || s === 'intro';
    },
    onHud: (score, boxes) => ui.hud(score, boxes),
    onCollect: () => sfx.play('box'),
    onBump: () => { sfx.play('bump'); navigator.vibrate?.(40); },
    onCrash: () => { sfx.play('crash'); navigator.vibrate?.([80, 40, 120]); },
    onCountdown: n => { ui.countdown(n); sfx.play(n > 0 ? 'count' : 'go'); },
    onGameOver: res => {
      const rec = storage.record(res.character.id, res.score);
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
  if ((e.key === 'Enter' || e.key === ' ') && ['menu', 'over', 'select'].includes(game.state)) {
    e.preventDefault();
    game.start();
  }
});

// Automatická pauza při přepnutí aplikace / karty
document.addEventListener('visibilitychange', () => { if (document.hidden) game.pause(); });
window.addEventListener('blur', () => game.pause());
window.addEventListener('pagehide', () => game.pause());

// Zabránit zoomu gesty (iOS Safari ignoruje user-scalable=no)
for (const ev of ['gesturestart', 'gesturechange', 'dblclick']) {
  document.addEventListener(ev, e => e.preventDefault(), { passive: false });
}
document.addEventListener('contextmenu', e => e.preventDefault());

game.setCharacter(character);
ui.setCharacter(character);
ui.setBest(storage.best);
ui.setMuted(storage.muted);
ui.setFullscreenAvailable(fullscreenSupported());
ui.buildCards(character.id, storage);
game.showMenu();
ui.hideLoading();

// pro ladění v konzoli
window.__game = game;
