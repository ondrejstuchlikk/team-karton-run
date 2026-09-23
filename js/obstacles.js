// Překážky (kelímky, láhve, barely, cigarety, jointy), sbíratelné kartony,
// object pooling a generátor řad, který vždy nechá průchozí cestu.
import * as THREE from 'three';
import { part, merge, vcMaterial, labelTexture, canvasTexture, makeCanvas } from './geo.js';
import { LANES, SPAWN_Z, DESPAWN_Z } from './config.js';

// ---------- sdílené geometrie a materiály ----------
const SHADOW = '#8e3a28'; // tmavý tartan = levný „stín“ pod překážkou

const smokeGeo = new THREE.IcosahedronGeometry(0.09, 1);
const smokeMat = new THREE.MeshLambertMaterial({ color: '#f2f2f2', transparent: true, opacity: 0.4, depthWrite: false });

function addSmoke(group, x, y, z) {
  const puffs = [];
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(smokeGeo, smokeMat);
    p.userData = { bx: x, by: y, bz: z, off: i / 3 };
    group.add(p);
    puffs.push(p);
  }
  group.userData.smoke = puffs;
}

const kratomLabel = labelTexture('KRATOM', { w: 256, h: 96, font: 'bold 50px sans-serif', bg: '#f6e7b8', fg: '#2f6b22', border: '#2f6b22' });
const kratomLabelBig = labelTexture('KRATOM', { w: 256, h: 160, font: 'bold 58px sans-serif', sub: 'TEAM KARTON', bg: '#f3dfa2', fg: '#24521b', border: '#24521b' });
const labelMat = new THREE.MeshLambertMaterial({ map: kratomLabel });
const labelBigMat = new THREE.MeshLambertMaterial({ map: kratomLabelBig });

