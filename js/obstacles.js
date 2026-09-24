// Překážky (láhve, barely, cigarety, jointy), sbíratelné kartony a kelímky
// s kratomem (zrychlení), object pooling a generátor řad, který vždy nechá průchozí cestu.
import * as THREE from 'three';
import { part, merge, vcMaterial, labelTexture, canvasTexture, makeCanvas } from './geo.js';
import { LANES, SPAWN_Z, DESPAWN_Z, START_SPEED } from './config.js';

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
const labelBigMat = new THREE.MeshLambertMaterial({ map: kratomLabelBig });

const GEO = {};
function geos() {
  if (GEO.ready) return GEO;
  // Kelímek s kratomem (průhledná slupka + kalný zelenohnědý nápoj uvnitř)
  GEO.cupInner = merge([
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

// ---------- kelímek s kratomem (sbíratelný, dává zrychlení) ----------
const KRATOM_SCALE = 0.62;
const kratomInnerMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: '#2a3308' });
const kratomLabelMat = new THREE.MeshLambertMaterial({ map: kratomLabel, emissive: '#3a3010' });

function glowTexture() {
  const c = makeCanvas(64, 64), x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,240,150,0.9)');
  g.addColorStop(0.45, 'rgba(255,200,60,0.35)');
  g.addColorStop(1, 'rgba(255,180,40,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return canvasTexture(c);
}
const kratomGlowMat = new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });

function buildKratom() {
  const g = geos(), o = new THREE.Group();
  const cup = new THREE.Group();
  cup.add(new THREE.Mesh(g.cupInner, kratomInnerMat));
  cup.add(new THREE.Mesh(g.cupLabel, kratomLabelMat));
  const shell = new THREE.Mesh(g.cupShell, cupShellMat);
  shell.renderOrder = 1;
  cup.add(shell);
  cup.scale.setScalar(KRATOM_SCALE);
  cup.position.y = -0.35;
  o.add(cup);
  const glow = new THREE.Sprite(kratomGlowMat);
  glow.scale.setScalar(1.7);
  glow.renderOrder = 2;
  o.add(glow);
  o.userData.glow = glow;
  return o;
}

/**
 * Vyrenderuje náhledy kelímku, láhve a sudu do obrázků (pro nápovědu před startem).
 * Používá dočasný vlastní WebGL kontext, který hned uvolní.
 */
export function renderThumbs(size = 160) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(size, size, false);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#e6f4ff', '#5e8a4a', 1.6));
  const sun = new THREE.DirectionalLight('#fff3dd', 2.0);
  sun.position.set(4, 10, 6);
  scene.add(sun);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const box = new THREE.Box3(), c = new THREE.Vector3(), sz = new THREE.Vector3();
  const shot = obj => {
    scene.add(obj);
    box.setFromObject(obj).getCenter(c);
    box.getSize(sz);
    const d = Math.max(sz.x, sz.y) * 0.5 / Math.tan(THREE.MathUtils.degToRad(15)) * 1.1 + sz.z * 0.5;
    cam.position.set(c.x + d * 0.3, c.y + d * 0.3, c.z + d);
    cam.lookAt(c);
    r.render(scene, cam);
    scene.remove(obj);
    return r.domElement.toDataURL('image/png');
  };
  const cup = buildKratom();
  cup.remove(cup.userData.glow);
  const out = { kratom: shot(cup), bottle: shot(TYPES.bottle.build()), barrel: shot(TYPES.barrel.build()) };
  r.dispose();
  r.forceContextLoss();
  return out;
}

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
// Pauza mezi kelímky kratomu: 5–15 s, v průměru 10 s (součet dvou náhod => častěji kolem středu)
const kratomInterval = () => 5 + (Math.random() + Math.random()) * 5;
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
    this.kratomPool = new Pool(scene, buildKratom, 3);
    this.active = [];   // překážky
    this.boxes = [];    // krabice
    this.kratoms = [];  // kelímky s kratomem
    this.time = 0;
    this.reset();
  }

  reset() {
    for (const o of this.active) this.pools[o.userData.type].release(o);
    for (const b of this.boxes) this.boxPool.release(b);
    for (const k of this.kratoms) this.kratomPool.release(k);
    this.active.length = 0;
    this.boxes.length = 0;
    this.kratoms.length = 0;
    this.runT = 0;           // čas běhu (s) – pro časování kratomu
    this.nextKratomT = 0;    // kdy (čas běhu) má další kratom doběhnout k hráči; 0 = hned v první řadě
    this.nextRowZ = -48;     // první řada kousek před hráčem
    this.prevGap = 30;
    this.lastFree = 1;
  }

  pickType(distance) {
    const jointW = distance > 180 ? 11 : 0;
    const w = { bottle: 24, barrel: 22, cig: 34, joint: jointW };
    let r = Math.random() * (w.bottle + w.barrel + w.cig + w.joint);
    for (const k in w) { if ((r -= w[k]) < 0) return k; }
    return 'cig';
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

  addKratom(lane, y, z) {
    const k = this.kratomPool.get();
    k.position.set(LANES[lane], y, z);
    k.userData.baseY = y;
    k.userData.lane = lane;
    this.kratoms.push(k);
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
        laneTypes[free] = distance > 180 && Math.random() < 0.3 ? 'joint' : 'cig';
        gap += speed * 0.3;
      }
    }

    for (let l = 0; l < 3; l++) if (laneTypes[l]) this.place(laneTypes[l], l, z);

    // krabice v prostoru před touto řadou (mezi ní a předchozí řadou)
    let boxLane = -1;
    if (Math.random() < 0.7) {
      const freeLanes = [0, 1, 2].filter(l => !laneTypes[l] || !TYPES[laneTypes[l]].tall);
      const lane = freeLanes.length && Math.random() < 0.6 ? freeLanes[rnd(freeLanes.length)] : rnd(3);
      const t = laneTypes[lane];
      boxLane = lane;
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

    // kratom: k hráči dorazí v průměru jednou za 10 s (první hned v první řadě),
    // uprostřed mezery před řadou, mimo řadu krabic
    const kz = z + this.prevGap * 0.5;
    const eta = this.runT - kz / Math.max(speed, START_SPEED);   // odhad, kdy doběhne k hráči
    if (eta >= this.nextKratomT) {
      const lanes = [0, 1, 2].filter(l => l !== boxLane);
      this.addKratom(lanes[rnd(lanes.length)], 0.95, kz);
      this.nextKratomT = eta + kratomInterval();
    }
    this.prevGap = gap;
    return gap;
  }

  update(dt, move, speed, distance) {
    this.time += dt;
    this.runT += dt;
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
    for (let i = this.kratoms.length - 1; i >= 0; i--) {
      const k = this.kratoms[i];
      k.position.z += move;
      if (k.position.z > DESPAWN_Z) { this.removeKratomAt(i); continue; }
      k.rotation.y += dt * 2.2;
      k.position.y = k.userData.baseY + Math.sin(this.time * 3.5) * 0.12;
      k.userData.glow.material.opacity = 0.75 + Math.sin(this.time * 6) * 0.25;
    }
  }

  removeKratomAt(i) {
    this.kratomPool.release(this.kratoms[i]);
    this.kratoms[i] = this.kratoms[this.kratoms.length - 1];
    this.kratoms.pop();
  }

  removeBoxAt(i) {
    this.boxPool.release(this.boxes[i]);
    this.boxes[i] = this.boxes[this.boxes.length - 1];
    this.boxes.pop();
  }
}
