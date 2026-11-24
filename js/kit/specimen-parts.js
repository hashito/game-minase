// Specimens in formalin jars as fine dot models (1.38.0, 水無瀬病院 2026-11-23 #8 「標本室のホルマリンが改善されていないです。腕や臓器など
// いろいろな物をホルマリンにつけてください」). Before: every jar held the same round lump, so a wall of jars read as jam jars. Now each jar
// holds one thing you know at a glance - a hand, an arm with its hand, a heart with its vessels, a brain with its folds, a pair of
// kidneys, eyes looking out, a foot seen from its side, cut fingers - made of the shapes of js/fp-voxel.js (boxes, capsules,
// ellipsoids; cut: true carves) and filled into a 5 mm voxel grid (the dot taste; a dot game grades it to its palette, js/dot-world.js
// keeps vertex colours). No unborn shapes (the brief of 水無瀬病院: nothing that reads as a foetus).
//
//   import { SPECIMEN_KINDS, specimenSpec, buildSpecimenJars } from './specimen-parts.js';
//   const g = buildSpecimenJars(THREE, [{ x, y, z, kind: 'hand', big: false, yaw }], { liquid, glass, lid, label });   // a Group
//   spots: y = the shelf top; kind (one of SPECIMEN_KINDS, or the index-th kind when left out); big: a large floor jar (arms, feet)
// The jar: a glass cylinder (o.glass, transparent), the liquid inside it a little lower (o.liquid), a dark lid, a paper label. One
// InstancedMesh per part and per kind (a hundred jars are a dozen draws). Coordinates of a spec: x right, u up, f towards the viewer.
import { buildVoxelGeometry } from './fp-voxel.js';

