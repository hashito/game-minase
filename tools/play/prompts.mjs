// The game's own answers in place of the kit's generic lines: the charmed door prompt, [E] at Haru without the comb, other "not yet" stations.
//   node tools/probe.mjs --qa --out D:/minase-stages/prompts-pc --steps tools/play/prompts.mjs [--size 390x844 --mobile]
import { helpers } from './lib.mjs';
export default async (api) => {
  const { p, G, sleep, log, shot, base } = api, H = helpers(api);
  const said = () => G(`[...document.querySelectorAll('#thought, .tl-say, .tl-thought, [class*=thought], [class*=say]')].filter((e) => e.offsetParent && e.textContent.trim()).map((e) => e.textContent.trim()).slice(-1).join(' / ')`);
  const scene = async (id) => { await p.goto(`${base}?qa=1&scene=${id}${process.env.MQ || ''}`); await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 60000); await sleep(2500); await H.idle(); await sleep(6000); };
  const look = async (x, z, y, tag, press = true) => { await H.face(x, z, y); await sleep(500); const pr = await H.prompt(); await shot(`${tag}-prompt`); let s = ''; if (press) { await p.key('KeyE'); await sleep(900); s = await said(); await shot(`${tag}-answer`); } log(`${tag} | ${pr} | ${s}`); return pr; };
  const GENERIC = /まだ、この作業には進めません|先に済ませることがある|いまは、まだできません|鍵がかかっている|いまは使えません|いまは開きません/;
  let bad = 0; const chk = (s) => { if (GENERIC.test(s || '')) { bad++; log('  GENERIC!'); } };
  // the charmed door (奥の間 -> 渡り廊下) and Haru without the comb
  await scene('oku'); await H.walkTo(5.3, 7.6); chk(await look(5.0, 6.5, 1.0, 'charm-door', false));
  await scene('naka'); await H.walkTo(3.6, 21.6); await H.walkTo(4.9, 23.2); chk(await look(5.7, 22.5, 1.0, 'haru-no-comb')); chk(await said());
  // the bench and the hatch before their time, the ladder while the hatch is sealed
  await scene('bench'); await H.walkTo(6.6, 1.0); chk(await look(6.6, -0.5, 0.1, 'ladder-sealed')); chk(await said());
  await scene('sagyo'); await H.walkTo(1.6, 2.2); chk(await look(0.75, 2.2, 0.9, 'bench-early')); chk(await said());
  log('generic lines seen:', bad);
};
