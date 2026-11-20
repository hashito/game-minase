// #23 repro (2026-11-20 user report): caught by あれ while crouching in the low passage (P2) on the way back. Without ?qa, so the real catch
// close-up and the death card play. Checks: the close-up shows, the death card and its button show, the button brings you back, the HUD and the
// touch buttons are back, and she is behind you again (never in front). Then the run goes on: a valve stops her and the way to the mouth is free.
//   node tools/probe.mjs --out D:/minase-stages/crouch-catch --query "scene=escape-p3" --steps tools/play/crouch-catch.mjs   (add --mobile --size 390x844)
import { helpers } from './lib.mjs';

export default async (api) => {
  const { p, G, sleep, log, shot } = api, H = helpers(api);
  const fails = [];
  const check = (ok, what) => { log(ok ? '  ok  ' : '  FAIL', what); if (!ok) fails.push(what); };
  const gh = () => G('({ mode: mn.gh.mode, s: +mn.gh.s.toFixed(1), me: +mn.project(g.camera.position.x, g.camera.position.z).s.toFixed(1), deaths: mn.deaths || 0, crouch: !!g.fp.crouching, room: g.state.room })');
  const crouch = async (on) => { const c = !!(await G('g.fp.crouching')); if (c !== !!on) { await p.key('KeyC'); await sleep(300); } };
  await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 60000);
  await sleep(2500); await H.idle();
  log('start', JSON.stringify(await gh()));
  // run to the mouth of the low passage, ahead of her
  await H.walkTo(-17.6, -46, { run: true }); await H.idle();
  await H.walkTo(-17.6, -41.8, { run: true, near: 0.5 }); await H.idle();
  await crouch(true);
  await H.walkTo(-10, -41.8, { near: 0.5 }); await H.idle();
  log('in P2', JSON.stringify(await gh()));
  await shot('p2-crouching');
  // stand still, crouched, until she reaches you
  const d0 = (await gh()).deaths;
  let sawCatch = false, sawCard = false, card = null;
  for (let i = 0; i < 400; i++) {
    const s = await G(`(() => { const c = document.querySelector('.gf-mo-card'), top = document.elementFromPoint(innerWidth / 2, innerHeight / 2), r = c && c.getBoundingClientRect(); return { c: !!document.querySelector('.ax-catch'), card: !!c, btn: (document.querySelector('.gf-mo-card button') || {}).textContent || null, img: !!document.querySelector('.gf-mo-card img'), onTop: !!(c && top && c.contains(top)), covers: !!(r && r.width >= innerWidth * 0.95 && r.height >= innerHeight * 0.95) }; })()`);
    if (s.c && !sawCatch) { sawCatch = true; await shot('catch-closeup'); }
    if (s.card) { sawCard = true; card = s; await sleep(1400); await shot('death-card'); break; }
    if ((await gh()).deaths > d0 && !s.c) { await sleep(200); }
    await sleep(100);
  }
  check(sawCatch, 'the catch close-up shows');
  check(sawCard && card && card.btn, `the death card with its button shows (${card && card.btn})`);
  check(card && card.img, 'the death card has the picture');
  check(card && card.onTop && card.covers, `the death card is really on screen: covers it and is on top (${card && card.covers}, ${card && card.onTop}); the 1.1.0 bug was a card drawn behind the canvas`);
  const pageErrs = () => api.errors().filter((e) => !/favicon/.test(e));
  const errs1 = pageErrs().length; check(errs1 === 0, `no page errors at the catch (${pageErrs().slice(0, 3).join(' | ')})`);
  if (sawCard) await G(`(document.querySelector('.gf-mo-card button').click(), 1)`);
  await sleep(1500); await H.idle();
  const after = await G(`({ hud: !document.getElementById('hud').classList.contains('hidden'), touch: (() => { const t = document.getElementById('touch') || document.querySelector('.touch, #gf-touch'); return t ? getComputedStyle(t).display !== 'none' : null; })(), blocked: g.blocked(), card: !!document.querySelector('.gf-mo-card'), catchEl: !!document.querySelector('.ax-catch') })`);
  log('after retry', JSON.stringify(after), JSON.stringify(await gh()));
  await shot('after-retry');
  check(after.hud && !after.blocked && !after.card && !after.catchEl, 'the HUD is back and nothing blocks play');
  let g1 = await gh();
  check(g1.mode === 'chase' && g1.s < g1.me - 3, `she is behind you again (s ${g1.s} < me ${g1.me})`);
  // go on: through the low passage, a valve in P1 behind you, out to the mouth
  await crouch(g1.room === 'P2');
  await H.walkTo(2.6, -41.8, { near: 0.5 }); await crouch(false);
  await H.walkTo(2.6, -30, { run: true });
  await H.walkTo(2.6, -26.4, { run: true });
  g1 = await gh(); log('past the P1 valve', JSON.stringify(g1));
  await H.face(2.6, -28, 1.15); await sleep(150); await p.key('KeyE'); await sleep(400);
  const vOn = await G('mn.posts.get("K_P1A").on'); check(vOn, 'the P1 valve turns');
  await shot('p1-valve');
  const ok = await H.walkTo(2.6, 1.2, { run: true });
  g1 = await gh(); log('at the mouth', JSON.stringify(g1), 'tasks', await G('g.state.tasks.slice(-2)'));
  check(ok && (await G('g.state.tasks.includes("T_ESCAPE")')), 'the way to the watertight door is free (T_ESCAPE)');
  check(pageErrs().length === 0, 'no page errors');
  log(fails.length ? `RESULT FAIL ${fails.length}: ${fails.join(' / ')}` : 'RESULT PASS');
};
