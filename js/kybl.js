// Kýbl: 2L PET láhev plná bílého kouře, víčkem dolů, ve víčku zastrčená skleněnka.
// Stejný model se nosí na zádech při letu i leží na trati jako sbíratelný bonus.
import * as THREE from 'three';
import { part, merge, vcMaterial } from './geo.js';

const R = 0.13;          // poloměr láhve
const TUBE_TILT = 0.35;  // skleněnka míří šikmo dozadu, ať kouř nejde běžci na nohy
const TUBE_LEN = 0.22;

const G = {};
function geos() {
  if (G.ready) return G;
  // PET slupka: tělo, dno (nahoře) a zúžení k hrdlu (dole)
  G.shell = mergeShell();
  // kouř uvnitř láhve
  G.fill = new THREE.CylinderGeometry(R * 0.86, R * 0.86, 0.5, 14);
  G.fill.translate(0, 0.04, 0);
  // neprůhledné díly: hrdlo, víčko a stříbrná páska
  G.solid = merge([
    part(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 10), '#e9f4ef', { y: -0.34 }),
    part(new THREE.CylinderGeometry(0.062, 0.062, 0.014, 12), '#cfe3da', { y: -0.325 }),
    part(new THREE.CylinderGeometry(0.058, 0.058, 0.065, 12), '#2f6fe0', { y: -0.395 }),
    part(new THREE.CylinderGeometry(R + 0.008, R + 0.008, 0.045, 14), '#b9bec4', { y: 0.16 }),
    part(new THREE.CylinderGeometry(R + 0.008, R + 0.008, 0.045, 14), '#b9bec4', { y: -0.1 }),
  ]);
  // skleněnka: tenká trubička z víčka, na konci rozšířená kalíšková hlavička
  const tube = new THREE.CylinderGeometry(0.02, 0.02, TUBE_LEN, 8);
  tube.translate(0, -TUBE_LEN / 2, 0);
  const bowl = new THREE.CylinderGeometry(0.02, 0.048, 0.06, 10);
  bowl.translate(0, -TUBE_LEN - 0.03, 0);
  G.glass = merge([part(tube, '#ffffff'), part(bowl, '#ffffff')]);
  G.glass.rotateX(-TUBE_TILT);   // špička k +z = dozadu od zad běžce
  G.glass.translate(0, -0.425, 0);
  G.ready = true;
  return G;
}

function mergeShell() {
  const body = new THREE.CylinderGeometry(R, R, 0.48, 14, 1, true);
  body.translate(0, 0.06, 0);
  const bottom = new THREE.SphereGeometry(R, 14, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  bottom.scale(1, 0.4, 1);
  bottom.translate(0, 0.3, 0);
  const shoulder = new THREE.CylinderGeometry(R, 0.045, 0.14, 14, 1, true);
  shoulder.translate(0, -0.25, 0);
  return merge([part(body, '#ffffff'), part(bottom, '#ffffff'), part(shoulder, '#ffffff')]);
}

const shellMat = new THREE.MeshPhongMaterial({
  color: '#dff3ff', specular: '#ffffff', shininess: 90,
  transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide,
});
const fillMat = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#9aa4ad', transparent: true, opacity: 0.8 });
const glassMat = new THREE.MeshPhongMaterial({
  color: '#c9f0ff', specular: '#ffffff', shininess: 120, emissive: '#2c4a55',
  transparent: true, opacity: 0.75,
});

/**
 * Postaví kýbl s počátkem uprostřed láhve, víčko míří k -y.
 * userData.nozzle = bod na konci skleněnky, odkud tryská kouř.
 */
export function buildKybl() {
  const g = geos(), o = new THREE.Group();
  o.add(new THREE.Mesh(g.fill, fillMat));
  o.add(new THREE.Mesh(g.solid, vcMaterial));
  o.add(new THREE.Mesh(g.glass, glassMat));
  const shell = new THREE.Mesh(g.shell, shellMat);
  shell.renderOrder = 1;
  o.add(shell);
  const nozzle = new THREE.Object3D();
  const d = TUBE_LEN + 0.06;
  nozzle.position.set(0, -0.425 - Math.cos(TUBE_TILT) * d, Math.sin(TUBE_TILT) * d);
  o.add(nozzle);
  o.userData.nozzle = nozzle;
  return o;
}

/** Kýbl na záda: stříbrná páska přes záda drží láhev na dresu. */
export function buildBackKybl() {
  const o = buildKybl();
  const tape = merge([
    part(new THREE.BoxGeometry(0.52, 0.045, 0.02), '#b9bec4', { y: 0.16, z: -R - 0.005 }),
    part(new THREE.BoxGeometry(0.52, 0.045, 0.02), '#b9bec4', { y: -0.1, z: -R - 0.005 }),
  ]);
  o.add(new THREE.Mesh(tape, vcMaterial));
  return o;
}