export const SPECIMEN_KINDS = ['hand', 'heart', 'brain', 'kidney', 'eyes', 'foot', 'fingers', 'arm'];
// 1.39.1 (水無瀬病院 1.6.1, まとめ役「白く飛んで中身が分からない」): fixed tissue is grey-pink to red-brown, much darker than the wall
// tile behind it, so a hand or an arm reads as a dark shape through the yellow liquid even in a torch
const SKIN = '#9a6c5a', SKIN2 = '#7e5444', CUT = '#561812', BONE = '#d2c4a6', NAIL = '#b39282';
const finger = (x0, u0, f0, x1, u1, f1, r = 0.0085) => [
  { cap: [[x0, u0, f0], [x1, u1, f1]], r, c: SKIN, n: 0.18 },
  { ell: [x1, u1, f1 + r * 0.55], r: [r * 0.75, r * 0.9, r * 0.35], c: NAIL, n: 0.1 },
];
function handShapes(s = 1, u = 0, curl = 0, spread = 1) {
  // a right hand standing up, the palm to the viewer: the palm, four fingers a little apart, the thumb out to the side, the wrist cut
  const k = (v) => v * s, out = [];
  out.push({ cap: [[0, u, 0], [0, u + k(0.05), 0]], r: k(0.022), c: SKIN2, n: 0.2 });
  out.push({ ell: [0, u + k(0.085), 0], r: [k(0.037), k(0.042), k(0.015)], c: SKIN, n: 0.2 });
  const fx = [-0.027, -0.009, 0.009, 0.026], len = [0.05, 0.062, 0.058, 0.044];
  fx.forEach((x, i) => { const sp = (i - 1.5) * 0.006 * spread; out.push(...finger(k(x), u + k(0.118), 0, k(x + sp), u + k(0.118 + len[i] * (1 - curl * 0.4)), k(len[i] * curl * 0.7), k(0.0085))); });
  out.push(...finger(k(0.033), u + k(0.07), k(0.006), k(0.062 + (spread - 1) * 0.012), u + k(0.112 - (spread - 1) * 0.012), k(0.018), k(0.0095)));
  out.push({ ell: [0, u + k(0.002), 0], r: [k(0.02), k(0.004), k(0.012)], c: CUT, n: 0.3 });   // the cut at the wrist
  return out;
}
const SPECS = {
  hand: () => handShapes(1, 0.01, 0.05, 2.6),   // the fingers spread wide: a hand at a glance
  arm: () => [
    // a forearm from the elbow (the cut bone at the bottom) up to the hand, the fingers half closed
    { cap: [[0, 0.02, 0], [0.004, 0.2, 0]], r: 0.03, r1: 0.024, c: SKIN2, n: 0.2 },
    { ell: [0, 0.02, 0], r: [0.03, 0.005, 0.03], c: CUT, n: 0.3 }, { ell: [0.006, 0.019, 0.004], r: [0.009, 0.006, 0.009], c: BONE },
    ...handShapes(1.05, 0.195, 0.45).filter((s) => !(s.ell && s.c === CUT)),
  ],
  heart: () => [
    { group: [
      { ell: [0, 0.08, 0], r: [0.046, 0.058, 0.04], c: '#7a3730', n: 0.3 },
      { ell: [0.012, 0.035, 0.004], r: [0.028, 0.03, 0.026], c: '#6e302a', n: 0.3 },   // the apex
      { ell: [-0.03, 0.105, 0.004], r: [0.024, 0.026, 0.028], c: '#81403a', n: 0.3 },  // the right atrium
      { cap: [[-0.045, 0.085, 0.032], [0.035, 0.055, 0.03]], r: 0.005, c: '#cdb27e', n: 0.2 },   // fat in the groove
      { cap: [[0.004, 0.11, 0], [0.004, 0.165, 0]], r: 0.014, c: '#b9857a', n: 0.2 },   // the aorta up and over
      { cap: [[0.004, 0.165, 0], [-0.03, 0.17, -0.004]], r: 0.013, c: '#b9857a', n: 0.2 },
      { cap: [[-0.03, 0.17, -0.004], [-0.034, 0.14, -0.01]], r: 0.012, c: '#b9857a', n: 0.2 },
      { cap: [[0.022, 0.115, 0.012], [0.03, 0.155, 0.02]], r: 0.011, c: '#9a5e55', n: 0.2 },   // the pulmonary trunk
      { cyl: [0.004, 0.176, 0], r: 0.009, len: 0.004, axis: 'u', cut: true },
    ], at: [0, 0.08, 0], rz: -0.35 },
  ],
  brain: () => {
    const B = '#9e7670', out = [
      { ell: [-0.023, 0.08, 0], r: [0.032, 0.045, 0.06], c: B, n: 0.4 }, { ell: [0.023, 0.08, 0], r: [0.032, 0.045, 0.06], c: B, n: 0.4 },
      { box: [-0.0025, 0.05, -0.07, 0.0025, 0.13, 0.07], cut: true },                     // the cleft between the halves
      { ell: [0, 0.042, -0.04], r: [0.036, 0.02, 0.022], c: '#a88e82', n: 0.4 },          // the cerebellum
      { cap: [[0, 0.04, -0.02], [0, 0.0, -0.03]], r: 0.011, c: '#b9a396', n: 0.3 },       // the stem
    ];
    // the folds: shallow grooves carved over both halves
    for (const s of [-1, 1]) for (let i = 0; i < 7; i++) { const f = -0.05 + i * 0.016, w = (i % 2 ? 0.01 : -0.006); out.push({ cap: [[s * 0.006, 0.124, f], [s * 0.056, 0.085 + w, f + 0.01]], r: 0.0035, cut: true }); }
    out.push({ cap: [[-0.056, 0.07, -0.02], [-0.03, 0.06, 0.05]], r: 0.004, cut: true }, { cap: [[0.056, 0.07, -0.02], [0.03, 0.06, 0.05]], r: 0.004, cut: true });
    return out;
  },
  kidney: () => {
    const one = (s) => [
      { ell: [s * 0.032, 0.085, 0], r: [0.024, 0.048, 0.018], c: '#7b3b33', n: 0.3 },
      { ell: [s * 0.05, 0.085, 0], r: [0.012, 0.016, 0.03], cut: true },                    // the dent where the vessels go in
      { cap: [[s * 0.04, 0.08, 0.004], [s * 0.014, 0.015, 0.006]], r: 0.004, c: '#d9c09a', n: 0.2 },   // the ureter
      { cap: [[s * 0.042, 0.092, 0], [s * 0.006, 0.1, 0]], r: 0.005, c: '#a45a50', n: 0.2 },
      { ell: [s * 0.03, 0.132, 0.002], r: [0.014, 0.008, 0.01], c: '#c9a55a', n: 0.3 },   // the adrenal on top
    ];
    return [...one(-1), ...one(1)];
  },
  eyes: () => {
    const eye = (x, u, f, iris, ry = 0, rx = 0) => ({ group: [
      { ell: [x, u, f], r: [0.021, 0.021, 0.021], c: '#ebe3d3', n: 0.15 },
      { ell: [x, u, f + 0.018], r: [0.0105, 0.0105, 0.005], c: iris, n: 0.2 },
      { ell: [x, u, f + 0.0215], r: [0.0045, 0.0045, 0.002], c: '#0c0c0c' },
      { cap: [[x, u, f - 0.016], [x + 0.004, u - 0.02, f - 0.04]], r: 0.005, c: '#d6bda2', n: 0.2 },   // the nerve behind it
      { cap: [[x - 0.012, u + 0.008, f + 0.012], [x - 0.004, u + 0.002, f + 0.019]], r: 0.0012, c: '#a5413a' },   // a vein
    ], at: [x, u, f], ry, rx });
    return [eye(-0.03, 0.05, 0.01, '#3e5f72', 0.2, 0.1), eye(0.028, 0.09, 0.0, '#5a3d22', -0.25, -0.1), eye(-0.006, 0.145, 0.012, '#4a5a3a', 0.05, 0.2)];
  },
  foot: () => {
    // 1.39.14 (水無瀬病院 第 5 回 #9 の再確認): a left foot seen from its inner side, the heel low, the toes up to the right, the leg cut
    // above the ankle. Stood on its heel with the sole to the viewer (before) it read as a pale slab in the jar and on its card.
    // (a, n): a from the heel to the toes, n up from the sole; the toes tipped up 25 degrees, so they stand clear of the label; f: the inner side
    // (the big toe) towards the viewer
    const T = 70 * Math.PI / 180, P = (a, n, f = 0) => [a * Math.cos(T) - n * Math.sin(T), a * Math.sin(T) + n * Math.cos(T), f];
    return [
      { ell: P(0.032, 0.03), r: [0.03, 0.03, 0.028], c: SKIN2, n: 0.2 },   // the heel
      { cap: [P(0.035, 0.032), P(0.165, 0.022)], r: 0.028, r1: 0.022, c: SKIN, n: 0.2 },   // the sole and the side of the foot
      { cap: [P(0.06, 0.058), P(0.15, 0.034)], r: 0.024, r1: 0.016, c: SKIN, n: 0.2 },   // the instep
      { cap: [P(0.05, 0.05), P(0.04, 0.12)], r: 0.03, r1: 0.033, c: SKIN2, n: 0.2 },   // the leg above the ankle
      { ell: P(0.04, 0.123), r: [0.032, 0.006, 0.032], c: CUT, n: 0.3 }, { ell: P(0.04, 0.126), r: [0.009, 0.005, 0.009], c: BONE },   // the cut, the bone
      { ell: P(0.058, 0.07, 0.024), r: [0.008, 0.008, 0.006], c: SKIN2, n: 0.2 },   // the ankle bone on the inner side
      // five toes, the big toe nearest, the little toe furthest back and shortest; the nails up
      ...[[0.022, 0.05, 0.0105], [0.01, 0.042, 0.0085], [-0.002, 0.036, 0.008], [-0.013, 0.03, 0.0075], [-0.022, 0.024, 0.007]].flatMap(([f, l, r]) => finger(...P(0.165, 0.026, f), ...P(0.165 + l, 0.03, f), r)),
    ];
  },
  fingers: () => [
    ...finger(-0.03, 0.03, 0, -0.012, 0.085, 0.01, 0.009), ...finger(0.02, 0.06, -0.01, 0.045, 0.1, 0.008, 0.009),
    ...finger(-0.025, 0.13, 0.005, 0.015, 0.15, 0.012, 0.0085), ...finger(0.01, 0.17, -0.004, 0.03, 0.215, 0.01, 0.008),
    ...[[-0.03, 0.03, 0], [0.02, 0.06, -0.01], [-0.025, 0.13, 0.005], [0.01, 0.17, -0.004]].map(([x, u, f]) => ({ ell: [x, u, f], r: [0.008, 0.008, 0.008], c: CUT, n: 0.3 })),
  ],
};
/** the jar's look (1.39.1): glass and formalin */
export const JAR_LOOK = { glass: { color: 0xb8c0a8, roughness: 0.1, metalness: 0, opacity: 0.07 }, liquid: { color: 0x3c2e08, opacity: 0.38 } };
/** the names written on the labels (kind -> 手書きの名前) */
export const SPECIMEN_NAMES = { hand: '右手', heart: '心臓', brain: '脳', kidney: '腎臓', eyes: '眼球', foot: '左足', fingers: '指', arm: '前腕' };
let atlas = null;
/** a 4 x 2 canvas of labels, one per kind: a yellowed slip, a number and the name in ink (null without a document) */
export function labelAtlas(THREE) {
  if (atlas) return atlas; if (typeof document === 'undefined') return null;
  const W = 160, H = 96, c = document.createElement('canvas'); c.width = W * 4; c.height = H * 2; const g = c.getContext('2d'); if (!g) return null;
  SPECIMEN_KINDS.forEach((kind, k) => {
    const x = (k % 4) * W, y = Math.floor(k / 4) * H;
    g.fillStyle = '#cbbf98'; g.fillRect(x + 2, y + 2, W - 4, H - 4); g.fillStyle = 'rgba(120,96,50,0.25)'; g.fillRect(x + 2, y + H - 24, W - 4, 22);   // the stain where the liquid wet it
    g.strokeStyle = '#6a5a3a'; g.lineWidth = 2; g.strokeRect(x + 7, y + 7, W - 14, H - 14);
    g.fillStyle = '#1e1a14'; g.font = 'italic 24px serif'; g.fillText(`No.${[12, 31, 7, 18, 24, 3, 40, 9][k]}`, x + 14, y + 33);
    g.font = 'bold 42px serif'; g.save(); g.translate(x + 14, y + 80); g.rotate(-0.04); g.fillText(SPECIMEN_NAMES[kind], 0, 0); g.restore();
  });
  atlas = new THREE.CanvasTexture(c); atlas.colorSpace = THREE.SRGBColorSpace; atlas.anisotropy = 4; return atlas;
}
/** the shape spec of one kind ({ vox, shapes }) */
export function specimenSpec(kind, o = {}) {
  const f = SPECS[kind]; if (!f) return null;
  return { vox: o.vox ?? 0.005, shapes: f() };
}

