// /dot-fps panels on a low phone screen: the opening talk (every page), each document, a look card, the death card and the menu.
// For each shot it also logs what spills out of its frame (a framed box whose content is taller than the box, or a child drawn outside it)
// and whether the body text of a document / talk is cut (clipped by its scroller):
//   node tools/probe.mjs --public --path dot-fps/ --mobile --size 844x340 --out <dir> --steps tools/dot/panels-steps.mjs   (also 844x390, 667x375)
import { helpers } from '../play/lib.mjs';
import { picFitSource } from '../hud-checks.mjs';
export default async (api) => {
  const { G, sleep, log, shot } = api, H = helpers(api);
  const audit = (tag) => G(`(() => {
    const out = { tag, vw: innerWidth, vh: innerHeight, spill: [], scroll: [] };
    const vis = (e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 4 && r.height > 4; };
    const frames = [...document.querySelectorAll('.wm-win, .gf-talk, .tl-read, .tl-lookcard, .gf-mo-card-in, .kcard, .pd-sheet, .gf-doc-main')].filter(vis);
    for (const f of frames) {
      const fr = f.getBoundingClientRect(), name = (f.className + '').split(' ')[0];
      for (const c of f.querySelectorAll('*')) { if (!vis(c)) continue; const r = c.getBoundingClientRect(); if (r.bottom > fr.bottom + 2 || r.right > fr.right + 2 || r.top < fr.top - 2 || r.left < fr.left - 2) { const sc = c.closest('.wm-body, .gf-doc-main, .tl-body'); const clipped = sc && f.contains(sc) && sc !== c && getComputedStyle(sc).overflowY !== 'visible'; if (!clipped) { out.spill.push(name + ' > ' + (c.className || c.tagName) + ' ' + Math.round(r.bottom - fr.bottom)); break; } } }
      if (f.clientHeight < 4) out.spill.push(name + ' collapsed');
    }
    for (const s of document.querySelectorAll('.wm-body, .gf-doc-main, .tl-read > .tl-body')) if (vis(s) && s.scrollHeight > s.clientHeight + 2) out.scroll.push((s.className + '').split(' ')[0] + ' +' + (s.scrollHeight - s.clientHeight));
    const img = document.querySelector('.wm-win .gf-talk-img, .wm-win .pd-photo img, .tl-read .iv-photo'); if (img && vis(img)) { const r = img.getBoundingClientRect(); out.pic = Math.round(r.width) + 'x' + Math.round(r.height); }
    return out; })()`.replace('{ tag,', '{ tag: ' + JSON.stringify(tag) + ','));
  // P37 (kit 1.21.3): the picture as large as the room left after the words allows
  const snap = async (tag) => { log('panel', await audit(tag)); const pf = await G(picFitSource()); for (const x of pf || []) if (x.over || x.grow) log('P37', tag, JSON.stringify(x)); await shot(tag); };
  await sleep(2000);
  await G(`(([...document.querySelectorAll('.ph-sheet button, #gf-rotate button')].find((b) => /このまま/.test(b.textContent)) || { click() {} }).click(), 1)`); await sleep(300);
  await G(`(document.getElementById('start-btn').click(), 1)`); await sleep(3500);
  // the opening talk, page by page
  for (let i = 1; i <= 8; i++) {
    const open = await G(`!!document.querySelector('.wm-win .gf-talk')`); if (!open) break;
    await snap(`open-${i}`);
    await G(`((document.querySelector('.wm-win .gf-talk-next') || document.querySelector('.wm-win .gf-talk-text') || { click() {} }).click(), 1)`); await sleep(900);
  }
  await H.idle(); await sleep(800);
  // every document
  const docs = await G(`g.data.docs.map((d) => d.id)`);
  for (const id of docs) {
    await G(`(g.useInteract({ kind: 'doc', id: ${JSON.stringify(id)} }), 1)`); await sleep(1200);
    await snap(`doc-${id}`);
    await G(`((document.querySelector('.gf-doc-read') || { click() {} }).click(), 1)`); await sleep(700); await H.idle(); await sleep(400);
  }
  // a look card (the kit reading panel)
  await G(`(g.teleport({ x: 4.4, z: 21.4, floor: 1 }), 1)`); await sleep(500); await H.face(4.4, 20.4, 0.1); await sleep(300);
  await api.p.key('KeyE'); await sleep(1300); await snap('look');
  await H.idle(); await sleep(500);
  // the death card
  await G(`(g.die('monster'), 1)`); await sleep(4500); await snap('death');
  await G(`(([...document.querySelectorAll('button')].find((b) => b.offsetParent && /やり直|もう一度|続ける/.test(b.textContent)) || { click() {} }).click(), 1)`); await sleep(2500); await H.idle();
  // the menu
  await G(`(g.openPause ? g.openPause() : 0, 1)`); await sleep(800); await snap('menu');
  await G(`(([...document.querySelectorAll('.tm-tabs button, [role=tab]')].find((b) => /読んだ|覚え書き/.test(b.textContent))) || { click() {} }).click(), 1`); await sleep(500); await snap('menu-reads');
  await G(`(([...document.querySelectorAll('.tm-tabs button, [role=tab]')].find((b) => /手帳/.test(b.textContent))) || { click() {} }).click(), 1`); await sleep(500); await snap('menu-notes');
  await H.idle();
};