const GEO = {};
function geos() {
  if (GEO.ready) return GEO;
  // Kelímek s kratomem (průhledná slupka + kalný zelenohnědý nápoj uvnitř)
  GEO.cupInner = merge([
    part(new THREE.CircleGeometry(0.8, 12), SHADOW, { y: 0.012, rx: -Math.PI / 2 }),
    part(new THREE.CylinderGeometry(0.56, 0.44, 0.78, 12), '#6f7a2a', { y: 0.41 }),
    part(new THREE.CylinderGeometry(0.57, 0.57, 0.04, 12), '#8d9a3a', { y: 0.81 }),
    part(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 5), '#e53935', { x: 0.18, y: 1.0, rz: -0.35 }),
  ]);
  GEO.cupShell = new THREE.CylinderGeometry(0.64, 0.48, 1.1, 12, 1, true);
  GEO.cupShell.translate(0, 0.55, 0);
  GEO.cupLabel = new THREE.CylinderGeometry(0.625, 0.56, 0.3, 12, 1, true, -1.0, 2.0);
  GEO.cupLabel.translate(0, 0.5, 0);

  // Velká láhev
  GEO.bottle = merge([
    part(new THREE.CircleGeometry(1.0, 12), SHADOW, { y: 0.012, rx: -Math.PI / 2 }),
    part(new THREE.CylinderGeometry(0.8, 0.8, 2.1, 12), '#6b3f18', { y: 1.05 }),
    part(new THREE.CylinderGeometry(0.3, 0.8, 0.55, 12), '#6b3f18', { y: 2.37 }),
    part(new THREE.CylinderGeometry(0.28, 0.3, 0.5, 10), '#6b3f18', { y: 2.9 }),
    part(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 10), '#2e7d32', { y: 3.2 }),
  ]);
  GEO.bottleLabel = new THREE.CylinderGeometry(0.815, 0.815, 1.0, 12, 1, true, -1.1, 2.2);
  GEO.bottleLabel.translate(0, 1.05, 0);

  // Barel
  const barrelProfile = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    barrelProfile.push(new THREE.Vector2(0.78 + Math.sin(t * Math.PI) * 0.08, t * 2.6));
  }
  GEO.barrel = merge([
    part(new THREE.CircleGeometry(1.0, 12), SHADOW, { y: 0.012, rx: -Math.PI / 2 }),
    part(new THREE.LatheGeometry(barrelProfile, 12), '#2f7d3a'),
    part(new THREE.CylinderGeometry(0.78, 0.78, 0.04, 12), '#246130', { y: 2.6 }),
    part(new THREE.CylinderGeometry(0.87, 0.87, 0.1, 12), '#1f4f27', { y: 0.45 }),
    part(new THREE.CylinderGeometry(0.87, 0.87, 0.1, 12), '#1f4f27', { y: 2.15 }),
    part(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 6), '#1f4f27', { x: 0.35, y: 2.63 }),
  ]);
  GEO.barrelLabel = new THREE.CylinderGeometry(0.875, 0.875, 0.95, 12, 1, true, -1.0, 2.0);
  GEO.barrelLabel.translate(0, 1.3, 0);

  // Cigareta napříč dráhou
  GEO.cig = merge([
    part(new THREE.PlaneGeometry(2.2, 0.7), SHADOW, { y: 0.012, rx: -Math.PI / 2 }),
    part(new THREE.CylinderGeometry(0.22, 0.22, 1.45, 10), '#f5f5f0', { x: -0.12, y: 0.22, rz: Math.PI / 2 }),
    part(new THREE.CylinderGeometry(0.225, 0.225, 0.5, 10), '#e39a45', { x: -1.07, y: 0.22, rz: Math.PI / 2 }),
    part(new THREE.CylinderGeometry(0.21, 0.21, 0.12, 10), '#6e6e6e', { x: 0.66, y: 0.22, rz: Math.PI / 2 }),
    part(new THREE.CylinderGeometry(0.17, 0.2, 0.08, 10), '#ff4a1c', { x: 0.76, y: 0.22, rz: Math.PI / 2 }),
  ]);

  // Joint ve výšce hlavy mezi dvěma tyčkami (podklouznout)
  GEO.joint = merge([
    part(new THREE.CylinderGeometry(0.06, 0.07, 1.95, 6), '#4a4f57', { x: -0.98, y: 0.98 }),
    part(new THREE.CylinderGeometry(0.06, 0.07, 1.95, 6), '#4a4f57', { x: 0.98, y: 0.98 }),
    part(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 8), '#4a4f57', { x: -0.98, y: 0.025 }),
    part(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 8), '#4a4f57', { x: 0.98, y: 0.025 }),
    // tělo jointu: úzký konec (vlevo) -> široký zapálený konec (vpravo)
    part(new THREE.CylinderGeometry(0.09, 0.2, 1.6, 10), '#efe8cf', { x: -0.05, y: 1.5, rz: Math.PI / 2 }),
    part(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 8), '#d9c08a', { x: -0.9, y: 1.5, rz: Math.PI / 2 }),
    part(new THREE.CylinderGeometry(0.16, 0.19, 0.1, 10), '#5d6b2c', { x: 0.78, y: 1.5, rz: Math.PI / 2 }),
    part(new THREE.CylinderGeometry(0.12, 0.16, 0.06, 10), '#ff5a1f', { x: 0.85, y: 1.5, rz: Math.PI / 2 }),
    // zelené lístečky na papírku
    part(new THREE.OctahedronGeometry(0.07, 0), '#4c8b2b', { x: -0.3, y: 1.62, z: 0.1 }),
    part(new THREE.OctahedronGeometry(0.07, 0), '#4c8b2b', { x: 0.25, y: 1.45, z: 0.17 }),
  ]);
  GEO.ready = true;
  return GEO;
}

const cupShellMat = new THREE.MeshLambertMaterial({ color: '#e8f6ff', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });

// Definice typů: stavba + hitbox (poloviční šířka/hloubka, výška od–do)
const TYPES = {
  cup: {
    hit: { hw: 0.62, hd: 0.55, y0: 0, y1: 1.1 }, low: true,
    build() {
      const g = geos(), o = new THREE.Group();
      o.add(new THREE.Mesh(g.cupInner, vcMaterial));
      o.add(new THREE.Mesh(g.cupLabel, labelMat));
      const shell = new THREE.Mesh(g.cupShell, cupShellMat);
      shell.renderOrder = 1;
      o.add(shell);
      return o;
    },
  },
  bottle: {
    hit: { hw: 0.78, hd: 0.78, y0: 0, y1: 5 }, tall: true,
    build() {
      const g = geos(), o = new THREE.Group();
      o.add(new THREE.Mesh(g.bottle, vcMaterial));
      o.add(new THREE.Mesh(g.bottleLabel, labelBigMat));
      return o;
    },
  },
  barrel: {
    hit: { hw: 0.8, hd: 0.8, y0: 0, y1: 5 }, tall: true,
    build() {
      const g = geos(), o = new THREE.Group();
      o.add(new THREE.Mesh(g.barrel, vcMaterial));
      o.add(new THREE.Mesh(g.barrelLabel, labelBigMat));
      return o;
    },
  },
  cig: {
    hit: { hw: 0.95, hd: 0.28, y0: 0, y1: 0.45 }, low: true,
    build() {
      const o = new THREE.Group();
      o.add(new THREE.Mesh(geos().cig, vcMaterial));
      addSmoke(o, 0.8, 0.35, 0);
      return o;
    },
  },
  joint: {
    hit: { hw: 0.95, hd: 0.25, y0: 1.05, y1: 5 }, overhead: true,
    build() {
      const o = new THREE.Group();
      o.add(new THREE.Mesh(geos().joint, vcMaterial));
      addSmoke(o, 0.9, 1.6, 0);
      return o;
    },
  },
};

