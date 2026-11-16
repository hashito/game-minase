// Off-route play: the wrong things a player tries, each answered with a reason and never a dead end (headless, real keys).
//   node tools/probe.mjs --qa --out D:/minase-stages/offroute --steps tools/play/offroute.mjs
// Starts from the title (the first part) and then jumps between test scenes (?scene=<id>, nothing saved).
import { helpers } from './lib.mjs';

export default async (api) => {
  const { p, G, sleep, log, shot, base } = api, H = helpers(api);
  const say = () => G(`[...document.querySelectorAll('.tl-say, .gf-say, #say, .say, [class*="thought"]')].filter((e) => e.offsetParent).map((e) => e.textContent.trim()).filter(Boolean).slice(-2).join(' / ')`);
  const tryE = async (x, z, y, tag) => { const pr = await H.use(x, z, y); await sleep(700); log(`  ${tag} | prompt: ${pr} | says: ${await say()}`); await shot(tag); };
  const scene = async (id) => { await p.goto(`${base}?qa=1&scene=${id}`); await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 60000); await sleep(2500); await H.idle(); log(`scene ${id}`, JSON.stringify(await H.pos())); };

  // 1. the very start: the front door, a door charm before talking to Haru, the back of the shop
  await G(`(document.getElementById('start-btn').click(), 1)`); await sleep(1800); await H.idle(); await sleep(400);
  await tryE(0.2, 24.6, 1.2, 'front-door');
  await H.walkTo(3.6, 23.2); await H.walkTo(4.2, 21.2);
  await tryE(4.43, 20.08, 1.45, 'peel-before-haru');
  // 2. the dark: the passage door with no light
  await scene('muro');
  await H.walkTo(2.8, 0.2); await tryE(3.18, -0.92, 1.45, 'passage-no-light');
  await tryE(5.2, 1.6, 1.0, 'light-at-kiln');
  // 3. Haru without the comb
  await scene('naka'); await H.walkTo(3.6, 21.6); await H.walkTo(4.9, 23.2); await tryE(5.7, 22.5, 1.0, 'haru-no-comb');
  // 4. the gate charm while she is behind it
  await scene('gate'); await H.walkTo(-9.0, -81.8); await sleep(4000); await H.idle(); await H.walkTo(-5.0, -81.8); await tryE(-4.08, -81.12, 1.45, 'gate-peel'); await shot('gate-view');
  // 5. the chase: hide in a charmed cupboard in the water passage, then come out
  await scene('escape-p3'); await sleep(2000); await shot('chase-start');
  await H.walkTo(-17.6, -66.0); await tryE(-16.95, -66, 1.0, 'hide');
  for (let i = 0; i < 8; i++) { await sleep(1000); }
  log('  hidden', await G('({ hidden: g.hidden, gh: kc.gh.mode, s: kc.gh.s.toFixed(1), wait: kc.gh.wait.toFixed(1) })')); await shot('hidden');
  await p.key('KeyE'); await sleep(1200); await H.idle();
  log('  out', await G('({ hidden: g.hidden, room: g.state.room, deaths: g.state.deaths || 0 })'));
  // 6. caught: stand still and let her come (back to the checkpoint, nothing lost)
  await scene('escape-p3'); const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const s = await G('({ room: g.state.room, z: g.camera.position.z, deaths: g.state.deaths || 0, over: !!document.querySelector(".gf-dead, .death, [class*=dead]:not([hidden])") })'); if (s.deaths || s.over) { log('  caught', JSON.stringify(s)); break; } await sleep(1000); }
  await sleep(1500); await shot('caught');
  await H.idle(4000); log('  after caught', JSON.stringify(await H.pos()), await G('({ comb: g.state.inv.includes("COMB"), fuda: kc.fuda })')); await shot('after-caught');
  // 7. the bench before the hatch is sealed / the return before the thinking
  await scene('bench'); await H.walkTo(6.6, 1.0); await tryE(6.6, -0.5, 0.1, 'return-before-think');
};
