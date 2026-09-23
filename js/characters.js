// Postavy týmu, jejich 3D low-poly model (s účesem a obličejem) a 2D avatar pro UI.
import * as THREE from 'three';
import { canvasTexture, makeCanvas } from './geo.js';

export const CHARACTERS = [
  { id: 'rob',   name: 'Rob', gen: 'Roba',   color: '#e53935', hair: 'bald',       hairColor: '#5a3d2b', tagline: 'Aerodynamika na maximum' },
  { id: 'pepan', name: 'Pepan', gen: 'Pepana', color: '#1e88e5', hair: 'short',      hairColor: '#2a1c14', tagline: 'Tichý tempař' },
  { id: 'kuba',  name: 'Kuba', gen: 'Kubu',  color: '#43a047', hair: 'shortCrown', hairColor: '#2f2119', tagline: 'Kopcový specialista' },
  { id: 'ondra', name: 'Ondra', gen: 'Ondru', color: '#fb8c00', hair: 'medium',     hairColor: '#e2bf6e', tagline: 'Vlasy ve větru' },
];

export const getCharacter = id => CHARACTERS.find(c => c.id === id) || CHARACTERS[0];

const SKIN = '#f0c39c';

// ---------- sdílené geometrie ----------
const boxG = (w, h, d, oy = 0, oz = 0) => {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, oy, oz);
  return g;
};
const G = {
  thigh: boxG(0.21, 0.46, 0.23, -0.23),
  shin: boxG(0.17, 0.44, 0.19, -0.22),
  shoe: boxG(0.2, 0.13, 0.34, -0.5, -0.06),
  shorts: boxG(0.56, 0.3, 0.3),
  torso: boxG(0.6, 0.62, 0.32),
  upperArm: boxG(0.16, 0.34, 0.17, -0.17),
  foreArm: boxG(0.14, 0.3, 0.15, -0.15),
  hand: boxG(0.13, 0.12, 0.14, -0.35),
  neck: new THREE.CylinderGeometry(0.08, 0.09, 0.14, 6),
  head: new THREE.SphereGeometry(0.24, 12, 9),
  eye: new THREE.SphereGeometry(0.029, 6, 4),
  brow: boxG(0.1, 0.022, 0.03),
  nose: boxG(0.05, 0.07, 0.06),
  mouth: boxG(0.1, 0.022, 0.02),
  ear: new THREE.SphereGeometry(0.05, 6, 4),
  hairShort: new THREE.SphereGeometry(0.257, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
  hairMedium: new THREE.SphereGeometry(0.268, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
  fringe: new THREE.SphereGeometry(0.276, 10, 3, 0, Math.PI * 2, 0, 0.3),
  crown: new THREE.CircleGeometry(0.034, 10),
  plate: new THREE.PlaneGeometry(0.5, 0.36),
};

const matCache = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts }));
  return matCache.get(key);
}

function mixColor(a, b, t) {
  return '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
}

function namePlateTexture(ch) {
  const c = makeCanvas(256, 184), x = c.getContext('2d');
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineJoin = 'round';
  x.font = 'bold 30px sans-serif';
  x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,0.55)'; x.fillStyle = '#fff';
  x.strokeText('TEAM KARTON', 128, 30); x.fillText('TEAM KARTON', 128, 30);
  const size = ch.name.length > 4 ? 64 : 76;
  x.font = `900 ${size}px sans-serif`;
  x.lineWidth = 10;
  x.strokeText(ch.name.toUpperCase(), 128, 112); x.fillText(ch.name.toUpperCase(), 128, 112);
  return canvasTexture(c);
}

/**
 * Postaví běžce. Kořen je natočený čelem k -z (směr běhu), záda (+z) ke kameře.
 * Vrací objekt s klouby pro animaci.
 */
