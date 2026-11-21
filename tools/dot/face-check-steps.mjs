// 1.4.4 「ひなたの顔に白い横の帯」: no character face gets a bright band, at 0.8 m to 4 m, from the front and from the side.
// For each figure and view: two screenshots (the figure as it is / drawn black); the pixels that change are the figure; over its head and collar
// (the top 28 % of the figure) the mean brightness of each pixel row. A row near white, or far above the head's other rows, is a band.
//   node tools/probe.mjs --public --path dot-fps/ --query "qa=1&scene=genkan" --out <dir> --steps tools/dot/face-check-steps.mjs
//   FACE_DIST="0.8,2,4" FACE_ANG="0,60,-60" FACE_SHOTS=1 (keep the figure shots)
import fs from 'node:fs';
import path from 'node:path';

const MAX_ROW = 228;     // a row of the face this bright (0-255, mean over the figure's pixels) is a white band
const MAX_JUMP = 62;     // ... or this far above the median row of the head
const MAX_CLIP = 0.06;   // ... or this share of the head's pixels clipped (>= 250)

export default async ({ p, G, sleep, shot, log }) => {
  await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 120000);
  await p.waitFor('window.__dot && window.__dot.figures && window.__mn && window.__mn.hina', 60000);
  await sleep(2500);
  await G(`(document.querySelectorAll('.wm-layer .btn.primary').forEach((b) => b.click()), 1)`);
  await G(`(document.head.appendChild(Object.assign(document.createElement('style'), { textContent: 'body *:not(canvas){visibility:hidden !important}' })), 1)`);
  const dists = (process.env.FACE_DIST || '0.8,2,4').split(',').map(Number), angs = (process.env.FACE_ANG || '0,60,-60').split(',').map(Number);
  const keep = !!process.env.FACE_SHOTS, tmp = process.env.TEMP || process.env.TMP || '.';
  const bad = []; let n = 0;
  const png = async () => { const f = path.join(tmp, `face-${process.pid}-${n++}.png`); await p.shot(f); const b = fs.readFileSync(f).toString('base64'); fs.unlinkSync(f); return b; };
  // the figures to look at: ひなた always; あれ is shown in the world for the check (it is hidden unless it hunts)
  for (const who of ['hina']) {
    for (const d of dists) for (const a of angs) {
      const at = await G(`(() => { const f = window.__dot.figures.${who}, r = window.__mn.hina.root, th = r.rotation.y + ${a} * Math.PI / 180;
        return [r.position.x + Math.sin(th) * ${d}, r.position.z + Math.cos(th) * ${d}]; })()`);
      await G(`(g.teleport({ x: ${at[0]}, z: ${at[1]}, floor: ${process.env.FACE_FLOOR || 1} }), 1)`); await sleep(250);
      // look at the face; the head box (top 28 % of the figure) on screen
      await G(`(() => { const f = window.__dot.figures.${who}; f.root.visible = true; const r = window.__mn.hina.root, c = g.camera.position;
        let lo = Infinity, hi = -Infinity; f.root.updateMatrixWorld(true); f.root.traverse((o) => { if (o.isMesh && o.visible && o.geometry) { o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); lo = Math.min(lo, bb.min.y); hi = Math.max(hi, bb.max.y); } });
        window.__faceY = [lo, hi]; const fy = hi - (hi - lo) * 0.12;
        g.fp.yaw = Math.atan2(-(r.position.x - c.x), -(r.position.z - c.z)); g.fp.pitch = Math.atan2(fy - c.y, Math.hypot(r.position.x - c.x, r.position.z - c.z)); return 1; })()`);
      await sleep(900);
      const rect = await G(`(() => { const f = window.__dot.figures.${who}, [lo, hi] = window.__faceY, V = g.camera.position.clone();
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; const W = innerWidth, H = innerHeight;
        f.root.traverse((o) => { if (!(o.isMesh && o.visible && o.geometry)) return; const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
          const top = hi, bot = hi - (hi - lo) * 0.28;
          for (const x of [bb.min.x, bb.max.x]) for (const y of [bot, top]) for (const z of [bb.min.z, bb.max.z]) { const v = V.clone().set(x, y, z).project(g.camera); const sx = (v.x + 1) / 2 * W, sy = (1 - v.y) / 2 * H; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); } });
        return [x0, y0, x1, y1].map((v) => Math.round(v)); })()`);
      const on = await png();
      // the mask: the same view with the figure drawn black (it still casts its shadow, so the wall behind it does not count)
      await G(`(() => { const k = new Map(); window.__dot.figures.${who}.root.traverse((o) => { if (o.isMesh) { const m = o.material.clone(); m.vertexColors = false; m.color.setRGB(0, 0, 0); if (m.emissive) m.emissive.setRGB(0, 0, 0); m.onBeforeCompile = () => {}; m.customProgramCacheKey = () => 'face-check-black'; k.set(o, o.material); o.material = m; } }); window.__faceMats = k; return 1; })()`); await sleep(150);
      const off = await png();
      await G(`(() => { for (const [o, m] of window.__faceMats) { o.material.dispose(); o.material = m; } window.__faceMats = null; return 1; })()`);
      const r = await G(`(async () => { const ld = async (b) => { const i = new Image(); i.src = 'data:image/png;base64,' + b; await i.decode(); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, c.width, c.height); };
        const A = await ld(${JSON.stringify(on)}), B = await ld(${JSON.stringify(off)}); const [x0, y0, x1, y1] = ${JSON.stringify(rect)}, W = A.width, H = A.height;
        const rows = []; let px = 0, clip = 0;
        for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) { let s = 0, k = 0; for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) { const i = (y * W + x) * 4;
          const la = 0.299 * A.data[i] + 0.587 * A.data[i + 1] + 0.114 * A.data[i + 2], lb = 0.299 * B.data[i] + 0.587 * B.data[i + 1] + 0.114 * B.data[i + 2];
          if (la - lb > 10) { s += la; k++; px++; if (la >= 250) clip++; } }
          if (k >= 4) rows.push([y, s / k]); }
        const sorted = rows.map((r) => r[1]).sort((a, b) => a - b), med = sorted[sorted.length >> 1] || 0; let top = [0, 0];
        for (const r of rows) if (r[1] > top[1]) top = r;
        return { rows: rows.length, px, med: +med.toFixed(1), maxRow: +top[1].toFixed(1), at: top[0], clip: +(px ? clip / px : 0).toFixed(3) }; })()`);
      const tag = `${who} d${d} a${a}`;
      const why = [r.rows < 6 ? 'head not on screen' : null, r.maxRow > MAX_ROW ? `row ${r.at} mean ${r.maxRow} > ${MAX_ROW}` : null, r.maxRow - r.med > MAX_JUMP ? `row ${r.at} ${r.maxRow} vs median ${r.med} (+${(r.maxRow - r.med).toFixed(0)} > ${MAX_JUMP})` : null, r.clip > MAX_CLIP ? `clipped ${(r.clip * 100).toFixed(1)} %` : null].filter(Boolean);
      log(`face ${tag}`, JSON.stringify({ rect, ...r }), why.length ? 'BAND: ' + why.join('; ') : 'ok');
      if (why.length) bad.push(`${tag}: ${why.join('; ')}`);
      if (keep) await shot(`face-${who}-d${d}-a${a}`);
    }
  }
  log(bad.length ? `face-check FAIL: ${bad.length}\n  ${bad.join('\n  ')}` : `face-check ok: ${dists.length * angs.length} views, no bright band on a face`);
  if (bad.length) process.exitCode = 1;
};
