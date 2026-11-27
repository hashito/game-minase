// 1.8.0 (2026-11-27 /dot-fps #5 「しゃがみ通路の途中で背後から、しゃがんだ／這うキメラが追ってくるように」): run ahead of her to the low
// passage P2, crouch, crawl in. Past x -13 she comes in after you: a splash and a knock at the mouth behind you (the warning), she comes up
// 7 m behind and crawls after you (dot: the crouch-walk frames). Checks: the warning fired once, she is behind you and crawling, a look back
// shows her, and crawling on without a stop she never reaches you (0.9 m/s against your 1.1 m/s) - no death to the passage's end.
//   node tools/probe.mjs --public --path dot-fps/ --out D:/minase-stages/180/5-crawl --query "scene=escape-p3" --steps tools/play/crawl-follow.mjs
//   (add --mobile --size 390x844; without --public --path the photo version)
import { helpers } from './lib.mjs';

export default async (api) => {
  const { p, G, sleep, log, shot } = api, H = helpers(api);
  const fails = [];
  const check = (ok, what) => { log(ok ? '  ok  ' : '  FAIL', what); if (!ok) fails.push(what); };
  const gh = () => G('({ mode: mn.gh.mode, s: +mn.gh.s.toFixed(1), me: +mn.project(g.camera.position.x, g.camera.position.z).s.toFixed(1), crawlIn: !!mn.gh.crawlIn, crawling: !!mn.gh.crawling, rise: +(mn.gh.rise || 0).toFixed(2), wait: +(mn.gh.wait || 0).toFixed(2), deaths: mn.deaths || 0, x: +g.camera.position.x.toFixed(2), room: g.state.room, anim: (() => { const f = window.__dot && window.__dot.figures && window.__dot.figures.are; if (!f) return null; const F = f.hd && f.hd.root.visible ? f.hd : f; return F.anim.motion; })() })');
  const crouch = async (on) => { const c = !!(await G('g.fp.crouching')); if (c !== !!on) { await p.key('KeyC'); await sleep(300); } };
  await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 60000);
  await sleep(2500); await H.idle();
  log('start', JSON.stringify(await gh()));
  // at the mouth of the low passage, ahead of her (the water of P3 slows you and she comes up ahead of you there - not this test)
  await G(`(g.teleport({ x: -16.0, z: -41.8, floor: 0 }), 1)`); await sleep(500);
  await crouch(true);
  await G(`(() => { const me = mn.project(g.camera.position.x, g.camera.position.z).s; Object.assign(mn.gh, { s: me - 25, aheadDone: true, wait: 0, rise: 0, dir: 1, t: 20, lunge: 9 }); return 1; })()`); await sleep(300);
  const d0 = (await gh()).deaths;
  log('at the mouth', JSON.stringify(await gh()));
  // crawl as a player does: W held down along the passage (tools/play/lib walkTo stops and starts - half the pace)
  const hold = async (toX) => { await H.face(toX + 5, -41.8, 0.6); await p.key('KeyW', 'down'); const t0 = Date.now(), x0 = (await gh()).x; let q; for (let i = 0; i < 400; i++) { q = await gh(); if (q.x >= toX || q.deaths > d0) break; await sleep(80); } await p.key('KeyW', 'up'); log('  crawled', (q.x - x0).toFixed(2), 'm in', ((Date.now() - t0) / 1000).toFixed(1), 's'); return q; };
  await hold(-11.5);
  let g1 = await gh(); log('past x -13', JSON.stringify(g1));
  check(g1.crawlIn, 'she came in after you (the warning fired)');
  check(g1.mode === 'chase' && g1.s < g1.me - 5, `she is behind you (s ${g1.s}, you ${g1.me})`);
  await sleep(1600);
  g1 = await gh(); log('risen', JSON.stringify(g1));
  check(g1.crawling, 'she is crawling in the low passage');
  // look back at her
  const R = await G('({ x: mn.chimera.root.position.x, z: mn.chimera.root.position.z, vis: mn.chimera.root.visible })');
  log('her', JSON.stringify(R));
  await H.face(R.x, R.z, 0.4); await sleep(700);
  await shot('look-back-crawling');
  const dotAnim = (await gh()).anim;
  log('dot anim', JSON.stringify(dotAnim));
  if (dotAnim !== null) check(/^crouch/.test(dotAnim), `the dot frames crawl (${dotAnim})`);
  // hold still a moment: she crawls nearer (the close look), then crawl on
  for (let i = 0; i < 60; i++) { const q = await gh(); if (q.me - q.s < 3.6) break; await sleep(100); }
  { const R2 = await G('({ x: mn.chimera.root.position.x, z: mn.chimera.root.position.z })'); await H.face(R2.x, R2.z, 0.35); await sleep(300); await shot('close-crawling'); log('close', JSON.stringify(await gh())); }
  // crawl on to the end without a stop: she never reaches you
  let minGap = 99;
  await H.face(6, -41.8, 0.6); await p.key('KeyW', 'down');
  for (let i = 0; i < 400; i++) { const q = await gh(); if (q.mode === 'chase') minGap = Math.min(minGap, q.me - q.s); if (q.x > 0.9 || q.deaths > d0) break; await sleep(80); }
  await p.key('KeyW', 'up');
  g1 = await gh(); log('at the far end', JSON.stringify(g1), 'min gap', minGap.toFixed(2));
  await shot('far-end');
  check(g1.deaths === d0, `not caught crawling on (deaths ${d0} -> ${g1.deaths})`);
  check(minGap > 1.15, `she never came within reach (min gap ${minGap.toFixed(2)} m)`);
  await crouch(false);
  check(api.errors().filter((e) => !/favicon/.test(e)).length === 0, 'no page errors');
  log(fails.length ? `RESULT FAIL ${fails.length}: ${fails.join(' / ')}` : 'RESULT PASS');
};
