// Off-route play: the wrong things a player tries, each answered with a reason and never a dead end (headless, real keys).
//   node tools/probe.mjs --qa --out D:/minase-stages/offroute --steps tools/play/offroute.mjs
// Starts from the title (the first part) and then jumps between test scenes (?scene=<id>, nothing saved).
import { helpers } from './lib.mjs';

export default async (api) => {
  const { p, G, sleep, log, shot, base } = api, H = helpers(api);
  const say = () => G(`[...document.querySelectorAll('.tl-say, .gf-say, #say, .say, [class*="thought"], .gf-mono')].filter((e) => e.offsetParent).map((e) => e.textContent.trim()).filter(Boolean).slice(-2).join(' / ')`);
  const tryE = async (x, z, y, tag) => { await H.face(x, z, y); await sleep(250); const pr = await H.prompt(); await p.key('KeyE'); await sleep(900); const s = await say(); await shot(tag); log(`  ${tag} | prompt: ${pr} | says: ${s}`); await H.idle(); };
  const scene = async (id) => { await p.goto(`${base}?qa=1&scene=${id}`); await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 60000); await sleep(2500); await H.idle(); log(`scene ${id}`, JSON.stringify(await H.pos())); };
  const gh = () => G('({ mode: mn.gh.mode, s: +mn.gh.s.toFixed(1), me: +mn.project(g.camera.position.x, g.camera.position.z).s.toFixed(1), wait: +mn.gh.wait.toFixed(1), hidden: !!g.hidden, deaths: mn.deaths || 0 })');

  // 1. the very start: the chained front door before talking to ひなた
  await G(`(document.getElementById('start-btn').click(), 1)`); await sleep(1800); await H.idle(); await sleep(400);
  await H.walkTo(3.0, 24.5); await tryE(3.0, 25.65, 1.1, 'front-before-hina');
  // 2. the fire door to the basement with no key; the stairs before the chart
  await scene('karte'); await H.door(3, 15, 3, 16.5); await H.walkTo(16.0, 16.5); await tryE(16, 15, 1.2, 'kaidan-door');
  // 3. the watertight door before the generator; the lamp box before the door
  await scene('broka'); await H.route([[3.0, 7.5], [3.0, 3.5], [2.6, 1.0]]); await tryE(2.6, -1, 1.2, 'bousui-before-gen');
  await scene('pump'); await H.walkTo(4.6, 11.4); await tryE(5.95, 11.4, 1.3, 'pump-panel-early');
  // 4. standing up in the low passage (the pipes); running there
  await scene('p2'); await p.key('KeyW', 'down'); await sleep(1500); await p.key('KeyW', 'up'); log('  p2 standing', JSON.stringify(await H.pos())); await shot('p2-stand');
  // 5. the gate while she is behind it
  await scene('gate'); await H.walkTo(-9.6, -81.8); await sleep(1500); await tryE(-4.0, -81.8, 1.3, 'gate-while-she-is-there'); await H.idle(); await sleep(3000); await H.idle();
  // 6. the jar room's other things; the jar cabinet from the side
  // 7. the chase: hide in a locker on its step in the water passage, then come out
  await scene('escape-p3'); await sleep(1500); await shot('chase-start');
  const hide = await G(`(() => { const c = g.camera.position; let best = null; for (const it of g.world.interactables || []) { const u = it.userData && it.userData.interact; if (!u || !/hide/.test(u.kind || '')) continue; const w = it.getWorldPosition(new it.position.constructor()); const d = Math.hypot(w.x - c.x, w.z - c.z); if (!best || d < best.d) best = { x: w.x, z: w.z, y: w.y, d, id: u.id }; } return best; })()`);
  log('  nearest locker', JSON.stringify(hide));
  if (hide && hide.d < 30) {
    await H.walkTo(-17.6, hide.z, { run: true }); await tryE(hide.x, hide.z, 1.0, 'hide');
    for (let i = 0; i < 9; i++) { await sleep(1000); }
    log('  hidden', JSON.stringify(await gh())); await shot('hidden');
    await p.key('KeyE'); await sleep(1200); await H.idle();
    log('  out', JSON.stringify(await gh()));
  }
  // 8. caught: stand still and let her come (back to the checkpoint, the valves as they were)
  await scene('escape-p3'); const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const s = await gh(); if (s.deaths) { log('  caught', JSON.stringify(s)); break; } await sleep(700); }
  await sleep(1500); await shot('caught');
  await H.idle(6000); log('  after caught', JSON.stringify(await H.pos()), JSON.stringify(await gh()), await G('g.state.inv.includes("JAR")')); await shot('after-caught');
  // 9. the drain (return) before the thinking; the hearse doors before the ledger
  await scene('jimu'); await H.walkTo(9.0, 10.6); await tryE(9.0, 11.6, 0.15, 'return-before-think');
  await scene('jimu'); await H.door(9, 9, 9, 7.5); await H.walkTo(10.0, 7.5); await H.door(10, 6, 10.4, 4.0); await H.walkTo(12.6, 3.0); await tryE(13.9, 3.0, 1.1, 'hearse-before');
  // 10. the think: three wrong answers (the water rises; the third drowns, back to the desk)
  await scene('think'); await G(`(window.__gfQ = ['ren', 'ren', 'ren', 'ren', 'ren', 'ren'], Object.getOwnPropertyDescriptor(window, '__gfChoice') || Object.defineProperty(window, '__gfChoice', { configurable: true, get() { return (window.__gfQ || []).shift(); } }), 1)`);
  await H.walkTo(8.0, 13.4); await H.use(7.2, 14.5, 0.75); await sleep(1500); await shot('think-wrong'); await H.idle(5000);
  log('  after wrong answers', JSON.stringify({ deaths: await G('mn.deaths || 0'), wrong: await G('mn.wrong'), tasks: await G('g.state.tasks.slice(-2)'), pos: await H.pos() }));
  // 11. the front door with the jar but before the end: the choice (the give ending) offered, refused here
  await scene('give'); await G(`(window.__gfQ = ['no'], Object.getOwnPropertyDescriptor(window, '__gfChoice') || Object.defineProperty(window, '__gfChoice', { configurable: true, get() { return (window.__gfQ || []).shift(); } }), 1)`); await tryE(3.0, 25.65, 1.1, 'give-refuse'); log('  ended?', await G('g.state.ended'));
};
