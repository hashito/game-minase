// 1.6.0: the fourth play test (2026-11-23) as a play script: each finding that needs play to show is played and checked (headless).
//   node tools/probe.mjs --query "scene=p1" --out D:/minase-stages/fourth --steps tools/play/fourth.mjs   (dot: --public --path dot-fps/)
// Logs "PASS <what>" / "FAIL <what>" and ends with "fourth: N fail(s)".
//   #1  no water shows a cut face (kit P60) in the scenes of the story, also with the doors open
//   #3  no hiding place stands in a wall (kit P62), every locker shut
//   #4  「振り向いても」: the sound plays behind; the line waits until you turn (kit ctx.cueBehind), never before (P58)
//   #5  knee water steps 'wade', ankle water 'water'
//   #6  she presses at the shut gate without reaching through it (kit P61)
//   #9  a watertight door slides for about 3 s and you pass only once it is open
//   #10 one valve at a time: turning a second lets the first go
//   #11 rooms an open doorway joins stand at one level; opening the first door pours over its coaming
import { helpers } from './lib.mjs';
import { cueOrderSource } from '../cue-order.mjs';
import { waterEdgeSource, doorClipSource, hideRoomSource } from '../water-edge.mjs';

export default async (api) => {
  const { p, G, sleep, log, shot, base } = api, H = helpers(api);
  let fails = 0;
  const ok = (c, what, extra = '') => { if (c) log(`PASS ${what} ${extra}`); else { fails++; log(`FAIL ${what} ${extra}`); } };
  const scene = async (id) => {
    await p.goto(`${base}?scene=${id}`); await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 120000); await sleep(2500); await H.idle(6000);
    await G(`([...document.querySelectorAll('button')].find((b) => /このまま遊ぶ/.test(b.textContent) && b.offsetParent) || { click() {} }).click(), 1`);
  };
  const tp = (x, z) => G(`(g.setFloor(0, { x: ${x}, z: ${z} }), 1)`);

  // #1 / #3 / #11 over the scenes of the story
  for (const s of ['mouth', 'p1', 'p3', 'lesson', 'gate', 'hyohon', 'escape', 'end']) {
    await scene(s); await G(`(__mn.ghostStop && __mn.ghostStop(), 1)`);
    const E = await p.eval(waterEdgeSource()), R = await p.eval(hideRoomSource());
    const lv = await G(`(() => { const o = {}; for (const [r, m] of Object.entries(__mn.water || {})) o[r] = m.visible ? +(m.position.y - g.world.floorY(0)).toFixed(2) : null; return o; })()`);
    const joined = [['P1', 'P2', 'P3', 'P4A'], ['P4B', 'P5']].every((grp) => new Set(grp.map((r) => lv[r]).filter((v) => v != null)).size <= 1);
    ok(Array.isArray(E) && E.length === 0, `#1 ${s}: no cut face of water (P60)`, JSON.stringify(E).slice(0, 200));
    ok(Array.isArray(R) && R.length === 0, `#3 ${s}: no hiding place in a wall (P62)`, JSON.stringify(R).slice(0, 200));
    ok(joined, `#11 ${s}: joined rooms stand at one level`, JSON.stringify(lv));
    const open = await G(`[...(g.hideLooks || new Map()).values()].filter((h) => h.rest >= 1 && h.k < 0.95).length`);   // k 1 = shut (kit hide-looks: rest 1 for a locker)
    ok(!open, `#3 ${s}: every locker shut`, String(open));
  }
  // #1 with the doors open: the end door (D_END) and its sill
  await scene('escape');
  await G(`(() => { for (const id of ['D_END', 'D_GATE', 'D_P1']) { const d = g.world.doors.get(id); if (d && !d.isOpen) d.open(); } return 1; })()`); await sleep(4500);
  { const E = await p.eval(waterEdgeSource()); ok(Array.isArray(E) && E.length === 0, '#1 escape, every watertight door open: no cut face', JSON.stringify(E).slice(0, 200)); }

  // #4 the clang behind, on the way in (moment e4 at z -36)
  await scene('p1');
  await tp(2.6, -34.0); await H.face(2.6, -45, 1.4); await sleep(300);
  await tp(2.6, -36.2); await H.face(2.6, -45, 1.4);
  await sleep(3000);
  const seen = await G(`(g.cueLog || []).filter((x) => x[0] !== 'sound').slice(-8)`);
  const behind = seen.filter((x) => x[0] === 'behind'), said = seen.filter((x) => x[0] === 'say' && behind.some((b) => b[1] === x[1]));
  ok(behind.length === 1 && !said.length, '#4 the clang plays behind and nothing is said while you look ahead', JSON.stringify(seen.map((x) => x.slice(0, 2))).slice(0, 300));
  await H.face(2.6, -25, 1.4); await sleep(1200);
  const after = await G(`(g.cueLog || []).slice(-6)`);
  ok(after.some((x) => x[0] === 'turned' && after.some((y) => y[0] === 'say' && y[1] === x[1])), '#4 turned round: the line comes', JSON.stringify(after.map((x) => x.slice(0, 2))).slice(0, 300));
  await shot('behind-turned');
  { const C = await G(cueOrderSource()); ok(Array.isArray(C) && C.length === 0, '#4 P58: no sound line before its sound, no turning line before the turn', JSON.stringify(C).slice(0, 300)); }

  // #5 steps by the depth of the water
  await scene('p3'); await G(`(__mn.ghostStop && __mn.ghostStop(), 1)`);
  await tp(-17.6, -66); await sleep(500);
  const deep = await G(`g.stepSurfaceOf('P3')`);
  await scene('mouth'); await tp(2.0, 4.5); await sleep(500);
  const shallow = await G(`g.stepSurfaceOf('MOUTH')`);
  ok(deep === 'wade' && shallow === 'water', '#5 knee water wades, ankle water splashes', JSON.stringify({ deep, shallow }));

  // #9 the first watertight door slides open slowly; the way opens with it
  await scene('mouth'); await tp(2.0, 3.5);
  await G(`(() => { const d = g.world.doors.get('D_P1'); d.locked = () => false; d.open(); return d.isOpen; })()`);   // the story unlocks it with the wheel
  const ks = [];
  for (let i = 0; i < 9; i++) { await sleep(500); ks.push(await G(`({ k: +__mn.wt.D_P1.open.toFixed(2), off: !!(__mn.wt.D_P1.d.col && __mn.wt.D_P1.d.col.off) })`)); }
  const half = ks[2], full = ks[ks.length - 1];
  ok(half.k > 0.15 && half.k < 0.7 && !half.off && full.k === 1 && full.off, '#9 the slab slides for about 3 s; the way opens once it is open', JSON.stringify(ks));
  { const S = await G(`(g.cueLog || []).filter((x) => x[0] === 'sound').slice(-6).map((x) => x[1])`); log('  door sounds', JSON.stringify(S)); }

  // #11 the pour over the coaming as the first door opens (the story's own press)
  await scene('mouth');
  const lv0 = await G(`+(__mn.water.MOUTH.position.y - g.world.floorY(0)).toFixed(3)`);
  await G(`(__mn.pourOver('D_P1', 'MOUTH', 6.5), __mn.setWater('MOUTH', 0.12, { sec: 6.5, from: 0.07 }), 1)`); await sleep(3200);
  const mid = await G(`({ pours: __mn.pours.length, y: +(__mn.water.MOUTH.position.y - g.world.floorY(0)).toFixed(3) })`);
  await sleep(4000);
  const lv1 = await G(`+(__mn.water.MOUTH.position.y - g.world.floorY(0)).toFixed(3)`);
  ok(mid.pours >= 1 && mid.y > lv0 && mid.y < lv1 && lv1 >= 0.119, '#11 the pour: a sheet over the coaming, the corridor rises over seconds', JSON.stringify({ lv0, mid, lv1 }));

  // #6 she presses at the shut gate and never reaches through it
  await scene('gate');
  await tp(-9, -81.8); await H.face(-4, -81.8, 1.2);
  let clip = [], seenHer = false;
  for (let i = 0; i < 22; i++) { await sleep(600); const c = await p.eval(doorClipSource()); if (c.length) clip = c; if (await G(`__mn.chimera.root.visible`)) seenHer = true; }
  ok(seenHer && !clip.length, '#6 at the shut gate she stays on her side (P61)', JSON.stringify(clip).slice(0, 200));
  await shot('gate-press');

  // #10 one valve at a time
  await scene('escape'); await G(`(__mn.ghostStop && __mn.ghostStop(), 1)`);
  const ids = await G(`[...__mn.posts.keys()]`);
  const can = await G(`${JSON.stringify(ids)}.filter((id) => __mn.canTurn(id) === true)`);
  if (can.length >= 2) {
    await G(`(__mn.turnValve(${JSON.stringify(can[0])}), 1)`); await sleep(400);
    await G(`(__mn.turnValve(${JSON.stringify(can[1])}), 1)`); await sleep(600);
    const on = await G(`[...__mn.posts.values()].filter((P) => P.on).map((P) => P.def.id)`);
    ok(on.length === 1 && on[0] === can[1], '#10 one valve at a time: the second lets the first go', JSON.stringify({ can, on }));
  } else ok(false, '#10 two valves to turn in the escape', JSON.stringify({ ids, can }));

  log(`fourth: ${fails} fail(s)`);
};
