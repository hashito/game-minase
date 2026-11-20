// Resume in the middle of the chase (#23, 2026-11-20): run from あれ in the water passage, reload, "つづきから", and check the world agrees:
// the jar in hand, the chase still on, she is behind you (never in front, never in the way), and the run back to the mouth still works.
//   node tools/probe.mjs --out D:/minase-stages/resume-chase --query "scene=escape-p3" --steps tools/play/resume-chase.mjs
import { helpers } from './lib.mjs';

export default async (api) => {
  const { p, G, sleep, log, shot, base } = api, H = helpers(api);
  const fails = [];
  const check = (ok, what) => { log(ok ? '  ok  ' : '  FAIL', what); if (!ok) fails.push(what); };
  const gh = () => G('({ mode: mn.gh.mode, s: +mn.gh.s.toFixed(1), me: +mn.project(g.camera.position.x, g.camera.position.z).s.toFixed(1), deaths: mn.deaths || 0, room: g.state.room, jar: g.state.tasks.includes("T_JAR"), esc: g.state.tasks.includes("T_ESCAPE") })');
  await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 60000);
  await sleep(2500); await H.idle();
  await H.walkTo(-17.6, -52, { run: true }); await H.idle();
  const a = await gh(); log('before', JSON.stringify(a)); await shot('before-reload');
  // a test scene never saves (kit 1.11.2), so write the save as the game would at this moment
  check(await G('(() => { const s = g.snapshot(); if (!s) return false; g.store.save(s); return true; })()'), 'the save is written mid-chase');
  await p.goto(base.replace(/\?.*$/, '')); await p.waitFor("document.getElementById('continue-btn') && !document.getElementById('start-btn').disabled", 120000);
  await shot('title-continue');
  await G(`(document.getElementById('continue-btn').click(), 1)`); await sleep(2500);
  await shot('recap');   // 前回のつづき (これまで): the player reads it and presses つづける
  await G(`(() => { const b = [...document.querySelectorAll('.wm-layer button, button')].find((x) => /つづける/.test(x.textContent) && x.offsetParent); if (b) b.click(); return !!b; })()`); await sleep(1500);
  const b = await gh(); log('after', JSON.stringify(b)); await shot('after-resume');
  check(b.jar && !b.esc, 'the jar is still in hand and the escape not yet done');
  check(b.mode !== 'off', `the chase is on after the resume (${b.mode})`);
  check(b.s < b.me, `she is behind you (s ${b.s} < me ${b.me})`);
  // run on to the low passage and through it: the way stays free
  await H.walkTo(-17.6, -41.8, { run: true, near: 0.5 }); await H.idle();
  if (!(await G('g.fp.crouching'))) { await p.key('KeyC'); await sleep(300); }
  await H.walkTo(2.6, -41.8, { near: 0.5 }); await p.key('KeyC'); await sleep(300);
  const c = await gh(); log('through P2', JSON.stringify(c)); await shot('through-p2');
  check(c.me > b.me + 15 || c.deaths > b.deaths, 'the run goes on after the resume (moved on, or caught and sent back to the checkpoint)');
  check(!api.errors().filter((e) => !/favicon/.test(e)).length, 'no page errors');
  log('RESULT', fails.length ? 'FAIL ' + fails.join(' / ') : 'PASS');
};
