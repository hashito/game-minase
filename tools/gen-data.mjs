#!/usr/bin/env node
// Builds data/*.json for 水無瀬病院 ― 七番の瓶 from the tables below (one place for the layout, the valves, the tasks and the words).
//   node tools/gen-data.mjs
// Coordinates are absolute metres (x east, z south). The ground floor (1F) is floor 1; the basement and the long passage are floor 0.
// The rule of the game (docs/brief.md): あれは、水のある所しか進めない。止水弁を回して水を抜けば、そこで止まる。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wr = (p, v) => { fs.writeFileSync(path.join(ROOT, p), JSON.stringify(v, null, 2) + '\n'); console.log('wrote', p); };
const P = (k) => `assets/photos/${k}.webp`;

// ---------------------------------------------------------------- rooms
const R = (id, name, x, z, w, d, floor, type, extra = {}) => ({ id, name, x, z, w, d, floor, kind: extra.kind || (type === 'corridor' ? 'corridor' : 'room'), type, furnish: false, ...extra });
const rooms = [
  // 1F (the front is south, z 26)
  R('GENKAN', '玄関ホール', 0, 18, 6, 8, 1, 'corridor', { kind: 'room', floorTex: 'tile_floor_dirty', wallTex: 'plaster_water_stain', leak: 0.2 }),
  R('MACHI', '外来の待合', 6, 18, 10, 8, 1, 'hospital', { floorTex: 'linoleum_green', wallTex: 'plaster_water_stain', leak: 0.3 }),
  R('UKE', '受付', 16, 18, 4, 8, 1, 'office', { floorTex: 'linoleum_grey', wallTex: 'plaster_mold', leak: 0.15 }),
  R('ROKA', '一階の廊下', 0, 15, 20, 3, 1, 'corridor', { floorTex: 'linoleum_grey', wallTex: 'plaster_water_stain', leak: 0.15 }),
  R('KARTE', 'カルテ庫', 0, 9, 6, 6, 1, 'office', { floorTex: 'linoleum_grey', wallTex: 'plaster_mold', leak: 0.1 }),
  R('SHIN', '診察室', 6, 9, 6, 6, 1, 'hospital', { floorTex: 'tile_hospital_large', wallTex: 'plaster_water_stain', leak: 0.12 }),
  R('KAIDAN', '階段ホール', 12, 9, 8, 6, 1, 'corridor', { kind: 'room', floorTex: 'tile_floor_dirty', wallTex: 'plaster_mold', leak: 0.1 }),
  // B1 of the main building
  R('B_ROKA', '地下の廊下', 0, 6, 20, 3, 0, 'corridor', { floorTex: 'concrete_wet', wallTex: 'concrete_stained', leak: 0.05 }),
  R('B_STAIR', '地下の階段下', 12, 9, 8, 6, 0, 'corridor', { kind: 'room', floorTex: 'concrete_wet', wallTex: 'concrete_stained', leak: 0.05 }),
  R('PUMP', 'ポンプ室', 0, 9, 6, 6, 0, 'workshop', { floorTex: 'concrete_damp', wallTex: 'concrete_stained', leak: 0.04 }),
  R('JIMU', '病理事務室', 6, 9, 6, 6, 0, 'office', { floorTex: 'linoleum_grey', wallTex: 'plaster_mold', leak: 0.03 }),
  R('MOUTH', '防水扉の前', 0, -1, 6, 7, 0, 'workshop', { floorTex: 'concrete_wet', wallTex: 'concrete_stained', leak: 0.03 }),
  R('REIAN', '霊安室', 6, 0, 8, 6, 0, 'hospital', { floorTex: 'tile_hospital_large', wallTex: 'tile_bathroom_white', leak: 0.03 }),
  // the long passage to the research wing (about 150 m), then the specimen room at its end
  R('P1', '配管の通路', 1.6, -41, 2, 40, 0, 'corridor', { kind: 'corridor', floorTex: 'concrete_damp', wallTex: 'concrete_stained' }),
  R('P2', '低い通路', -18.6, -42.6, 22.2, 1.6, 0, 'corridor', { kind: 'corridor', floorTex: 'concrete_wet', wallTex: 'rust_heavy' }),
  R('P3', '水の通路', -18.6, -81, 2, 38.4, 0, 'corridor', { kind: 'corridor', floorTex: 'wet_floor', wallTex: 'concrete_damp' }),
  R('P4A', '二枚目の防水扉の手前', -18.6, -82.6, 14.6, 1.6, 0, 'corridor', { kind: 'corridor', floorTex: 'concrete_wet', wallTex: 'tile_broken_white' }),
  R('P4B', '二枚目の防水扉の先', -4, -82.6, 14, 1.6, 0, 'corridor', { kind: 'corridor', floorTex: 'concrete_wet', wallTex: 'tile_broken_white' }),
  R('P5', '下りの通路', 8, -100, 2, 17.4, 0, 'corridor', { kind: 'corridor', floorTex: 'concrete_cracked', wallTex: 'concrete_stained' }),
  R('HYOHON', '病理標本室', 5, -108, 8, 8, 0, 'hospital', { floorTex: 'tile_hospital_large', wallTex: 'tile_bathroom_white' }),
];

// ---------------------------------------------------------------- doors
const D = (id, a, b, x, z, look, o = {}) => ({ id, a, b, x, z, width: o.width || 1.1, look, ...o });
const doors = [
  D('D_MACHI', 'GENKAN', 'MACHI', 6, 22, 'none', { open: true, width: 2.4, reason: '玄関ホールから外来の待合へ、扉のない広い入口' }),
  D('D_ROKA1', 'GENKAN', 'ROKA', 3, 18, 'none', { open: true, width: 1.6, reason: '玄関ホールの奥が一階の廊下' }),
  D('D_ROKA2', 'MACHI', 'ROKA', 11, 18, 'none', { open: true, width: 2.0, reason: '待合の奥も一階の廊下につながる' }),
  D('D_UKE', 'MACHI', 'UKE', 16, 24.6, 'swing', { closable: true, reason: '待合の東の、受付の中への扉' }),
  D('D_KARTE', 'ROKA', 'KARTE', 3, 15, 'swing', { closable: true, unlock: 'ward', hint: 'カルテ庫の扉。……今は、ひなたと黒木さんの話が先だ。' }),
  D('D_SHIN', 'ROKA', 'SHIN', 9, 15, 'swing', { closable: true, unlock: 'ward', hint: '診察室の扉。……今は、ひなたと黒木さんの話が先だ。' }),
  D('D_KAIDAN', 'ROKA', 'KAIDAN', 16, 15, 'swing', { closable: true, unlock: 'ward', hint: '階段ホールの防火扉。鎖と南京錠がかかっている。受付に鍵があるかもしれない。' }),
  D('D_BSTAIR', 'B_STAIR', 'B_ROKA', 16, 9, 'none', { open: true, width: 1.6, reason: '階段を降りた先が地下の廊下' }),
  D('D_PUMP', 'B_ROKA', 'PUMP', 3, 9, 'swing', { closable: true, unlock: 'b1', hint: 'ポンプ室の扉。' }),
  D('D_JIMU', 'B_ROKA', 'JIMU', 9, 9, 'swing', { closable: true, unlock: 'b1', hint: '病理事務室の扉。' }),
  D('D_MOUTH', 'B_ROKA', 'MOUTH', 3, 6, 'none', { open: true, width: 1.6, reason: '地下の廊下の西の端から、研究棟への通路口へ' }),
  D('D_REIAN', 'B_ROKA', 'REIAN', 10, 6, 'swing', { closable: true, unlock: 'b1', hint: '霊安室の扉。' }),
  // the watertight door (防水扉) between the main building and the passage: story.js locks it and turns its handle
  D('D_P1', 'MOUTH', 'P1', 2.6, -1, 'slide', { width: 1.2, unlock: 'passage', hint: '厚い鉄の防水扉。ハンドルで閉めてある。' }),
  D('D_P12', 'P1', 'P2', 2.6, -41, 'none', { open: true, width: 1.6 }),
  D('D_P23', 'P2', 'P3', -17.6, -42.6, 'none', { open: true, width: 1.6 }),
  D('D_P34', 'P3', 'P4A', -17.6, -81, 'none', { open: true, width: 1.6 }),
  D('D_GATE', 'P4A', 'P4B', -4, -81.8, 'slide', { width: 1.2, unlock: 'passage', hint: '二枚目の防水扉。小さな丸い窓がある。' }),
  D('D_P45', 'P4B', 'P5', 9, -82.6, 'none', { open: true, width: 1.6 }),
  D('D_END', 'P5', 'HYOHON', 9, -100, 'swing', { closable: true, width: 1.2 }),
];
doors.push({ id: 'ST_DOWN', a: 'B_STAIR', b: 'KAIDAN', kind: 'stairs', look: 'flight', width: 1.2, unlock: 'down',
  hint: '地下への階段。下から、水の流れる音がする。',
  ends: { a: { x: 18.6, z: 12, dir: 'e', arrive: [15.4, 12], yaw: Math.PI / 2 }, b: { x: 18.6, z: 12, dir: 'e', arrive: [15.4, 12], yaw: Math.PI / 2 } },
  reason: '階段ホールから地下へ降りる階段' });

