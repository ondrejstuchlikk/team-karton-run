// Prostředí: běžecká trať, chodníky, tráva, stromy, lampy, cedule TEAM KARTON.
import * as THREE from 'three';
import { part, merge, vcMaterial, canvasTexture, makeCanvas } from './geo.js';

const ROAD_LEN = 280;
const ROAD_W = 12;          // trať + obrubníky + chodníky
const TILE = 4;             // délka jedné dlaždice textury (jednotky)
const SLOT_SPACING = 11;
const SLOT_COUNT = 16;      // na každé straně
const SCENERY_END = 30;     // kulisy mizí až daleko za kamerou (v menu se kamera dívá dozadu)
const SCENERY_SPAN = SLOT_SPACING * SLOT_COUNT;

function makeRoadTexture(renderer) {
  const W = 256, H = 256;
  const c = makeCanvas(W, H);
  const x = c.getContext('2d');
  const px = X => (X + ROAD_W / 2) * (W / ROAD_W);

  // chodníky
  x.fillStyle = '#c9c4bb'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#a9a39a'; x.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const y = i * H / 4 + 1;
    x.beginPath(); x.moveTo(0, y); x.lineTo(px(-3.7), y); x.moveTo(px(3.7), y); x.lineTo(W, y); x.stroke();
  }
  // obrubníky
  x.fillStyle = '#f2f2f2';
  x.fillRect(px(-3.75), 0, px(-3.45) - px(-3.75), H);
  x.fillRect(px(3.45), 0, px(3.75) - px(3.45), H);
  x.fillStyle = '#d23b2e';
  for (let i = 0; i < 2; i++) {
    x.fillRect(px(-3.75), i * H / 2, px(-3.45) - px(-3.75), H / 4);
    x.fillRect(px(3.45), i * H / 2 + H / 4, px(3.75) - px(3.45), H / 4);
  }
  // tartan
  x.fillStyle = '#c4553c'; x.fillRect(px(-3.45), 0, px(3.45) - px(-3.45), H);
  // zrnitost pro pocit pohybu
  for (let i = 0; i < 900; i++) {
    const X = px(-3.45) + Math.random() * (px(3.45) - px(-3.45));
    const Y = Math.random() * H;
    x.fillStyle = Math.random() < 0.5 ? 'rgba(90,20,10,0.25)' : 'rgba(255,200,170,0.18)';
    x.fillRect(X, Y, 2, 2);
  }
  // čáry drah
  x.fillStyle = '#ffffff';
  for (const L of [-3, -1, 1, 3]) x.fillRect(px(L) - 1.5, 0, 3, H);
  // krátké značky mezi čarami (lepší vjem rychlosti)
  x.fillStyle = 'rgba(255,255,255,0.55)';
  for (const L of [-2, 0, 2]) x.fillRect(px(L) - 1, H * 0.1, 2, H * 0.08);

  const t = canvasTexture(c);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, ROAD_LEN / TILE);
  t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return t;
}

// ---------- low-poly kulisy (každá = 1 mesh) ----------
function treeGeo(variant) {
  const trunk = part(new THREE.CylinderGeometry(0.14, 0.2, 1.2, 6), '#7a4f2c', { y: 0.6 });
  if (variant === 0) {
    return merge([
      trunk,
      part(new THREE.ConeGeometry(1.1, 1.8, 7), '#3f9b45', { y: 1.8 }),
      part(new THREE.ConeGeometry(0.85, 1.5, 7), '#4fb354', { y: 2.7 }),
    ]);
  }
  return merge([
    trunk,
    part(new THREE.IcosahedronGeometry(1.05, 0), '#5aa844', { y: 2.0 }),
    part(new THREE.IcosahedronGeometry(0.7, 0), '#6cbc4f', { x: 0.45, y: 2.6, z: 0.2 }),
  ]);
}

function lampGeo() {
  return merge([
    part(new THREE.CylinderGeometry(0.07, 0.1, 4.2, 6), '#40464f', { y: 2.1 }),
    part(new THREE.BoxGeometry(1.0, 0.08, 0.1), '#40464f', { x: -0.45, y: 4.15 }),
    part(new THREE.BoxGeometry(0.42, 0.14, 0.26), '#2d3238', { x: -0.9, y: 4.08 }),
    part(new THREE.BoxGeometry(0.34, 0.05, 0.2), '#fff4c2', { x: -0.9, y: 4.0 }),
  ]);
}

function bushGeo() {
  return merge([
    part(new THREE.IcosahedronGeometry(0.6, 0), '#4a9e3f', { y: 0.4, sy: 0.75 }),
    part(new THREE.IcosahedronGeometry(0.45, 0), '#5cb24a', { x: 0.5, y: 0.35, sy: 0.8 }),
  ]);
}

function signPostsGeo() {
  return merge([
    part(new THREE.BoxGeometry(0.12, 2.6, 0.12), '#6d4c2f', { x: -0.9, y: 1.3 }),
    part(new THREE.BoxGeometry(0.12, 2.6, 0.12), '#6d4c2f', { x: 0.9, y: 1.3 }),
    part(new THREE.BoxGeometry(2.3, 1.05, 0.08), '#8b5e34', { y: 2.15, z: -0.03 }),
  ]);
}

