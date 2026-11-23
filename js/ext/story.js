// The story of 水無瀬病院: what is said when (data/talk.json, js/ext/words.js), the tasks that need code, ひなた's place at each moment,
// the scripted moments of the passage (one every few metres on the way in), the window of the second watertight door and the valve
// lesson, the jar and the chase back, the first watertight door, the pump room, the questions under the rising water, and the three
// endings. Shares G with water.js (the valves), chimera.js (あれ) and hospital.js (the things).
import * as THREE from 'three';
import { W } from './words.js';

// 1.6.0 (4th play test #5 「水の中を歩いているのに水の音がしません」): the step is the water under it (G.waterYAt): to the shin or deeper 'wade'
// (kit 1.38.0: the leg pushed through, the splash of the foot), ankle water 'water', else the floor of the room
const ROOM_SURFACE = { P2: 'concrete', P5: 'concrete', PUMP: 'concrete' };
const W_LV = 0.42, FLOOD = 0.46, PRE = 0.56;   // the passage's knee water; after the jar; behind a shut watertight door (above its 0.5 m coaming)
const PASS_W = ['P1', 'P2', 'P3', 'P4A'], PASS_E = ['P4B', 'P5'], B1W = ['B_ROKA', 'B_STAIR', 'MOUTH'];
// 1.5.0 (3rd play test #3 「非常灯をつけたときにもっと明るく」): 3.4 -> 8 (and 24 m of reach, hospital.js)
const LAMP_I = 8;
const PASSAGE = new Set(['P1', 'P2', 'P3', 'P4A', 'P4B', 'P5', 'HYOHON']);
// the checkpoints of the run back (outside the low zone: you come back standing)
const CP_GATE = { x: -5.2, z: -81.8, yaw: Math.PI / 2, floor: 0 }, CP_MID = { x: -17.2, z: -41.8, yaw: -Math.PI / 2, floor: 0 };
// the scripted moments on the way in: [id, x, z, what]. Each runs once, when you first walk past its point
const EVENTS = [
  ['e1', 2.6, -8, 'drip'], ['e2', 2.6, -16.5, 'hair'], ['e3', 2.6, -27, 'flick'], ['e4', 2.6, -36, 'clang'],
  ['e5', 1.4, -41.8, 'low'], ['e6', -4, -41.8, 'hands'], ['e7', -7.5, -41.8, 'cross'],   // 1.7.0 (5th #6): the crossing 10 m before its end
  ['e8', -17.6, -44.6, 'water'], ['e9', -17.6, -55, 'splash'], ['e10', -17.6, -63, 'float'], ['e11', -17.6, -72, 'hum'],
  ['e12', -12, -81.8, 'radio2'], ['e13', 9, -89, 'drag'], ['e14', 9, -96.5, 'clink'],
];

