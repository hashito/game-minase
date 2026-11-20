// The whole game from the title through real input (keys inside the page; mini games are done at once with ?qa=1):
//   node tools/probe.mjs --qa --out D:/minase-stages/play-e3 --steps tools/play/full.mjs
// PLAY_END = name (E3: the diary pages on the way, default) | return (E2) | give (E1). PLAY_UPTO = L2 | L3 | L4 stops early.
// Every key point gets a screenshot.
import { helpers } from './lib.mjs';

export default async (api) => {
  const { p, G, sleep, log, shot } = api, H = helpers(api);
  const END = process.env.PLAY_END || 'name', PAGES = END === 'name', UPTO = process.env.PLAY_UPTO || '';
  const st = async (tag) => log(tag, await G(`({ room: g.state.room, n: g.state.tasks.length, last: g.state.tasks.slice(-3), level: g.prog.index, prompt: document.getElementById('prompt').textContent, ended: g.state.ended, inv: g.state.inv.join(" "), deaths: mn.deaths || 0 })`));
  const must = async (task) => { for (let i = 0; i < 12 && !(await G(`g.state.tasks.includes('${task}')`)); i++) { await sleep(500); await H.idle(800); } const ok = await G(`g.state.tasks.includes('${task}')`); if (!ok) throw new Error(`ERROR ${task} not done: ${JSON.stringify(await G('({ room: g.state.room, tasks: g.state.tasks, prompt: document.getElementById("prompt").textContent, pos: [g.camera.position.x, g.camera.position.z] })'))}`); };
  // ?qa=1: ctx.choose opens nothing and answers window.__gfChoice at once, so the answers are queued before the [E] that asks
  const pre = (ids) => G(`(window.__gfQ = ${JSON.stringify(ids)}, Object.getOwnPropertyDescriptor(window, '__gfChoice') || Object.defineProperty(window, '__gfChoice', { configurable: true, get() { return (window.__gfQ || []).shift(); } }), 1)`);
  const use = async (x, z, y, tag) => { let pr = ''; for (let i = 0; i < 3 && !pr; i++) { if (i) await sleep(600); pr = await H.use(x, z, y); } log(' ', tag || 'use', '|', pr); return pr; };
  const crouch = async (on) => { const c = !!(await G('g.fp.crouching')); if (c !== !!on) { await p.key('KeyC'); await sleep(300); } };
  const ghost = () => G('({ mode: mn.gh.mode, s: +mn.gh.s.toFixed(1), me: +mn.project(g.camera.position.x, g.camera.position.z).s.toFixed(1), deaths: mn.deaths || 0 })');

  const FROM = process.env.PLAY_FROM || '';   // L4: started with --query "qa=1&scene=hyohon"
  if (!FROM) {
  await G(`(document.getElementById('start-btn').click(), 1)`);
  await sleep(1800); await shot('opening-1');
  await H.idle(); await sleep(400);
  await shot('genkan-start'); await st('start');
  // ---- L1 ----
  await H.walkTo(1.9, 21.8); await H.face(1.0, 21.2, 1.2); await sleep(300); await shot('hinata');
  await use(1.0, 21.2, 1.0, 'T_HINA'); await must('T_HINA');
  await H.walkTo(3.0, 24.5); await H.face(3.0, 25.7, 1.1); await sleep(300); await shot('front-door');
  await use(3.0, 25.65, 1.1, 'T_FRONT'); await must('T_FRONT');
  await H.route([[4.6, 22.1], [7.0, 22.1], [14.9, 22.1], [15.2, 24.6]]);
  await H.door(16, 24.6, 17.2, 24.6);
  await H.route([[18.0, 22.0], [19.0, 20.0]]); await H.face(19.95, 20, 1.3); await sleep(300); await shot('keybox');
  await use(19.95, 20, 1.3, 'T_KEY'); await must('T_KEY');
  await st('L1 done');
  // ---- L2 ----
  await H.route([[18.0, 22.0], [17.2, 24.6], [15.2, 24.6], [11.0, 22.1], [11.0, 19.0], [11.0, 16.5], [3.0, 16.5]]);
  await H.door(3, 15, 3, 13.6); await shot('karte');
  await H.walkTo(4.6, 12.0); await use(5.55, 12.0, 0.8, 'DOC_CHART'); await must('T_KARTE'); await H.idle();
  await H.route([[3.0, 13.6], [3.0, 16.5]]);
  if (PAGES) { await H.walkTo(9.0, 16.5); await H.door(9, 15, 9, 13.6); await H.walkTo(7.6, 12.2); await use(6.45, 11.6, 0.78, 'PAGE1'); await H.face(8.8, 9.3, 1.0); await sleep(300); await shot('shin-sink'); await H.route([[9.0, 13.6], [9.0, 16.5]]); }
  await H.walkTo(16.0, 16.5); await H.door(16, 15, 16, 13.6); await shot('kaidan');
  // 1.2.0 (#11): the stairs collapsed, the ladder
  await H.walkTo(18.2, 12.0); await shot('ladder'); await use(19.5, 12.0, 0.4, 'ladder down'); await sleep(1500); await H.idle(); await must('T_KAIDAN'); await shot('b-stair');
  await st('L2 done'); if (UPTO === 'L2') return;
  // ---- L3: the basement ----
  await H.route([[16.0, 10.0], [16.0, 7.5], [3.0, 7.5]]);
  await H.door(3, 9, 3, 10.6); await shot('pump-room');
  await H.walkTo(2.0, 12.0); await use(0.85, 12.0, 0.8, 'T_GEN'); await must('T_GEN'); await H.idle(); await shot('generator-on');
  for (let i = 0; i < 120 && (await G('mn.hinaAt')) !== 'pump'; i++) await sleep(500);   // 1.2.0 (#13): she limps here on her own
  await H.walkTo(4.4, 12.6); await use(5.72, 12.55, 1.0, 'T_RADIO'); await must('T_RADIO'); await H.idle();
  if (PAGES) { await H.route([[3.0, 10.4], [3.0, 7.5], [10.0, 7.5]]); await H.door(10, 6, 9.4, 4.9); await use(11.0, 4.6, 0.62, 'PAGE2'); await shot('reian'); await H.route([[10.0, 4.9], [10.0, 7.5], [3.0, 7.5]]); }
  else await H.route([[3.0, 10.4], [3.0, 7.5]]);
  await H.walkTo(3.0, 5.0); await H.walkTo(2.6, 1.0); await H.face(2.6, -1, 1.2); await sleep(300); await shot('bousui');
  await use(2.6, -1, 1.2, 'T_BOUSUI'); await must('T_BOUSUI'); await sleep(1600); await H.idle();
  await H.walkTo(2.6, -4.2); await use(1.7, -4.2, 1.3, 'T_LAMP1'); await must('T_LAMP1'); await shot('p1-lamp');
  const t0 = Date.now();
  await H.walkTo(2.6, -16, { onStep: () => H.idle(200).then(() => false) }); await shot('p1-hair');
  await H.walkTo(2.6, -40.6); await H.walkTo(2.6, -41.8); await H.idle(); await crouch(true); await shot('p2-low');
  await H.walkTo(-17.5, -41.8, { near: 0.5 }); await crouch(false); await H.idle(); await shot('p2-end');
  await H.walkTo(-17.6, -44.2); await use(-18.5, -44.2, 1.3, 'T_LAMP2'); await must('T_LAMP2');
  for (const [gx, gz] of [[-18.0, -50.0], [-17.2, -67.6], [-18.0, -74.0]]) { await H.walkTo(-17.6, gz + 1.0); await use(gx, gz, 0.15, 'grate'); await H.idle(); }
  await H.walkTo(-17.6, -60); await shot('p3-water'); await H.walkTo(-17.6, -81.4); await H.idle();
  await H.walkTo(-16.0, -81.8); await use(-16.0, -82.55, 1.3, 'T_LAMP3'); await must('T_LAMP3'); await shot('p4-corridor');
  await H.walkTo(-9.6, -81.8); await sleep(2500); await shot('gate-window'); await H.idle(); await sleep(2000); await H.idle();
  for (let i = 0; i < 20 && (await G('mn.gh.mode')) !== 'off'; i++) await sleep(500);
  await H.walkTo(-5.0, -81.8); await use(-4.0, -81.8, 1.3, 'T_GATE'); await must('T_GATE'); await sleep(1600);
  await H.walkTo(-2.0, -81.8); await H.walkTo(0.9, -81.8); await sleep(1200); await H.idle(); await shot('lesson-coming');
  await use(2.0, -81.8, 1.15, 'valve lesson'); await sleep(3500); await H.idle(); await shot('lesson-press');
  for (let i = 0; i < 60 && !(await G('g.state.tasks.includes("T_POST")')); i++) { await sleep(500); await H.idle(500); }
  await H.idle(); await must('T_POST'); log('  lesson', JSON.stringify(await ghost()));
  await H.walkTo(8.9, -82.0); await H.walkTo(9.0, -84.8); await use(9.95, -84.8, 1.3, 'T_LAMP4'); await must('T_LAMP4');
  if (PAGES) { await H.walkTo(9.0, -96.5); await use(8.25, -96.5, 0.42, 'PAGE3'); }
  await H.walkTo(9, -98.8); await H.door(9, -100, 9, -101.6); await H.idle(); await must('T_HYOHON');
  log('passage walk (s):', ((Date.now() - t0) / 1000).toFixed(0));
  await H.walkTo(9, -106.6); await H.face(9, -107.6, 1.2); await sleep(300); await shot('cabinet');
  await st('L3 done'); if (UPTO === 'L3') return;
  } else { await sleep(2500); await H.idle(); await H.walkTo(9, -106.6); }
  // ---- L4: the jar and the chase ----
  await use(9, -107.5, 1.2, 'T_JAR'); await sleep(800); await H.idle(); await must('T_JAR'); await shot('rise');
  await H.face(6.9, -104, 1.1); await sleep(2200); await shot('rise-tank');   // a player turns to see what rises
  // run back like a player told 「うしろに来たら、止水弁に [E]」: past each valve, if she is within 12 m, turn round to the wheel and [E]
  const VALVES = [[9, -98.8], [9, -84.0], [-9.0, -81.8], [-17.6, -78.6], [-17.6, -60.0], [-17.6, -45.0], [2.6, -28.0], [2.6, -10.0]];
  let valvesUsed = 0;
  const onStep = async () => {
    const g = await ghost();
    if (g.mode !== 'chase' || g.me - g.s > 12) return false;
    const c = await H.pos(); const v = VALVES.find(([x, z]) => Math.hypot(x - c.x, z - c.z) < 3.2 && mnS(x, z) < g.me - 0.6);
    if (!v || (await G(`[...mn.posts.values()].some((P) => P.on && Math.hypot(P.def.x - ${v[0]}, P.def.z - ${v[1]}) < 0.5)`))) return false;
    await H.face(v[0], v[1], 1.15); await sleep(120); await p.key('KeyE'); await sleep(350); valvesUsed++;
    log('  valve', v.join(','), JSON.stringify(await ghost()));
    return false;
  };
  const sCache = new Map(); const mnS = (x, z) => sCache.get(x + ',' + z);
  for (const [x, z] of VALVES) sCache.set(x + ',' + z, await G(`mn.project(${x}, ${z}).s`));
  const runTo = (x, z, o = {}) => H.walkTo(x, z, { run: true, onStep, ...o });
  // the way back as waypoints [x, z, crouch, tag]; after a death the run goes on from the waypoint nearest the checkpoint
  const WAY = [[9, -100.2, 0], [9, -82.2, 0, 'P5'], [-17.6, -81.8, 0, 'P4'], [-17.6, -46.0, 0], [-17.6, -41.8, 0, 'P3'], [-5.0, -41.8, 1], [2.6, -41.8, 1, 'P2'], [2.6, -30, 0], [2.6, -1.8, 0], [2.6, 1.2, 0, 'P1']];
  let pressedF = false, wi = 0, deaths0 = await G('mn.deaths || 0');
  for (let guard = 0; wi < WAY.length && guard < 60; guard++) {
    const [x, z, low, tag] = WAY[wi];
    if (wi === 2 && !pressedF) { pressedF = true; await shot('chase-dark'); await p.key('KeyF'); await sleep(200); }   // 「[F] で、叩いてつけ直せる」
    await crouch(!!low);
    const ok = low ? await H.walkTo(x, z, { near: 0.5 }) : await runTo(x, z);
    const d = await G('mn.deaths || 0');
    if (d > deaths0) {   // caught: back at the checkpoint; go on from the nearest waypoint
      deaths0 = d; await H.idle(); const c = await H.pos();
      let best = 0; WAY.forEach((w, i) => { if (Math.hypot(w[0] - c.x, w[1] - c.z) < Math.hypot(WAY[best][0] - c.x, WAY[best][1] - c.z)) best = i; });
      log('  chase DIED near', tag || '', '-> again from', JSON.stringify(c), 'waypoint', best, JSON.stringify(await ghost())); await shot('caught-' + d);
      wi = best; continue;
    }
    if (!ok) log('  chase could not reach', x, z);
    if (tag === 'P3') { const g = await ghost(); const on = await G('[...mn.posts.values()].some((P) => P.on && P.def.id === "K_P3C")'); if (g.mode === 'chase' && g.me - g.s < 45 && !on) { await crouch(false); await H.face(-17.6, -45.0, 1.15); await sleep(150); await p.key('KeyE'); await sleep(400); valvesUsed++; log('  valve before the crawl', JSON.stringify(await ghost())); } }
    if (tag) { log('  chase', tag, JSON.stringify(await ghost())); if (tag === 'P4') await shot('chase-p4'); if (tag === 'P3') await shot('chase-p3'); }
    wi++;
  }
  await crouch(false); await sleep(600);
  log('  chase valves used', valvesUsed, 'deaths', await G('mn.deaths || 0'));
  await H.idle(); await must('T_ESCAPE'); await shot('seal-now');
  await use(2.6, -0.5, 1.2, 'T_SEAL'); await must('T_SEAL'); await H.idle(); await shot('sealed');
  await H.route([[3.0, 4.0], [3.0, 7.5]]); await H.door(3, 9, 3, 10.4); await sleep(800); await H.idle(); await shot('rescue');
  await H.walkTo(4.6, 11.4); await use(5.95, 11.4, 1.3, 'T_RESCUE'); await must('T_RESCUE'); await H.idle();
  await st('L4 done'); if (UPTO === 'L4') return;
  // ---- L5 ----
  if (END === 'give') {
    await H.route([[3.0, 10.4], [3.0, 7.5], [16.0, 7.5], [16.0, 10.5], [15.4, 12.0], [18.2, 12.0]]);
    await use(19.5, 12.0, 1.0, 'ladder up'); await sleep(1500); await H.idle();
    await H.route([[16.0, 13.6], [16.0, 16.5], [3.0, 16.5], [3.0, 19.0], [3.0, 24.5]]);
    await pre(['give']); await use(3.0, 25.65, 1.1, 'T_GIVE'); await sleep(800); await H.idle();
  } else {
    await H.route([[3.0, 10.4], [3.0, 7.5], [9.0, 7.5]]); await H.door(9, 9, 9, 10.4);
    await H.walkTo(10.9, 13.4); await use(10.9, 14.5, 1.0, 'T_LEDGER'); await must('T_LEDGER'); await H.idle(); await shot('ledger');
    await H.walkTo(8.0, 13.4); await pre(['ren', 'father', 'father', 'katsuragi', 'stitched', 'father']); await use(7.2, 14.5, 0.75, 'T_THINK'); await sleep(800);
    await H.idle(1500); await H.idle(1500); log('  think answers left', await G('window.__gfQ.length'), 'wrong', await G('mn.wrong'));
    await H.idle(); await must('T_THINK'); await shot('think-done');
    if (PAGES) {
      await H.route([[9.0, 10.4], [9.0, 7.5], [10.0, 7.5]]); await H.door(10, 6, 9.4, 4.9);
      await H.walkTo(7.6, 3.2); await use(6.6, 3.2, 0.75, 'T_SQ1'); await H.idle(); log('  named', await G('g.state.flags.includes("named")'));
      await H.route([[9.4, 4.9], [10.0, 7.5], [9.0, 7.5], [9.0, 10.4]]);
    }
    await H.walkTo(9.0, 10.5); await pre(['yes']); await use(9.0, 11.6, 0.15, 'T_RETURN'); await sleep(800); await H.idle(); await must('T_RETURN'); await shot('returned');
    await H.route([[9.0, 10.4], [9.0, 7.5], [10.0, 7.5]]); await H.door(10, 6, 10.4, 4.0);
    await H.walkTo(12.6, 3.0); await use(13.9, 3.0, 1.1, 'T_END'); await sleep(800); await H.idle(3000); await H.idle();
  }
  await sleep(1500); await shot('ending');
  await st('end'); log('ending', await G('g.state.ended'), await G('g.state.flags.filter((f) => /^end_/.test(f))'));
};
