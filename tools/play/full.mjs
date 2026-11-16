// The whole game from the title through real input (keys inside the page; mini games are done at once with ?qa=1):
//   node tools/probe.mjs --qa --out D:/minase-stages/play-e1 --steps tools/play/full.mjs
// PLAY_END = give (E1, default) | keep (E2) | free (E3: reads the letters on the way). PLAY_UPTO = L2 | L3 | L4 stops early.
// Every key point gets a screenshot.
import { helpers } from './lib.mjs';

export default async (api) => {
  const { p, G, sleep, log, shot } = api, H = helpers(api);
  const END = process.env.PLAY_END || 'give', LET = END === 'free', UPTO = process.env.PLAY_UPTO || '';
  const st = async (tag) => log(tag, await G(`({ room: g.state.room, n: g.state.tasks.length, last: g.state.tasks.slice(-3), level: g.prog.index, fuda: kc.fuda, prompt: document.getElementById('prompt').textContent, ended: g.state.ended, inv: g.state.inv.join(" ") })`));
  const must = async (task) => { const ok = await G(`g.state.tasks.includes('${task}')`); if (!ok) throw new Error(`ERROR ${task} not done: ${JSON.stringify(await G('({ room: g.state.room, tasks: g.state.tasks, prompt: document.getElementById("prompt").textContent })'))}`); };
  const choose = async (id) => { for (let i = 0; i < 40; i++) { const ok = await G(`(() => { const b = document.querySelector('.gf-talk-choice[data-id="${id}"]'); if (b) { b.click(); return true; } return false; })()`); if (ok) return true; await sleep(250); } log('  no choice', id); return false; };
  // ?qa=1: ctx.choose opens nothing and answers window.__gfChoice at once, so the answers are queued before the [E] that asks
  const pre = (ids) => G(`(window.__gfQ = ${JSON.stringify(ids)}, Object.getOwnPropertyDescriptor(window, '__gfChoice') || Object.defineProperty(window, '__gfChoice', { configurable: true, get() { return (window.__gfQ || []).shift(); } }), 1)`);
  const use = async (x, z, y, tag) => { let pr = ''; for (let i = 0; i < 3 && !pr; i++) { if (i) await sleep(600); pr = await H.use(x, z, y); } log(' ', tag || 'use', '|', pr); return pr; };   // an empty prompt (a line still on screen, a step short) is tried again
  const peel = async (x, z, y = 1.45) => { const pr = await H.use(x, z, y, { wait: 1400 }); log('  peel |', pr); };
  const where = async () => log('  at', JSON.stringify(await H.pos()));
  const crouch = async (on) => { const c = await G('g.fp.crouching'); if (c !== on) { await p.key('KeyC'); await sleep(300); } };

  await G(`(document.getElementById('start-btn').click(), 1)`);
  await sleep(1800); await shot('opening-1');
  await H.idle(); await sleep(400);
  await shot('omote-start'); await st('start');
  // ---- L1 ----
  await H.walkTo(3.6, 23.4); await H.walkTo(4.9, 23.2); await H.face(5.7, 22.5, 1.0); await sleep(300); await shot('choba');
  await use(5.7, 22.55, 1.0, 'T_CHOBA'); await must('T_CHOBA');
  await H.walkTo(4.2, 21.2); await H.face(4.43, 20.08, 1.45); await sleep(300); await shot('naka-fuda');
  await peel(4.43, 20.08); await H.idle(); await must('T_PEEL1');
  await H.walkTo(3.8, 21.4); await use(2.98, 21.4, 1.35, 'paste daikoku'); await H.idle(); await shot('daikoku-pasted');
  await use(2.98, 21.4, 1.35, 'peel daikoku'); await H.idle(); await must('T_PASTE1');
  await st('L1 done');
  // ---- L2: the kitchen ----
  await H.walkTo(3.6, 22.8); await H.walkTo(1.4, 21.2); await peel(1.88, 20.08); await H.idle();
  await H.walkTo(1.3, 19.2); await H.walkTo(1.5, 17.7); await shot('hashiri');
  await use(2.25, 17.7, 1.0, 'TESHOKU'); await H.idle();
  if (LET) { await H.walkTo(1.5, 18.4); await use(2.25, 18.4, 0.62, 'LETTER1'); await H.idle(); }
  await H.walkTo(1.4, 15.4); await use(0.5, 15.4, 0.85, 'MATCHES'); await H.idle(); await must('T_HASHIRI');
  // the back rooms
  await H.route([[1.3, 19.4], [1.3, 21.0], [1.7, 23.0], [3.6, 23.0], [3.9, 21.0], [3.9, 19.0]]);
  await shot('naka');
  await H.walkTo(5.4, 14.0); await peel(5.83, 13.08); await H.idle(); await H.walkTo(5.3, 12.0);
  await H.walkTo(6.5, 11.6); await use(7.35, 11.6, 0.42, 'DOC_DIARY'); await H.idle(); await must('T_OKU'); await shot('oku');
  if (LET) { await H.walkTo(3.0, 8.0); await use(3.3, 7.05, 1.05, 'LETTER2'); await H.idle(); }
  await H.walkTo(5.4, 7.4); await peel(5.83, 6.58); await H.idle(); await H.walkTo(5.3, 5.75);
  await H.walkTo(5.0, 5.9); await peel(5.83, 5.08); await H.idle(); await H.walkTo(5.3, 4.0); await H.idle();
  await must('T_SAGYO'); await shot('sagyo');
  await H.walkTo(6.6, 3.9); await use(7.5, 3.9, 0.9, 'KOTEKO'); await H.idle();
  if (LET) { await H.walkTo(2.6, 3.6); await use(2.6, 4.5, 0.75, 'LETTER3'); await H.idle(); }
  // the phone
  await sleep(3000); await H.idle();
  await H.route([[5.3, 4.2], [5.3, 5.75], [5.3, 7.4], [5.3, 12.0], [5.3, 14.0], [3.6, 14.2]]); await shot('phone');
  await use(3.15, 13.55, 0.7, 'T_PHONE'); await H.idle(); await must('T_PHONE'); await shot('after-phone');
  if (LET) { await H.walkTo(6.5, 16.5); await use(7.45, 16.5, 0.9, 'T_SQ1'); await H.idle(); const lt = await G('g.state.flags.includes("letters")'); log('  letters', lt); if (!lt) throw new Error('ERROR letters not read'); }
  // the mill and the hatch
  await H.route([[5.3, 14.0], [5.3, 12.0], [5.3, 7.4], [5.3, 5.75], [5.3, 4.0], [6.6, 1.0]]);
  await H.face(6.6, -0.5, 0.4); await sleep(300); await shot('usu');
  await use(6.6, -0.5, 0.4, 'T_USU'); await H.idle(); await sleep(1500); await must('T_USU');
  await use(6.6, -0.5, 0.1, 'T_HATCH'); await H.idle(); await must('T_HATCH'); await shot('hatch-open');
  await st('L2 done'); if (UPTO === 'L2') return;
  // ---- L3: down ----
  await use(6.6, -0.5, 0.3, 'ladder down'); await sleep(1500); await H.idle(); await st('muro'); await shot('muro-dark');
  await use(5.2, 1.6, 0.35, 'T_LIGHT'); await H.idle(); await must('T_LIGHT'); await shot('muro-lit');
  await H.face(6.6, -0.5, 3.0); await sleep(300); await shot('muro-scratches');
  await H.walkTo(2.8, 0.2); await peel(3.18, -0.92); await H.idle(); await must('T_P1');
  await H.walkTo(2.6, -2.6); await use(1.68, -2.6, 1.3, 'T_LAMP1'); await H.idle(); await must('T_LAMP1');
  const t0 = Date.now();
  await H.walkTo(2.6, -16, { onStep: () => H.idle(200).then(() => false) }); await shot('p1-hair');
  await H.walkTo(2.6, -41.7); await H.idle(); await crouch(true); await shot('p2-low');
  await H.walkTo(-17.5, -41.8, { near: 0.5 }); await crouch(false); await H.idle(); await shot('p2-end');
  await H.walkTo(-17.6, -44.2); await use(-18.52, -44.2, 1.3, 'T_LAMP2'); await H.idle(); await must('T_LAMP2');
  await H.walkTo(-17.6, -60); await shot('p3-water'); await H.walkTo(-17.6, -81.3); await H.idle();
  await H.walkTo(-16.0, -81.6); await use(-16.0, -82.52, 1.3, 'T_LAMP3'); await H.idle(); await must('T_LAMP3'); await shot('p4-corridor');
  for (const [x, z, sz] of [[-14.0, -81.04, -81.9], [-11.2, -82.56, -81.6]]) { await H.walkTo(x, sz); await peel(x, z, 1.5); await H.idle(); }
  await H.walkTo(-9.0, -81.8); await sleep(1500); await shot('gate-encounter'); await H.idle(); await sleep(2500); await H.idle();
  await H.walkTo(-6.4, -81.9); await peel(-6.4, -81.04, 1.5); await H.idle();
  await H.walkTo(-5.0, -81.8); await peel(-4.08, -81.12); await H.idle(); await must('T_GATE');
  await H.walkTo(-2.0, -81.8); await H.walkTo(0.9, -81.8); await sleep(1200); await shot('lesson-coming');
  await use(2.0, -81.8, 1.4, 'paste lesson'); await sleep(4000); await H.idle(); await shot('lesson-press');
  for (let i = 0; i < 40 && !(await G('g.state.tasks.includes("T_POST")')); i++) { await sleep(500); await H.idle(500); }
  await H.idle(); await must('T_POST');
  await H.walkTo(8.9, -82.0); await H.walkTo(9.0, -84.8); await use(9.92, -84.8, 1.3, 'T_LAMP4'); await H.idle(); await must('T_LAMP4');
  await H.walkTo(9, -98.8); await H.door(9, -100, 9, -101.6); await H.idle(); await must('T_OKUMURO');
  log('passage walk (s):', ((Date.now() - t0) / 1000).toFixed(0));
  await H.walkTo(9, -106.6); await H.face(9, -107.66, 1.1); await sleep(300); await shot('okumuro-shelf');
  await st('L3 done'); if (UPTO === 'L3') return;
  // ---- L4: the comb and the chase ----
  await use(9, -107.66, 1.1, 'T_BOX'); await sleep(800); await H.idle(); await must('T_BOX'); await shot('rise');
  await H.face(9, -105, 1.2); await sleep(200);
  const runTo = (x, z, o = {}) => H.walkTo(x, z, { run: true, ...o });
  await runTo(9, -100.2); await runTo(9, -82.2); await runTo(-17.6, -81.8); await shot('chase-p4');
  await runTo(-17.6, -46.0); await H.walkTo(-17.6, -44.0); await use(-17.6, -45.0, 1.4, 'paste P3C'); await shot('chase-paste');
  await H.walkTo(-17.6, -41.8); await crouch(true); await H.walkTo(-5.0, -41.8, { near: 0.5 }); log('  chase', await G('({ me: kc.project(g.camera.position.x, g.camera.position.z).s.toFixed(1), gh: kc.gh.s.toFixed(1), deaths: g.state.deaths })'));
  await H.walkTo(2.4, -41.8, { near: 0.5 }); await crouch(false);
  await runTo(2.6, -1.8); await runTo(2.6, -0.1); await runTo(6.6, 0.9); await use(6.6, -0.5, 1.2, 'ladder up'); await sleep(1500);
  log('dead?', await G('g.state.room'));
  await H.idle(); await must('T_ESCAPE'); await shot('seal-bar');
  await use(6.6, -0.5, 0.1, 'T_SEAL'); await H.idle(); await must('T_SEAL');
  await st('L4 done'); if (UPTO === 'L4') return;
  // ---- L5 ----
  if (END === 'give') {
    await H.route([[5.3, 4.0], [5.3, 5.75], [5.3, 7.4], [5.3, 12.0], [5.3, 14.0], [3.9, 19.0], [3.9, 21.0], [4.9, 23.2]]);
    await pre(['give']); await use(5.7, 22.5, 1.0, 'T_END give'); await sleep(800); await H.idle();
  } else {
    await H.walkTo(1.6, 2.2); await pre(['away', 'muro', 'shut', 'haru', 'burn']); await use(0.75, 2.2, 0.9, 'T_THINK'); await sleep(800);
    await H.idle(1500);
    await H.idle(1500); log('  think answers left', await G('window.__gfQ.length'));
    await H.idle(); await must('T_THINK'); await shot('think-done');
    await H.walkTo(6.6, 1.0); await pre(['yes']); await use(6.6, -0.5, 0.1, 'T_RETURN'); await sleep(800); await H.idle(); await must('T_RETURN'); await shot('returned');
    await H.route([[5.3, 4.0], [5.3, 5.75], [5.3, 7.4], [5.3, 12.0], [5.3, 14.0], [3.9, 19.0], [3.9, 21.0], [4.9, 23.2]]);
    await pre([END]); await use(5.7, 22.5, 1.0, 'T_END ' + END); await sleep(800); await H.idle(3000); await H.idle();
  }
  await sleep(1500); await shot('ending');
  await st('end'); log('ending', await G('g.state.ended && (g.state.endingId || g.state.ending || true)'), await G('g.state.flags.filter((f) => /^end_/.test(f))'));
};
