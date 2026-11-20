// 1.2.0: the hospital dressed again after the play test of 2026-11-20 (each part names the point it answers):
//   #4  puddles of no shape (soft-edged blobs, never squares)          #5  the reception window in the wall, with a counter and room behind it
//   #10 the sink (a basin, a gooseneck tap, the drain, a grimy mirror)  #11 the stairs collapsed, the lift stuck open, a ladder in their place
//   #15 hair in wet clumps that hang and curl                          #19 wet hand prints with fingers, smears and drips
//   #3  what you can look at has something to look at (the leak, the drawer, the floating sandal)
// Pictures are drawn on canvases here (no files): water, prints, grime, hazard tape.
import * as THREE from 'three';

const rng = (seed) => { let s = (seed * 2654435761) >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const canvas = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t; };

/** an alpha map of a puddle: a few overlapping soft blobs and a ragged edge (white = water) */
function puddleAlpha(seed) {
  return canvas(256, 256, (g) => {
    const r = rng(seed); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 7; i++) {
      const x = 70 + r() * 116, y = 70 + r() * 116, rad = 34 + r() * 46, gr = g.createRadialGradient(x, y, rad * 0.35, x, y, rad);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rad, rad * (0.55 + r() * 0.5), r() * 3, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, d = 70 + r() * 40, x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d; g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.5})`; g.beginPath(); g.arc(x, y, 3 + r() * 9, 0, Math.PI * 2); g.fill(); }   // splashes round the edge
  });
}
/** a bare wet foot (sole, heel, five toes) */
function footAlpha() {
  return canvas(64, 128, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 64, 128); g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(32, 92, 15, 26, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(30, 50, 19, 22, -0.1, 0, Math.PI * 2); g.fill();
    for (const [x, y, rr] of [[18, 22, 7], [28, 16, 6], [37, 17, 5], [45, 21, 4.5], [51, 28, 4]]) { g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#000'; g.beginPath(); g.ellipse(44, 66, 7, 16, 0.2, 0, Math.PI * 2); g.fill();   // the arch
  });
}
/** a wet hand print: palm, five fingers of different lengths, a smear and drips running from it */
function handAlpha(seed, glass = false) {
  return canvas(128, 160, (g) => {
    const r = rng(seed); g.fillStyle = '#000'; g.fillRect(0, 0, 128, 160);
    g.save(); g.translate(64, 96); g.rotate((r() - 0.5) * 0.5);
    const col = (a) => `rgba(255,255,255,${a})`;
    g.fillStyle = col(0.95); g.beginPath(); g.ellipse(0, 6, 25, 29, 0, 0, Math.PI * 2); g.fill();
    const F = [[-27, -6, 8, 26, -0.55], [-15, -30, 7, 34, -0.12], [-2, -36, 7.5, 38, 0], [11, -33, 7, 35, 0.1], [23, -22, 6, 26, 0.3]];
    for (const [x, y, w, h, a] of F) { const L = h * (0.85 + r() * 0.35); g.save(); g.translate(x, y + 6); g.rotate(a); g.beginPath(); g.ellipse(0, -L / 2 + 6, w, L / 2, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
    // the smear, as if the hand slid down
    const sm = g.createLinearGradient(0, 20, 0, 60); sm.addColorStop(0, col(0.6)); sm.addColorStop(1, col(0));
    g.fillStyle = sm; g.fillRect(-22, 20, 44, 40);
    g.restore();
    // drips
    for (let i = 0; i < (glass ? 6 : 3); i++) { const x = 40 + r() * 50, y0 = 110 + r() * 10, L = 14 + r() * (glass ? 40 : 18); g.strokeStyle = col(0.7); g.lineWidth = 2 + r() * 2; g.beginPath(); g.moveTo(x, y0); g.lineTo(x + (r() - 0.5) * 2, y0 + L); g.stroke(); g.fillStyle = col(0.8); g.beginPath(); g.arc(x, y0 + L, 2.5, 0, Math.PI * 2); g.fill(); }
    // blotchy edges
    for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.5})`; g.beginPath(); g.arc(r() * 128, r() * 160, r() * 4, 0, Math.PI * 2); g.fill(); }
  });
}
/** a long drag mark: a smear that thins and breaks up */
function dragAlpha() {
  return canvas(64, 512, (g) => {
    const r = rng(9); g.fillStyle = '#000'; g.fillRect(0, 0, 64, 512);
    for (let y = 0; y < 512; y += 2) { const w = 18 + Math.sin(y * 0.05) * 6 + r() * 6, x = 32 + Math.sin(y * 0.013) * 8; g.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.4})`; g.fillRect(x - w / 2, y, w, 2); }
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${r()})`; g.fillRect(r() * 64, r() * 512, 2 + r() * 6, 1 + r() * 3); }
  });
}
/** the grime of an old mirror: spots, blotches where the silver has gone, a crack */
function mirrorTex() {
  return canvas(256, 320, (g, w, h) => {
    const r = rng(4); const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#5d6664'); gr.addColorStop(1, '#2f3534'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { const x = r() * w, y = r() * h, rad = 6 + r() * 30, b = g.createRadialGradient(x, y, 0, x, y, rad); b.addColorStop(0, 'rgba(20,18,12,.55)'); b.addColorStop(1, 'rgba(20,18,12,0)'); g.fillStyle = b; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
    const e = g.createLinearGradient(0, 0, 0, h); e.addColorStop(0.8, 'rgba(10,10,6,0)'); e.addColorStop(1, 'rgba(10,10,6,.8)'); g.fillStyle = e; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(230,235,230,.55)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(40, 0); g.lineTo(90, 80); g.lineTo(84, 150); g.lineTo(150, 230); g.lineTo(160, 320); g.stroke();
    for (let i = 0; i < 800; i++) { g.fillStyle = `rgba(200,205,195,${r() * 0.12})`; g.fillRect(r() * w, r() * h, 1, 1); }
  });
}
function stripeTex() {
  return canvas(128, 32, (g) => { g.fillStyle = '#d8b21c'; g.fillRect(0, 0, 128, 32); g.fillStyle = '#141414'; for (let x = -32; x < 160; x += 32) { g.beginPath(); g.moveTo(x, 32); g.lineTo(x + 16, 32); g.lineTo(x + 32, 0); g.lineTo(x + 16, 0); g.fill(); } });
}

