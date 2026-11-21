// /dot-fps screenshot review: wall items close up (no oversized backing, no flicker), the reading panel (a wall notice, a look, a pick-up),
// the 読んだもの list, the comment after closing. Run at PC width and on phones:
//   node tools/probe.mjs --public --path dot-fps/ --query "qa=1&scene=genkan" --out <dir> --steps tools/dot/review-steps.mjs [--mobile --size 390x844]
import { helpers } from '../play/lib.mjs';
export default async (api) => {
  const { p, G, sleep, log, shot } = api, H = helpers(api);
  await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 120000);
  await sleep(2500); await H.idle();
  const tp = async (x, z, floor = 1) => { await G(`(g.teleport({ x: ${x}, z: ${z}, floor: ${floor} }), 1)`); await sleep(600); };
  const panel = () => G(`({ open: !!document.querySelector('.wm-dot-read'), reading: document.documentElement.dataset.reading || '', title: (document.querySelector('.wm-dot-read .wm-title, .wm-dot-read h2') || {}).textContent || '', text: ((document.querySelector('.wm-dot-read .rd-text') || {}).textContent || '').slice(0, 60), say: document.getElementById('say').className + ' ' + document.getElementById('say').textContent.slice(0, 40) })`);
  // 1 the notice on the entrance wall: close up straight on, close up at a slant
  await tp(1.2, 21.0); await H.face(0.2, 21.0, 1.5); await sleep(700); await shot('wall-notice');
  await tp(1.0, 20.2); await H.face(0.2, 21.0, 1.5); await sleep(700); await shot('wall-notice-slant');
  // 2 read it: the panel, the HUD hidden; closed: the comment
  await tp(1.2, 21.0); await H.face(0.3, 21.0, 1.5); await sleep(300);
  log('prompt', await G(`document.getElementById('prompt').textContent`));
  await p.key('KeyE'); await sleep(1200); log('doc', await panel()); await shot('read-doc');
  await G(`(document.querySelector('.wm-dot-read .rd-close') || { click() {} }).click(), 1`); await sleep(1500); log('after', await panel()); await shot('read-doc-after');
  await H.idle();
  // 3 a look: the puddle
  await tp(4.4, 21.4); await H.face(4.4, 20.4, 0.1); await sleep(300); log('prompt', await G(`document.getElementById('prompt').textContent`));
  await p.key('KeyE'); await sleep(1200); log('look', await panel()); await shot('read-look');
  await G(`(document.querySelector('.wm-dot-read .rd-close') || { click() {} }).click(), 1`); await sleep(1500); await H.idle();
  // 4 the list
  await G(`(document.getElementById('menu-btn') || document.querySelector('[data-act=menu], .hud-menu, #hud-menu') || { click() {} }).click(), 1`); await sleep(800);
  await G(`([...document.querySelectorAll('button, [role=tab]')].find((b) => /読んだもの/.test(b.textContent)) || { click() {} }).click(), 1`); await sleep(800);
  await shot('read-list'); await H.idle();
  // 5 the board of the reception window (wall, UKE) and the window's hand prints
  await tp(18.6, 19.0); await H.face(18.6, 18.06, 1.5); await sleep(700); await shot('wall-map');
  await tp(17.0, 21.2); await H.face(16, 21.2, 1.5); await sleep(700); await shot('uke-window');
  // 6 the sink and its mirror (SHIN), the diary page on the desk: a pick-up opens in the panel
  await tp(8.8, 10.2); await H.face(8.8, 9.08, 1.4); await sleep(700); await shot('sink-mirror');
  await tp(6.45, 12.4); await H.face(6.45, 11.6, 0.78); await sleep(300); log('prompt', await G(`document.getElementById('prompt').textContent`));
  await p.key('KeyE'); await sleep(1200); log('pickup', await panel()); await shot('read-pickup');
  await G(`(document.querySelector('.wm-dot-read .rd-close') || { click() {} }).click(), 1`); await sleep(1500); await H.idle();
};