// ---------------------------------------------------------------- valves (止水弁) on the passage, the route she walks, the grates (side quest)
const water = {
  // valves: two red wheels at the sides of the passage, a drain grate across the floor between them. x / z = the middle of the passage
  posts: [
    { id: 'K_LESSON', room: 'P4B', x: 2.0, z: -81.8, along: 'x', label: '止水弁' },
    { id: 'K_P5', room: 'P5', x: 9, z: -98.8, along: 'z', label: '止水弁' },
    { id: 'K_P5B', room: 'P5', x: 9, z: -84.0, along: 'z', label: '止水弁' },
    { id: 'K_P4', room: 'P4A', x: -9.0, z: -81.8, along: 'x', label: '止水弁' },
    { id: 'K_P3A', room: 'P3', x: -17.6, z: -78.6, along: 'z', label: '止水弁' },
    { id: 'K_P3B', room: 'P3', x: -17.6, z: -60.0, along: 'z', label: '止水弁' },
    { id: 'K_P3C', room: 'P3', x: -17.6, z: -45.0, along: 'z', label: '止水弁' },
    { id: 'K_P1A', room: 'P1', x: 2.6, z: -28.0, along: 'z', label: '止水弁' },
    { id: 'K_P1B', room: 'P1', x: 2.6, z: -10.0, along: 'z', label: '止水弁' },
  ],
  // the clogged floor grates of the water passage (side quest: cleared, the water comes back more slowly)
  grates: [
    { id: 'G_1', room: 'P3', x: -18.0, z: -50.0, label: '詰まった排水口' },
    { id: 'G_2', room: 'P3', x: -17.2, z: -67.6, label: '詰まった排水口' },
    { id: 'G_3', room: 'P3', x: -18.0, z: -74.0, label: '詰まった排水口' },
  ],
  route: [[9, -104], [9, -100], [9, -81.8], [-17.6, -81.8], [-17.6, -41.8], [2.6, -41.8], [2.6, -0.6]],
};

// ---------------------------------------------------------------- stations
const S = (id, room, x, z, label, o = {}) => ({ id, room, x, z, label, ...o });
const stations = [
  S('S_HINA1', 'GENKAN', 1.0, 21.2, 'ひなた'),
  S('S_FRONT', 'GENKAN', 3.0, 25.45, '鎖の扉（黒木さん）'),
  S('S_KEYBOX', 'UKE', 19.75, 20.0, '受付のキーボックス', { look: 'pinbox', mount: 'wall' }),
  S('S_GEN', 'PUMP', 0.75, 12.0, '非常用発電機'),
  S('S_HINA2', 'PUMP', 4.3, 13.9, 'ひなた'),
  S('S_PUMPSW', 'PUMP', 5.5, 11.4, '排水ポンプの制御盤', { look: 'power', mount: 'wall' }),
  S('S_CAB', 'JIMU', 10.9, 14.45, '鍵のかかった台帳の棚'),
  S('S_DESK', 'JIMU', 7.2, 14.4, '事務机', { look: 'plan', mount: 'top' }),
  S('S_DRAIN', 'JIMU', 9.0, 11.6, '床の排水口'),
  S('S_SQ1', 'REIAN', 6.6, 3.2, '霊安室の机', { look: 'plan', mount: 'top' }),
  S('S_HEARSE', 'REIAN', 13.55, 3.0, '搬出口'),
  S('S_LAMP1', 'P1', 1.95, -4.2, '非常灯のスイッチ', { look: 'shutterbox', mount: 'wall' }),
  S('S_LAMP2', 'P3', -18.25, -44.2, '非常灯のスイッチ', { look: 'shutterbox', mount: 'wall' }),
  S('S_LAMP3', 'P4A', -16.0, -82.25, '非常灯のスイッチ', { look: 'shutterbox', mount: 'wall' }),
  S('S_LAMP4', 'P5', 9.65, -84.8, '非常灯のスイッチ', { look: 'shutterbox', mount: 'wall' }),
  S('S_SHELF', 'HYOHON', 9, -107.3, '標本の戸棚'),
];

// hides: lockers on a raised step (out of the water, she loses you)
const hides = [
  { id: 'H_MOUTH', room: 'MOUTH', x: 0.55, z: 2.4, look: 'locker', label: '台の上のロッカー' },
  { id: 'H_P1', room: 'P1', x: 3.25, z: -21.5, look: 'locker', label: '台の上のロッカー' },
  { id: 'H_P3', room: 'P3', x: -16.95, z: -66.0, look: 'locker', label: '台の上のロッカー' },
  { id: 'H_P5', room: 'P5', x: 9.65, z: -92.0, look: 'locker', label: '台の上のロッカー' },
];

// ---------------------------------------------------------------- furniture (kit props, against the walls)
const F = (id, room, kind, x, z, rot, o = {}) => ({ id, room, kind, x, z, rot, w: o.w || 1, d: o.d || 0.5, ...(o.args ? { args: o.args } : {}), ...(o.opts ? { opts: o.opts } : {}) });
const furniture = [
  F('F_GEN_BENCH', 'GENKAN', 'bench', 0.4, 23.4, 90, { w: 1.8, d: 0.45 }),
  F('F_GEN_SHOE', 'GENKAN', 'locker', 5.65, 25.2, -90),
  F('F_GEN_BIN', 'GENKAN', 'trashBin', 0.35, 25.6, 0),
  F('F_MA_B1', 'MACHI', 'bench', 9.2, 21.0, 0, { w: 2.4, d: 0.5 }),
  F('F_MA_B2', 'MACHI', 'bench', 9.2, 23.2, 0, { w: 2.4, d: 0.5 }),
  F('F_MA_B3', 'MACHI', 'bench', 13.2, 21.0, 0, { w: 2.4, d: 0.5 }),
  F('F_MA_B4', 'MACHI', 'bench', 13.2, 23.2, 0, { w: 2.4, d: 0.5 }),
  F('F_MA_VEND', 'MACHI', 'vendingMachine', 7.0, 18.5, 0, { w: 0.9, d: 0.8 }),
  F('F_MA_PLANT', 'MACHI', 'plant', 15.5, 25.5, 0, { w: 0.5, d: 0.5 }),
  F('F_MA_EXT', 'MACHI', 'extinguisher', 15.85, 19.0, -90),
  F('F_UKE_COUNTER', 'UKE', 'counter', 16.45, 21.0, 90, { w: 3, d: 0.6, args: [3] }),
  F('F_UKE_DESK', 'UKE', 'desk', 19.55, 23.4, -90, { w: 1.4, d: 0.7 }),
  F('F_UKE_CAB', 'UKE', 'filingCabinet', 18.0, 25.65, 180, { w: 0.5, d: 0.6 }),
  F('F_ROKA_BENCH', 'ROKA', 'bench', 6.5, 17.65, 180, { w: 1.6, d: 0.45 }),
  F('F_ROKA_EXT', 'ROKA', 'extinguisher', 13.0, 17.85, 180),
  F('F_KA_RACK1', 'KARTE', 'fileRack', 0.4, 12.0, 90, { w: 5, d: 0.5, args: [5, 2.1] }),
  F('F_KA_RACK2', 'KARTE', 'fileRack', 3.6, 9.4, 0, { w: 3.6, d: 0.5, args: [3.6, 2.1] }),
  F('F_KA_DESK', 'KARTE', 'desk', 5.55, 12.4, -90, { w: 1.4, d: 0.7 }),
  F('F_SH_BED', 'SHIN', 'bed', 10.9, 10.6, 90, { w: 2, d: 0.9 }),
  F('F_SH_DESK', 'SHIN', 'desk', 6.45, 11.2, 90, { w: 1.4, d: 0.7 }),
  F('F_SH_CHAIR', 'SHIN', 'pipeChair', 7.3, 11.2, -90),
  F('F_SH_SHELF', 'SHIN', 'shelf', 11.7, 13.6, -90, { w: 1.2, d: 0.45, args: [1.2, 1.8, 0.45, 4, 'boxes'] }),
  F('F_KD_EXT', 'KAIDAN', 'extinguisher', 12.25, 9.6, 90),
  F('F_BR_DRUM', 'B_ROKA', 'drum', 19.4, 7.5, 0, { w: 0.6, d: 0.6 }),
  F('F_BR_DRUM2', 'B_ROKA', 'drum', 18.7, 8.4, 0, { w: 0.6, d: 0.6 }),
  F('F_PU_DESK', 'PUMP', 'steelDesk', 3.6, 14.55, 180, { w: 1.4, d: 0.7 }),
  F('F_PU_SHELF', 'PUMP', 'shelf', 5.65, 13.6, -90, { w: 1.2, d: 0.45, args: [1.2, 1.8, 0.45, 9, 'boxes'] }),
  F('F_JI_FILE1', 'JIMU', 'filingCabinet', 6.35, 10.0, 90, { w: 0.5, d: 0.6 }),
  F('F_JI_FILE2', 'JIMU', 'filingCabinet', 6.35, 10.6, 90, { w: 0.5, d: 0.6 }),
  F('F_JI_DESK', 'JIMU', 'desk', 7.2, 14.55, 180, { w: 1.4, d: 0.7 }),
  F('F_JI_CHAIR', 'JIMU', 'officeChair', 7.2, 13.8, 0),
  F('F_MO_DRUM', 'MOUTH', 'drum', 0.5, 4.8, 0, { w: 0.6, d: 0.6 }),
  F('F_MO_CRATE', 'MOUTH', 'crate', 0.55, 3.6, 0, { w: 0.7, d: 0.7 }),
  F('F_RE_BODY', 'REIAN', 'bodyCabinets', 10.0, 0.45, 0, { w: 4, d: 0.9, args: [4] }),
  F('F_RE_BED', 'REIAN', 'bed', 11.0, 4.6, 0, { w: 2, d: 0.9 }),
  F('F_RE_DESK', 'REIAN', 'desk', 6.45, 3.2, 90, { w: 1.4, d: 0.7 }),
];

const plan = {
  rooms, doors, stations, hides, furniture, start: 'GENKAN',
  spawn: { x: 3.0, z: 23.6, yaw: 0, floor: 1 },
  lampPool: true,
  exits: ['GENKAN'],
  floorNames: { 0: '地下', 1: '一階' },
  checks: { ignore: ['no-loop', 'exits-few', 'direct-total', 'no-corridor'], why: '出口は鎖をかけられた正面の扉一つ（閉じ込められる話）。研究棟への地下通路は一本道（長い一本道を、止水弁を回しながら逃げる場面として作った）。' },
};

