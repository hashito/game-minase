// 水無瀬病院 ドット版（一人称）: the dot layer over the same game (the root's js/ext/index.js runs first, with the same data and voices).
// Modelled on 札の家 game-kushi dot/js/dot/index.js (711ee4f). game.json "dot": { "mode": "fps" } (written by tools/build-dot.mjs).
//   - the people (ひなた, あれ) are sprite-stack frame sets of the kit's shared motion rig (game-kit js/sprite-stack-mesh.js +
//     js/sprite-stack-anim.js, docs/sprite-motions.md; ひなた character-hoodie, あれ monster-specimen-chimera, branch sprites-m1),
//     played by MotionPlayer from what the game does (ひなた: walk / limp / lean / crouch / fear; あれ: wade / grasp / idle)
//   - the plan's furniture, the items lying in the world and the mood props (dot/data/props.json, room by room) are library sprite
//     stacks; the colliders and the picking boxes of the game do not change
//   - the photos are the root's photos drawn as pixel art at boot (photos.js), the UI is the pixel skin of dot/css/dot.css
//   - reading: the kit's reading panel and 覚え書き・読んだもの tab (standard 1.20.3, js/kit/reads-tab.js) - not redone here
//   - the dark stays readable: a dim floor of light that never reaches black, a small light round the player, the next goal glows,
//     and in the chase the way back (the valves, the watertight door) is lit
// Everything (frames, stacks, photos, the pixel font) is loaded and every mesh compiled before the start button opens (pixel games load first).
import * as THREE from 'three';
import { loadFrameSet, createFigure, buildStackGeometry, loadPixels, stripVolume } from '../kit/sprite-stack-mesh.js';
import { turnToward } from '../kit/sprite-stack-anim.js';
import { installPhotoHooks, preparePhotos } from './photos.js';
import { palette, dotifyScene } from '../kit/dot-world.js';
import { HINA } from '../../../js/ext/hina.js';
import { standSpots, roomAt } from './hina-spots.js';

const LAYER = new URL('../../', import.meta.url).href;   // /dot/
const at = (p) => new URL(p, LAYER).href;

// the plan's furniture kinds -> stack (tools/dot/stacks.py); per furniture id where one room wants another part
const FURN = { bench: 'bench', locker: 'locker', vendingMachine: 'vending', plant: 'plant', extinguisher: 'extinguisher', desk: 'desk', filingCabinet: 'filing',
  fileRack: 'karte-shelf', bed: 'exam-bed', pipeChair: 'pipe-chair', shelf: 'shelf', drum: 'drum', steelDesk: 'steel-desk', officeChair: 'office-chair',
  crate: 'crate', bodyCabinets: 'body-cabinets' };
const FILL = /desk|shelf|filing|locker|cabinet|bench|bed|gurney|crate|drum|vending/;
const FURN_ID = { F_RE_BED: 'gurney-shape' };   // 霊安室: the bed is a gurney with someone under the sheet
// the items lying in the world (items.json kind / id) -> stack
const ITEM_STACK = { FLASH: 'flashlight', KEY_B1: 'key', HEARSE_KEY: 'key', REN_PAPER: 'ren-paper', PAGE1: 'diary-pages', PAGE2: 'diary-pages', PAGE3: 'diary-pages', JAR: 'jar', NAMETAG: 'tag' };
// 1.4.2 (「机の上からはみ出してる」「これも浮いてます」「非常灯などがドットでないです」): the documents and the stations' own models are dot parts
// too, at their real size (never stretched to the old model's box), on the surface under them and inside its footprint
const DOC_STACK = { DOC_HEISA: 'notice', DOC_MAP: 'map-board', DOC_CHART: 'karte-7', DOC_NEWS: 'news-clipping', DOC_LOG: 'pump-log' };
const LOOK_STACK = { S_KEYBOX: { k: 'keybox' }, S_PUMPSW: { k: 'panel-off', after: { task: 'T_RESCUE', k: 'panel-on' } },
  S_LAMP1: { k: 'lamp-switch' }, S_LAMP2: { k: 'lamp-switch' }, S_LAMP3: { k: 'lamp-switch' }, S_LAMP4: { k: 'lamp-switch' },
  S_DESK: { k: 'ledger-book', top: true }, S_SQ1: { k: 'diary-pages', top: true, mark: 'T_SQ1' } };
// the gurney of the ground-floor passage (dot only): [E] says what it is (「これ人寝てないですか？」)
const DOT_THINGS = [{ id: 'DOT_GURNEY', room: 'ROKA', position: [12.6, 15.5], y: 0.75, size: 1.1, label: '廊下のストレッチャー',
  text: ['シーツがずり落ちたストレッチャー。上にあるのは、丸めた毛布だけ。誰も寝ていない。'], feeling: '人の形に見えたのは、毛布だった。' }];

