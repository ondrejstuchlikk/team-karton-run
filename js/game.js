// Jádro hry: renderer, scéna, kamera, herní smyčka, kolize, skóre a stavy.
import * as THREE from 'three';
import { World } from './world.js';
import { Obstacles } from './obstacles.js';
import { Player } from './player.js';
import { PLAYER_HW, PLAYER_HD, BOX_POINTS, speedForDistance } from './config.js';

const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
const INTRO_TIME = 0.8;
const DEATH_TIME = 1.2;

export class Game {
  constructor(canvas, hooks) {
    this.hooks = hooks; // { onHud, onGameOver, onCountdown, onStateChange }
    this.maxDpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = this.maxDpr;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: this.maxDpr < 1.5, powerPreference: 'high-performance', stencil: false,
    });
    this.renderer.setPixelRatio(this.dpr);

    const scene = this.scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#bfe6ff', 45, 135);
    scene.add(new THREE.HemisphereLight('#e6f4ff', '#5e8a4a', 1.6));
    const sun = new THREE.DirectionalLight('#fff3dd', 2.0);
    sun.position.set(4, 10, 6);
    scene.add(sun);
    // slabé přední světlo – aby byl vidět obličej v menu a při pádu
    const fill = new THREE.DirectionalLight('#ffffff', 1.1);
    fill.position.set(-3, 5, -8);
    scene.add(fill);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
    this.camLook = new THREE.Vector3(0, 1.2, 0);
    this.camPos = new THREE.Vector3(0, 2, -5);
    this.camFov = 50;

    this.world = new World(scene, this.renderer);
    this.obstacles = new Obstacles(scene);
    this.player = new Player(scene);

    this.state = 'menu';   // menu | select | intro | playing | paused | countdown | dying | over
    this.t = 0;
    this.shake = 0;
    this.snapCam = true;
    this.resetRun();

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    window.visualViewport?.addEventListener('resize', this.resize);
    this.resize();

    this.last = performance.now();
    this.perf = { acc: 0, frames: 0 };
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  setCharacter(ch) {
    this.character = ch;
    this.player.setCharacter(ch);
  }

  resetRun() {
    this.distance = 0;
    this.boxes = 0;
    this.speed = 0;
    this.runTime = 0;
    this.lastHud = '';
    this.obstacles.reset();
    this.world.reset();
    this.player.reset();
  }

  setState(s) {
    const showcase = st => st === 'menu' || st === 'select';
    // Přepnutí mezi pohledem zepředu (menu) a zezadu (hra) = střih kamery.
    if (showcase(s) !== showcase(this.state)) this.snapCam = true;
    this.state = s;
    this.hooks.onStateChange?.(s);
  }

  // ---------- veřejné ovládání ----------
  showMenu() { this.resetRun(); this.setState('menu'); }
  showSelect() { this.resetRun(); this.setState('select'); }

  start() {
    this.resetRun();
    this.player.root.rotation.y = Math.PI; // otočka od kamery do směru běhu
    this.introT = 0;
    this.setState('intro');
    this.emitHud(true);
  }

  pause() {
    if (this.state === 'playing' || this.state === 'intro' || this.state === 'countdown') {
      this.pausedFrom = this.state === 'countdown' ? this.resumeTo : this.state;
      this.setState('paused');
    }
  }

  resume() {
    if (this.state !== 'paused') return;
    this.resumeTo = this.pausedFrom || 'playing';
    this.countdown = 3;
    this.hooks.onCountdown?.(3);
    this.setState('countdown');
  }

  action(a) {
    if (this.state !== 'playing' && this.state !== 'intro') return null;
    const p = this.player;
    switch (a) {
      case 'left': return p.move(-1) ? 'lane' : null;
      case 'right': return p.move(1) ? 'lane' : null;
      case 'up': return p.jump() ? 'jump' : null;
      case 'down': return p.slide() ? 'slide' : null;
    }
    return null;
  }

  // ---------- smyčka ----------
  loop(now) {
    requestAnimationFrame(this.loop);
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt <= 0) return;
    dt = Math.min(dt, 0.05); // ochrana proti skokům po přepnutí karty
    this.t += dt;
    this.update(dt);
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
    this.adaptQuality(dt);
  }

  update(dt) {
    const p = this.player;
    switch (this.state) {
      case 'menu':
      case 'select':
        p.updateShowcase(dt, this.t, this.state === 'select');
        break;

      case 'intro': {
        this.introT += dt;
        const k = Math.min(1, this.introT / INTRO_TIME);
        this.step(dt, speedForDistance(0) * k * k);
        if (k >= 1) this.setState('playing');
        break;
      }

      case 'playing':
        this.runTime += dt;
        this.step(dt, speedForDistance(this.distance));
        break;

      case 'countdown': {
        const before = Math.ceil(this.countdown);
        this.countdown -= dt;
        const after = Math.ceil(this.countdown);
        if (after !== before) this.hooks.onCountdown?.(after);
        if (this.countdown <= 0) this.setState(this.resumeTo);
        break;
      }

      case 'dying':
        this.deathT += dt;
        p.updateDead(dt);
        this.speed = damp(this.speed, 0, 5, dt);
        this.world.update(dt, this.speed * 0.3);
        if (this.deathT > DEATH_TIME) {
          this.setState('over');
          this.hooks.onGameOver?.(this.result());
        }
        break;

      case 'over':
        p.updateDead(dt);
        break;
    }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2);
  }

  /** Jeden krok běhu. */
  step(dt, speed) {
    this.speed = speed;
    const move = speed * dt;
    this.distance += move;
    this.world.update(dt, speed);
    this.obstacles.update(dt, move, speed, this.distance);
    this.player.update(dt, speed);
    this.collide();
    this.collect();
    this.emitHud();
  }

  collide() {
    const p = this.player;
    const py0 = p.y, py1 = p.y + p.height;
    for (const o of this.obstacles.active) {
      const h = o.userData.hit;
      if (Math.abs(o.position.z) > h.hd + PLAYER_HD) continue;
      if (Math.abs(o.position.x - p.x) > h.hw + PLAYER_HW) continue;
      if (py1 <= h.y0 || py0 >= h.y1) continue;
      // Náraz z boku při přebíhání do jiné dráhy -> odraz zpět (jako v Subway Surfers)
      if (p.changingLane && o.userData.lane === p.lane && p.fromLane !== p.lane && p.bumpT <= 0) {
        p.bumpBack();
        this.shake = 0.25;
        this.hooks.onBump?.();
        return;
      }
      if (p.bumpT > 0 && o.userData.lane !== p.lane) continue; // právě se odrážíme
      this.crash();
      return;
    }
  }

  collect() {
    const p = this.player;
    const boxes = this.obstacles.boxes;
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i];
      if (Math.abs(b.position.z) > 0.8) continue;
      if (Math.abs(b.position.x - p.x) > 0.85) continue;
      const by = b.userData.baseY;
      if (by < p.y - 0.4 || by > p.y + p.height + 0.5) continue;
      this.obstacles.removeBoxAt(i);
      this.boxes++;
      this.hooks.onCollect?.();
    }
  }

  crash() {
    this.player.die();
    this.deathT = 0;
    this.shake = 0.6;
    this.setState('dying');
    this.hooks.onCrash?.();
  }

  get score() { return Math.floor(this.distance) + this.boxes * BOX_POINTS; }

  result() {
    return { score: this.score, distance: Math.floor(this.distance), boxes: this.boxes, character: this.character };
  }

  emitHud(force) {
    const key = this.score + '|' + this.boxes;
    if (!force && key === this.lastHud) return;
    this.lastHud = key;
    this.hooks.onHud?.(this.score, this.boxes);
  }

  // ---------- kamera ----------
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.aspect = w / h;
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
  }

  playFov() {
    // Na výšku rozšíříme zorné pole, aby byly vidět všechny 3 dráhy.
    const v = 2 * Math.atan(0.37 / this.aspect) * 180 / Math.PI;
    return THREE.MathUtils.clamp(v, 52, 82);
  }

  updateCamera(dt) {
    const cam = this.camera;
    const s = this.state;
    let pos, look, fov, rate;
    if (s === 'menu' || s === 'select') {
      // Kamera před postavou – ta je otočená čelem k nám.
      const portrait = this.aspect < 1;
      fov = portrait ? 2 * Math.atan(0.36 / this.aspect) * 180 / Math.PI : 42;
      fov = THREE.MathUtils.clamp(fov, 38, 75);
      const dist = portrait ? 4.2 : 5.2;
      // V menu je postava uprostřed, ve výběru v horní části obrazovky.
      const lookY = s === 'select' ? (portrait ? 0.1 : 0.7) : (portrait ? 1.9 : 1.1);
      pos = _v1.set(0, s === 'select' ? 1.75 : 2.2, -dist);
      look = _v2.set(0, lookY, 0);
      rate = 4;
    } else {
      const px = this.player.x;
      fov = this.playFov();
      pos = _v1.set(px * 0.55, 5.4, 7.6);
      look = _v2.set(px * 0.35, 0.4, -5);
      rate = s === 'intro' ? 5 : 9;
      if (s === 'dying' || s === 'over') {
        pos.set(px * 0.6, 3.6, 5.6);
        look.set(px * 0.8, 0.8, 0);
        rate = 2.5;
      }
    }
    if (this.snapCam) { rate = 1e6; this.snapCam = false; }
    this.camPos.x = damp(this.camPos.x, pos.x, rate, dt);
    this.camPos.y = damp(this.camPos.y, pos.y, rate, dt);
    this.camPos.z = damp(this.camPos.z, pos.z, rate, dt);
    this.camLook.x = damp(this.camLook.x, look.x, rate, dt);
    this.camLook.y = damp(this.camLook.y, look.y, rate, dt);
    this.camLook.z = damp(this.camLook.z, look.z, rate, dt);
    this.camFov = damp(this.camFov, fov, rate, dt);

    cam.position.copy(this.camPos);
    if (this.shake > 0) {
      cam.position.x += (Math.random() - 0.5) * this.shake * 0.5;
      cam.position.y += (Math.random() - 0.5) * this.shake * 0.5;
    }
    cam.lookAt(this.camLook);
    if (Math.abs(cam.fov - this.camFov) > 0.01 || rate === 1e6) {
      cam.fov = this.camFov;
      cam.updateProjectionMatrix();
    }
  }

  /** Když telefon nestíhá, snížíme rozlišení (max 2× devicePixelRatio). */
  adaptQuality(dt) {
    if (this.state !== 'playing') { this.perf.acc = 0; this.perf.frames = 0; return; }
    this.perf.acc += dt; this.perf.frames++;
    if (this.perf.acc < 2) return;
    const fps = this.perf.frames / this.perf.acc;
    this.perf.acc = 0; this.perf.frames = 0;
    if (fps < 45 && this.dpr > 1) {
      this.dpr = Math.max(1, this.dpr - 0.25);
      this.renderer.setPixelRatio(this.dpr);
      this.resize();
    }
  }
}

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