// ---------------------------------------------------------------- items
const items = [
  { id: 'FLASH', name: '懐中電灯', start: true, kind: 'flashlight', photo: P('item-flash'), desc: '撮影用に持って来た、手のひらほどの懐中電灯。[F] でつける・消す。', why: '電気の来ていない病院の中を照らす。', feeling: '電池は新しい。……ひなたが用意してくれた。' },
  { id: 'RADIO', name: '無線機', start: true, kind: 'walkie-talkie', photo: P('item-radio'), desc: 'ひなたが撮影用に持って来た、二台一組の無線機の一台。もう一台はひなたが持っている。', why: '離れても、ひなたと話せる。携帯は黒木さんに取られた。', feeling: '小さなランプが緑に光っている。' },
  { id: 'REN_PAPER', name: '蓮の紙', given: 'T_FRONT', kind: 'paper', photo: P('item-ren'), desc: '黒木さんが鎖のすき間から押しこんできた紙。弟の蓮さんが書いたもの。紙いっぱいに、鉛筆で「7」とだけ、何十回も書いてある。', why: '去年この地下に入った蓮さんは、出て来てから「7」ばかり書いている。', feeling: '筆圧が強くて、紙が破れかけている。' },
  { id: 'KEY_B1', name: '防火扉の鍵', given: 'T_KEY', kind: 'key', photo: P('item-key'), desc: '受付のキーボックスにあった小さな鍵。プラスチックの札に、マジックで「階段 防火扉」。', why: '階段ホールの防火扉の南京錠を開ける。地下へ降りる階段はその奥。', feeling: '札の文字が、にじんでいる。' },
  { id: 'JAR', name: '七番の瓶', given: 'T_JAR', kind: 'jar', photo: P('item-jar'), desc: '病理標本室の戸棚の、いちばん奥にあった瓶。黄色く濁ったホルマリンの液の中に、握りこぶしほどの、灰色の心臓が沈んでいる。ふたのラベルには番号だけ。「7」。', why: '黒木さんが「持って来い」と言った瓶。', feeling: '瓶が冷たい。中の液が、ゆっくり揺れている。' },
  { id: 'NAMETAG', name: '名札と鍵', given: 'T_JAR', kind: 'name-badge', photo: P('item-nametag'), desc: '七番の瓶の首に、ひもで結びつけてあった名札と、小さな鍵。名札は水で白くなっているが、読める。「検査科　浅井早苗」。', why: '誰かが、瓶と一緒に残していった。鍵は小さく、引き出しか棚の鍵のようだ。', feeling: '名札の安全ピンが、外れずに残っている。' },
  { id: 'HEARSE_KEY', name: '搬出口の鍵', given: 'T_LEDGER', kind: 'key', photo: P('item-key2'), desc: '台帳の棚の中に、台帳と一緒に入っていた鍵。札に「霊安室 搬出口」。', why: '霊安室の搬出口（亡くなった人を車で運び出す裏の出口）を開ける。正面の扉を通らずに外へ出られる。', feeling: '黒木さんたちは、この出口を知らない。' },
  { id: 'PAGE1', name: '日誌の一枚目', room: 'SHIN', x: 6.45, z: 11.6, y: 0.78, kind: 'paper', stage: 'L2', photo: P('item-page'), desc: '診察室の机の上にあった、手帳から破いた紙。「1996年3月」。', why: '誰かの日誌の切れ端。三枚そろえて、日付の順に並べる（寄り道）。', feeling: '女の人の字だ。' },
  { id: 'PAGE2', name: '日誌の二枚目', room: 'REIAN', x: 11.0, z: 4.6, y: 0.62, kind: 'paper', stage: 'L3', photo: P('item-page'), desc: '霊安室のストレッチャーの上に、濡れて張りついていた紙。「1999年6月」。', why: '日誌の切れ端（寄り道）。三枚そろえて、霊安室の机で並べる。', feeling: '一枚目と同じ字だ。' },
  { id: 'PAGE3', name: '日誌の三枚目', room: 'P5', x: 8.25, z: -96.5, y: 0.42, kind: 'paper', stage: 'L3', photo: P('item-page'), desc: '下りの通路の、配管の上に置いてあった紙。ビニールの袋に入っていて、乾いている。「1999年9月」。', why: '日誌の切れ端（寄り道）。三枚そろえて、霊安室の机で並べる。', feeling: '濡れないように、誰かが袋に入れた。' },
];

// ---------------------------------------------------------------- documents
const docs = [
  { id: 'DOC_HEISA', title: '閉院のお知らせ（玄関の掲示）', room: 'GENKAN', x: 0.06, z: 21.0, y: 1.5, stage: 'L1', photo: P('doc-heisa'),
    text: '閉院のお知らせ\n当院は、平成十一年九月の台風による地下の浸水のため、診療を続けることができなくなりました。\n平成十一年十二月をもって閉院いたします。\n長いあいだのご利用、ありがとうございました。\n医療法人 水無瀬会　水無瀬病院',
    feeling: '平成十一年は、1999年。……二十七年前に閉まった病院だ。地下が水につかって。' },
  { id: 'DOC_MAP', title: '院内案内図', room: 'UKE', x: 18.6, z: 18.06, y: 1.5, stage: 'L1', photo: P('doc-map'),
    text: '院内案内図\n一階：玄関・外来の待合・受付・カルテ庫・診察室・階段\n地下：ポンプ室・病理事務室・霊安室\n研究棟（地下の渡り通路でつながる）：病理標本室\n※地下の渡り通路は、大雨のとき防水扉を閉めます',
    feeling: '病理標本室は、研究棟の地下。本館の地下から、長い通路を通って行く。' },
  { id: 'DOC_CHART', title: 'カルテ「浅井庄一」', room: 'KARTE', x: 5.55, z: 12.0, y: 0.8, stage: 'L2', photo: P('doc-chart'),
    text: '診療録　浅井庄一（あさい しょういち）　五十八歳\n平成八年（1996年）三月九日　心不全のため死亡\n病理解剖：葛城（病理科・副院長）\n臓器の保存について、ご家族の同意：（空欄）\n――カルテの表紙に、手書きの付箋。「七」とだけ書いて、丸で囲んである。',
    feeling: '「七」。……黒木さんの言う七番と、同じ数字だ。病理解剖は、亡くなった人の体を調べて、死んだ理由を確かめること。' },
  { id: 'DOC_NEWS', title: '新聞の切り抜き（1999年9月17日）', room: 'SHIN', x: 6.45, z: 10.7, y: 0.78, stage: 'L2', photo: P('doc-news'),
    text: '水無瀬病院で技師不明　台風で地下浸水\n十五日夜の台風で、水無瀬病院（水無瀬町）の地下が浸水した。病院によると、当直の検査技師、浅井早苗さん（二十九）の行方が分からなくなっている。\n葛城副院長は「浅井さんは浸水の前に病院を出た。増水した川に流されたのではないか」と話している。',
    feeling: '浅井。……カルテの浅井庄一さんと、同じ名字だ。' },
  { id: 'DOC_LOG', title: '排水日誌（ポンプ室）', room: 'PUMP', x: 3.2, z: 14.45, y: 0.75, stage: 'L3', photo: P('doc-log'),
    text: '平成十一年九月十五日（台風）\n22:10 地下の廊下に浸水。排水ポンプ一号、二号とも運転。\n23:20 研究棟の地下で水位が急に上がる。ポンプが追いつかない。\n23:40 研究棟側の防水扉を閉鎖。（葛城副院長の指示）\n23:45 研究棟に浅井技師の姿　――この一行だけ、太い線で消してある。',
    feeling: '防水扉を閉めた五分あとに、研究棟に浅井さんがいた。……それを、誰かが消した。' },
];

