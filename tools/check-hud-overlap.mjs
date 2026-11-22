#!/usr/bin/env node
// check-hud-overlap (rule U27, docs/hud-slots.md): spawns the longest notification of EVERY kind at once (toast, quest-note, card, prompt, carry-hint,
// the interaction prompt, the thought line) while the clock / sensors / work chip / menu are shown, at six screen sizes, and asserts
//   - no bounding-box intersection among the HUD parts,
//   - none of them overlaps the action cluster or the touch stick (they are parts too),
//   - everything is inside the safe area (also with a notch: --gf-safe-* overridden),
//   - the lane never shows more than 3 items, and the parts the game must show are really visible (--require).
// Headless only (no window, no mouse). No dependencies (Node 22+, Edge / Chrome). Skips (exit 0) when there is no browser.
//
//   node tools/check-hud-overlap.mjs <dir|url> [--page examples/hud-slots.html] [--query "debug=1&calm=1&nointro&autostart"]
//        [--ready "JS expr"] [--require clock,menu,say] [--sizes 390x844,360x740,812x375,768x1024,1280x720,1920x1080]
//        [--out DIR] [--json] [--no-shots] [--verbose]
//   <dir> is served by a tiny static server; the page must expose window.__gfHud (js/game-core.js with ?debug=1, or a harness).
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "./cdp.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const flag = (k) => argv.includes(k);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const valueFlags = new Set(["--page", "--query", "--ready", "--require", "--sizes", "--out"]);
let targets = argv.filter((a, i) => !a.startsWith("--") && !valueFlags.has(argv[i - 1]));
// no target inside the kit: its own harness page (examples/hud-slots.html), the way tools/selftest.mjs runs it
const KIT_DEFAULT = !targets.length && fs.existsSync(path.join(HERE, "../examples/hud-slots.html"));
if (KIT_DEFAULT) targets = [path.resolve(HERE, "..")];
const EXES = [process.env.BROWSER, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].filter(Boolean);
if (!EXES.find((b) => fs.existsSync(b))) { console.log("check-hud-overlap: no Edge / Chrome - skipped"); process.exit(0); }
if (!targets.length) { console.error("usage: node tools/check-hud-overlap.mjs <dir|url> [--page p] [--query q] [--require ids]"); process.exit(2); }

const SIZES = (opt("--sizes", "390x844,360x740,812x375,768x1024,1280x720,1920x1080")).split(",").map((s) => { const [w, h] = s.split("x").map(Number); return { w, h }; });
const NOTCH = { "390x844": [47, 0, 34, 0], "812x375": [0, 47, 21, 47] };   // [top, right, bottom, left] px: the extra "with a notch" pass
const QUERY = opt("--query", KIT_DEFAULT ? "gftest=1" : "debug=1&calm=1&nointro&autostart");
const REQUIRE = (opt("--require", KIT_DEFAULT ? "clock,menu,guide" : "")).split(",").filter(Boolean);
const OUT = opt("--out", path.join(os.tmpdir(), "hud-overlap"));
const READY = opt("--ready", "");
const KINDS = ["toast", "quest-note", "card", "prompt", "carry-hint"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".glb": "model/gltf-binary", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".woff2": "font/woff2", ".txt": "text/plain" };
const servers = [];
async function serveDir(root) {
  root = path.resolve(root);
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream", "cache-control": "no-cache" });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  servers.push(srv);
  return `http://127.0.0.1:${srv.address().port}/`;
}

const intersects = (a, b, eps = 0.5) => a.left < b.right - eps && b.left < a.right - eps && a.top < b.bottom - eps && b.top < a.bottom - eps;

// runs in the page: the visible parts + the viewport + the lane
const COLLECT = `(() => {
  const h = window.__gfHud; if (!h) return null;
  const snap = h.snapshot();
  const cs = getComputedStyle(document.documentElement); const px = (v) => parseFloat(cs.getPropertyValue(v)) || 0;
  return { parts: snap.parts, lane: snap.lane, free: snap.free, vw: document.documentElement.clientWidth, vh: document.documentElement.clientHeight,
           safe: { t: px('--gf-safe-t'), r: px('--gf-safe-r'), b: px('--gf-safe-b'), l: px('--gf-safe-l') }, touch: document.body.classList.contains('touch'),
           oneMsg: document.body.classList.contains('gf-phone') && (document.body.classList.contains('gf-saying') || document.body.classList.contains('gf-hinting')) };
})()`;

function judge(c, require, label) {
  const bad = [];
  const P = c.parts.map((p) => ({ ...p, id: p.id }));
  // a part inside another part (a card inside its column) is not an overlap: the page marks wrappers by id; here: containment of rects of the same slot column
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    const a = P[i], b = P[j];
    if (!intersects(a, b)) continue;
    const inside = (x, y) => x.left >= y.left - 0.5 && x.right <= y.right + 0.5 && x.top >= y.top - 0.5 && x.bottom <= y.bottom + 0.5;
    if ((a.wrap && inside(b, a)) || (b.wrap && inside(a, b))) continue;
    bad.push(`overlap: ${a.id} x ${b.id}`);
  }
  for (const p of P) {
    if (p.left < c.safe.l - 0.5 || p.top < c.safe.t - 0.5 || p.right > c.vw - c.safe.r + 0.5 || p.bottom > c.vh - c.safe.b + 0.5) bad.push(`outside the safe area: ${p.id} [${p.left | 0},${p.top | 0},${p.right | 0},${p.bottom | 0}] in ${c.vw}x${c.vh} safe ${c.safe.t}/${c.safe.r}/${c.safe.b}/${c.safe.l}`);
  }
  const shown = c.lane.filter((i) => i.shown);
  if (shown.length > 3) bad.push(`the lane shows ${shown.length} items (max 3)`);
  // 1.30.1: a phone shows one message at a time (js/phone-play.js gf-saying / gf-hinting hide the [E] prompt): the prompt is not required then
  for (const r of require) if (!(c.oneMsg && r === 'prompt') && !P.some((p) => p.id === r || p.id.endsWith(`:${r}`))) bad.push(`required part not visible: ${r}`);
  return bad.map((b) => `${label}: ${b}`);
}

