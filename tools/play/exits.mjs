// 1.8.0 (2026-11-27 /dot-fps #1 「最初のモンスターの出現時に後退することがある…退出は水の中に沈むようにしてください。すべての退出場面を確認」):
// every way あれ leaves a scene, watched frame by frame in the page: while she is seen she never slides back along the passage (her feet stay
// where they were, or come on toward you), and she leaves by going DOWN into the water (out of sight below the surface), never by walking off.
//   A cross   the first sighting at the end of P3: still, turns the short way, twitches, sinks
//   B lesson  the valve lesson: the valve turned on her - a lurch at you, then she sinks
//   C hidden  the chase, you in a locker: she searches where she lost you, then sinks
//   D ahead   the chase in P3: she goes under behind you (and comes up ahead)
//   node tools/probe.mjs --public --path dot-fps/ --query "qa=1&scene=p3" --out D:/minase-stages/180/1-exits-dot-pc --steps tools/play/exits.mjs
//   (add --mobile --size 390x844; without --public --path the photo version)
import { helpers } from './lib.mjs';

export default async (api) => {
  const { G, sleep, log, shot } = api, H = helpers(api);
  const fails = [];
  const check = (ok, what) => { log(ok ? '  ok  ' : '  FAIL', what); if (!ok) fails.push(what); };
  await sleep(1500);
  await G(`(([...document.querySelectorAll('.ph-sheet button, #gf-rotate button')].find((b) => /このまま/.test(b.textContent)) || { click() {} }).click(), 1)`); await sleep(300);
  await G(`(document.getElementById('start-btn').click(), 1)`); await sleep(4000); await H.idle(); await sleep(800);
  // sample her root 20 times a second in the page
  const rec = (ms) => G(`new Promise((res) => { const out = [], t0 = performance.now(), wy = 0.42; const id = setInterval(() => { const r = mn.chimera.root, p = r.position; out.push({ t: Math.round(performance.now() - t0), x: +p.x.toFixed(3), y: +p.y.toFixed(3), z: +p.z.toFixed(3), v: r.visible, s: +mn.gh.s.toFixed(2), m: mn.gh.mode }); if (performance.now() - t0 > ${ms}) { clearInterval(id); res(out); } }, 50); })`);
  const judge = (name, S, o = {}) => {
    const seen = S.filter((q) => q.v);
    if (!seen.length) { check(false, `${name}: she was never seen`); return; }
    const a = seen[0];
    let back = 0; for (const q of seen) back = Math.max(back, Math.hypot(q.x - a.x, q.z - a.z) * (o.towardOk ? 0 : 1));
    // the passage direction she would retreat along: her s must never drop while she is seen
    let sDrop = 0; for (let i = 1; i < seen.length; i++) sDrop = Math.max(sDrop, seen[i - 1].s - seen[i].s);
    const last = seen[seen.length - 1], low = Math.min(...seen.map((q) => q.y));
    log(`  ${name}: seen ${seen.length} samples, moved ${back.toFixed(2)} m on the floor, s dropped ${sDrop.toFixed(2)}, lowest y ${low.toFixed(2)}, last ${JSON.stringify(last)}`);
    if (!o.towardOk) check(back < 0.25, `${name}: she does not walk or slide off (moved ${back.toFixed(2)} m)`);
    check(sDrop < 0.3, `${name}: never back along the passage while seen (s dropped ${sDrop.toFixed(2)} m)`);
    check(low < a.y - 1.4, `${name}: she goes down into the water (${a.y.toFixed(2)} -> ${low.toFixed(2)})`);
    check(!S[S.length - 1].v, `${name}: gone at the end`);
  };
  const at = (x, z, tx, tz, ty = 1.0) => G(`(g.teleport({ x: ${x}, z: ${z}, floor: 0 }), g.fp.crouching = false, 1)`).then(() => sleep(400)).then(() => H.face(tx, tz, ty));

  // A: the first sighting
  await at(-17.6, -49, -17.7, -42.25, 1.0);
  await G(`(mn.ghostStart('cross', mn.project(-17.6, -46.5).s, { speed: 0 }), 1)`);
  { const p = rec(6200); for (const ms of [400, 1900, 2900, 3500]) { await sleep(ms === 400 ? 400 : ms === 1900 ? 1500 : ms === 2900 ? 1000 : 600); await shot(`A-cross-${ms}`); } judge('A cross', await p); }
  await G(`(mn.ghostStop && mn.ghostStop(), 1)`); await sleep(500);

  // B: the valve lesson - the valve turned on her: she lurches, then sinks
  await at(-17.6, -60, -17.6, -56, 1.0);
  await G(`(() => { const me = mn.project(-17.6, -60).s; mn.ghostStart('lesson', me - 4.5, { speed: 0 }); return 1; })()`); await sleep(1500);
  await G(`(mn.gh.retreat = 0.001, 1)`);
  { const p = rec(5200); for (const ms of [500, 1500, 2200, 3000]) { await sleep(ms === 500 ? 500 : ms === 1500 ? 1000 : ms === 2200 ? 700 : 800); await shot(`B-lesson-${ms}`); } judge('B lesson', await p, { towardOk: true }); }
  await G(`(mn.ghostStop && mn.ghostStop(), 1)`); await sleep(500);

  // C: the chase, you in a locker (H_P3 in P4A)
  await at(-18, -80.4, -18, -82.0, 1.0);
  const ia = await G(`(() => { const x = g.world.interactables.map((o) => o.userData.interact).find((i) => i && i.kind === 'hide' && i.id === 'H_P3'); g.useInteract(x); return !!g.hidden; })()`);
  check(ia, 'C: hidden in the locker');
  await G(`(() => { const me = mn.project(-18, -82.17).s; mn.ghostStart('chase', me - 4, { speed: 0 }); mn.gh.t = 20; mn.gh.aheadDone = true; return 1; })()`); await sleep(600);
  { const R = await G('({ x: mn.chimera.root.position.x, z: mn.chimera.root.position.z })'); await H.face(R.x, R.z, 1.0); }
  { const p = rec(7000); for (const ms of [1000, 3600, 4400, 5200]) { await sleep(ms === 1000 ? 1000 : ms === 3600 ? 2600 : 800); await shot(`C-hidden-${ms}`); } judge('C hidden', await p); }
  await G(`(g.hidden && g.useInteract(g.world.interactables.map((o) => o.userData.interact).find((i) => i && i.kind === 'hide' && i.id === 'H_P3')), mn.ghostStop && mn.ghostStop(), 1)`); await sleep(500);

  // D: the chase in P3 - she goes under behind you (to come up ahead): look back at her
  await at(-17.6, -62, -17.6, -70, 1.0);
  await G(`(() => { const me = mn.project(-17.6, -62).s; mn.ghostStart('chase', me - 7, { speed: 0 }); mn.gh.t = 20; mn.gh.aheadDone = true; return 1; })()`); await sleep(1500);
  await G(`(mn.ghostDive(() => { mn.gh.wait = 99; mn.chimera.root.visible = false; }), 1)`);
  { const p = rec(3200); for (const ms of [300, 900, 1500]) { await sleep(ms === 300 ? 300 : 600); await shot(`D-ahead-${ms}`); } judge('D ahead', await p); }
  await G(`(mn.ghostStop && mn.ghostStop(), 1)`);

  check(api.errors().filter((e) => !/favicon/.test(e)).length === 0, 'no page errors');
  log(fails.length ? `RESULT FAIL ${fails.length}: ${fails.join(' / ')}` : 'RESULT PASS');
};