export function buildRunner(ch) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const jersey = mat(ch.color);
  const skin = mat(SKIN);
  const shortsM = mat('#23272f');
  const shoeM = mat('#f4f4f4');
  const dark = mat('#1d1d1d');
  const hairM = mat(ch.hairColor, { side: THREE.DoubleSide });
  const browM = mat(ch.hairColor);

  const mesh = (g, m, x = 0, y = 0, z = 0, parent = body) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };

  // nohy
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(0.15 * side, 0.93, 0);
    body.add(hip);
    mesh(G.thigh, skin, 0, 0, 0, hip);
    const knee = new THREE.Group();
    knee.position.y = -0.46;
    hip.add(knee);
    mesh(G.shin, skin, 0, 0, 0, knee);
    mesh(G.shoe, shoeM, 0, 0, 0, knee);
    legs.push({ hip, knee });
  }

  mesh(G.shorts, shortsM, 0, 1.0);
  mesh(G.torso, jersey, 0, 1.42);
  mesh(G.neck, skin, 0, 1.79);

  // jméno na zádech
  const plate = new THREE.Mesh(G.plate, new THREE.MeshBasicMaterial({ map: namePlateTexture(ch), transparent: true }));
  plate.position.set(0, 1.44, 0.165);
  body.add(plate);

  // ruce
  const arms = [];
  for (const side of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(0.39 * side, 1.68, 0);
    body.add(sh);
    mesh(G.upperArm, jersey, 0, 0, 0, sh);
    const el = new THREE.Group();
    el.position.y = -0.34;
    sh.add(el);
    mesh(G.foreArm, skin, 0, 0, 0, el);
    mesh(G.hand, skin, 0, 0, 0, el);
    arms.push({ sh, el });
  }

  // hlava
  const head = new THREE.Group();
  head.position.y = 2.03;
  body.add(head);
  mesh(G.head, skin, 0, 0, 0, head);
  for (const side of [-1, 1]) {
    mesh(G.eye, dark, 0.085 * side, 0.03, -0.212, head);
    const brow = mesh(G.brow, browM, 0.088 * side, 0.095, -0.215, head);
    brow.rotation.z = -0.12 * side;
    const ear = mesh(G.ear, skin, 0.238 * side, 0, 0.01, head);
    ear.scale.set(0.7, 1.3, 1);
  }
  mesh(G.nose, skin, 0, -0.02, -0.245, head);
  mesh(G.mouth, mat('#9b3b2e'), 0, -0.1, -0.215, head);

  // účesy
  if (ch.hair === 'short' || ch.hair === 'shortCrown') {
    const cap = mesh(G.hairShort, hairM, 0, 0, 0, head);
    cap.rotation.x = 0.7;
    if (ch.hair === 'shortCrown') {
      // velmi jemný náznak řídnutí na temeni – vidět je hlavně z kamery za/nad běžcem
      const pivot = new THREE.Group();
      pivot.rotation.x = 0.45;
      head.add(pivot);
      const spot = mesh(G.crown, mat(mixColor(ch.hairColor, SKIN, 0.3)), 0, 0.2585, 0, pivot);
      spot.rotation.x = -Math.PI / 2;
    }
  } else if (ch.hair === 'medium') {
    // středně dlouhé světlé vlasy: čepice sahající vzadu až ke krku
    const cap = mesh(G.hairMedium, hairM, 0, 0, 0, head);
    cap.rotation.x = 0.75;
    // ofina sčesaná do strany (malá „čepička“ na čele)
    const fringe = mesh(G.fringe, hairM, 0, 0, 0, head);
    fringe.rotation.set(-0.85, 0, 0.35);
    // vlasy vzadu po krk
    mesh(boxG(0.44, 0.3, 0.12), hairM, 0, -0.13, 0.17, head);
    // prameny po stranách přes uši
    for (const side of [-1, 1]) {
      const lock = mesh(boxG(0.06, 0.26, 0.17), hairM, 0.25 * side, -0.07, 0.07, head);
      lock.rotation.z = 0.06 * side;
    }
  }
  // Rob: plešatý – žádné vlasy, jen lesklá hlava 🙂

  return { root, body, legs, arms, head };
}