export function installStory(ext, G) {
  let ctx = null, RUN0 = 3.8, LIT = 0;
  const done = (id) => ctx.state.tasks.includes(id);
  const has = (id) => ctx.state.inv.includes(id);
  const flag = (k) => ctx.state.flags.includes(k);
  const setFlag = (k) => { if (!flag(k)) ctx.setFlag(k, { silent: true }); };
  const talk = (key, title) => ctx.talk(key, { title: title || '水無瀬病院' });
  const say = (k, sec) => ctx.monologue(W[k], sec ?? Math.min(9, 2.4 + W[k].length * 0.09));
  const ans = (k) => ctx.answer(W[k]);
  const task = (id) => ctx.data.tasks.find((t) => t.id === id);
  const tryDone = (id) => { if (!done(id) && ctx.canStart(task(id)) === true) { ctx.completeTask(id); return true; } return false; };
  const later = (f, ms = 400) => setTimeout(f, ms);
  G.ev = G.ev || []; G.lampsOut = G.lampsOut || [];
  const cam = () => ctx.camera.position;
  const removeItem = (id) => { const i = ctx.state.inv.indexOf(id); if (i >= 0) ctx.state.inv.splice(i, 1); };
  const door = (id) => ctx.world.doors.get(id);

  // ---------------- where ひなた is, from the tasks done ----------------
  function hinaKey() {
    if (!done('T_KEY')) return 'genkan';
    if (!done('T_KARTE')) return 'roka';
    if (!done('T_KAIDAN')) return 'kaidan';
    if (!flag('hina_pump')) return 'bstair';
    if (!done('T_SEAL')) return 'pump';
    if (!done('T_RESCUE')) return 'rescue';
    if (!done('T_LEDGER')) return 'jimu';
    if (!done('T_RETURN')) return 'drain';
    return 'reian';
  }
  // ---------------- the world agrees with the tasks done (a resumed save, a test scene) ----------------
  function apply(snap = false) {
    if (!ctx || !G.water) return;
    G.genOn = done('T_GEN'); G.b1Light(done('T_GEN'));
    for (const n of [1, 2, 3, 4]) { const id = `S_LAMP${n}`, on = done(`T_LAMP${n}`) && !G.lampsOut.includes(id); G.lampEntry[id].i = on ? LAMP_I : 0; G.lampFlame[id].visible = on; }
    G.hyoGlow.i = done('T_HYOHON') ? 1.4 : 0; G.tankGlow.i = done('T_HYOHON') ? 0.7 : 0;
    G.jar7.visible = !done('T_JAR');
    // the water
    // 1.6.0 (4th play test #11 「水の各場面での水位を整理してつながったら同期するようにしてください」): one level for every set of rooms an
    // open doorway joins, at every point of the story (levels()); a sill higher than the water stands in every doorway between two levels
    // (hospital.js SILLS). Opening a watertight door brings the two sides together over its coaming (the pour), see the tasks below.
    for (const [r, y] of Object.entries(levels())) G.setWater(r, y.y, y.o);
    if (done('T_RESCUE')) { G.waterResidue('PUMP', 0.4); G.waterResidue('B_ROKA', 0.4); }   // 1.3.0 (#10): the line the flood left, also in a resumed game
    if (done('T_THINK') && (G.wrong || 0) > 0) G.waterResidue('JIMU', 0.06 + G.wrong * 0.18);
    G.drainWater.visible = done('T_LEDGER') && !done('T_RETURN');
    G.drainHands.visible = done('T_THINK') && !done('T_RETURN');
    // the doors
    const p1 = door('D_P1'); if (done('T_BOUSUI') && !done('T_SEAL')) { if (!p1.isOpen) p1.open(); } else if (p1.isOpen) p1.close();
    const gt = door('D_GATE'); if (done('T_GATE') && !gt.isOpen) gt.open();
    const de = door('D_END'); if (done('T_JAR') && !done('T_ESCAPE') && de && !de.isOpen) de.open();   // the jar room's door stands open for the run back
    // 1.7.0 (5th play test #10 「防水扉がゆっくり閉まらない」): only a load / a restore puts the slabs where they are; during play the slab
    // slides over G.WT_SEC with its grind (this line used to snap it shut the moment T_SEAL closed the door, with no sound)
    if (snap) for (const D of Object.values(G.wt)) { D.open = D.d.isOpen ? 1 : 0; D.want = D.open; }
    G.cabLock.visible = !done('T_LEDGER');
    G.hearseOpen = flag('end_name') || flag('end_return') ? 1 : null; G.hearseOut.visible = G.hearseOpen != null;
    G.hinaGo(hinaKey());   // 1.2.0 (#13): she walks there (a resumed game or a test scene places her)
    ctx.world.setLampFloor(ctx.floor, true);
    sealSpot();
  }
  G.applyStory = apply;
  /** the level of every basement room now: { room: { y, o } } */
  function levels() {
    const sealed = done('T_SEAL') && !done('T_RESCUE'), out = {};
    const b1 = sealed ? 0.4 : done('T_BOUSUI') && !done('T_SEAL') ? 0.12 : 0.07;
    for (const r of B1W) out[r] = { y: b1 };
    out.PUMP = { y: sealed ? 0.4 : null }; out.REIAN = { y: sealed ? 0.4 : null };
    out.JIMU = { y: sealed ? 0.4 : done('T_LEDGER') && !done('T_THINK') ? 0.06 + (G.wrong || 0) * 0.18 : null, o: { drain: done('T_THINK') } };
    const lv = done('T_JAR') ? FLOOD : W_LV;
    for (const r of PASS_W) out[r] = { y: done('T_BOUSUI') ? lv : PRE };
    for (const r of PASS_E) out[r] = { y: done('T_GATE') ? lv : PRE };
    return out;
  }
  G.levels = levels;
  // the [E] box on the MOUTH side of the open watertight door (the kit's door box is gone while the door stands open)
  let sealHit = null;
  function sealSpot() {
    if (!sealHit) return;
    const I = ctx.world.interactables, i = I.indexOf(sealHit), want = done('T_ESCAPE') && !done('T_SEAL');
    if (want && i < 0) I.push(sealHit); if (!want && i >= 0) I.splice(i, 1);
  }

  // ---------------- the emergency lights ----------------
  G.lampOn = (id) => { G.lampEntry[id].i = LAMP_I; G.lampFlame[id].visible = true; const k = G.lampsOut.indexOf(id); if (k >= 0) G.lampsOut.splice(k, 1); ctx.world.setLampFloor(ctx.floor, true); };
  G.lampOut = (id) => { G.lampEntry[id].i = 0; G.lampFlame[id].visible = false; if (!G.lampsOut.includes(id)) G.lampsOut.push(id); ctx.world.setLampFloor(ctx.floor, true); ctx.sound('glitch'); };
  let relighting = false;

  // ---------------- the opening ----------------
  ext.on('game:start', ({ resume, scene }) => {
    if (!ctx) return;
    apply(true);
    if (!G.lightOut) G.light0(true);   // the flashlight is on from the start (F turns it off)
    if (resume && !scene) resumeChase();
    if (resume || scene || ctx.testScene) return;
    talk('opening', 'はじまり').then(() => { say('start', 6); if (ctx.mapTip) ctx.mapTip(); });
  });

  ext.on('game:ready', (c) => {
    ctx = c;
    RUN0 = ctx.fp.o.run;
    // the flashlight: it dies when the jar is taken; [F] knocks it back on
    const l0 = ctx.setLight; G.light0 = (on) => { l0(on); if (on && ctx.flashlight) LIT = ctx.flashlight.intensity || LIT; };
    ctx.setLight = (on) => {
      if (!on) return l0(false);
      if (G.lightOut) {
        if (relighting) return; relighting = true; say('relight_wait', 1.4); ctx.sound('noise', 'tap');
        return later(() => { relighting = false; G.lightOut = false; G.light0(true); say('relight', 2.5); }, 1300);
      }
      return G.light0(true);
    };
    // 1.5.0 (#12): on a dry band the steps sound like dry concrete, not water
    ctx.stepSurfaceOf = (room) => {
      const c = cam(); if (ctx.floor !== 0) return null; if (G.onDry && G.onDry(c.x, c.z)) return 'concrete';
      const wy = G.waterYAt && G.waterYAt(c.x, c.z), d = wy == null ? 0 : wy - ctx.world.floorY(0) - (G.sillLiftAt ? G.sillLiftAt(c.x, c.z) : 0);
      return d >= 0.2 ? 'wade' : d > 0.03 ? 'water' : ROOM_SURFACE[room] || null;
    };
    // the valves: only from the lesson on
    G.canTurn = (id) => {
      // 1.5.0 (3rd play test #11 「一つ手前の止水弁を使うと回す理由がないと言われる」): while she comes in the lesson every valve works
      if (G.gh && G.gh.mode === 'lesson') return true;
      if (id === 'K_LESSON') return done('T_GATE') ? true : W.valve_early;
      return done('T_POST') ? true : W.valve_early;
    };
    G.mouthShut = () => !door('D_P1').isOpen || (G.wt.D_P1 && G.wt.D_P1.open < 0.6);
    G.lampS = {}; for (const [id, e] of Object.entries(G.lampEntry)) G.lampS[id] = G.project(e.x, e.z).s;
    G.evS = EVENTS.map(([id, x, z, what]) => ({ id, s: G.project(x, z).s, what }));
    // the watertight doors: our own [E] (the handle), locked by the story
    ctx.lockDoor('D_P1', () => !done('T_BOUSUI') || done('T_SEAL'));
    ctx.lockDoor('D_GATE', () => !done('T_GATE'));
    for (const id of ['D_P1', 'D_GATE']) { const it = door(id).mesh.userData.interact; it.kind = 'wtdoor'; }
    const d1 = door('D_P1'), hit = d1.mesh.clone(); hit.material = G.M.hidden; hit.position.z += 0.5; hit.userData = { interact: { kind: 'wtdoor', id: 'D_P1' } }; hit.name = 'sealhit:D_P1';
    ctx.world.group.add(hit); sealHit = hit;
    // with the flashlight dead, the green of the emergency lamps still reaches the walls near you: the way stays readable, faces do not
    const fill = new THREE.PointLight(0x7fa58c, 0, 7, 1.6); ctx.scene.add(fill);
    ctx.systems.push({ id: 'mn-fill', def: { update: () => { const on = G.lightOut && ctx.floor === 0; fill.intensity = on ? 0.9 : 0; if (on) { const c = ctx.camera.position; fill.position.set(c.x, c.y + 0.9, c.z); } } }, inst: null });
    ctx.systems.push({ id: 'mn-story', def: { update: (dt, c2, active) => update(dt, active) }, inst: null });
  });
  ext.registerInteract('wtdoor', {
    prompt: (o) => {
      if (o.id === 'D_GATE') return door('D_GATE').isOpen ? '' : '[E] 二枚目の防水扉（ハンドル）';
      if (!done('T_BOUSUI')) return '[E] 防水扉のハンドルを回す';
      if (done('T_ESCAPE') && !done('T_SEAL')) return '[E] 防水扉を閉める';
      if (done('T_SEAL')) return '防水扉（閉めてある）';
      return '';
    },
    run: (o) => {
      if (o.id === 'D_GATE') { if (!door('D_GATE').isOpen) ctx.startTask('T_GATE'); return; }
      if (!done('T_BOUSUI')) { ctx.startTask('T_BOUSUI'); return; }
      if (done('T_ESCAPE') && !done('T_SEAL')) { ctx.startTask('T_SEAL'); return; }
      if (done('T_SEAL')) ans('bousui_shut');
    },
  });

  // ---------------- L1: ひなた, the chained door, the key ----------------
  ext.registerTask('T_HINA', { run: async () => { await talk('hina1', 'ひなた'); return true; } });
  ext.registerTask('T_FRONT', { run: async () => { ctx.sound('noise', 'rattle'); await talk('front', '鎖の扉'); return true; } });
  ext.registerTask('T_KEY', { run: async () => { ctx.sound('noise', 'rattle'); return true; }, onDone: () => { apply(); later(() => talk('key_done', '受付')); } });

  // ---------------- L2: the ward ----------------
  ext.on('doc:read', ({ id }) => { if (id === 'DOC_CHART' && tryDone('T_KARTE')) { apply(); later(() => talk('karte_done', 'カルテ庫'), 300); } });

  // ---------------- L3: the basement and the passage ----------------
  ext.registerTask('T_GEN', { onDone: () => { G.genOn = true; G.b1Light(true); ctx.sound('noise', 'thud'); later(() => talk('gen_done', 'ポンプ室')); } });
  ext.registerTask('T_RADIO', { canStart: () => (done('T_GEN') ? true : W.radio_gen), onDone: () => later(() => talk('radio_done', '無線')) });
  // 1.5.0 (3rd play test #17 「地下通路からのドアを開けた時に水が廊下に流れ込む」): the passage held its water behind the door; opened,
  // it pours over the sill into the corridor (a sheet of water, the roar, the corridor water rising) before it settles
  ext.registerTask('T_BOUSUI', { canStart: () => (done('T_RADIO') ? true : W.bousui_radio), onDone: () => { G.spinWheel('D_P1', 1.4); ctx.sound('creak'); door('D_P1').open(); inflow(); later(() => talk('bousui_done', '防水扉'), 2600); } });
  // 1.6.0 (#11): the knee water of the passage (above the coaming behind the shut door) pours over it into the basement as the slab slides:
  // the passage comes down to its level, the basement corridor up to the ankle-and-more of 0.12 m, all of it over 6.5 s
  function inflow() {
    later(() => G.pourOver && G.pourOver('D_P1', 'MOUTH', 6.5), 1200);   // once the slab has slid a third of the way
    for (const r of PASS_W) G.setWater(r, W_LV, { sec: 7.7, from: PRE });
    for (const r of B1W) G.setWater(r, 0.12, { sec: 7.7, from: 0.07 });
  }
  for (const n of [1, 2, 3, 4]) ext.registerTask(`T_LAMP${n}`, {
    run: async () => { ctx.sound('noise', 'tap'); G.lampOn(`S_LAMP${n}`); return true; },
    onDone: () => { say('lamp_done', 3); if (n === 1) later(() => radio('radio1'), 9000); },
  });
  ext.registerTask('T_GATE', {
    canStart: () => (!flag('gate_seen') ? W.gate_look : G.gh.mode === 'gate' ? W.gate_wait : true),
    run: async () => { G.spinWheel('D_GATE', 1.4); ctx.sound('creak'); return true; },
    // 1.6.0 (#11): the deeper water behind the second door pours over its coaming into P4A as it opens; both sides come to one level
    onDone: () => { door('D_GATE').open(); for (const r of PASS_E) G.setWater(r, W_LV, { sec: 8.2, from: PRE }); later(() => G.pourOver && G.pourOver('D_GATE', 'P4A', 7), 1200); },
  });
  ext.registerTask('T_JAR', { onDone: () => rise() });

  // the window of the second watertight door: the first sight of her (the pump draws the water down and she sinks with it)
  function gateScene() {
    setFlag('gate_seen');
    G.ghostStart('gate', G.gateS - 6, { speed: 1.3, onStop: () => {
      ctx.sound('noise', 'knock', { pos: { x: -4, y: 1.5, z: -81.8 }, n: 4 }); ctx.sound('stinger'); ctx.fx && ctx.fx.spook && ctx.fx.spook(0.9);
      later(async () => { await talk('gate', '二枚目の防水扉'); G.ghostFade(); }, 1400);
    } });
  }
  // the valve lesson: she comes from the far end; a drained valve stops her (she never kills here)
  let lessonBack = 0;
  function lessonStart(again) {
    // 1.2.0 (#21 「最初に敵が出た時に触れても自分が死なない」): contact is a catch here too; back before the lesson, she comes again
    G.ghostStart('lesson', G.project(9, -81.8).s, { speed: 1.3, onCatch: () => { G.ghostStop(); ctx.checkpoint = { x: -3.4, z: -81.8, yaw: -Math.PI / 2, floor: 0 }; ctx.die('lesson'); } });
    say(again ? 'lesson_again' : 'lesson_start', 5); ctx.sound('stinger'); if (again) later(() => say('lesson_any', 5), 5200);
  }
  ext.on('minase:ghost-press', ({ id }) => {
    if ((id === 'K_LESSON' || (G.gh.mode === 'lesson' && G.posts.has(id))) && !flag('post_ok')) { setFlag('post_ok'); talk('post_ok', '止水弁').then(() => say('valve_first', 5)); }
  });
  ext.on('minase:refill', ({ id }) => { if (G.gh.mode === 'lesson' && G.posts.has(id)) { G.ghostRetreat(); ctx.completeTask('T_POST'); later(() => talk('post_done', '止水弁'), 1600); } });
  ext.on('minase:ghost-gone', ({ mode }) => {
    if (mode === 'lesson' && !done('T_POST')) later(() => { if (!done('T_POST') && ctx.state.room === 'P4B') lessonStart(true); }, 1500);
  });
  ext.on('minase:ghost-lost', () => say('hide_lost', 4));
  let sankN = 0;
  ext.on('minase:ghost-sank', ({ on }) => { if (sankN++ < 3) say(on ? 'ghost_sank_on' : 'ghost_sank', 5); });
  ext.on('minase:valve-behind', () => say('valve_behind', 6));
  // 1.5.2: the beat while a dry band holds her in the chase (chimera.js pressBeat): her voice the first two times, then only the noise
  let surgeN = 0;
  ext.on('minase:ghost-surge', ({ mode }) => { if (mode === 'chase' && surgeN++ < 2) voice('press_open'); });
  ext.on('minase:dry-first', () => { if (!G.gh || G.gh.mode !== 'chase') say('dry_floor', 4); });
  // 1.5.0 (3rd play test #18 / #9): she comes up ahead of you; she bangs on a shut door, then breaks it
  ext.on('minase:ghost-ahead', () => later(() => say('chase_ahead', 5), 500));
  let bangSaid = false;
  ext.on('minase:door-bang', () => { if (!bangSaid) { bangSaid = true; later(() => say('door_bang', 4), 700); } });
  ext.on('minase:door-forced', () => say('door_forced', 2.5));
  ext.on('minase:grate', () => { const n = G.grated.length; if (n >= 3) tryDone('T_SQ2'); else say('sq2_count', 3); });

  // ---------------- L4: the jar, the chase, the first watertight door, the pump room ----------------
  let snap = null;
  const takeSnap = G.takeSnap = () => { snap = { posts: Object.fromEntries([...G.posts.values()].map((P) => [P.def.id, P.on ? P.burn : -1])) }; };
  const caught = () => { G.ghostStop(); ctx.die('chimera'); };
  function chaseFrom(s, rise, o = {}) { G.ghostStart('chase', s, { rise, onCatch: caught, ...o }); }
  G.chaseFrom = chaseFrom;
  async function rise() {
    G.jar7.visible = false;
    await talk('rise', '病理標本室');
    ctx.setLight(false); G.lightOut = true; ctx.sound('stinger'); ctx.fx && ctx.fx.spook && ctx.fx.spook(1);
    G.tankGlow.i = 1.6;
    // 1.6.0 (#11): the pipes burst as she rises: streams fall into the passage and the water comes up (one level everywhere it joins)
    for (const r of [...PASS_W, ...PASS_E]) G.setWater(r, FLOOD, { sec: 16, from: W_LV });
    if (G.pourFrom) for (const [x, z, r] of [[8.9, -92, 'P5'], [-17.6, -61, 'P3'], [-17.6, -74, 'P3'], [2.6, -20, 'P1'], [-9, -81.8, 'P4A']]) G.pourFrom(x, z, r, 16);
    apply();
    { const d = door('D_END'); if (d && !d.isOpen) d.open(); }   // the way out stands open (she pushed it as she rose)
    takeSnap(); chaseFrom(0, 5.0);   // 5 s: time to turn, see what rises out of the tank, and still run
    ctx.checkpoint = { x: 9, z: -106.4, yaw: 0, floor: 0 };
    if (ctx.lookTo) ctx.lookTo({ x: 6.9, y: ctx.world.floorY(0) + 1.3, z: -104 }, { sec: 1.6 });   // #20: you see her rise, every time
    say('chase_go', 7);
    later(() => { if (ctx.controlHint) ctx.controlHint('run', { why: 'ここからは走れる。', once: false }); }, 1800);
    later(() => { if (G.lightOut) { say('chase_dark', 5); if (ctx.controlHint) ctx.controlHint('light', { why: '懐中電灯が消えた。', text: '叩いてつけ直す', once: false }); } }, 3400);
  }
  function resumeChase() {
    const ps = G.project(cam().x, cam().z).s;
    if (done('T_JAR') && !done('T_ESCAPE')) ctx.checkpoint = flag('cp_mid') ? CP_MID : flag('cp_gate') ? CP_GATE : { x: 9, z: -106.4, yaw: 0, floor: 0 };   // #23
    if (done('T_JAR') && !done('T_ESCAPE')) { takeSnap(); chaseFrom(flag('cp_mid') || flag('cp_gate') ? Math.max(0, ps - 16) : 0, 4.0); }
    else if (done('T_ESCAPE') && !done('T_SEAL')) chaseFrom(G.mouthS - 14, 1.5);
  }
  ext.on('player:respawn', () => {
    if (done('T_JAR') && !done('T_ESCAPE') && snap) {
      if (ctx.fp && ctx.state.room !== 'P2') ctx.fp.crouching = false;   // back on your feet to run
      for (const [id, v] of Object.entries(snap.posts)) G.setPost(id, v >= 0, Math.max(0, v));
      const ps = G.project(cam().x, cam().z).s;
      chaseFrom(flag('cp_mid') || flag('cp_gate') ? Math.max(0, ps - 16) : 0, 4.0);   // back at the cabinet she rises again behind you (4 s to get going)
    } else if (done('T_ESCAPE') && !done('T_SEAL')) { for (const P of G.posts.values()) G.setPost(P.def.id, false); chaseFrom(G.mouthS - 14, 1.5); }
    if (G.gh.mode === 'lesson') G.ghostStop();
    if (done('T_LEDGER') && !done('T_THINK')) { G.wrong = 0; apply(); }
  });
  ext.registerTask('T_SEAL', {
    run: async () => { const d = door('D_P1'); G.spinWheel('D_P1', 1.6); d.close(); G.ghostStop(); ctx.answer(W.seal_shut, 2.5); return true; },   // 1.6.0 (#9): the slab's own grind and clank (hospital.js)
    onDone: () => { for (const P of G.posts.values()) G.setPost(P.def.id, false); for (const r of [...B1W, 'PUMP', 'JIMU', 'REIAN']) G.setWater(r, 0.4, { sec: 10 }); if (G.gurgle) G.gurgle({ x: 6, y: 0.1, z: 7.5 }, 6); apply(); later(async () => { await talk('seal_done', '防水扉'); say('rescue_go', 4); }, 600); },
  });
  ext.registerTask('T_RESCUE', {
    canStart: () => (done('T_SEAL') ? true : done('T_GEN') ? W.pump_ok : W.pump_early),
    onDone: () => { G.setWater('PUMP', null, { drain: true, sec: 7, at: { x: 2.2, y: 0.1, z: 10.1 } }); for (const r of B1W) G.setWater(r, 0.07, { drain: true, sec: 8 }); for (const r of ['JIMU', 'REIAN']) G.setWater(r, null, { drain: true, sec: 8 }); ctx.sound('noise', 'splash'); apply(); later(() => talk('rescue_done', 'ポンプ室')); },   // 1.3.0 (#10): the pump draws it down
  });

  // ---------------- L5: the ledger, the questions under the water, the return, the endings ----------------
  ext.registerTask('T_LEDGER', {
    canStart: () => (has('NAMETAG') ? true : W.cab_locked),
    onDone: () => { G.wrong = 0; apply(); ctx.sound('noise', 'splash'); later(() => talk('ledger_done', '病理事務室').then(() => { apply(); })); },
  });
  ext.registerTask('T_THINK', { run: async () => {
    const Q = ctx.data.water.think;
    { const dj = door('D_JIMU'); if (dj && dj.isOpen) { dj.close(); ctx.audio && ctx.audio.noise && ctx.audio.noise('thud', { pos: { x: 9, y: 1, z: 9 } }); } }   // 1.6.0 (#1): the questions' water stands higher than the office's sill: the door shuts on it
    await ctx.talk([{ who: '私', text: Q.intro }], { title: '事務机' });
    G.wrong = G.wrong || 0;
    for (const [i, q] of Q.questions.entries()) {
      for (;;) {
        // 1.3.0 (2nd play test #14 #15): the questions are the old 照合票 of the pathology office (paper, a stamp on the answer), and while the
        // player reads, ひなた holds the check valve: a bar runs down and she urges them on. Running out costs nothing but nerves: the water
        // rises a little (never past the wrong-answer level, never a death) and the bar starts again; it never answers for the player.
        const urge = (ctx.data.talk.think_urge || []);
        const v = await ctx.choose({ who: '私', title: `標本照合票（${i + 1} / ${Q.questions.length}）`, text: q.q, look: 'form',
          form: { org: '水無瀬病院　病理科　標本室', title: '標 本 照 合 票', no: `第七号　問 ${i + 1} / ${Q.questions.length}`, stamp: '照合', paper: 'ledger' },
          timer: { seconds: 24, urge: urge.slice(0, 2).map((L, k) => ({ ...L, at: k ? 0.25 : 0.6 })), out: urge[2],
            onOut: () => { G.press = Math.min(0.12, (G.press || 0) + 0.04); G.setWater('JIMU', 0.06 + (G.wrong || 0) * 0.18 + G.press); ctx.sound('noise', 'splash'); } },
          options: q.options.map((o) => ({ id: o.id, label: o.label })) });
        if (!v) return false;
        const o = q.options.find((x) => x.id === v);
        if (o.ok) { G.press = 0; await ctx.talk([{ who: '私', text: o.why }], { title: '事務机' }); break; }
        G.wrong++; G.setWater('JIMU', 0.06 + G.wrong * 0.18); ctx.sound('noise', 'splash'); ctx.fx && ctx.fx.spook && ctx.fx.spook(0.5);
        await ctx.talk([{ who: '私', text: `……ちがう。${o.why}` }, { who: 'ひなた', text: G.wrong >= 3 ? '湊……もう、押さえきれない……！' : '水が……上がってきた。湊、落ち着いて。もう一回。' }], { title: '事務机' });
        if (G.wrong >= 3) { ans('think_flood'); later(() => ctx.die('flood'), 600); return false; }
      }
    }
    await talk('think_done', '事務机');
    return true;
  }, onDone: () => apply() });
  ext.registerTask('T_RETURN', { run: async () => {
    const named = flag('named');
    const v = await ctx.choose({ who: '私', title: '床の排水口', text: `七番の瓶を、排水口の水の中の早苗さんに返す。\n返した瓶は、黒木さんには渡せなくなる。黒木さんの鎖は外れない。外へは、霊安室の搬出口から出る。${named ? '\n日誌で、早苗さんの名前と、何をしに来たのかが分かっている。名前を呼んで返せる。' : ''}`, options: [{ id: 'no', label: 'まだ返さない' }, { id: 'yes', label: named ? '名前を呼んで、瓶を返す' : '瓶を返す', primary: true }] });
    if (v !== 'yes') { if (v) ans('return_wait'); return false; }
    await talk(named ? 'return_name' : 'return_plain', '床の排水口');
    removeItem('JAR'); setFlag('returned'); if (named) setFlag('called');
    return true;
  }, onDone: () => apply() });
  ext.registerTask('T_END', {
    canStart: () => (!has('HEARSE_KEY') ? W.hearse_locked : !done('T_RETURN') ? W.hearse_jar : true),
    run: async () => {
      ctx.sound('noise', 'rattle'); G.hearseOpen = 1; G.hearseOut.visible = true;
      await talk('hearse', '霊安室の搬出口');
      setFlag(flag('called') ? 'end_name' : 'end_return'); ctx.checkEndings();
      return true;
    },
  });
  ext.registerTask('T_GIVE', {
    canStart: () => (has('JAR') ? true : W.give_nojar),
    run: async () => {
      const v = await ctx.choose({ who: '私', title: '鎖の扉', text: `瓶を黒木さんに渡せば、鎖は外される。携帯も返ってくる。${done('T_THINK') ? '\n渡した瓶は、もう早苗さんに返せない。早苗さんは、瓶を持つ者を追いかける。' : '\n（この瓶が誰のものか、まだ分からない。地下の病理事務室に、鍵のかかった棚があった。）'}`, options: [{ id: 'no', label: 'まだ渡さない' }, { id: 'give', label: '瓶を黒木さんに渡す', primary: !done('T_THINK') }] });
      if (v !== 'give') { if (v) ans('give_wait'); return false; }
      await talk('give', '鎖の扉');
      removeItem('JAR'); setFlag('end_give'); ctx.checkEndings();
      return true;
    },
  });
  ext.registerTask('T_SQ1', {
    canStart: () => { const miss = [['PAGE1', '診察室の机'], ['PAGE2', '霊安室のストレッチャー'], ['PAGE3', '研究棟への下りの通路']].filter(([i]) => !has(i)).map(([, l]) => l); return miss.length ? `${W.sq1_more}${miss.join('、')}` : true; },
    onDone: () => { setFlag('named'); later(() => talk('sq1_done', '日誌')); },
  });

  // ---------------- rooms ----------------
  ext.on('player:room', ({ to }) => {
    if (!ctx) return;
    if (to === 'B_STAIR' && done('T_KARTE') && !done('T_KAIDAN')) { ctx.completeTask('T_KAIDAN'); apply(); later(() => talk('down', '地下').then(() => say('down_go', 6)), 500); }
    if (to === 'B_ROKA' && done('T_KAIDAN') && !flag('hina_pump')) { setFlag('hina_pump'); apply(); }
    if (to === 'HYOHON' && tryDone('T_HYOHON')) { apply(); later(() => talk('hyohon', '病理標本室'), 300); }
    if (to === 'MOUTH' && done('T_JAR') && !done('T_ESCAPE') && G.gh.mode === 'chase') {
      ctx.completeTask('T_ESCAPE');
      G.gh.s = Math.min(G.gh.s, G.mouthS - 12); G.gh.lunge = 99; sealSpot();
      talk('top', '防水扉').then(() => { if (!done('T_SEAL')) say('seal_go', 5); });
    }
    if (to === 'PUMP' && done('T_SEAL') && !done('T_RESCUE') && !flag('rescue_in')) { setFlag('rescue_in'); later(() => talk('rescue_in', 'ポンプ室'), 300); }
    if (to === 'P4A' && G.gh.mode === 'chase' && !flag('cp_gate')) { setFlag('cp_gate'); ctx.checkpoint = CP_GATE; takeSnap(); }
  });
  ext.on('thing:look', ({ id }) => { if (id === 'HY_TAPE') { ctx.sound('noise', 'tap'); later(() => ctx.talk('tape', { title: 'カセットテープ「口述　九月」' }), 600); } });   // 1.5.0 (#10)
  ext.on('thing:look', ({ id }) => { if (id === 'GEN_DOOR' && done('T_FRONT') && !has('JAR') && !done('T_GIVE') && !done('T_RETURN')) ctx.talk('kuroki_wait', { title: '鎖の扉' }); else if (id === 'GEN_DOOR' && done('T_FRONT')) ans('front_again'); });   // 1.2.0 (#9): 黒木 answers at the door, face and all

  // ---------------- every frame ----------------
  let hintT = 0, flick = 0, black = 0, peek = 0;
  // 1.7.0 (5th play test #11 「抑えているシーンが緊迫感が欲しい。机を調べるまで女の子が中腰になっているだけ」): while ひなた holds the
  // check valve of the drain (after the ledger, until the questions are answered) it kicks back from below: a blow under the grate, the
  // grate jumping and spray round her hands, her body thrown, the flashlight stuttering, binders off the cabinets. The blows come faster
  // the longer you take (3.6 s -> 1.3 s over 70 s): the time limit you can hear; she says so between them (hold_urge)
  const HOLD = { t: 2, n: 0, since: 0, line: 6 };
  function holdBeat(dt, c) {
    const on = done('T_LEDGER') && !done('T_THINK') && G.hinaAt === 'drain' && ctx.floor === 0;
    if (!on) { HOLD.since = 0; HOLD.n = 0; HOLD.t = 2; return; }
    HOLD.since += dt; HOLD.t -= dt; HOLD.line -= dt;
    const hr = G.hina && G.hina.root, k = G.hinaJolt = Math.max(0, (G.hinaJolt || 0) - dt * 3);
    if (hr && k > 0) { hr.position.y = ctx.world.floorY(0) + Math.sin(k * 30) * 0.03 * k; hr.rotation.x = -0.12 * k; } else if (hr && hr.rotation.x) { hr.rotation.x = 0; hr.position.y = ctx.world.floorY(0); }
    if (HOLD.t > 0) return;
    HOLD.n++; HOLD.t = Math.max(1.3, 3.6 - HOLD.since * 0.033) + Math.random() * 0.6;
    const at = { x: 9.0, y: ctx.world.floorY(0) + 0.1, z: 11.6 };
    ctx.audio && ctx.audio.noise && (ctx.audio.noise('knock', { pos: at, n: HOLD.n % 3 === 0 ? 3 : 2, gap: 0.09, gain: 1.8 }), ctx.audio.noise('thud', { pos: at, gain: 1.3 }));
    G.drainKick = 1; G.hinaJolt = 1;
    if (G.wake && G.waterYAt) for (let i = 0; i < 4; i++) G.wake(at.x + (Math.random() - 0.5) * 0.7, G.waterYAt(at.x, at.z) ?? at.y, at.z + (Math.random() - 0.5) * 0.7, true);
    if (HOLD.n % 2 === 0) flick = 0.45;
    if (HOLD.n === 3 || HOLD.n === 6 || HOLD.n === 10) G.dropThing && G.dropThing(HOLD.n);
    if (Math.hypot(c.x - at.x, c.z - at.z) < 6 && ctx.fx && ctx.fx.spook) ctx.fx.spook(0.15);
    if (HOLD.line <= 0) { const L = ctx.data.talk.hold_urge || []; const l = L[(HOLD.n >> 1) % Math.max(1, L.length)]; if (l) { if (l.voice && ctx.voiceLine) ctx.voiceLine(l.voice, null, { prio: 'hint' }); ctx.ui.say(`<span class="who">ひなた</span>${l.text}`, 3.5); } HOLD.line = 11; }
  }
  function update(dt, active) {
    if (!active || !ctx) return;
    const c = cam(), room = ctx.state.room;
    // the passage: no running on the way in (wet tiles); the knee water slows the legs
    ctx.fp.o.run = PASSAGE.has(room) && !done('T_JAR') ? ctx.fp.o.speed : RUN0;
    ctx.fp.slow = room === 'P3' ? 0.7 : room === 'PUMP' && done('T_SEAL') && !done('T_RESCUE') ? 0.75 : 1;
    if (room === 'P2' && !ctx.fp.crouching) { hintT -= dt; if (hintT <= 0) { say('crouch_hint', 3); hintT = 8; } } else hintT = Math.min(hintT, 1);
    // the flashlight: a flicker, a blackout
    if (ctx.flashlight && ctx.lightOn && LIT) {
      if (black > 0) { black -= dt; ctx.flashlight.intensity = black > 0 ? 0.05 : LIT; }
      else if (flick > 0) { flick -= dt; ctx.flashlight.intensity = flick > 0 ? LIT * (0.2 + Math.random() * 0.5) : LIT; }
    }
    holdBeat(dt, c);
    if (peek > 0) { peek -= dt; if (peek <= 0 && G.gh.mode === 'peek') G.ghostFade(); }
    if (ctx.floor === 0) {
      const me = G.project(c.x, c.z);
      // the way in: a moment every few metres
      if (done('T_LAMP1') && !done('T_JAR') && me.d < 3) for (const e of G.evS) if (!G.ev.includes(e.id) && me.s < e.s && e.s - me.s < 2.5) { G.ev.push(e.id); moment(e.what); break; }
      // the window of the second watertight door, the lesson
      if (room === 'P4A' && done('T_LAMP3') && !flag('gate_seen') && c.x > -10.5 && G.gh.mode === 'off') gateScene();
      if (room === 'P4B' && done('T_GATE') && !done('T_POST') && G.gh.mode === 'off' && c.x > -2.6) lessonStart(false);
      if (G.gh.mode === 'lesson' && c.x > 2.65) { lessonBack -= dt; if (lessonBack <= 0) { say('lesson_back', 4); lessonBack = 6; } }
      // a checkpoint at the mouth of the low passage on the way back
      // before the low passage: you crawl there; a valve behind you first
      if (G.gh.mode === 'chase' && room === 'P3' && c.z > -52 && !G.lowWarned) { G.lowWarned = true; say('chase_low', 6); }
      if (G.gh.mode === 'chase' && (room === 'P2' || room === 'P3') && c.z > -43.4 && c.x > -17.4 && !flag('cp_mid')) { setFlag('cp_mid'); ctx.checkpoint = CP_MID; takeSnap(); say('cp_mid', 2.5); }
    }
  }
  const noise = (name, pos, n) => ctx.audio && ctx.audio.noise && ctx.audio.noise(name, { pos, n });
  function moment(what) {
    const c = cam();
    const ahead = (d) => { const p = G.routeAt(G.project(c.x, c.z).s - d); return { x: p.x, y: 1.2, z: p.z }; };
    const behind = () => { const p = G.routeAt(G.project(c.x, c.z).s + 3.5); return { x: p.x, y: 1.0, z: p.z }; };   // the route runs from the tank (s 0) out: behind you on the way in is a larger s
    switch (what) {
      // 1.5.0 (3rd play test #6): every line about a sound comes after the sound, near and loud enough to hear where it is
      case 'drip': ctx.cueThenSay(() => noise('drip', ahead(4), 6), W.ev_drip, { lead: 1.2, sec: 5 }); break;
      case 'hair': say('ev_hair', 4); break;
      case 'flick': flick = 1.4; voice('whisper1'); say('ev_flick', 4); break;
      // 1.6.0 (4th play test #4 「振り向いても～は実際に自分が振り向いた場合に表示」「音が実際にするように」): the sound plays 3.5 m behind you on
      // the way you came (kit ctx.cueBehind), loud and placed; the line comes only when you turn to look
      case 'clang': ctx.cueBehind((p) => { noise('thud', { x: p.x, y: 2.4, z: p.z }, 2); ctx.audio && ctx.audio.noise && ctx.audio.noise('rattle', { pos: { x: p.x, y: 2.4, z: p.z } }); ctx.body && ctx.body.play && ctx.body.play('stagger'); }, W.ev_clang, { place: behind, sec: 4 }); break;
      case 'low': say('ev_low', 5); break;
      case 'hands': say('ev_hands', 5); break;
      // 1.5.0 (3rd play test #1 「すっと消える」): she wades across the far end with a wrong gait, stops, turns her head to you, and is pulled
      // under (chimera.js mode 'cross'); the line comes once she is gone
      case 'cross': G.ghostStart('cross', G.project(-17.6, -46.5).s, { speed: 0 }); noise('splash', { x: -17.6, y: 0.3, z: -45 }, 2); ctx.sound('stinger'); voice('whisper1'); later(() => say('ev_cross', 4), 5400); break;
      case 'water': noise('splash', { x: c.x, y: 0.2, z: c.z }, 2); say('ev_water', 5); break;
      case 'splash': ctx.cueBehind((p) => { noise('splash', { x: p.x, y: 0.35, z: p.z }, 3); const wy = G.waterYAt && G.waterYAt(p.x, p.z); if (wy != null && G.wake) for (let i = 0; i < 3; i++) G.wake(p.x + (Math.random() - 0.5) * 0.5, wy, p.z + (Math.random() - 0.5) * 0.5, true); }, W.ev_splash, { place: behind, sec: 4 }); break;
      case 'float': say('ev_float', 5); break;
      case 'hum': black = 1.6; ctx.cueThenSay(() => ctx.audio && ctx.audio.tone && ctx.audio.tone({ dur: 3.4, freq: 220, type: 'sine', gain: 0.06, vibrato: 4, wet: 0.6 }), W.ev_hum, { lead: 1.4, sec: 5 }); break;
      case 'radio2': radio('radio2'); break;
      case 'drag': noise('scrape', ahead(8), 4); say('ev_drag', 4); break;
      case 'clink': ctx.cueThenSay(() => noise('tap', { x: 9, y: 1.2, z: -101 }, 5), W.ev_clink, { lead: 1.3, sec: 4 }); later(() => voice('whisper2'), 3200); break;
    }
  }
  function voice(key) { const L = (ctx.data.talk[key] || [])[0]; if (!L) return; if (L.voice && ctx.voiceLine) ctx.voiceLine(L.voice, null, { prio: 'story' }); ctx.ui.say(`<span class="who">女の声</span>${L.text}`, 3); }
  function radio(key) { const L = (ctx.data.talk[key] || [])[0]; if (!L) return; ctx.sound('pickupPhone'); if (L.voice && ctx.voiceLine) ctx.voiceLine(L.voice, 'phone', { prio: 'story' }); ctx.ui.say(`<span class="who">ひなた（無線）</span>${L.text}`, 6); }

  ext.registerPersist('story', {
    serialize: () => ({ ev: G.ev, lampsOut: G.lampsOut, lightOut: !!G.lightOut, wrong: G.wrong || 0 }),
    restore: (s) => { if (!s) return; G.ev = s.ev || []; G.lampsOut = s.lampsOut || []; G.lightOut = !!s.lightOut; G.wrong = s.wrong || 0; apply(true); },
  });
}
