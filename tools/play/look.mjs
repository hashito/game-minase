// Screenshots from given spots (1.8.0): LOOK="name:x,z,tx,tz[,ty[,floor[,crouch]]];..." - stand at x / z, look at tx / tz (height ty above the
// floor, default 1.0), on floor (default 0); crouch 1 = crouched. LOOK_JS: an expression run first (after the start).
//   node tools/probe.mjs --public --path dot-fps/ --query "qa=1&scene=hyohon" --out <dir> --steps tools/play/look.mjs [--mobile --size 390x844]
import { helpers } from './lib.mjs';
export default async (api) => {
  const { G, sleep, log, shot } = api, H = helpers(api);
  await sleep(1500);
  await G(`(([...document.querySelectorAll('.ph-sheet button, #gf-rotate button')].find((b) => /このまま/.test(b.textContent)) || { click() {} }).click(), 1)`); await sleep(300);
  await G(`(document.getElementById('start-btn').click(), 1)`); await sleep(4000); await H.idle(); await sleep(800);
  if (process.env.LOOK_JS) { log('js', await G(process.env.LOOK_JS)); await sleep(1500); await H.idle(); }
  for (const spot of (process.env.LOOK || '').split(';').filter(Boolean)) {
    const [name, rest] = spot.split(':'); const [x, z, tx, tz, ty = 1.0, fl = 0, cr = 0] = rest.split(',').map(Number);
    await G(`(g.teleport({ x: ${x}, z: ${z}, floor: ${fl} }), ${cr ? 'g.fp.crouching = true,' : ''} 1)`); await sleep(900);
    await H.face(tx, tz, ty); await sleep(1200);
    await shot(name);
  }
};
