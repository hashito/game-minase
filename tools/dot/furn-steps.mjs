// Every desk, shelf, bed, bench and gurney of /dot-fps from three angles (front, front-left, front-right), the camera looking at its top.
//   node tools/probe.mjs --public --path dot-fps/ --query "qa=1" --out <dir> --steps tools/dot/furn-steps.mjs   (FURN=F_JI_DESK,F_RE_BED for some)
import fs from 'node:fs';
export default async ({ p, G, sleep, log, shot }) => {
  await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 120000);
  await sleep(2500);
  await G(`(document.querySelectorAll('.wm-layer .btn.primary').forEach((b) => b.click()), 1)`);
  await G(`(document.head.appendChild(Object.assign(document.createElement('style'), { textContent: '#guide,#objective,#gf-goal-chip,.sg-layer,#say,.tl-lane,#hint-toast,.toast,#gf-ch,#prompt,#hud{visibility:hidden !important}' })), 1)`);
  const plan = JSON.parse(fs.readFileSync('data/plan.json', 'utf8'));
  const want = process.env.FURN ? process.env.FURN.split(',') : null;
  const KINDS = /desk|bed|bench|shelf|fileRack|filingCabinet|bodyCabinets|crate|drum/i;
  const furn = (await G(`window.__dot.furniture`)).filter((f) => f.box && (want ? want.includes(f.id) : KINDS.test((plan.furniture.find((x) => x.id === f.id) || {}).kind || '')));
  let i = 0;
  for (const f of furn) {
    const pf = plan.furniture.find((x) => x.id === f.id), r = plan.rooms.find((x) => x.id === pf.room);
    const [x0, y0, z0, x1, y1, z1] = f.box, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, top = y1;
    const face = ((pf.rot || 0) * Math.PI) / 180;
    for (const [tag, da] of [['front', 0], ['left', -0.75], ['right', 0.75]]) {
      const a = face + da, d = 1.3 + Math.max(x1 - x0, z1 - z0) * 0.5;
      let x = cx + Math.sin(a) * d, z = cz + Math.cos(a) * d;
      x = Math.max(r.x + 0.3, Math.min(r.x + r.w - 0.3, x)); z = Math.max(r.z + 0.3, Math.min(r.z + r.d - 0.3, z));
      await G(`(g.teleport({ x: ${x}, z: ${z}, floor: ${r.floor} }), 1)`); await sleep(300);
      await G(`(() => { const c = g.camera.position; g.fp.yaw = Math.atan2(-(${cx} - c.x), -(${cz} - c.z)); g.fp.pitch = Math.atan2(${top} - c.y, Math.hypot(${cx} - c.x, ${cz} - c.z)); })()`);
      await sleep(400);
      await shot(`${String(++i).padStart(3, '0')}-${f.id}-${tag}`);
    }
  }
  log('furniture', furn.map((f) => f.id).join(' '));
};