function signTexture() {
  const c = makeCanvas(256, 112);
  const x = c.getContext('2d');
  x.fillStyle = '#d9a25f'; x.fillRect(0, 0, 256, 112);
  x.fillStyle = '#c28a4a';
  for (let i = 0; i < 12; i++) x.fillRect(0, 6 + i * 9, 256, 2); // vlnitá lepenka
  x.fillStyle = 'rgba(240,215,160,0.9)'; x.fillRect(112, 0, 32, 112); // lepicí páska
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 6; x.strokeStyle = '#3a220e'; x.fillStyle = '#fff';
  x.font = 'bold 34px sans-serif';
  x.strokeText('TEAM', 128, 34); x.fillText('TEAM', 128, 34);
  x.font = 'bold 44px sans-serif';
  x.strokeText('KARTON', 128, 78); x.fillText('KARTON', 128, 78);
  return canvasTexture(c);
}

export class World {
  constructor(scene, renderer) {
    this.scene = scene;

    // obloha – gradientová kopule (bez mlhy)
    const skyGeo = new THREE.SphereGeometry(400, 16, 10);
    const colors = [];
    const top = new THREE.Color('#4fa7ea'), hor = new THREE.Color('#bfe6ff');
    const pos = skyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const t = Math.max(0, pos.getY(i) / 400);
      const col = hor.clone().lerp(top, Math.pow(t, 0.6));
      colors.push(col.r, col.g, col.b);
    }
    skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.renderOrder = -1;
    scene.add(sky);

    // tráva
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshLambertMaterial({ color: '#7fc46a' })
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(0, -0.03, -120);
    scene.add(grass);

    // trať
    this.roadTex = makeRoadTexture(renderer);
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_W, ROAD_LEN),
      new THREE.MeshLambertMaterial({ map: this.roadTex })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, 60 - ROAD_LEN / 2);
    scene.add(road);

    // kulisy
    this.geos = {
      tree0: treeGeo(0), tree1: treeGeo(1), lamp: lampGeo(), bush: bushGeo(), sign: signPostsGeo(),
    };
    this.signBoardGeo = new THREE.PlaneGeometry(2.1, 0.92);
    this.signMat = new THREE.MeshLambertMaterial({ map: signTexture() });

    this.items = [];
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < SLOT_COUNT; i++) {
        const holder = new THREE.Group();
        holder.userData.side = side;
        holder.position.z = SCENERY_END - i * SLOT_SPACING - (side > 0 ? SLOT_SPACING / 2 : 0);
        scene.add(holder);
        this.items.push(holder);
        this.decorate(holder, i);
      }
    }
  }

  /** Náhodně (znovu)osadí slot kulisou – meshe se nevytváří, jen přehazují. */
  decorate(holder, seed = -1) {
    const side = holder.userData.side;
    if (!holder.userData.meshes) {
      // Každý slot má předpřipravené všechny varianty, zobrazí se jen jedna.
      const m = {};
      for (const k of ['tree0', 'tree1', 'lamp', 'bush']) {
        m[k] = new THREE.Mesh(this.geos[k], vcMaterial);
        holder.add(m[k]);
      }
      const sign = new THREE.Group();
      sign.add(new THREE.Mesh(this.geos.sign, vcMaterial));
      const board = new THREE.Mesh(this.signBoardGeo, this.signMat);
      board.position.set(0, 2.15, 0.02);
      sign.add(board);
      holder.add(sign);
      m.sign = sign;
      holder.userData.meshes = m;
    }
    const m = holder.userData.meshes;
    const r = Math.random();
    let kind;
    if (seed === 2 || seed === 8) kind = 'sign';
    else if (seed >= 0 && seed % 4 === 1) kind = 'lamp';
    else kind = r < 0.07 ? 'sign' : r < 0.25 ? 'lamp' : r < 0.42 ? 'bush' : r < 0.72 ? 'tree0' : 'tree1';
    for (const k in m) m[k].visible = k === kind;

    const obj = m[kind];
    if (kind === 'lamp') {
      holder.position.x = side * 4.3;
      obj.rotation.y = side > 0 ? 0 : Math.PI;       // rameno lampy nad trať
      obj.scale.setScalar(1);
    } else if (kind === 'sign') {
      holder.position.x = side * 5.6;
      obj.rotation.y = -side * 0.35;                 // natočení ke kameře
      obj.scale.setScalar(1);
    } else {
      holder.position.x = side * (5.4 + Math.random() * 2.5);
      obj.rotation.y = Math.random() * Math.PI * 2;
      obj.scale.setScalar(0.8 + Math.random() * 0.5);
    }
  }

  reset() {
    this.roadTex.offset.y = 0;
  }

  update(dt, speed) {
    const move = speed * dt;
    this.roadTex.offset.y = (this.roadTex.offset.y + move / TILE) % 1;
    for (const h of this.items) {
      h.position.z += move;
      if (h.position.z > SCENERY_END) {
        h.position.z -= SCENERY_SPAN;
        this.decorate(h);
      }
    }
  }
}
