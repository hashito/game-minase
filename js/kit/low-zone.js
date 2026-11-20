/* game-kit 8e20d97: js/low-zone.js — edit in game-kit and run tools/kit-sync.js */
// Low zones: a stretch you can only pass crouching (standard 1.17.0, from 水無瀬病院 #18: 「しゃがむところが分かりづらく、しゃがまなくても
//途中まで行けてしまう」). One call per zone builds what a player needs to read it before they walk into it:
//   - the ceiling drops at the entrance: a beam across the way with yellow and black hazard stripes on its face, and a low slab over the zone;
//   - colliders that stop a standing body from the very first centimetre (marked low: a crouching body passes; controller solid() is wrapped once);
//   - standing in front of an entrance, the crouch hint card shows (ctx.controlHint('crouch'), once) and a bump says why in one line.
//   import { lowZone } from '../kit/low-zone.js';
//   lowZone(ctx, { id: 'P2', floor: 0, x0: -16.4, x1: 1.4, z0: -42.6, z1: -41.0, ceiling: 1.2, along: 'x' })   // along: the way you walk
// ctx.lowZones lists them; zone.standingBlocked() (tools/check-playtest.mjs) tells whether a standing body is stopped at each entrance.
import * as THREE from 'three';

let stripeTex = null;
function stripes() {
  if (stripeTex || typeof document === 'undefined') return stripeTex;
  const c = document.createElement('canvas'); c.width = 128; c.height = 32;
  const g = c.getContext('2d'); g.fillStyle = '#d8b21c'; g.fillRect(0, 0, 128, 32); g.fillStyle = '#141414';
  for (let x = -32; x < 160; x += 32) { g.beginPath(); g.moveTo(x, 32); g.lineTo(x + 16, 32); g.lineTo(x + 32, 0); g.lineTo(x + 16, 0); g.fill(); }
  g.fillStyle = 'rgba(60,40,20,.35)'; for (let i = 0; i < 120; i++) g.fillRect(Math.random() * 128, Math.random() * 32, 2 + Math.random() * 4, 1 + Math.random() * 2);   // grime
  stripeTex = new THREE.CanvasTexture(c); stripeTex.colorSpace = THREE.SRGBColorSpace; stripeTex.wrapS = THREE.RepeatWrapping; stripeTex.anisotropy = 4;
  return stripeTex;
}

