// 1.8.0 (2026-11-27 /dot-fps 7 items): screenshots of each spot the items touch: the floating chart (its card), the lockers of the
// passage, ひなた at the drain, the jar room's doorway water, the low passage chase, the first sight, the kamishibai cards.
//   node tools/probe.mjs --public --path dot-fps/ --query "qa=1&scene=p3" --out <dir> --steps tools/play/fix180-look.mjs [--mobile --size 390x844]
// FIX180=doc,lockers,drain,door,ends (comma list, default all that the scene allows)
import { helpers } from './lib.mjs';
export default async (api) => {
  const { G, sleep, log, shot, p } = api, H = helpers(api);
  const want = (process.env.FIX180 || 'doc').split(',');
  await sleep(1500);
  await G(`(([...document.querySelectorAll('.ph-sheet button, #gf-rotate button')].find((b) => /このまま/.test(b.textContent)) || { click() {} }).click(), 1)`); await sleep(300);
  await G(`(document.getElementById('start-btn').click(), 1)`); await sleep(4000); await H.idle(); await sleep(800);
  if (want.includes('doc')) {
    await G(`(g.useInteract({ kind: 'doc', id: 'DOC_F_KARTE' }), 1)`); await sleep(1500);
    log('pic', await G(`(() => { const i = [...document.querySelectorAll('.wm-win img, .tl-read img, .pd-sheet img')].filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect(); return e.className + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); }); return i; })()`));
    await shot('doc-karte');
    log('zoom', await G(`(() => { const b = document.querySelector('.gf-doc-zoom-btn'); if (!b) return 'no zoom button'; b.click(); const z = document.querySelector('.gf-doc-zoom img'); if (!z) return 'no zoom'; const r = z.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); })()`));
    await sleep(600); await shot('doc-karte-zoom');
    await G(`((document.querySelector('.gf-doc-zoom') || { click() {} }).click(), 1)`); await sleep(400);
    await G(`((document.querySelector('.gf-doc-read') || { click() {} }).click(), 1)`); await sleep(800); await shot('doc-karte-2'); await H.idle();
  }
  if (want.includes('lockers')) {
    const hides = await G(`g.data.plan.hides.filter((h) => (h.floor || 0) === 0).map((h) => ({ id: h.id, x: h.x, z: h.z, room: h.room, open: (g.world.hides && g.world.hides.get ? (g.world.hides.get(h.id) || {}).open : null) }))`);
    log('hides', hides);
    for (const h of hides) { await G(`(g.teleport({ x: ${h.x} + 1.6, z: ${h.z}, floor: 0 }), 1)`); await sleep(600); await H.face(h.x, h.z, 1.0); await sleep(900); await shot(`locker-${h.id}`); }
  }
  if (want.includes('drain')) { await sleep(3000); await shot('drain'); }
  if (want.includes('door')) { await shot('door'); }
};
