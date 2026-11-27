// 1.8.0: she comes up ahead of you in P3 only with the valve K_P3B (z -60) between you and her. Since #1 she first goes down where she is
// (1.8 s) when you can see her; running on through those seconds can take you past the valve - then she must come up BEHIND you, never
// ahead with no valve between (the full play died there 14 times). Two runs: she close (in sight, the dive) and she far (out of sight, at once).
//   node tools/probe.mjs --public --path dot-fps/ --query "qa=1&scene=escape-p3" --out D:/minase-stages/180/ahead-fair --steps tools/play/ahead-fair.mjs
import { helpers } from './lib.mjs';

export default async (api) => {
  const { p, G, sleep, log, shot } = api, H = helpers(api);
  const fails = [];
  const check = (ok, what) => { log(ok ? '  ok  ' : '  FAIL', what); if (!ok) fails.push(what); };
  const gh = () => G('({ mode: mn.gh.mode, s: +mn.gh.s.toFixed(1), me: +mn.project(g.camera.position.x, g.camera.position.z).s.toFixed(1), dir: mn.gh.dir || 1, dive: +(mn.gh.dive || 0).toFixed(2), deaths: mn.deaths || 0, valve: +mn.aheadValveS.toFixed(1) })');
  await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 60000);
  await sleep(2500); await H.idle();
  for (const [name, back, z0] of [['close-early', 7, -70.5], ['close-late', 7, -65.5], ['far-late', 20, -65.5]]) {
    await G(`(g.teleport({ x: -17.6, z: ${z0}, floor: 0 }), g.fp.crouching = false, 1)`); await sleep(400);
    await G(`(() => { const me = mn.project(-17.6, ${z0}).s; mn.chaseFrom(me - ${back}, 0); Object.assign(mn.gh, { aheadDone: false, t: 20, lunge: 9 }); return 1; })()`);
    const d0 = (await gh()).deaths;
    // run on down P3 without a stop, past the valve, as a player who does not look back
    await H.face(-17.6, -40, 1.1); await p.key('ShiftLeft', 'down'); await p.key('KeyW', 'down');
    let ahead = null, q;
    for (let i = 0; i < 120; i++) { q = await gh(); if (q.dir === -1 && q.s > q.me) { ahead = q; break; } if (q.me > q.valve + 6 || q.deaths > d0) break; await sleep(80); }
    await p.key('KeyW', 'up'); await p.key('ShiftLeft', 'up');
    log(`  ${name}: ahead ${JSON.stringify(ahead)} last ${JSON.stringify(q)}`);
    await shot(`${name}-end`);
    if (ahead) check(ahead.me < ahead.valve && ahead.s > ahead.valve, `${name}: she came up ahead with the valve between (you ${ahead.me}, valve ${ahead.valve}, her ${ahead.s})`);
    else check(q.s < q.me, `${name}: she stayed behind you (her ${q.s}, you ${q.me})`);
    if (!ahead) check(q.deaths === d0, `${name}: not caught running on (deaths ${d0} -> ${q.deaths})`);
    await G('(mn.ghostStop(), 1)'); await sleep(500);
  }
  check(api.errors().filter((e) => !/favicon/.test(e)).length === 0, 'no page errors');
  log(fails.length ? `RESULT FAIL ${fails.length}: ${fails.join(' / ')}` : 'RESULT PASS');
};
