// The title and the first minute on any size (node tools/probe.mjs --public --path dot-fps/ --out <dir> --steps tools/dot/title-steps.mjs [--mobile --size 390x844]).
// Also run on / to see the link to the dot version on the normal title.
import { helpers } from '../play/lib.mjs';
export default async (api) => {
  const { G, sleep, shot, log } = api, H = helpers(api);
  await sleep(1500); await shot('title');
  log('buttons', await G(`[...document.querySelectorAll('#title button, .title button, button')].filter((b) => b.offsetParent).map((b) => b.textContent.trim()).filter(Boolean).slice(0, 12)`));
  await G(`(document.getElementById('start-btn').click(), 1)`);
  await sleep(2500); await shot('opening');
  await H.idle(); await sleep(600); await shot('start');
  await H.walkTo(1.9, 21.8); await H.face(1.0, 21.2, 1.2); await sleep(500); await shot('hinata');
};