// ---------------------------------------------------------------- things to look at
const T = (id, room, x, z, y, label, text, feeling, o = {}) => ({ id, room, position: [x, z], y, label, text, feeling, size: o.size || 0.7, ...(o.photo ? { photo: P(o.photo) } : {}), ...(o.requires ? { requires: o.requires } : {}) });
const things = [
  T('GEN_DOOR', 'GENKAN', 1.6, 25.85, 1.2, '正面の扉', ['ガラスの扉の取っ手に、外から鎖が巻いてある。押すと、鎖がじゃらりと鳴って止まる。', 'すき間から、黒木さんたちの懐中電灯の光が見える。'], '外は雨だ。', { photo: 'th-gen-door' }),
  T('GEN_PUDDLE', 'GENKAN', 4.4, 20.4, 0.1, '雨漏りの水たまり', ['天井のしみから、水がぽたぽた落ちて、床に水たまりができている。'], '建物じゅうが、雨を吸っている。', { photo: 'th-gen-puddle' }),
  T('MA_BENCH', 'MACHI', 9.2, 23.2, 0.5, '待合の長椅子', ['長椅子の座面に、水がたまっている。上の天井が抜けかけている。'], '', { photo: 'th-ma-bench' }),
  T('MA_SLIPPER', 'MACHI', 7.2, 25.4, 0.1, 'スリッパ', ['病院のスリッパが一足。片方だけ、ぐっしょり濡れている。'], 'ここまで、誰かが水の中を歩いて来た？', { photo: 'th-ma-slipper' }),
  T('MA_CEIL', 'MACHI', 12.0, 22.1, 2.6, '天井', ['天井板が水を吸ってたわみ、すき間から雨水が糸のように落ちている。'], '', { photo: 'th-ma-ceil' }),
  T('UKE_WINDOW', 'UKE', 16.8, 23.0, 1.2, '受付の窓口', ['窓口のガラスの内側に、手のひらの跡が並んでいる。内側から。……濡れた手で。'], '', { photo: 'th-uke-window' }),
  T('KA_RACK', 'KARTE', 0.6, 13.6, 1.4, 'カルテの棚', ['カルテが年ごとに並んでいる。平成八年（1996年）の棚だけ、ところどころ抜けている。'], '抜けているカルテは、どこへ行ったんだろう。', { photo: 'th-ka-rack' }),
  T('KA_FLOOR', 'KARTE', 2.4, 11.0, 0.1, '床のカルテ', ['床にカルテが散らばっている。どれも濡れて、字がにじんでいる。'], '', { photo: 'th-ka-floor' }),
  T('SH_SINK', 'SHIN', 8.8, 9.2, 1.0, '洗面台', ['蛇口から、水がひとすじ流れ続けている。止めても、止まらない。', '排水口の奥で、ごぼごぼと音がする。'], '水道は、とっくに止まっているはずなのに。', { photo: 'th-sh-sink' }),
  T('KD_FOOT', 'KAIDAN', 14.5, 12.0, 0.1, '濡れた足跡', ['地下への階段から上がって来た、濡れた足跡。裸足の跡が、いくつも重なっている。', '階段ホールの真ん中で、ぷつりと消えている。'], '', { photo: 'th-kd-foot' }),
  T('BR_WATER', 'B_ROKA', 6.0, 7.5, 0.1, '地下の廊下の水', ['くるぶしまでの水。壁のすき間から、雨水が流れこんでいる。', '水の底に、割れたガラスが光っている。'], '', { photo: 'th-br-water' }),
  T('PU_GAUGE', 'PUMP', 1.6, 9.08, 1.5, '水位計', ['壁の水位計。針が、赤い目盛りの手前でふるえている。'], '', { photo: 'th-pu-gauge' }),
  T('JI_PHOTO', 'JIMU', 7.3, 9.06, 1.5, '職員の写真', ['白衣の職員の集合写真。前の列の端の、若い女の人の顔だけ、水のしみで見えなくなっている。'], '', { photo: 'th-ji-photo' }),
  T('RE_DRAWER', 'REIAN', 8.5, 0.6, 1.0, '遺体の保管庫', ['金属の引き出しが並んでいる。一つだけ少し開いて、中から水が垂れている。', '中は空だ。底に、水がたまっているだけ。'], '', { photo: 'th-re-drawer' }),
  T('MO_DOOR', 'MOUTH', 1.5, -0.8, 1.6, '防水扉の窓', ['厚い鉄の扉に、小さな丸い窓。向こうは真っ暗。', '窓の内側に、水の筋が垂れている。'], '', { photo: 'th-mo-door' }),
  T('P1_LEAK', 'P1', 3.4, -12.0, 2.2, '配管の水もれ', ['天井の配管の継ぎ目から、水が噴き出している。'], '', { photo: 'th-p1-leak' }),
  T('P1_HAIR', 'P1', 1.75, -16.0, 1.3, '配管の髪', ['壁の配管に、長い黒髪がからまっている。何本も。'], '女の人の髪だ。', { photo: 'th-p1-hair' }),
  T('P2_HANDS', 'P2', -9.0, -41.8, 0.1, '濡れた手の跡', ['床に、濡れた手の跡が続いている。右手、右手、左手、右手。……数が合わない。'], '何本も手のあるものが、這って進んだ跡だ。', { photo: 'th-p2-hands' }),
  T('P3_KARTE', 'P3', -17.2, -58.0, 0.1, '水に浮く紙', ['水の上に、カルテが一枚浮いている。名前の欄だけ、黒く塗りつぶしてある。'], '', { photo: 'th-p3-karte' }),
  T('P4_GLASS', 'P4B', 6.0, -82.2, 0.25, '割れた瓶', ['割れたガラス瓶の破片が、床に散らばっている。つんと鼻を刺すにおい。ホルマリン（標本を腐らせないための薬）だ。'], '', { photo: 'th-p4-glass' }),
  T('P5_DRAG', 'P5', 8.6, -89.0, 0.1, '引きずった跡', ['湿った床に、何かを引きずった跡。奥から来て、奥へ戻っている。'], '', { photo: 'th-p5-drag' }),
  T('HY_TANK', 'HYOHON', 6.3, -104.0, 0.4, 'ホルマリンの槽', ['床に埋めた大きな槽に、黄色く濁った液がたまっている。表面に、白い布の切れ端が浮いている。', '底のほうに、何か大きなものが沈んでいる。'], '見ないほうがいい。', { photo: 'th-hy-tank' }),
  T('HY_JARS', 'HYOHON', 12.6, -104.0, 1.3, '標本の瓶の列', ['壁の棚に、ガラス瓶が何十本も並んでいる。黄色い液の中に、人の臓器。', 'ラベルは番号だけ。名前は、どこにも書いていない。'], '', { photo: 'th-hy-jars' }),
  T('HY_COAT', 'HYOHON', 10.8, -107.4, 0.4, '白衣の切れ端', ['戸棚の下に、白衣の切れ端が落ちている。胸のポケットに、ボールペンが一本。'], '', { photo: 'th-hy-coat' }),
];

// ---------------------------------------------------------------- stages
const stages = {
  goal: { title: '地下の標本室から七番の瓶を持って来て、この病院で起きたことを確かめる', short: '七番の瓶を持って来る', sub: '鎖を外させるには、瓶を持って来るしかない。', meter: '進み' },
  levels: [
    { id: 'L1', name: '鎖の扉', title: 'ひなたと話し、扉の外の黒木さんと話し、受付で地下への鍵を探す', recap: '私は戸川湊、大学一年。幼なじみのひなたと心霊動画を撮りに来た廃病院で、地元の先輩の黒木さんに携帯を取られ、正面の扉を外から鎖で閉められた。「地下の標本室の、七番の瓶を持って来い」。', text: '左上の目標を、一つずつ。', unlocks: ['front'] },
    { id: 'L2', name: '一階の病棟', title: 'カルテ庫で「七」の手がかりを探し、階段の防火扉を開けて地下へ降りる', recap: '黒木さんの弟の蓮さんは、去年この地下に入ってから話さなくなり、「7」とばかり書いている。受付で階段の防火扉の鍵を見つけた。標本室は研究棟の地下にある。', text: '地下へ降りる階段は、階段ホールの防火扉の奥。', unlocks: ['ward', 'down'] },
    { id: 'L3', name: '水の地下', title: '発電機を動かし、ひなたと無線を合わせ、防水扉の先の長い通路を標本室まで行く', recap: 'ひなたが階段で足首をひねった。ひなたはポンプ室に残ってポンプを動かし、無線で私を支える。地下は水につかっている。1999年の台風の夜、検査技師の浅井早苗さんが行方不明になった。', text: '通路は長い。非常灯をつけておけば、帰り道が明るい。', unlocks: ['b1', 'passage'] },
    { id: 'L4', name: '七番の瓶', title: '七番の瓶を取り、止水弁で「あれ」を止めながら防水扉まで戻る。止まったポンプを動かし、ひなたを助ける', recap: '水の中に「あれ」がいた。あれは水のない所へは来られない。止水弁を回すと、その前後の水が抜けて、あれは止まる。標本室の戸棚で七番の瓶を取ると、あれが追ってきた。', text: '瓶を持っていると、あれが来る。止水弁で止めて、防水扉まで逃げる。', unlocks: [] },
    { id: 'L5', name: '水無瀬病院の謎', title: '病理事務室で台帳を開き、水が上がるなかで、この病院で起きたことを確かめる', recap: '防水扉を閉めて、あれを通路に閉じこめた。ポンプ室のひなたを助けた。瓶の首には「検査科　浅井早苗」の名札と、小さな鍵が結んであった。', text: '台帳の棚の鍵は、名札についていた小さな鍵。', unlocks: [] },
  ],
  facts: [
    { from: 'L1', text: '黒木さんは、正面の扉に外から鎖をかけた。七番の瓶を持って来るまで外さないと言った。' },
    { from: 'L1', text: '黒木さんの弟の蓮さんは、去年この病院の地下に入ってから話さなくなった。紙に「7」とばかり書いている。' },
    { from: 'L2', text: '病院は1999年の台風で地下が水につかり、閉院した。その夜、検査技師の浅井早苗さんが行方不明になった。' },
    { from: 'L2', text: 'カルテ「浅井庄一」（1996年に死亡）の表紙に「七」の付箋。病理解剖をしたのは、副院長の葛城。' },
    { from: 'L4', text: 'あれは、水のある所しか進めない。止水弁を回して水を抜けば、そこで止まる（水は、しばらくで戻る）。台の上のロッカーに隠れれば、見失う。' },
  ],
  unlocks: {
    front: { name: '玄関ホール・外来の待合・受付・一階の廊下', icon: 'home', desc: '最初から歩ける。' },
    ward: { name: 'カルテ庫・診察室・階段ホール', icon: 'door', desc: 'ひなたと黒木さんの話を聞いたあと。' },
    down: { name: '地下への階段', icon: 'stairs', desc: '階段ホールの防火扉を、受付の鍵で開けた先。' },
    b1: { name: '地下の廊下・ポンプ室・病理事務室・霊安室', icon: 'door', desc: '地下へ降りると歩ける。' },
    passage: { name: '研究棟への長い通路と病理標本室', icon: 'door', desc: '防水扉のハンドルを回して開ける。' },
  },
};

