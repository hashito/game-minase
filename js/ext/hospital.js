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

// where each station's invisible [E] box goes (height above the floor; x / z moves; size of the box). Stations with a "look" are the kit's.
const HIT = {
  S_HINA1: { y: 0.9, s: [0.7, 1.6, 0.7] }, S_FRONT: { y: 1.1, dz: 0.2, s: [1.6, 1.8, 0.3] },
  S_GEN: { y: 0.8, dx: 0.1, s: [1.0, 1.3, 1.3] }, S_HINA2: { y: 0.9, dx: 0.3, dz: -0.2, s: [0.7, 1.6, 0.7] },
  S_CAB: { y: 1.0, dz: 0.15, s: [0.95, 1.8, 0.5] }, S_DRAIN: { y: 0.15, s: [0.8, 0.3, 0.8] },
  S_HEARSE: { y: 1.1, dx: 0.3, s: [0.3, 2.0, 1.6] }, S_SHELF: { y: 1.2, dz: -0.2, s: [1.6, 1.6, 0.5] },
};
// where ひなた stands at each moment of the story: [x, z, floor, yaw toward (x, z), pose, y above the floor]
export const HINA = {
  genkan: [1.0, 21.2, 1, [3, 21.6], 'idle'],
  roka: [4.6, 16.4, 1, [3, 15.2], 'idle'],
  kaidan: [13.8, 12.6, 1, [16, 15], 'idle'],
  bstair: [14.4, 10.4, 0, [15.4, 12], 'crouch'],
  pump: [4.6, 13.7, 0, [3, 11], 'idle'],
  rescue: [3.6, 14.55, 0, [3, 10], 'scared', 0.76],
  jimu: [7.8, 12.2, 0, [9, 11.6], 'idle'],
  drain: [9.75, 12.1, 0, [9, 11.6], 'crouch'],
  reian: [12.4, 4.2, 0, [10, 6], 'idle'],
};

