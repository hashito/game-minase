// The key-art background of /dot-fps (tools/dot/og-compose.mjs puts the title over it): あれ coming down the passage to the valve.
//   node tools/probe.mjs --public --path dot-fps/ --query "qa=1&scene=lesson" --size 1200x630 --out <dir> --steps tools/dot/og-steps.mjs
import { helpers } from '../play/lib.mjs';
export default async (api) => {
  const { p, G, sleep, shot, log } = api, H = helpers(api);
  await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 120000);
  await sleep(2500); await H.idle();
  await H.walkTo(-2.0, -81.8); await H.walkTo(0.9, -81.8); await sleep(1200); await H.idle();
  // the picture only: every overlay of the page hidden, the canvas kept
  await G(`(() => { const s = document.createElement('style'); s.textContent = 'body *{visibility:hidden !important} canvas{visibility:visible !important}'; document.head.appendChild(s); return 1; })()`);
  for (let i = 0; i < 8; i++) {
    await H.face(4, -81.8, 1.3);
    await sleep(300);
    log(i, await G(`({ gap: +g.camera.position.distanceTo(mn.chimera.root.position).toFixed(1), mode: mn.gh.mode })`));
    await shot(`bg-${i}`);
    await sleep(600);
  }
};
