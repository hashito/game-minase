// あれ in the passage: she moves along the middle of the passage (one line from the specimen room to the watertight door, data/water.json
// "route"), so where she is is one number, s (metres from the tank). She comes toward the player's s through the water; a drained valve
// (water.js) between her and the player stops her at the edge of the dry band (the water seeps back while she presses), and so does a shut
// watertight door. Modes:
//   off     - not there
//   gate    - the first sight (L3): she comes up to the second watertight door from the flooded far side and sinks back when it drains (safe)
//   lesson  - the valve lesson (L3): she comes from the far end; a drained valve stops her (safe: she never kills here)
//   peek    - a glimpse at the end of a passage (the way in)
//   cross   - 1.5.0 (3rd play test #1): she wades across the far end with a broken gait, stops, turns to you, twitches and is dragged under
//   chase, dir -1 - 1.5.0 (#18): once in P3 she goes under and comes up AHEAD of you, wading back toward you (a splash ahead warns
//             first); a valve between you and her stops her from that side too
//   chase   - the jar is in your hand (L4): she hunts you back to the watertight door. Catch = death (back to the last checkpoint)
// She is much slower under the low pipes, but now and then she lunges forward through the water. A locker on its raised step takes your
// feet out of the water: she loses you and falls back.
import * as THREE from 'three';
import { buildChimera } from './people.js';

