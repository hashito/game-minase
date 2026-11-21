// ひなた moves on her own feet (1.2.0, #12 / #13: 「日向が突然別の部屋にいて驚きます。次にどこに進むとか話して自力で歩かせて」「地下に待機している
// 日向は壁にもたれて。喋るとそれっぽい会話を」). When the story moves her (story.js hinaKey), she says where she is going and walks there along
// the corridors (doors open as she passes); only the ladder between the floors is a cut (she comes down it behind you: the 'down' talk).
// Waiting, she leans on a wall; [E] on her gives the task she is part of, or one of her lines for this moment (data/talk.json hw_<place>).
import * as THREE from 'three';

// where she waits: [x, z, floor, look toward (x, z), pose, y above the floor]. Lean spots are 0.36 m off the wall's FACE, facing away from it
// (1.3.0, 2nd play test #4 #6 「日向がかべに埋まっています」: at 0.2 m from the face the lean pose put half her head and her shoulders in the
// plaster - the pose leans the head 18 cm back. js/kit/npc-audit.js checks every spot and every corridor below: tools/play/hina-check.mjs).
export const HINA = {
  genkan: [1.0, 21.2, 1, [3, 21.6], 'idle'],
  roka: [4.6, 17.56, 1, [4.6, 15], 'lean'],
  kaidan: [15.0, 17.56, 1, [15.0, 15], 'lean'],
  bstair: [15.6, 11.3, 0, [15.4, 13], 'crouch'],
  pump: [5.56, 12.55, 0, [3, 12.55], 'lean'],
  rescue: [3.6, 14.55, 0, [3, 10], 'scared', 0.76],
  jimu: [6.44, 12.4, 0, [9, 12.4], 'lean'],
  drain: [9.75, 12.1, 0, [9, 11.6], 'crouch'],
  reian: [12.6, 5.56, 0, [12.6, 3], 'lean'],
};
// the corridors she walks: nodes [x, z] per floor and the edges between them (doors are nodes of their own: she opens them)
const NODES = {
  1: { g: [2.4, 21.0], gd: [3, 18.6], r3: [3, 16.5], r46: [4.6, 16.6], r9: [9, 16.5], r11: [11, 16.5], r15: [15, 16.5] },
  0: { bs: [15.5, 11.5], bd: [16, 9.7], b16: [16, 7.5], b10: [10, 7.5], b9: [9, 7.5], b3: [3, 7.5], pd: [3, 9.7], pc: [3.4, 12.4], jd: [9, 9.7], jc: [8.2, 12.2], rd: [10, 5.4], r1: [9.9, 3.0], rc: [12.2, 3.0] },   // 1.3.0: round the trolley (x 10.5-11.5, z 3.6-5.6), not through it
};
const EDGES = { 1: ['g-gd', 'gd-r3', 'r3-r46', 'r46-r9', 'r9-r11', 'r11-r15'], 0: ['bs-bd', 'bd-b16', 'b16-b10', 'b10-b9', 'b9-b3', 'b3-pd', 'pd-pc', 'b9-jd', 'jd-jc', 'b10-rd', 'rd-r1', 'r1-rc'] };
const DOORS = { gd: 'D_ROKA1', pd: 'D_PUMP', jd: 'D_JIMU', rd: 'D_REIAN', bd: 'D_BSTAIR' };
// what she says as she sets off (data/talk.json hm_<place>)
const GOING = { roka: 'hm_roka', kaidan: 'hm_kaidan', pump: 'hm_pump', jimu: 'hm_jimu', drain: 'hm_drain', reian: 'hm_reian' };

/** the shortest way between two nodes of a floor (pure) */
export function pathOn(floor, from, to) {
  const adj = {}; for (const e of EDGES[floor]) { const [a, b] = e.split('-'); (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); }
  const prev = { [from]: null }, q = [from];
  while (q.length) { const n = q.shift(); if (n === to) break; for (const m of adj[n] || []) if (!(m in prev)) { prev[m] = n; q.push(m); } }
  if (!(to in prev)) return null;
  const out = []; for (let n = to; n != null; n = prev[n]) out.unshift(n); return out;
}
const nearest = (floor, x, z) => Object.entries(NODES[floor]).reduce((b, [k, [nx, nz]]) => { const d = Math.hypot(nx - x, nz - z); return !b || d < b.d ? { k, d } : b; }, null).k;