export function installDress(ext, G) {
  ext.on('game:ready', (ctx) => {
    const W = ctx.world, grp = new THREE.Group(); grp.name = 'mn-dress'; W.group.add(grp);
    const fy = (room) => W.yOf(room);
    const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
    const solids = [];
    const mesh = (geo, mat, x, y, z, parent = grp) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
    const boxAt = (room, x, z, w, h, d, mat, y0 = 0, solid = false) => { const m = mesh(new THREE.BoxGeometry(w, h, d), mat, x, fy(room) + y0 + h / 2, z); if (solid) solids.push(m); return m; };
    const decal = (room, x, z, w, d, mat, y = 0.013, rz = 0) => { const m = mesh(new THREE.PlaneGeometry(w, d), mat, x, fy(room) + y, z); m.rotation.set(-Math.PI / 2, 0, rz); m.raycast = () => {}; m.renderOrder = 1; return m; };

    // ---------------- #4 puddles ----------------
    const waterOf = (seed, tint = 0x1d2b28) => new THREE.MeshStandardMaterial({ color: tint, roughness: 0.04, metalness: 0.7, transparent: true, opacity: 0.85, alphaMap: puddleAlpha(seed), depthWrite: false });
    const puddle = (room, x, z, r, seed, sx = 1, sz = 1, rot = 0) => { const m = mesh(new THREE.CircleGeometry(r, 36), waterOf(seed), x, fy(room) + 0.012 + (seed % 7) * 0.0004, z); m.rotation.set(-Math.PI / 2, 0, rot); m.scale.set(sx, sz, 1); m.raycast = () => {}; m.renderOrder = 1; m.name = 'puddle'; return m; };
    puddle('GENKAN', 4.4, 20.4, 0.8, 11, 1.1, 0.8, 0.3);
    puddle('MACHI', 12.0, 22.1, 0.9, 12, 1.0, 0.75); puddle('MACHI', 8.0, 19.8, 0.55, 13);
    puddle('REIAN', 10.5, 2.5, 1.1, 14, 1.0, 0.7, 0.2);
    for (let z = -6, i = 0; z > -40; z -= 7, i++) puddle('P1', 2.6 + Math.sin(z) * 0.3, z, 0.75, 20 + i, 0.9, 1.2, z);
    puddle('SHIN', 8.7, 9.75, 0.45, 31, 1.2, 0.8);   // under the sink

    // ---------------- wet bare footprints up from the broken stairwell (KD_FOOT) ----------------
    { const m = new THREE.MeshStandardMaterial({ color: 0x141a19, roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.75, alphaMap: footAlpha(), depthWrite: false });
      for (let i = 0; i < 9; i++) { const t = i / 8, x = 14.2 + t * 0.9 + (i % 2 ? 0.13 : -0.13), z = 10.9 + t * 1.8; decal('KAIDAN', x, z, 0.12, 0.25, m, 0.013 + i * 0.0003, Math.PI - 0.45); } }
    // ---------------- P5: the drag mark ----------------
    { const m = new THREE.MeshStandardMaterial({ color: 0x23241f, roughness: 0.35, transparent: true, opacity: 0.7, alphaMap: dragAlpha(), depthWrite: false });
      decal('P5', 8.65, -90.5, 0.42, 10, m, 0.012, 0.03); }

    // ---------------- #19 hand prints: on the floor of the low passage, and inside the reception glass ----------------
    const printM = (seed, glass) => new THREE.MeshStandardMaterial({ color: glass ? 0x8c9893 : 0x060807, roughness: glass ? 0.6 : 0.08, metalness: glass ? 0 : 0.5, transparent: true, opacity: glass ? 0.32 : 0.95, alphaMap: handAlpha(seed, glass), depthWrite: false, side: THREE.DoubleSide });
    { const ms = [printM(1), printM(2), printM(3)];
      for (let i = 0; i < 11; i++) decal('P2', -5.6 - i * 0.48, -41.8 + (i % 2 ? 0.28 : -0.28), 0.22, 0.28, ms[i % 3], 0.013 + i * 0.0002, Math.PI / 2 + (i % 2 ? 0.25 : -0.2)); }

    // ---------------- #5 the reception window: an opening in the wall (plan D_MADO), a counter in it, glass above ----------------
    {
      const x = 16, z0 = 20.2, z1 = 22.2, zc = (z0 + z1) / 2, L = z1 - z0, y = fy('UKE');
      const wood = std(0x5b4a38, { roughness: 0.7 }), top = std(0x8a8170, { roughness: 0.5 }), frame = std(0x4a504e, { metalness: 0.55, roughness: 0.45 });
      const glass = new THREE.MeshStandardMaterial({ color: 0x5f7a78, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
      boxAt('UKE', x, zc, 0.36, 1.0, L, wood, 0, true);                       // the counter body, wall to wall in the opening
      boxAt('UKE', x + 0.1, zc, 0.62, 0.05, L + 0.04, top, 1.0);             // its top, reaching into the office
      boxAt('UKE', x + 0.55, zc, 0.5, 0.04, L - 0.2, top, 0.74);             // the staff side's writing shelf
      for (const zz of [z0 + 0.03, zc, z1 - 0.03]) boxAt('UKE', x, zz, 0.06, 1.15, 0.05, frame, 1.05);   // mullions
      boxAt('UKE', x, zc, 0.07, 0.06, L, frame, 2.17);                        // the head of the frame
      for (const [a, b] of [[z0 + 0.06, zc - 0.03], [zc + 0.03, z1 - 0.06]]) { const g = mesh(new THREE.PlaneGeometry(b - a, 1.0), glass, x, y + 1.17 + 0.5, (a + b) / 2); g.rotation.y = Math.PI / 2; g.name = 'uke-glass'; }
      // the slot to pass papers, and a bell
      boxAt('UKE', x + 0.25, zc + 0.4, 0.08, 0.05, 0.08, std(0x9a8a50, { metalness: 0.7, roughness: 0.3 }), 1.05);
      // the prints on the inside of the glass, a row of them, low and high
      const pm = [printM(7, true), printM(8, true), printM(9, true)];
      for (let i = 0; i < 6; i++) { const d = mesh(new THREE.PlaneGeometry(0.16, 0.2), pm[i % 3], x + 0.012, y + 1.35 + (i % 3) * 0.22 + (i % 2) * 0.05, z0 + 0.25 + i * 0.3); d.rotation.y = -Math.PI / 2; d.renderOrder = 3; d.raycast = () => {}; }
      // the office behind it: a chair pushed back, papers
      boxAt('UKE', 17.0, 21.3, 0.45, 0.45, 0.45, std(0x2c3436), 0.0);
      boxAt('UKE', 17.0, 21.52, 0.45, 0.5, 0.06, std(0x2c3436), 0.45);
    }

    // ---------------- #10 the sink of the consulting room (south wall, x 8.8) ----------------
    {
      const sx = 8.8, sz = 9.08, y = fy('SHIN');   // the wall's face (walls are 0.16 thick on the line)
      const china = new THREE.MeshStandardMaterial({ color: 0xd9d6c9, roughness: 0.28, metalness: 0.02 });
      const stained = new THREE.MeshStandardMaterial({ color: 0x8c7650, roughness: 0.6, transparent: true, opacity: 0.55, depthWrite: false });
      const chrome = new THREE.MeshStandardMaterial({ color: 0xa9aea8, roughness: 0.25, metalness: 0.9 });
      const rust = new THREE.MeshStandardMaterial({ color: 0x5e3b22, roughness: 0.9, metalness: 0.3 });
      // the pedestal and the basin (a turned bowl, open at the top)
      mesh(new THREE.CylinderGeometry(0.09, 0.15, 0.7, 20), china, sx, y + 0.35, sz + 0.24);
      const prof = [[0.02, 0], [0.14, 0.01], [0.21, 0.05], [0.25, 0.11], [0.27, 0.16], [0.285, 0.17], [0.28, 0.185], [0.25, 0.18], [0.23, 0.13], [0.18, 0.07], [0.06, 0.04], [0.035, 0.035]].map(([a, b]) => new THREE.Vector2(a, b));
      const bowl = mesh(new THREE.LatheGeometry(prof, 32), china, sx, y + 0.7, sz + 0.27); bowl.scale.set(1.15, 1, 0.85); bowl.material.side = THREE.DoubleSide;
      mesh(new THREE.BoxGeometry(0.64, 0.24, 0.04), china, sx, y + 0.96, sz + 0.03);   // the splashback
      // the drain: a dark hole with a rusty ring and hair caught in it
      const drain = mesh(new THREE.CircleGeometry(0.03, 16), new THREE.MeshBasicMaterial({ color: 0x050505 }), sx, y + 0.738, sz + 0.27); drain.rotation.x = -Math.PI / 2;
      const ring = mesh(new THREE.TorusGeometry(0.036, 0.006, 6, 16), rust, sx, y + 0.739, sz + 0.27); ring.rotation.x = Math.PI / 2;
      const streak = mesh(new THREE.PlaneGeometry(0.06, 0.16), stained, sx + 0.005, y + 0.745, sz + 0.2); streak.rotation.x = -Math.PI / 2 + 0.45;   // the rust streak from the tap
      // the tap: a gooseneck spout and two cross handles
      const spout = new THREE.CatmullRomCurve3([[0, 0, 0], [0, 0.12, 0.0], [0, 0.17, 0.05], [0, 0.15, 0.11], [0, 0.11, 0.13]].map(([a, b, c]) => new THREE.Vector3(sx + a, y + 0.9 + b, sz + 0.06 + c)));
      mesh(new THREE.TubeGeometry(spout, 16, 0.012, 8), chrome, 0, 0, 0);
      for (const s of [-1, 1]) { const h = new THREE.Group(); h.position.set(sx + s * 0.12, y + 0.93, sz + 0.07); grp.add(h); mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.05, 10), chrome, 0, -0.02, 0, h); for (const r of [0, Math.PI / 2]) { const b = mesh(new THREE.BoxGeometry(0.07, 0.012, 0.012), chrome, 0, 0.008, 0, h); b.rotation.y = r + 0.4; } }
      // the thin stream that never stops (G.tap wobbles in hospital.js)
      G.tap = mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.17, 6), new THREE.MeshStandardMaterial({ color: 0xbfd3d0, roughness: 0.05, transparent: true, opacity: 0.55, depthWrite: false }), sx, y + 0.82, sz + 0.19);
      // the mirror in a steel frame, a glass shelf under it with a cup
      const mir = mesh(new THREE.PlaneGeometry(0.46, 0.58), new THREE.MeshStandardMaterial({ map: mirrorTex(), roughness: 0.15, metalness: 0.65 }), sx, y + 1.5, sz + 0.012);
      mir.material.map.colorSpace = THREE.SRGBColorSpace;
      for (const [w, h, dx, dy] of [[0.5, 0.025, 0, 0.3], [0.5, 0.025, 0, -0.3], [0.025, 0.62, -0.24, 0], [0.025, 0.62, 0.24, 0]]) mesh(new THREE.BoxGeometry(w, h, 0.02), chrome, sx + dx, y + 1.5 + dy, sz + 0.015);
      mesh(new THREE.BoxGeometry(0.44, 0.012, 0.1), new THREE.MeshStandardMaterial({ color: 0x9fb6b2, roughness: 0.1, transparent: true, opacity: 0.5 }), sx, y + 1.15, sz + 0.06);
      mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.09, 12), std(0x6b7f86, { roughness: 0.4 }), sx - 0.13, y + 1.2, sz + 0.06);
      // water marks down the wall under the mirror
      for (let i = 0; i < 4; i++) mesh(new THREE.PlaneGeometry(0.02 + i * 0.006, 0.3 + i * 0.1), stained, sx - 0.18 + i * 0.12, y + 1.0 - i * 0.03, sz + 0.011);
      solids.push(mesh(new THREE.BoxGeometry(0.6, 0.9, 0.5), new THREE.MeshBasicMaterial({ visible: false }), sx, y + 0.45, sz + 0.27));
    }

    // ---------------- #15 hair: wet clumps that hang from the pipes and float ----------------
    const hairM = new THREE.MeshStandardMaterial({ color: 0x070707, roughness: 0.25, metalness: 0.15 });
    const clump = (x, y, z, n, len, seed, o = {}) => {
      const r = rng(seed), geos = [];
      for (let i = 0; i < n; i++) {
        const pts = [], ox = (r() - 0.5) * 0.06, oz = (r() - 0.5) * 0.06, L = len * (0.6 + r() * 0.5), sway = (r() - 0.5) * 0.12;
        for (let k = 0; k <= 10; k++) { const t = k / 10, curl = 0.05 + r() * 0.03; pts.push(new THREE.Vector3(x + ox + Math.sin(t * 9 + i * 1.7) * curl * t + sway * t * t, o.float ? y + Math.sin(t * 7 + i) * 0.012 : y - L * t, z + oz + (o.float ? -L * t + Math.sin(t * 8 + i) * curl : Math.cos(t * 7 + i * 1.3) * curl * t))); }   // wavy, wider toward the tips
        geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.0035 + r() * 0.003, 4));
      }
      for (const g of geos) mesh(g, hairM, 0, 0, 0);
    };
    clump(1.86, 2.3, -16.0, 14, 0.9, 1); clump(1.86, 2.3, -15.8, 9, 1.2, 2); clump(1.84, 2.0, -16.25, 6, 0.6, 3);   // P1, caught in the pipe joint
    for (const x of [-12.6, -12.9, -13.3]) clump(x, 1.1, -41.15, 8, 0.5, Math.round(-x * 10));   // against the north wall, so the wall shows them                          // P2, on the low pipes
    clump(-17.3, 0.15, -57.6, 16, 0.7, 7, { float: true }); clump(-17.5, 0.15, -58.3, 10, 0.5, 8, { float: true });     // P3, in the water

    // ---------------- #11 the way down: the stairs collapsed, the lift stuck, the ladder (plan ST_DOWN look "ladder") ----------------
    {
      const tape = new THREE.MeshStandardMaterial({ map: stripeTex(), roughness: 0.7, side: THREE.DoubleSide }); tape.map.wrapS = THREE.RepeatWrapping; tape.map.repeat.x = 4; tape.map.colorSpace = THREE.SRGBColorSpace;
      const conc = std(0x6a6862, { roughness: 0.95 }), steel = std(0x4b514f, { metalness: 0.6, roughness: 0.45 }), black = new THREE.MeshBasicMaterial({ color: 0x030303 });
      // 1F: the stairwell in the north-west corner of the stair hall; three steps, then nothing
      const x0 = 12.5, x1 = 14.3, z0 = 9.25, z1 = 11.0, y1 = fy('KAIDAN');
      const well = mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), black, (x0 + x1) / 2, y1 + 0.006, (z0 + z1) / 2); well.rotation.x = -Math.PI / 2; well.raycast = () => {};
      for (let i = 0; i < 3; i++) boxAt('KAIDAN', (x0 + x1) / 2, z1 - 0.15 - i * 0.28, x1 - x0 - 0.1, 0.06, 0.28, conc, -0.2 - i * 0.2);
      const broken = boxAt('KAIDAN', (x0 + x1) / 2 + 0.2, z1 - 1.05, 1.1, 0.06, 0.3, conc, -0.95); broken.rotation.set(0.5, 0.2, 0.3);   // a step hanging off its rebar
      // the railing round it, bent where something went through, with hazard tape
      for (const [x, z] of [[x1 + 0.05, z1 + 0.05], [x1 + 0.05, z0 + 0.1], [x0 + 0.1, z1 + 0.05]]) boxAt('KAIDAN', x, z, 0.05, 1.0, 0.05, steel, 0);
      boxAt('KAIDAN', (x0 + x1) / 2, z1 + 0.05, x1 - x0, 0.05, 0.05, steel, 0.95);
      const bent = boxAt('KAIDAN', x1 + 0.05, (z0 + z1) / 2, 0.05, 0.05, z1 - z0, steel, 0.95); bent.rotation.x = 0.25;
      for (const [x, z, w, ry] of [[(x0 + x1) / 2, z1 + 0.07, x1 - x0, 0], [x1 + 0.07, (z0 + z1) / 2, z1 - z0, Math.PI / 2]]) { const t = mesh(new THREE.PlaneGeometry(w, 0.09), tape, x, y1 + 0.62, z); t.rotation.y = ry; t.rotation.z = 0.04; }
      solids.push(boxAt('KAIDAN', (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0 + 0.1, 1.0, z1 - z0 + 0.1, new THREE.MeshBasicMaterial({ visible: false })));
      for (let i = 0; i < 6; i++) { const r = mesh(new THREE.DodecahedronGeometry(0.08 + (i % 3) * 0.05, 0), conc, x1 + 0.25 + (i % 3) * 0.18, y1 + 0.06, z1 - 0.2 - i * 0.22); r.rotation.set(i, i * 2, 0); }
      // B1 under it: the fallen flight in the water, rubble heaped up
      const yb = fy('B_STAIR');
      for (let i = 0; i < 5; i++) { const s = boxAt('B_STAIR', 13.0 + i * 0.25, 9.8 + i * 0.22, 1.2, 0.18, 0.3, conc, 0.05 + (i % 2) * 0.2, false); s.rotation.set(0.3 * (i - 2), 0.4 * i, 0.5 - i * 0.2); }
      for (let i = 0; i < 14; i++) { const r = mesh(new THREE.DodecahedronGeometry(0.1 + (i % 4) * 0.06, 0), conc, 12.6 + (i % 5) * 0.35, yb + 0.1 + (i % 3) * 0.08, 9.4 + Math.floor(i / 5) * 0.45); r.rotation.set(i, i * 1.3, i * 0.7); }
      solids.push(boxAt('B_STAIR', 13.4, 10.15, 1.9, 1.0, 1.6, new THREE.MeshBasicMaterial({ visible: false })));
      // the lift on the south wall: the doors stuck a hand's width apart, dark behind; the call buttons dead
      for (const [room, yy, gap] of [['KAIDAN', y1, 0.32], ['B_STAIR', yb, 0.05]]) {
        const lx = 18.0, lz = 9.08;   // clear of the B1 opening D_BSTAIR (x 15.2..16.8), on the wall's face
        for (const s of [-1, 1]) { const leaf = mesh(new THREE.BoxGeometry(0.5, 2.05, 0.05), steel, lx + s * (0.25 + gap / 2), yy + 1.03, lz + 0.05); leaf.name = 'lift-door'; }
        mesh(new THREE.PlaneGeometry(gap + 0.02, 2.0), black, lx, yy + 1.02, lz + 0.03);
        for (const [w, h, dx, dy] of [[1.4 + gap, 0.12, 0, 2.12], [0.1, 2.15, -0.75 - gap / 2, 1.07], [0.1, 2.15, 0.75 + gap / 2, 1.07]]) mesh(new THREE.BoxGeometry(w, h, 0.08), steel, lx + dx, yy + dy, lz + 0.04);
        mesh(new THREE.BoxGeometry(0.1, 0.22, 0.03), std(0x2b2f2e), lx + 1.0, yy + 1.15, lz + 0.03);
        for (const dy of [0.05, -0.05]) mesh(new THREE.CircleGeometry(0.018, 10), std(0x5a5145, { roughness: 0.5 }), lx + 1.0, yy + 1.15 + dy, lz + 0.046);
        if (room === 'KAIDAN') { const cab = new THREE.CatmullRomCurve3([[0, 2.1, 0], [0.04, 1.4, -0.02], [-0.03, 0.6, 0], [0.02, 0.1, 0.02]].map(([a, b, c]) => new THREE.Vector3(lx + a, yy + b, lz + 0.01 + c))); mesh(new THREE.TubeGeometry(cab, 20, 0.008, 5), std(0x111111), 0, 0, 0); }
        else for (let i = 0; i < 3; i++) mesh(new THREE.PlaneGeometry(1.4, 0.02), std(0x3c3a30, { transparent: true, opacity: 0.6 }), lx, yy + 0.35 + i * 0.12, lz + 0.081);   // water lines on the shut doors
        solids.push(mesh(new THREE.BoxGeometry(1.6, 2.2, 0.2), new THREE.MeshBasicMaterial({ visible: false }), lx, yy + 1.1, lz + 0.1));
      }
    }

    // ---------------- #3 the things you can look at get something to see ----------------
    {
      // BR_WATER: a sandal and a sodden form floating in the corridor water
      const s = mesh(new THREE.BoxGeometry(0.11, 0.025, 0.26), std(0x5d6a72, { roughness: 0.7 }), 6.0, fy('B_ROKA') + 0.085, 7.5); s.rotation.y = 0.6; s.name = 'br-sandal';
      const pa = mesh(new THREE.PlaneGeometry(0.21, 0.3), std(0xc9c2ae, { roughness: 1, side: THREE.DoubleSide }), 6.35, fy('B_ROKA') + 0.083, 7.2); pa.rotation.set(-Math.PI / 2, 0, 1.1);
      // P1_LEAK: a flanged joint on the high pipe, weeping water
      const fl = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 14), std(0x5a3a26, { roughness: 0.85, metalness: 0.4 }), 3.42, fy('P1') + 2.6, -12); fl.rotation.z = Math.PI / 2; fl.name = 'p1-leak';
      for (let i = 0; i < 3; i++) mesh(new THREE.CylinderGeometry(0.005, 0.003, 0.4 + i * 0.3, 5), new THREE.MeshStandardMaterial({ color: 0xbfd3d0, roughness: 0.05, transparent: true, opacity: 0.5, depthWrite: false }), 3.38 - i * 0.03, fy('P1') + 2.45 - i * 0.15, -12 + i * 0.04);
      // HY_JARS: one jar pulled to the edge of the east shelf, its label turned out
      const j = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.32, 12), new THREE.MeshStandardMaterial({ color: 0xb3a148, roughness: 0.1, transparent: true, opacity: 0.6, emissive: 0x2a2408, emissiveIntensity: 0.4 }), 12.5, fy('HYOHON') + 1.18, -104); j.name = 'hy-jar';
    }

    grp.updateMatrixWorld(true);
    for (const s of solids) W.colliders.push({ box: new THREE.Box3().setFromObject(s), off: false });
  });
}
