// Ohnivá stopa s kouřem za běžcem během zrychlení po kratomu.
// Částice zůstávají nízko a krátce za postavou, aby nezakrývaly výhled na dráhu.
import * as THREE from 'three';
import { makeCanvas, canvasTexture } from './geo.js';

function puffTexture() {
  const c = makeCanvas(64, 64), x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return canvasTexture(c);
}

const FIRE = 40, SMOKE = 16;
const FIRE_RATE = 70, SMOKE_RATE = 18;   // částic za sekundu
const C_HOT = new THREE.Color('#fff2a8');
const C_MID = new THREE.Color('#ff8a1e');
const C_END = new THREE.Color('#e0300c');

export class BoostTrail {
  constructor(scene) {
    const tex = puffTexture();
    this.parts = [];
    for (let i = 0; i < FIRE + SMOKE; i++) {
      const smoke = i >= FIRE;
      const mat = new THREE.SpriteMaterial({
        map: tex, transparent: true, depthWrite: false,
        blending: smoke ? THREE.NormalBlending : THREE.AdditiveBlending,
        color: smoke ? '#9a9a9a' : '#ffffff',
      });
      const s = new THREE.Sprite(mat);
      s.visible = false;
      s.renderOrder = 3;
      scene.add(s);
      this.parts.push({ s, smoke, life: 0, max: 1, vx: 0, vy: 0, vz: 0, size: 1 });
    }
    this.fireAcc = 0;
    this.smokeAcc = 0;
  }

  reset() {
    for (const p of this.parts) { p.life = 0; p.s.visible = false; }
    this.fireAcc = this.smokeAcc = 0;
  }

  spawn(smoke, px, py, low) {
    const p = this.parts.find(q => q.smoke === smoke && q.life <= 0);
    if (!p) return;
    const r = Math.random;
    p.max = p.life = smoke ? 0.45 + r() * 0.2 : 0.22 + r() * 0.14;
    p.size = smoke ? 0.45 + r() * 0.2 : 0.38 + r() * 0.22;
    p.vx = (r() - 0.5) * 0.8;
    p.vy = smoke ? 0.6 + r() * 0.5 : 0.3 + r() * 0.6;
    p.vz = 3.5 + r() * 2.5;             // zaostává za běžcem (k divákovi)
    const h = low ? 0.15 + r() * 0.35 : 0.2 + r() * 0.75;
    p.s.position.set(px + (r() - 0.5) * 0.35, py + h, 0.35 + r() * 0.15);
    p.s.visible = true;
  }

  /** intensity 0..1 – síla efektu (během konce zrychlení slábne). */
  update(dt, intensity, px, py, low) {
    if (intensity > 0) {
      this.fireAcc += dt * FIRE_RATE * intensity;
      this.smokeAcc += dt * SMOKE_RATE * intensity;
      for (; this.fireAcc >= 1; this.fireAcc--) this.spawn(false, px, py, low);
      for (; this.smokeAcc >= 1; this.smokeAcc--) this.spawn(true, px, py, low);
    }
    for (const p of this.parts) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.s.visible = false; continue; }
      const s = p.s, k = 1 - p.life / p.max;   // 0 = zrod, 1 = zánik
      s.position.x += p.vx * dt;
      s.position.y += p.vy * dt;
      s.position.z += p.vz * dt;
      if (p.smoke) {
        s.scale.setScalar(p.size * (0.6 + k * 1.2));
        s.material.opacity = 0.32 * (1 - k);
      } else {
        s.scale.setScalar(p.size * (1 - k * 0.6));
        if (k < 0.4) s.material.color.lerpColors(C_HOT, C_MID, k / 0.4);
        else s.material.color.lerpColors(C_MID, C_END, (k - 0.4) / 0.6);
        s.material.opacity = 0.9 * (1 - k * k);
      }
    }
  }
}
