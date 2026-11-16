// Screenshots of every test scene: node tools/probe.mjs --out D:/minase-stages/tour --steps tools/play/tour.mjs [--size 390x844 --mobile]
// TOUR=omote,choba picks scenes; TOUR_TURN=1 also shoots the opposite direction.
import { SCENES } from '../../js/ext/test-scenes.js';
export default async ({ p, G, sleep, log, shot, base }) => {
  const pick = (process.env.TOUR || '').split(',').filter(Boolean);
  for (const sc of SCENES) {
    if (pick.length && !pick.includes(sc.id)) continue;
    await p.goto(`${base}?scene=${sc.id}${process.env.TOUR_Q || ''}`);
    await p.waitFor("window.__game && window.__game.state && window.__game.state.started", 120000);
    await sleep(2500);
    await G(`(document.querySelectorAll('.wm-layer .btn.primary').forEach((b) => b.click()), 1)`);
    await sleep(600);
    log(sc.id, await G(`({ room: g.state.room, floor: g.floor, tasks: g.state.tasks.length, prompt: document.getElementById('prompt').textContent })`));
    await shot(sc.id);
    if (process.env.TOUR_TURN) { await G(`(g.fp.yaw += Math.PI, 1)`); await sleep(500); await shot(`${sc.id}-back`); }
  }
};