// ---------- 2D avatar (pro karty, HUD, game over) ----------
const avatarCache = new Map();
export function avatarURL(ch, S = 256) {
  const key = ch.id + S;
  if (avatarCache.has(key)) return avatarCache.get(key);
  const c = makeCanvas(S, S), x = c.getContext('2d');
  const k = S / 256;
  x.scale(k, k);
  const cx = 128, cy = 120, r = 64;

  // pozadí v barvě dresu
  x.fillStyle = ch.color;
  x.beginPath(); x.arc(128, 128, 128, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(255,255,255,0.15)';
  x.beginPath(); x.arc(128, 128, 110, 0, Math.PI * 2); x.fill();

  // ramena a dres
  x.fillStyle = ch.color;
  x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 4;
  x.beginPath(); x.ellipse(128, 262, 100, 72, 0, Math.PI, 0); x.fill(); x.stroke();
  x.fillStyle = SKIN;
  x.fillRect(112, 170, 32, 30);

  // dlouhé vlasy za hlavou
  if (ch.hair === 'medium') {
    x.fillStyle = ch.hairColor;
    x.beginPath();
    if (x.roundRect) x.roundRect(cx - r - 10, cy - r - 8, (r + 10) * 2, r * 2 + 20, 40);
    else x.rect(cx - r - 10, cy - r - 8, (r + 10) * 2, r * 2 + 20);
    x.fill();
  }

  // uši a hlava
  x.fillStyle = SKIN;
  x.beginPath(); x.ellipse(cx - r + 2, cy + 6, 12, 18, 0, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.ellipse(cx + r - 2, cy + 6, 12, 18, 0, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.ellipse(cx, cy, r - 4, r, 0, 0, Math.PI * 2); x.fill();

  // vlasy vpředu
  x.fillStyle = ch.hairColor;
  if (ch.hair === 'short' || ch.hair === 'shortCrown') {
    x.save();
    x.beginPath(); x.rect(0, 0, 256, cy - r * 0.42); x.clip();
    x.beginPath(); x.ellipse(cx, cy, r + 2, r + 6, 0, 0, Math.PI * 2); x.fill();
    x.restore();
    x.fillRect(cx - r + 2, cy - r * 0.5, 9, 26);   // kotlety
    x.fillRect(cx + r - 11, cy - r * 0.5, 9, 26);
  } else if (ch.hair === 'medium') {
    x.save();
    x.beginPath(); x.rect(0, 0, 256, cy - r * 0.3); x.clip();
    x.beginPath(); x.ellipse(cx, cy, r + 6, r + 8, 0, 0, Math.PI * 2); x.fill();
    x.restore();
    x.beginPath(); // ofina do strany
    x.moveTo(cx - r + 4, cy - r * 0.35);
    x.quadraticCurveTo(cx - 10, cy - r * 0.05, cx + r * 0.7, cy - r * 0.55);
    x.lineTo(cx + r * 0.2, cy - r * 0.8);
    x.closePath(); x.fill();
    x.fillRect(cx - r - 4, cy - r * 0.4, 14, r * 1.2);
    x.fillRect(cx + r - 10, cy - r * 0.4, 14, r * 1.2);
  } else if (ch.hair === 'bald') {
    x.fillStyle = 'rgba(255,255,255,0.45)';
    x.beginPath(); x.ellipse(cx - 18, cy - r + 16, 20, 8, -0.3, 0, Math.PI * 2); x.fill();
  }

  // obličej
  x.fillStyle = '#1d1d1d';
  x.beginPath(); x.arc(cx - 22, cy + 4, 6.5, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.arc(cx + 22, cy + 4, 6.5, 0, Math.PI * 2); x.fill();
  x.strokeStyle = ch.hairColor; x.lineWidth = 5; x.lineCap = 'round';
  x.beginPath(); x.moveTo(cx - 32, cy - 12); x.lineTo(cx - 13, cy - 15); x.stroke();
  x.beginPath(); x.moveTo(cx + 13, cy - 15); x.lineTo(cx + 32, cy - 12); x.stroke();
  x.strokeStyle = '#c9936c'; x.lineWidth = 4;
  x.beginPath(); x.moveTo(cx, cy + 6); x.lineTo(cx - 5, cy + 22); x.lineTo(cx + 3, cy + 24); x.stroke();
  x.strokeStyle = '#9b3b2e'; x.lineWidth = 5;
  x.beginPath(); x.arc(cx, cy + 26, 18, 0.2 * Math.PI, 0.8 * Math.PI); x.stroke();
  x.fillStyle = 'rgba(255,120,120,0.25)';
  x.beginPath(); x.arc(cx - 36, cy + 24, 10, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.arc(cx + 36, cy + 24, 10, 0, Math.PI * 2); x.fill();

  const url = c.toDataURL('image/png');
  avatarCache.set(key, url);
  return url;
}