// ---------- kartonová krabice (sbíratelná) ----------
function boxTexture() {
  const c = makeCanvas(64, 64), x = c.getContext('2d');
  x.fillStyle = '#c98f52'; x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#b57a3f';
  for (let i = 0; i < 64; i += 6) x.fillRect(0, i, 64, 2);
  x.fillStyle = '#ecd29a'; x.fillRect(26, 0, 12, 64);   // páska
  x.strokeStyle = '#7a4a1e'; x.lineWidth = 4; x.strokeRect(2, 2, 60, 60);
  x.fillStyle = '#5a3414'; x.font = 'bold 22px sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('K', 32, 34);
  return canvasTexture(c);
}
const boxGeo = new THREE.BoxGeometry(0.55, 0.42, 0.55);
const boxMat = new THREE.MeshLambertMaterial({ map: boxTexture(), emissive: '#4a2a08' });

// ---------- pool ----------
class Pool {
  constructor(scene, build, prefill) {
    this.scene = scene; this.build = build; this.free = [];
    for (let i = 0; i < prefill; i++) this.free.push(this.create());
  }
  create() {
    const o = this.build();
    o.visible = false;
    this.scene.add(o);
    return o;
  }
  get() {
    const o = this.free.pop() || this.create();
    o.visible = true;
    return o;
  }
  release(o) {
    o.visible = false;
    this.free.push(o);
  }
}

