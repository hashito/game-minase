// a first look at /dot-fps: the title, the start, the dot layer's report, a few views (node tools/probe.mjs --public --path dot-fps/ --steps tools/dot/first-steps.mjs)
export default async function ({ G, shot, sleep, log, p }) {
  await shot('title');
  log('dot', await G(`({ t: window.__dot.timings, furniture: window.__dot.furniture.filter(f=>f.skipped||f.empty).map(f=>f.id), items: window.__dot.items, props: window.__dot.props.filter(p=>p.missing), font: window.__dot.font, photos: window.__dot.photos })`));
  await G(`document.getElementById('start-btn').click()`);
  await sleep(4000);
  for (let i = 0; i < 6; i++) { if (!(await G('g.blocked()'))) break; await G(`(document.querySelector('.wm-layer .btn.primary, [role=dialog] .btn.primary') || {click(){}}).click()`); await sleep(1200); }
  await shot('start');
  log('state', await G(`({ room: g.state.room, pos: [g.camera.position.x, g.camera.position.z], hina: mn.hinaAt, hp: window.__dot.hinaPose })`));
  await G(`(() => { const h = mn.hina.root.position, c = g.camera.position; g.fp.yaw = Math.atan2(-(h.x - c.x), -(h.z - c.z)); g.fp.pitch = -0.05; })()`);
  await sleep(800); await shot('hina');
}
