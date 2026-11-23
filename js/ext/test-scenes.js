// Test scenes (?scene=<id>, test mode: nothing is saved): one per key place, for screenshots and checks. tools/scene-links.mjs lists them.
// prepare() makes the world agree with the tasks done on the way (they ran quietly): the generator, the lamps, the doors, the water, ひなた.
const L1 = ['T_HINA', 'T_FRONT', 'T_KEY'];
const L2 = ['T_KARTE', 'T_KAIDAN'];
const L3a = ['T_GEN', 'T_RADIO', 'T_BOUSUI', 'T_LAMP1'], L3b = [...L3a, 'T_LAMP2', 'T_LAMP3'], L3c = [...L3b, 'T_GATE', 'T_POST', 'T_LAMP4', 'T_HYOHON'];
const L4 = [...L1, ...L2, ...L3c, 'T_JAR'];
const L5 = [...L4, 'T_ESCAPE', 'T_SEAL', 'T_RESCUE'];
const B1 = ['hina_pump'];
export const SCENES = [
  { id: 'genkan', group: '一階', label: '玄関ホール（はじまり）', at: { x: 3.0, z: 23.6, yaw: 0, floor: 1 } },
  { id: 'front', group: '一階', label: '鎖の扉', tasks: ['T_HINA'], at: { x: 2.6, z: 24.2, yaw: Math.PI, floor: 1 } },
  { id: 'uke', group: '一階', label: '受付（キーボックス）', tasks: ['T_HINA', 'T_FRONT'], at: { x: 18.0, z: 21.0, yaw: -Math.PI / 2, floor: 1 } },
  { id: 'karte', group: '一階', label: 'カルテ庫', tasks: L1, at: { x: 3.0, z: 13.4, yaw: -1.2, floor: 1 } },
  { id: 'shin', group: '一階', label: '診察室（洗面台）', tasks: L1, at: { x: 9.0, z: 13.0, yaw: 0, floor: 1 } },
  { id: 'kaidan', group: '一階', label: '階段ホール', tasks: [...L1, 'T_KARTE'], items: ['KEY_B1'], at: { x: 14.5, z: 14.0, yaw: -0.8, floor: 1 } },
  { id: 'broka', group: '地下', label: '地下の廊下', tasks: [...L1, ...L2], flags: B1, at: { x: 15.0, z: 7.5, yaw: Math.PI / 2, floor: 0 } },
  { id: 'pump', group: '地下', label: 'ポンプ室（発電機）', tasks: [...L1, ...L2], flags: B1, at: { x: 3.0, z: 10.4, yaw: 2.6, floor: 0 } },
  { id: 'mouth', group: '地下', label: '防水扉の前', tasks: [...L1, ...L2, 'T_GEN', 'T_RADIO'], flags: B1, at: { x: 3.0, z: 3.5, yaw: 0, floor: 0 } },
  { id: 'p1', group: '通路', label: '配管の通路', tasks: [...L1, ...L2, ...L3a], flags: B1, at: { x: 2.6, z: -5, yaw: 0, floor: 0 } },
  { id: 'p2', group: '通路', label: '低い通路（しゃがむ）', tasks: [...L1, ...L2, ...L3a], flags: B1, at: { x: 1.8, z: -41.8, yaw: Math.PI / 2, floor: 0 } },
  { id: 'p3', group: '通路', label: '水の通路', tasks: [...L1, ...L2, ...L3a, 'T_LAMP2'], flags: B1, at: { x: -17.6, z: -46, yaw: 0, floor: 0 } },
  { id: 'gate', group: '通路', label: '二枚目の防水扉（窓）', tasks: [...L1, ...L2, ...L3b], flags: B1, at: { x: -12, z: -81.8, yaw: -Math.PI / 2, floor: 0 } },
  { id: 'lesson', group: '通路', label: '止水弁（練習）', tasks: [...L1, ...L2, ...L3b, 'T_GATE'], flags: [...B1, 'gate_seen'], at: { x: -3, z: -81.8, yaw: -Math.PI / 2, floor: 0 } },
  { id: 'hyohon', group: '通路', label: '病理標本室', tasks: [...L1, ...L2, ...L3c], flags: [...B1, 'gate_seen'], at: { x: 9, z: -101.2, yaw: 0, floor: 0 } },
  { id: 'escape', group: '通路', label: '瓶を持って逃げる（標本室）', tasks: L4, items: ['JAR', 'NAMETAG'], flags: [...B1, 'gate_seen'], chase: 0, at: { x: 9, z: -105, yaw: Math.PI, floor: 0 } },
  { id: 'escape-p3', group: '通路', label: '逃げる（水の通路の入口）', tasks: L4, items: ['JAR', 'NAMETAG'], flags: [...B1, 'gate_seen'], chase: 12, at: { x: -17.6, z: -79, yaw: Math.PI, floor: 0 } },
  { id: 'seal', group: '地下', label: '防水扉を閉める', tasks: [...L4, 'T_ESCAPE'], items: ['JAR', 'NAMETAG'], flags: [...B1, 'gate_seen'], seal: true, at: { x: 2.6, z: 1.0, yaw: 0, floor: 0 } },
  { id: 'rescue', group: '地下', label: 'ポンプ室（水がたまる）', tasks: [...L4, 'T_ESCAPE', 'T_SEAL'], items: ['JAR', 'NAMETAG'], flags: [...B1, 'gate_seen'], at: { x: 3.0, z: 10.4, yaw: 2.6, floor: 0 } },
  { id: 'jimu', group: '地下', label: '病理事務室（台帳の棚）', tasks: L5, items: ['JAR', 'NAMETAG'], flags: [...B1, 'gate_seen'], at: { x: 9.0, z: 10.2, yaw: Math.PI, floor: 0 } },
  { id: 'think', group: '地下', label: '事務机（水が上がる）', tasks: [...L5, 'T_LEDGER'], items: ['JAR', 'NAMETAG', 'HEARSE_KEY'], flags: [...B1, 'gate_seen'], at: { x: 7.6, z: 13.2, yaw: Math.PI, floor: 0 } },
  { id: 'drain', group: '地下', label: '排水口（瓶を返す・日誌あり）', tasks: [...L5, 'T_LEDGER', 'T_THINK', 'T_SQ1'], items: ['JAR', 'NAMETAG', 'HEARSE_KEY'], flags: [...B1, 'gate_seen', 'named'], at: { x: 8.2, z: 10.4, yaw: Math.PI * 0.8, floor: 0 } },
  { id: 'end', group: '地下', label: '霊安室の搬出口（結末の前）', tasks: [...L5, 'T_LEDGER', 'T_THINK', 'T_RETURN'], items: ['NAMETAG', 'HEARSE_KEY'], flags: [...B1, 'gate_seen', 'returned'], at: { x: 11.5, z: 3.0, yaw: -Math.PI / 2, floor: 0 } },
  { id: 'give', group: '一階', label: '鎖の扉（瓶を持って戻った）', tasks: L5, items: ['JAR', 'NAMETAG'], flags: [...B1, 'gate_seen'], at: { x: 2.6, z: 24.2, yaw: Math.PI, floor: 1 } },
];
export function installTests(ext, G) {
  ext.registerTestScenes(SCENES, {
    prepare: (sc, a) => {
      const ctx = a.ctx;
      for (const i of sc.items || []) if (!ctx.state.inv.includes(i)) ctx.state.inv.push(i);
      for (const f of sc.flags || []) if (!ctx.state.flags.includes(f)) ctx.state.flags.push(f);
      if (sc.at.floor === 0) { const ps = G.project(sc.at.x, sc.at.z).s; for (const e of G.evS || []) if (e.s >= ps - 0.5 && !G.ev.includes(e.id)) G.ev.push(e.id); }
      if (ctx.state.tasks.includes('T_JAR')) G.lightOut = false;
      if (G.applyStory) G.applyStory(true);
      for (const id of ['D_P1', 'D_GATE']) { const d = ctx.world.doors.get(id); if (d && d.snap) d.snap(); }
      if (sc.chase != null) { const ps = G.project(sc.at.x, sc.at.z).s; G.chaseFrom(Math.max(0, ps - sc.chase), 5); }
      if (sc.seal) G.chaseFrom(G.mouthS - 14, 1.5);
    },
  });
}
