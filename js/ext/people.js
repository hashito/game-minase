// The people of the hospital:
//   あれ（浅井早苗）- built once from plain shapes (shared materials, compiled at the warm-up): a stooped body in a torn lab coat, wet black
//                     hair over the face, too many arms of different skins (the specimens), the hips always under the water line.
//   ひなた          - the kit's person (js/kit/character.js): a hoodie, a ponytail; she stands, limps (crouch) or holds the valve.
import * as THREE from 'three';
import { makeCharacter } from '../kit/character.js';

const M = {};
export const mats = () => {
  if (M.coat) return M;
  M.coat = new THREE.MeshStandardMaterial({ color: 0xb9b8ae, roughness: 0.95, side: THREE.DoubleSide });
  M.skin = [0xb7b3a6, 0x9d968a, 0xc4bcae, 0x8f8a80].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, emissive: 0x141816, emissiveIntensity: 0.6 }));
  M.hair = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.4, side: THREE.DoubleSide });
  M.dark = new THREE.MeshStandardMaterial({ color: 0x1d201e, roughness: 0.9 });
  M.seam = new THREE.MeshStandardMaterial({ color: 0x3b2a26, roughness: 0.8 });
  M.mist = new THREE.SpriteMaterial({ map: mistTexture(), color: 0x6b7a72, transparent: true, opacity: 0.25, depthWrite: false });
  return M;
};
function mistTexture() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,0.9)'); r.addColorStop(0.5, 'rgba(255,255,255,0.3)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** あれ: the water line at y 0 (the body below it is hidden by the water), facing +z. Hair over the face, six arms. */
export function buildChimera() {
  const m = mats(), root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const add = (geo, mat, x, y, z, parent = body) => { const k = new THREE.Mesh(geo, mat); k.position.set(x, y, z); parent.add(k); return k; };
  // the torso rises out of the water, stooped forward; the coat hangs in rags into the water
  add(new THREE.CylinderGeometry(0.2, 0.32, 1.0, 10), m.coat, 0, 0.35, 0).rotation.x = 0.25;
  add(new THREE.CylinderGeometry(0.17, 0.2, 0.5, 10), m.skin[0], 0, 1.0, 0.1).rotation.x = 0.35;
  for (let i = 0; i < 6; i++) { const r = add(new THREE.PlaneGeometry(0.14, 0.7 + (i % 3) * 0.2), m.coat, Math.sin(i * 1.1) * 0.28, 0.0, Math.cos(i * 1.1) * 0.24); r.rotation.y = i * 1.1; }
  // seams where the parts were joined
  for (let i = 0; i < 4; i++) { const s = add(new THREE.TorusGeometry(0.19 - i * 0.01, 0.012, 4, 14), m.seam, 0, 0.7 + i * 0.16, 0.05 + i * 0.03); s.rotation.x = Math.PI / 2 + 0.3; }
  const head = new THREE.Group(); head.position.set(0, 1.42, 0.28); body.add(head);
  add(new THREE.SphereGeometry(0.11, 12, 10), m.skin[2], 0, 0, 0, head).scale.set(0.9, 1.15, 0.95);
  add(new THREE.SphereGeometry(0.125, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), m.hair, 0, 0.02, -0.005, head);
  const strands = [];
  for (let i = 0; i < 9; i++) { const s = add(new THREE.PlaneGeometry(0.05, 0.9 + (i % 3) * 0.12), m.hair, -0.11 + i * 0.027, -0.42, 0.12 - Math.abs(i - 4) * 0.01, head); s.rotation.y = (i - 4) * 0.07; strands.push(s); }
  add(new THREE.PlaneGeometry(0.32, 1.0), m.hair, 0, -0.45, -0.12, head);
  // six arms of different skins: two at the shoulders, four lower down the body (the specimens joined to her)
  const arms = [];
  const ARMS = [[0.21, 1.15, 0], [-0.21, 1.15, 1], [0.27, 0.8, 2], [-0.27, 0.8, 3], [0.24, 0.5, 1], [-0.24, 0.5, 2]];
  for (const [x, y, si] of ARMS) {
    const arm = new THREE.Group(); arm.position.set(x, y, 0.08); body.add(arm);
    const sm = m.skin[si];
    add(new THREE.CylinderGeometry(0.045, 0.055, 0.5, 8), sm, 0, -0.25, 0, arm);
    add(new THREE.CylinderGeometry(0.035, 0.045, 0.45, 8), sm, 0, -0.7, 0.04, arm);
    const hand = add(new THREE.BoxGeometry(0.07, 0.15, 0.035), sm, 0, -0.98, 0.06, arm);
    for (let f = 0; f < 4; f++) add(new THREE.BoxGeometry(0.012, 0.08, 0.012), sm, -0.025 + f * 0.017, -0.1, 0, hand);
    arm.rotation.z = Math.sign(x) * (0.35 + Math.abs(y - 1.15) * 0.4);
    arm.userData.sx = Math.sign(x);
    arms.push(arm);
  }
  const mist = [];
  for (let i = 0; i < 3; i++) { const s = new THREE.Sprite(m.mist); s.scale.setScalar(1.3 + i * 0.3); s.position.set(i % 2 ? 0.25 : -0.25, 0.2 + i * 0.4, 0.1); root.add(s); mist.push(s); }
  return { root, body, head, arms, strands, mist };
}

/** ひなた: the kit's person; poses: 'idle', 'scared', 'crouch' (holding the valve / the ankle) */
export function buildHinata() {
  const ch = makeCharacter({ female: true, hairStyle: 'ponytail', coat: 0x4c5a52, shirt: 0xd8d4c8, trousers: 0x2a2f3a, shoes: 0x2a2624, hair: 0x241a14, blob: true });
  ch.root.name = 'person:hinata';
  return ch;
}
