// The hospital and what lies under it, dressed from plain shapes (furniture against the walls, nothing floating). Every solid piece gets a
// collider. Built once at game:ready; the lights are a fixed set (the kit's lamp pool), only their numbers change.
//   1F:  the chained glass front door (黒木's torch behind it), the waiting room's sagging ceiling, the sink that keeps running, charts on the floor
//   B1:  ankle water in the corridor, the generator and the pump of the pump room, the ledger cabinet and the floor drain of the pathology
//        office, the hearse doors of the mortuary, the first watertight door (防水扉) with its wheel
//   passage: pipes along the walls, low pipes you crawl under (P2), knee water (P3), the second watertight door with its round window,
//        the specimen room at the end (the jars on the shelves, the formalin tank in the floor, the glass cabinet with jar 7)
// The water of each room is one plane (G.setWater): on or off, at a height. The emergency lights (S_LAMP1-4) are lamp-pool entries.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildHinata } from './people.js';
import { lowZone } from '../kit/low-zone.js';
import { buildSpecimenJars, SPECIMEN_KINDS } from '../kit/specimen-parts.js';

// where each station's invisible [E] box goes (height above the floor; x / z moves; size of the box). Stations with a "look" are the kit's.
const HIT = {
  S_HINA1: { y: 0.9, s: [0.7, 1.6, 0.7] }, S_FRONT: { y: 1.1, dz: 0.2, s: [1.6, 1.8, 0.3] },
  S_GEN: { y: 0.8, dx: 0.1, s: [1.0, 1.3, 1.3] }, S_HINA2: { y: 0.9, dx: 0.3, dz: -0.2, s: [0.7, 1.6, 0.7] },
  S_CAB: { y: 1.0, dz: 0.15, s: [0.95, 1.8, 0.5] }, S_DRAIN: { y: 0.15, s: [0.8, 0.3, 0.8] },
  S_HEARSE: { y: 1.1, dx: 0.3, s: [0.3, 2.0, 1.6] }, S_SHELF: { y: 1.2, dz: -0.2, s: [1.6, 1.6, 0.5] },
};
// where ひなた stands at each moment: js/ext/hina.js (she walks between them)

/** 1.5.0 (3rd play test #4 「浮いている紙に、読めそうな文字」): the papers carry a plausible page of this hospital (canvas, no picture file):
 *  a chart (診療録) with a blacked-out name, a ledger of specimens (標本台帳) with numbers and red lines, a stamped consent form with the family's
 *  box empty; the handwriting is soft (blurred, run by the water), the print sharp */
