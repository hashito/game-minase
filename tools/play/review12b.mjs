// 1.2.0 screenshot review, part two: what needs a story state. One script, a branch per test scene (?scene=...).
//   for s in uke karte pump p2 escape; do node tools/probe.mjs --out D:/minase-stages/review12b-$s --query "scene=$s" --steps tools/play/review12b.mjs; done
import { helpers } from './lib.mjs';

export default async (api) => {
  const { p, G, sleep, log, shot } = api, H = helpers(api);
  await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 60000);
  await sleep(2500); await H.idle();
  const scene = await G('new URLSearchParams(location.search).get("scene")');
  const tp = async (x, z, floor) => { await G(`(g.teleport({ x: ${x}, z: ${z}, floor: ${floor} }), 1)`); await sleep(500); };
  const lookE = async (name, x, z, y) => { await H.face(x, z, y); await sleep(300); log(name, 'prompt', await H.prompt()); await p.key('KeyE'); await sleep(1300); await shot(name); };
  const crouch = async (on) => { if (!!(await G('g.fp.crouching')) !== on) { await p.key('KeyC'); await sleep(400); } };
  if (scene === 'uke') {
    await tp(2.2, 24.4, 1); await lookE('kuroki-at-door', 1.6, 25.85, 1.2); await H.idle(8000);
    await tp(15.0, 21.4, 1); await lookE('uke-window-look', 16.0, 21.2, 1.5); await sleep(2500); await shot('uke-window-card-late'); await H.idle(4000);
    await tp(9.2, 16.5, 1); await H.door(9, 15, 9, 13.6).catch(() => {}); await tp(8.8, 10.6, 1); await lookE('sink-look', 8.8, 9.2, 1.0);
    await H.idle(4000); await tp(8.8, 10.6, 1); await H.face(8.8, 9.0, 1.45); await sleep(500); await shot('sink-mirror');
    await tp(16.8, 12.2, 1); await H.face(18.0, 9.0, 1.1); await sleep(500); await shot('kaidan-lift');
    // the photo viewer of the menu (an item with a picture: the key from the keybox)
    await G('(g.openPause(), 1)'); await sleep(500);
    const it = await G(`(() => { const b = [...document.querySelectorAll('button, [role=button]')].find((x) => /持ち物|アイテム|もちもの/.test(x.textContent)); if (b) b.click(); return b ? b.textContent : null; })()`);
    log('items tab', it); await sleep(700); await shot('menu-items');
    await G(`(() => { const b = document.querySelector('.iv-photo, .inv-item, .ii-row, [data-item]'); if (b) b.click(); return 1; })()`); await sleep(700); await shot('menu-item-photo');
  }
  if (scene === 'karte') {
    await H.walkTo(4.6, 12.0); await lookE('doc-chart', 5.55, 12.0, 0.8); await sleep(800); await shot('doc-chart-2');
    await p.setViewport && (await p.setViewport(390, 844)); await sleep(600); await shot('doc-chart-phone');
  }
  if (scene === 'pump') {
    log('hina', JSON.stringify(await G('({ at: mn.hinaAt, pose: mn.hina && mn.hina.state, x: mn.hina.root.position.x, z: mn.hina.root.position.z })')));
    await tp(3.4, 12.2, 0); await H.face(5.72, 12.55, 0.9); await sleep(800); await shot('hina-leaning');
    await lookE('hina-talk', 5.72, 12.55, 1.0); await H.idle(6000);
    await lookE('hina-talk-2', 5.72, 12.55, 1.0); await H.idle(6000);
  }
  if (scene === 'p2') {
    await tp(2.6, -36.0, 0); await H.face(2.6, -28, 1.2); await sleep(400);
    await tp(2.6, -24.8, 0); await H.face(2.6, -28.0, 1.3); await sleep(600); await shot('valve-lamps-usable');
    await tp(2.6, -40.4, 0); await H.face(-2.0, -41.8, 0.9); await sleep(800); await shot('p2-entrance-hint');
    await H.walkTo(2.6, -41.8, { near: 0.4 }); await H.face(-4, -41.8, 1.0); await p.key('KeyW', 'down'); await sleep(1500); await p.key('KeyW', 'up');
    log('standing push', JSON.stringify(await H.pos())); await shot('p2-standing-bump');
    await crouch(true); await H.walkTo(-4.0, -41.8, { near: 0.4 }); await H.face(-7.5, -41.8, 0); await sleep(500); await shot('p2-hands-crouched');
    await H.walkTo(-11.0, -41.8, { near: 0.4 }); await H.face(-12.9, -41.75, 1.0); await sleep(500); await shot('p2-hair');
  }
  if (scene === 'escape-p3') {
    const gh = () => G('({ mode: mn.gh.mode, s: +mn.gh.s.toFixed(1), me: +mn.project(g.camera.position.x, g.camera.position.z).s.toFixed(1) })');
    const back = async () => { const c = await H.pos(); await H.face(-17.6, c.z - 8, 1.1); };
    await H.walkTo(-17.6, -64, { run: true });   // a straight stretch of the water passage, so she is in sight down it
    for (let i = 0; i < 120; i++) { const s = await gh(); if (s.me - s.s < 11) break; await sleep(150); }
    await back(); await sleep(200); log('chase', JSON.stringify(await gh())); await shot('chimera-chase-distance');
    for (let i = 0; i < 80; i++) { const s = await gh(); if (s.me - s.s < 6) break; await sleep(150); }
    await back(); await sleep(100); log('mid', JSON.stringify(await gh())); await shot('chimera-6m');
    for (let i = 0; i < 80; i++) { const s = await gh(); if (s.me - s.s < 2.4) break; await sleep(100); }
    await back(); log('close', JSON.stringify(await gh())); await shot('chimera-close');
  }
  if (scene === 'escape') {
    // the rise: the run hint and the light hint
    for (let i = 0; i < 24; i++) { await sleep(250); if (await G('!!document.querySelector(".gf-ch-card, .gf-ch")')) break; }
    await shot('rise-run-hint'); await sleep(2200); await shot('rise-light-hint');
    await H.idle(6000);
    const gh = () => G('({ mode: mn.gh.mode, s: +mn.gh.s.toFixed(1), me: +mn.project(g.camera.position.x, g.camera.position.z).s.toFixed(1) })');
    log('chase', JSON.stringify(await gh()));
    await H.walkTo(9, -96, { run: true }); await H.walkTo(9, -88, { run: true });
    for (let i = 0; i < 40; i++) { const s = await gh(); if (s.me - s.s < 10) break; await sleep(250); }
    const fig = await G('(() => { const r = mn.ghostFig ? mn.ghostFig.root.position : null; return r ? { x: r.x, z: r.z } : null; })()');
    log('fig', JSON.stringify(fig), JSON.stringify(await gh()));
    await H.face(9, -100, 1.0); await sleep(300); await shot('chimera-chase-distance');
    for (let i = 0; i < 40; i++) { const s = await gh(); if (s.me - s.s < 2.6) break; await sleep(150); }
    await H.face(9, -100, 1.2); await sleep(100); await shot('chimera-close');
  }
  log('done', api.errors().filter((e) => !/favicon/.test(e)).slice(0, 4).join(' | '));
};