export function installHina(ext, G) {
  let ctx = null, H = null, walk = null, hit = null, live = 0, said = {};
  const done = (id) => ctx.state.tasks.includes(id);
  ext.on('game:start', () => { live = performance.now(); walk = null; });
  function place(key) {
    const p = HINA[key]; if (!p) { H.root.visible = false; G.hinaAt = null; return; }
    const [x, z, floor, [tx, tz], pose, dy] = p;
    H.noteMove && H.noteMove();   // a cut, not a walk (a resumed game, a test scene, the ladder)
    H.root.visible = true; H.root.position.set(x, ctx.world.floorY(floor) + (dy || 0), z); H.root.rotation.y = Math.atan2(tx - x, tz - z);
    H.root.rotation.x = 0;   // the lean pose itself puts her back on the wall (a tilted root put her head into it)
    H.root.userData.perch = !!dy;   // on the pump-room desk out of the water: meant (js/kit/npc-audit.js); she steps down before she walks
    H.set(pose); G.hinaAt = key; G.hinaFloor = floor; walk = null;
  }
  G.placeHina = place;
  G.hinaGraph = { HINA, NODES, EDGES, nearest };   // tools/play/hina-check.mjs walks every spot and corridor through ctx.npcAudit
  G.hinaGo = (key) => {
    if (!H || G.hinaAt === key || (walk && walk.key === key)) return;
    const p = HINA[key];
    const settled = performance.now() - live > 3000 && ctx.state.started && !ctx.testScene;
    if (!p || !G.hinaAt || !settled || G.hinaFloor !== p[2] || !H.root.visible) { place(key); return; }
    const f = p[2], r = H.root.position, a = nearest(f, r.x, r.z), b = nearest(f, p[0], p[1]);
    const nodes = pathOn(f, a, b); if (!nodes) { place(key); return; }
    const pts = [...nodes.map((n) => ({ x: NODES[f][n][0], z: NODES[f][n][1], door: DOORS[n] })), { x: p[0], z: p[1] }];
    // 1.3.0 (2nd play test #11 「日向が机の上に登って、その後空中を歩きます」): from the desk she steps down first (a point beside it), and the
    // walk keeps her feet on the floor (step() lowers her to it); before, she walked off at desk height
    const fy = ctx.world.floorY(f);
    if (r.y > fy + 0.05) { const n0 = pts[0], d0 = Math.hypot(n0.x - r.x, n0.z - r.z) || 1; pts.unshift({ x: r.x + ((n0.x - r.x) / d0) * 0.7, z: r.z + ((n0.z - r.z) / d0) * 0.7, down: true }); H.set('crouch'); }
    walk = { key, pts, i: 0, speed: f === 0 ? 0.95 : 1.15, fy };   // in the basement she limps (the ankle)
    G.hinaAt = null; H.root.rotation.x = 0; if (!(pts[0] && pts[0].down)) H.set('walk');
    const line = GOING[key] && (ctx.data.talk[GOING[key]] || [])[0];
    if (line && !said[key]) { said[key] = true; if (line.voice && ctx.voiceLine) ctx.voiceLine(line.voice, null, { prio: 'hint' }); ctx.ui.say(`<span class="who">ひなた</span>${line.text}`, 5); }   // 1.3.0 (#3): one voice at a time (js/kit/voice-queue.js)
  };
  function step(dt) {
    if (!walk) return;
    const P = walk.pts[walk.i], r = H.root.position, dx = P.x - r.x, dz = P.z - r.z, d = Math.hypot(dx, dz);
    if (P.door && d < 1.3) { const D = ctx.world.doors.get(P.door); if (D && !D.isOpen && !(D.locked && D.locked())) D.open(); }
    if (r.y > walk.fy) { r.y = Math.max(walk.fy, r.y - dt * 1.5); if (r.y <= walk.fy) { H.root.userData.perch = false; H.set('walk'); } }   // down off the desk, onto the floor
    if (d < 0.08) { walk.i++; if (walk.i >= walk.pts.length) { const k = walk.key; walk = null; place(k); } return; }
    const v = Math.min(d, walk.speed * dt); r.x += (dx / d) * v; r.z += (dz / d) * v;
    const yaw = Math.atan2(dx, dz); let dy = yaw - H.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); H.root.rotation.y += dy * Math.min(1, dt * 6);
  }
  // [E] on her: her task, or a line for this moment
  const taskHere = () => ctx.data.tasks.find((t) => (t.station === 'S_HINA1' || t.station === 'S_HINA2') && !done(t.id) && ctx.canStart(t) === true);
  function waitKey() {
    const k = G.hinaAt; if (!k) return null;
    if (k === 'pump') return !done('T_GEN') ? 'hw_pump_gen' : !done('T_JAR') ? 'hw_pump' : 'hw_pump_after';
    return `hw_${k}`;
  }
  const turns = {};
  ext.registerInteract('hina', {
    prompt: () => { if (walk) return 'ひなた（歩いている）'; const t = taskHere(); return t ? `[E] ${t.title}` : '[E] ひなたと話す'; },
    run: () => {
      if (walk) return;
      const t = taskHere(); if (t) { ctx.startTask(t.id); return; }
      const k = waitKey(), L = (k && ctx.data.talk[k]) || []; if (!L.length) return;
      const n = turns[k] = ((turns[k] ?? -1) + 1) % L.length;
      ctx.talk([L[n]], { title: 'ひなた' });
    },
  });
  ext.on('game:ready', (c) => {
    ctx = c; H = G.hina;
    // the plan's ひなた stations are not [E] targets any more: her own box follows her
    for (const id of ['S_HINA1', 'S_HINA2']) { const m = ctx.world.interactables.find((o) => o.name === `station:${id}`); if (m) { const i = ctx.world.interactables.indexOf(m); ctx.world.interactables.splice(i, 1); m.visible = false; } }
    hit = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.5, 0.7), new THREE.MeshBasicMaterial({ visible: false }));
    hit.name = 'hina:hit'; hit.userData.interact = { kind: 'hina', id: 'hinata' }; ctx.world.group.add(hit); ctx.world.interactables.push(hit);
    ctx.systems.push({ id: 'mn-hina', def: { update: (dt, c2, active) => {
      if (!H) return;
      if (active) step(dt);
      const on = H.root.visible && G.hinaFloor === ctx.floor;
      const i = ctx.world.interactables.indexOf(hit);
      if (on && i < 0) ctx.world.interactables.push(hit); if (!on && i >= 0) ctx.world.interactables.splice(i, 1);
      if (on) { hit.position.set(H.root.position.x, H.root.position.y + 0.8, H.root.position.z); hit.updateMatrixWorld(); }
    } }, inst: null });
  });
}
