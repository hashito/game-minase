// Every prop of dot/data/props.json in a screenshot (PROPS=m2 for the helper's parts only): stand in front of it where it faces, look at it.
//   node tools/probe.mjs --public --path dot-fps/ --query "qa=1&scene=genkan" --out <dir> --steps tools/dot/props-steps.mjs
import fs from 'node:fs';
export default async ({ p, G, sleep, log, shot }) => {
  await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 120000);
  await sleep(2500);
  await G(`(document.querySelectorAll('.wm-layer .btn.primary').forEach((b) => b.click()), 1)`);
  const plan = JSON.parse(fs.readFileSync('data/plan.json', 'utf8'));
  const all = JSON.parse(fs.readFileSync('dot/data/props.json', 'utf8')).props;
  const list = process.env.PROPS === 'm2' ? all.filter((x) => x.m2) : all;
  log('report', await G(`window.__dot.props.filter((x) => x.missing || (x.mount && x.mount !== 'floor')).map((x) => [x.k, x.room, x.mount, x.wallAt, x.missing ? 'MISSING' : ''].join(' '))`));
  await G(`(document.head.appendChild(Object.assign(document.createElement('style'), { textContent: '#guide,#objective,.sg-layer,#say,.tl-lane,#hint-toast,.toast{visibility:hidden !important}' })), 1)`);
  let i = 0;
  for (const q of list) {
    const r = plan.rooms.find((x) => x.id === q.room), f = q.face || 0, back = q.mount === 'ceiling' ? 1.6 : q.mount === 'wall' ? 1.5 : 1.7;
    let x = q.x + Math.sin(f) * back, z = q.z + Math.cos(f) * back;
    x = Math.max(r.x + 0.35, Math.min(r.x + r.w - 0.35, x)); z = Math.max(r.z + 0.35, Math.min(r.z + r.d - 0.35, z));
    await G(`(g.teleport({ x: ${x}, z: ${z}, floor: ${r.floor} }), 1)`); await sleep(350);
    const ty = q.mount === 'ceiling' ? 2.6 : q.mount === 'wall' ? (q.y || 0) + 0.3 : 0.4;
    await G(`(() => { const c = g.camera.position; g.fp.yaw = Math.atan2(-(${q.x} - c.x), -(${q.z} - c.z)); g.fp.pitch = Math.atan2(${ty} + g.world.floorY(${r.floor}) - c.y, Math.hypot(${q.x} - c.x, ${q.z} - c.z)); })()`);
    await sleep(450);
    await shot(`${String(++i).padStart(2, '0')}-${q.room}-${q.k}`);
  }
};
