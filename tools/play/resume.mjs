// Resume: play the first part (ひなた, the door, the key, the chart), reload, "つづきから", and check the world agrees with the save.
// Then the same in the passage: a test of the valves and the chase is in full.mjs / offroute.mjs.
//   node tools/probe.mjs --qa --out D:/minase-stages/resume --steps tools/play/resume.mjs
import { helpers } from './lib.mjs';
export default async (api) => {
  const { p, G, sleep, log, shot, base } = api, H = helpers(api);
  const st = () => G('({ tasks: g.state.tasks.join(" "), inv: g.state.inv.join(" "), flags: g.state.flags.filter((f) => !/^seen|^ev_/.test(f)).join(" "), room: g.state.room, hina: mn.hinaAt, pos: [g.camera.position.x.toFixed(1), g.camera.position.z.toFixed(1)].join(",") })');
  await G(`(document.getElementById('start-btn').click(), 1)`); await sleep(1800); await H.idle(); await sleep(400);
  await H.walkTo(1.9, 21.8); await H.use(1.0, 21.2, 1.0); await H.idle();
  await H.walkTo(3.0, 24.5); await H.use(3.0, 25.65, 1.1); await H.idle();
  await H.route([[4.6, 22.1], [14.9, 22.1], [15.2, 24.6]]); await H.door(16, 24.6, 17.2, 24.6);
  await H.route([[18.0, 22.0], [19.0, 20.0]]); await H.use(19.95, 20, 1.3); await H.idle();
  await H.route([[18.0, 22.0], [17.2, 24.6], [15.2, 24.6], [11.0, 22.1], [11.0, 16.5], [3.0, 16.5]]);
  await H.door(3, 15, 3, 13.6); await H.walkTo(4.6, 12.0); await H.use(5.55, 12.0, 0.8); await H.idle();
  await sleep(1500); const a = await st(); log('before', JSON.stringify(a)); await shot('before-reload');
  await p.goto(base + '?qa=1'); await p.waitFor("document.getElementById('continue-btn') && !document.getElementById('start-btn').disabled", 120000);
  await shot('title-continue');
  await G(`(document.getElementById('continue-btn').click(), 1)`); await sleep(2500); await H.idle();
  const b = await st(); log('after', JSON.stringify(b)); await shot('after-resume');
  for (const k of ['tasks', 'inv', 'flags', 'hina']) log(k, a[k] === b[k] ? 'same' : `DIFF ${a[k]} -> ${b[k]}`);
};
