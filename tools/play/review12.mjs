// 1.2.0 screenshot review of everything the 2026-11-20 play test changed (screenshot-review rule): stand at each spot, look, shoot.
//   node tools/probe.mjs --out D:/minase-stages/review12 --query "scene=uke" --steps tools/play/review12.mjs   (add --mobile --size 390x844)
import { helpers } from './lib.mjs';

export default async (api) => {
  const { p, G, sleep, log, shot } = api, H = helpers(api);
  await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 60000);
  await sleep(2500); await H.idle();
  const at = async (name, x, z, floor, lx, lz, ly = 1.0, o = {}) => {
    await G(`(g.teleport({ x: ${x}, z: ${z}, floor: ${floor} }), 1)`); await sleep(500);
    if (o.crouch && !(await G('g.fp.crouching'))) { await p.key('KeyC'); await sleep(400); }
    if (!o.crouch && (await G('g.fp.crouching'))) { await p.key('KeyC'); await sleep(400); }
    await H.face(lx, lz, ly); await sleep(o.wait || 700); await H.idle(3000);
    await H.face(lx, lz, ly); await sleep(300); await shot(name);
  };
  // 1F
  await at('reception-from-waiting', 12.5, 21.2, 1, 16, 21.2, 1.3);
  await at('reception-glass-close', 15.0, 21.6, 1, 16, 21.4, 1.5);
  await at('reception-inside', 19.2, 21.2, 1, 16, 21.2, 1.0);
  await at('puddle-genkan', 3.2, 22.6, 1, 4.4, 20.4, 0);
  await at('puddle-machi', 10.2, 23.6, 1, 12, 22.1, 0);
  await at('sink', 8.8, 11.2, 1, 8.8, 9.2, 1.0);
  await at('sink-mirror', 8.8, 10.4, 1, 8.8, 9.0, 1.4);
  await at('kaidan-stairs', 15.2, 13.0, 1, 13.4, 10.2, 0.2);
  await at('kaidan-lift', 16.8, 12.0, 1, 18.0, 9.0, 1.1);
  await at('kaidan-ladder', 16.2, 12.0, 1, 19.6, 12.0, 0.8);
  await at('kaidan-foot', 15.6, 13.4, 1, 14.6, 11.6, 0);
  // B1
  await at('bstair-rubble', 15.6, 12.6, 0, 13.4, 10.0, 0.3);
  await at('br-water', 7.6, 7.5, 0, 6.0, 7.4, 0);
  await at('reian-drawer', 10.0, 3.0, 0, 10.0, 0.6, 0.9);
  await at('p1-hair', 2.6, -14.0, 0, 1.86, -16.0, 1.8);
  await at('p1-leak', 2.4, -10.5, 0, 3.4, -12.0, 2.5);
  await at('p1-puddles', 2.6, -2.0, 0, 2.6, -12.0, 0);
  await at('p2-entrance-far', 2.6, -36.0, 0, 2.6, -41.8, 0.9);
  await at('p2-entrance', 2.6, -41.6, 0, -2.0, -41.8, 0.9);
  await at('p2-hands', -3.6, -41.8, 0, -7.0, -41.8, 0, { crouch: true });
  await at('p2-hair', -11.0, -41.8, 0, -12.9, -41.75, 0.9, { crouch: true });
  await at('p3-hair', -17.6, -55.6, 0, -17.4, -57.8, 0);
  await at('valve-lamps', 2.6, -24.6, 0, 2.6, -28.0, 1.2);
  await at('locker-corner-p4a', -14.0, -81.8, 0, -18.25, -82.25, 1.0);
  await at('p5-drag', 9.0, -84.0, 0, 8.65, -90.5, 0);
  // the document window (paper) and the menu's controls page and photo viewer
  await G(`(g.teleport({ x: 4.6, z: 12.0, floor: 1 }), 1)`); await sleep(500);
  await G(`(() => { const d = g.data.docs.find((x) => x.id === 'DOC_CHART'); g.openDoc ? g.openDoc('DOC_CHART') : null; return !!d; })()`);
  await sleep(900); await shot('doc-chart-window'); await H.idle(4000);
  await G('(g.openPause(), 1)'); await sleep(600); await shot('menu');
  const opened = await G(`(() => { const b = [...document.querySelectorAll('button, [role=button], .pm-item')].find((x) => /操作方法/.test(x.textContent)); if (b) b.click(); return !!b; })()`);
  log('controls page', opened); await sleep(600); await shot('menu-controls');
  await G(`(() => { const b = [...document.querySelectorAll('.pm-back, .wm-layer button')].find((x) => /戻る/.test(x.textContent)); if (b) b.click(); return 1; })()`); await sleep(400);
  log('done', api.errors().filter((e) => !/favicon/.test(e)).slice(0, 4).join(' | '));
};
