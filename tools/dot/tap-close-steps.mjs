// Every close button can be tapped with a finger: the crouch hint 「閉じる」 (user: 「上の通知でしゃがむの案内を閉じるで閉じられないです」),
// the reading panel and a document. For each: elementFromPoint at the button's centre is the button (or inside it), a real touch removes it,
// and it does not come back.
//   node tools/probe.mjs --public --path dot-fps/ --mobile --size 844x390 --out <dir> --steps tools/dot/tap-close-steps.mjs   (also 390x844)
import { helpers } from '../play/lib.mjs';
export default async (api) => {
  const { p, G, sleep, log, shot } = api, H = helpers(api);
  const hit = (sel) => G(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return null; const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const e = document.elementFromPoint(x, y); return { x: Math.round(x), y: Math.round(y), on: !!e && (e === b || b.contains(e)), top: e ? (e.id ? '#' + e.id : '') + '.' + String(e.className || e.tagName).split(' ')[0] : null }; })()`);
  const tapClose = async (name, sel, gone) => {
    let h = await hit(sel);
    // kit 1.21.0 phone play: on a phone the hint is a badge on its button (no card): tapping the button uses it and the hint goes
    if ((!h || (!h.x && !h.y)) && sel.startsWith('#gf-ch')) { const b = await hit('#t-buttons [data-gf-hint]'); if (b) { log('tap', name, 'badge on the button (phone play)'); h = b; } }
    if (!h) { log('tap', name, 'NO BUTTON'); return; }
    await shot(`${name}-before`);
    await p.tap(h.x, h.y); await sleep(900);
    const closed = await G(`!document.querySelector(${JSON.stringify(gone)})`);
    await sleep(2500);
    const stays = await G(`!document.querySelector(${JSON.stringify(gone)})`);
    log('tap', name, { ...h, closed, stays, result: h.on && closed && stays ? 'PASS' : 'FAIL' });
    await shot(`${name}-after`);
  };
  await sleep(2000);
  await G(`(([...document.querySelectorAll('.ph-sheet button')].find((b) => /このまま/.test(b.textContent)) || { click() {} }).click(), 1)`); await sleep(300);
  await G(`(document.getElementById('start-btn').click(), 1)`); await sleep(3000);
  await H.idle(); await sleep(800);
  await G(`(() => { const r = document.getElementById("gf-rotate"); const b = r && [...r.querySelectorAll("button")].find((x) => /このまま/.test(x.textContent)); if (b) b.click(); return !!b; })()`); await sleep(500);
  for (let i = 0; i < 6; i++) { const any = await G(`(() => { const b = [...document.querySelectorAll('.wm-win button')].find((x) => /歩き出す|閉じる|次へ/.test(x.textContent)); if (b) { b.click(); return true; } return false; })()`); if (!any) break; await sleep(700); }
  const quiet = async () => { for (let i = 0; i < 40 && (await G(`!!document.documentElement.dataset.phMsg && document.documentElement.dataset.phMsg === 'say'`)); i++) await sleep(500); };
  await quiet();
  // the crouch hint, as the stage gate shows it
  await G(`(g.controlHint('crouch', { why: 'できるようになった。', once: false }), 1)`); await sleep(800);
  await tapClose('hint', '#gf-ch button', '#gf-ch');
  // with a line on screen too: the hint waits under the line (hidden), and can be closed once the line has gone
  await G(`(g.monologue('ひなたは、壁に手をついてポンプ室へ向かった。私も、地下の廊下の西のポンプ室へ行こう。', 8), g.controlHint('run', { why: 'できるようになった。', once: false }), 1)`); await sleep(900);
  log('under-say', await G(`({ msg: document.documentElement.dataset.phMsg, hint: document.getElementById('gf-ch') ? getComputedStyle(document.getElementById('gf-ch')).visibility : 'none' })`)); await shot('hint-under-say');
  await quiet(); await sleep(400);
  await tapClose('hint-say', '#gf-ch button', '#gf-ch');
  // a document
  const doc = await G(`g.data.docs[0].id`);
  await G(`(g.useInteract({ kind: 'doc', id: ${JSON.stringify(doc)} }), 1)`); await sleep(1200);
  await tapClose('doc', '.gf-doc-read', '.wm-doc');
  await H.idle();
};
