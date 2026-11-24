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
  M.formalin = new THREE.MeshStandardMaterial({ color: 0xc9b23a, roughness: 0.3, emissive: 0x6a5a10, emissiveIntensity: 1.4, transparent: true, opacity: 0.85 });
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
// 1.2.0 (#20 「モンスターのグラフィックをなおして」): lumpy flesh (displaced spheres), wet mottled skin with veins (canvas maps), jointed
// arms with five long fingers, hair in curved wet strands, dark eye sockets and an open mouth, the jars glowing yellow from inside.
function skinTexture(base, seed) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  let s = seed * 9301 + 49297; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  g.fillStyle = '#' + base.toString(16).padStart(6, '0'); g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) { const x = r() * 256, y = r() * 256, rad = 8 + r() * 40, b = g.createRadialGradient(x, y, 0, x, y, rad); const dark = r() < 0.6; b.addColorStop(0, dark ? 'rgba(40,30,25,.35)' : 'rgba(210,200,170,.22)'); b.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = b; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  g.lineWidth = 1.4;
  for (let i = 0; i < 14; i++) { g.strokeStyle = 'rgba(' + Math.round(50 + r() * 30) + ',' + Math.round(55 + r() * 30) + ',' + Math.round(90 + r() * 40) + ',.45)'; g.beginPath(); let x = r() * 256, y = r() * 256; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 40; y += (r() - 0.3) * 30; g.lineTo(x, y); } g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function lumpy(r, seed, seg = 22) {
  const geo = new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = Math.sin(v.x * 17 + seed) * Math.sin(v.y * 13 + seed * 2) * Math.sin(v.z * 15 + seed * 3) + 0.5 * Math.sin(v.y * 31 + seed); v.multiplyScalar(1 + n * 0.09); p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals(); return geo;
}
const WM = {};
const wet = () => {
  if (WM.skin) return WM;
  WM.skin = [0x8e8770, 0x667069, 0x8a7563, 0x58554f].map((c, i) => new THREE.MeshStandardMaterial({ color: 0xffffff, map: skinTexture(c, i + 1), roughness: 0.38, metalness: 0.05, emissive: 0x2c2f24, emissiveIntensity: 0.3 }));   // 1.5.2: 0.9 -> 0.3 (a pale blob far off); the rim and the key in chimera.js make her read
  WM.socket = new THREE.MeshBasicMaterial({ color: 0x020202 });
  WM.nail = new THREE.MeshStandardMaterial({ color: 0x3a3a30, roughness: 0.3 });
  WM.wetHair = new THREE.MeshStandardMaterial({ color: 0x040404, roughness: 0.22, metalness: 0.2 });
  return WM;
};
export function buildChimera() {
  const m = mats(), w = wet(), root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const add = (geo, mat, x, y, z, parent = body) => { const k = new THREE.Mesh(geo, mat); k.position.set(x, y, z); parent.add(k); return k; };
  const blob = (r, mat, x, y, z, sx, sy, sz, parent = body, seed = 1) => { const k = add(lumpy(r, seed), mat, x, y, z, parent); k.scale.set(sx, sy, sz); return k; };
  const tube = (pts, r, mat, parent = body, seg = 16) => add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))), seg, r, 7), mat, 0, 0, 0, parent);
  // the mass: three torsos fused, leaning forward and to one side (never symmetric)
  body.rotation.x = 0.28;
  // 1.7.0 (5th play test #7 「脈打つ感じとか、動く感じを怖い感じに」): the torsos breathe out of step, sacs under the skin throb with a
  // heartbeat (lub-dub), veins run over them; js/ext/chimera.js pulse() drives `pulse` every frame
  const pulse = [], P = (k, amp, ph, beat = false) => { pulse.push({ k, s: k.scale.clone(), amp, ph, beat }); return k; };
  P(blob(0.36, w.skin[1], 0.05, 0.55, 0, 1.25, 1.1, 0.9, body, 1), 0.05, 0);
  P(blob(0.3, w.skin[3], -0.3, 0.85, -0.08, 1.0, 1.25, 0.85, body, 2), 0.06, 1.9).rotation.z = 0.4;
  P(blob(0.27, w.skin[0], 0.32, 1.02, 0.02, 1.1, 1.0, 0.9, body, 3), 0.05, 3.7).rotation.z = -0.3;
  P(blob(0.2, w.skin[2], 0.0, 0.25, 0.18, 1.4, 0.8, 0.9, body, 4), 0.04, 5.1);
  const sacM = new THREE.MeshStandardMaterial({ color: 0x6e2626, roughness: 0.35, metalness: 0, emissive: 0x2a0606, emissiveIntensity: 0.6 }), veinM = new THREE.MeshStandardMaterial({ color: 0x3a1430, roughness: 0.5, emissive: 0x400818, emissiveIntensity: 0 });
  for (const [x, y, z, r2, ph] of [[0.18, 0.62, 0.3, 0.07, 0], [-0.22, 0.9, 0.22, 0.06, 0.7], [0.36, 1.0, 0.2, 0.05, 1.3], [-0.05, 0.38, 0.3, 0.055, 0.4], [-0.38, 0.7, 0.12, 0.045, 1.0]]) P(blob(r2, sacM, x, y, z, 1, 0.85, 0.7, body, 9 + ph * 10), 0.22, ph, true);
  for (const pts of [[[0.18, 0.62, 0.33], [0.05, 0.75, 0.34], [-0.1, 0.95, 0.27], [-0.22, 1.05, 0.18]], [[0.18, 0.62, 0.33], [0.28, 0.48, 0.3], [0.22, 0.3, 0.27]], [[-0.22, 0.9, 0.25], [-0.35, 0.75, 0.2], [-0.4, 0.55, 0.1]], [[0.36, 1.0, 0.23], [0.25, 1.2, 0.18], [0.14, 1.32, 0.17]]]) tube(pts, 0.009, veinM, body, 14);
  // ribs showing through the thinnest skin
  for (let i = 0; i < 4; i++) tube([[-0.18, 0.78 - i * 0.07, 0.25], [-0.05, 0.75 - i * 0.07, 0.33], [0.1, 0.77 - i * 0.07, 0.3]], 0.012, w.skin[0]);
  // seams: curved, puckered, cross-stitched
  const SEAMS = [[[-0.25, 0.4, 0.28], [0.0, 0.62, 0.33], [0.25, 0.75, 0.27]], [[-0.4, 1.05, 0.12], [-0.18, 0.95, 0.24], [-0.05, 0.7, 0.32]], [[0.15, 1.1, 0.2], [0.22, 0.85, 0.27], [0.18, 0.55, 0.32]], [[-0.15, 0.25, 0.32], [0.05, 0.3, 0.36], [0.2, 0.2, 0.3]]];
  for (const pts of SEAMS) {
    tube(pts, 0.013, m.seam, body, 12);
    const cur = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    for (let i = 0; i <= 8; i++) { const q = cur.getPoint(i / 8), t = cur.getTangent(i / 8); const st = add(new THREE.BoxGeometry(0.007, 0.06, 0.01), m.stitch, q.x, q.y, q.z + 0.012); st.rotation.z = Math.atan2(t.y, t.x) + Math.PI / 2 + (i % 2 ? 0.5 : -0.5); }
  }
  // the specimen jars: one broken in the chest, one whole fused to the left shoulder, glowing from inside; shards in the back
  const jar = add(new THREE.CylinderGeometry(0.12, 0.12, 0.26, 14, 1, true), m.glass, -0.42, 1.12, 0.1); jar.rotation.z = 0.6;
  add(new THREE.CylinderGeometry(0.105, 0.105, 0.2, 12), m.formalin, -0.42, 1.12, 0.1).rotation.z = 0.6;
  add(new THREE.SphereGeometry(0.05, 10, 8), w.skin[2], -0.42, 1.1, 0.12);   // something floating in it
  add(new THREE.CylinderGeometry(0.15, 0.15, 0.16, 14, 1, true, 0, Math.PI * 1.2), m.glass, 0.1, 0.7, 0.3).rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 12, 1, false, 0, Math.PI * 1.2), m.formalin, 0.1, 0.7, 0.28).rotation.x = Math.PI / 2;
  for (let i = 0; i < 5; i++) { const sh = add(new THREE.BoxGeometry(0.03, 0.18 + (i % 3) * 0.07, 0.11), m.glass, -0.25 + i * 0.13, 1.15 - (i % 2) * 0.12, -0.28); sh.rotation.set(0.4 * (i - 2), 0.2 * i, 0.3 * (i % 3 - 1)); }
  // the drain hoses: from the body down into the water
  tube([[0.3, 0.95, -0.15], [0.55, 0.8, -0.3], [0.7, 0.3, -0.2], [0.75, -0.2, 0.05]], 0.035, m.hose);
  tube([[-0.2, 0.6, -0.25], [-0.45, 0.35, -0.5], [-0.5, -0.1, -0.3]], 0.035, m.hose);
  tube([[0.1, 0.3, 0.3], [0.25, 0.1, 0.55], [0.15, -0.2, 0.7]], 0.03, m.hose);
  // the face on top: 早苗's, under the wet hair, tipped to one side; dark sockets and a mouth hanging open
  const head = new THREE.Group(); head.position.set(0.12, 1.42, 0.2); head.rotation.z = 0.25; body.add(head);
  blob(0.11, w.skin[2], 0, 0, 0, 0.9, 1.15, 0.95, head, 5);
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.022, 8, 6), w.socket, s * 0.038, 0.02, 0.092, head).scale.set(1.2, 0.8, 0.5);
  add(new THREE.SphereGeometry(0.03, 8, 6), w.socket, 0, -0.07, 0.09, head).scale.set(0.8, 1.6, 0.5);
  add(new THREE.SphereGeometry(0.125, 14, 10, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7, 0, Math.PI * 0.62), w.wetHair, 0, 0.02, -0.005, head);   // the scalp and the back: the face stays bare
  const strands = [];
  for (let i = 0; i < 26; i++) {
    const g = new THREE.Group(), a = (i / 26) * Math.PI * 2, front = Math.cos(a) > 0.2, ox = Math.sin(a) * 0.11, oz = Math.cos(a) * 0.1, L = 0.7 + ((i * 7) % 5) * 0.12;
    if (Math.cos(a) > 0.8 && i % 3) continue;   // a parting over the face: a few strands, not a curtain
    g.position.set(ox, 0.06, oz); head.add(g);
    const pts = []; for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push([Math.sin(t * 4 + i) * 0.03 * t + ox * 0.25 * t, -L * t, (front ? 0.06 : -0.02) * t + Math.cos(t * 3 + i) * 0.02 * t]); }
    tube(pts, 0.006 + (i % 3) * 0.002, w.wetHair, g, 10); strands.push(g);
  }
  // a second head, bald, sewn at the neck, lolling on the right shoulder; its jaw hangs
  const head2 = new THREE.Group(); head2.position.set(0.48, 1.12, 0.0); head2.rotation.z = -1.0; body.add(head2);
  blob(0.1, w.skin[3], 0, 0, 0, 0.85, 1.05, 0.95, head2, 6);
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.018, 8, 6), w.socket, s * 0.032, 0.015, 0.085, head2);
  add(new THREE.TorusGeometry(0.075, 0.01, 4, 12), m.stitch, 0, -0.08, 0, head2).rotation.x = Math.PI / 2;
  // the arms, each from a different body: lengths, thickness and places all differ; one grows out of the back over the shoulder.
  // Upper arm, an elbow that bends, forearm, a hand with five long jointed fingers and dark nails.
  const arms = [];
  const ARMS = [
    [0.36, 1.12, 0.05, 0, 1.0, 1.25, 0.5], [-0.38, 0.98, 0.05, 1, 1.3, 0.9, 0.7], [0.25, 0.62, 0.2, 2, 0.75, 0.7, 0.3],
    [-0.3, 0.55, 0.12, 3, 0.9, 1.1, 0.8], [0.05, 1.18, -0.3, 0, 0.85, 1.4, -2.3], [-0.05, 0.42, 0.3, 2, 0.6, 0.55, 0.2],
  ];
  for (const [x, y, z, si, thick, len, rz] of ARMS) {
    const arm = new THREE.Group(); arm.position.set(x, y, z); body.add(arm);
    const sm = w.skin[si], r = 0.045 * thick;
    add(new THREE.SphereGeometry(r * 1.3, 10, 8), sm, 0, 0, 0, arm);
    add(new THREE.CylinderGeometry(r, r * 1.2, 0.5 * len, 10), sm, 0, -0.25 * len, 0, arm);
    const elbow = new THREE.Group(); elbow.position.set(0, -0.5 * len, 0); elbow.rotation.x = -0.35 - (si % 2) * 0.3; arm.add(elbow);
    add(new THREE.SphereGeometry(r * 1.05, 10, 8), sm, 0, 0, 0, elbow);
    add(new THREE.CylinderGeometry(r * 0.75, r, 0.48 * len, 10), sm, 0, -0.24 * len, 0, elbow);
    add(new THREE.TorusGeometry(r * 1.1, 0.008, 4, 10), m.stitch, 0, -0.02, 0, elbow).rotation.x = Math.PI / 2;
    const hand = new THREE.Group(); hand.position.set(0, -0.5 * len, 0); hand.rotation.x = -0.3; elbow.add(hand);
    add(new THREE.BoxGeometry(0.075 * thick, 0.1, 0.03), sm, 0, -0.05, 0, hand);
    for (let f = 0; f < 5; f++) {
      const thumb = f === 4, fl = (thumb ? 0.06 : 0.09 + ((f + si) % 3) * 0.025) * Math.max(0.9, len);
      const fg = new THREE.Group(); fg.position.set(thumb ? 0.045 * thick : -0.03 * thick + f * 0.017 * thick, thumb ? -0.04 : -0.1, 0); fg.rotation.set(-0.3 - f * 0.08, 0, thumb ? -0.7 : (f - 1.5) * 0.08); hand.add(fg);
      add(new THREE.CylinderGeometry(0.007, 0.009, fl, 6), sm, 0, -fl / 2, 0, fg);
      const tip = new THREE.Group(); tip.position.set(0, -fl, 0); tip.rotation.x = -0.6; fg.add(tip);
      add(new THREE.CylinderGeometry(0.005, 0.007, fl * 0.7, 6), sm, 0, -fl * 0.35, 0, tip);
      add(new THREE.BoxGeometry(0.01, 0.014, 0.004), w.nail, 0, -fl * 0.68, 0.005, tip);
    }
    arm.rotation.z = rz * (x >= 0 ? 1 : -1);
    arm.userData.sx = Math.sign(x || 1);
    arms.push(arm);
  }
  // the coat it was wrapped in, in rags into the water
  for (let i = 0; i < 6; i++) { const r2 = add(new THREE.PlaneGeometry(0.16, 0.6 + (i % 3) * 0.2), m.coat, Math.sin(i * 1.1) * 0.4, -0.05, Math.cos(i * 1.1) * 0.3); r2.rotation.y = i * 1.1; }
  const mist = [];
  for (let i = 0; i < 3; i++) { const s3 = new THREE.Sprite(m.mist); s3.scale.setScalar(1.5 + i * 0.3); s3.position.set(i % 2 ? 0.3 : -0.3, 0.3 + i * 0.4, 0.1); root.add(s3); mist.push(s3); }
  root.scale.setScalar(1.12);
  return { root, body, head, arms, strands, mist, pulse, veinM, sacM };
}

/** ひなた: the kit's person; poses: 'idle', 'scared', 'crouch' (holding the valve / the ankle) */
export function buildHinata() {
  // 1.7.2 (re-check of the 5th play test #2 「机が他のオブジェクトに比べて小さく感じる（キャラの大きさに合わせてください）」): the kit person is
  // 1.80 m, so beside a 0.76 m desk the top came to her crotch and every desk read small. She is 1.60 m now, as in the dot version.
  const ch = makeCharacter({ female: true, hairStyle: 'ponytail', coat: 0x4c5a52, shirt: 0xd8d4c8, trousers: 0x2a2f3a, shoes: 0x2a2624, hair: 0x241a14, blob: true, scale: 0.89 });
  ch.root.name = 'person:hinata';
  return ch;
}
