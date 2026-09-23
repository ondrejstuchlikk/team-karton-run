// Pomocné funkce pro low-poly geometrii: sloučení více primitiv do jedné
// geometrie s barvami ve vrcholech => 1 draw call na objekt.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _c = new THREE.Color();

/** Připraví díl: posun, rotace, škála a barva ve vrcholech. */
export function part(geometry, color, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  let g = geometry.index ? geometry.toNonIndexed() : geometry;
  geometry !== g && geometry.dispose();
  g.deleteAttribute('uv');
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz)
  );
  g.applyMatrix4(m);
  _c.set(color);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/** Sloučí díly do jedné geometrie (flat normály pro low-poly vzhled). */
export function merge(parts) {
  const g = mergeGeometries(parts, false);
  parts.forEach(p => p.dispose());
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** Sdílený materiál pro všechny objekty s barvami ve vrcholech. */
export const vcMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

/** Canvas -> textura se správným barevným prostorem. */
export function canvasTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/** Textura s nápisem (např. KRATOM na lahvi). */
export function labelTexture(text, { w = 256, h = 128, bg = '#f4e3b5', fg = '#2b5d1f', border = '#2b5d1f', font = 'bold 64px sans-serif', sub = null } = {}) {
  const c = makeCanvas(w, h);
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.strokeStyle = border; x.lineWidth = Math.max(4, h * 0.06);
  x.strokeRect(x.lineWidth, x.lineWidth, w - x.lineWidth * 2, h - x.lineWidth * 2);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = font;
  x.fillText(text, w / 2, sub ? h * 0.42 : h / 2);
  if (sub) {
    x.font = `bold ${Math.round(h * 0.16)}px sans-serif`;
    x.fillText(sub, w / 2, h * 0.76);
  }
  return canvasTexture(c);
}