// ---------------------------------------------------------------- tasks
const stepRoom = (text, room, body) => ({ text, body, done: 'room', room });
const stepLook = (st, text, body) => ({ text, body, done: 'look', emphasis: `station:${st}` });
const stepDo = (text, body) => ({ text, body, done: 'task' });
const tasks = [
  // L1
  { id: 'T_HINA', stage: 'L1', room: 'GENKAN', station: 'S_HINA1', title: 'ひなたと話す',
    meaning: '閉じこめられた。どうするか、ひなたと決める。', hint: '玄関ホールの西の、長椅子のそば。',
    steps: [stepLook('S_HINA1', 'ひなたの前に立つ', '玄関ホールの西側。'), stepDo('[E] で話す')] },
  { id: 'T_FRONT', stage: 'L1', room: 'GENKAN', station: 'S_FRONT', needs: ['T_HINA'], title: '鎖の扉ごしに、黒木さんと話す',
    meaning: 'なぜ七番の瓶なのか。本当に、持って来れば開けてくれるのか。', hint: '玄関ホールの南の、ガラスの正面の扉。',
    steps: [stepLook('S_FRONT', '正面の扉の前に立つ', '鎖のすき間から、外の光が見える。'), stepDo('[E] で話しかける')] },
  { id: 'T_KEY', stage: 'L1', room: 'UKE', station: 'S_KEYBOX', needs: ['T_FRONT'], title: '受付のキーボックスで、地下への鍵を探す',
    meaning: '地下へ降りる階段は、階段ホールの防火扉の奥。その鍵を探す。', hint: '外来の待合の東の扉から受付の中へ。奥の壁のキーボックス。',
    steps: [stepRoom('外来の待合を抜けて、受付の中へ', 'UKE', '待合の東の扉。'), stepLook('S_KEYBOX', '奥の壁のキーボックスの前に立つ'), stepDo('[E] で鍵を探す')] },
  // L2
  { id: 'T_KARTE', stage: 'L2', room: 'KARTE', title: 'カルテ庫で「七」の手がかりを探す',
    meaning: '七番の瓶の「七」が何の番号なのか。病院の記録が残っているのは、カルテ庫。', hint: '一階の廊下の西の端の扉。東の壁の机に、カルテが一冊。',
    steps: [stepRoom('一階の廊下の西の、カルテ庫へ', 'KARTE'), stepDo('机のカルテを読む', '東の壁の机。')] },
  { id: 'T_KAIDAN', stage: 'L2', room: 'KAIDAN', needs: ['T_KARTE'], title: '階段ホールの防火扉を開けて、地下へ降りる',
    meaning: '標本室は、研究棟の地下。本館の地下から、長い通路で行く。', hint: '一階の廊下の東の、鎖のかかった防火扉。受付の鍵で開く。',
    steps: [stepRoom('受付の鍵で防火扉を開けて、階段ホールへ', 'KAIDAN'), stepRoom('階段で地下へ降りる', 'B_STAIR', '階段の前で [E]。')] },
  // L3
  { id: 'T_GEN', stage: 'L3', room: 'PUMP', station: 'S_GEN', title: 'ポンプ室の非常用発電機を動かす',
    meaning: '地下は水につかっている。発電機が動けば、排水ポンプで水を抜ける。非常灯もつく。', hint: '地下の廊下の西の、ポンプ室。西の壁の大きな機械。',
    minigame: { type: 'pump-gauge', cfg: { title: '発電機の燃料を送る', help: '手押しのポンプで燃料を送る。押すたびに針が上がり、少しずつ下がる。針を緑の帯に保って、下の目盛りを満たす。', lo: 0.55, hi: 0.8, per: 0.1, leak: 0.13, sec: 3, look: 'pump', ok: '発電機が、低くうなりはじめた。' } },
    steps: [stepRoom('地下の廊下の西の、ポンプ室へ', 'PUMP'), stepLook('S_GEN', '西の壁の発電機の前に立つ'), stepDo('[E] で燃料を送る')] },
  { id: 'T_RADIO', stage: 'L3', room: 'PUMP', station: 'S_HINA2', needs: ['T_GEN'], title: 'ひなたと無線の周波数を合わせる',
    meaning: 'ひなたは足を痛めて、ここに残る。私が奥へ行くあいだ、無線でつながっていられるように。', hint: 'ポンプ室の奥の、机のそばのひなた。',
    minigame: { type: 'tune-radio', cfg: { title: '無線機の周波数を合わせる', help: 'つまみを回して、雑音の奥のひなたの声を探す。合ったところで少し止める。', target: 0.41, width: 0.04, hold: 1.0, lo: '1', hi: '20', unit: 'ch', ok: '「……聞こえる？　湊」ひなたの声が、手の中の無線機から聞こえた。' } },
    steps: [stepLook('S_HINA2', 'ひなたの前に立つ'), stepDo('[E] で周波数を合わせる')] },
  { id: 'T_BOUSUI', stage: 'L3', room: 'MOUTH', needs: ['T_RADIO'], title: '防水扉のハンドルを回して開ける',
    meaning: '研究棟への通路は、厚い鉄の防水扉の向こう。ハンドルで閉めてある。', hint: '地下の廊下の西の端から、防水扉の前へ。北の壁の鉄の扉。',
    minigame: { type: 'timing', cfg: { title: '防水扉のハンドルを回す', help: '錆びたハンドルに体重をかける。揺れる印が赤い帯に来た瞬間に押す。三回で回りきる。', need: 3, half: 0.12, speed: 1.1, look: 'hammer', ok: 'ハンドルが回りきった。扉が、重くきしんで開く。' } },
    steps: [stepRoom('地下の廊下の西の、防水扉の前へ', 'MOUTH'), stepDo('防水扉に向いて [E] でハンドルを回す', '北の壁の鉄の扉。')] },
  { id: 'T_LAMP1', stage: 'L3', room: 'P1', station: 'S_LAMP1', needs: ['T_BOUSUI'], title: '配管の通路の非常灯をつける',
    meaning: '発電機が動いているので、通路の非常灯がつく。帰りに走るとき、道が見えるように。', hint: '防水扉を抜けてすぐ、左の壁の灰色の箱。',
    steps: [stepLook('S_LAMP1', '壁のスイッチの前に立つ'), stepDo('[E] でつける')] },
  { id: 'T_LAMP2', stage: 'L3', room: 'P3', station: 'S_LAMP2', needs: ['T_LAMP1'], title: '水の通路の非常灯をつける',
    meaning: '帰り道のために、非常灯をつけておく。', hint: '配管の通路を北へ、突き当たりを左の低い通路（しゃがんで進む）、その先を右。水の通路の入口の左の壁。',
    steps: [stepRoom('配管の通路を北へ進む', 'P1'), stepRoom('突き当たりを左、低い通路をしゃがんで進む', 'P2', '[C]（画面では「しゃがむ」）。配管が低い。'), stepRoom('右へ曲がって、水の通路へ', 'P3'), stepLook('S_LAMP2', '壁のスイッチの前に立つ'), stepDo('[E] でつける')] },
  { id: 'T_LAMP3', stage: 'L3', room: 'P4A', station: 'S_LAMP3', needs: ['T_LAMP2'], title: '二枚目の防水扉の手前の非常灯をつける',
    meaning: '帰り道のために、非常灯をつけておく。', hint: '水の通路を北の突き当たりまで歩き、右へ。',
    steps: [stepRoom('水の通路を北の突き当たりまで歩く', 'P4A', '水がひざまである。ゆっくりしか歩けない。'), stepLook('S_LAMP3', '壁のスイッチの前に立つ'), stepDo('[E] でつける')] },
  { id: 'T_GATE', stage: 'L3', room: 'P4A', needs: ['T_LAMP3'], title: '二枚目の防水扉を開ける',
    meaning: '標本室へは、この扉の先。', hint: '通路を東へ。窓のある鉄の扉。',
    steps: [{ text: '二枚目の防水扉に向いて [E]', done: 'task' }] },
  { id: 'T_POST', stage: 'L3', room: 'P4B', needs: ['T_GATE'], title: '止水弁を回して、来るものを止める',
    meaning: 'あれは水のない所へは来られない。止水弁を回せば、その前後の水が抜ける。帰りに必ず使う。', hint: '扉の先の、壁の両側に赤いハンドルがあるところ。弁に向いて [E]。',
    steps: [{ text: '止水弁に向いて [E] で回す', done: 'task' }] },
  { id: 'T_LAMP4', stage: 'L3', room: 'P5', station: 'S_LAMP4', needs: ['T_POST'], title: '下りの通路の非常灯をつける',
    meaning: '帰り道のために、非常灯をつけておく。', hint: '通路の東の突き当たりを左（北）へ。入口の右の壁。',
    steps: [stepRoom('通路の東の端から、北の下りの通路へ', 'P5'), stepLook('S_LAMP4', '壁のスイッチの前に立つ'), stepDo('[E] でつける')] },
  { id: 'T_HYOHON', stage: 'L3', room: 'HYOHON', needs: ['T_LAMP4'], title: '通路の突き当たりの、病理標本室に入る',
    meaning: '七番の瓶は、病理標本室にある。', hint: '下りの通路の突き当たりの扉。',
    steps: [stepRoom('突き当たりの扉を開けて、病理標本室へ', 'HYOHON')] },
  // L4
  { id: 'T_JAR', stage: 'L4', room: 'HYOHON', station: 'S_SHELF', title: '戸棚から七番の瓶を取り出す',
    meaning: '黒木さんが「持って来い」と言った瓶。持って帰れば、鎖は外される。', hint: '標本室の北の壁の、ガラス戸の戸棚。',
    minigame: { type: 'steady-hand', cfg: { title: '瓶をそっと持ち上げる', help: '瓶の首には、ひもで何かが結んである。液をこぼさないように、指先（印）をゆっくり動く輪の中に保つ。', sec: 6, r: 0.2, speed: 0.6, look: 'flame', ok: '七番の瓶を、戸棚から出した。' } },
    steps: [stepLook('S_SHELF', '北の壁の戸棚の前に立つ'), stepDo('[E] で瓶を取り出す')] },
  { id: 'T_ESCAPE', stage: 'L4', room: 'MOUTH', needs: ['T_JAR'], title: '瓶を持って、防水扉まで逃げ戻る',
    meaning: '瓶を持っていると、あれが追ってくる。止水弁で止めながら、来た道を戻る。', hint: '来た道を戻る：下りの通路、二枚目の防水扉、水の通路、低い通路（しゃがむ）、配管の通路、防水扉。',
    steps: [stepRoom('二枚目の防水扉まで戻る', 'P4A', '後ろから来たら、止水弁に [E]。'), stepRoom('水の通路を戻る', 'P3'), stepRoom('低い通路をしゃがんで戻る', 'P2'), stepRoom('配管の通路を戻る', 'P1'), stepRoom('防水扉を抜けて、本館へ', 'MOUTH')] },
  { id: 'T_SEAL', stage: 'L4', room: 'MOUTH', needs: ['T_ESCAPE'], title: '防水扉を閉める',
    meaning: '閉めてハンドルを回せば、水も、あれも通らない。', hint: '抜けてきたばかりの、北の壁の防水扉。',
    steps: [stepDo('防水扉に向いて [E] ですぐに閉める')] },
  { id: 'T_RESCUE', stage: 'L4', room: 'PUMP', station: 'S_PUMPSW', needs: ['T_SEAL'], title: 'ポンプ室へ行き、止まった排水ポンプを動かす',
    meaning: 'ひなたの無線が切れた。ポンプ室に水がたまっている。ポンプを動かさないと、ひなたが危ない。', hint: '地下の廊下の西の、ポンプ室。東の壁の制御盤。',
    minigame: { type: 'pump-gauge', cfg: { title: '排水ポンプを動かす', help: '手動のレバーで、ポンプに呼び水の圧をかける。針を緑の帯に保って、下の目盛りを満たす。', lo: 0.5, hi: 0.78, per: 0.1, leak: 0.16, sec: 3.5, look: 'pump', ok: 'ポンプが回りだした。水が、渦を巻いて引いていく。' } },
    steps: [stepRoom('地下の廊下の西の、ポンプ室へ', 'PUMP'), stepLook('S_PUMPSW', '東の壁の制御盤の前に立つ'), stepDo('[E] でポンプを動かす')] },
  // L5
  { id: 'T_LEDGER', stage: 'L5', room: 'JIMU', station: 'S_CAB', title: '病理事務室の台帳の棚を開け、標本と名前を照らし合わせる',
    meaning: '名札についていた小さな鍵は、この棚の鍵かもしれない。標本の番号と、亡くなった人の名前がつながる。', hint: '地下の廊下の、ポンプ室のとなりの部屋。奥（南）の壁の、鍵のかかった棚。',
    minigame: { type: 'sort-items', cfg: { title: '台帳の番号と、カルテの名前を照らし合わせる', help: '台帳には番号と年と臓器だけ。棚のカルテの写しを、同じ年・同じ臓器の番号へ運ぶ。', bins: [{ id: 'n3', label: '三番（1994年・肺）' }, { id: 'n5', label: '五番（1995年・肝臓）' }, { id: 'n6', label: '六番（1995年・脳）' }, { id: 'n7', label: '七番（1996年・心臓）' }], items: [{ id: 'a', label: '浅井庄一（1996年3月・心不全）', bin: 'n7', why: '心不全は、心臓の病気。亡くなったのは1996年。' }, { id: 'b', label: '田村ふみ（1995年7月・脳出血）', bin: 'n6', why: '脳出血は、脳の病気。' }, { id: 'c', label: '小野寺功（1994年2月・肺炎）', bin: 'n3', why: '肺炎は、肺の病気。亡くなったのは1994年。' }, { id: 'd', label: '森川清（1995年11月・肝硬変）', bin: 'n5', why: '肝硬変は、肝臓の病気。' }], ok: '番号に、名前が戻った。七番は、浅井庄一さんの心臓。' } },
    steps: [stepRoom('地下の廊下の、病理事務室へ', 'JIMU'), stepLook('S_CAB', '奥（南）の壁の棚の前に立つ'), stepDo('[E] で名札の鍵を使う')] },
  { id: 'T_THINK', stage: 'L5', room: 'JIMU', station: 'S_DESK', needs: ['T_LEDGER'], title: '水が上がるなかで、この病院で起きたことを確かめる',
    meaning: 'ひなたが排水口の逆止弁を押さえているあいだに、集めた物から答えを出す。間違えるたびに、水が上がる。', hint: '病理事務室の南の壁の事務机。',
    steps: [stepLook('S_DESK', '事務机の前に立つ'), stepDo('[E] で、集めた物を並べて考える')] },
  { id: 'T_RETURN', stage: 'L5', room: 'JIMU', station: 'S_DRAIN', needs: ['T_THINK'], title: '排水口の浅井早苗さんに、七番の瓶を返す',
    meaning: '早苗さんが探していたのは、父の心臓。返せば、もう追ってはこないかもしれない。', hint: '病理事務室の床の排水口。',
    steps: [stepLook('S_DRAIN', '床の排水口の前に立つ'), stepDo('[E] で瓶を返す')] },
  { id: 'T_END', stage: 'L5', room: 'REIAN', station: 'S_HEARSE', needs: ['T_RETURN'], title: 'ひなたと、霊安室の搬出口から外へ出る',
    meaning: '搬出口の鍵がある。黒木さんの鎖の扉を通らずに、外へ出られる。', hint: '地下の廊下の、霊安室。東の壁の両開きの扉。',
    steps: [stepRoom('地下の廊下の霊安室へ', 'REIAN'), stepLook('S_HEARSE', '東の壁の搬出口の前に立つ'), stepDo('[E] で鍵を開ける')] },
  { id: 'T_GIVE', stage: 'L5', room: 'GENKAN', station: 'S_FRONT', optional: true, title: '（瓶を、鎖の扉の黒木さんに渡す）',
    meaning: '言われたとおりに持って来た。渡せば、鎖は外される。', hint: '玄関ホールの正面の扉。' },
  // side quests
  { id: 'T_SQ1', stage: 'L3', room: 'REIAN', station: 'S_SQ1', optional: true, title: '（寄り道）日誌の三枚を、日付の順に並べる',
    meaning: '病院のあちこちに、同じ字の日誌の切れ端がある。三枚を順に読めば、書いた人が何をしようとしていたかが分かる。', hint: '一階の診察室の机、霊安室のストレッチャー、研究棟への下りの通路。三枚そろえて、霊安室の机へ。',
    minigame: { type: 'order-steps', cfg: { title: '日誌：書いた順に', help: '札を二つ続けて押すと入れ替わる。書いた順に並べたら「これで確かめる」。', steps: ['1996年3月：父が死んだ。病理解剖は葛城先生。「臓器は全部お返ししました」と言われた。', '1999年6月：標本室の戸棚に、父の亡くなった日と同じ日付の瓶。ラベルは番号だけ。「7」。', '1999年9月10日：葛城先生の机から、台帳の棚の鍵を持ち出した。名前を、家族に返す。', '1999年9月15日：台風。今夜なら、誰も地下へ来ない。お父さんを、連れて帰る。　浅井早苗'], seed: 4, ok: '日誌がつながった。書いたのは浅井早苗さん。七番は、早苗さんの父の心臓だった。' } },
    steps: [{ text: '日誌の切れ端を三枚集める', body: '診察室の机・霊安室のストレッチャー・下りの通路。', done: 'look', emphasis: 'station:S_SQ1' }, stepDo('霊安室の机で、[E] で書いた順に並べる')] },
  { id: 'T_SQ2', stage: 'L3', room: 'P3', optional: true, title: '（寄り道）水の通路の、詰まった排水口を掃除する',
    meaning: '水の通路の床の排水口が、ごみで詰まっている。掃除すれば、止水弁で抜いた水が戻るのが遅くなる。', hint: '水の通路の床。格子の上に、布やごみがたまっている所が三つ。',
    steps: [{ text: '詰まった排水口を三つ掃除する', done: 'task' }] },
];