const geoCache = new Map();
/** the voxel geometry of a kind (cached), its bottom at y 0, centred on x / z */
export function specimenGeometry(THREE, kind, o = {}) {
  const key = `${kind}:${o.vox ?? 0.005}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const geo = buildVoxelGeometry(THREE, specimenSpec(kind, o));
  if (geo) { geo.computeBoundingBox(); const b = geo.boundingBox, c = b.getCenter(new THREE.Vector3()); geo.translate(-c.x, -b.min.y, -c.z); geo.computeBoundingBox(); geo.computeBoundingSphere(); }
  geoCache.set(key, geo); return geo;
}

/** the jars: spots [{ x, y, z, kind?, big?, yaw? }] -> a Group of instanced meshes (glass, liquid, lid, label, one per specimen kind) */
export function buildSpecimenJars(THREE, spots, o = {}) {
  const g = new THREE.Group(); g.name = 'specimen-jars';
  const small = { r: 0.1, h: 0.32 }, big = { r: 0.15, h: 0.44 };
  // 1.39.1: the formalin reads as liquid - amber-olive, murky (it darkens and tints what is in it), matte so a torch makes no white bloom; the
  // glass is nearly clear with a thin bright edge only (JAR_LOOK, a game may pass its own materials)
  const glass = o.glass || new THREE.MeshStandardMaterial({ ...JAR_LOOK.glass, transparent: true, depthWrite: false });
  const liquid = o.liquid || new THREE.MeshBasicMaterial({ ...JAR_LOOK.liquid, transparent: true, depthWrite: false });   // unlit: it tints and darkens what is behind it, never a lit grey veil in a torch
  const lid = o.lid || new THREE.MeshStandardMaterial({ color: 0x1d1f1e, roughness: 0.6, metalness: 0.4 });
  const label = o.label || new THREE.MeshStandardMaterial({ color: 0xd8d0b8, roughness: 0.9 });
  const flesh = o.flesh || new THREE.MeshStandardMaterial({ vertexColors: true, color: 0xd2c0bc, roughness: 0.85, metalness: 0 });   // 1.39.1: matte (no white glints in a torch), a shade darker
  flesh.name = flesh.name || 'specimen'; glass.name = glass.name || 'jar-glass';
  const list = spots.map((s, i) => ({ ...s, kind: s.kind || SPECIMEN_KINDS[i % SPECIMEN_KINDS.length], J: s.big ? big : small }));
  const geo = {
    glass: new THREE.CylinderGeometry(1, 1, 1, 14, 1, true), liquid: new THREE.CylinderGeometry(1, 1, 1, 14), lid: new THREE.CylinderGeometry(1, 1, 1, 14),
    label: new THREE.PlaneGeometry(1, 1),
  };
  const im = (gg, m, n, name) => { const x = new THREE.InstancedMesh(gg, m, n); x.name = name; x.frustumCulled = false; g.add(x); return x; };
  const I = { glass: im(geo.glass, glass, list.length, 'jar-glass'), liquid: im(geo.liquid, liquid, list.length, 'jar-liquid'), lid: im(geo.lid, lid, list.length, 'jar-lid') };
  // 1.39.1: a paper label on each jar with its name and number written by hand (one label draw per kind; a plain label without a canvas)
  const tex = o.labels === false ? null : labelAtlas(THREE);
  const kindsIn = [...new Set(list.map((s) => s.kind))], labelOf = new Map();
  if (tex) kindsIn.forEach((kind) => { const n = list.filter((s) => s.kind === kind).length, k = SPECIMEN_KINDS.indexOf(kind), gg = geo.label.clone(), uv = gg.attributes.uv;
    for (let j = 0; j < uv.count; j++) uv.setXY(j, ((k % 4) + uv.getX(j)) / 4, 1 - (Math.floor(k / 4) + 1 - uv.getY(j)) / 2);
    labelOf.set(kind, { mesh: im(gg, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), n, `jar-label:${kind}`), i: 0 }); });
  else I.label = im(geo.label, label, list.length, 'jar-label');
  I.glass.renderOrder = 3; I.liquid.renderOrder = 2;
  const O = new THREE.Object3D(), set = (mesh, i, x, y, z, sx, sy, sz, ry = 0) => { O.position.set(x, y, z); O.rotation.set(0, ry, 0); O.scale.set(sx, sy, sz); O.updateMatrix(); mesh.setMatrixAt(i, O.matrix); };
  list.forEach((s, i) => {
    const { r, h } = s.J, ry = s.yaw || 0;
    set(I.glass, i, s.x, s.y + h / 2, s.z, r, h, r); set(I.liquid, i, s.x, s.y + (h * 0.86) / 2 + 0.004, s.z, r - 0.006, h * 0.86, r - 0.006);   // the liquid stops short of the lid: its line shows
    set(I.lid, i, s.x, s.y + h + 0.02, s.z, r + 0.006, 0.04, r + 0.006);
    O.position.set(s.x + Math.sin(ry) * (r + 0.003), s.y + r * 0.3, s.z + Math.cos(ry) * (r + 0.003)); O.rotation.set(0, ry + (((i * 7) % 5) - 2) * 0.04, ((i * 3) % 5 - 2) * 0.03); O.scale.set(r * 1.3, r * 0.62, 1); O.updateMatrix();   // low on the jar: the specimen stays in view above it
    if (tex) { const L = labelOf.get(s.kind); L.mesh.setMatrixAt(L.i++, O.matrix); } else I.label.setMatrixAt(i, O.matrix);
  });
  // the specimens: one instanced mesh per kind, scaled to sit inside the jar (a big jar's arm fills it)
  for (const kind of new Set(list.map((s) => s.kind))) {
    const gg = specimenGeometry(THREE, kind, o); if (!gg) continue;
    const of = list.filter((s) => s.kind === kind), m = im(gg, flesh, of.length, `specimen:${kind}`);
    const b = gg.boundingBox, H = b.max.y - b.min.y, Wd = Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
    of.forEach((s, i) => {
      const { r, h } = s.J, k = Math.min((h - 0.05) / H, (2 * r - 0.03) / Wd), ry = s.yaw || 0;
      // press: a hand flat against the front glass (its depth at the glass), a little larger - the jar's horror shot
      const D = (b.max.z - b.min.z) * k, f = s.press ? r - 0.008 - D / 2 : 0, kk = s.press ? Math.min(k * 1.12, (h - 0.04) / H) : k;
      set(m, i, s.x + Math.sin(ry) * f, s.y + 0.012, s.z + Math.cos(ry) * f, kk, kk, kk, ry + Math.PI);
    });   // a spec's front (+f) is three's -z: turned to face out with the label
  }
  g.userData.jars = list.map((s) => ({ x: s.x, y: s.y, z: s.z, kind: s.kind, big: !!s.big }));
  return g;
}
