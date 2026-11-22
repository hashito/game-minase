// 1.5.0: the third play test (2026-11-22) as a play script: each finding that needs play to show is played and checked (headless).
//   node tools/probe.mjs --public --path dot-fps/ --query "qa=1&scene=p1" --out D:/minase-stages/third --steps tools/play/third.mjs
// Logs "PASS <what>" / "FAIL <what>" and ends with "third: N fail(s)".
//   #6  the lines about a sound on the way in come after their sound (kit tools/cue-order.mjs)
//   #1  the crossing: she lurches out, stops, turns, and is dragged under (mode 'cross'), never a fade
//   #11 the lesson: a valve one step back (K_P4, the door side) works too and ends the lesson
//   #9  a shut door on her way holds her (she bangs on it) until she breaks it open
//   #18 the run back: in P3 she comes up ahead (warned by a splash), the valve between stops her, and she sinks back behind
//   #12 standing on a dry band: the HUD chip says so and the steps sound dry
import { helpers } from './lib.mjs';
import { cueOrderSource } from '../cue-order.mjs';

export default async (api) => {
  const { p, G, sleep, log, shot, base } = api, H = helpers(api);
  let fails = 0;
  const ok = (c, what, extra = '') => { if (c) log(`PASS ${what} ${extra}`); else { fails++; log(`FAIL ${what} ${extra}`); } };
  const scene = async (id) => { await p.goto(`${base}?qa=1&scene=${id}`); await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 120000); await sleep(2500); await H.idle(); };
  const gh = () => G('({ mode: __mn.gh.mode, s: +__mn.gh.s.toFixed(2), dir: __mn.gh.dir, wait: +(__mn.gh.wait || 0).toFixed(1), sunk: +(__mn.gh.sunk || 0).toFixed(1), fade: __mn.gh.fade, me: +__mn.project(g.camera.position.x, g.camera.position.z).s.toFixed(2) })');
  const tp = (x, z) => G(`(g.setFloor(0, { x: ${x}, z: ${z} }), 1)`);

  // #6: the way in, P1: drip, hair, flicker, clang - walk through them
  await G(`(document.getElementById('start-btn') && document.getElementById('start-btn').click(), 1)`); await sleep(2500); await H.idle();
  await scene('p1');
  for (const z of [-6, -9, -15, -18, -25, -28, -34, -37]) { await tp(2.6, z); await sleep(2600); await H.idle(5000); }
  const C = await G(cueOrderSource());
  ok(Array.isArray(C) && C.length === 0, '#6 sound before its line (P1 moments)', JSON.stringify(C).slice(0, 300));
  const log6 = await G(`(g.cueLog || []).filter((x) => x[0] === 'say').map((x) => x[1]).slice(-6)`); log('  says', JSON.stringify(log6));

  // #1: the crossing, from the low passage
  await scene('p2');
  await G(`(g.fp.crouching = true, 1)`); await tp(-13.4, -41.8);   // just past the moment's point (e7 at -12.5) await H.face(-17.6, -42.2, 0.9);
  const modes = []; let fadeSeen = false;
  for (let i = 0; i < 16; i++) { const s = await gh(); modes.push(s.mode); if (s.fade > 0) fadeSeen = true; if (i === 5) await shot('cross-mid'); await sleep(450); }
  ok(modes.includes('cross') && modes[modes.length - 1] === 'off' && !fadeSeen, '#1 crossing: lurch, turn, dragged under, no fade', modes.join(','));

  // #11: the lesson with the valve one step back (K_P4, beyond the gate)
  await scene('lesson');
  await tp(-1.6, -81.8); await sleep(1500);
  ok((await gh()).mode === 'lesson', '#11 the lesson starts');
  await tp(-9, -81.3); await H.face(-9, -82.6, 1.15); await sleep(400);
  const canP4 = await G(`__mn.canTurn('K_P4')`);
  ok(canP4 === true, '#11 K_P4 can be turned during the lesson', JSON.stringify(canP4));
  await G(`(__mn.turnValve('K_P4'), 1)`);
  await tp(-13, -81.8); await H.face(0, -81.8, 1.2);   // step back behind the valve and watch her come to it
  let posted = false;
  for (let i = 0; i < 70 && !posted; i++) { await sleep(1000); await H.idle(800); posted = await G(`g.state.tasks.includes('T_POST')`); }
  ok(posted, '#11 the lesson ends on the valve one step back (T_POST)');
  await shot('lesson-p4');

  // #9: a shut door on her way (D_END) holds her until she breaks it
  await scene('escape');
  await tp(9, -95); await sleep(300);
  await G(`(() => { const d = g.world.doors.get('D_END'); if (d.isOpen) d.close(); return d.isOpen; })()`);
  const R = await G(`(__mn.routeDoors || []).map((r) => ({ id: r.d.def.id, s: +r.s.toFixed(2) }))`);
  const dEnd = (R || []).find((r) => r.id === 'D_END');
  ok(!!dEnd, '#9 D_END is a door on her way', JSON.stringify(R));
  let near = 0, held = 0, forced = false, maxS = 0;
  for (let i = 0; i < 80; i++) {
    const s = await gh(); const open = await G(`g.world.doors.get('D_END').isOpen`);
    if (!open) { maxS = Math.max(maxS, s.s); if (!near && dEnd && s.s >= dEnd.s - 1.2) near = Date.now(); }
    else { forced = true; if (near) held = (Date.now() - near) / 1000; break; }
    await sleep(150);
  }
  ok(held > 1.5 && forced && (!dEnd || maxS <= dEnd.s + 0.1), '#9 she stops at the shut door, bangs, then breaks it', `held ${held}s forced ${forced} maxS ${maxS} door ${dEnd && dEnd.s}`);

  // #18: she comes up ahead in P3; the valve between stops her
  await scene('escape-p3');
  await tp(-17.6, -70); await sleep(200);
  let ahead = null;
  for (let i = 0; i < 30 && !ahead; i++) { await tp(-17.6, -70 + i * 0.25); const s = await gh(); if (s.dir === -1) ahead = s; await sleep(150); }
  ok(!!ahead && ahead.s > ahead.me, '#18 she comes up ahead of you', JSON.stringify(ahead));
  if (ahead) {
    await tp(-17.6, -62.0); await sleep(2400);   // the warning time
    await shot('ahead');
    await G(`(__mn.turnValve('K_P3B'), 1)`);
    let stopped = true, sank = false; const vs = await G(`+__mn.project(-17.6, -60).s.toFixed(2)`);
    for (let i = 0; i < 30; i++) { const s = await gh(); if (s.dir === -1 && s.s < vs + 0.4) stopped = false; /* she presses at the valve + 0.5 */ if (s.sunk > 0 || s.dir === 1) { sank = true; break; } if (await G('!!g.dead || !!(g.deathOpen)')) break; await sleep(250); }
    ok(stopped && sank, '#18 the valve between holds her, then she sinks back behind you', `stopped ${stopped} sank ${sank}`);
    // #12: on the dry band
    await tp(-17.6, -60.0); await sleep(600);
    const dry = await G(`({ chip: (document.getElementById('mn-valve') || {}).className, text: (document.getElementById('mn-valve') || {}).textContent, step: g.stepSurfaceOf ? g.stepSurfaceOf('P3') : null })`);
    ok(/mn-dry/.test(dry.chip || '') && dry.step === 'concrete', '#12 the dry band: HUD chip and dry steps', JSON.stringify(dry));
    await shot('dry-band');
  }
  // #18b: running past her while she is still under is not a catch: she goes down again and comes up behind (the full play found the
  // old rule killed anyone beyond her, wherever she was)
  await scene('escape-p3');
  let up = null;
  for (let i = 0; i < 30 && !up; i++) { await tp(-17.6, -70 + i * 0.25); const s = await gh(); if (s.dir === -1) up = s; await sleep(150); }
  const d0 = await G('__mn.deaths || 0');
  if (up) { await tp(-17.6, -50); await sleep(3500); }
  const after = await gh(), d1 = await G('__mn.deaths || 0');
  ok(!!up && d1 === d0 && after.dir === 1, '#18b running past her while she is under is no catch; she follows from behind', JSON.stringify({ up, after, d0, d1 }));
  log(`third: ${fails} fail(s)`);
};