async function runTarget(target) {
  let base = target, pagePath = opt("--page", KIT_DEFAULT ? "examples/hud-slots.html" : "");
  if (!/^https?:/.test(target)) { base = await serveDir(target); pagePath = pagePath || "index.html"; }
  const rows = [], problems = [];
  fs.mkdirSync(OUT, { recursive: true });
  let page = null;   // one browser for all sizes (re-emulated per size): launching is the slow part
  for (const sz of SIZES) {
    const touchy = sz.w <= 1024;
    const passes = [{ name: "", safe: null }];
    if (NOTCH[`${sz.w}x${sz.h}`]) passes.push({ name: "+notch", safe: NOTCH[`${sz.w}x${sz.h}`] });
    for (const pass of passes) {
      if (!page) page = await launch({ width: sz.w, height: sz.h, mobile: touchy });
      else { await page.send("Emulation.setDeviceMetricsOverride", { width: sz.w, height: sz.h, deviceScaleFactor: 1, mobile: touchy }); await page.send("Emulation.setTouchEmulationEnabled", touchy ? { enabled: true, maxTouchPoints: 5 } : { enabled: false }); }
      const label = `${sz.w}x${sz.h}${pass.name}`;
      try {
        const url = `${base}${pagePath}${pagePath.includes("?") ? "&" : "?"}${QUERY}${touchy ? "&touch" : ""}`;
        await page.goto(url);
        await page.waitFor("window.__gfHud && document.getElementById('hud') && !document.getElementById('hud').classList.contains('hidden')", 90000);
        if (READY) await page.waitFor(READY, 60000);
        await page.waitFor("!document.body.classList.contains('gf-warming')", 30000).catch(() => {});
        await sleep(600);
        if (pass.safe) await page.eval(`(() => { const s = document.documentElement.style; s.setProperty('--gf-safe-t', '${pass.safe[0]}px'); s.setProperty('--gf-safe-r', '${pass.safe[1]}px'); s.setProperty('--gf-safe-b', '${pass.safe[2]}px'); s.setProperty('--gf-safe-l', '${pass.safe[3]}px'); window.__gfHud.layout(); dispatchEvent(new Event('resize')); })()`);   // 1.30.1: a resize too, so js/phone-play.js re-measures (the say band width, the button column)
        if (pass.safe) await sleep(400);
        // 1. everything at once
        await page.eval("window.__gfHud.stress()");
        await sleep(900);
        let all = await page.eval(COLLECT);
        for (let t = 0; t < 8 && !all.parts.length; t++) { await sleep(500); all = await page.eval(COLLECT); }   // the page may still be settling
        const bad = judge(all, REQUIRE, label);
        if (!flag("--no-shots")) await page.shot(path.join(OUT, `hud-overlap_${label.replace("+", "_")}.png`));
        // 2. each lane kind alone, at its longest, with the game's own parts shown
        const per = {};
        for (const k of KINDS) {
          await page.eval("window.__gfHud.unstress()");
          await page.eval(`(() => { const h = window.__gfHud, L = h.lane, T = '${"長い通知の文章を最後まで読めるように折り返す。".repeat(4)}ABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789'; h.stress(); L.clear();
            if ('${k}' === 'carry-hint') L.sticky('carry-hint', true, T); else L.push({ kind: '${k}', title: '見出し', html: T, ttl: 600000, sticky: ${k === "prompt"} }); })()`);
          await sleep(1000);   // 1.30.1: the stacks move with a short transition (a race showed menu x work-chip at 812x375)
          const one = await page.eval(COLLECT);
          const b = judge(one, [], `${label} [${k}]`);
          per[k] = { shown: one.lane.filter((i) => i.shown).length, problems: b.length };
          bad.push(...b);
        }
        rows.push({ size: label, parts: all.parts.length, laneShown: all.lane.filter((i) => i.shown).length, laneWaiting: all.lane.filter((i) => !i.shown).length, free: all.free, touch: all.touch, problems: bad.length, per });
        problems.push(...bad);
        if (page.errors.length && flag("--verbose")) console.log(`  page errors at ${label}:`, page.errors.slice(0, 3));
      } catch (e) {
        rows.push({ size: label, error: String(e.message || e) }); problems.push(`${label}: ${e.message || e}`);
      }
    }
  }
  if (page) await page.close();
  return { target, rows, problems };
}

const results = [];
for (const t of targets) results.push(await runTarget(t));
for (const s of servers) s.close();
if (flag("--json")) console.log(JSON.stringify(results, null, 1));
else for (const r of results) {
  console.log(`\n## ${r.target}  (query: ${QUERY})`);
  console.log("| screen | touch | parts | lane shown/waiting | lane free px | overlaps+safe |");
  console.log("|---|---|---|---|---|---|");
  for (const x of r.rows) console.log(x.error ? `| ${x.size} | | | | | ERROR ${x.error} |` : `| ${x.size} | ${x.touch ? "yes" : "no"} | ${x.parts} | ${x.laneShown}/${x.laneWaiting} | ${x.free} | ${x.problems ? "FAIL " + x.problems : "ok"} |`);
  for (const p of r.problems) console.log("  FAIL", p);
  console.log(r.problems.length ? `\n${r.problems.length} problem(s)` : "\nno overlaps");
}
process.exit(results.some((r) => r.problems.length) ? 1 : 0);