// 1.2.0 (#24 「敵の動きが早すぎる」): 2.5 m/s (you run 3.8), and only 2.0 for the first 15 s of the chase (time to understand what is behind you)
export const SPEED = { walk: 2.5, start: 2.0, lesson: 1.3, gate: 1.3 };
export function installChimera(ext, G) {
  let ctx = null, fig = null, route = [], cum = [], glow = null;
  const H = G.gh = { mode: 'off', s: 0, wait: 0, lunge: 6, hiddenT: 0, rise: 0, fade: 0, shown: false, onCatch: null, onStop: null };
  const v2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  /** the nearest point of the route to (x, z): { s, d } */
  function project(x, z) {
    let best = { s: 0, d: Infinity };
    for (let i = 0; i < route.length - 1; i++) {
      const [ax, az] = route[i], [bx, bz] = route[i + 1], L = cum[i + 1] - cum[i];
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (L * L || 1)));
      const px = ax + (bx - ax) * t, pz = az + (bz - az) * t, d = Math.hypot(x - px, z - pz);
      if (d < best.d) best = { s: cum[i] + t * L, d };
    }
    return best;
  }
  function at(s) {
    s = Math.max(0, Math.min(cum[cum.length - 1], s));
    let i = 0; while (i < cum.length - 2 && cum[i + 1] < s) i++;
    const t = (s - cum[i]) / (cum[i + 1] - cum[i] || 1), [ax, az] = route[i], [bx, bz] = route[i + 1];
    return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, yaw: Math.atan2(bx - ax, bz - az) };
  }
  G.project = (x, z) => project(x, z);
  G.routeAt = (s) => at(s);
  // how fast she can go at s: the low pipes (P2) hold her back
  const slowAt = (s) => { const p = at(s), r = ctx.world.roomAt(p.x, p.z); return r === 'P2' ? 0.3 : 1; };   // 0.9 m/s: a little slower than you crouching (1.1)
  /** the dry bands and shut doors between her and the player (their s), nearest first */
  function blockers(from, to) {
    const out = [];
    for (const P of G.posts.values()) if (P.on) { const s = P.s ?? (P.s = project(P.def.x, P.def.z).s); if (s > from - 0.05 && s < to) out.push({ s: s - 1.4, P }); }
    if (G.gateShut && G.gateShut()) { const s = G.gateS; if (s > from - 0.05 && s < to) out.push({ s, gate: true }); }
    if (G.mouthShut && G.mouthShut()) { const s = G.mouthS; if (s > from - 0.05 && s < to + 1) out.push({ s, door: true }); }
    // 1.5.0 (3rd play test #9 「キメラが扉を貫通」): every other shut door on her way stops her too; in the chase she bangs on it and
    // forces it open after a while (story doors D_P1 / D_GATE above have their own rule)
    for (const R of routeDoors) if (!R.d.isOpen && R.s > from - 0.05 && R.s < to + 0.6) out.push({ s: R.s - 0.5, shut: R });
    return out.sort((a, b) => a.s - b.s);
  }
  /** for dir -1 (she comes from ahead): the dry bands between the player and her, nearest to her first */
  function blockersAhead(from, to) {
    const out = [];
    for (const P of G.posts.values()) if (P.on) { const s = P.s ?? (P.s = project(P.def.x, P.def.z).s); if (s > to && s < from + 0.05) out.push({ s: s + 1.4, P }); }
    return out.sort((a, b) => b.s - a.s);
  }
  let routeDoors = [];
  G.ghostStart = (mode, s, o = {}) => { H.dir = 1; H.ct = 0; H.bang = 0; H.anim = null; H.aheadDone = false; H.mode = mode; H.s = s; H.wait = o.wait || 0; H.lunge = 9; H.t = 0; H.pressT = 0; H.sunk = 0; H.sinkAnim = 0; H.hiddenT = 0; H.rise = o.rise || 0; H.fade = 0; H.speed = o.speed; H.onStop = o.onStop || null; H.onCatch = o.onCatch || null; H.stopAt = o.stopAt ?? null; };
  G.ghostStop = () => { H.mode = 'off'; H.sunk = 0; H.sinkAnim = 0; if (fig) fig.root.visible = false; if (glow) glow.intensity = 0; for (const P of G.posts.values()) P.press = false; };
  G.ghostFade = () => { H.fade = 0.0001; };
  // she goes under (the figure sinks for 1 s, then nothing) and comes back up at s = back after sec seconds
  function sinkFor(sec, back) { H.fade = 0; H.sinkAnim = 1; H.sunk = sec + 1; H.back = back; for (const P of G.posts.values()) P.press = false; ctx.sound('noise', 'splash'); }
  G.ghostSink = sinkFor;
  // 1.2.0 (#21 「最初の止水弁しか効かない」): a valve turned while she is in its band or just past it (up to 5 m on your side) drains the
  // water under her: she goes down and comes back up behind the band. Further past it the dry band is behind her; story.js says so.
  ext.on('minase:valve', ({ id }) => {
    if (H.mode !== 'chase' || H.sunk > 0) return;
    const P = G.posts.get(id); if (!P) return;
    const vs = P.s ?? (P.s = project(P.def.x, P.def.z).s);
    const cam = ctx.camera.position, ps = project(cam.x, cam.z).s;
    if (H.s > vs - 1.6 && H.s < vs + 5 && ps > H.s) { sinkFor(4, vs - 5); ext.emit('minase:ghost-sank', { id, on: true }); }
    else if (H.s >= vs + 5) ext.emit('minase:valve-behind', { id });
  });

  let T = 0;
  function update(dt, active) {
    if (!fig) return;
    T += dt;
    for (const P of G.posts.values()) P.press = false;
    if (H.mode === 'off' || ctx.floor !== 0) { fig.root.visible = false; glow.intensity = 0; return; }
    if (!active) return;
    const cam = ctx.camera.position, me = project(cam.x, cam.z), ps = me.s;
    const vis = H.wait <= 0;
    if (H.wait > 0) { H.wait -= dt; }
    // sinking away (drained, the lesson over, lost you)
    if (H.fade > 0) { H.fade += dt; if (H.fade > 1.4) { const m = H.mode; G.ghostStop(); ext.emit('minase:ghost-gone', { mode: m }); return; } }
    if (H.sunk > 0) {   // under the water after a dry band or a valve turned on her: nothing to see, she comes back up at H.back
      H.sunk -= dt;
      if (H.sinkAnim > 0) { H.sinkAnim -= dt; const q = at(H.s); fig.root.visible = true; fig.root.position.set(q.x, ctx.world.floorY(0) + 0.15 - (1 - H.sinkAnim) * 1.8, q.z); glow.position.set(q.x, ctx.world.floorY(0) + 1.0, q.z); glow.intensity = 2.4 * H.sinkAnim; for (const a of fig.arms) a.rotation.x += (-1.6 - a.rotation.x) * Math.min(1, dt * 4); }
      else { fig.root.visible = false; glow.intensity = 0; }
      if (H.sunk <= 0) { H.s = Math.max(0, H.back); H.rise = 1.2; ctx.sound('noise', 'splash'); }
      return;
    }
    if (H.mode === 'cross') { crossStep(dt, cam); return; }
    if (H.dir === -1 && H.mode === 'chase') { aheadStep(dt, ps); if (H.wait <= 0) placeFig(dt, ps); else { fig.root.visible = false; glow.intensity = 0; } return; }
    if (H.rise > 0) { H.rise -= dt; }
    else if (H.wait <= 0 && H.fade <= 0) {
      const chase = H.mode === 'chase';
      if (chase && ctx.hidden) {   // in a locker on its step: the feet are out of the water, she cannot find you; she drifts back and goes away for a while
        H.hiddenT += dt; H.s = Math.max(0, H.s - dt * 0.6);
        if (H.hiddenT > 5) { H.wait = 7; H.s = Math.max(0, ps - 28); H.hiddenT = 0; ext.emit('minase:ghost-lost', {}); }
      } else {
        H.hiddenT = 0; H.t = (H.t || 0) + dt;
        const bl = blockers(H.s, ps), stop = bl.length ? bl[0].s - 0.5 : H.stopAt != null ? H.stopAt : ps - 0.2;
        const walk = H.speed != null ? H.speed : chase && H.t < 15 ? SPEED.start : SPEED.walk;
        const base = walk * (ctx.calm ? 0.8 : 1) * (chase ? slowAt(H.s) : 1);
        H.s = Math.min(Math.max(H.s, stop), H.s + base * dt);
        if (bl.length && H.s >= bl[0].s - 0.55) { if (bl[0].P) bl[0].P.press = true; if (!H.pressing) { H.pressing = true; H.pressT = 0; ext.emit('minase:ghost-press', { id: bl[0].P ? bl[0].P.def.id : bl[0].gate ? 'gate' : 'door' }); } } else H.pressing = false;
        // 1.2.0 (#21, #23 「止水弁で足止めしても敵が消えずに」): held at a dry band she claws at it for 3.5 s, then sinks under; she comes back
        // up 6 m behind the band 6 s later (the water still seeps back while she is under). Stopped is now visibly "gone for now".
        if (chase && H.pressing && bl[0].P) { H.pressT += dt; if (H.pressT > 3.5) { H.pressing = false; sinkFor(6, bl[0].s - 6); ext.emit('minase:ghost-sank', { id: bl[0].P.def.id }); } }
        if (bl.length && (bl[0].gate || bl[0].door) && H.s >= bl[0].s - 0.55 && H.onStop) { const f = H.onStop; H.onStop = null; f(bl[0]); }
        // a shut door: she bangs on it (you hear where), then breaks it open (2.6 s in the chase; elsewhere she waits)
        if (bl.length && bl[0].shut && H.s >= bl[0].s - 0.55) {
          const R = bl[0].shut; H.bang = (H.bang || 0) + dt; H.knock = (H.knock || 0) - dt;
          if (H.knock <= 0) { H.knock = 0.55; ctx.sound('noise', 'knock', { pos: { x: R.x, y: 1.3, z: R.z }, n: 1 }); ext.emit('minase:door-bang', { id: R.d.def.id }); }
          if (chase && H.bang > 2.6) { H.bang = 0; R.d.open(); ctx.sound('noise', 'thud'); ctx.sound('creak'); ext.emit('minase:door-forced', { id: R.d.def.id }); }
        } else H.bang = 0;
        // 1.5.0 (#18 「ダッシュで簡単に逃げられる」): in P3 she goes under and comes up ahead of you, once per run back; the water ahead
        // splashes 2 s before (the warning), and the next valve lies between you and her (the answer)
        if (chase && !H.aheadDone && G.aheadAt && ps > G.aheadAt[0] && ps < G.aheadAt[1] && ps - H.s > 5) { H.aheadDone = true; goAhead(ps); return; }
        // the lunge: she surges forward through the water when nothing stands between (never across a dry band)
        if (chase) {
          H.lunge -= dt;
          const gap = ps - H.s;
          if (H.lunge <= 0 && gap > 6 && !bl.length && slowAt(H.s) > 0.5 && H.t > 15) { H.s = Math.min(ps - 4, H.s + (gap > 25 ? 6 : ctx.calm ? 1.5 : 2.5)); H.lunge = (ctx.calm ? 13 : 9) + Math.random() * 3; ctx.sound('glitch'); ctx.sound('noise', 'splash'); }
          // her presence when she is out of sight: wading behind you, louder as she comes (#21 「逃げすぎるとよくわからない」)
          H.wade = (H.wade || 0) - dt;
          if (H.wade <= 0 && gap < 45) { const q = at(H.s); ctx.audio && ctx.audio.noise && ctx.audio.noise('splash', { pos: { x: q.x, y: 0.3, z: q.z }, n: 1 }); H.wade = gap < 10 ? 0.9 : gap < 25 ? 1.5 : 2.4; }
        }
        if (ps - H.s < 1.1 && !bl.length && ctx.floor === 0) { const f = H.onCatch; if (f) f(); }
      }
    }
    placeFig(dt, ps);
  }
  function placeFig(dt, ps) {
    const vis = H.wait <= 0;
    // the figure (her hips under the water line; rising out of the tank, she comes up from below)
    const p = at(H.s);
    fig.root.visible = vis;
    glow.position.set(p.x, ctx.world.floorY(0) + 1.3, p.z); glow.intensity = vis ? (H.fade > 0 ? Math.max(0, 1 - H.fade / 1.4) : 1) * (5.0 + Math.sin(T * 7) * 0.8) : 0;
    const sink = H.fade > 0 ? H.fade * H.fade * 1.3 + (Math.sin(T * 31) > 0.6 ? 0.05 : 0) : 0, up = H.rise > 0 ? Math.max(0, H.rise - 0.4) * 0.9 : 0;
    fig.root.position.set(p.x, ctx.world.floorY(0) + 0.15 - sink - up + Math.sin(T * 1.3) * 0.03, p.z);
    fig.root.rotation.y = p.yaw + (H.dir === -1 ? Math.PI : 0);
    fig.body.rotation.z = Math.sin(T * 2.4) * 0.06; fig.head.rotation.z = 0.35 + Math.sin(T * 0.9) * 0.12;
    for (const [i, s] of fig.strands.entries()) s.rotation.x = Math.sin(T * 1.7 + i) * 0.06;
    const near = Math.abs(ps - H.s);
    for (const [i, a] of fig.arms.entries()) { const want = (near < 4 ? -1.3 : -0.25) + Math.sin(T * 3 + i * 1.7) * 0.25; a.rotation.x += (want - a.rotation.x) * Math.min(1, dt * 3); }
    const op = H.fade > 0 ? Math.max(0, 1 - H.fade / 1.4) : 1;
    for (const s of fig.mist) s.material.opacity = 0.25 * op;
    // 1.5.0 (#1): no flicker-out any more; she sinks under the surface (sink above)
    // dread on the screen
    if (vis && near < 16) {
      const k = Math.max(0, Math.min(1, 1 - near / 16));
      const prev = ctx.fxState || {};
      ctx.fxState = { ...prev, danger: Math.max(prev.danger || 0, k * (H.mode === 'chase' ? 0.65 : 0.45)), mist: Math.max(prev.mist || 0, k * 0.3) };
    }
    // the emergency lights she passes go out (the way back gets darker behind you)
    if (H.mode === 'chase') for (const [id, e] of Object.entries(G.lampEntry || {})) if (e.i > 0 && G.lampS && Math.abs(G.lampS[id] - H.s) < 1.0) { G.lampOut(id); }
  }

  // ---- 1.5.0 (#18): she comes up ahead of you ----
  function goAhead(ps) {
    const s = Math.min(G.routeLen - 2, Math.max(ps + 8, (G.aheadValveS || 0) + 3.5)), q = at(s);
    H.sunk = 0; H.sinkAnim = 0; fig.root.visible = false; glow.intensity = 0;
    H.wait = 2.0; H.dir = -1; H.s = s; H.pressT = 0; H.pressing = false;
    ctx.audio && ctx.audio.noise && ctx.audio.noise('splash', { pos: { x: q.x, y: 0.3, z: q.z }, n: 3 });
    ext.emit('minase:ghost-ahead', { s });
  }
  function aheadStep(dt, ps) {
    if (H.wait > 0) { H.wait -= dt; if (H.wait <= 0) { ctx.sound('noise', 'splash'); ctx.sound('stinger'); } return; }
    const bl = blockersAhead(H.s, ps), stop = bl.length ? bl[0].s + 0.5 : ps + 0.2;
    H.s = Math.max(Math.min(H.s, stop), H.s - 1.7 * (ctx.calm ? 0.8 : 1) * dt);
    if (bl.length && H.s <= bl[0].s + 0.55) {
      bl[0].P.press = true; H.pressT += dt;
      if (!H.pressing) { H.pressing = true; ext.emit('minase:ghost-press', { id: bl[0].P.def.id }); }
      if (H.pressT > 3.0) { H.pressing = false; H.dir = 1; sinkFor(6, Math.max(0, ps - 18)); ext.emit('minase:ghost-sank', { id: bl[0].P.def.id }); }
    } else H.pressing = false;
    if (ctx.hidden) { H.dir = 1; H.wait = 6; H.s = Math.max(0, ps - 26); ext.emit('minase:ghost-lost', {}); return; }
    // you got past her (ran by while she was still under): she goes down again and comes back up behind you, as in the chase before.
    // A catch is only her at you (before: any player beyond her counted as caught, wherever she was)
    if (ps > H.s + 1.1) { H.pressing = false; H.dir = 1; sinkFor(5, Math.max(0, ps - 12)); return; }
    if (Math.abs(H.s - ps) < 1.1 && !bl.length && ctx.floor === 0) { const f = H.onCatch; if (f) f(); }
  }
  // ---- 1.5.0 (#1): the crossing at the far end of P2 ----
  // a broken wade (she lurches in steps, a shoulder dropping), a stop, her head (the whole body in the dot version) turned to you, a
  // twitch, and a drag down under the water with the arms up. No fade: she goes under the surface.
  // she comes out of the knee water of P3 into the dry end of P2 (in view from the low passage), stops, turns, and is yanked back into the water
  const CROSS = { from: [-17.3, -44.2], to: [-17.95, -41.75], walk: 2.6, stop: 4.0, twitch: 4.5, pull: 5.3 };
  function crossStep(dt, cam) {
    H.ct += dt; const t = H.ct, C = CROSS, y0 = ctx.world.floorY(0) + 0.15;
    fig.root.visible = true;
    let k = Math.min(1, t / C.walk);
    k = Math.min(1, Math.floor(k * 5) / 5 + Math.pow((k * 5) % 1, 3) / 5);   // five lurches, each one a jerk at the end
    let x = C.from[0] + (C.to[0] - C.from[0]) * k, z = C.from[1] + (C.to[1] - C.from[1]) * k;
    let y = y0 - Math.abs(Math.sin(t * 6.5)) * 0.12;
    const face = Math.atan2(cam.x - x, cam.z - z), along = Math.atan2(C.to[0] - C.from[0], C.to[1] - C.from[1]);
    let yaw = along, roll = Math.sin(t * 6.5) * 0.18;
    H.anim = 'walk';
    if (t > C.walk) { H.anim = 'idle'; roll = 0.12; const q = Math.min(1, (t - C.walk) / 0.5); yaw = along + (face - along) * q * q; if (!H.turned) { H.turned = true; ctx.sound('noise', 'tap', { pos: { x, y: 1.4, z } }); } }
    if (t > C.stop) { yaw = face + Math.sin(t * 40) * 0.12; roll = Math.sin(t * 37) * 0.25; H.anim = 'attack'; }
    if (t > C.twitch) {
      H.anim = 'fear'; const q = Math.min(1, (t - C.twitch) / (C.pull - C.twitch)), qq = q * q;
      x = C.to[0] + (C.from[0] - C.to[0]) * qq; z = C.to[1] + (C.from[1] - C.to[1]) * qq;   // yanked backwards, feet first, into the water
      y = y0 - qq * 1.6 - (Math.sin(t * 30) > 0 ? 0.06 : 0); roll = Math.sin(t * 25) * 0.3;
      if (!H.pulled) { H.pulled = true; ctx.audio && ctx.audio.noise && ctx.audio.noise('splash', { pos: { x, y: 0.3, z }, n: 2 }); }
    }
    fig.root.position.set(x, y, z); fig.root.rotation.set(0, yaw, 0); fig.body.rotation.z = roll;
    glow.position.set(x, y0 + 1.0, z); glow.intensity = t > C.twitch ? 3 * Math.max(0, 1 - (t - C.twitch) / 0.9) : 3.5;
    for (const a of fig.arms) a.rotation.x += ((t > C.twitch ? -2.6 : -0.4) - a.rotation.x) * Math.min(1, dt * 5);
    if (t > C.pull) { H.turned = H.pulled = false; G.ghostStop(); ext.emit('minase:ghost-gone', { mode: 'cross' }); }
  }

  ext.on('game:ready', (c) => {
    ctx = c;
    route = [[6.9, -104], ...ctx.data.water.route];
    cum = [0]; for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + v2(route[i - 1], route[i]));
    G.routeLen = cum[cum.length - 1];
    G.gateS = project(-4, -81.8).s;
    G.mouthS = project(2.6, -1.2).s;
    G.aheadAt = [project(-17.6, -72).s, project(-17.6, -64).s];
    G.aheadValveS = project(-17.6, -60).s;   // K_P3B: she always comes up beyond it, so it lies between you and her (the answer)
    routeDoors = [];
    for (const d of ctx.data.plan.doors || []) {
      if (d.id === 'D_P1' || d.id === 'D_GATE' || (d.floor || 0) !== 0 || d.open) continue;
      const pr = project(d.x, d.z), D = ctx.world.doors.get(d.id);
      if (D && pr.d < 1.2) routeDoors.push({ d: D, s: pr.s, x: d.x, z: d.z });
    }
    G.routeDoors = routeDoors;
    glow = new THREE.PointLight(0xc2c48a, 0, 12, 1.3); ctx.scene.add(glow);   // 1.2.0 (#20): she lights the water round her, so you see her coming
    fig = buildChimera(); fig.root.visible = false; ctx.world.group.add(fig.root); G.chimera = fig;
    // warm-up: her materials compiled before play
    const warm = new THREE.Group(); warm.visible = false; warm.add(buildChimera().root); ctx.scene.add(warm); ctx.warmObjects = [...(ctx.warmObjects || []), warm];
    ctx.systems.push({ id: 'minase-chimera', def: { update: (dt, c2, active) => update(dt, active) }, inst: null });
  });
}