export default async function dotLayer(ext, { manifest, data }) {
  const mode = (manifest.dot && manifest.dot.mode) || 'fps';
  document.documentElement.dataset.dot = mode;
  installPhotoHooks();
  const D = window.__dot = { mode, timings: {}, furniture: [], items: [], props: [], figures: null, swapped: [], settled: [] };
  if (Array.isArray(data.things)) for (const t of DOT_THINGS) if (!data.things.some((x) => x.id === t.id)) data.things.push(t);
  // ひなた stands while she waits (no held lean), at least 0.4 m from walls and furniture (dot/js/dot/hina-spots.js; tools/dot/check-props.mjs)
  { const plan0 = data.plan || (await fetch('/data/plan.json').then((r) => r.json())); D.hinaSpots = standSpots(HINA, plan0, roomAt(plan0)); }
  const t0 = performance.now();
  const [hinaSet, areSet, stackIndex, photoList, propList] = await Promise.all([
    loadFrameSet(THREE, at('assets/figures/hinata.json')),
    loadFrameSet(THREE, at('assets/figures/are.json')),
    fetch(at('assets/stacks/index.json')).then((r) => r.json()),
    fetch(at('photos.json')).then((r) => r.json()).catch(() => []),
    fetch(at('data/props.json')).then((r) => r.json()).catch(() => ({ props: [] })),
  ]);
  const stackPx = Object.fromEntries(await Promise.all(Object.keys(stackIndex).map(async (k) => [k, await loadPixels(at(`assets/stacks/${k}.png`))])));
  D.timings.load = Math.round(performance.now() - t0);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  mat.name = 'dot-stack';
  // the people: their own colours plus a share as emission, so a figure reads as a person in a dark room (the lights still shape it)
  const FIG_KNEE = 0.32, FIG_CAP = 0.62;   // 1.4.4: linear light on a figure rolls off softly from the knee and never passes the cap
  const figMat = (self, name) => {
    const m = new THREE.MeshLambertMaterial({ vertexColors: true });
    m.name = name;
    // 1.4.4 「ひなたの顔に白い横の帯」: her near-white collar under the face (albedo 0.96) took the self light and the flashlight and clipped to
    // a glowing white row (with the flashlight off it was still there). Pale colours take less self light, and the light on a figure rolls
    // off softly under FIG_CAP instead of clipping, so a face keeps its shape at 0.8 m in the flashlight (tools/dot/face-check-steps.mjs)
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ${self.toFixed(3)} * (1.0 - 0.7 * dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)));`)
        .replace('#include <opaque_fragment>', `{ float fm = max(max(outgoingLight.r, outgoingLight.g), outgoingLight.b); const float FK = ${FIG_KNEE.toFixed(3)}, FC = ${FIG_CAP.toFixed(3)};\n  if (fm > FK) outgoingLight *= (FK + (FC - FK) * (1.0 - exp(-(fm - FK) / (FC - FK)))) / fm; }\n#include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => `dot-fig-${self}-${FIG_KNEE}-${FIG_CAP}`;
    return m;
  };
  const geoCache = new Map();
  const stackGeo = (k) => {
    if (!geoCache.has(k)) { const s = stackIndex[k]; geoCache.set(k, buildStackGeometry(THREE, stripVolume(stackPx[k], s.w, s.d, s.n, 0), { mpp: s.mpp })); }
    return geoCache.get(k);
  };
  // a stack centred on x / z with its bottom at 0 (for props placed by a point)
  const centred = new Map();
  const cgeo = (k) => {
    if (!centred.has(k)) { const g = stackGeo(k).clone(); g.computeBoundingBox(); const b = g.boundingBox, c = b.getCenter(new THREE.Vector3()); g.translate(-c.x, -b.min.y, -c.z); g.computeBoundingBox(); centred.set(k, g); }
    return centred.get(k);
  };

  // behind the title: the photos as pixel art, the pixel font for every line of the game
  ext.registerBoot('dot-pictures', async (ctx, report) => {
    const t = performance.now();
    D.photos = await preparePhotos(photoList, (k) => report(k * 0.8, `ドット絵を準備中… ${Math.round(k * 100)}%`));
    try {
      const text = [...new Set(JSON.stringify([data, manifest]).replace(/\\u[0-9a-f]{4}|\\n/g, ''))].join('');
      await Promise.race([document.fonts.load('16px "DotGothic16"', text), new Promise((r) => setTimeout(r, 8000))]);
      await document.fonts.ready;
      D.font = document.fonts.check('16px "DotGothic16"', '水無瀬病院');
    } catch (e) { D.font = false; }
    report(1, '');
    D.timings.pictures = Math.round(performance.now() - t);
  });
  // the game's own shader step compiles every program: after this one
  for (const id of ['minase-shaders', 'minase-boot']) { const s = ext.reg.boot.get(id); if (s) { ext.reg.boot.unregister(id); ext.reg.boot.register(id, s); } }

  // one stack filling a box (its long side along the box's long side, scaled to the box's short side), front toward `face`
  function fitStack(k, box, o = {}) {
    const g = cgeo(k), gs = g.boundingBox.getSize(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const face = o.face || 0;
    // the box seen in the stack's own frame (turned by face)
    const q = Math.abs(Math.sin(face)) > 0.5;
    const bw = q ? size.z : size.x, bd = q ? size.x : size.z;
    const s = Math.min(bw / gs.x, bd / gs.z, (o.hmax || 2.6) / gs.y) * (o.k || 1);
    const sy = o.exactY ? size.y / gs.y : o.fillY ? Math.max(s, size.y / gs.y * 0.92) : s;
    const m = new THREE.Mesh(g, o.material || mat); m.castShadow = true; m.receiveShadow = true;
    // 1.5.0 (3rd play test #8 「机や開かない棚が小さい」): furniture fills the footprint of the plan (o.fill), it no longer shrinks to the
    // part's own proportions inside it
    if (o.fill) m.scale.set(bw / gs.x, sy, bd / gs.z); else m.scale.set(Math.min(bw / gs.x, s * 1.25), sy, Math.min(bd / gs.z, s * 1.25));
    m.rotation.y = face;
    m.position.set(c.x, box.min.y, c.z);
    m.name = `dot-stack:${k}`;
    return m;
  }

  let figures = null, ctxRef = null;
  ext.on('game:ready', (ctx) => {
    ctxRef = ctx;
    const t = performance.now();
    const G = window.__mn || {};
    const W = ctx.world, scene = ctx.scene;
    const tb = document.querySelector('#title .gf-title-box');
    if (tb) tb.setAttribute('data-dot-label', 'ドット版・一人称');
    const plan = ctx.data.plan;
    const roomOf = (id) => (plan.rooms || []).find((r) => r.id === id);
    const fy = (room) => W.floorY((roomOf(room) || {}).floor || 0);
    // ---- what lies on a piece of furniture rests on the dot part: inside its footprint, its bottom on the surface under it (1.4.2,
    // 「机の上からはみ出してる」「これも浮いてます」: an old model's box was larger than the library desk, and a paper hung 5 cm over it) ----
    const down = new THREE.Raycaster(); down.far = 1.6;
    const moveWorld = (obj, d) => { const p = obj.getWorldPosition(new THREE.Vector3()); const a = obj.parent.worldToLocal(p.clone()), b = obj.parent.worldToLocal(p.add(d)); obj.position.add(b.sub(a)); obj.updateMatrixWorld(true); };
    const rest = (obj, supports, vis = obj) => {
      obj.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(vis), c = b.getCenter(new THREE.Vector3());
      const under = supports.find((f) => c.x >= f.b.min.x - 0.2 && c.x <= f.b.max.x + 0.2 && c.z >= f.b.min.z - 0.2 && c.z <= f.b.max.z + 0.2 && b.min.y >= f.b.min.y + 0.15 && b.min.y <= f.b.max.y + 0.5);
      if (!under) return null;
      const F = under.b, hx = (b.max.x - b.min.x) / 2 + 0.015, hz = (b.max.z - b.min.z) / 2 + 0.015;
      const tx = F.max.x - F.min.x <= 2 * hx ? (F.min.x + F.max.x) / 2 : Math.min(Math.max(c.x, F.min.x + hx), F.max.x - hx);
      const tz = F.max.z - F.min.z <= 2 * hz ? (F.min.z + F.max.z) / 2 : Math.min(Math.max(c.z, F.min.z + hz), F.max.z - hz);
      down.set(new THREE.Vector3(tx, F.max.y + 0.4, tz), new THREE.Vector3(0, -1, 0));
      const hit = down.intersectObject(under.o, false)[0], ty = hit ? hit.point.y : F.max.y;
      const d = new THREE.Vector3(tx - c.x, ty + 0.003 - b.min.y, tz - c.z);
      if (d.length() > 1e-3) moveWorld(obj, d);
      return { on: under.o.name, d: d.toArray().map((v) => +v.toFixed(3)) };
    };
    const natural = (k, mount) => { const m = new THREE.Mesh(geoFor(k, mount), mat); m.name = `dot-part:${k}`; m.castShadow = true; m.receiveShadow = true; return m; };
    const swapAndSettle = () => {
      const tops = W.group.children.filter((o) => String(o.name).startsWith('dot-stack:')); for (const o of tops) o.updateMatrixWorld(true);   // added this frame: no render has set their matrices yet
      const supports = tops.map((o) => ({ o, b: new THREE.Box3().setFromObject(o) }));
      D.settled = []; D.swapped = [];
      // the stations' own models (the key box, the pump panel, the lamp switches, the papers on the two desks)
      for (const [id, L] of Object.entries(LOOK_STACK)) {
        const old = W.group.getObjectByName(`stlook:${id}`); if (!old || !stackIndex[L.k]) { D.swapped.push([id, old ? 'no stack' : 'no model']); continue; }
        old.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(old), c = box.getCenter(new THREE.Vector3()), face = old.rotation.y || 0;
        old.traverse((x) => { if (x.isMesh || x.isSprite) x.visible = false; });
        const m = natural(L.k, L.top ? 'floor' : 'wall');
        m.rotation.y = face;
        if (L.top) m.position.set(c.x, box.min.y, c.z);
        else { const dir = new THREE.Vector3(Math.sin(face), 0, Math.cos(face)); const back = c.clone().addScaledVector(dir, -(Math.abs(dir.x) * (box.max.x - box.min.x) + Math.abs(dir.z) * (box.max.z - box.min.z)) / 2); m.position.set(back.x, box.min.y, back.z); }
        W.group.add(m); m.updateMatrixWorld(true);
        const r = L.top ? rest(m, supports) : null;
        if (L.after && stackIndex[L.after.k]) swaps.push({ m, p: { after: L.after }, g2: geoFor(L.after.k, L.top ? 'floor' : 'wall'), m2: null, done: false });
        if (L.mark) marks.push({ m, task: L.mark });
        D.swapped.push([id, L.k, r ? r.on : L.top ? 'not on a support' : 'wall']);
      }
      // 1.4.3 「発電機など大きなものは解像度が高いドット絵にするべき」: the generator (off / running) and the drain pump of the pump room
      // as fine dot parts filling the boxes of the normal version's models (js/ext/hospital.js), which are hidden
      const GM = window.__mn || {};
      const machine = (k, k2, near, r) => {
        if (!stackIndex[k]) { D.swapped.push([k, 'no stack']); return null; }
        const hide = []; W.group.traverse((o) => { if (!o.isMesh || String(o.name).startsWith('dot-') || o.name) return; const b = new THREE.Box3().setFromObject(o), c = b.getCenter(new THREE.Vector3()); if (Math.hypot(c.x - near.x, c.z - near.z) < r && c.y > near.y - 0.1 && c.y < near.y + 2.2 && b.getSize(new THREE.Vector3()).y < 2.4) hide.push({ o, b }); });
        if (!hide.length) return null;
        const box = new THREE.Box3(); for (const h of hide) { box.union(h.b); h.o.visible = false; }
        box.min.y = Math.max(box.min.y, near.y);
        const lx = box.max.x - box.min.x, lz = box.max.z - box.min.z;
        const g0 = cgeo(k).boundingBox.getSize(new THREE.Vector3()), face = (g0.x >= g0.z) === (lx >= lz) ? 0 : Math.PI / 2;
        const m = fitStack(k, box, { face, hmax: (box.max.y - box.min.y) * 1.1 }); m.name = `dot-part:${k}`; W.group.add(m);
        let m2 = null; if (k2 && stackIndex[k2]) { m2 = fitStack(k2, box, { face, hmax: (box.max.y - box.min.y) * 1.1 }); m2.name = `dot-part:${k2}`; m2.visible = false; W.group.add(m2); }
        D.swapped.push([k, 'machine', hide.length]);
        return { m, m2 };
      };
      const fyP = (W.floorY ? W.floorY(-1) : 0);
      if (GM.genBody) { GM.genBody.updateMatrixWorld(true); const gp = new THREE.Vector3(); GM.genBody.getWorldPosition(gp); D.gen = machine('generator-off', 'generator-on', { x: gp.x, y: gp.y - 0.5, z: gp.z }, 0.95); }
      if (GM.genBody) { const gp = new THREE.Vector3(); GM.genBody.getWorldPosition(gp); D.pump = machine('pump-unit', null, { x: 1.0, y: gp.y - 0.5, z: 9.9 }, 0.45); }
      void fyP;
      // the documents: their paper model -> the dot part, standing on the wall or lying on the desk
      for (const pk of W.interactables || []) {
        const nm = String(pk.name || ''), id = nm.slice(4), k = nm.startsWith('doc:') && DOC_STACK[id];
        if (!k || !stackIndex[k] || pk.userData.dotDone) continue;
        pk.userData.dotDone = true;
        pk.updateMatrixWorld(true);
        let face = 0, flat = true;
        pk.traverse((x) => { if (x !== pk && x.isMesh) { const n = new THREE.Vector3(0, 0, 1).transformDirection(x.matrixWorld); if (Math.abs(n.y) < 0.7) { flat = false; face = Math.atan2(n.x, n.z); } x.visible = false; } });
        const m = natural(k, flat ? 'floor' : 'wall');
        const p = pk.getWorldPosition(new THREE.Vector3());
        if (flat) { m.rotation.y = 0; m.position.copy(pk.worldToLocal(new THREE.Vector3(p.x, p.y - (pk.geometry && pk.geometry.parameters ? pk.geometry.parameters.height / 2 : 0), p.z))); }
        else { const dir = new THREE.Vector3(Math.sin(face), 0, Math.cos(face)); ray.set(p.clone().addScaledVector(dir, 0.5), dir.clone().negate()); const hit = ray.intersectObjects(surfaces, false)[0]; const w = hit ? hit.point.clone().addScaledVector(dir, 0.02) : p; w.y = p.y - (stackIndex[k].n * stackIndex[k].mpp) / 2; m.position.copy(pk.worldToLocal(w)); m.rotation.y = face - pk.rotation.y; }
        pk.add(m);
        D.swapped.push([id, k, flat ? 'flat' : 'wall']);
      }
      // the mood props set on furniture (a tray on the mortuary desk)
      for (const m of raised) { const r = rest(m, supports); if (r) D.settled.push([m.name, r.on, r.d]); }
      // the pickups and the documents lying on furniture
      for (const pk of W.interactables || []) {
        const nm = String(pk.name || ''); if (!/^(item|doc):/.test(nm)) continue;
        const def = pk.userData.def || {}; if (def.wall || (def.y != null && def.y >= 1)) continue;
        const vis = pk.children.find((x) => String(x.name).startsWith('dot-')) || pk;
        const r = rest(pk, supports, vis);
        if (!r) continue;
        if (def.y != null) def.y = +(def.y + r.d[1]).toFixed(3);   // the kit puts pickups on their support again later
        if (Array.isArray(def.position)) { def.position = [+(def.position[0] + r.d[0]).toFixed(3), +(def.position[1] + r.d[2]).toFixed(3)]; }
        D.settled.push([nm, r.on, r.d]);
      }
    };
    // ---- the plan's furniture (the kit's recipes build it a moment after game:ready: wait for it) ----
    const dressFurniture = (tries = 0) => {
      const ready = (plan.furniture || []).some((f) => ctx.recipes && ctx.recipes.props && ctx.recipes.props.get(f.id));
      if (!ready && tries < 200) { setTimeout(() => dressFurniture(tries + 1), 50); return; }
      D.furniture.length = 0;
    for (const f of plan.furniture || []) {
      const obj = (ctx.recipes && ctx.recipes.props && ctx.recipes.props.get(f.id)) || W.group.getObjectByName(`prop:${f.id}`);
      const k = FURN_ID[f.id] || FURN[f.kind];
      if (!obj || !k || !stackIndex[k]) { D.furniture.push({ id: f.id, kind: f.kind, skipped: true, why: !obj ? 'no object' : !k ? 'no stack for the kind' : 'stack missing' }); continue; }
      obj.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(obj);
      if (box.isEmpty()) { D.furniture.push({ id: f.id, empty: true }); continue; }
      obj.traverse((x) => { if (x.isMesh) x.visible = false; });
      // the stack's front (+z) toward where the furniture's front looked (rot 0 -> +z)
      const face = ((f.rot || 0) * Math.PI) / 180;
      // never taller than the furniture it stands for: what lies on it (a paper, a jar) and who stands on it (ひなた on the pump-room desk,
      // hina.js rescue y 0.76) stay on its top, not inside it (hina-check: feet 32 cm into the desk); a desk, bed or bench top is exactly
      // where the game's was, so the papers on it lie on it (check-playtest P13: a chart 24 cm above a lower dot desk)
      const fillY = k === 'karte-shelf' || k === 'shelf' || k === 'locker' || k === 'filing' || k === 'body-cabinets';
      const o = { face, hmax: (box.max.y - box.min.y) * 1.04, exactY: /desk|bed|bench|gurney/.test(k) || /desk|bed|bench/i.test(f.kind) || fillY, fillY, fill: FILL.test(k) };
      // a long row (a 5 m rack of charts) is several units side by side, each of its own real width, not one stretched or one shrunk
      const gs = cgeo(k).boundingBox.getSize(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
      const q = Math.abs(Math.sin(face)) > 0.5, bw = q ? size.z : size.x, unit = gs.x * (size.y / gs.y), n = fillY ? Math.max(1, Math.round(bw / Math.max(0.4, unit))) : 1;
      for (let i = 0; i < n; i++) {
        const b = box.clone();
        if (n > 1) { const a = q ? 'z' : 'x', L = (box.max[a] - box.min[a]) / n; b.min[a] = box.min[a] + i * L; b.max[a] = b.min[a] + L; }
        const st = fitStack(k, b, o); if (i) st.name += `#${i}`;
        W.group.add(st);
      }
      D.furniture.push({ id: f.id, k, box: [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z].map((v) => +v.toFixed(2)) });
    }
      // what lies on the furniture (a chart, a diary page) rests on the stack's own top: a library desk's top is not always where the
      // game's desk top was (check-playtest P13: papers 24 cm above the dot desk). Wall papers (y 1 m and more) stay where they are.
      swapAndSettle(ctx);
      D.furnitureAt = Math.round(performance.now() - t);
      if (ctx.pixelStyle) ctx.pixelStyle.sweep();
    };
    // ---- items lying in the world ----
    for (const o of W.interactables) {
      const ia = o.userData.interact, k = ia && ia.kind === 'item' && ITEM_STACK[ia.id];
      const model = o.userData.model;
      if (!k || !model || !stackIndex[k]) continue;
      o.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(model);
      if (b.isEmpty()) continue;
      model.visible = false;
      const st = fitStack(k, b, { k: 1.15 });
      st.position.copy(o.worldToLocal(st.position.clone()));
      o.add(st);
      D.items.push(ia.id);
    }
    // ---- the mood props (dot/data/props.json: { props: [{ room, k, x, z, face, s, solid, y, mount, light }] }) ----
    // mount "wall": the part's back (its -z) against the wall behind the point (a ray from x / z away from where it faces), 3 cm proud of it -
    //   never on the plaster's own plane (the flicker of 札の家 #wall papers) and never a backing larger than the part;
    // mount "ceiling": hung from the ceiling above the point (its top 1 cm under it); light: [colour, intensity, distance] for a part that glows
    const surfaces = []; W.group.traverse((o) => { if (o.isMesh && o.visible !== false && !String(o.name).startsWith('dot-') && !String(o.name).startsWith('prop:')) surfaces.push(o); });
    const ray = new THREE.Raycaster(); ray.far = 2.5;
    const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });   // glow: true - reads in the dark (no light of its own)
    const mountGeo = new Map();
    const geoFor = (k, mount) => {
      if (mount !== 'wall' && mount !== 'ceiling') return cgeo(k);
      const key = `${k}|${mount}`;
      if (!mountGeo.has(key)) { const g = stackGeo(k).clone(); g.computeBoundingBox(); const bb = g.boundingBox, c = bb.getCenter(new THREE.Vector3()); g.translate(-c.x, mount === 'ceiling' ? -bb.max.y : -bb.min.y, mount === 'wall' ? -bb.min.z : -c.z); g.computeBoundingBox(); mountGeo.set(key, g); }
      return mountGeo.get(key);
    };
    const swaps = D.swaps = [], marks = D.marks = [], drips = D.drips = [], raised = [];
    const dropMat = new THREE.PointsMaterial({ color: 0xa9d4e0, size: 0.035, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false });
    const makeDrip = (b, y0, p) => {
      const top = new THREE.Vector3((b.min.x + b.max.x) / 2 + (p.dripAt ? p.dripAt[0] : 0), b.min.y + 0.02, (b.min.z + b.max.z) / 2 + (p.dripAt ? p.dripAt[1] : 0));
      const r = new THREE.Raycaster(top.clone(), new THREE.Vector3(0, -1, 0), 0.05, 4);
      const hit = r.intersectObjects([...surfaces, ...W.group.children.filter((o) => String(o.name).startsWith('dot-'))], false).find((h) => h.point.y < top.y - 0.2);
      const floorY = hit ? hit.point.y : y0;
      const N = 5, pos = new Float32Array(N * 3), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(g, dropMat); pts.frustumCulled = false; pts.name = 'dot-drips'; scene.add(pts);
      // the ring where they land: 8 pixel dots spreading out
      const R = 8, rp = new Float32Array(R * 3), rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
      const ringMat = dropMat.clone(); ringMat.size = 0.025; const ring = new THREE.Points(rg, ringMat); ring.frustumCulled = false; ring.name = 'dot-drip-ring'; scene.add(ring);
      return { top, floorY, pos, g, rp, rg, ring, ringMat, N, R, t: 0, splash: 9, landed: -1 };
    };
    for (const p of propList.props || []) {
      const R = roomOf(p.room);
      if (!R || !stackIndex[p.k]) { D.props.push({ k: p.k, room: p.room, missing: true }); continue; }
      const info = stackIndex[p.k], mount = p.mount || 'floor', g = geoFor(p.k, mount);
      const m = new THREE.Mesh(g, p.glow ? glowMat : mat); m.name = `dot-prop:${p.k}`; m.castShadow = true; m.receiveShadow = true;
      const s = p.s || 1, f = p.face || 0, dir = new THREE.Vector3(Math.sin(f), 0, Math.cos(f));
      m.scale.setScalar(s);
      m.rotation.y = f;
      const y0 = fy(p.room);
      m.position.set(p.x, y0 + (p.y || 0), p.z);
      let wallAt = null;
      if (mount === 'wall') {
        ray.set(new THREE.Vector3(p.x, y0 + (p.y || 0) + 0.3, p.z).addScaledVector(dir, 0.6), dir.clone().negate());
        const hit = ray.intersectObjects(surfaces, false)[0];
        if (hit) { wallAt = +hit.distance.toFixed(2); m.position.x = hit.point.x + dir.x * 0.03; m.position.z = hit.point.z + dir.z * 0.03; }
      } else if (mount === 'ceiling') {
        // the ceiling itself (a lamp or a pipe under it is not where the board hangs: 1.4.2 「受付の雨漏り部分が少し浮いて見える」)
        ray.set(new THREE.Vector3(p.x, y0 + 1.2, p.z), new THREE.Vector3(0, 1, 0));
        const hit = ray.intersectObjects(surfaces.filter((o) => /^ceil:/.test(o.name) || /^ceil:/.test((o.parent && o.parent.name) || '')), false)[0] || ray.intersectObjects(surfaces, false)[0];
        m.position.y = hit ? hit.point.y - 0.01 : y0 + 2.7;
        wallAt = hit ? +(hit.point.y - y0).toFixed(2) : null;
      }
      W.group.add(m);
      m.updateMatrixWorld(true);
      if (mount === 'floor' && (p.y || 0) > 0.2) raised.push(m);   // a tray on a desk: rests on the dot desk (swapAndSettle)
      const b = new THREE.Box3().setFromObject(m);
      if (p.solid) W.colliders.push({ box: b.clone().expandByVector(new THREE.Vector3(-0.05, 0, -0.05)), off: false, name: `dot-prop:${p.k}` });
      if (p.light) { const L = new THREE.PointLight(p.light[0], p.light[1], p.light[2] || 3, 1.6); L.position.copy(b.getCenter(new THREE.Vector3())).addScaledVector(dir, 0.25); L.name = `dot-prop-light:${p.k}`; ctx.scene.add(L); }
      // after: { task, k } - the part's other state (kit swap pairs, design/swap-pairs.json) once that task is done (a lamp lit by the generator)
      if (p.after && stackIndex[p.after.k]) swaps.push({ m, p, g2: geoFor(p.after.k, mount), m2: p.after.glow ? glowMat : null, done: false });
      // drip: true - water falls from the lowest point of the part to the floor (or what stands under it), in pixel drops, and rings
      if (p.drip) drips.push(makeDrip(b, y0, p));
      D.props.push({ k: p.k, room: p.room, mount, wallAt, size: b.getSize(new THREE.Vector3()).toArray().map((v) => +v.toFixed(2)), mpp: info.mpp });
    }

    dressFurniture();   // after the props: it uses their ray, surfaces and swap list

    // ---- the people ----
    const warm = [];
    const hideOwn = (root, keep) => root.traverse((x) => { if (x.isMesh && !keep.has(x)) x.visible = false; });
    // ひなた: her frames follow the kit person js/ext/hina.js moves and poses (H.set)
    let hina = null;
    if (G.hina && G.hina.root) {
      const H = G.hina;
      hina = createFigure(THREE, hinaSet, { height: 1.6, material: figMat(0.3, 'dot-hinata'), name: 'hinata', holdOk: ['fear'] });
      const keep = new Set(); hina.root.traverse((x) => keep.add(x));
      hideOwn(H.root, keep);
      H.root.add(hina.root);
      H.root.updateMatrixWorld(true);
      // the kit person's own update keeps hiding nothing new; its pose is what we read
      const set0 = H.set.bind(H);
      D.hinaPose = 'idle';
      H.set = (state, o) => { D.hinaPose = state; return set0(state, o); };
      warm.push(hina.warm);
      // [E] on her: a large box (play test: talking had to be aimed at a thin box; a tap on a phone missed)
      const hit = W.group.getObjectByName('hina:hit');
      // 1.4.2: the box from her waist to above her head (a tap on her chest or face hits her, not the floor in front of her feet)
      if (hit) { hit.scale.set(1.3, 1.0, 1.3); D.hinaHit = [0.9, 1.5, 0.9]; }
    }
    // あれ: her frames in the kit's chimera root (js/ext/chimera.js moves it along the passage, sinks it, fades it); the mist stays
    let are = null;
    if (G.chimera && G.chimera.root) {
      const C = G.chimera, k = C.root.scale.x || 1;
      are = createFigure(THREE, areSet, { height: 1.85 / k, material: figMat(0.22, 'dot-are'), name: 'are', holdOk: ['attack', 'fear'] });
      are.root.position.y = -0.15 / k;   // the kit model stands 0.15 above the floor (its hips at the water line); the frames stand on the floor
      const keep = new Set(); are.root.traverse((x) => keep.add(x));
      hideOwn(C.root, keep);
      C.root.add(are.root);
      warm.push(are.warm);
    }
    for (const w of warm) { w.visible = false; scene.add(w); }
    ctx.warmObjects = [...(ctx.warmObjects || []), ...warm];
    figures = D.figures = { hina, are };

    // ---- a larger [E] box on the talk points (the man behind the chained door) ----
    for (const id of ['S_FRONT']) { const m = W.interactables.find((o) => o.name === `station:${id}`); if (m) m.scale.multiplyScalar(1.5); }

    // ---- light: never pure black, a small light round the player, the next goal glows ----
    const amb = new THREE.AmbientLight(0x2a3240, 0.55); amb.name = 'dot-floor-light'; scene.add(amb);
    const near = new THREE.PointLight(0xc8d0d8, 0.9, 4.5, 1.6); near.name = 'dot-near-light'; scene.add(near);
    D.lights = { amb, near };
    installBeacon(ctx, G);
    if (ctx.pixelStyle) ctx.pixelStyle.sweep();
    // ---- 1.4.3 one palette, every surface dot (「壁もドット絵でないです。全てドットで再構築してください」「非常灯などがドットでないです」
    // 「全体の色合いを合わせる処理をしてください」): walls, floors, ceilings, doors, lamps, glow planes and the normal version's remaining models are
    // redrawn as dot tiles / quantized pictures in the ward palette (game-kit js/dot-world.js, as 札の家); later things are caught every 2 s
    const PAL = D.palette = palette((manifest.dot && manifest.dot.palette) || 'ward');
    const dotify = () => { const s = dotifyScene(THREE, scene, { pal: PAL }); for (const w of warm) dotifyScene(THREE, w, { pal: PAL }); return s; };
    D.dotify = dotify(); D.dotifyLog = [];
    setInterval(() => { const t1 = performance.now(); const s = dotify(); const ms = performance.now() - t1; if (ms > 16 && D.dotifyLog.length < 40) D.dotifyLog.push({ ms: Math.round(ms), room: ctx.state && ctx.state.room, s }); }, 2000);
    D.timings.dress = Math.round(performance.now() - t);
  });

  // ---- the next goal's glow, the chase's lit way back ----
  let beacon = null, goalLight = null, chaseLights = [];
  let flMax = 0;
  function installBeacon(ctx, G) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 16;
    const g = cv.getContext('2d');
    // a pixel diamond with a hard edge (the dot taste): pale amber
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.abs(x - 7.5) + Math.abs(y - 7.5); if (d < 7) { g.fillStyle = d < 3 ? '#fff4c8' : d < 5 ? '#f2c66a' : '#a8742a'; g.fillRect(x, y, 1, 1); } }
    const tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
    beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, fog: false }));
    beacon.scale.setScalar(0.22); beacon.name = 'dot-goal-beacon'; beacon.visible = false; ctx.scene.add(beacon);
    goalLight = new THREE.PointLight(0xffd890, 0, 3.2, 1.5); goalLight.name = 'dot-goal-light'; ctx.scene.add(goalLight);
    // the optional errand's mark (1.4.2: the journal on the mortuary desk is a 寄り道): a small pixel tag 「寄り道」 over it, pale blue
    {
      const c2 = document.createElement('canvas'); c2.width = 96; c2.height = 36; const q = c2.getContext('2d');
      q.fillStyle = '#16303a'; q.fillRect(2, 2, 92, 28); q.fillStyle = '#79a0c0'; q.fillRect(0, 4, 2, 24); q.fillRect(94, 4, 2, 24); q.fillRect(4, 0, 88, 2); q.fillRect(4, 30, 88, 2);
      q.fillRect(44, 32, 8, 2); q.fillRect(46, 34, 4, 2);
      q.fillStyle = '#e3ece6'; q.font = '24px "DotGothic16", monospace'; q.textBaseline = 'middle'; q.textAlign = 'center'; q.fillText('寄り道', 48, 17);
      const t2 = new THREE.CanvasTexture(c2); t2.magFilter = THREE.NearestFilter; t2.minFilter = THREE.NearestFilter; t2.colorSpace = THREE.SRGBColorSpace;
      markSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: t2, transparent: true, depthTest: true, fog: false }));
      markSprite.material.userData.dot = 'ui'; markSprite.scale.set(0.36, 0.135, 1); markSprite.name = 'dot-errand-mark'; markSprite.visible = false; ctx.scene.add(markSprite);
    }
    // the chase: the watertight door and each valve get a light of their own while she hunts
    const mouth = new THREE.PointLight(0x9cf0b0, 0, 7, 1.4); mouth.position.set(2.6, ctx.world.floorY(0) + 2.2, -2.0); mouth.name = 'dot-chase-goal'; ctx.scene.add(mouth);
    chaseLights.push({ l: mouth, base: 2.6 });
    for (const P of (G.posts && G.posts.values()) || []) {
      const l = new THREE.PointLight(0xffc070, 0, 4, 1.6); l.position.set(P.def.x, ctx.world.floorY(0) + 1.6, P.def.z); l.name = `dot-valve:${P.def.id}`; ctx.scene.add(l);
      chaseLights.push({ l, base: 1.4, post: P });
    }
  }
  function goalPos(ctx) {
    const t = ctx.nextTask && ctx.nextTask();
    if (!t) return null;
    const W = ctx.world;
    const find = (name) => W.interactables.find((o) => o.name === name && o.visible !== false) || null;
    let m = t.station ? find(`station:${t.station}`) : null;
    if (!m) for (const s of t.steps || []) if (s.emphasis) { m = find(s.emphasis) || W.group.getObjectByName(s.emphasis); if (m) break; }
    if (!m && (t.station === 'S_HINA1' || t.station === 'S_HINA2')) m = W.group.getObjectByName('hina:hit');
    if (!m) return null;
    const p = new THREE.Vector3(); m.getWorldPosition(p);
    return p;
  }

  // ---- the motions and the lights, every frame ----
  const lastHina = { x: 0, z: 0, ok: false };
  let lastPose = null, poseT = 0, markSprite = null;
  let T = 0, goalT = 0, goal = null;
  ext.registerSystem('dot-figures', {
    update(dt, ctx) {
      if (D.gen && D.gen.m2) { const on = !!(window.__mn || {}).genOn; D.gen.m.visible = !on; D.gen.m2.visible = on; }
      for (const w of (D.swaps || [])) if (!w.done && ctx.state && ctx.state.tasks.includes(w.p.after.task)) { w.m.geometry = w.g2; if (w.m2) w.m.material = w.m2; w.done = true; }
      for (const d of (D.drips || [])) {
        d.t += dt; const H = d.top.y - d.floorY;
        for (let i = 0; i < d.N; i++) { const f = ((d.t * 0.8 + i / d.N) % 1); d.pos[i * 3] = d.top.x; d.pos[i * 3 + 1] = d.top.y - H * f * f; d.pos[i * 3 + 2] = d.top.z; }
        d.g.attributes.position.needsUpdate = true;
        const k = Math.floor(d.t * 0.8 * d.N); if (k !== d.landed) { d.landed = k; d.splash = 0; }
        d.splash += dt; const rr = 0.03 + d.splash * 0.35;
        for (let i = 0; i < d.R; i++) { const a = (i / d.R) * Math.PI * 2; d.rp[i * 3] = d.top.x + Math.cos(a) * rr; d.rp[i * 3 + 1] = d.floorY + 0.01; d.rp[i * 3 + 2] = d.top.z + Math.sin(a) * rr; }
        d.rg.attributes.position.needsUpdate = true; d.ringMat.opacity = Math.max(0, 0.7 - d.splash * 1.6);
      }
      if (markSprite) {
        const mk = (D.marks || []).find((x) => !(ctx.state && ctx.state.tasks.includes(x.task)));
        const cam = ctx.camera.position;
        if (mk) { const p = new THREE.Box3().setFromObject(mk.m).getCenter(new THREE.Vector3()); const dd = cam.distanceTo(p); markSprite.visible = dd < 7 && dd > 0.9 && !!(ctx.state && ctx.state.started); markSprite.position.set(p.x, p.y + 0.32 + Math.sin(T * 2) * 0.02, p.z); }
        else markSprite.visible = false;
      }
      if (!figures) return;
      T += dt;
      const G = window.__mn || {};
      // ひなた
      const hf = figures.hina;
      if (hf && G.hina && G.hina.root.visible) {
        const r = G.hina.root.position;
        const moved = lastHina.ok ? Math.min(0.5, Math.hypot(r.x - lastHina.x, r.z - lastHina.z)) : 0;
        lastHina.x = r.x; lastHina.z = r.z; lastHina.ok = true;
        const pose = D.hinaPose, moving = moved / Math.max(dt, 1e-3) > 0.15;
        // 1.4.2 「ひなたがずっと手をあげてます」: a lean is a short gesture (a hand to the wall for a moment), then she stands
        if (pose !== lastPose) { lastPose = pose; poseT = 0; } poseT += dt;
        const st = pose === 'lean' && poseT < 1.0 && !moving ? 'reach' : pose === 'scared' ? 'fear' : pose === 'crouch' ? (moving ? 'crouch-walk' : 'crouch') : moving ? 'walk' : 'idle';
        hf.anim.play(st);
        hf.update(dt, { moved: moved / hf.scale });
      } else lastHina.ok = false;
      // あれ
      const af = figures.are, H = G.gh;
      if (af && H && G.chimera && G.chimera.root.visible) {
        const cam = ctx.camera.position, ps = G.project ? G.project(cam.x, cam.z).s : 0, gap = Math.abs(ps - (H.s || 0));
        const st = H.anim ? H.anim : H.pressing || (gap < 3 && H.mode === 'chase') ? 'attack' : H.sunk > 0 ? 'fear' : (H.mode !== 'off' && H.wait <= 0 && H.rise <= 0) ? 'walk' : 'idle';
        af.anim.play(st);
        af.update(dt, { moved: st === 'walk' ? (H.mode === 'chase' ? 2.4 : 1.3) * dt / af.scale : 0 });
      }
      // the light round the player
      if (D.lights) {
        const c = ctx.camera.position; D.lights.near.position.set(c.x, c.y - 0.2, c.z);
        // the near glow follows the flashlight: a flicker or a blackout of the story still goes dark (only the dim ambient stays)
        const fl = ctx.flashlight; if (fl) flMax = Math.max(flMax, fl.intensity || 0);
        const r = fl && flMax > 0 && ctx.lightOn !== false ? Math.min(1, (fl.intensity || 0) / flMax) : 0;
        D.lights.near.intensity = 0.15 + 0.45 * r;
      }
      // the next goal (looked up twice a second): a pixel diamond above it and a warm light on it, never while she hunts
      goalT -= dt;
      if (goalT <= 0) { goalT = 0.5; goal = ctx.state.started && !(H && H.mode === 'chase') ? goalPos(ctx) : null; }
      if (beacon) {
        const gd = goal ? ctx.camera.position.distanceTo(goal) : 99, on = gd < 14;
        beacon.visible = on && gd > 1.8;   // close up the [E] label says it; the diamond would sit in front of the thing
        goalLight.intensity = on ? 1.2 + Math.sin(T * 3) * 0.4 : 0;   // 1.4.2: this line had slipped into the comment above (the goal never glowed)
        if (on) { beacon.position.set(goal.x, goal.y + 0.55 + Math.sin(T * 2.5) * 0.05, goal.z); goalLight.position.set(goal.x, goal.y + 0.4, goal.z); }
      }
      const chase = H && H.mode === 'chase';
      for (const c of chaseLights) c.l.intensity = chase ? c.base * (c.post ? (c.post.on ? 0.35 : 1) : 1) * (0.8 + Math.sin(T * 4 + c.base) * 0.2) : 0;
    },
  });

  // the other version, from the title
  ext.registerTitleButton('dot-original', { label: '元の版（写真の3D）へ', order: 210, run() { location.href = '/'; } });
}