// ---------------------------------------------------------------- endings
const endings = [
  { id: 'E3', title: '名前を呼ぶ', kind: 'good', kicker: '二十七年ぶりに、名前で呼ばれた', photo: P('end-e3'), requires: { flags: ['end_name'] },
    text: '搬出口の外は、雨が上がりかけていた。黒木さんたちは、正面で私たちを待ったまま、朝まで気づかなかった。\n私たちは警察に、地下のことを全部話した。台帳と、早苗さんの日誌も渡した。\n数日後、研究棟の地下のホルマリンの槽の底から、一人の女性の遺骨が見つかった。浅井早苗さんだった。\nその腕の中に、七番の瓶があったという。早苗さんとお父さんは、同じお墓に入った。\n蓮さんは、それから少しずつ話すようになった。最初に言ったのは、「名前、呼んでくれた？」だったという。' },
  { id: 'E2', title: '七番の瓶', kind: 'normal', kicker: '標本は、名前のある人に戻った', photo: P('end-e2'), requires: { flags: ['end_return'] },
    text: '搬出口の外は、まだ雨だった。私たちは警察に、地下のことを話して、台帳を渡した。\n地下の標本は、台帳の名前をたよりに、一つずつ家族のもとへ返された。葛城医師は、十年前に亡くなっていた。\n七番の瓶だけは、地下のどこからも見つからなかった。\n浅井早苗さんの行方は、今も分からない。雨の夜、水無瀬病院の地下の水は、今もゆっくりと上がるという。' },
  { id: 'E1', title: '持って来た瓶', kind: 'bad', kicker: '言われたとおりに、持って来た', photo: P('end-e1'), requires: { flags: ['end_give'] },
    text: '黒木さんは瓶を受け取ると、鎖を外し、携帯を投げて返した。「……悪かったな」。それきり、黒木さんは瓶を抱えて、車で帰っていった。\n一週間後、また雨が降った。黒木さんの家の排水口から、水があふれたと聞いた。黄色く濁った、鼻を刺すにおいの水だったという。\n黒木さんとは、それから連絡がつかない。\n雨の夜になると、私の部屋の流しの排水口の奥で、ごぼごぼと音がする。……何かを、探しているみたいに。' },
];

