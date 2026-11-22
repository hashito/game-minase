#!/usr/bin/env node
// P50 (1.31.1): dot people stay one figure on an iPhone (水無瀬病院 「ひなたが壊れてます」, 札の家 「ふだの家の老婆も壊れてます」).
// iOS Safari caps a canvas at 16,777,216 px; a res-2 frame atlas read through one canvas came back laid out at another width and each slice
// was read from the wrong place: about ten tilted copies of the body fanned up the wall. Headless Chrome has no such cap, so this tool
// gives it one: on the phone profile (390x844, DPR 3, iPhone UA, touch) any canvas over the cap returns its pixels from a backing store
// shrunk to the cap (what the phone did). Then, for every sprite-stack figure in the scene (objects named figure:* and their warm:* groups,
// js/sprite-stack-mesh.js createFigure), the bounding box of every frame is compared with the same page on the PC profile (no cap):
// a frame whose box differs by more than TOL_M, or whose footprint is wider than its height, fails.
//   node tools/figure-phone.mjs [gameDir] --public --path dot-fps/ --query "qa=1&scene=genkan"   (exit 1 on a failure; --json)
import { spawn } from 'node:child_process';
import path from 'node:path';
import { launch } from './cdp.mjs';

export const TOL_M = 0.03;
export const IOS_CANVAS_MAX = 16777216;
export const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
/** page code (run before the page's own scripts): a canvas over the iOS cap reads back from a backing store shrunk to the cap */
export const iosCanvasCap = (max = IOS_CANVAS_MAX) => `(() => { const g0 = CanvasRenderingContext2D.prototype.getImageData; window.__gfCanvasCapped = [];
  CanvasRenderingContext2D.prototype.getImageData = function (x, y, w, h) { const c = this.canvas; if (!c || c.width * c.height <= ${max}) return g0.call(this, x, y, w, h);
    const s = Math.sqrt(${max} / (c.width * c.height)), W = Math.max(1, Math.floor(c.width * s)), H = Math.max(1, Math.floor(c.height * s));
    const k = document.createElement('canvas'); k.width = W; k.height = H; const q = k.getContext('2d'); q.imageSmoothingEnabled = false; q.drawImage(c, 0, 0, W, H);
    const d = g0.call(q, 0, 0, W, H).data, o = new ImageData(w, h); o.data.set(d.subarray(0, Math.min(d.length, o.data.length))); window.__gfCanvasCapped.push([c.width, c.height]); return o; }; })()`;
/** page code: every figure's frames -> { name: [[minx, miny, minz, maxx, maxy, maxz] per frame geometry, sorted] } */
export const figureBoxesSource = () => `(() => { const g = window.__game, out = {}; if (!g || !g.scene) return out;
  const r2 = (v) => Math.round(v * 1000) / 1000;
  g.scene.traverse((o) => { if (!/^(figure|warm):/.test(o.name || '')) return; const boxes = [];
    o.traverse((m) => { if (!m.isMesh || !m.geometry || !m.geometry.attributes.position) return; m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox; const s = m.scale;
      boxes.push([b.min.x * s.x, b.min.y * s.y, b.min.z * s.z, b.max.x * s.x, b.max.y * s.y, b.max.z * s.z].map(r2)); });
    const k = o.name; let n = k, i = 2; while (out[n]) n = k + '#' + i++; out[n] = boxes.sort((a, b) => a[4] - b[4] || a[0] - b[0]); });
  return out; })()`;

/** compare the phone boxes with the PC boxes: a list of problems */
export function compareFigures(pc, phone, tol = TOL_M) {
  const bad = [];
  for (const [name, A] of Object.entries(pc)) {
    const B = phone[name];
    if (!B) { bad.push(`${name}: missing on the phone`); continue; }
    if (A.length !== B.length) { bad.push(`${name}: ${B.length} frames on the phone, ${A.length} on the PC`); continue; }
    A.forEach((a, i) => { const b = B[i], d = Math.max(...a.map((v, j) => Math.abs(v - b[j])));
      if (d > tol) bad.push(`${name} frame ${i}: box differs by ${(d * 100).toFixed(0)} cm on the phone (pc ${a.join(',')} / phone ${b.join(',')})`); });
  }
  for (const [name, B] of Object.entries(phone)) for (const b of B) {
    const h = b[4] - b[1], foot = Math.max(b[3] - b[0], b[5] - b[2]);
    if (h > 0.3 && foot > h * 1.05) { bad.push(`${name}: a frame ${foot.toFixed(2)} m wide for ${h.toFixed(2)} m high on the phone (slices spread out)`); break; }
  }
  return bad;
}

async function run(dir, o, phone) {
  const port = 9100 + Math.floor(Math.random() * 800);
  const server = spawn(process.execPath, [path.join(dir, 'tools/serve.js'), '--port', String(port), ...(o.public ? ['--public'] : [])], { cwd: dir, stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 60; i++) { if (await fetch(`http://127.0.0.1:${port}/`).then((r) => r.ok).catch(() => false)) break; await sleep(100); }
  const p = await launch(phone ? { width: 390, height: 844, mobile: true, dpr: 3 } : { width: 1280, height: 720 });
  try {
    if (phone) { await p.send('Emulation.setUserAgentOverride', { userAgent: IPHONE_UA }); await p.send('Page.addScriptToEvaluateOnNewDocument', { source: iosCanvasCap() }); }
    const q = [o.query, phone ? 'touch=1' : ''].filter(Boolean).join('&');
    await p.goto(`http://127.0.0.1:${port}/${o.path || ''}${q ? `?${q}` : ''}`);
    await p.waitFor("window.__game && document.getElementById('start-btn') && !document.getElementById('start-btn').disabled", 180000);
    await p.eval(`document.getElementById('start-btn').click()`);
    await p.waitFor('window.__game.state && window.__game.state.started', 60000);
    await sleep(o.wait || 2500);
    return { boxes: await p.eval(figureBoxesSource()), capped: await p.eval('window.__gfCanvasCapped || []'), errors: [...p.errors] };
  } finally { await p.close(); server.kill(); }
}

export async function figurePhone(dir, o = {}) {
  const pc = await run(dir, o, false), phone = await run(dir, o, true);
  const bad = compareFigures(pc.boxes, phone.boxes);
  if (!Object.keys(pc.boxes).length) bad.push('no sprite-stack figure (figure:* / warm:*) in the scene: nothing checked');
  return { ok: !bad.length, figures: Object.keys(pc.boxes).length, capped: phone.capped, bad, errors: phone.errors };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
  const dir = path.resolve(a[0] && !a[0].startsWith('--') ? a[0] : '.');
  const r = await figurePhone(dir, { public: a.includes('--public'), path: arg('--path', ''), query: arg('--query', '') });
  if (a.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else {
    console.log(`figure-phone (P50): ${r.figures} figure groups, canvases over the iOS cap: ${r.capped.map((c) => c.join('x')).join(' ') || 'none'}`);
    for (const b of r.bad) console.log('  FAIL ' + b);
    console.log(r.ok ? 'OK: every figure is the same on the phone as on the PC' : `${r.bad.length} problem(s)`);
  }
  process.exit(r.ok ? 0 : 1);
}