export function lowZone(ctx, z) {
  const W = ctx.world, fy = W.floorY ? W.floorY(z.floor || 0) : 0, ceil = z.ceiling ?? 1.2;
  const alongX = (z.along || (z.x1 - z.x0 > z.z1 - z.z0 ? 'x' : 'z')) === 'x';
  const grp = new THREE.Group(); grp.name = `lowzone:${z.id}`; (W.group || ctx.scene).add(grp);
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2c2a, roughness: 0.9, metalness: 0.2 });
  const tape = new THREE.MeshStandardMaterial({ map: stripes(), roughness: 0.7 });
  const L = alongX ? z.x1 - z.x0 : z.z1 - z.z0, Wd = alongX ? z.z1 - z.z0 : z.x1 - z.x0, cx = (z.x0 + z.x1) / 2, cz = (z.z0 + z.z1) / 2;
  // the slab over the zone, its underside at the ceiling height
  const slab = new THREE.Mesh(new THREE.BoxGeometry(alongX ? L : Wd, 0.12, alongX ? Wd : L), dark); slab.position.set(cx, fy + ceil + 0.06, cz); grp.add(slab);
  // an entrance beam at each end: deep enough to read as "the ceiling comes down here", striped on the face you walk at
  const ends = alongX ? [[z.x0, -1], [z.x1, 1]] : [[z.z0, -1], [z.z1, 1]];
  for (const [e, s] of ends) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(alongX ? 0.22 : Wd, 0.3, alongX ? Wd : 0.22), dark);
    beam.position.set(alongX ? e : cx, fy + ceil + 0.15, alongX ? cz : e); grp.add(beam);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(Wd, 0.3), tape);
    face.position.set(alongX ? e + s * 0.112 : cx, fy + ceil + 0.15, alongX ? cz : e + s * 0.112); face.rotation.y = alongX ? s * Math.PI / 2 : (s > 0 ? 0 : Math.PI);
    tape.map && (tape.map.repeat.x = Math.max(1, Wd / 0.5)); grp.add(face);
    // the uprights at the sides of the entrance, striped too
    for (const t of [-1, 1]) {
      const up = new THREE.Mesh(new THREE.BoxGeometry(0.08, ceil, 0.08), tape);
      up.position.set(alongX ? e : cx + t * (Wd / 2 - 0.05), fy + ceil / 2, alongX ? cz + t * (Wd / 2 - 0.05) : e); grp.add(up);
    }
  }
  // colliders: the whole zone, from 20 cm up (a standing body is stopped at the entrance; crouching passes)
  const box = new THREE.Box3(new THREE.Vector3(Math.min(z.x0, z.x1), fy + 0.2, Math.min(z.z0, z.z1)), new THREE.Vector3(Math.max(z.x0, z.x1), fy + ceil + 0.3, Math.max(z.z0, z.z1)));
  const col = { box, off: false, low: true, zone: z.id }; W.colliders.push(col);
  // a crouching body passes the low colliders (wrapped once for every zone)
  const fp = ctx.fp;
  if (fp && !fp._lowWrapped) { const s0 = fp.solid.bind(fp); fp.solid = (c) => (c.low && fp.crouching ? false : s0(c)); fp._lowWrapped = true; }
  const zone = { ...z, group: grp, collider: col, ceiling: ceil, alongX,
    /** is a standing body stopped at every entrance? (the collider covers the whole width from below the knee to above the ceiling) */
    standingBlocked: () => !col.off && col.box.min.y <= fy + 0.5 && col.box.max.y >= fy + ceil && (alongX ? col.box.min.z <= z.z0 + 0.05 && col.box.max.z >= z.z1 - 0.05 : col.box.min.x <= z.x0 + 0.05 && col.box.max.x >= z.x1 - 0.05),
    near: (p, m = 2.2) => ends.some(([e]) => (alongX ? Math.abs(p.x - e) < m && p.z > z.z0 - 0.3 && p.z < z.z1 + 0.3 : Math.abs(p.z - e) < m && p.x > z.x0 - 0.3 && p.x < z.x1 + 0.3)),
    inside: (p) => p.x > Math.min(z.x0, z.x1) && p.x < Math.max(z.x0, z.x1) && p.z > Math.min(z.z0, z.z1) && p.z < Math.max(z.z0, z.z1),
  };
  (ctx.lowZones = ctx.lowZones || []).push(zone);
  // the hint at the entrance, and a line when a standing body bumps the beam
  let bumpT = 0;
  if (!ctx._lowSystem && ctx.systems) {
    ctx._lowSystem = true;
    ctx.systems.push({ id: 'low-zones', def: { update: (dt, c, active) => {
      if (!active || !fp) return;
      bumpT = Math.max(0, bumpT - dt);
      const p = ctx.camera.position;
      for (const Z of ctx.lowZones) {
        if ((Z.floor || 0) !== (ctx.floor || 0) || fp.crouching || Z.inside(p) || !Z.near(p)) continue;
        if (ctx.controlOpen && !ctx.controlOpen('crouch')) continue;
        if (ctx.controlHint) ctx.controlHint('crouch', { why: Z.why || '天井が低い。', once: true });
        if (Z.near(p, 0.75) && bumpT <= 0 && ctx.ui && ctx.ui.say) { ctx.ui.say(ctx.isTouch ? '天井が低い。［しゃがむ］で、くぐる。' : '天井が低い。［C］でしゃがんで、くぐる。', 3); bumpT = 6; }
      }
    } }, inst: null });
  }
  return zone;
}
