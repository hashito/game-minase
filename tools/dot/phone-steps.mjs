// /dot-fps on a phone: the title, the sideways notice (upright only), the 目的 chip shut and open, a document and a look in the kit's reading
// panel, the menu's 画面 tab, and what covers the view (HUD coverage of the canvas):
//   node tools/probe.mjs --public --path dot-fps/ --mobile --size 844x390 --out <dir> --steps tools/dot/phone-steps.mjs   (also 667x375, 390x844)
import { helpers } from '../play/lib.mjs';
export default async (api) => {
  const { p, G, sleep, log, shot } = api, H = helpers(api);
  await sleep(2000);
  log('phone', await G(`({ phone: document.documentElement.dataset.phone || '', upright: document.documentElement.hasAttribute('data-ph-upright'), sheet: !!document.querySelector('.ph-turn-sheet') })`));
  await shot('title');
  // keep it as it is (upright) or nothing to close
  await G(`(([...document.querySelectorAll('.ph-sheet button')].find((b) => /このまま/.test(b.textContent)) || { click() {} }).click(), 1)`); await sleep(300);
  await G(`(document.getElementById('start-btn').click(), 1)`); await sleep(2500);
  await H.idle(); await sleep(800);
  const cover = () => G(`(() => { const W = innerWidth, Hh = innerHeight, c = document.createElement('canvas'); let n = 0, tot = 0; const sel = ['#hud-left', '.ph-goal', '.tl-lane .tl-item', '#say', '#prompt', '#t-right', '#t-stick', '.hud-tc', '.pg-hud', '#guide', '.gf-hud-slot', '#menu-btn', '[data-hud-part]']; const boxes = []; for (const s of sel) for (const e of document.querySelectorAll(s)) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || e.hidden || !e.offsetParent && cs.position !== 'fixed') continue; const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue; boxes.push([s, r.x | 0, r.y | 0, r.width | 0, r.height | 0]); } for (let y = 0; y < Hh; y += 8) for (let x = 0; x < W; x += 8) { tot++; if (boxes.some(([, bx, by, bw, bh]) => x >= bx && x < bx + bw && y >= by && y < by + bh)) n++; } const ov = []; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], b = boxes[j]; if (a[0] === b[0]) continue; const ix = Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1])), iy = Math.max(0, Math.min(a[2] + a[4], b[2] + b[4]) - Math.max(a[2], b[2])); if (ix * iy > 200) ov.push(a[0] + ' x ' + b[0]); } return { covered: Math.round(n / tot * 100) + '%', boxes: boxes.map((b) => b.join(' ')), overlaps: [...new Set(ov)] }; })()`);
  log('hud', await cover()); await shot('play');
  await G(`(document.querySelector('.ph-goal') || { click() {} }).click(), 1`); await sleep(500);
  log('hud-open', await cover()); await shot('goal-open');
  await G(`(document.querySelector('.ph-goal') || { click() {} }).click(), 1`); await sleep(300);
  // a document on the wall
  await G(`(g.teleport({ x: 1.2, z: 21.0, floor: 1 }), 1)`); await sleep(500); await H.face(0.3, 21.0, 1.5); await sleep(300);
  await p.key('KeyE'); await sleep(1300); await shot('read-doc');
  await H.idle(); await sleep(1200); await shot('after-doc');
  // a look
  await G(`(g.teleport({ x: 4.4, z: 21.4, floor: 1 }), 1)`); await sleep(500); await H.face(4.4, 20.4, 0.1); await sleep(300);
  await p.key('KeyE'); await sleep(1300); await shot('read-look');
  await H.idle(); await sleep(500);
  // the menu: 画面 and the reads tab
  await G(`([...document.querySelectorAll('button')].find((b) => b.offsetParent && /メニュー/.test(b.getAttribute('aria-label') || b.textContent)) || document.querySelector('#menu-btn, .hud-menu') || { click() {} }).click(), 1`); await sleep(700);
  await G(`(([...document.querySelectorAll('.tm-tabs button, [role=tab]')].find((b) => /画面/.test(b.textContent))) || { click() {} }).click(), 1`); await sleep(500); await shot('menu-screen');
  await G(`(([...document.querySelectorAll('.tm-tabs button, [role=tab]')].find((b) => /読んだ|覚え書き/.test(b.textContent))) || { click() {} }).click(), 1`); await sleep(500); await shot('menu-reads');
  await H.idle();
};