// ---------------------------------------------------------------- talk
const HI = 'ひなた', K = '黒木', A = '浅井', I = '私';
const talk = {
  opening: [
    { who: I, text: '私は戸川湊、大学一年。幼なじみの篠原ひなたと、心霊動画を撮りに、山あいの廃病院へ来た。', img: P('op-hospital') },
    { who: I, text: '水無瀬病院。二十七年前、台風の夜に地下が水につかって、そのまま閉まった病院だ。今夜も雨が降っている。', img: P('op-rain') },
    { who: I, text: '玄関ホールで撮りはじめたとき、地元の先輩の黒木さんたちが入って来た。携帯を二人とも取り上げられた。', img: P('op-kuroki') },
    { who: I, text: '黒木さんたちは外へ出て、正面の扉の取っ手に鎖を巻いた。裏口も窓も、板で打ちつけてある。', img: P('op-chain') },
    { who: K, where: '鎖の扉の外', text: '地下の標本室に、七番の瓶がある。それを持って来い。持って来るまで、鎖は外さん。', img: P('op-chain') },
  ],
  hina1: [
    { who: HI, text: '湊、ごめん。私が撮りに行こうって言ったから。' },
    { who: I, text: 'ひなたのせいじゃない。……黒木さん、本気だ。' },
    { who: HI, text: '無線機は取られなかった。撮影で使うつもりだった二台。離れても、これで話せる。' },
    { who: HI, text: '黒木さん、なんで「七番」なんだろう。……扉のところで、聞いてみて。' },
  ],
  front: [
    { who: I, text: '黒木さん、開けてください。こんなの、ただの肝試しじゃないですか。' },
    { who: K, where: '鎖の扉の外', text: '肝試しじゃねえよ。……去年、俺の弟の蓮が、ここの地下まで入った。' },
    { who: K, where: '鎖の扉の外', text: '出て来てから、あいつは一言もしゃべらねえ。紙に「7」って、そればっかり書いてる。' },
    { who: I, text: '鎖のすき間から、くしゃくしゃの紙が押しこまれた。紙いっぱいに、鉛筆の「7」。' },
    { who: K, where: '鎖の扉の外', text: '俺は、下までは行けなかった。……蓮が何を見たのか知りたい。地下の標本室の、七番の瓶を持って来い。' },
    { who: K, where: '鎖の扉の外', text: '持って来たら、鎖は外す。携帯も返す。……持って来なけりゃ、朝まで開けねえ。' },
    { who: HI, text: '湊。……受付に、鍵の箱があったよ。地下へ降りる階段の鍵、あるかもしれない。' },
  ],
  key_done: [
    { who: I, text: '「階段 防火扉」の札のついた鍵。……これで、地下へ降りられる。' },
    { who: HI, text: '待って。七番って何の番号か分かんないまま行くの、こわい。カルテ庫を見てからにしよう。廊下の西の端。' },
  ],
  karte_done: [
    { who: HI, text: '浅井庄一さん。……カルテに「七」の付箋。亡くなった人の体を、地下で調べたってこと？' },
    { who: I, text: '病理解剖。死んだ理由を確かめるために、体を調べる。……「臓器の保存」の、家族の同意が空欄だ。' },
    { who: HI, text: '七番の瓶って、もしかして。……ううん、行こう。階段は、廊下の東の防火扉の奥。' },
  ],
  down: [
    { who: I, text: '地下は、くるぶしまで水につかっていた。雨水が、壁のすき間から流れこんでいる。' },
    { who: HI, text: 'いっ……！　ごめん、最後の段で、すべった。足首……ひねったかも。' },
    { who: I, text: 'ひなたは立てるけれど、まともには歩けない。……水の中を、長い通路の奥までは無理だ。' },
    { who: HI, text: 'ポンプ室って、案内図にあったよね。発電機が動けば、水が抜けるかも。そこまでなら行ける。' },
  ],
  gen_done: [
    { who: I, text: '発電機がうなり、天井の非常灯が、ぽつぽつとついた。壁の水位計の針が、ゆっくり下がりはじめる。' },
    { who: HI, text: '私、ここに残る。ポンプを見てる。水が上がってきたら、無線で知らせるから。' },
    { who: HI, text: 'だから湊、無線の周波数、合わせておこう。私のと同じところに。' },
  ],
  radio_done: [
    { who: HI, where: '無線', text: 'よし、聞こえる。……湊、何かあったら、すぐ呼んで。ほんとに。' },
    { who: I, text: '研究棟への通路は、地下の廊下の西の端。防水扉の向こうだ。' },
  ],
  bousui_done: [
    { who: I, text: '防水扉の向こうは、配管の通路。真っ暗で、ずっと奥まで続いている。水の流れる音。' },
    { who: HI, where: '無線', text: '湊、通路の壁に、非常灯のスイッチがあるはず。帰りに道が見えるように、つけていって。' },
  ],
  gate: [
    { who: I, text: '二枚目の防水扉の、窓の向こう。水が、窓の高さまで満ちている。……水の中に、何かいる。' },
    { who: A, where: '窓の向こうの水の中', text: '……かえして……。' },
    { who: I, text: '白い布をまとった、人のようなもの。手が、何本もある。それが窓を叩いている。' },
    { who: I, text: 'ひなた、扉の向こうが水でいっぱいだ。……何かいる。ポンプで、この先の水を抜けないか。' },
    { who: HI, where: '無線', text: 'やってみる。研究棟側のポンプ、二号に切りかえる。……今！' },
    { who: I, text: '窓の向こうの水が、渦を巻いて引いていく。水が下がると、あれも一緒に沈んで、見えなくなった。' },
    { who: I, text: '……水から出てこない。水が引くと、あれは一緒に退いた。' },
  ],
  post_ok: [
    { who: I, text: '止まった。乾いた床の手前で、あれが身をよじっている。……でも、床の溝から、水がにじみ戻ってくる。' },
  ],
  post_done: [
    { who: I, text: '水が戻った。……あれは、すっと水に沈んで消えた。' },
    { who: HI, where: '無線', text: '湊！　大丈夫？　何があったの。' },
    { who: I, text: 'あれは、水のある所しか進めない。止水弁を回して水を抜けば、そこで止まる。でも、水はしばらくで戻ってくる。' },
    { who: I, text: '通路のロッカーは、一段高い台の上にある。中に入れば、足が水から上がる。……見失うかもしれない。' },
  ],
  hyohon: [
    { who: I, text: '病理標本室。壁の棚に、ガラス瓶が何十本も並んでいる。黄色い液の中に、人の臓器。', img: P('in-hyohon') },
    { who: I, text: 'つんと鼻を刺すにおい。ホルマリン。標本を腐らせないための薬だ。床の槽にも、同じ液がたまっている。' },
    { who: I, text: '北の壁の、ガラス戸の戸棚。いちばん奥に、ラベルに「7」とだけ書いた瓶がある。' },
    { who: HI, where: '無線', text: '湊、聞こえる？　……雨が強くなってる。水位計の針が、また上がりはじめた。急いで。' },
  ],
  rise: [
    { who: I, text: '瓶の首に、ひもで名札と小さな鍵が結んである。名札は「検査科　浅井早苗」。……新聞の、行方不明の技師の人だ。' },
    { who: A, where: 'うしろの槽から', text: '……かえして……それは、わたしの……。' },
    { who: I, text: '懐中電灯が、ばちっと消えた。非常灯の明かりの中で、槽の液が盛り上がる。……逃げろ。止水弁を回しながら、防水扉まで。' },
    { who: HI, where: '無線', text: '湊！　研究棟の排水が逆流して……通路に水が……ポンプが、と……ザザッ……' },
  ],
  top: [
    { who: I, text: '防水扉を抜けた。うしろの通路の水の中から、あれが来る。……扉を閉めないと！' },
  ],
  seal_done: [
    { who: I, text: '扉を閉めて、ハンドルを回しきった。向こうから叩く音が、しだいに遠ざかる。' },
    { who: I, text: '……ひなた？　ひなた、聞こえるか。' },
    { who: I, text: '無線は雑音だけだ。地下の廊下の水が、また上がっている。……ポンプ室だ。' },
  ],
  rescue_in: [
    { who: HI, text: '湊……！　ポンプが止まって、水が……。足が、動かなくて。' },
    { who: I, text: 'ひなたは机の上に上がっている。水は、もう膝の上まで来ている。東の壁の制御盤で、ポンプを動かさないと。' },
  ],
  rescue_done: [
    { who: HI, text: '……ありがとう。死ぬかと思った。' },
    { who: I, text: '瓶の首に、名札と小さな鍵がついていた。「検査科　浅井早苗」。新聞の、行方不明の技師の人だ。' },
    { who: HI, text: '鍵……病理事務室に、鍵のかかった棚があった。地下に降りて来たとき、廊下から見えたの。' },
    { who: HI, text: 'あそこを開ければ、何か分かるかも。……肩、貸して。私も行く。' },
  ],
  ledger_done: [
    { who: I, text: '台帳に、番号と、名前が戻った。七番は、浅井庄一さんの心臓。……早苗さんのお父さんだ。' },
    { who: I, text: '棚の奥に、もう一つ鍵があった。札に「霊安室 搬出口」。……正面の扉を通らずに、外へ出られる。' },
    { who: HI, text: '湊……床の排水口。水が、噴き出してる！' },
    { who: I, text: '病理事務室の床の排水口から、黄色い水が湧いている。……排水管は、研究棟とつながっているんだ。' },
    { who: HI, text: '逆止弁、ここ！　私が押さえてる。湊、早く……あの人が何をしたいのか、分かれば……！' },
  ],
  think_done: [
    { who: I, text: '浅井早苗さんは、父の心臓が、黙って標本にされていたことを知った。' },
    { who: I, text: '台風の夜、父を連れて帰ろうと、標本室へ降りた。葛城医師は、早苗さんがいると知りながら、防水扉を閉めた。' },
    { who: I, text: '早苗さんは二十七年、水の中で、父の瓶を守りつづけている。……持ち出す者を、追いかけて。' },
    { who: I, text: '排水口の水の中から、何本もの手が伸びている。……瓶を返すなら、あそこだ。' },
  ],
  give: [
    { who: K, where: '鎖の扉の外', text: '……持って来たのか。本当に。' },
    { who: I, text: '鎖のすき間から、瓶を差し出した。黒木さんは、それを両手で受け取った。' },
    { who: K, where: '鎖の扉の外', text: 'これが、七番。……蓮は、これを見たのか。' },
    { who: HI, text: '湊……地下の水の音が、急に遠くなった。どこかへ、流れていくみたい。' },
  ],
  return_name: [
    { who: I, text: '瓶を、排水口の水の上へ差し出した。何本もの手が、瓶を包むように受け取った。' },
    { who: I, text: '浅井早苗さん。……あなたの名前です。お父さんは、浅井庄一さん。台帳に、ちゃんと書いてあります。' },
    { who: A, where: '排水口の水の中', text: '……なまえ。……わたしの。' },
    { who: I, text: '何本もあった手が、ほどけるように一つずつ消えて、最後に、細い二本の手だけが残った。瓶を、胸に抱いている。' },
    { who: A, where: '排水口の水の中', text: 'お父さん、見つけた。……ありがとう。呼んでくれて。' },
    { who: I, text: '水が、すうっと排水口に吸いこまれていった。床には、濡れた名札の跡だけが残っていた。' },
    { who: HI, text: '……行こう、湊。霊安室の搬出口から。' },
  ],
  return_plain: [
    { who: I, text: '瓶を、排水口の水の上へ差し出した。何本もの手が、瓶を包むように受け取った。' },
    { who: A, where: '排水口の水の中', text: '……お父さん……。' },
    { who: I, text: '水が、すうっと排水口に吸いこまれていった。瓶も、手も、一緒に消えた。' },
    { who: I, text: '……あの人の名前を、呼んであげればよかった。日誌の切れ端が、まだどこかに残っていたかもしれない。' },
    { who: HI, text: '……行こう、湊。霊安室の搬出口から。' },
  ],
  hearse: [
    { who: I, text: '搬出口の鍵が、重い音を立てて回った。両開きの扉の外から、雨のにおいがする。' },
    { who: HI, text: '黒木さんたち、まだ正面にいるよね。……蓮くんにも、ちゃんと話そう。何があったのか。' },
  ],
  sq1_done: [
    { who: I, text: '日誌を書いたのは、浅井早苗さん。新聞の、行方不明の技師の人だ。' },
    { who: I, text: '七番の瓶は、早苗さんのお父さんの心臓。早苗さんは台風の夜、お父さんを連れて帰ろうとして、地下へ降りた。' },
  ],
  whisper1: [{ who: A, where: '通路の奥', text: '……どこ……。' }],
  whisper2: [{ who: A, where: 'すぐうしろ', text: '……かえして……。' }],
  radio1: [{ who: HI, where: '無線', text: '湊、聞こえる？　今どのへん？　……こっちは、水位計の針が下がってる。大丈夫。' }],
  radio2: [{ who: HI, where: '無線', text: '湊。……さっきから、配管の中を何かが流れていく音がする。ごぼごぼって。……気のせいだよね。' }],
};

