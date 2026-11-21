// The radio mini game (T_RADIO, kit mg-tune-radio) with a real finger drag (CDP touch): the knob must not move while the caption changes,
// and the value must follow the finger smoothly (no hunting: no back-and-forth while the finger turns one way).
//   node tools/probe.mjs --public [--path dot-fps/] --mobile --size 390x844 --out <dir> --steps tools/dot/radio-drag-steps.mjs
export default async (api) => {
  const { p, G, sleep, log, shot } = api;
  await sleep(2000);
  await G(`(([...document.querySelectorAll('.ph-sheet button')].find((b) => /このまま/.test(b.textContent)) || { click() {} }).click(), 1)`); await sleep(300);
  await G(`(document.getElementById('start-btn').click(), 1)`); await sleep(3000);
  for (let i = 0; i < 10; i++) { const any = await G(`(() => { const b = [...document.querySelectorAll('.wm-win button')].find((x) => /歩き出す|閉じる|次へ/.test(x.textContent)); if (b) { b.click(); return true; } return false; })()`); if (!any) break; await sleep(600); }
  await G(`(window.__radio = g.runMinigame(g.data.tasks.find((t) => t.id === 'T_RADIO')), 1)`); await sleep(1200);
  await shot('radio-open');
  const k = await G(`(() => { const r = document.querySelector('.mgx-radio-knob').getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: document.querySelector('.mgx-radio-knob').offsetWidth / 2 }; })()`);
  if (!k) { log('radio', 'NO KNOB'); return; }
  const R = k.r * 0.6, rows = [];
  let a = -Math.PI / 2;
  await p.touch('start', k.cx + R * Math.cos(a), k.cy + R * Math.sin(a));
  const dir = (await G(`+document.querySelector('.mgx-radio-knob').getAttribute('aria-valuenow')`)) < 50 ? 1 : -1;
  for (let i = 0; i < 60; i++) {
    a += dir * 0.12;
    await p.touch('move', k.cx + R * Math.cos(a), k.cy + R * Math.sin(a)); await sleep(40);
    rows.push(await G(`(() => { const kn = document.querySelector('.mgx-radio-knob'), r = kn.getBoundingClientRect(); return [+kn.getAttribute('aria-valuenow'), Math.round(r.top + r.height / 2), document.querySelector('.mgx-radio-heard').textContent.slice(0, 6)]; })()`));
    if (i === 30) await shot('radio-mid');
  }
  await p.touch('end');
  const tops = new Set(rows.map((r) => r[1])), texts = new Set(rows.map((r) => r[2]));
  let back = 0; for (let i = 2; i < rows.length; i++) if (Math.sign(rows[i][0] - rows[i - 1][0]) === -dir) back++;
  log('radio', { knobTops: [...tops], captions: [...texts], values: rows.map((r) => r[0]).join(','), backSteps: back, result: tops.size === 1 && back === 0 ? 'PASS' : 'FAIL' });
  await shot('radio-end');
  await G(`((document.querySelector('.mgx-close') || { click() {} }).click(), 1)`); await sleep(500);
};