const rnd = n => Math.floor(Math.random() * n);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export class Obstacles {
  constructor(scene) {
    this.scene = scene;
    this.pools = {};
    for (const [k, t] of Object.entries(TYPES)) {
      this.pools[k] = new Pool(scene, () => {
        const o = t.build();
        o.userData.type = k;
        o.userData.hit = t.hit;
        return o;
      }, k === 'joint' ? 3 : 6);
    }
    this.boxPool = new Pool(scene, () => new THREE.Mesh(boxGeo, boxMat), 40);
    this.active = [];   // překážky
    this.boxes = [];    // krabice
    this.time = 0;
    this.reset();
  }

  reset() {
    for (const o of this.active) this.pools[o.userData.type].release(o);
    for (const b of this.boxes) this.boxPool.release(b);
    this.active.length = 0;
    this.boxes.length = 0;
    this.nextRowZ = -48;     // první řada kousek před hráčem
    this.prevGap = 30;
    this.lastFree = 1;
  }

  pickType(distance) {
    const jointW = distance > 180 ? 11 : 0;
    const w = { cup: 28, bottle: 17, barrel: 16, cig: 26, joint: jointW };
    let r = Math.random() * (w.cup + w.bottle + w.barrel + w.cig + w.joint);
    for (const k in w) { if ((r -= w[k]) < 0) return k; }
    return 'cup';
  }

  place(type, lane, z) {
    const o = this.pools[type].get();
    o.position.set(LANES[lane], 0, z);
    o.userData.lane = lane;
    this.active.push(o);
    return o;
  }

  addBox(lane, y, z) {
    const b = this.boxPool.get();
    b.position.set(LANES[lane], y, z);
    b.userData.baseY = y;
    b.userData.lane = lane;
    b.rotation.y = z * 0.4;
    this.boxes.push(b);
  }

  /**
   * Vytvoří jednu řadu překážek a vrátí mezeru k další řadě.
   * Pravidla průchodnosti:
   *  - v každé řadě je vždy aspoň jedna dráha průchozí (volná, nebo s nízkou/horní
   *    překážkou, kterou jde přeskočit/podklouznout);
   *  - mezera mezi řadami se škáluje s rychlostí, aby byl čas na přesun (i o 2 dráhy);
   *  - vysoké překážky nikdy neobsadí všechny 3 dráhy.
   */
  spawnRow(z, speed, distance) {
    const d = Math.min(1, distance / 2500);
    let gap = Math.max(17, speed * 0.66) + Math.random() * (9 - 5 * d);
    const laneTypes = [null, null, null];

    const r = Math.random();
    if (distance > 60 && r < 0.07) {
      // oddechová řada – jen krabice
    } else if (distance > 250 && r < 0.12) {
      // celá řada cigaret -> skok
      laneTypes.fill('cig');
      gap += speed * 0.25;
    } else if (distance > 500 && r < 0.16) {
      // celá řada jointů -> skluz
      laneTypes.fill('joint');
      gap += speed * 0.25;
    } else {
      const free = rnd(3);
      if (Math.abs(free - this.lastFree) === 2) gap += speed * 0.2; // přesun přes 2 dráhy
      this.lastFree = free;
      const others = shuffle([0, 1, 2].filter(l => l !== free));
      const count = distance < 120 ? 1 : (Math.random() < 0.35 + 0.5 * d ? 2 : 1);
      for (let i = 0; i < count; i++) laneTypes[others[i]] = this.pickType(distance);
      // občas i volnou dráhu zaplníme přeskočitelnou/podklouznutelnou překážkou
      if (d > 0.25 && Math.random() < 0.14) {
        laneTypes[free] = distance > 180 && Math.random() < 0.3 ? 'joint' : (Math.random() < 0.5 ? 'cup' : 'cig');
        gap += speed * 0.3;
      }
    }

    for (let l = 0; l < 3; l++) if (laneTypes[l]) this.place(laneTypes[l], l, z);

    // krabice v prostoru před touto řadou (mezi ní a předchozí řadou)
    if (Math.random() < 0.7) {
      const freeLanes = [0, 1, 2].filter(l => !laneTypes[l] || !TYPES[laneTypes[l]].tall);
      const lane = freeLanes.length && Math.random() < 0.6 ? freeLanes[rnd(freeLanes.length)] : rnd(3);
      const t = laneTypes[lane];
      const start = z + 4, end = z + this.prevGap - 4;
      for (let bz = start; bz <= end; bz += 2.4) this.addBox(lane, 0.75, bz);
      if (t && TYPES[t].low) {
        // oblouk krabic přes nízkou překážku
        this.addBox(lane, 1.9, z + 2.2);
        this.addBox(lane, 2.7, z);
        this.addBox(lane, 1.9, z - 2.2);
      } else if (t === 'joint') {
        this.addBox(lane, 0.5, z);
      }
    }
    this.prevGap = gap;
    return gap;
  }

  update(dt, move, speed, distance) {
    this.time += dt;
    // generování řad (kurzor se posouvá spolu se světem)
    this.nextRowZ += move;
    while (this.nextRowZ > SPAWN_Z) {
      const gap = this.spawnRow(this.nextRowZ, speed, distance);
      this.nextRowZ -= gap;
    }

    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i];
      o.position.z += move;
      if (o.position.z > DESPAWN_Z) {
        this.pools[o.userData.type].release(o);
        this.active[i] = this.active[this.active.length - 1];
        this.active.pop();
        continue;
      }
      const smoke = o.userData.smoke;
      if (smoke && o.position.z > -60) {
        for (const p of smoke) {
          const k = (this.time * 0.7 + p.userData.off) % 1;
          p.position.set(p.userData.bx + k * 0.25, p.userData.by + k * 0.9, p.userData.bz + Math.sin(k * 6 + p.userData.off * 9) * 0.1);
          p.scale.setScalar(0.5 + k * 1.1);
        }
      }
    }
    for (let i = this.boxes.length - 1; i >= 0; i--) {
      const b = this.boxes[i];
      b.position.z += move;
      if (b.position.z > DESPAWN_Z) { this.removeBoxAt(i); continue; }
      b.rotation.y += dt * 3;
      b.position.y = b.userData.baseY + Math.sin(this.time * 4 + b.position.z * 0.3) * 0.08;
    }
  }

  removeBoxAt(i) {
    this.boxPool.release(this.boxes[i]);
    this.boxes[i] = this.boxes[this.boxes.length - 1];
    this.boxes.pop();
  }
}