// ---------------------------------------------------------------- the questions at the desk (T_THINK). why: the line when the pick is wrong
const think = {
  intro: '事務机に、集めた物を並べた。カルテ、新聞の切り抜き、排水日誌、台帳、名札。……あの人が何をしたいのか、一つずつ確かめる。',
  questions: [
    { q: '七番の瓶の心臓は、誰のものか。', options: [
      { id: 'sanae', label: '浅井早苗さん本人', why: '台帳の七番は1996年の心臓。早苗さんがいなくなったのは1999年だ。' },
      { id: 'ren', label: '黒木さんの弟の、蓮さん', why: '蓮さんは生きている。台帳の七番は1996年だ。' },
      { id: 'father', label: '浅井庄一さん（早苗さんの父）', ok: true, why: '台帳の七番は1996年の心臓、浅井庄一さん。カルテには「七」の付箋と、空欄の家族の同意。名札は、娘の早苗さん。' } ] },
    { q: '早苗さんは、台風の夜、なぜ研究棟の地下へ降りたのか。', options: [
      { id: 'duty', label: '当直で、水を抜く仕事があったから', why: '水を見ていたのはポンプ室だ。早苗さんがいたのは標本室。名札は、七番の瓶に結んであった。' },
      { id: 'father', label: '父の心臓を、取り戻すため', ok: true, why: '名札と台帳の鍵は、七番の瓶に結んであった。父の瓶と、名前の分かる鍵を、一緒に持ち出そうとした。' },
      { id: 'sell', label: '標本を盗んで、売るため', why: '早苗さんが持っていたのは、七番の瓶と、名前の分かる台帳の鍵だけだ。' } ] },
    { q: '研究棟側の防水扉を閉めたのは、誰か。', options: [
      { id: 'sanae', label: '早苗さん自身', why: '防水扉のハンドルは、本館側にある。中にいる人には閉められない。排水日誌に、誰の指示と書いてあった？' },
      { id: 'katsuragi', label: '副院長の葛城医師', ok: true, why: '排水日誌：23時40分、防水扉を閉鎖（葛城副院長の指示）。5分後の「研究棟に浅井技師の姿」の一行は消してあった。新聞では「病院を出た」と話した。' },
      { id: 'kuroki', label: '黒木さんたち', why: '黒木さんたちが来たのは今夜だ。扉が閉められたのは、1999年の台風の夜。' } ] },
    { q: '水の中のあれは、何を探しているのか。', options: [
      { id: 'revenge', label: '瓶を持ち出した者に、仕返しがしたい', why: 'あれは瓶を持つ者だけを追った。言ったのは「かえして」。仕返しではない。' },
      { id: 'out', label: '病院から外へ出たい', why: '外へ出たいなら、防水扉が開いていたとき、出られた。あれは、瓶の近くから離れない。' },
      { id: 'father', label: '父の心臓を、自分の手に取り戻したい', ok: true, why: 'あれは七番の瓶を持つ者だけを追い、「かえして」「それは、わたしの」と言った。早苗さんが取り戻しに来た、父の心臓だ。' } ] },
  ],
};

// ---------------------------------------------------------------- monsters: none of the kit's (あれ is the ext's own); the file turns on the hiding places
const monsters = { early: { stages: 1 }, hints: { run: '走れ！', turn: '曲がれ！', hide: '隠れろ！' }, monsters: [] };

const releaseNotes = { version: '0.9.0', notes: [{ version: '0.9.0', date: '2026-11-16', title: 'β版を公開', items: [
  { type: 'new', text: '雨の廃病院と、水につかった地下の長い通路。止水弁で水を抜いて「あれ」を止める仕掛け、七番の瓶を持って逃げる場面、水が上がるなかの謎解き、三つの結末と二つの寄り道。' },
] }] };

// ---------------------------------------------------------------- the words to remember in each task (shown bold: **…**; copy-review rule)
const EMPH = {
  T_HINA: ['ひなた'], T_FRONT: ['七番の瓶', '正面の扉'], T_KEY: ['キーボックス', '防火扉'], T_KARTE: ['カルテ庫', '机'], T_KAIDAN: ['防火扉', '研究棟の地下'],
  T_GEN: ['発電機', '非常灯'], T_RADIO: ['無線'], T_BOUSUI: ['防水扉'], T_LAMP1: ['非常灯', '灰色の箱'], T_LAMP2: ['しゃがんで', '左の壁'], T_LAMP3: ['右へ'],
  T_GATE: ['窓のある鉄の扉'], T_POST: ['水のない所へは来られない', '赤いハンドル'], T_LAMP4: ['入口の右の壁'], T_HYOHON: ['病理標本室'],
  T_JAR: ['ガラス戸の戸棚'], T_ESCAPE: ['止水弁で止めながら'], T_SEAL: ['防水扉'], T_RESCUE: ['ひなたが危ない', '制御盤'],
  T_LEDGER: ['名札についていた小さな鍵'], T_THINK: ['間違えるたびに、水が上がる', '事務机'], T_RETURN: ['父の心臓', '床の排水口'],
  T_END: ['搬出口'], T_GIVE: ['鎖は外される'], T_SQ1: ['日付の順'], T_SQ2: ['水が戻るのが遅くなる', '三つ'],
};
for (const t of tasks) for (const w of EMPH[t.id] || []) for (const k of ['meaning', 'hint']) if (t[k] && t[k].includes(w) && !t[k].includes(`**${w}`)) { t[k] = t[k].replace(w, `**${w}**`); break; }

// ---------------------------------------------------------------- write
wr('data/plan.json', plan);
wr('data/water.json', { ...water, think });
wr('data/items.json', items.map((i) => { const t = i.given && tasks.find((x) => x.id === i.given); return { stage: t ? t.stage : 'L1', room: t ? t.room : 'GENKAN', ...i }; }));
wr('data/docs.json', docs);
wr('data/things.json', things);
wr('data/stages.json', stages);
wr('data/tasks.json', tasks);
wr('data/endings.json', endings);
for (const [k, seq] of Object.entries(talk)) seq.forEach((L, i) => { L.id = `${k}-${i + 1}`; if (L.where === '無線') L.vfx = 'phone'; if (fs.existsSync(path.join(ROOT, 'assets/voice', `${L.id}.mp3`))) L.voice = `assets/voice/${L.id}.mp3`; });
wr('data/talk.json', talk);
wr('data/monsters.json', monsters);
wr('data/release-notes.json', releaseNotes);