function paperTex(kind, seed = 1) {
  if (typeof document === 'undefined') return null;
  const W0 = 240, H0 = 320, c = document.createElement('canvas'); c.width = W0; c.height = H0; const g = c.getContext('2d');
  let r = seed * 9301 + 49297; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  g.fillStyle = '#d9d2bb'; g.fillRect(0, 0, W0, H0);
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(120,105,70,${0.05 + rnd() * 0.08})`; g.beginPath(); g.arc(rnd() * W0, rnd() * H0, 10 + rnd() * 40, 0, 7); g.fill(); }
  const print = (t, x, y, px, col = '#2a2622') => { g.filter = 'none'; g.fillStyle = col; g.font = `${px}px serif`; g.fillText(t, x, y); };
  const hand = (t, x, y, px, col = '#1c2a4a', blur = 0.9) => { g.filter = `blur(${blur}px)`; g.fillStyle = col; g.font = `${px}px serif`; g.fillText(t, x, y); g.filter = 'none'; };
  const line = (x0, y0, x1, y1, col = '#5a544a', w = 1) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  if (kind === 'chart') {
    print('診 療 録', 80, 30, 20); print('水無瀬病院', 160, 52, 11);
    for (let y = 66; y < 300; y += 22) line(14, y, 226, y, '#9a927e');
    print('氏名', 16, 84, 12); g.fillStyle = '#121010'; g.fillRect(56, 70, 110, 17);
    print('年齢', 16, 106, 12); hand('五十八', 60, 106, 14);
    print('病名', 16, 128, 12); hand('心不全', 60, 128, 15);
    hand('三月九日　死亡確認', 20, 172, 14); hand('病理解剖　葛城', 20, 194, 14); hand('臓器保存　家族同意（　　）', 20, 216, 13);
    g.strokeStyle = 'rgba(170,30,25,0.85)'; g.lineWidth = 2; g.beginPath(); g.arc(196, 262, 18, 0, 7); g.stroke(); hand('七', 186, 270, 20, '#a31d18', 0.5);
  } else if (kind === 'ledger') {
    print('標 本 台 帳', 64, 28, 19);
    const cols = [14, 50, 120, 176, 226]; for (const x of cols) line(x, 40, x, 306, '#8a826e'); for (let y = 40; y <= 306; y += 22) line(14, y, 226, y, '#8a826e');
    print('番号', 18, 56, 11); print('氏名', 70, 56, 11); print('臓器', 132, 56, 11); print('同意', 186, 56, 11);
    const org = ['右腕', '眼球', '心臓', '左足', '皮膚', '肝臓', '手', '脳', '腎臓', '舌', '指'];
    for (let i = 0; i < 11; i++) {
      const y = 78 + i * 22, n = 1 + Math.floor(rnd() * 34);
      hand(String(i === 3 ? 7 : n), 22, y, 13); hand(org[(i + seed) % org.length], 126, y, 13); hand(i % 3 ? '―' : '無', 192, y, 13);
      g.filter = 'blur(1.4px)'; g.fillStyle = '#26314d'; g.fillRect(56, y - 10, 50 + rnd() * 10, 3); g.filter = 'none';
      line(52, y - 4, 116, y - 4, 'rgba(180,30,25,0.8)', 1.5);
    }
    hand('合成標本へ', 120, 300, 13, '#a31d18', 0.6);
  } else {
    print('臓器保存についての同意書', 30, 32, 15);
    for (let y = 60; y < 200; y += 16) { g.filter = 'blur(0.4px)'; g.fillStyle = '#3c3832'; g.fillRect(18, y, 150 + rnd() * 50, 3); g.filter = 'none'; }
    print('ご家族の署名', 18, 232, 12); line(100, 236, 222, 236, '#3c3832');
    print('担当医', 18, 270, 12); hand('葛城', 80, 270, 16);
    g.strokeStyle = 'rgba(180,35,28,0.9)'; g.lineWidth = 2.5; g.strokeRect(150, 248, 44, 44); hand('葛城', 156, 278, 17, '#b3221b', 0.3);
  }
  // the water: a run of the ink at one edge, a tide mark
  g.globalCompositeOperation = 'multiply'; const gr = g.createLinearGradient(0, H0 * 0.7, 0, H0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(140,130,95,0.75)'); g.fillStyle = gr; g.fillRect(0, 0, W0, H0); g.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/** a photograph lying on the water: the picture inside a white border (loaded from a file) */
function photoTex(url) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = 320; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#e6e1d2'; g.fillRect(0, 0, 320, 256); g.fillStyle = '#3a3a34'; g.fillRect(14, 14, 292, 212);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const im = new Image(); im.onload = () => { g.drawImage(im, 14, 14, 292, 212); g.fillStyle = 'rgba(120,110,80,0.25)'; g.fillRect(0, 200, 320, 56); t.needsUpdate = true; }; im.src = url;
  return t;
}
/** 1.6.0 (4th play test #7 「壁に貼られたラベルが空中にうているように見えます」): the labels peeled off the jars, pasted in rows on the wall */
function labelsTex() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  let r = 77; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const org = ['右腕', '眼球', '皮膚（背）', '心臓', '左足', '手', '脳', '腎臓', '指', '肝臓', '舌', '耳'];
  const kan = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八'];
  for (let row = 0; row < 5; row++) for (let col = 0; col < 7; col++) {
    if (rnd() < 0.12) continue;
    const x = 8 + col * 72 + rnd() * 6, y = 8 + row * 50 + rnd() * 4, w = 62, h = 40, a = (rnd() - 0.5) * 0.12;
    g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(a); g.translate(-w / 2, -h / 2);
    g.fillStyle = `rgb(${205 + rnd() * 20},${195 + rnd() * 20},${160 + rnd() * 20})`; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(110,90,50,0.25)'; g.fillRect(0, h - 8, w, 8);
    g.fillStyle = '#2a2420'; g.font = '11px serif'; g.fillText(`第${kan[(row * 7 + col) % kan.length]}号`, 4, 13); g.fillText(org[(row * 3 + col) % org.length], 4, 27);
    g.strokeStyle = 'rgba(175,30,25,0.9)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(3, 34); g.lineTo(w - 4, 33); g.stroke();
    g.restore();
  }
  g.fillStyle = 'rgba(165,28,22,0.9)'; g.font = 'bold 22px serif'; g.fillText('合成標本へ', 360, 250);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/** 1.5.0 (3rd play test #2 「しゃがみ通路が単調」): marks for the walls of the low passage: claw gouges, hand prints, a rust run, a peek gap */
function markTex(kind, seed = 1) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  let r = seed * 7919 + 13; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  g.clearRect(0, 0, 256, 256);
  if (kind === 'gouge') {
    for (let s = 0; s < 2; s++) for (let f = 0; f < 4; f++) { const x = 40 + s * 110 + f * 14; g.strokeStyle = 'rgba(20,18,16,0.9)'; g.lineWidth = 5; g.beginPath(); g.moveTo(x, 20 + f * 4); g.bezierCurveTo(x + 6, 90, x + 14, 160, x + 22 + rnd() * 6, 236); g.stroke(); g.strokeStyle = 'rgba(190,185,170,0.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 3, 22 + f * 4); g.bezierCurveTo(x + 9, 90, x + 17, 160, x + 25, 230); g.stroke(); }
  } else if (kind === 'hands') {
    // 1.6.2 (5th play test #5 「床全体が濡れているのでおかしい」): on the wall above the water line, a row that crawls toward the way in (fingers to -u = east on the north wall)
    for (let i = 0; i < 7; i++) { const x = 228 - i * 32 - rnd() * 8, y = 60 + (i % 2) * 34 + rnd() * 16, s = 0.6 + rnd() * 0.7, a = -Math.PI / 2 + rnd() * 0.5 - 0.25; g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s); g.fillStyle = `rgba(40,30,22,${0.55 + rnd() * 0.3})`; g.beginPath(); g.ellipse(0, 10, 16, 20, 0, 0, 7); g.fill(); for (let f = 0; f < 5; f++) { g.beginPath(); g.ellipse(-14 + f * 7, -16 - (f === 2 ? 6 : f % 4 ? 3 : -4), 3.4, 11, (f - 2) * 0.15, 0, 7); g.fill(); } g.restore(); }
  } else if (kind === 'stain') {
    for (let i = 0; i < 9; i++) { const x = 30 + i * 24 + rnd() * 10; const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(90,60,30,0.7)'); gr.addColorStop(1, 'rgba(90,60,30,0)'); g.fillStyle = gr; g.fillRect(x, 0, 3 + rnd() * 6, 120 + rnd() * 136); }
    g.fillStyle = 'rgba(70,50,30,0.55)'; g.fillRect(0, 0, 256, 18);
  } else {   // gap: a ragged hole into the dark, two pale eyes far in it
    g.fillStyle = '#050505'; g.beginPath(); for (let k = 0; k <= 24; k++) { const t = (k / 24) * Math.PI * 2, rr = 70 + Math.sin(t * 5 + seed) * 14 + rnd() * 10; g.lineTo(128 + Math.cos(t) * rr * 1.3, 128 + Math.sin(t) * rr * 0.55); } g.fill();
    g.fillStyle = 'rgba(210,214,196,0.85)'; g.beginPath(); g.ellipse(112, 126, 5, 3, 0, 0, 7); g.ellipse(142, 128, 5, 3, 0, 0, 7); g.fill();
    g.fillStyle = '#0a0a0a'; g.beginPath(); g.arc(112, 126, 1.6, 0, 7); g.arc(142, 128, 1.6, 0, 7); g.fill();
    for (let k = 0; k < 4; k++) { g.fillStyle = 'rgba(160,130,110,0.8)'; g.fillRect(70 + k * 9, 150 + (k % 2) * 3, 5, 18); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** a tiling normal map of small ripples (canvas, no picture file) */
function rippleTex() {
  if (typeof document === 'undefined') return null;
  const n = 128, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), img = g.createImageData(n, n);
  const h = (x, y) => Math.sin((x / n) * Math.PI * 6) * 0.5 + Math.sin(((x + y) / n) * Math.PI * 10) * 0.3 + Math.sin(((y * 2 - x) / n) * Math.PI * 4) * 0.4 + Math.sin((y / n) * Math.PI * 14 + Math.sin((x / n) * Math.PI * 4)) * 0.25;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1), i = (y * n + x) * 4;
    img.data[i] = 128 + dx * 90; img.data[i + 1] = 128 + dy * 90; img.data[i + 2] = 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
}

export function installHospital(ext, G) {
  ext.on('game:ready', (ctx) => {
    const W = ctx.world, grp = new THREE.Group(); grp.name = 'mn-hospital'; W.group.add(grp);
    const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
    const M = {
      steel: std(0x4a504e, { metalness: 0.55, roughness: 0.5 }), dark: std(0x1c1f1f, { roughness: 0.7 }), rust: std(0x5a3a26, { roughness: 0.9, metalness: 0.3 }),
      white: std(0xcfcfc6, { roughness: 0.5 }), cream: std(0xb9b39f, { roughness: 0.8 }), paper: std(0xd6d1bf, { roughness: 1, side: THREE.DoubleSide }),
      glass: std(0x4f6a6a, { roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.28, depthWrite: false }),
      pipe: std(0x3e4442, { roughness: 0.6, metalness: 0.55 }), red: std(0x8a1d16, { roughness: 0.55, metalness: 0.3 }), green: std(0x2d4a3c, { roughness: 0.7 }),
      // 1.5.0 (3rd play test #17 「水をもう少し濁らせて」): murky green-brown water you cannot see the floor through, with a moving ripple
      water: std(0x323a2a, { roughness: 0.22, metalness: 0.35, transparent: true, opacity: 0.93, depthWrite: false, normalMap: rippleTex(), normalScale: new THREE.Vector2(0.55, 0.55) }),
      formalin: std(0x8a7b30, { roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.85, emissive: 0x2a2408, emissiveIntensity: 0.6 }),
      jarLiquid: new THREE.MeshBasicMaterial({ color: 0x3c2e08, transparent: true, opacity: 0.45, depthWrite: false }),   // 1.6.1: jar 7 in the same murky formalin as the rest
      organ: std(0x9b8a7a, { roughness: 0.6 }), heart: std(0x6b5550, { roughness: 0.55 }), chain: std(0x6a6c68, { metalness: 0.7, roughness: 0.4 }),
      hair: std(0x060606, { roughness: 0.5, side: THREE.DoubleSide }), torch: new THREE.MeshBasicMaterial({ color: 0xd8d2b0, transparent: true, opacity: 0.0 }),
      emerg: new THREE.MeshBasicMaterial({ color: 0x9ce8b8 }), emergOff: std(0x3a3f3c, { roughness: 0.6 }), black: std(0x050505, { roughness: 1 }),
      hidden: new THREE.MeshBasicMaterial({ visible: false }), stream: std(0x9fb3b0, { roughness: 0.05, transparent: true, opacity: 0.45, depthWrite: false }),
    };
    // 1.5.0 (#4): papers that read as this hospital's records
    M.papers = ['chart', 'ledger', 'form', 'chart', 'ledger'].map((k, i) => { const m = std(0xffffff, { roughness: 1, side: THREE.DoubleSide, map: paperTex(k, i + 1) }); m.name = `paper-${k}`; return m; });
    G.M = M;
    const fy = (room) => W.yOf(room);
    const solids = [];
    const box = (room, x, z, w, h, d, mat, y0 = 0, solid = true, rotY = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, fy(room) + y0 + h / 2, z); m.rotation.y = rotY; m.castShadow = true; m.receiveShadow = true; grp.add(m);
      if (solid) solids.push(m); return m;
    };
    const cyl = (room, x, z, r0, r1, h, mat, y0 = 0, solid = false, seg = 16) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat); m.position.set(x, fy(room) + y0 + h / 2, z); grp.add(m); if (solid) solids.push(m); return m; };
    const plane = (room, x, z, w, h, mat, y, rotY = 0, rotX = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, fy(room) + y, z); m.rotation.set(rotX, rotY, 0); grp.add(m); return m; };
    const flat = (room, x, z, w, d, mat, y = 0.012, rz = 0) => { const m = plane(room, x, z, w, d, mat, y, 0, -Math.PI / 2); m.rotation.z = rz; m.raycast = () => {}; return m; };

    // ---------------- the water of each room (one plane, shown at a height) ----------------
    G.water = {};
    for (const r of ctx.data.plan.rooms) {
      if ((r.floor || 0) !== 0) continue;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(r.w - 0.02, r.d - 0.02), r.id === 'HYOHON' ? M.formalin : M.water);
      m.rotation.x = -Math.PI / 2; m.position.set(r.x + r.w / 2, fy(r.id) + 0.08, r.z + r.d / 2); m.visible = false; m.name = `water:${r.id}`; m.renderOrder = 1; m.raycast = () => {}; grp.add(m);
      G.water[r.id] = m;
    }
    G.waterAt = {};
    // 1.3.0 (2nd play test #10 「水がなくなったときの表現が雑すぎます」): water no longer vanishes. G.setWater(room, y, { drain: true }) lowers it
    // over a few seconds (a gurgle at the drain, the surface going down the walls), and what it leaves stays: a dark water line on every wall at
    // the height it stood, a wet sheen on the floor with puddles in the low spots, drips from the walls. A resumed game gets the after-state at once.
    G.draining = {}; G.residue = {};
    const wetAlpha = (seed) => { const c = document.createElement('canvas'); c.width = c.height = 256; const g2 = c.getContext('2d'); let r0 = seed * 9301 + 49297; const rnd = () => ((r0 = (r0 * 9301 + 49297) % 233280) / 233280);
      g2.fillStyle = '#5a5a5a'; g2.fillRect(0, 0, 256, 256);   // the whole floor a little wet
      for (let i = 0; i < 9; i++) { const x = rnd() * 256, y = rnd() * 256, rad = 20 + rnd() * 50, gr = g2.createRadialGradient(x, y, rad * 0.2, x, y, rad); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.7, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g2.fillStyle = gr; g2.beginPath(); g2.ellipse(x, y, rad, rad * (0.5 + rnd() * 0.5), rnd() * 3, 0, Math.PI * 2); g2.fill(); }   // puddles in the low spots
      for (let i = 0; i < 300; i++) { g2.fillStyle = `rgba(0,0,0,${rnd() * 0.35})`; g2.fillRect(rnd() * 256, rnd() * 256, 2 + rnd() * 8, 1 + rnd() * 3); }
      const t = new THREE.CanvasTexture(c); return t; };
    const lineTex = (() => { const c = document.createElement('canvas'); c.width = 8; c.height = 128; const g2 = c.getContext('2d'); const gr = g2.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, 'rgba(150,132,96,0)'); gr.addColorStop(0.03, 'rgba(160,140,100,.9)'); gr.addColorStop(0.07, 'rgba(120,100,66,.85)'); gr.addColorStop(0.1, 'rgba(36,30,20,.9)'); gr.addColorStop(0.3, 'rgba(26,26,20,.6)'); gr.addColorStop(1, 'rgba(18,20,16,.7)');   // a pale crust of scum at the top, the wet dark below
      g2.fillStyle = gr; g2.fillRect(0, 0, 8, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const residue = (room, level) => {
      if (G.residue[room] || level == null || level < 0.03) return;
      const R = ctx.data.plan.rooms.find((r) => r.id === room); if (!R) return;
      const y0 = fy(room), g2 = new THREE.Group(); g2.name = `residue:${room}`; grp.add(g2);
      // the water line: a stained band from the floor to where the water stood, sharp at the top
      const lm = new THREE.MeshStandardMaterial({ map: lineTex, transparent: true, depthWrite: false, roughness: 0.6 });
      const H = level + 0.05, o = 0.086;
      for (const [x, z, w, ry] of [[R.x + R.w / 2, R.z + o, R.w, 0], [R.x + R.w / 2, R.z + R.d - o, R.w, Math.PI], [R.x + o, R.z + R.d / 2, R.d, Math.PI / 2], [R.x + R.w - o, R.z + R.d / 2, R.d, -Math.PI / 2]]) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.2, H), lm); m.position.set(x, y0 + H / 2, z); m.rotation.y = ry; m.renderOrder = 2; m.raycast = () => {}; m.name = 'waterline'; g2.add(m);
      }
      // the wet floor: a thin sheen with puddles in it
      const wm = new THREE.MeshStandardMaterial({ color: 0x18201e, roughness: 0.06, metalness: 0.6, transparent: true, opacity: 0.7, alphaMap: wetAlpha(room.length * 7 + 3), depthWrite: false });
      const f = new THREE.Mesh(new THREE.PlaneGeometry(R.w - 0.2, R.d - 0.2), wm); f.rotation.x = -Math.PI / 2; f.position.set(R.x + R.w / 2, y0 + 0.009, R.z + R.d / 2); f.renderOrder = 1; f.raycast = () => {}; f.name = 'wet-floor'; g2.add(f);
      // drips running off the walls for a while
      const n = 10, pos = new Float32Array(n * 3), dr = []; for (let i = 0; i < n; i++) { const side = i % 4, t = (i * 0.37) % 1; dr.push({ x: side < 2 ? R.x + 0.3 + t * (R.w - 0.6) : side === 2 ? R.x + 0.14 : R.x + R.w - 0.14, z: side >= 2 ? R.z + 0.3 + t * (R.d - 0.6) : side === 0 ? R.z + 0.14 : R.z + R.d - 0.14, y: y0 + 0.4 + (i % 3) * 0.6, t: (i * 0.29) % 1 }); }
      const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xaec6c2, size: 0.03, transparent: true, opacity: 0.75, depthWrite: false })); pts.frustumCulled = false; g2.add(pts);
      G.residue[room] = { g: g2, dr, pos, dg, y0, t: 0, R };
    };
    // 1.6.0 (4th play test #11 「水位を整理してつながったら同期」「水が入っていく表現」): G.setWater(room, y, { sec }) moves the surface to y
    // over sec seconds, up or down (rooms an opened door joins come to one level as the water runs over the sill: G.pourOver)
    G.moving = {};
    G.setWater = (room, y, o = {}) => {
      const m = G.water[room]; if (!m) return;
      const cur = G.waterAt[room], D = G.draining[room], Mv = G.moving[room];
      if (D && D.to === (y ?? null)) return;   // already going there
      if (Mv && Mv.to === y) return;
      if (o.sec && !o.drain && y != null && (o.from != null || cur == null || Math.abs(cur - y) > 0.004)) {
        if (D) delete G.draining[room];
        const from = o.from ?? (Mv || D ? m.position.y - fy(room) : cur ?? 0.004);
        m.visible = true; m.position.y = fy(room) + from; G.moving[room] = { from, to: y, t: 0, sec: o.sec, m }; G.waterAt[room] = y;
        return;
      }
      if (Mv) delete G.moving[room];
      if (o.drain && cur != null && (y == null || y < cur - 0.02)) {
        if (!m.userData.ownMat) { m.material = m.material.clone(); m.userData.ownMat = true; }   // the rooms share one water material
        G.draining[room] = { from: cur, to: y ?? null, t: 0, sec: o.sec || Math.max(4, cur * 9), m, room };
        G.waterAt[room] = y;
        const R = ctx.data.plan.rooms.find((r) => r.id === room); const at = o.at || (R ? { x: R.x + R.w / 2, y: fy(room) + 0.1, z: R.z + R.d / 2 } : null);
        G.gurgle && G.gurgle(at, G.draining[room].sec);
        return;
      }
      if (D) delete G.draining[room];
      if (cur != null && y == null && o.left !== false && o.residue) residue(room, cur);
      m.visible = y != null; if (y != null) m.position.y = fy(room) + y; m.scale.set(1, 1, 1); G.waterAt[room] = y;
    };
    G.waterResidue = residue;   // story.js: a resumed game puts the after-state of a drained room straight away
    // the gurgle of water going down a drain: low bubbling bursts at the drain for as long as it runs, then the last suck
    G.gurgle = (at, sec) => {
      if (!ctx.audio || !ctx.audio.ctx) return; const A = ctx.audio, n = Math.round(sec * 3.5);
      for (let i = 0; i < n; i++) A.noiseBurst({ at: i / 3.5 + Math.random() * 0.15, dur: 0.12 + Math.random() * 0.1, freq: 180 + Math.random() * 260, q: 6, gain: 0.32 * (1 - (i / n) * 0.5), pos: at, wet: 0.5 });
      A.noiseBurst({ at: sec - 0.2, dur: 0.6, freq: 260, q: 3, gain: 0.5, sweep: -0.6, pos: at, wet: 0.6 });
    };

    // ---------------- pipes along the walls of the passage and the basement: one merged mesh ----------------
    {
      const geos = [], pipeAlong = (x0, z0, x1, z1, y, r) => { const L = Math.hypot(x1 - x0, z1 - z0), g = new THREE.CylinderGeometry(r, r, L, 8); g.rotateZ(Math.PI / 2); g.rotateY(-Math.atan2(z1 - z0, x1 - x0)); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); geos.push(g); };
      const bands = (x0, z0, x1, z1, y, r) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(L / 3); for (let i = 1; i < n; i++) { const t = i / n, g = new THREE.CylinderGeometry(r * 1.4, r * 1.4, 0.06, 8); g.rotateZ(Math.PI / 2); g.rotateY(-Math.atan2(z1 - z0, x1 - x0)); g.translate(x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t); geos.push(g); } };
      const run = (x0, z0, x1, z1, y, r) => { pipeAlong(x0, z0, x1, z1, y, r); bands(x0, z0, x1, z1, y, r); };
      run(1.75, -1.4, 1.75, -40.8, 2.55, 0.09); run(1.78, -1.4, 1.78, -40.8, 2.25, 0.05); run(3.45, -1.4, 3.45, -40.8, 0.3, 0.07); run(3.42, -1.4, 3.42, -40.8, 2.6, 0.06);
      run(-18.45, -43, -18.45, -80.8, 2.5, 0.09); run(-16.75, -43, -16.75, -80.8, 0.35, 0.07);
      run(-18.4, -82.45, -4.2, -82.45, 2.5, 0.08); run(-3.8, -82.45, 9.8, -82.45, 2.5, 0.08); run(-18.4, -81.15, 9.8, -81.15, 0.3, 0.06);
      run(9.85, -83, 9.85, -99.8, 2.5, 0.08); run(8.15, -83, 8.15, -99.8, 0.32, 0.06);
      run(0.2, 6.2, 19.8, 6.2, 2.6, 0.1); run(0.2, 8.8, 19.8, 8.8, 2.55, 0.07);
      run(0.2, 9.3, 5.8, 9.3, 2.6, 0.12); run(0.25, 9.3, 0.25, 14.8, 2.6, 0.12);
      const pm = new THREE.Mesh(mergeGeometries(geos), M.pipe); pm.name = 'mn-pipes'; grp.add(pm);
    }
    // P2: the low pipes every 1.4 m (crawl under them: crouch). Their colliders are marked "low" (story.js lets a crouching body pass)
    // 1.2.0 (#18): the kit's low zone (js/kit/low-zone.js): the ceiling drops at a striped beam at each end, a standing body is stopped at
    // the entrance, the crouch card shows in front of it. The pipes hang under the low ceiling the whole way.
    for (let x = 0.8; x > -16.2; x -= 1.4) { const b = cyl('P2', x, -41.8, 0.08, 0.08, 1.6, M.rust, 1.02, false, 10); b.rotation.x = Math.PI / 2; }
    G.lowP2 = lowZone(ctx, { id: 'P2', floor: 0, x0: -16.4, x1: 1.4, z0: -42.6, z1: -41.0, ceiling: 1.2, along: 'x', why: '天井が低い。' });

    // ---------------- the watertight doors (防水扉): our own slab with a round window, a wheel on each face; the kit's leaf is hidden ----------------
    G.wt = {};
    const wtDoor = (id) => {
      const d = W.doors.get(id); if (!d) return;
      d.mesh.material = M.hidden;   // hides the kit's leaf (its [E] box and collider stay)
      const def = d.def, room = def.a, alongX = id === 'D_P1', y0 = fy(room), w = (def.width || 1.2);
      const g = new THREE.Group(); g.position.set(def.x, y0, def.z); if (!alongX) g.rotation.y = Math.PI / 2; grp.add(g);
      const slab = new THREE.Group(); g.add(slab);
      const part = (sw, sh, sd, m, x, y, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), m); o.position.set(x, y, z); slab.add(o); return o; };
      const T = 0.1, H = 2.1, wy0 = 1.35, wy1 = 1.75, wx = 0.2;
      part(w, wy0, T, M.steel, 0, wy0 / 2); part(w, H - wy1, T, M.steel, 0, (wy1 + H) / 2);
      part(w / 2 - wx, wy1 - wy0, T, M.steel, -(w / 2 + wx) / 2, (wy0 + wy1) / 2); part(w / 2 - wx, wy1 - wy0, T, M.steel, (w / 2 + wx) / 2, (wy0 + wy1) / 2);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(wx * 2, wy1 - wy0), M.glass); gl.position.set(0, (wy0 + wy1) / 2, 0); slab.add(gl);
      for (const f of [-1, 1]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.03, 6, 20), M.dark); ring.position.set(0, (wy0 + wy1) / 2, f * 0.06); slab.add(ring); }
      for (const yy of [0.25, 1.05, 1.95]) part(w + 0.02, 0.06, T + 0.04, M.dark, 0, yy);
      const wheels = [];
      for (const f of [-1, 1]) { const wh = new THREE.Group(); wh.position.set(0, 1.0, f * 0.1); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 18), M.red); wh.add(ring); for (let k = 0; k < 3; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.03), M.red); sp.rotation.z = (k * Math.PI) / 3; wh.add(sp); } slab.add(wh); wheels.push(wh); }
      // the heavy frame round the opening
      for (const s of [-1, 1]) { const o = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.3, 0.3), M.rust); o.position.set(s * (w / 2 + 0.084), 1.15, 0); g.add(o); }   // 4 mm back from the wall's end face (1.3.0: they shared one plane)
      const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.32, 0.2, 0.3), M.rust); top.position.set(0, 2.2, 0); g.add(top);
      G.wt[id] = { d, slab, wheels, open: d.isOpen ? 1 : 0, want: d.isOpen ? 1 : 0, spin: 0, w };
    };
    wtDoor('D_P1'); wtDoor('D_GATE');
    G.spinWheel = (id, sec = 1.2) => { const D = G.wt[id]; if (D) D.spin = sec; };
    // 1.6.0 (4th play test #9 「防水扉は少しゆっくり開けしめ」): the slab slides over 3.4 s with the grind of steel on its track and a clank at the
    // end; the way is open (to you and to her) only once it is more than 60 % open
    G.gateShut = () => !W.doors.get('D_GATE').isOpen || (G.wt.D_GATE && G.wt.D_GATE.open < 0.6);
    G.WT_SEC = 3.4; G.WT_CLOSE = 4.2;   // 1.7.0 (5th #10): closing is slower than opening - the weight of the slab coming home
    G.doorSound = (D, want) => {
      const A = ctx.audio; if (!A || !A.ctx) return; const pos = { x: D.d.def.x, y: fy(D.d.def.a) + 1.0, z: D.d.def.z }, sec = want ? G.WT_SEC : G.WT_CLOSE;
      A.noise && A.noise('scrape', { pos, gain: 1.4 });
      A.noiseBurst && A.noiseBurst({ dur: sec - 0.2, freq: want ? 150 : 110, q: 1.4, gain: want ? 0.55 : 0.75, type: 'lowpass', wet: 0.5, pos });   // the grind on the track
      A.noiseBurst && A.noiseBurst({ at: 0.2, dur: sec - 0.6, freq: 900, q: 6, gain: 0.08, wet: 0.5, sweep: want ? 0.8 : 1.2, pos });   // the squeal of the rollers
      A.noise && setTimeout(() => { A.noise('thud', { pos, gain: want ? 1.5 : 2.2 }); A.noise('rattle', { pos }); if (!want) { A.noise('thud', { pos, gain: 1.2 }); const c = ctx.camera.position; if (Math.hypot(c.x - pos.x, c.z - pos.z) < 8 && ctx.fx && ctx.fx.shake) ctx.fx.shake(0.25); } }, sec * 1000);
    };

    // ---------------- 1.6.0 (4th play test #1 「水の断面が見える作りはやめてください」, #11): sills ----------------
    // Every doorway between two waters that can stand at different levels has a concrete sill higher than the higher water, so the side of
    // the water ends against it (check-playtest P60 walks every edge of every surface). The watertight doors have a high coaming (0.5 m) with
    // a step on each side, the specimen room a raised threshold, the doors of the basement rooms an ankle sill. Rooms an open doorway joins
    // share one level (story.js levels()). You step over a sill (the eye rises, G.sillLiftAt) and so does she (chimera.js).
    const SILLS = { D_P1: 0.5, D_GATE: 0.5, D_END: 0.5, D_PUMP: 0.22, D_JIMU: 0.22, D_REIAN: 0.22 };
    const sillM = std(0x6b6c64, { roughness: 0.95 }); sillM.name = 'concrete-sill';
    G.sills = [];
    for (const [id, h] of Object.entries(SILLS)) {
      const d = W.doors.get(id); if (!d) continue;
      const def = d.def, R = W.rooms.get(def.a).room, y0 = fy(def.a);
      const alongX = Math.abs(def.z - R.z) < 0.2 || Math.abs(def.z - (R.z + R.d)) < 0.2;   // the door's plane runs along x (a north / south wall)
      const w = (def.width || 1.1) + 0.14, dep = 0.26;
      const add = (hh, dd, off) => { const m = new THREE.Mesh(new THREE.BoxGeometry(alongX ? w : dd, hh, alongX ? dd : w), sillM); m.position.set(def.x + (alongX ? 0 : off), y0 + hh / 2, def.z + (alongX ? off : 0)); m.name = `sill:${id}`; m.castShadow = true; m.receiveShadow = true; grp.add(m); return m; };
      add(h, dep, 0);
      if (h > 0.3) for (const s of [-1, 1]) add(h / 2, 0.3, s * (dep / 2 + 0.15));   // a step up on each side
      G.sills.push({ id, x: def.x, z: def.z, alongX, half: w / 2, h, dep, y0 });
    }
    /** the height of the sill (or its step) under (x, z): 0 off the sills */
    G.sillLiftAt = (x, z) => {
      for (const S of G.sills) {
        const a = S.alongX ? Math.abs(x - S.x) : Math.abs(z - S.z), d = S.alongX ? Math.abs(z - S.z) : Math.abs(x - S.x);
        if (a > S.half) continue;
        if (d < S.dep / 2 + 0.05) return S.h;
        if (S.h > 0.3 && d < S.dep / 2 + 0.35) return S.h / 2;
      }
      return 0;
    };
    G.sillY = 0;

    // ---------------- 玄関ホール: the glass front door with the chain round its handles, 黒木's torch behind it ----------------
    {
      const z = 25.9, x = 2.4;
      for (const s of [-1, 1]) {
        box('GENKAN', x + s * 0.62, z, 1.2, 2.2, 0.06, M.glass, 0, false);
        box('GENKAN', x + s * 1.22, z, 0.06, 2.2, 0.1, M.steel, 0, false); box('GENKAN', x + s * 0.62, z, 1.2, 0.06, 0.1, M.steel, 2.17, false); box('GENKAN', x + s * 0.62, z, 1.2, 0.12, 0.1, M.steel, 0, false);
        box('GENKAN', x + s * 0.08, z - 0.08, 0.03, 0.5, 0.03, M.steel, 0.75, false);
      }
      box('GENKAN', x, z, 0.04, 2.2, 0.1, M.steel, 0, false);
      W.colliders.push({ box: new THREE.Box3(new THREE.Vector3(x - 1.25, fy('GENKAN'), z - 0.08), new THREE.Vector3(x + 1.25, fy('GENKAN') + 2.3, z + 0.08)), off: false });
      // the chain: links wound round both handles
      for (let i = 0; i < 16; i++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 4, 8), M.chain); const a = i / 16 * Math.PI * 2; l.position.set(x + Math.cos(a) * 0.14, fy('GENKAN') + 1.0 + Math.sin(a) * 0.06 + (i % 2) * 0.01, z - 0.12); l.rotation.set(i % 2 ? Math.PI / 2 : 0, a, 0); grp.add(l); }
      box('GENKAN', x + 0.1, z - 0.15, 0.08, 0.1, 0.04, std(0x6b5a2a, { metalness: 0.6 }), 0.86, false);   // the padlock
      // behind the glass: the dark outside, the light of the torches through the rain
      const out = plane('GENKAN', x, z + 0.4, 3.2, 2.6, std(0x05080a, { roughness: 1 }), 1.3, Math.PI);
      void out;
      G.torch = plane('GENKAN', x - 0.3, z + 0.3, 1.5, 1.5, M.torch, 1.2, Math.PI);
      { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), r = g.createRadialGradient(32, 32, 2, 32, 32, 32); r.addColorStop(0, 'rgba(255,250,220,1)'); r.addColorStop(1, 'rgba(255,250,220,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); M.torch.map = new THREE.CanvasTexture(cv); M.torch.needsUpdate = true; }
      // the notice board by the door, a shoe rack, the umbrella stand
      // 1.3.0 (2nd play test #1 「チラチラ正方形の図が見えます」): the board stood with its face exactly on the plaster (x 0.08) and the two
      // fought for the same pixels. It now hangs 4.5 cm proud of the wall, on two screws; the notice is pasted on its face.
      // 1.4.2: named 'frame:' - it is what the notice (DOC_HEISA) is pasted on, its support (kit P43 skips frames)
      box('GENKAN', 0.105, 21.0, 0.045, 0.8, 1.1, std(0x5a4a3a), 1.1, false).name = 'frame:notice-board';
      cyl('GENKAN', 5.4, 19.0, 0.18, 0.16, 0.5, M.steel, 0, true);
    }
    // ---------------- 外来の待合: the sagging ceiling panels, threads of rain falling through ----------------
    // 1.3.0 (2nd play test #12): the broken ceiling is built in js/ext/dress.js (a torn hole with joists and a pipe; stains elsewhere)
    for (let i = 0; i < 4; i++) plane('MACHI', 7.2 + i * 0.25, 25.4, 0.12, 0.28, M.cream, 0.01, 0.2 * i, -Math.PI / 2);
    // ---------------- 受付: papers on the floor, the window with the hand prints (a thing to look at) ----------------
    for (let i = 0; i < 6; i++) flat('UKE', 17.4 + (i % 3) * 0.6, 22.3 + Math.floor(i / 3) * 1.1, 0.21, 0.3, M.papers[i % 5], 0.01 + i * 0.001, i * 0.7);
    // ---------------- カルテ庫: charts all over the floor ----------------
    for (let i = 0; i < 14; i++) flat('KARTE', 1.6 + (i * 1.37) % 3.4, 10.4 + (i * 0.83) % 3.6, 0.24, 0.32, i % 3 ? M.papers[i % 5] : std(0x7b8a96, { roughness: 1, side: THREE.DoubleSide }), 0.01 + i * 0.0008, i * 0.9);
    // ---------------- 診察室: the sink that keeps running ----------------
    // ---------------- 階段ホール: wet footprints from the stairs ----------------

    // ---------------- 地下の廊下: the water to the ankles, a drain ----------------
    flat('B_ROKA', 8.0, 7.5, 0.5, 0.5, G.grateM || M.dark, 0.01);
    // ---------------- ポンプ室: the generator, the pump, the water gauge ----------------
    {
      G.genBody = box('PUMP', 0.75, 12.0, 1.1, 1.0, 1.6, M.green); cyl('PUMP', 0.75, 12.0, 0.3, 0.3, 0.5, M.dark, 1.0, false, 14).rotation.z = Math.PI / 2;
      cyl('PUMP', 0.4, 11.0, 0.05, 0.05, 1.9, M.pipe, 1.0); box('PUMP', 1.3, 12.6, 0.1, 0.3, 0.3, M.steel, 0.55, false);
      G.genFly = cyl('PUMP', 1.33, 11.4, 0.22, 0.22, 0.06, M.steel, 0.5, false, 18); G.genFly.rotation.z = Math.PI / 2;
      G.genLamp = box('PUMP', 1.32, 12.3, 0.02, 0.06, 0.06, M.emergOff, 0.9, false);
      // the pump: a big motor and a pipe into the floor sump
      cyl('PUMP', 1.0, 9.9, 0.32, 0.32, 0.8, M.steel, 0, true, 16); cyl('PUMP', 1.0, 9.9, 0.08, 0.08, 1.9, M.pipe, 0.8);
      flat('PUMP', 2.2, 10.1, 0.8, 0.8, G.grateM || M.dark, 0.01);
      // the gauge on the north wall
      box('PUMP', 1.6, 9.1, 0.34, 0.34, 0.03, M.steel, 1.33, false); plane('PUMP', 1.6, 9.117, 0.3, 0.3, M.white, 1.5); G.gaugeNeedle = box('PUMP', 1.6, 9.125, 0.01, 0.12, 0.01, M.red, 1.44, false);   // 1.3.0: the dial sat 1 cm inside the wall
    }
    // ---------------- 病理事務室: the ledger cabinet (locked), the floor drain, the staff photo ----------------
    {
      box('JIMU', 10.9, 14.7, 0.9, 1.9, 0.5, M.steel); box('JIMU', 10.9, 14.44, 0.02, 1.8, 0.02, M.dark, 0.05, false);
      G.cabLock = box('JIMU', 11.1, 14.43, 0.04, 0.06, 0.03, std(0xa0882a, { metalness: 0.7 }), 1.05, false);
      G.drain = new THREE.Group(); G.drain.position.set(9.0, fy('JIMU'), 11.6); grp.add(G.drain);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.04, 20), M.steel); rim.position.y = 0.02; G.drain.add(rim);
      const gr = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), G.grateM || M.dark); gr.rotation.x = -Math.PI / 2; gr.position.y = 0.042; G.drain.add(gr);
      G.drainWater = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), M.formalin); G.drainWater.rotation.x = -Math.PI / 2; G.drainWater.position.y = 0.05; G.drainWater.visible = false; G.drain.add(G.drainWater);
      // 1.7.0 (5th play test #11 「抑えているシーンが緊迫感が欲しい」): what she holds down kicks back - G.drainKick lifts the grate and
      // sprays round it (story.js hold beats); binders and a box come off the filing cabinets (G.dropThing)
      G.drainGrate = gr; G.drainRim = rim; G.drainKick = 0;
      const drops = []; G.drops = drops;
      G.dropThing = (i) => {
        const spots = [[6.42, 10.0, 1.32], [6.42, 10.6, 1.32], [6.5, 10.3, 1.32]], [x, z, y] = spots[i % spots.length];
        const m = new THREE.Mesh(new THREE.BoxGeometry(i % 3 === 2 ? 0.3 : 0.06, i % 3 === 2 ? 0.2 : 0.3, i % 3 === 2 ? 0.24 : 0.24), i % 3 === 2 ? M.cardboard || std(0x8a6a44, { roughness: 0.9 }) : std([0x2a3a5a, 0x5a2a2a, 0x2a4a3a][i % 3], { roughness: 0.7 }));
        m.position.set(x + 0.25, fy('JIMU') + y, z); m.name = 'jimu-drop'; m.raycast = () => {}; grp.add(m);
        drops.push({ m, vy: 0, vx: 0.9 + (i % 2) * 0.3, rx: 3 + i, landed: false });
      };
      G.drainHands = new THREE.Group(); G.drain.add(G.drainHands); G.drainHands.visible = false;
      for (let i = 0; i < 5; i++) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.6, 8), [M.organ, M.white, M.cream][i % 3]); const ang = i * 1.25; a.position.set(Math.cos(ang) * 0.12, 0.25, Math.sin(ang) * 0.12); a.rotation.set(Math.sin(ang) * 0.4, 0, Math.cos(ang) * 0.4); G.drainHands.add(a); }
      box('JIMU', 7.3, 9.07, 0.7, 0.5, 0.03, M.dark, 1.3, false); plane('JIMU', 7.3, 9.09, 0.62, 0.42, M.cream, 1.55);
      for (let i = 0; i < 5; i++) flat('JIMU', 7.0 + i * 0.5, 10.4 + (i % 2) * 0.6, 0.22, 0.3, M.papers[(i + 1) % 5], 0.01 + i * 0.001, i);
    }
    // ---------------- 霊安室: the hearse doors (両開き) in the east wall ----------------
    {
      G.hearse = [];
      for (const s of [-1, 1]) {
        const hold = new THREE.Group(); hold.position.set(13.94, fy('REIAN'), 3 + s * 0.8); grp.add(hold);
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.2, 0.78), M.steel); leaf.position.set(0, 1.1, -s * 0.39); hold.add(leaf);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.6), M.dark); bar.position.set(-0.07, 1.0, -s * 0.39); hold.add(bar);
        G.hearse.push({ hold, s });
      }
      box('REIAN', 13.9, 3, 0.12, 0.2, 1.8, M.dark, 2.2, false);
      G.hearseOut = plane('REIAN', 14.05, 3, 1.6, 2.2, std(0x1a2226, { roughness: 1, emissive: 0x0d1418, emissiveIntensity: 1 }), 1.1, -Math.PI / 2); G.hearseOut.visible = false;
    }
    // ---------------- 防水扉の前: crates, the locker on its raised step ----------------
    box('MOUTH', 0.55, 1.2, 0.8, 0.6, 0.8, std(0x4b4232), 0, true);
    // the raised steps under the lockers (hides): out of the water
    for (const h of ctx.data.plan.hides || []) { const b = box(h.room, h.x, h.z, 1.0, 0.1, 1.0, std(0x55584f, { roughness: 1 }), -0.04, false); b.name = `step:${h.id}`; b.raycast = () => {}; }

    // ---------------- the passage ----------------
    // P1: water dripping from the pipe joints, hair caught in the pipes
    // P2: hand prints (a thing to look at), more hair
    // P3: a chart floating on the water (a thing), hair in the water
    // 1.6.0 (4th play test #2 「水に浮いている紙などもアイテムみたいな形で表示するべきです。写真も」): the papers on the water are documents
    // (docs DOC_F_*: [E] to read, a picture on each), drawn as the page they are (a chart, a ledger, a consent form, a photograph), a little
    // larger than before, lying ON the surface wherever it stands and bobbing; a pale rim round each until it has been read. (dressFloatDocs)
    const FLOAT = { DOC_F_KARTE: 'chart', DOC_F_LEDGER: 'ledger', DOC_F_CONSENT: 'form', DOC_F_PHOTO: 'photo' };
    G.floatDocs = [];
    const dressFloatDocs = () => {
      let i = 0;
      for (const [id, k] of Object.entries(FLOAT)) {
        const pk = W.interactables.find((o) => o.name === `doc:${id}`); if (!pk || G.floatDocs.some((f) => f.pk === pk)) continue;
        const model = pk.userData.model; if (model) model.visible = false;
        const tex = k === 'photo' ? photoTex('assets/photos/doc-float-photo.webp') : paperTex(k, i + 1);
        const sheet = new THREE.Mesh(new THREE.PlaneGeometry(k === 'photo' ? 0.2 : 0.26, k === 'photo' ? 0.16 : 0.35), std(0xffffff, { roughness: 1, side: THREE.DoubleSide, map: tex }));
        sheet.rotation.set(-Math.PI / 2, 0, i * 1.1 + 0.3); sheet.name = `float-doc:${id}`; sheet.renderOrder = 3; sheet.raycast = () => {};
        const rim = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xe8f0dc, transparent: true, opacity: 0.0, depthWrite: false })); rim.name = 'float-doc-rim'; rim.renderOrder = 2; rim.raycast = () => {};
        rim.scale.set(sheet.geometry.parameters.width + 0.05, sheet.geometry.parameters.height + 0.05, 1); rim.position.z = -0.002; sheet.add(rim);
        grp.add(sheet); G.floatDocs.push({ id, pk, sheet, rim, bob: i * 1.7 }); i++;
      }
    };
    G.dressFloatDocs = dressFloatDocs;
    // (#2) the low passage P2: claw gouges, hand prints, rust runs and a gap in the wall with something in it, low on both walls (seen crouching)
    {
      const marks = [['gouge', -2.5, 1], ['hands', -4.1, 1], ['stain', -4.6, -1], ['hands', -7.2, 1], ['gap', -9.4, -1], ['hands', -10.3, 1], ['gouge', -11.6, -1], ['hands', -13.4, 1], ['stain', 0.0, -1], ['gap', -15.2, 1]];
      marks.forEach(([k, x, side], i) => {
        const m = std(0xffffff, { map: markTex(k, i + 3), transparent: true, depthWrite: false, roughness: 0.9 }); m.name = `p2-mark-${k}`;
        const z = side > 0 ? -41.08 - 0.006 : -42.52 + 0.006, w = k === 'gap' ? 0.9 : 1.1;   // 1.7.0: on the plaster face (the wall is 0.16 thick round the room edge; at the edge the marks were inside it)
        const pl = plane('P2', x, z, w, k === 'gap' ? 0.45 : k === 'hands' ? 0.62 : 1.0, m, k === 'gap' ? 0.62 : k === 'hands' ? 0.74 : 0.55, side > 0 ? Math.PI : 0); pl.renderOrder = 2; pl.raycast = () => {}; pl.name = `p2-mark:${k}`;
      });
      // a burst pipe dribbling down the north wall, a vent with a pale finger through the slats
      const pp = cyl('P2', -6.0, -42.45, 0.05, 0.05, 1.1, M.rust, 0.05, false, 8); void pp;
      G.p2Vent = box('P2', -12.4, -42.56, 0.4, 0.22, 0.03, M.steel, 0.3, false);
    }
    // P4B: the labels peeled off the jars (thing P4_LABELS), flat on the plaster of the south wall (found by a ray: never in the air)
    {
      const lm = std(0xffffff, { roughness: 0.95, map: labelsTex(), transparent: true, alphaTest: 0.05 }); lm.name = 'labels-paper';
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.65), lm); pl.name = 'p4-labels'; pl.raycast = () => {};
      const from = new THREE.Vector3(1.0, fy('P4B') + 1.4, -81.8), ray = new THREE.Raycaster(from, new THREE.Vector3(0, 0, -1), 0, 2);
      W.group.updateMatrixWorld(true);
      const hit = ray.intersectObjects(W.group.children.filter((o) => o !== grp), true).find((h) => h.object.isMesh && h.face && h.object.material && h.object.material.visible !== false && h.object.material.colorWrite !== false && !/^(look|station|item|doc):/.test(h.object.name));
      pl.position.set(1.0, fy('P4B') + 1.4, hit ? hit.point.z + 0.006 : -82.515); grp.add(pl); G.labelsAt = pl.position.z;
    }
    // P4: broken tiles, the broken jar on the floor
    for (let i = 0; i < 7; i++) flat('P4B', 5.6 + (i % 3) * 0.2, -82.0 + (i % 2) * 0.3, 0.08, 0.06, M.glass, 0.014, i).userData.rectOk = true;   // glass shards
    // P5: something dragged along the damp floor
    // ---------------- 病理標本室: the shelves of jars, the formalin tank, the glass cabinet with jar 7 ----------------
    {
      // the shelves on the east and west walls: jars in rows (instanced)
      const shelfM = std(0x6d706c, { metalness: 0.4, roughness: 0.5 });
      const rows = [];
      for (const [x, face] of [[12.75, -1], [5.25, 1]]) {
        for (const y of [0.5, 1.0, 1.5, 2.0]) box('HYOHON', x, -104, 0.45, 0.04, 6.4, shelfM, y, false);
        for (const zz of [-107.1, -100.9]) box('HYOHON', x, zz, 0.45, 2.2, 0.04, shelfM, 0, true);
        // 1.6.1 (まとめ役「棚全体がライトで白く飛ぶ」): a dark back board behind the jars - the white tile behind them made the torch-lit row a white wall
        box('HYOHON', x - face * 0.14, -104, 0.02, 2.45, 6.2, std(0x1f1d19, { roughness: 0.95 }), 0.02, false);
        for (const y of [0.54, 1.04, 1.54, 2.04]) for (let z = -106.8; z < -101; z += 0.3) if (Math.sin(z * 7.3 + y * 3.1 + x) > -0.6 && !(x < 6 && y < 0.6 && z > -105.2 && z < -102.8)) rows.push([x + face * 0.02, y, z, face]);
      }
      // 1.6.0 (4th play test #8 「標本室のホルマリンが改善されていないです。腕や臓器などいろいろな物をホルマリンにつけてください」): each jar holds
      // one thing you know at a glance - a hand, an arm, a heart with its vessels, a brain, a pair of kidneys, eyes, a foot on its heel, cut
      // fingers - as fine dot models (game-kit js/specimen-parts.js, 5 mm voxels), never two of a kind side by side; large jars on the floor
      // under the shelves hold whole forearms and feet. Each faces the room, its label out.
      const K = SPECIMEN_KINDS, spots = rows.map(([x, y, z, face], i) => { const kind = K[(i * 3 + Math.round(y * 2)) % K.length]; return { x, y: fy('HYOHON') + y, z, yaw: face > 0 ? Math.PI / 2 : -Math.PI / 2, kind, press: kind === 'hand' && i % 2 === 0 }; });   // 1.6.1: every other hand pressed flat to the glass
      for (const [x, z, kind, face] of [[12.3, -106.55, 'arm', -1], [12.3, -105.2, 'foot', -1], [12.3, -103.5, 'brain', -1], [12.3, -101.6, 'arm', -1], [5.7, -106.55, 'foot', 1], [5.7, -101.5, 'arm', 1]])   // 1.7.0: out from under the bottom shelf (each is looked at on its own)
        spots.push({ x, y: fy('HYOHON') + 0.005, z, yaw: face > 0 ? Math.PI / 2 : -Math.PI / 2, kind, big: true });
      const jars = buildSpecimenJars(THREE, spots, { lid: M.dark, label: M.cream });   // 1.6.1: the kit's murky formalin and thin glass (JAR_LOOK)
      grp.add(jars); G.jars = jars;
      // the formalin tank sunk in the floor (west half): a rim and the yellow liquid; a white rag floats on it
      const tx = 6.9, tz = -104;
      for (const [w, d, x, z] of [[1.6, 0.12, tx, tz - 1.1], [1.6, 0.12, tx, tz + 1.1], [0.12, 2.32, tx - 0.8, tz], [0.12, 2.32, tx + 0.8, tz]]) box('HYOHON', x, z, w, 0.3, d, M.white, 0, true);
      G.tank = flat('HYOHON', tx, tz, 1.5, 2.1, M.formalin, 0.22); G.tank.userData.rectOk = true;   // the liquid in a square tank
      flat('HYOHON', tx + 0.2, tz - 0.3, 0.4, 0.3, M.paper, 0.235, 0.6);
      // the glass cabinet on the north wall: jar 7 on its middle shelf, at the back
      const cx = 9, cz = -107.72;
      box('HYOHON', cx, cz, 1.6, 2.0, 0.04, M.dark, 0, false, 0);   // 1.6.1: a dark back, the jars read against it box('HYOHON', cx, cz - 0.0, 1.6, 0.05, 0.5, M.steel, 0, false);
      for (const s of [-1, 1]) box('HYOHON', cx + s * 0.78, cz + 0.2, 0.04, 2.0, 0.44, M.steel, 0, true);
      for (const y of [0.6, 1.1, 1.6, 1.98]) box('HYOHON', cx, cz + 0.2, 1.56, 0.03, 0.42, M.steel, y, false);
      box('HYOHON', cx, cz + 0.43, 1.56, 1.9, 0.02, M.glass, 0.05, false);
      G.cabJars = buildSpecimenJars(THREE, [[-0.55, 0.62, 'eyes'], [-0.2, 0.62, 'hand'], [0.4, 0.62, 'kidney'], [-0.5, 1.62, 'fingers'], [0.15, 1.62, 'brain'], [0.5, 1.62, 'heart']].map(([x, y, kind]) => ({ x: cx + x, y: fy('HYOHON') + y, z: cz + 0.2, yaw: 0, kind, press: kind === 'hand' })), { lid: M.dark, label: M.cream }); grp.add(G.cabJars);   // 1.6.0 (#8): the cabinet's jars too
      G.jar7 = new THREE.Group(); G.jar7.position.set(cx + 0.05, fy('HYOHON') + 1.12, cz + 0.18); grp.add(G.jar7);
      const j = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.34, 14), M.jarLiquid); j.position.y = 0.17; G.jar7.add(j);
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), M.heart); h.position.y = 0.14; h.scale.set(1, 1.2, 0.9); G.jar7.add(h);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.04, 14), M.dark); lid.position.y = 0.36; G.jar7.add(lid);
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.005), M.white); tag.position.set(0.09, 0.3, 0.07); tag.rotation.y = 0.5; G.jar7.add(tag);
      // the coat on the floor under the cabinet, the scattered glass
      flat('HYOHON', 10.8, -107.4, 0.6, 0.4, std(0xc4c2b6, { roughness: 1, side: THREE.DoubleSide }), 0.012, 0.4);
    }

    // ---------------- the emergency lights of the passage (S_LAMP1-4): a box high on the wall that glows when on ----------------
    G.lampFlame = {}; G.lampEntry = {}; G.lampS = {};
    const lamps = W.lamps || [];
    const PASS = new Set(['P1', 'P2', 'P3', 'P4A', 'P4B', 'P5', 'HYOHON']), B1 = new Set(['B_ROKA', 'B_STAIR', 'PUMP', 'JIMU', 'MOUTH', 'REIAN']);
    for (let i = lamps.length - 1; i >= 0; i--) if (PASS.has(lamps[i].room)) lamps.splice(i, 1);
    for (const o of [...W.group.children]) if (/^lamp(shade|bulb|cord):/.test(o.name)) o.visible = false;   // no power: no bulbs anywhere
    const st = (id) => ctx.data.plan.stations.find((s) => s.id === id);
    for (const id of ['S_LAMP1', 'S_LAMP2', 'S_LAMP3', 'S_LAMP4']) {
      const s = st(id), R = W.rooms.get(s.room).room;
      // the lamp: on the ceiling over the middle of the passage, a step on from the switch
      const alongZ = R.d > R.w, lx = alongZ ? R.x + R.w / 2 : s.x, lz = alongZ ? s.z : R.z + R.d / 2;
      const hb = box(s.room, lx, lz, 0.4, 0.1, 0.18, M.emergOff, 2.82, false, alongZ ? Math.PI / 2 : 0);
      const glow = box(s.room, lx, lz, 0.32, 0.03, 0.12, M.emerg, 2.79, false, alongZ ? Math.PI / 2 : 0); glow.visible = false;
      void hb; G.lampFlame[id] = glow;
      const e = { room: s.room, floor: 0, x: lx, y: fy(s.room) + 2.4, z: lz, i: 0, d: 24 }; lamps.push(e); G.lampEntry[id] = e;   // 1.5.0 (#3): reach 24 m
    }
    G.hyoGlow = { room: 'HYOHON', floor: 0, x: 9, y: 2.4, z: -104, i: 0, d: 9 }; lamps.push(G.hyoGlow);
    G.tankGlow = { room: 'HYOHON', floor: 0, x: 6.9, y: 0.6, z: -104, i: 0, d: 4 }; lamps.push(G.tankGlow);
    // the floors: the ground floor is lit only by the night through the windows (very dim); the basement is dark until the generator runs
    G.b1Lamps = [];
    for (const l of lamps) {
      if (l.floor === 1) { l.i *= 0.1; l.d *= 0.8; }
      else if (B1.has(l.room)) { l.base = l.i * 0.22; l.i = 0; l.d *= 0.9; G.b1Lamps.push(l); }
    }
    G.b1Light = (on) => { for (const l of G.b1Lamps) l.i = on ? l.base : 0; G.genLamp.material = on ? M.emerg : M.emergOff; W.setLampFloor(ctx.floor, true); };
    W.setLampFloor && W.setLampFloor(ctx.floor || 1, true);

    // ---------------- ひなた ----------------
    const H = buildHinata(); grp.add(H.root); G.hina = H; H.root.visible = false;

    // ---------------- the stations: invisible [E] boxes on the things (no green boxes; no collider in front of the furniture) ----------------
    for (const s of ctx.data.plan.stations) {
      if (s.look) continue;
      const mesh = W.interactables.find((o) => o.name === `station:${s.id}`); if (!mesh) continue;
      const b0 = new THREE.Box3().setFromObject(mesh);
      const col = W.colliders.find((cl) => cl.box && cl.box.equals(b0)); if (col) col.off = true;
      mesh.material = M.hidden;
      for (const ch of [...mesh.children]) mesh.remove(ch);
      const h = HIT[s.id]; if (!h) continue;
      mesh.position.y = fy(s.room) + h.y; if (h.dx) mesh.position.x += h.dx; if (h.dz) mesh.position.z += h.dz;
      if (h.s) mesh.scale.set(h.s[0] / 0.9, h.s[1] / 1.1, h.s[2] / 0.5);
    }

    // ---------------- drips: water falling from the ceiling here and there (one Points draw) ----------------
    const DRIPS = [['GENKAN', 4.4, 20.4], ['MACHI', 8.0, 19.8], ['ROKA', 9.5, 16.5], ['KAIDAN', 15.0, 11.0], ['B_ROKA', 5.0, 7.5], ['B_ROKA', 12.5, 7.4], ['MOUTH', 2.0, 2.5], ['P1', 2.4, -12], ['P1', 2.8, -30], ['P3', -17.8, -52], ['P3', -17.4, -70], ['P4B', 4.0, -81.8], ['P5', 9.2, -90], ['HYOHON', 10.0, -103], ['REIAN', 8.0, 4.0]];
    const dp = new Float32Array(DRIPS.length * 3), dv = DRIPS.map((d, i) => ({ x: d[1], z: d[2], y0: fy(d[0]) + 2.9, y1: fy(d[0]) + 0.05, t: (i * 0.37) % 1 }));
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    const drips = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xaac4c0, size: 0.035, transparent: true, opacity: 0.7, depthWrite: false })); drips.frustumCulled = false; grp.add(drips);

    // ---------------- 1.5.0 (#17 「歩いたときに波紋」): wakes on the water, a pool of rings ----------------
    const wakeM = new THREE.MeshBasicMaterial({ color: 0x7d8a78, transparent: true, opacity: 0, depthWrite: false });   // dim: a basic material ignores the dark
    const rings = Array.from({ length: 14 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 32), wakeM.clone()); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 3; m.raycast = () => {}; m.name = 'mn-wake'; grp.add(m); return { m, t: 9 }; });
    let ri = 0, last = null, herT = 0;
    const waterY = (x, z) => { const r = W.roomAt(x, z); const lv = r != null ? G.waterAt[r] : null; return lv == null || !G.water[r] || !G.water[r].visible ? null : G.water[r].position.y; };
    const spawn = (x, y, z, big) => { const R = rings[ri++ % rings.length]; R.t = 0; R.big = big; R.m.position.set(x, y + 0.006, z); R.m.visible = true; };
    G.wake = spawn; G.waterYAt = waterY;
    // 1.6.0 (4th play test #11 「水が入っていく表現も欲しいです」): water you can see coming in. G.pourOver(doorId, intoRoom, sec) - a sheet
    // pouring over a sill into the lower side, foaming where it lands (rings, a pale churn) with the rush of it; G.pourFrom(x, z, room, sec) -
    // a stream falling from a burst joint of the ceiling pipes into the water. Each runs sec seconds, strongest in the middle.
    const pours = [];
    const streamM = () => { const m = M.stream.clone(); m.side = THREE.DoubleSide; m.opacity = 0; return m; };
    const foamM = new THREE.MeshBasicMaterial({ color: 0xb8c4bc, transparent: true, opacity: 0, depthWrite: false });
    const addPour = (P) => {
      P.t = 0; pours.push(P);
      const A = ctx.audio; if (A && A.noiseBurst) { A.noiseBurst({ dur: P.sec, freq: P.big ? 420 : 900, q: 0.6, gain: P.big ? 0.7 : 0.35, type: 'lowpass', wet: 0.5, pos: P.at }); A.noiseBurst({ dur: P.sec, freq: 2400, q: 0.8, gain: P.big ? 0.12 : 0.08, wet: 0.5, pos: P.at }); }
      return P;
    };
    G.pourOver = (doorId, into, sec = 6) => {
      const S = G.sills.find((x) => x.id === doorId), R = W.rooms.get(into); if (!S || !R) return null;
      const r = R.room, sg = S.alongX ? Math.sign(r.z + r.d / 2 - S.z) : Math.sign(r.x + r.w / 2 - S.x);
      const g = new THREE.Group(); g.position.set(S.x, S.y0, S.z); if (!S.alongX) g.rotation.y = Math.PI / 2; grp.add(g); g.name = `pour:${doorId}`;
      // in the group: x along the doorway, z towards the lower side (sg), y up
      const zs = S.alongX ? sg : -sg, top = S.h + 0.03, low = (G.waterAt[into] ?? 0.02) + 0.01, z0 = zs * (S.dep / 2 + 0.01), z1 = zs * (S.dep / 2 + (S.h > 0.3 ? 0.42 : 0.12));
      const L = Math.hypot(z1 - z0, top - low), sheet = new THREE.Mesh(new THREE.PlaneGeometry(S.half * 2 - 0.1, 1), streamM());
      sheet.position.set(0, (top + low) / 2, (z0 + z1) / 2); sheet.scale.y = L; sheet.rotation.x = Math.atan2(z0 - z1, top - low); sheet.name = 'mn-pour-sheet'; g.add(sheet);
      const foam = new THREE.Mesh(new THREE.PlaneGeometry(S.half * 2 - 0.05, 0.5), foamM.clone()); foam.rotation.x = -Math.PI / 2; foam.position.set(0, low + 0.004, z1 + zs * 0.2); foam.name = 'mn-pour-foam'; g.add(foam);
      const at = new THREE.Vector3(0, low, z1); g.updateMatrixWorld(true); at.applyMatrix4(g.matrixWorld);
      return addPour({ g, sheet, foam, sec, big: true, at: { x: at.x, y: at.y + 0.2, z: at.z }, spread: S.half, into });
    };
    G.pourFrom = (x, z, room, sec = 8) => {
      const y0 = fy(room), low = (G.waterAt[room] ?? 0.02) + 0.01, g = new THREE.Group(); g.position.set(x, y0, z); grp.add(g); g.name = 'pour:pipe';
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 1), streamM()); sheet.position.y = (2.55 + low) / 2; sheet.scale.y = 2.55 - low; sheet.rotation.y = Math.random() * 3; g.add(sheet);
      const s2 = sheet.clone(); s2.material = sheet.material; s2.rotation.y += Math.PI / 2; g.add(s2);
      const foam = new THREE.Mesh(new THREE.CircleGeometry(0.4, 18), foamM.clone()); foam.rotation.x = -Math.PI / 2; foam.position.y = low + 0.004; g.add(foam);
      return addPour({ g, sheet, foam, sec, big: false, at: { x, y: y0 + 1.0, z }, spread: 0.2, into: room });
    };
    G.pours = pours;
    G.inflow = (sec) => G.pourOver('D_P1', 'MOUTH', sec);   // 1.5.x name
    G.flowStep = (dt) => {
      for (let i = pours.length - 1; i >= 0; i--) {
        const P = pours[i]; P.t += dt; const k = Math.min(1, P.t / P.sec), env = Math.min(1, k * 6, (1 - k) * 4);
        P.sheet.material.opacity = 0.7 * env * (0.85 + Math.random() * 0.15); P.foam.material.opacity = 0.35 * env * (0.8 + Math.random() * 0.2);
        P.sheet.material.map && (P.sheet.material.map.offset.y -= dt * 2);
        // the landing follows the water as it rises
        const ly = (G.waterYAt(P.at.x, P.at.z) ?? null); if (ly != null) P.foam.position.y = ly - P.g.position.y + 0.004;
        if (Math.random() < dt * (P.big ? 14 : 6)) { const o = new THREE.Vector3((Math.random() - 0.5) * P.spread * 2, 0, 0); P.foam.localToWorld(o.set(o.x, 0, 0)); const yy = G.waterYAt(o.x, o.z); if (yy != null) spawn(o.x, yy, o.z, true); }
        if (k >= 1) { grp.remove(P.g); pours.splice(i, 1); }
      }
    };
    function wakes(dt) {
      const c = ctx.camera.position;
      if (ctx.floor === 0) {
        const y = waterY(c.x, c.z);
        if (y != null) { if (!last || Math.hypot(c.x - last.x, c.z - last.z) > 0.45) { if (last) spawn(c.x, y, c.z, false); last = { x: c.x, z: c.z }; } } else last = null;
        const H = G.gh, f = G.chimera && G.chimera.root;
        if (H && f && f.visible && H.mode !== 'off') { herT -= dt; if (herT <= 0) { herT = 0.45; const yy = waterY(f.position.x, f.position.z); if (yy != null) spawn(f.position.x, yy, f.position.z, true); } }
      }
      for (const R of rings) {
        if (!R.m.visible) continue;
        R.t += dt; const k = R.t / (R.big ? 1.9 : 1.4);
        if (k >= 1) { R.m.visible = false; continue; }
        const s = (R.big ? 0.4 : 0.22) + k * (R.big ? 1.6 : 0.9); R.m.scale.set(s, s, s); R.m.material.opacity = 0.2 * (1 - k) * (1 - k);
      }
    }

    grp.updateMatrixWorld(true);
    for (const s of solids) W.colliders.push({ box: new THREE.Box3().setFromObject(s), off: false });
    ctx.seatPickups && ctx.seatPickups(); dressFloatDocs();
    let t = 0;
    ctx.systems.push({ id: 'mn-hospital', def: { update: (dt) => {
      t += dt;
      // the drips fall, the tap runs, the torch outside sways
      if (G.drainGrate) { const k = G.drainKick = Math.max(0, G.drainKick - dt * 2.2); G.drainGrate.position.y = 0.042 + k * 0.09 * (0.6 + Math.abs(Math.sin(t * 50))); G.drainGrate.rotation.y = k * Math.sin(t * 40) * 0.2; G.drainRim.rotation.z = k * Math.sin(t * 33) * 0.05; if (G.drainWater.visible) G.drainWater.scale.setScalar(1 + k * 0.6); }
      for (const d of G.drops || []) { if (d.landed) continue; d.vy -= 9.8 * dt; d.m.position.y += d.vy * dt; d.m.position.x += d.vx * dt; d.vx *= 0.98; d.m.rotation.z -= d.rx * dt; const f = fy('JIMU') + 0.04; if (d.m.position.y < f) { d.m.position.y = f; d.landed = true; d.m.rotation.z = Math.round(d.m.rotation.z / (Math.PI / 2)) * (Math.PI / 2); ctx.audio && ctx.audio.noise && ctx.audio.noise('thud', { pos: { x: d.m.position.x, y: f, z: d.m.position.z }, gain: 0.9 }); } }
      dv.forEach((d, i) => { d.t = (d.t + dt * 0.9) % 1; dp[i * 3] = d.x; dp[i * 3 + 1] = d.y0 + (d.y1 - d.y0) * d.t * d.t; dp[i * 3 + 2] = d.z; });
      dg.attributes.position.needsUpdate = true;
      for (const [room, D] of Object.entries(G.draining)) {
        D.t += dt; const k = Math.min(1, D.t / D.sec), e = 1 - (1 - k) * (1 - k), lv = D.from + ((D.to ?? 0.004) - D.from) * e;
        D.m.position.y = fy(room) + lv; D.m.material.opacity = 0.8 - (D.to == null ? 0.25 * e : 0);
        if (D.to == null && k > 0.15) residue(room, D.from);   // the line shows on the walls as the water goes down from it
        if (k >= 1) { delete G.draining[room]; if (D.to == null) D.m.visible = false; D.m.material.opacity = 0.8; if (ctx.sound) ctx.sound('noise', 'drip', { pos: D.m.position }); }
      }
      for (const Rd of Object.values(G.residue)) {
        Rd.t += dt; const fade = Math.max(0.15, 1 - Rd.t / 90);   // the walls drip for a minute and a half, then now and then
        Rd.dr.forEach((d, i) => { d.t = (d.t + dt * 0.8) % 1; Rd.pos[i * 3] = d.x; Rd.pos[i * 3 + 1] = d.y - (d.y - Rd.y0) * d.t * d.t; Rd.pos[i * 3 + 2] = d.z; });
        Rd.dg.attributes.position.needsUpdate = true; Rd.g.children[Rd.g.children.length - 1].material.opacity = 0.75 * fade;
        if (Math.random() < dt * 0.6 * fade && ctx.floor === 0 && ctx.audio && ctx.audio.noise) { const d = Rd.dr[Math.floor(Math.random() * Rd.dr.length)]; ctx.audio.noise('drip', { pos: { x: d.x, y: Rd.y0 + 0.05, z: d.z } }); }
      }
      if (G.tap) G.tap.scale.x = 1 + Math.sin(t * 30) * 0.2;
      // 1.5.0 (#17): the ripple drifts; wakes spread round your legs (and hers) as you wade
      // 1.6.0 (#2): the documents on the water ride its surface (it rises and falls), bob, turn slowly; a pale rim until read
      // 1.6.1 (まとめ役「ライトで瓶が白く飛ぶ」): close to the specimen shelves the torch dims (kit ctx.flashScale) - 1 at 2.5 m, 0.3 at 0.5 m
      if (ctx.state && ctx.state.room === 'HYOHON' && G.jars) { const c = ctx.camera.position; let d = 9; for (const J of [...G.jars.userData.jars, ...(G.cabJars ? G.cabJars.userData.jars : [])]) d = Math.min(d, Math.hypot(J.x - c.x, J.z - c.z)); ctx.flashScale = Math.max(0.3, Math.min(1, 0.3 + (d - 0.5) * 0.35)); } else ctx.flashScale = 1;
      for (const F of G.floatDocs) {
        const p = F.pk.position, wy = G.waterYAt(p.x, p.z), y = (wy ?? fy('P3') + 0.01) + 0.006 + Math.sin(t * 1.3 + F.bob) * 0.008;
        F.sheet.position.set(p.x, y, p.z); F.sheet.rotation.z += dt * 0.02 * (F.bob > 2 ? 1 : -1); p.y = y + 0.01;
        const read = ctx.state && ctx.state.docsRead && ctx.state.docsRead.includes(F.id); F.rim.material.opacity = read ? 0 : 0.18 + Math.sin(t * 2.2 + F.bob) * 0.1;
        F.sheet.visible = F.pk.visible !== false && !F.pk.userData.off;
      }
      for (const [room, Mv] of Object.entries(G.moving)) { Mv.t += dt; const k = Math.min(1, Mv.t / Mv.sec), e = k * k * (3 - 2 * k); Mv.m.position.y = fy(room) + Mv.from + (Mv.to - Mv.from) * e; if (k >= 1) delete G.moving[room]; }
      // 1.6.0 (#1): over a sill the eye rises with the step (and goes down again on the other side)
      if (ctx.fp && ctx.floor === 0) { const c = ctx.camera.position, want = G.sillLiftAt(c.x, c.z); G.sillY += (want - G.sillY) * Math.min(1, dt * 9); if (Math.abs(G.sillY) > 0.002 || G.sillSet) { ctx.fp.yOff = Math.abs(G.sillY) > 0.002 ? G.sillY : 0; G.sillSet = Math.abs(G.sillY) > 0.002; } }
      if (M.water.normalMap) { M.water.normalMap.offset.x = t * 0.03; M.water.normalMap.offset.y = Math.sin(t * 0.4) * 0.05; }
      wakes(dt); G.flowStep(dt);
      M.torch.opacity = G.kurokiThere === false ? 0 : 0.5 + Math.sin(t * 1.3) * 0.12 + Math.sin(t * 4.1) * 0.06;
      // the watertight doors slide; their wheels spin while worked
      for (const D of Object.values(G.wt)) {
        const want = D.d.isOpen ? 1 : 0; if (want !== D.want) { D.want = want; G.doorSound(D, want); }
        D.open += Math.sign(want - D.open) * Math.min(Math.abs(want - D.open), dt / (want ? G.WT_SEC : G.WT_CLOSE));
        if (D.d.col) D.d.col.off = want === 1 && D.open > 0.6;   // 1.6.0 (#9): the way opens with the slab, not at the press of [E]
        const e = D.open * D.open * (3 - 2 * D.open); D.slab.position.x = -e * (D.w + 0.05);   // eased: a heavy start and a slow home
        if (D.spin > 0) { D.spin -= dt; for (const w of D.wheels) w.rotation.z += dt * 6; }
      }
      // 1.3.0 (2nd play test #8 「発電機の唸る音がありません」): the generator hums where it stands while it runs (a positional loop: the mains
      // hum, its harmonics, the rattle of the housing), and its housing shivers
      if (ctx.audio && ctx.audio.hum && ctx.audio.ctx) { const on = !!G.genOn, has = !!(ctx.audio.loops && ctx.audio.loops['mn-gen']); if (on && !has) ctx.audio.hum('mn-gen', { x: 0.75, y: fy('PUMP') + 0.8, z: 12.0 }, { freq: 50, gain: 0.55, rattle: 0.8, ref: 1.4 }); else if (!on && has) ctx.audio.stopLoop('mn-gen', 0.8); }
      if (G.genBody) G.genBody.position.x = 0.75 + (G.genOn ? Math.sin(t * 157) * 0.0025 : 0);
      if (G.genOn) { G.genFly.rotation.x += dt * 18; G.gaugeNeedle.rotation.z = -0.4 + Math.sin(t * 0.3) * 0.05; } else G.gaugeNeedle.rotation.z = 0.9 + Math.sin(t * 7) * 0.04;
      if (G.hearseOpen != null) for (const L of G.hearse) L.hold.rotation.y = L.s * -G.hearseOpen * 1.3;
      if (G.hina && G.hina.root.visible) { if (G.hinaFloor === ctx.floor && ctx.camera.position.distanceTo(G.hina.root.position) < 7) G.hina.lookAt(ctx.camera.position); else G.hina.lookAt(null); G.hina.update(dt); }
      if (G.drainHands.visible) G.drainHands.children.forEach((a, i) => { a.rotation.x = Math.sin(t * 2 + i) * 0.5; });
    } }, inst: null });
  });
}
