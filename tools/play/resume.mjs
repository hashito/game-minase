// Resume: play to the hashiri (charms peeled, the candlestick taken), reload, "つづきから", and check the world agrees with the save.
//   node tools/probe.mjs --qa --out D:/minase-stages/resume --steps tools/play/resume.mjs
import { helpers } from './lib.mjs';
export default async (api) => {
  const { p, G, sleep, log, shot, base } = api, H = helpers(api);
  const st = () => G('({ tasks: g.state.tasks.join(" "), inv: g.state.inv.join(" "), fuda: kc.fuda, peeled: kc.peeled.join(" "), room: g.state.room, pos: [g.camera.position.x.toFixed(1), g.camera.position.z.toFixed(1)].join(",") })');
  await G(`(document.getElementById('start-btn').click(), 1)`); await sleep(1800); await H.idle(); await sleep(400);
  await H.walkTo(3.6, 23.4); await H.walkTo(4.9, 23.2); await H.use(5.7, 22.5, 1.0); await H.idle();
  await H.walkTo(4.2, 21.2); await H.use(4.43, 20.08, 1.45, { wait: 1400 }); await H.idle();
  await H.walkTo(3.8, 21.4); await H.use(2.98, 21.4, 1.35); await H.idle(); await H.use(2.98, 21.4, 1.35, { wait: 1400 }); await H.idle();
  await H.walkTo(3.6, 22.8); await H.walkTo(1.4, 21.2); await H.use(1.88, 20.08, 1.45, { wait: 1400 }); await H.idle();
  await H.walkTo(1.3, 19.2); await H.walkTo(1.5, 17.7); await H.use(2.25, 17.7, 1.0); await H.idle();
  await sleep(1500); const a = await st(); log('before', JSON.stringify(a)); await shot('before-reload');
  await p.goto(base + '?qa=1'); await p.waitFor("document.getElementById('continue-btn') && !document.getElementById('start-btn').disabled", 120000);
  await shot('title-continue');
  await G(`(document.getElementById('continue-btn').click(), 1)`); await sleep(2500); await H.idle();
  const b = await st(); log('after', JSON.stringify(b)); await shot('after-resume');
  for (const k of ['tasks', 'inv', 'fuda', 'peeled']) log(k, a[k] === b[k] ? 'same' : `DIFF ${a[k]} -> ${b[k]}`);

};
