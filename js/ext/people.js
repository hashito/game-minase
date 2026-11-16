// The people of the hospital:
//   あれ（キメラ）  - 葛城's 合成標本 with 浅井早苗 taken into it on the flood night: torsos, heads and arms of different bodies sewn
//                     into one, jar glass and drain hoses in the flesh, 早苗's face on top; the hips always under the water line.
//   ひなた          - the kit's person (js/kit/character.js): a hoodie, a ponytail; she stands, limps (crouch) or holds the valve.
import * as THREE from 'three';
import { makeCharacter } from '../kit/character.js';

const M = {};
export const mats = () => {
  if (M.coat) return M;
  M.coat = new THREE.MeshStandardMaterial({ color: 0xb9b8ae, roughness: 0.95, side: THREE.DoubleSide });
  // four bodies' skins, all bleached and stained by the formalin (yellow-grey, blue-grey, brown, ash), never one colour
  M.skin = [0x8e8770, 0x667069, 0x8a7563, 0x58554f].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, emissive: 0x10120c, emissiveIntensity: 0.35 }));
  M.hair = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.4, side: THREE.DoubleSide });
  M.dark = new THREE.MeshStandardMaterial({ color: 0x1d201e, roughness: 0.9 });
  M.seam = new THREE.MeshStandardMaterial({ color: 0x3b2a26, roughness: 0.8 });
  M.stitch = new THREE.MeshStandardMaterial({ color: 0x14100e, roughness: 0.7 });
  M.glass = new THREE.MeshStandardMaterial({ color: 0xd8e4c8, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  M.formalin = new THREE.MeshStandardMaterial({ color: 0xc9b23a, roughness: 0.3, emissive: 0x3a3208, emissiveIntensity: 0.8, transparent: true, opacity: 0.8 });
  M.hose = new THREE.MeshStandardMaterial({ color: 0x1a1a18, roughness: 0.55 });
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

/** あれ（キメラ）: the water line at y 0 (the body below it hidden by the water), facing +z. 葛城's 合成標本: three torsos of different
 *  skins sewn into one hunched mass, a second lolling head on the shoulder, arms of different lengths (one grows out of the back), the
 *  glass of broken specimen jars set in the flesh, rubber drain hoses running from the body into the water, and on top 早苗's face under
 *  the wet hair. Every part stays a plain shape (shared materials, compiled at the warm-up). */
export function buildChimera() {
  const m = mats(), root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const add = (geo, mat, x, y, z, parent = body) => { const k = new THREE.Mesh(geo, mat); k.position.set(x, y, z); parent.add(k); return k; };
  const blob = (r, mat, x, y, z, sx, sy, sz, parent = body) => { const k = add(new THREE.SphereGeometry(r, 12, 10), mat, x, y, z, parent); k.scale.set(sx, sy, sz); return k; };
  // the mass: three torsos fused, leaning forward and to one side (never symmetric)
  body.rotation.x = 0.28;
  blob(0.36, m.skin[1], 0.05, 0.55, 0, 1.25, 1.1, 0.9);
  blob(0.3, m.skin[3], -0.3, 0.85, -0.08, 1.0, 1.25, 0.85).rotation.z = 0.4;
  blob(0.27, m.skin[0], 0.32, 1.02, 0.02, 1.1, 1.0, 0.9).rotation.z = -0.3;
  blob(0.2, m.skin[2], 0.0, 0.25, 0.18, 1.4, 0.8, 0.9);
  // seams with cross stitches where the parts were joined
  const SEAMS = [[0.0, 0.62, 0.3, 0.2, 0.35], [-0.18, 0.95, 0.24, -0.6, 0.28], [0.2, 0.85, 0.26, 0.7, 0.3], [0.05, 0.35, 0.33, 0.1, 0.4]];
  for (const [x, y, z, rz, len] of SEAMS) {
    const seam = add(new THREE.BoxGeometry(len, 0.018, 0.02), m.seam, x, y, z); seam.rotation.z = rz;
    for (let i = 0; i < 6; i++) { const st = add(new THREE.BoxGeometry(0.008, 0.07, 0.012), m.stitch, (i - 2.5) * len / 6, 0, 0.012, seam); st.rotation.z = i % 2 ? 0.5 : -0.5; }
  }
  // the glass of the specimen jars: a broken jar set in the chest, a whole one fused to the left shoulder, shards in the back
  const jar = add(new THREE.CylinderGeometry(0.12, 0.12, 0.26, 14, 1, true), m.glass, -0.42, 1.12, 0.1); jar.rotation.z = 0.6;
  add(new THREE.CylinderGeometry(0.105, 0.105, 0.2, 12), m.formalin, -0.42, 1.12, 0.1).rotation.z = 0.6;
  add(new THREE.CylinderGeometry(0.15, 0.15, 0.16, 14, 1, true, 0, Math.PI * 1.2), m.glass, 0.1, 0.7, 0.3).rotation.x = Math.PI / 2;
  for (let i = 0; i < 5; i++) { const sh = add(new THREE.BoxGeometry(0.03, 0.18 + (i % 3) * 0.07, 0.11), m.glass, -0.25 + i * 0.13, 1.15 - (i % 2) * 0.12, -0.28); sh.rotation.set(0.4 * (i - 2), 0.2 * i, 0.3 * (i % 3 - 1)); }
  // the drain hoses: from the body down into the water
  const hose = (pts) => add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))), 16, 0.035, 6), m.hose, 0, 0, 0);
  hose([[0.3, 0.95, -0.15], [0.55, 0.8, -0.3], [0.7, 0.3, -0.2], [0.75, -0.2, 0.05]]);
  hose([[-0.2, 0.6, -0.25], [-0.45, 0.35, -0.5], [-0.5, -0.1, -0.3]]);
  hose([[0.1, 0.3, 0.3], [0.25, 0.1, 0.55], [0.15, -0.2, 0.7]]);
  // the face on top: 早苗's, under the wet hair, tipped to one side
  const head = new THREE.Group(); head.position.set(0.12, 1.42, 0.2); body.add(head);
  blob(0.11, m.skin[2], 0, 0, 0, 0.9, 1.15, 0.95, head);
  add(new THREE.SphereGeometry(0.125, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), m.hair, 0, 0.02, -0.005, head);
  const strands = [];
  for (let i = 0; i < 9; i++) { const s2 = add(new THREE.PlaneGeometry(0.05, 0.9 + (i % 3) * 0.12), m.hair, -0.11 + i * 0.027, -0.42, 0.12 - Math.abs(i - 4) * 0.01, head); s2.rotation.y = (i - 4) * 0.07; strands.push(s2); }
  add(new THREE.PlaneGeometry(0.32, 1.0), m.hair, 0, -0.45, -0.12, head);
  // a second head, bald, sewn at the neck, lolling on the right shoulder
  const head2 = new THREE.Group(); head2.position.set(0.48, 1.12, 0.0); head2.rotation.z = -1.0; body.add(head2);
  blob(0.1, m.skin[3], 0, 0, 0, 0.85, 1.05, 0.95, head2);
  add(new THREE.TorusGeometry(0.075, 0.01, 4, 12), m.stitch, 0, -0.08, 0, head2).rotation.x = Math.PI / 2;
  // the arms, each from a different body: lengths, thickness and places all differ; one grows out of the back over the shoulder
  const arms = [];
  const ARMS = [
    [0.36, 1.12, 0.05, 0, 1.0, 1.25, 0.5], [-0.38, 0.98, 0.05, 1, 1.3, 0.9, 0.7], [0.25, 0.62, 0.2, 2, 0.75, 0.7, 0.3],
    [-0.3, 0.55, 0.12, 3, 0.9, 1.1, 0.8], [0.05, 1.18, -0.3, 0, 0.85, 1.4, -2.3], [-0.05, 0.42, 0.3, 2, 0.6, 0.55, 0.2],
  ];
  for (const [x, y, z, si, thick, len, rz] of ARMS) {
    const arm = new THREE.Group(); arm.position.set(x, y, z); body.add(arm);
    const sm = m.skin[si], r = 0.045 * thick;
    add(new THREE.CylinderGeometry(r, r * 1.2, 0.5 * len, 8), sm, 0, -0.25 * len, 0, arm);
    const fore = add(new THREE.CylinderGeometry(r * 0.8, r, 0.45 * len, 8), sm, 0, -0.7 * len, 0.06, arm); fore.rotation.x = -0.25;
    add(new THREE.TorusGeometry(r * 1.15, 0.008, 4, 10), m.stitch, 0, -0.5 * len, 0, arm).rotation.x = Math.PI / 2;
    const hand = add(new THREE.BoxGeometry(0.07 * thick, 0.15, 0.035), sm, 0, -0.98 * len, 0.1, arm);
    for (let f = 0; f < 4; f++) add(new THREE.BoxGeometry(0.012, 0.08 + (f % 2) * 0.03, 0.012), sm, -0.025 + f * 0.017, -0.1, 0, hand);
    arm.rotation.z = rz * (x >= 0 ? 1 : -1);
    arm.userData.sx = Math.sign(x || 1);
    arms.push(arm);
  }
  // the coat it was wrapped in, in rags into the water
  for (let i = 0; i < 6; i++) { const r2 = add(new THREE.PlaneGeometry(0.16, 0.6 + (i % 3) * 0.2), m.coat, Math.sin(i * 1.1) * 0.4, -0.05, Math.cos(i * 1.1) * 0.3); r2.rotation.y = i * 1.1; }
  const mist = [];
  for (let i = 0; i < 3; i++) { const s3 = new THREE.Sprite(m.mist); s3.scale.setScalar(1.5 + i * 0.3); s3.position.set(i % 2 ? 0.3 : -0.3, 0.3 + i * 0.4, 0.1); root.add(s3); mist.push(s3); }
  return { root, body, head, arms, strands, mist };
}

/** ひなた: the kit's person; poses: 'idle', 'scared', 'crouch' (holding the valve / the ankle) */
export function buildHinata() {
  const ch = makeCharacter({ female: true, hairStyle: 'ponytail', coat: 0x4c5a52, shirt: 0xd8d4c8, trousers: 0x2a2f3a, shoes: 0x2a2624, hair: 0x241a14, blob: true });
  ch.root.name = 'person:hinata';
  return ch;
}
