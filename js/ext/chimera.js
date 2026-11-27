// あれ in the passage: she moves along the middle of the passage (one line from the specimen room to the watertight door, data/water.json
// "route"), so where she is is one number, s (metres from the tank). She comes toward the player's s through the water; a drained valve
// (water.js) between her and the player stops her at the edge of the dry band (the water seeps back while she presses), and so does a shut
// watertight door. Modes:
//   off     - not there
//   gate    - the first sight (L3): she comes up to the second watertight door from the flooded far side and sinks back when it drains (safe)
//   lesson  - the valve lesson (L3): she comes from the far end; a drained valve stops her (safe: she never kills here)
//   peek    - a glimpse at the end of a passage (the way in)
//   cross   - 1.7.0 (5th #6): at the far end of P2 with her back to you; she turns, twitches and lurches away out of the frame (10 m off)
//   chase, dir -1 - 1.5.0 (#18): once in P3 she goes under and comes up AHEAD of you, wading back toward you (a splash ahead warns
//             first); a valve between you and her stops her from that side too
//   chase   - the jar is in your hand (L4): she hunts you back to the watertight door. Catch = death (back to the last checkpoint)
// She is much slower under the low pipes, but now and then she lunges forward through the water. A locker on its raised step takes your
// feet out of the water: she loses you and falls back.
import * as THREE from 'three';
import { buildChimera } from './people.js';