export function installHospital(ext, G) {
  ext.on('game:ready', (ctx) => {
    const W = ctx.world, grp = new THREE.Group(); grp.name = 'mn-hospital'; W.group.add(grp);
    const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
    const M = {
      steel: std(0x4a504e, { metalness: 0.55, roughness: 0.5 }), dark: std(0x1c1f1f, { roughness: 0.7 }), rust: std(0x5a3a26, { roughness: 0.9, metalness: 0.3 }),
      white: std(0xcfcfc6, { roughness: 0.5 }), cream: std(0xb9b39f, { roughness: 0.8 }), paper: std(0xd6d1bf, { roughness: 1, side: THREE.DoubleSide }),
      glass: std(0x4f6a6a, { roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.28, depthWrite: false }),
      pipe: std(0x3e4442, { roughness: 0.6, metalness: 0.55 }), red: std(0x8a1d16, { roughness: 0.55, metalness: 0.3 }), green: std(0x2d4a3c, { roughness: 0.7 }),
      water: std(0x1d2b28, { roughness: 0.04, metalness: 0.7, transparent: true, opacity: 0.8, depthWrite: false }),
      formalin: std(0x8a7b30, { roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.85, emissive: 0x2a2408, emissiveIntensity: 0.6 }),
      jarLiquid: std(0xb3a148, { roughness: 0.1, transparent: true, opacity: 0.55, emissive: 0x2a2408, emissiveIntensity: 0.4, depthWrite: false }),
      organ: std(0x9b8a7a, { roughness: 0.6 }), heart: std(0x6b5550, { roughness: 0.55 }), chain: std(0x6a6c68, { metalness: 0.7, roughness: 0.4 }),
      hair: std(0x060606, { roughness: 0.5, side: THREE.DoubleSide }), torch: new THREE.MeshBasicMaterial({ color: 0xd8d2b0, transparent: true, opacity: 0.0 }),
      emerg: new THREE.MeshBasicMaterial({ color: 0x9ce8b8 }), emergOff: std(0x3a3f3c, { roughness: 0.6 }), black: std(0x050505, { roughness: 1 }),
      hidden: new THREE.MeshBasicMaterial({ visible: false }), stream: std(0x9fb3b0, { roughness: 0.05, transparent: true, opacity: 0.45, depthWrite: false }),
    };
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
    G.setWater = (room, y) => { const m = G.water[room]; if (!m) return; m.visible = y != null; if (y != null) m.position.y = fy(room) + y; G.waterAt[room] = y; };

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
    G.low = [];
    for (let x = 0.0; x > -17.6; x -= 1.4) {
      const b = cyl('P2', x, -41.8, 0.13, 0.13, 1.6, M.rust, 1.08, false, 10); b.rotation.x = Math.PI / 2;
      const c = { box: new THREE.Box3().setFromObject(b), off: false, low: true }; c.box.min.y = fy('P2') + 0.2; W.colliders.push(c); G.low.push(c);
    }
    box('P2', -8, -41.8, 22, 0.05, 1.6, M.dark, 1.4, false);   // the ceiling hangs low the whole way

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
      for (const s of [-1, 1]) { const o = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.3, 0.3), M.rust); o.position.set(s * (w / 2 + 0.08), 1.15, 0); g.add(o); }
      const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.32, 0.2, 0.3), M.rust); top.position.set(0, 2.2, 0); g.add(top);
      G.wt[id] = { d, slab, wheels, open: d.isOpen ? 1 : 0, spin: 0, w };
    };
    wtDoor('D_P1'); wtDoor('D_GATE');
    G.spinWheel = (id, sec = 1.2) => { const D = G.wt[id]; if (D) D.spin = sec; };
    G.gateShut = () => !W.doors.get('D_GATE').isOpen;

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
      box('GENKAN', 0.06, 21.0, 0.04, 0.8, 1.1, std(0x5a4a3a), 1.1, false);
      cyl('GENKAN', 5.4, 19.0, 0.18, 0.16, 0.5, M.steel, 0, true);
      flat('GENKAN', 4.4, 20.4, 1.4, 1.0, M.water, 0.015, 0.3);
    }
    // ---------------- 外来の待合: the sagging ceiling panels, threads of rain falling through ----------------
    for (const [x, z, r] of [[12.0, 22.1, 0.35], [8.0, 19.8, -0.2], [14.6, 24.5, 0.5]]) { const p = box('MACHI', x, z, 1.2, 0.03, 0.6, M.cream, 2.62, false); p.rotation.z = r * 0.4; p.rotation.x = r * 0.2; }
    flat('MACHI', 12.0, 22.1, 1.6, 1.2, M.water, 0.015); flat('MACHI', 8.0, 19.8, 1.0, 0.8, M.water, 0.015);
    for (let i = 0; i < 4; i++) plane('MACHI', 7.2 + i * 0.25, 25.4, 0.12, 0.28, M.cream, 0.01, 0.2 * i, -Math.PI / 2);
    // ---------------- 受付: papers on the floor, the window with the hand prints (a thing to look at) ----------------
    for (let i = 0; i < 6; i++) flat('UKE', 17.4 + (i % 3) * 0.6, 22.3 + Math.floor(i / 3) * 1.1, 0.21, 0.3, M.paper, 0.01 + i * 0.001, i * 0.7);
    box('UKE', 16.45, 23.0, 0.06, 0.9, 1.4, M.glass, 1.0, false);
    // ---------------- カルテ庫: charts all over the floor ----------------
    for (let i = 0; i < 14; i++) flat('KARTE', 1.6 + (i * 1.37) % 3.4, 10.4 + (i * 0.83) % 3.6, 0.24, 0.32, i % 3 ? M.paper : std(0x7b8a96, { roughness: 1, side: THREE.DoubleSide }), 0.01 + i * 0.0008, i * 0.9);
    // ---------------- 診察室: the sink that keeps running ----------------
    box('SHIN', 8.8, 9.3, 0.6, 0.85, 0.45, M.white); box('SHIN', 8.8, 9.32, 0.44, 0.05, 0.3, M.dark, 0.85, false);
    cyl('SHIN', 8.8, 9.15, 0.015, 0.015, 0.25, M.steel, 1.0); G.tap = cyl('SHIN', 8.8, 9.32, 0.008, 0.008, 0.2, M.stream, 0.86);
    box('SHIN', 8.8, 9.07, 0.5, 0.6, 0.03, std(0x9fa8a6, { metalness: 0.7, roughness: 0.15 }), 1.25, false);
    // ---------------- 階段ホール: wet footprints from the stairs ----------------
    for (let i = 0; i < 8; i++) flat('KAIDAN', 16.8 - i * 0.42, 12.0 + (i % 2 ? 0.16 : -0.16), 0.11, 0.24, M.water, 0.013, Math.PI / 2);

    // ---------------- 地下の廊下: the water to the ankles, a drain ----------------
    flat('B_ROKA', 8.0, 7.5, 0.5, 0.5, G.grateM || M.dark, 0.01);
    // ---------------- ポンプ室: the generator, the pump, the water gauge ----------------
    {
      box('PUMP', 0.75, 12.0, 1.1, 1.0, 1.6, M.green); cyl('PUMP', 0.75, 12.0, 0.3, 0.3, 0.5, M.dark, 1.0, false, 14).rotation.z = Math.PI / 2;
      cyl('PUMP', 0.4, 11.0, 0.05, 0.05, 1.9, M.pipe, 1.0); box('PUMP', 1.3, 12.6, 0.1, 0.3, 0.3, M.steel, 0.55, false);
      G.genFly = cyl('PUMP', 1.33, 11.4, 0.22, 0.22, 0.06, M.steel, 0.5, false, 18); G.genFly.rotation.z = Math.PI / 2;
      G.genLamp = box('PUMP', 1.32, 12.3, 0.02, 0.06, 0.06, M.emergOff, 0.9, false);
      // the pump: a big motor and a pipe into the floor sump
      cyl('PUMP', 1.0, 9.9, 0.32, 0.32, 0.8, M.steel, 0, true, 16); cyl('PUMP', 1.0, 9.9, 0.08, 0.08, 1.9, M.pipe, 0.8);
      flat('PUMP', 2.2, 10.1, 0.8, 0.8, G.grateM || M.dark, 0.01);
      // the gauge on the north wall
      plane('PUMP', 1.6, 9.07, 0.3, 0.3, M.white, 1.5); G.gaugeNeedle = box('PUMP', 1.6, 9.06, 0.01, 0.12, 0.01, M.red, 1.44, false);
    }
    // ---------------- 病理事務室: the ledger cabinet (locked), the floor drain, the staff photo ----------------
    {
      box('JIMU', 10.9, 14.7, 0.9, 1.9, 0.5, M.steel); box('JIMU', 10.9, 14.44, 0.02, 1.8, 0.02, M.dark, 0.05, false);
      G.cabLock = box('JIMU', 11.1, 14.43, 0.04, 0.06, 0.03, std(0xa0882a, { metalness: 0.7 }), 1.05, false);
      G.drain = new THREE.Group(); G.drain.position.set(9.0, fy('JIMU'), 11.6); grp.add(G.drain);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.04, 20), M.steel); rim.position.y = 0.02; G.drain.add(rim);
      const gr = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), G.grateM || M.dark); gr.rotation.x = -Math.PI / 2; gr.position.y = 0.042; G.drain.add(gr);
      G.drainWater = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), M.formalin); G.drainWater.rotation.x = -Math.PI / 2; G.drainWater.position.y = 0.05; G.drainWater.visible = false; G.drain.add(G.drainWater);
      // hands out of the drain (the return scene)
      G.drainHands = new THREE.Group(); G.drain.add(G.drainHands); G.drainHands.visible = false;
      for (let i = 0; i < 5; i++) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.6, 8), [M.organ, M.white, M.cream][i % 3]); const ang = i * 1.25; a.position.set(Math.cos(ang) * 0.12, 0.25, Math.sin(ang) * 0.12); a.rotation.set(Math.sin(ang) * 0.4, 0, Math.cos(ang) * 0.4); G.drainHands.add(a); }
      box('JIMU', 7.3, 9.07, 0.7, 0.5, 0.03, M.dark, 1.3, false); plane('JIMU', 7.3, 9.09, 0.62, 0.42, M.cream, 1.55);
      for (let i = 0; i < 5; i++) flat('JIMU', 7.0 + i * 0.5, 10.4 + (i % 2) * 0.6, 0.22, 0.3, M.paper, 0.01 + i * 0.001, i);
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
      flat('REIAN', 10.5, 2.5, 2.0, 1.4, M.water, 0.014, 0.2);
    }
    // ---------------- 防水扉の前: crates, the locker on its raised step ----------------
    box('MOUTH', 0.55, 1.2, 0.8, 0.6, 0.8, std(0x4b4232), 0, true);
    // the raised steps under the lockers (hides): out of the water
    for (const h of ctx.data.plan.hides || []) { const b = box(h.room, h.x, h.z, 1.0, 0.1, 1.0, std(0x55584f, { roughness: 1 }), -0.04, false); b.name = `step:${h.id}`; b.raycast = () => {}; }

    // ---------------- the passage ----------------
    // P1: water dripping from the pipe joints, hair caught in the pipes
    for (let i = 0; i < 6; i++) { const h = plane('P1', 1.82, -16 + i * 0.05, 0.02, 0.5 + i * 0.07, M.hair, 1.6, Math.PI / 2); h.rotation.z = 0.2 * (i - 3); }
    for (let z = -6; z > -40; z -= 7) flat('P1', 2.6 + Math.sin(z) * 0.3, z, 1.0, 1.4, M.water, 0.012, z);
    // P2: hand prints (a thing to look at), more hair
    for (let i = 0; i < 9; i++) flat('P2', -6 - i * 0.45, -41.8 + (i % 2 ? 0.25 : -0.25), 0.12, 0.16, std(0x2a2f2c, { roughness: 0.3, transparent: true, opacity: 0.8 }), 0.013, i);
    for (let i = 0; i < 8; i++) plane('P2', -13 + i * 0.12, -41.2, 0.02, 0.6 + (i % 3) * 0.15, M.hair, 0.6, 0);
    // P3: a chart floating on the water (a thing), hair in the water
    for (let i = 0; i < 10; i++) plane('P3', -17.4 + (i % 3) * 0.12, -58 + i * 0.1, 0.03, 0.6, M.hair, 0.13, 0, -Math.PI / 2);
    plane('P3', -17.2, -58.0, 0.22, 0.3, M.paper, 0.14, 0, -Math.PI / 2);
    // P4: broken tiles, the broken jar on the floor
    for (let i = 0; i < 7; i++) flat('P4B', 5.6 + (i % 3) * 0.2, -82.0 + (i % 2) * 0.3, 0.08, 0.06, M.glass, 0.014, i);
    // P5: something dragged along the damp floor
    for (let i = 0; i < 10; i++) flat('P5', 8.6 + Math.sin(i) * 0.15, -86 - i * 1.0, 0.25, 0.9, std(0x2a2b28, { roughness: 0.4, transparent: true, opacity: 0.6 }), 0.012 + i * 0.0005);
    // ---------------- 病理標本室: the shelves of jars, the formalin tank, the glass cabinet with jar 7 ----------------
    {
      // the shelves on the east and west walls: jars in rows (instanced)
      const shelfM = std(0x6d706c, { metalness: 0.4, roughness: 0.5 });
      const rows = [];
      for (const [x, face] of [[12.75, -1], [5.25, 1]]) {
        for (const y of [0.5, 1.0, 1.5, 2.0]) box('HYOHON', x, -104, 0.45, 0.04, 6.4, shelfM, y, false);
        for (const zz of [-107.1, -100.9]) box('HYOHON', x, zz, 0.45, 2.2, 0.04, shelfM, 0, true);
        for (const y of [0.52, 1.02, 1.52, 2.02]) for (let z = -106.8; z < -101; z += 0.3) if (Math.sin(z * 7.3 + y * 3.1 + x) > -0.6 && !(x < 6 && y < 0.6 && z > -105.2 && z < -102.8)) rows.push([x + face * 0.02, y, z]);
      }
      const jarG = new THREE.CylinderGeometry(0.1, 0.1, 0.32, 10), lidG = new THREE.CylinderGeometry(0.105, 0.105, 0.04, 10), orgG = new THREE.SphereGeometry(0.075, 8, 6);
      const jars = new THREE.InstancedMesh(jarG, M.jarLiquid, rows.length), lids = new THREE.InstancedMesh(lidG, M.dark, rows.length), orgs = new THREE.InstancedMesh(orgG, M.organ, rows.length), o = new THREE.Object3D();
      rows.forEach(([x, y, z], i) => {
        o.position.set(x, fy('HYOHON') + y + 0.16, z); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); jars.setMatrixAt(i, o.matrix);
        o.position.y = fy('HYOHON') + y + 0.34; o.updateMatrix(); lids.setMatrixAt(i, o.matrix);
        o.position.y = fy('HYOHON') + y + 0.12; o.scale.set(1 + (i % 3) * 0.2, 0.8 + (i % 4) * 0.15, 1); o.updateMatrix(); orgs.setMatrixAt(i, o.matrix);
      });
      for (const im of [jars, lids, orgs]) { im.frustumCulled = false; grp.add(im); }
      jars.renderOrder = 2;
      // the formalin tank sunk in the floor (west half): a rim and the yellow liquid; a white rag floats on it
      const tx = 6.9, tz = -104;
      for (const [w, d, x, z] of [[1.6, 0.12, tx, tz - 1.1], [1.6, 0.12, tx, tz + 1.1], [0.12, 2.32, tx - 0.8, tz], [0.12, 2.32, tx + 0.8, tz]]) box('HYOHON', x, z, w, 0.3, d, M.white, 0, true);
      G.tank = flat('HYOHON', tx, tz, 1.5, 2.1, M.formalin, 0.22);
      flat('HYOHON', tx + 0.2, tz - 0.3, 0.4, 0.3, M.paper, 0.235, 0.6);
      // the glass cabinet on the north wall: jar 7 on its middle shelf, at the back
      const cx = 9, cz = -107.72;
      box('HYOHON', cx, cz, 1.6, 2.0, 0.04, M.steel, 0, false, 0); box('HYOHON', cx, cz - 0.0, 1.6, 0.05, 0.5, M.steel, 0, false);
      for (const s of [-1, 1]) box('HYOHON', cx + s * 0.78, cz + 0.2, 0.04, 2.0, 0.44, M.steel, 0, true);
      for (const y of [0.6, 1.1, 1.6, 1.98]) box('HYOHON', cx, cz + 0.2, 1.56, 0.03, 0.42, M.steel, y, false);
      box('HYOHON', cx, cz + 0.43, 1.56, 1.9, 0.02, M.glass, 0.05, false);
      for (const [x, y] of [[-0.55, 0.62], [-0.2, 0.62], [0.4, 0.62], [-0.5, 1.62], [0.15, 1.62], [0.5, 1.62]]) { cyl('HYOHON', cx + x, cz + 0.2, 0.09, 0.09, 0.3, M.jarLiquid, y); cyl('HYOHON', cx + x, cz + 0.2, 0.06, 0.06, 0.1, M.organ, y + 0.06); }
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
      const e = { room: s.room, floor: 0, x: lx, y: fy(s.room) + 2.4, z: lz, i: 0, d: 17 }; lamps.push(e); G.lampEntry[id] = e;
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
    G.placeHina = (key) => {
      const p = HINA[key]; if (!p) { H.root.visible = false; G.hinaAt = null; return; }
      const [x, z, floor, [tx, tz], pose, dy] = p;
      H.root.visible = true; H.root.position.set(x, W.floorY(floor) + (dy || 0), z); H.root.rotation.y = Math.atan2(tx - x, tz - z);
      H.set(pose); G.hinaAt = key; G.hinaFloor = floor;
    };

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
    const DRIPS = [['GENKAN', 4.4, 20.4], ['MACHI', 12.0, 22.1], ['MACHI', 8.0, 19.8], ['ROKA', 9.5, 16.5], ['KAIDAN', 15.0, 11.0], ['B_ROKA', 5.0, 7.5], ['B_ROKA', 12.5, 7.4], ['MOUTH', 2.0, 2.5], ['P1', 2.4, -12], ['P1', 2.8, -30], ['P3', -17.8, -52], ['P3', -17.4, -70], ['P4B', 4.0, -81.8], ['P5', 9.2, -90], ['HYOHON', 10.0, -103], ['REIAN', 8.0, 4.0]];
    const dp = new Float32Array(DRIPS.length * 3), dv = DRIPS.map((d, i) => ({ x: d[1], z: d[2], y0: fy(d[0]) + 2.9, y1: fy(d[0]) + 0.05, t: (i * 0.37) % 1 }));
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    const drips = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xaac4c0, size: 0.035, transparent: true, opacity: 0.7, depthWrite: false })); drips.frustumCulled = false; grp.add(drips);

    grp.updateMatrixWorld(true);
    for (const s of solids) W.colliders.push({ box: new THREE.Box3().setFromObject(s), off: false });
    ctx.seatPickups && ctx.seatPickups();
    let t = 0;
    ctx.systems.push({ id: 'mn-hospital', def: { update: (dt) => {
      t += dt;
      // the drips fall, the tap runs, the torch outside sways
      dv.forEach((d, i) => { d.t = (d.t + dt * 0.9) % 1; dp[i * 3] = d.x; dp[i * 3 + 1] = d.y0 + (d.y1 - d.y0) * d.t * d.t; dp[i * 3 + 2] = d.z; });
      dg.attributes.position.needsUpdate = true;
      if (G.tap) G.tap.scale.x = 1 + Math.sin(t * 30) * 0.2;
      M.torch.opacity = G.kurokiThere === false ? 0 : 0.5 + Math.sin(t * 1.3) * 0.12 + Math.sin(t * 4.1) * 0.06;
      // the watertight doors slide; their wheels spin while worked
      for (const D of Object.values(G.wt)) {
        const want = D.d.isOpen ? 1 : 0; D.open += Math.sign(want - D.open) * Math.min(Math.abs(want - D.open), dt / 1.4);
        D.slab.position.x = -D.open * (D.w + 0.05);
        if (D.spin > 0) { D.spin -= dt; for (const w of D.wheels) w.rotation.z += dt * 6; }
      }
      if (G.genOn) { G.genFly.rotation.x += dt * 18; G.gaugeNeedle.rotation.z = -0.4 + Math.sin(t * 0.3) * 0.05; } else G.gaugeNeedle.rotation.z = 0.9 + Math.sin(t * 7) * 0.04;
      if (G.hearseOpen != null) for (const L of G.hearse) L.hold.rotation.y = L.s * -G.hearseOpen * 1.3;
      if (G.hina && G.hina.root.visible) { if (G.hinaFloor === ctx.floor && ctx.camera.position.distanceTo(G.hina.root.position) < 7) G.hina.lookAt(ctx.camera.position); else G.hina.lookAt(null); G.hina.update(dt); }
      if (G.drainHands.visible) G.drainHands.children.forEach((a, i) => { a.rotation.x = Math.sin(t * 2 + i) * 0.5; });
    } }, inst: null });
  });
}
