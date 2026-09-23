// Hráč: pohyb mezi drahami, skok, skluz a procedurální animace běhu.
import * as THREE from 'three';
import { LANES, PLAYER_H, PLAYER_SLIDE_H } from './config.js';
import { buildRunner } from './characters.js';
import { makeCanvas, canvasTexture } from './geo.js';

const JUMP_H = 2.2;
const JUMP_T = 0.64;
const GRAVITY = 8 * JUMP_H / (JUMP_T * JUMP_T);
const JUMP_V = 4 * JUMP_H / JUMP_T;
const FAST_DROP_V = -22;
const SLIDE_TIME = 0.72;
const LANE_RATE = 17;

function shadowTexture() {
  const c = makeCanvas(64, 64), x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return canvasTexture(c);
}

const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));

export class Player {
  constructor(scene) {
    this.root = new THREE.Group();
    scene.add(this.root);
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 1.3),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    scene.add(this.shadow);
    this.models = new Map();
    this.model = null;
    this.reset();
  }

  setCharacter(ch) {
    if (this.model) this.root.remove(this.model.root);
    if (!this.models.has(ch.id)) this.models.set(ch.id, buildRunner(ch));
    this.model = this.models.get(ch.id);
    this.root.add(this.model.root);
  }

  reset() {
    this.lane = 1;
    this.fromLane = 1;
    this.x = 0; this.y = 0; this.vy = 0;
    this.jumping = false;
    this.slideT = 0;
    this.pendingSlide = false;
    this.phase = 0;
    this.dead = false;
    this.deadT = 0;
    this.bumpT = 0;
    this.root.position.set(0, 0, 0);
    this.root.rotation.set(0, 0, 0);
  }

  get sliding() { return this.slideT > 0; }
  get height() { return this.sliding ? PLAYER_SLIDE_H : PLAYER_H; }
  get changingLane() { return Math.abs(this.x - LANES[this.lane]) > 0.3; }

  move(dir) {
    const n = this.lane + dir;
    if (n < 0 || n > 2) return false;
    this.fromLane = this.lane;
    this.lane = n;
    return true;
  }

  /** Náraz z boku – vrátí hráče zpět do původní dráhy. */
  bumpBack() {
    const back = this.fromLane;
    this.fromLane = this.lane;
    this.lane = back;
    this.bumpT = 0.35;
  }

  jump() {
    if (this.jumping) return false;
    this.jumping = true;
    this.vy = JUMP_V;
    this.slideT = 0;
    this.pendingSlide = false;
    return true;
  }

  slide() {
    if (this.jumping) {             // ve vzduchu = rychlý pád a skluz po dopadu
      this.vy = Math.min(this.vy, FAST_DROP_V);
      this.pendingSlide = true;
      return true;
    }
    const was = this.sliding;
    this.slideT = SLIDE_TIME;
    return !was;
  }

  die() {
    this.dead = true;
    this.deadT = 0;
  }

  /** Aktualizace během hry. */
  update(dt, speed) {
    const m = this.model;
    // boční pohyb
    const prevX = this.x;
    this.x = damp(this.x, LANES[this.lane], LANE_RATE, dt);
    const vx = (this.x - prevX) / Math.max(dt, 1e-4);

    // vertikála
    if (this.jumping) {
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0; this.vy = 0; this.jumping = false;
        if (this.pendingSlide) { this.slideT = SLIDE_TIME; this.pendingSlide = false; }
      }
    }
    if (this.slideT > 0) this.slideT -= dt;
    if (this.bumpT > 0) this.bumpT -= dt;

    this.root.position.set(this.x, this.y, 0);
    this.root.rotation.y = damp(this.root.rotation.y, 0, 10, dt);

    // animace
    const k = 22;
    this.phase += dt * (8 + speed * 0.32);
    const s = Math.sin(this.phase), c = Math.cos(this.phase);
    let bodyRX, bodyY, hipL, hipR, kneeL, kneeR, shL, shR, elb;
    if (this.sliding) {
      bodyRX = 1.2; bodyY = 0.22;
      hipL = 0.45; hipR = 0.35; kneeL = -0.1; kneeR = -0.35;
      shL = -0.6; shR = -0.6; elb = 0.4;
    } else if (this.jumping) {
      bodyRX = -0.15; bodyY = 0;
      hipL = 1.1; hipR = 0.2; kneeL = -1.4; kneeR = -0.9;
      shL = 2.4; shR = 1.8; elb = 0.6;
    } else {
      bodyRX = -0.14; bodyY = Math.abs(c) * 0.07;
      hipL = s * 0.85; hipR = -s * 0.85;
      kneeL = -0.2 - Math.max(0, -c) * 1.2;
      kneeR = -0.2 - Math.max(0, c) * 1.2;
      shL = -s * 0.8; shR = s * 0.8; elb = 1.35;
    }
    const b = m.body;
    b.rotation.x = damp(b.rotation.x, bodyRX, this.sliding ? 18 : 14, dt);
    b.rotation.z = damp(b.rotation.z, THREE.MathUtils.clamp(-vx * 0.025, -0.3, 0.3) + (this.bumpT > 0 ? Math.sin(this.bumpT * 40) * 0.15 : 0), 12, dt);
    b.position.y = damp(b.position.y, bodyY, k, dt);
    m.legs[0].hip.rotation.x = damp(m.legs[0].hip.rotation.x, hipL, k, dt);
    m.legs[1].hip.rotation.x = damp(m.legs[1].hip.rotation.x, hipR, k, dt);
    m.legs[0].knee.rotation.x = damp(m.legs[0].knee.rotation.x, kneeL, k, dt);
    m.legs[1].knee.rotation.x = damp(m.legs[1].knee.rotation.x, kneeR, k, dt);
    m.arms[0].sh.rotation.x = damp(m.arms[0].sh.rotation.x, shL, k, dt);
    m.arms[1].sh.rotation.x = damp(m.arms[1].sh.rotation.x, shR, k, dt);
    m.arms[0].el.rotation.x = damp(m.arms[0].el.rotation.x, elb, k, dt);
    m.arms[1].el.rotation.x = damp(m.arms[1].el.rotation.x, elb, k, dt);
    m.arms[0].sh.rotation.z = damp(m.arms[0].sh.rotation.z, 0, k, dt);
    m.arms[1].sh.rotation.z = damp(m.arms[1].sh.rotation.z, 0, k, dt);
    m.head.rotation.y = damp(m.head.rotation.y, 0, 10, dt);

    this.updateShadow();
  }

  /** Animace po nárazu: otočí se ke kameře a padá na záda. */
  updateDead(dt) {
    this.deadT += dt;
    const m = this.model;
    this.y = Math.max(0, this.y - dt * 6);
    this.root.position.y = this.y;
    this.root.rotation.y = damp(this.root.rotation.y, Math.PI, 6, dt);
    m.body.rotation.x = damp(m.body.rotation.x, this.deadT > 0.25 ? 1.35 : -0.3, 7, dt);
    m.body.rotation.z = damp(m.body.rotation.z, 0, 8, dt);
    m.body.position.y = damp(m.body.position.y, 0.15, 8, dt);
    for (const a of m.arms) { a.sh.rotation.x = damp(a.sh.rotation.x, 2.7, 8, dt); a.el.rotation.x = damp(a.el.rotation.x, 0.3, 8, dt); }
    m.arms[0].sh.rotation.z = damp(m.arms[0].sh.rotation.z, -0.5, 8, dt);
    m.arms[1].sh.rotation.z = damp(m.arms[1].sh.rotation.z, 0.5, 8, dt);
    for (const l of m.legs) { l.hip.rotation.x = damp(l.hip.rotation.x, 0.6, 8, dt); l.knee.rotation.x = damp(l.knee.rotation.x, -0.3, 8, dt); }
    this.updateShadow();
  }

  /** Póza pro menu / výběr postavy (čelem ke kameře, případně se otáčí). */
  updateShowcase(dt, t, spin) {
    const m = this.model;
    this.x = 0; this.y = 0;
    this.root.position.set(0, 0, 0);
    this.root.rotation.y = spin ? t * 0.8 : Math.sin(t * 0.8) * 0.3;
    const br = Math.sin(t * 2.2);
    m.body.rotation.set(0, 0, 0);
    m.body.position.y = br * 0.015;
    m.legs[0].hip.rotation.x = 0; m.legs[1].hip.rotation.x = 0;
    m.legs[0].knee.rotation.x = 0; m.legs[1].knee.rotation.x = 0;
    // mávání pravou rukou v menu, v náhledu ruce v bok
    m.arms[0].sh.rotation.set(0.1, 0, -0.12 - br * 0.02);
    m.arms[0].el.rotation.x = 0.25;
    if (!spin) {
      m.arms[1].sh.rotation.set(0, 0, 2.6 + Math.sin(t * 7) * 0.25);
      m.arms[1].el.rotation.x = 0.3;
    } else {
      m.arms[1].sh.rotation.set(0.1, 0, 0.12 + br * 0.02);
      m.arms[1].el.rotation.x = 0.25;
    }
    m.head.rotation.y = Math.sin(t * 0.9) * 0.15;
    this.updateShadow();
  }

  updateShadow() {
    this.shadow.position.x = this.x;
    const s = Math.max(0.4, 1 - this.y * 0.18);
    this.shadow.scale.set(s, this.sliding ? s * 1.6 : s, 1);
    this.shadow.position.z = this.sliding ? 0.5 : 0;
  }
}