// 1.2.0 (#24 「敵の動きが早すぎる」): 2.5 m/s (you run 3.8), and only 2.0 for the first 15 s of the chase (time to understand what is behind you)
export const SPEED = { walk: 2.5, start: 2.0, lesson: 1.3, gate: 1.3 };
/** 1.8.0 (#5): where she follows you into the low passage P2 - you past x, she more than gap m behind: she comes up behind m behind you */
export const CRAWL_IN = { x: -13, gap: 9, behind: 7 };
export function installChimera(ext, G) {
  let ctx = null, fig = null, route = [], cum = [], glow = null, key = null;
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
  G.CRAWL_POSE = { down: 0, pitch: 0.25, head: -0.4, arm: -1.3, squash: 0.55 };   // 1.8.0 (#5): the photo version crawls low - squashed to 55 % (under the 1.2 m ceiling), hunched, head and arms forward (tipping from the hips sank the trunk under the water)
  G.routeAt = (s) => at(s);
  // how fast she can go at s: the low pipes (P2) hold her back
  const slowAt = (s) => { const p = at(s), r = ctx.world.roomAt(p.x, p.z); return r === 'P2' ? 0.3 : 1; };   // 0.9 m/s: a little slower than you crouching (1.1)
  /** the dry bands and shut doors between her and the player (their s), nearest first */
  const DOOR_GAP = 0.8;
  function blockers(from, to) {
    const out = [];
    for (const P of G.posts.values()) if (P.on) { const s = P.s ?? (P.s = project(P.def.x, P.def.z).s); if (s > from - 0.05 && s < to) out.push({ s: s - 1.4, P }); }
    // 1.6.0 (4th play test #6 「二枚目の防水扉のところでモンスターが扉を少し貫通しているように見えます」): her stop is 1.3 m short of a shut door's
    // plane (it was 0.5 m: her reaching arms and the jars on her back went through the slab); check-playtest P61 / third.mjs #6b measure it
    if (G.gateShut && G.gateShut()) { const s = G.gateS; if (s > from - 0.05 && s < to) out.push({ s: s - DOOR_GAP, gate: true }); }
    if (G.mouthShut && G.mouthShut()) { const s = G.mouthS; if (s > from - 0.05 && s < to + 1) out.push({ s: s - DOOR_GAP, door: true }); }
    // 1.5.0 (3rd play test #9 「キメラが扉を貫通」): every other shut door on her way stops her too; in the chase she bangs on it and
    // forces it open after a while (story doors D_P1 / D_GATE above have their own rule)
    for (const R of routeDoors) if (!R.d.isOpen && R.s > from - 0.05 && R.s < to + 0.6) out.push({ s: R.s - DOOR_GAP, shut: R });
    return out.sort((a, b) => a.s - b.s);
  }
  /** for dir -1 (she comes from ahead): the dry bands between the player and her, nearest to her first */
  function blockersAhead(from, to) {
    const out = [];
    for (const P of G.posts.values()) if (P.on) { const s = P.s ?? (P.s = project(P.def.x, P.def.z).s); if (s > to && s < from + 0.05) out.push({ s: s + 1.4, P }); }
    return out.sort((a, b) => b.s - a.s);
  }
  let routeDoors = [];
  // 1.5.2 (main's check 2026-11-23 「遠くでは白い塊、近くでは暗い通路に溶ける」): how she is lit. Before, one warm light inside her (5, 12 m)
  // and a pale self glow made a flat white shape far off and lit the corridor round her as much as her. Now: a cold rim light 1.1 m
  // behind her (away from you) and high, which lights the wall behind her and the edges of her shoulders and head (a dark shape on a lit
  // patch: the silhouette reads at 8-15 m), and a teal key from the water 0.8 m in front of her, low, flickering like light off ripples,
  // which lights her front from below (the stitches, the jars, the face on top read near). Nothing else is lit by her.
  // k: 0 off .. 1 normal (more for a flare); x / z: where she stands
  function lit(k, x, z) {
    if (!glow) return;
    if (!(k > 0) || x == null) { glow.intensity = 0; key.intensity = 0; return; }
    const cam = ctx.camera.position, y0 = ctx.world.floorY(0);
    let dx = x - cam.x, dz = z - cam.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    glow.position.set(x + dx * 1.1, y0 + 2.0, z + dz * 1.1); glow.intensity = k * 9;
    const ripple = 0.75 + 0.25 * Math.sin(T * 3.1) * Math.sin(T * 1.7 + 1);
    // just above the water (P3's surface is 0.42 m); the dot version's darker figure takes twice the light
    key.position.set(x - dx * 0.8, y0 + 0.55, z - dz * 0.8); key.intensity = k * (ctx.pixelStyle ? 7 : 3.4) * ripple;
  }
  G.herLights = () => ({ rim: glow && { i: glow.intensity, d: glow.distance, p: glow.position.toArray() }, key: key && { i: key.intensity, d: key.distance, p: key.position.toArray() } });
  G.ghostStart = (mode, s, o = {}) => { H.dive = 0; H.diveThen = null; H.crawlIn = false; H.crawling = false; H.dir = 1; H.ct = 0; H.retreat = 0; H.lurched = false; H.bang = 0; H.anim = null; H.aheadDone = false; H.mode = mode; H.s = s; H.wait = o.wait || 0; H.lunge = 9; H.t = 0; H.pressT = 0; H.sunk = 0; H.sinkAnim = 0; H.hiddenT = 0; H.rise = o.rise || 0; H.fade = 0; H.speed = o.speed; H.onStop = o.onStop || null; H.onCatch = o.onCatch || null; H.stopAt = o.stopAt ?? null; };
  G.ghostStop = () => { H.mode = 'off'; H.dive = 0; H.diveThen = null; H.retreat = 0; H.sunk = 0; H.sinkAnim = 0; if (fig) fig.root.visible = false; if (glow) lit(0); for (const P of G.posts.values()) P.press = false; };
  G.ghostFade = () => diveOut(gone);
  // 1.8.0 (2026-11-27 /dot-fps #1 「最初にモンスターが出た時に後ろに戻っていくような動作をする場合があります。水の中に消えていく演出に」):
  // whenever she leaves a scene (the crossing, the window of the second door, the lesson, a peek, losing you in a locker, going ahead of
  // you) she goes down into the water where she stands: three jerks down with the arms clawing up, spray and rings on the surface at each,
  // her light going with her - and she is gone. She never walks or slides backward out of a scene (before: the crossing lurched away while
  // still turning, the lesson's retreat waded backward, and in a locker she drifted back along the passage at 0.6 m/s).
  const DIVE = 1.8;
  function gone() { const m = H.mode; G.ghostStop(); ext.emit('minase:ghost-gone', { mode: m }); }
  function diveOut(then) {
    if (H.mode === 'off' || H.dive > 0) return;
    H.dive = 0.0001; H.diveThen = then; H.diveStep = -1; H.retreat = 0; H.fade = 0; H.pressing = false;
    for (const P of G.posts.values()) P.press = false;
    ctx.sound('noise', 'splash');
  }
  G.ghostDive = diveOut;
  G.DIVE = DIVE;
  function diveStep(dt) {
    H.dive += dt; const t = H.dive, k = Math.min(1, t / DIVE), n = 3;
    const st = (Math.floor(k * n) + Math.pow((k * n) % 1, 3)) / n;   // a jerk, a hold: three times
    const q = H.diveAt || (H.diveAt = { ...fig.root.position });
    const y0 = ctx.world.floorY(0), wy = (G.waterYAt && G.waterYAt(q.x, q.z)) ?? y0 + 0.42;
    fig.root.visible = st < 0.999;
    fig.root.position.set(q.x, y0 + 0.15 - st * 2.1 + (Math.sin(T * 29) > 0.7 ? 0.03 : 0), q.z);
    fig.body.rotation.z = Math.sin(T * 23) * 0.2;
    for (const [i, a] of fig.arms.entries()) a.rotation.x += (-2.5 + Math.sin(T * 9 + i * 1.3) * 0.4 - a.rotation.x) * Math.min(1, dt * 7);
    for (const m of fig.mist) m.material.opacity = 0.25 * (1 - k);
    lit(Math.max(0, 0.9 * (1 - st)), q.x, q.z);
    H.anim = 'attack';
    const step = Math.floor(k * n);
    if (step !== H.diveStep && step < n) {
      H.diveStep = step;
      if (G.wake) for (let i = 0; i < 4; i++) G.wake(q.x + (Math.random() - 0.5) * 0.8, wy, q.z + (Math.random() - 0.5) * 0.8, true);
      ctx.audio && ctx.audio.noise && ctx.audio.noise('splash', { pos: { x: q.x, y: 0.3, z: q.z }, n: step === n - 1 ? 3 : 1, gain: 1.1 });
    }
    if (t > DIVE + 0.25) {
      if (G.wake) for (let i = 0; i < 3; i++) G.wake(q.x + (Math.random() - 0.5) * 0.4, wy, q.z + (Math.random() - 0.5) * 0.4, false);
      const f = H.diveThen; H.dive = 0; H.diveThen = null; H.diveAt = null; H.anim = null; fig.root.visible = false; lit(0);
      for (const m of fig.mist) m.material.opacity = 0.25;
      if (f) f();
    }
  }
  // she goes under (the figure sinks for 1 s, then nothing) and comes back up at s = back after sec seconds
  // 1.7.0 (5th play test #8 「止水弁にハマると少しずつ下に消えていく感じが良い」): caught by a valve she goes under step by step over
  // SINK s - six jerks down, the arms clawing up, the light going with her - not in one drop
  const SINK = 3.2;
  function sinkFor(sec, back) { H.fade = 0; H.sinkAnim = SINK; H.sunk = sec + SINK; H.back = back; for (const P of G.posts.values()) P.press = false; ctx.sound('noise', 'splash'); }
  // 1.7.0 (#8 「止水弁が切れると下に消えていく感じは良くない」): when the water of the valve comes back in the lesson she is free - she
  // bursts up, lurches at you, and wades back into the dark (out of the frame), not down through the floor
  G.ghostRetreat = () => { if (H.mode === 'off' || H.dive > 0) return; H.retreat = 0.0001; H.rise = 0.9; H.pressing = false; ctx.sound('noise', 'splash'); ctx.sound('stinger'); };
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

  // 1.5.2 (main's check 2026-11-23 「止水弁を回したあとの 3 秒が平坦」): one threat beat while she is held at a valve's dry band. 1 s into the
  // press she throws herself at the edge of the band: the body lurches 0.22 m toward you and back (she is held 0.5 m back, so it stays
  // short of the dry band: the band is 3.2 m, she stops 1.9 m from the valve's middle), the water bursts round her, something slams the pipes beside her three times, her rim light flares, the screen's dread
  // spikes, and in the chase her voice says 「……あけて……」 (she wants the valve opened: she is held, not through). In the lesson (the
  // press lasts until the water comes back) the beat comes again every 3.4 s, without the voice.
  const BEAT = { first: 1.0, again: 3.4, lurch: 0.55, reach: 0.22 };
  G.BEAT = BEAT;
  function pressBeat(dt) {
    H.beatT = (H.beatT || 0) + dt;
    if (H.nextBeat == null || H.beatT < H.nextBeat) return;
    H.nextBeat = H.mode === 'lesson' ? H.nextBeat + BEAT.again : Infinity;
    const q = at(H.s), y0 = ctx.world.floorY(0), wy = (G.waterYAt && G.waterYAt(q.x, q.z)) ?? y0 + 0.1;
    H.lurch = BEAT.lurch; H.flare = 0.9; H.beats = (H.beats || 0) + 1;
    if (ctx.audio && ctx.audio.noise) {
      ctx.audio.noise('splash', { pos: { x: q.x, y: 0.3, z: q.z }, n: 3, gain: 1.4 });
      ctx.audio.noise('knock', { pos: { x: q.x, y: 1.1, z: q.z }, n: 3, gap: 0.11, gain: 1.6 });
    }
    if (G.wake) for (let i = 0; i < 3; i++) G.wake(q.x + (Math.random() - 0.5) * 0.6, wy, q.z + (Math.random() - 0.5) * 0.6, true);
    ext.emit('minase:ghost-surge', { mode: H.mode, n: H.beats });
  }
  let T = 0;
  // 1.7.0 (5th play test #7 「アニメーションも滑らかにして脈打つ感じとか、動く感じを怖い感じに（こだわるべき）」): she is alive all
  // the time she is seen - the fused torsos breathe out of step, the sacs under the skin throb on a heartbeat (lub-dub, faster as she
  // nears you and in the chase), the veins flush with each beat, the whole body swells on the beat (the dot frames too: the root's
  // scale), and every 0.7-2.4 s a twitch runs through her (the trunk snaps, a head jerks, one arm spasms)
  const TW = { t: 1.2, k: 0, arm: 0, dir: 1 };
  let beatPh = 0;
  const heart = (ph) => Math.exp(-((ph - 0.04) ** 2) / 0.0025) + 0.6 * Math.exp(-((ph - 0.24) ** 2) / 0.0025);
  function pulse(dt) {
    const cam = ctx.camera.position, near = Math.hypot(cam.x - fig.root.position.x, cam.z - fig.root.position.z);
    const rate = (H.mode === 'chase' ? 1.7 : 1.1) + Math.max(0, 1 - near / 10) * 0.9;
    beatPh = (beatPh + dt * rate) % 1; const b = heart(beatPh);
    fig.pulsedAt = T;   // placeFig squashes the scale set here (the crawl), never a scale left from an earlier frame
    for (const q of fig.pulse || []) {
      if (q.beat) q.k.scale.copy(q.s).multiplyScalar(1 + q.amp * b);
      else { const v = Math.sin(T * 1.15 + q.ph); q.k.scale.set(q.s.x * (1 + q.amp * v), q.s.y * (1 - q.amp * 0.6 * v), q.s.z * (1 + q.amp * v)); }
    }
    if (fig.veinM) fig.veinM.emissiveIntensity = b * 1.4;
    if (fig.sacM) fig.sacM.emissiveIntensity = 0.5 + b * 1.2;
    const sc = 1.12 * (1 + 0.018 * b);
    fig.root.scale.set(sc * (1 + 0.006 * Math.sin(T * 1.15)), 1.12 * (1 + 0.012 * Math.sin(T * 1.15 + 1.2)) * (1 + 0.01 * b), sc);
    TW.t -= dt;
    if (TW.t <= 0) { TW.t = 0.7 + Math.random() * 1.7; TW.k = 1; TW.arm = Math.floor(Math.random() * fig.arms.length); TW.dir = Math.random() < 0.5 ? -1 : 1; }
    TW.k = Math.max(0, TW.k - dt * 5);
    const j = TW.k * TW.k;
    fig.body.rotation.x = 0.28 + j * 0.16 * TW.dir; fig.body.rotation.y = j * 0.22 * -TW.dir;
    fig.head.rotation.x = j * 0.5 * TW.dir;
    const A = fig.arms[TW.arm]; if (A) A.rotation.y = j * 0.9 * TW.dir;
  }
  /** the gait: uneven - a heave forward on the long arms, a hold while the short ones drag (mean 0.95 of the pace) */
  const gait = () => 0.55 + 1.05 * Math.pow(Math.abs(Math.sin(T * 2.6)), 3) + (Math.sin(T * 2.6) > 0 ? 0.05 : 0);
  function update(dt, active) {
    if (!fig) return;
    T += dt;
    if (fig.root.visible && active) pulse(dt);
    for (const P of G.posts.values()) P.press = false;
    if (H.mode === 'off' || ctx.floor !== 0) { fig.root.visible = false; lit(0); return; }
    if (!active) return;
    const cam = ctx.camera.position, me = project(cam.x, cam.z), ps = me.s;
    const vis = H.wait <= 0;
    if (H.wait > 0) { H.wait -= dt; }
    // sinking away (drained, the lesson over, lost you)
    if (H.fade > 0) { H.fade += dt; if (H.fade > 1.4) { const m = H.mode; G.ghostStop(); ext.emit('minase:ghost-gone', { mode: m }); return; } }
    if (H.dive > 0) { diveStep(dt); return; }
    if (H.sunk > 0) {   // under the water after a dry band or a valve turned on her: nothing to see, she comes back up at H.back
      H.sunk -= dt;
      if (H.sinkAnim > 0) {
        H.sinkAnim -= dt; const q = at(H.s), k = Math.min(1, 1 - H.sinkAnim / SINK), n = 6, st = (Math.floor(k * n) + Math.pow((k * n) % 1, 4)) / n;   // a jerk, a hold, a jerk
        fig.root.visible = true; fig.root.position.set(q.x, ctx.world.floorY(0) + 0.15 - st * 1.9 + (Math.sin(T * 29) > 0.7 ? 0.04 : 0), q.z);
        fig.root.rotation.y = q.yaw + Math.sin(T * 17) * 0.08; fig.body.rotation.z = Math.sin(T * 23) * 0.22;
        lit(Math.max(0, 0.8 * (1 - st)), q.x, q.z);
        for (const [i, a] of fig.arms.entries()) a.rotation.x += (-2.4 + Math.sin(T * 9 + i * 1.3) * 0.5 - a.rotation.x) * Math.min(1, dt * 6);
        if (Math.floor(k * n) !== H.sinkStep) { H.sinkStep = Math.floor(k * n); if (H.sinkStep < n && ctx.audio && ctx.audio.noise) ctx.audio.noise('splash', { pos: { x: q.x, y: 0.3, z: q.z }, n: 1, gain: 0.8 }); }
      }
      else { fig.root.visible = false; lit(0); }
      if (H.sunk <= 0) { H.s = Math.max(0, H.back); H.rise = 1.2; ctx.sound('noise', 'splash'); }
      return;
    }
    if (H.mode === 'cross') { crossStep(dt, cam); return; }
    if (H.retreat > 0) { retreatStep(dt, ps); return; }
    if (H.dir === -1 && H.mode === 'chase') { aheadStep(dt, ps); if (H.wait <= 0) placeFig(dt, ps); else { fig.root.visible = false; lit(0); } return; }
    if (H.rise > 0) { H.rise -= dt; }
    else if (H.wait <= 0 && H.fade <= 0) {
      const chase = H.mode === 'chase';
      if (chase && ctx.hidden) {   // in a locker on its step: the feet are out of the water, she cannot find you; she drifts back and goes away for a while
        // 1.8.0 (#1): she stays where she lost you, searching (no drifting back along the passage), then goes under the water there
        H.hiddenT += dt;
        if (H.hiddenT > 3.2) { H.hiddenT = 0; const back = Math.max(0, ps - 28); diveOut(() => { H.wait = 7; H.rise = 1.2; H.s = back; fig.root.visible = false; ext.emit('minase:ghost-lost', {}); }); return; }
      } else {
        H.hiddenT = 0; H.t = (H.t || 0) + dt;
        const bl = blockers(H.s, ps), stop = bl.length ? bl[0].s - 0.5 : H.stopAt != null ? H.stopAt : ps - 0.2;
        const walk = H.speed != null ? H.speed : chase && H.t < 15 ? SPEED.start : SPEED.walk;
        const base = walk * (ctx.calm ? 0.8 : 1) * (chase ? slowAt(H.s) : 1);
        H.s = Math.min(Math.max(H.s, stop), H.s + base * (chase ? gait() : 1) * dt);
        if (bl.length && H.s >= bl[0].s - 0.55) { if (bl[0].P) bl[0].P.press = true; if (!H.pressing) { H.pressing = true; H.pressT = 0; H.beatT = 0; H.nextBeat = BEAT.first; ext.emit('minase:ghost-press', { id: bl[0].P ? bl[0].P.def.id : bl[0].gate ? 'gate' : 'door' }); } } else H.pressing = false;
        if (H.pressing && bl[0].P) pressBeat(dt);
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
        if (chase && !H.aheadDone && G.aheadAt && ps > G.aheadAt[0] && ps < G.aheadAt[1] && ps - H.s > 5) {
          H.aheadDone = true;
          // 1.8.0: out of sight (more than 14 m back) she goes ahead at once, as before; in sight she first goes down where she is (#1).
          // You ran on during those 1.8 s: if that took you past the valve she would come up beyond, she comes up behind you instead -
          // never ahead with no valve between (the full play died 14 times there)
          if (ps - H.s > 14) { goAhead(ps); return; }
          diveOut(() => { const c2 = ctx.camera.position, now = project(c2.x, c2.z).s; if (G.aheadValveS && now > G.aheadValveS - 1.5) { H.dir = 1; H.wait = 1.5; H.rise = 1.2; H.s = Math.max(0, now - 14); } else goAhead(now); });
          return;
        }
        // 1.8.0 (2026-11-27 /dot-fps #5 「しゃがみ通路の途中で背後から追いかけてくるように」): partway into the low passage she comes in after
        // you - the water at its mouth behind you splashes and knocks (the warning), she comes up 7 m behind you and crawls after you under the
        // pipes at 0.9 m/s (slowAt P2 x0.3). You crawl at 1.1 m/s, so keep going and she never reaches you; stop and she does
        if (chase && !H.crawlIn && cam.x > CRAWL_IN.x && ctx.world.roomAt(cam.x, cam.z) === 'P2' && ps - H.s > CRAWL_IN.gap && !bl.length) {
          H.crawlIn = true; H.s = Math.max(H.s, ps - CRAWL_IN.behind); H.rise = 1.4; H.lunge = 12;
          const q = at(H.s); if (ctx.audio && ctx.audio.noise) { ctx.audio.noise('splash', { pos: { x: q.x, y: 0.3, z: q.z }, n: 3, gain: 1.5 }); ctx.audio.noise('knock', { pos: { x: q.x, y: 0.9, z: q.z }, n: 2, gap: 0.16, gain: 1.3 }); }
          ctx.sound('glitch'); H.flare = 0.9;
          if (G.wake) for (let i = 0; i < 4; i++) G.wake(q.x + (Math.random() - 0.5) * 0.8, 0.42, q.z + (Math.random() - 0.5) * 0.6, true);
          ext.emit('minase:ghost-crawl', { s: H.s, me: ps });
        }
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
    if (H.flare > 0) H.flare = Math.max(0, H.flare - dt * 1.6);
    if (H.lurch > 0) H.lurch = Math.max(0, H.lurch - dt);
    const lu = H.lurch > 0 ? Math.sin(Math.PI * (1 - H.lurch / BEAT.lurch)) * BEAT.reach * (H.dir === -1 ? -1 : 1) : 0;   // the beat: a throw at the band and back
    const p = at(H.s + lu);
    fig.root.visible = vis;
    lit(vis ? (H.fade > 0 ? Math.max(0, 1 - H.fade / 1.4) : 1) * (1 + Math.sin(T * 7) * 0.08) * (H.flare > 0 ? 1 + H.flare : 1) : 0, p.x, p.z);
    const sink = H.fade > 0 ? H.fade * H.fade * 1.3 + (Math.sin(T * 31) > 0.6 ? 0.05 : 0) : 0, up = H.rise > 0 ? Math.max(0, H.rise - 0.4) * 0.9 : 0;
    fig.root.position.set(p.x, ctx.world.floorY(0) + 0.15 - sink - up + Math.sin(T * 1.3) * 0.03 + (G.sillLiftAt ? G.sillLiftAt(p.x, p.z) : 0), p.z);   // 1.6.0: over a sill she rises with it
    fig.root.rotation.y = p.yaw + (H.dir === -1 ? Math.PI : 0);
    // 1.8.0 (#5): under the low pipes of P2 she goes down on all fours (the dot version plays its crawl frames on H.crawling); the photo
    // version squashes her low and hunched (G.CRAWL_POSE), head and arms reaching along the passage
    H.crawling = ctx.world.roomAt(p.x, p.z) === 'P2';
    H.crawlK = (H.crawlK || 0) + ((H.crawling ? 1 : 0) - (H.crawlK || 0)) * Math.min(1, dt * 4);
    if (H.crawlK > 0.01 && !fig.dotFrames) { const C = G.CRAWL_POSE; fig.root.position.y -= C.down * H.crawlK; fig.root.scale.y = (fig.pulsedAt === T ? fig.root.scale.y : 1.12) * (1 - (1 - C.squash) * H.crawlK); fig.body.rotation.x += C.pitch * H.crawlK; fig.head.rotation.x += C.head * H.crawlK; }
    fig.body.rotation.z = Math.sin(T * 2.4) * 0.06; fig.head.rotation.z = 0.35 + Math.sin(T * 0.9) * 0.12;
    for (const [i, s] of fig.strands.entries()) s.rotation.x = Math.sin(T * 1.7 + i) * 0.06;
    const near = Math.abs(ps - H.s);
    for (const [i, a] of fig.arms.entries()) { const want = ((near < 4 ? -1.3 : -0.25) + Math.sin(T * 3 + i * 1.7) * 0.25) * (1 - (H.crawlK || 0)) + (G.CRAWL_POSE.arm + Math.sin(T * 4 + i * 2.1) * 0.35) * (H.crawlK || 0); a.rotation.x += (want - a.rotation.x) * Math.min(1, dt * 3); }
    const op = H.fade > 0 ? Math.max(0, 1 - H.fade / 1.4) : 1;
    for (const s of fig.mist) s.material.opacity = 0.25 * op;
    // 1.5.0 (#1): no flicker-out any more; she sinks under the surface (sink above)
    // dread on the screen
    if (vis && near < 16) {
      const k = Math.max(0, Math.min(1, 1 - near / 16));
      const prev = ctx.fxState || {};
      ctx.fxState = { ...prev, danger: Math.max(prev.danger || 0, Math.min(1, k * (H.mode === 'chase' ? 0.65 : 0.45) + (H.flare || 0) * 0.35)), mist: Math.max(prev.mist || 0, k * 0.3) };
    }
    // the emergency lights she passes go out (the way back gets darker behind you)
    if (H.mode === 'chase') for (const [id, e] of Object.entries(G.lampEntry || {})) if (e.i > 0 && G.lampS && Math.abs(G.lampS[id] - H.s) < 1.0) { G.lampOut(id); }
  }

  function retreatStep(dt, ps) {
    H.retreat += dt; const t = H.retreat;
    if (H.rise > 0) H.rise = Math.max(0, H.rise - dt);
    H.dir = 1; H.s = Math.min(ps - 1.6, H.s + (t > 0.6 ? 1.8 * dt : 0)); if (t > 0.6 && !H.lurched) { H.lurched = true; H.lurch = BEAT.lurch; H.flare = 0.9; ctx.audio && ctx.audio.noise && ctx.audio.noise('knock', { pos: { ...at(H.s), y: 1.1 }, n: 2, gap: 0.12, gain: 1.4 }); }
    H.anim = 'attack';
    placeFig(dt, ps);
    // 1.8.0 (#1): after the lurch she goes down into the water where she is (before: she turned and waded back into the dark - seen from
    // the valve it read as walking backward)
    if (t > 1.6) { H.retreat = 0; H.lurched = false; diveOut(gone); }
  }
  // ---- 1.5.0 (#18): she comes up ahead of you ----
  function goAhead(ps) {
    const s = Math.min(G.routeLen - 2, Math.max(ps + 8, (G.aheadValveS || 0) + 3.5)), q = at(s);
    H.sunk = 0; H.sinkAnim = 0; fig.root.visible = false; lit(0);
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
      if (!H.pressing) { H.pressing = true; H.beatT = 0; H.nextBeat = BEAT.first; ext.emit('minase:ghost-press', { id: bl[0].P.def.id }); }
      pressBeat(dt);
      if (H.pressT > 3.0) { H.pressing = false; H.dir = 1; sinkFor(6, Math.max(0, ps - 18)); ext.emit('minase:ghost-sank', { id: bl[0].P.def.id }); }
    } else H.pressing = false;
    if (ctx.hidden) { const back = Math.max(0, ps - 26); diveOut(() => { H.dir = 1; H.wait = 6; H.rise = 1.2; H.s = back; ext.emit('minase:ghost-lost', {}); }); return; }
    // you got past her (ran by while she was still under): she goes down again and comes back up behind you, as in the chase before.
    // A catch is only her at you (before: any player beyond her counted as caught, wherever she was)
    if (ps > H.s + 1.1) { H.pressing = false; H.dir = 1; sinkFor(5, Math.max(0, ps - 12)); return; }
    if (Math.abs(H.s - ps) < 1.1 && !bl.length && ctx.floor === 0) { const f = H.onCatch; if (f) f(); }
  }
  // ---- 1.5.0 (#1): the crossing at the far end of P2 ----
  // a broken wade (she lurches in steps, a shoulder dropping), a stop, her head (the whole body in the dot version) turned to you, a
  // twitch, and a drag down under the water with the arms up. No fade: she goes under the surface.
  // she comes out of the knee water of P3 into the dry end of P2 (in view from the low passage), stops, turns, and is yanked back into the water
  // 1.7.0 (5th play test #6 「頑張れば間に合う感じなので、間に合わない程度のタイミングで」「画面外に消えていく感じ」): the crossing fires
  // when you are 10 m off (story.js e7 at x -7.5, crouched under the pipes: under 6.5 m in its 5 s), she is already standing at the far end
  // with her back to you, turns, twitches, and lurches away round the corner into P3 - out of the frame, never sinking where you can see
  // 1.8.0 (2026-11-27 /dot-fps #1 「最初にモンスターが出た時に後ろに戻っていくような動作をする場合があります。水の中に消えていく演出に」):
  // she no longer lurches off round the corner (her yaw was still swinging from you to the corner while she already moved, so for a
  // moment she slid backward). She stands at the far end with her back to you, turns, twitches, and goes down into the knee water where
  // she stands (diveOut: three jerks, spray and rings, gone). Still 10 m off and over in ~4.6 s: you cannot reach her.
  const CROSS = { from: [-17.7, -42.25], still: 0.6, turn: 1.3, twitch: 2.4 };
  function crossStep(dt, cam) {
    H.ct += dt; const t = H.ct, C = CROSS, y0 = ctx.world.floorY(0) + 0.15;
    fig.root.visible = true;
    const x = C.from[0], z = C.from[1];
    const face = Math.atan2(cam.x - x, cam.z - z), along = -Math.PI + 0.05;   // her back to you: she looks down P3 (-z)
    let d = face - along; d = Math.atan2(Math.sin(d), Math.cos(d));          // the short way round
    let yaw = along, roll = 0.08 + Math.sin(t * 2.1) * 0.03;
    H.anim = 'idle';
    if (t > C.still) { const q = Math.min(1, (t - C.still) / (C.turn - C.still)); yaw = along + d * q * q; if (!H.turned) { H.turned = true; ctx.sound('noise', 'tap', { pos: { x, y: 1.4, z } }); } }
    if (t > C.turn) { yaw = face + Math.sin(t * 40) * 0.12; roll = Math.sin(t * 37) * 0.25; H.anim = 'attack'; }
    fig.root.position.set(x, y0, z); fig.root.rotation.set(0, yaw, 0); fig.body.rotation.z = roll;
    lit(1, x, z);
    for (const a of fig.arms) a.rotation.x += (-0.4 - a.rotation.x) * Math.min(1, dt * 5);
    if (t > C.twitch) { H.turned = false; diveOut(gone); }
  }
  G.CROSS = CROSS;

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
    // 1.2.0 (#20) she lit the water round her (one warm light inside her, 12 m); 1.5.2: a cold rim behind her and a key from the water
    glow = new THREE.PointLight(0x9fbad0, 0, 4.2, 1.6); glow.name = 'mn-her-rim'; ctx.scene.add(glow);
    key = new THREE.PointLight(0x4f9c98, 0, 3.0, 1.3); key.name = 'mn-her-key'; ctx.scene.add(key);
    fig = buildChimera(); fig.root.visible = false; fig.root.userData.figure = 'are'; ctx.world.group.add(fig.root); G.chimera = fig;   // userData.figure: check-playtest P61 (a figure through a shut door)
    // warm-up: her materials compiled before play
    const warm = new THREE.Group(); warm.visible = false; warm.add(buildChimera().root); ctx.scene.add(warm); ctx.warmObjects = [...(ctx.warmObjects || []), warm];
    ctx.systems.push({ id: 'minase-chimera', def: { update: (dt, c2, active) => update(dt, active) }, inst: null });
  });
}
