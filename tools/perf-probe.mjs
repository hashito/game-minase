#!/usr/bin/env node
// Frame-time probe for browser games (no dependencies; Node 22+ for the global WebSocket).
// Launches headless Edge / Chrome, injects a frame timer + WebGL call timers + long-task / LoAF
// observers, runs a scripted path, samples a CPU profile, and prints p50/p95/p99/max per phase plus
// every hitch with its likely cause (shader compile, texture upload, buffer upload, GC, layout, script).
//
//   node tools/perf-probe.mjs http://localhost:8000/?debug [--script path.mjs] [--throttle 4]
//        [--duration 12] [--width 1280 --height 720] [--out result.json] [--headed] [--browser exe]
//        [--assert "after=3,max=50,p95=20"]   (exit 1 when a frame after 3 s exceeds 50 ms or p95 > 20 ms)
//        [--swiftshader]  (software GL: only for machines without a GPU; frame times are then not real)
//
// --script exports `default async (p) => { ... }` with:
//   p.wait(ms)  p.mark(label)  p.eval(expr | fn, ...args)  p.waitFor(expr, timeoutMs)
//   p.click(selector)  p.key(code, holdMs)  p.keyDown(code)  p.keyUp(code)  p.mouse(dx, dy, steps)
//   p.throttle(rate)  p.log(...)
// Without --script the page just runs for --duration seconds. Every frame belongs to the last p.mark().
// The page can call window.__perf.mark('label') / window.__perf.note('chunk', ms) itself (frame-guard.js
// does when it sees the probe), so game-side work such as chunk builds shows up in the hitch list.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const has = (k) => argv.includes(k);
const url = argv.find((a) => /^https?:|^file:/.test(a));
if (!url) {
  console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 20).join("\n"));
  process.exit(2);
}
const THROTTLE = Number(opt("--throttle", 1));
const DURATION = Number(opt("--duration", 12));
const W = Number(opt("--width", 1280));
const H = Number(opt("--height", 720));
const OUT = opt("--out", null);
const SCRIPT = opt("--script", null);
const ASSERT = opt("--assert", null);

const BROWSERS = [
  process.env.BROWSER,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/microsoft-edge",
].filter(Boolean);
const exe = opt("--browser", BROWSERS.find((b) => fs.existsSync(b)));
if (!exe) {
  console.error("no Edge / Chrome found (pass --browser <exe> or BROWSER=...)");
  process.exit(2);
}

// ---- injected into the page before any of its scripts ------------------------------------------
const INJECT = `(() => {
  if (window.__perf) return;
  const now = () => performance.now();
  const P = (window.__perf = { frames: [], marks: [], notes: [], lt: [], loaf: [], phase: 'start', programs: 0, cur: null });
  const fresh = () => ({ shader: 0, texture: 0, buffer: 0, notes: 0, links: 0 });
  P.cur = fresh();
  P.mark = (label) => { P.phase = label; P.marks.push([now(), label]); };
  P.note = (kind, ms) => { P.notes.push([now(), kind, ms]); P.cur.notes += ms; };
  let last = 0;
  const tick = (t) => {
    const n = now();
    const heap = performance.memory ? performance.memory.usedJSHeapSize : 0;
    if (last) P.frames.push([n, n - last, P.phase, P.cur.shader, P.cur.texture, P.cur.buffer, P.cur.notes, heap, P.cur.links]);
    last = n;
    P.cur = fresh();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  const wrap = (proto, names, kind) => {
    for (const k of names) {
      const f = proto && proto[k];
      if (typeof f !== 'function') continue;
      // a real function name so the CPU profile shows e.g. "gl_linkProgram" instead of an anonymous wrapper
      proto[k] = new Function('f', 'P', 'now', 'return function gl_' + k + '() { const t = now(); try { return f.apply(this, arguments); } finally { P.cur.' + kind + ' += now() - t; } }')(f, P, now);
    }
  };
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!C) continue;
    const p = C.prototype;
    wrap(p, ['compileShader', 'linkProgram', 'getProgramParameter', 'getShaderParameter', 'getProgramInfoLog', 'getShaderInfoLog', 'useProgram'], 'shader');
    wrap(p, ['texImage2D', 'texSubImage2D', 'texImage3D', 'texSubImage3D', 'compressedTexImage2D', 'compressedTexSubImage2D', 'texStorage2D', 'generateMipmap', 'copyTexImage2D'], 'texture');
    wrap(p, ['bufferData', 'bufferSubData'], 'buffer');
    const cp = p.createProgram;
    p.createProgram = function () { P.programs++; P.cur.links++; return cp.apply(this, arguments); };
  }
  // three.js announces its renderers / scenes to the devtools extension hook: keep them for renderer.info
  P.renderers = [];
  if (!window.__THREE_DEVTOOLS__) {
    const hook = new EventTarget();
    hook.addEventListener('observe', (e) => { const o = e.detail; if (o && o.info && o.info.render && o.getContext) P.renderers.push(o); });
    window.__THREE_DEVTOOLS__ = hook;
  }
  P.info = () => P.renderers.map((r) => ({ programs: r.info.programs ? r.info.programs.length : 0, geometries: r.info.memory.geometries, textures: r.info.memory.textures, calls: r.info.render.calls, triangles: r.info.render.triangles, pixelRatio: r.getPixelRatio ? r.getPixelRatio() : 0,
    byType: (r.info.programs || []).reduce((m, x) => { const k = x.name || String(x.cacheKey || '?').split(',')[0]; m[k] = (m[k] || 0) + 1; return m; }, {}) }));
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) P.lt.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        P.loaf.push({ t: e.startTime, d: e.duration, block: e.blockingDuration, layout: e.forcedStyleAndLayoutDuration || 0, render: e.renderStart ? e.startTime + e.duration - e.renderStart : 0,
          scripts: (e.scripts || []).slice(0, 4).map((s) => ({ d: Math.round(s.duration), inv: s.invoker, src: (s.sourceURL || '').split('/').pop() + (s.sourceFunctionName ? ' ' + s.sourceFunctionName : ''), layout: Math.round(s.forcedStyleAndLayoutDuration || 0) })) });
    }).observe({ type: 'long-animation-frame', buffered: true });
  } catch (e) {}
})();`;

// ---- browser + CDP ------------------------------------------------------------------------------
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "perf-probe-"));
const flags = [
  `--user-data-dir=${profileDir}`,
  "--remote-debugging-port=0",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-extensions",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
  "--autoplay-policy=no-user-gesture-required",
  "--enable-precise-memory-info",
  "--ignore-gpu-blocklist",
  `--window-size=${W},${H}`,
];
if (!has("--headed")) flags.push("--headless=new");
if (has("--swiftshader")) flags.push("--use-angle=swiftshader", "--enable-unsafe-swiftshader");
else if (process.platform === "win32") flags.push("--use-angle=d3d11");
const proc = spawn(exe, [...flags, "about:blank"], { stdio: "ignore" });
const cleanup = () => {
  try {
    proc.kill();
  } catch {}
  setTimeout(() => {
    try {
      fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 5 });
    } catch {
      /* the browser still holds a file: leave the temp profile */
    }
  }, 800);
};
process.on("exit", cleanup);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function devtoolsPort() {
  const f = path.join(profileDir, "DevToolsActivePort");
  for (let i = 0; i < 150; i++) {
    if (fs.existsSync(f)) {
      const port = fs.readFileSync(f, "utf8").split("\n")[0].trim();
      if (port) return port;
    }
    await sleep(100);
  }
  throw new Error("browser did not start (DevToolsActivePort missing)");
}
const port = await devtoolsPort();
let pageWs = null;
for (let i = 0; i < 50 && !pageWs; i++) {
  const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json()).catch(() => []);
  pageWs = list.find((t) => t.type === "page")?.webSocketDebuggerUrl;
  if (!pageWs) await sleep(100);
}
const ws = new WebSocket(pageWs);
await new Promise((res, rej) => ((ws.onopen = res), (ws.onerror = rej)));
let seq = 0;
const waits = new Map();
const consoleErrors = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && waits.has(msg.id)) {
    const [res, rej] = waits.get(msg.id);
    waits.delete(msg.id);
    msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
  } else if (msg.method === "Runtime.exceptionThrown") consoleErrors.push(msg.params.exceptionDetails?.exception?.description?.split("\n")[0] || "exception");
  else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 200));
};
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = ++seq;
    waits.set(id, [res, rej]);
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expr, ...args) => {
  const expression = typeof expr === "function" ? `(${expr})(...${JSON.stringify(args)})` : expr;
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send("Page.addScriptToEvaluateOnNewDocument", { source: INJECT });
await send("Profiler.enable");
await send("Profiler.setSamplingInterval", { interval: 500 });
if (THROTTLE > 1) await send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
await send("Profiler.start");
const profT0 = Date.now();
await send("Page.navigate", { url });
// align the profile clock with performance.now(): both are taken right after the profiler started
await sleep(300);


// ---- the scripted path --------------------------------------------------------------------------
const t0 = Date.now();
const p = {
  wait: (ms) => sleep(ms),
  log: (...a) => console.error("[probe]", ...a),
  mark: (label) => evaluate(`window.__perf && window.__perf.mark(${JSON.stringify(label)})`),
  eval: evaluate,
  async waitFor(expr, timeout = 30000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await evaluate(`!!(${expr})`).catch(() => false)) return true;
      await sleep(100);
    }
    console.error(`[probe] timeout waiting for ${expr}`);
    return false;
  },
  async click(sel) {
    const r = await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()`);
    if (!r) return void console.error(`[probe] no element ${sel}`);
    for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: r[0], y: r[1], button: "left", clickCount: 1 });
  },
  keyDown: (code) => send("Input.dispatchKeyEvent", { type: "rawKeyDown", code, key: keyOf(code), windowsVirtualKeyCode: vk(code) }),
  keyUp: (code) => send("Input.dispatchKeyEvent", { type: "keyUp", code, key: keyOf(code), windowsVirtualKeyCode: vk(code) }),
  async key(code, hold = 60) {
    await p.keyDown(code);
    await sleep(hold);
    await p.keyUp(code);
  },
  async mouse(dx, dy, steps = 20) {
    for (let i = 0; i < steps; i++) {
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: W / 2 + (dx * (i + 1)) / steps, y: H / 2 + (dy * (i + 1)) / steps });
      await sleep(16);
    }
  },
  throttle: (rate) => send("Emulation.setCPUThrottlingRate", { rate }),
};
const keyOf = (code) => (code.startsWith("Key") ? code.slice(3).toLowerCase() : code.startsWith("Digit") ? code.slice(5) : { Space: " ", Escape: "Escape", Enter: "Enter", ShiftLeft: "Shift" }[code] || code);
const vk = (code) => (code.startsWith("Key") ? code.charCodeAt(3) : code.startsWith("Digit") ? code.charCodeAt(5) : { Space: 32, Escape: 27, Enter: 13, ShiftLeft: 16, ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, Tab: 9 }[code] || 0);

try {
  if (SCRIPT) {
    const mod = await import(pathToFileURL(path.resolve(SCRIPT)).href);
    await mod.default(p);
  } else await sleep(DURATION * 1000);
} catch (e) {
  console.error("[probe] script failed:", e.message);
}
const data = await evaluate(`(() => { const P = window.__perf; return P && { frames: P.frames, marks: P.marks, notes: P.notes, lt: P.lt, loaf: P.loaf, programs: P.programs, info: window.__perfInfo ? window.__perfInfo() : P.info() }; })()`);
const nowPage = await evaluate("performance.now()");
// after the run, so the probe's own context does not cost a frame
const gpu = await evaluate(`(() => { try { const g = (window.__perf && window.__perf.renderers[0] ? window.__perf.renderers[0].getContext() : document.createElement('canvas').getContext('webgl2')); const x = g.getExtension('WEBGL_debug_renderer_info'); return x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); } catch (e) { return 'no webgl2'; } })()`).catch(() => "?");
const { profile } = await send("Profiler.stop");
ws.close();
cleanup();
if (!data || !data.frames.length) {
  console.error("no frames recorded");
  process.exit(1);
}

// ---- analysis -----------------------------------------------------------------------------------
// profile time (µs, own clock) -> page performance.now() (ms): the profile ends at Profiler.stop, which
// we requested right after reading nowPage, so map the profile's end to nowPage.
const off = nowPage - profile.endTime / 1000;
const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
const label = (n) => {
  const f = n.callFrame;
  const file = (f.url || "").split("/").pop().split("?")[0];
  return f.functionName.startsWith("(") ? f.functionName : `${f.functionName || "(anon)"} ${file}:${f.lineNumber + 1}`;
};
const samples = [];
{
  let t = profile.startTime;
  for (let i = 0; i < profile.samples.length; i++) {
    t += profile.timeDeltas[i];
    samples.push([t / 1000 + off, profile.samples[i]]);
  }
}
const sampleMs = (profile.endTime - profile.startTime) / 1000 / Math.max(1, samples.length);
function topIn(a, b) {
  const self = new Map();
  let gc = 0;
  for (const [t, id] of samples) {
    if (t < a || t > b) continue;
    const n = nodes.get(id);
    const k = label(n);
    if (k === "(garbage collector)") gc += sampleMs;
    if (k === "(idle)") continue;
    self.set(k, (self.get(k) || 0) + sampleMs);
  }
  return { gc, top: [...self].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, ms]) => `${k} ${ms.toFixed(0)}ms`) };
}
const pct = (arr, q) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};
const summary = (fr) => {
  const d = fr.map((f) => f[1]);
  return { frames: d.length, p50: +pct(d, 0.5).toFixed(1), p95: +pct(d, 0.95).toFixed(1), p99: +pct(d, 0.99).toFixed(1), max: +Math.max(0, ...d).toFixed(1), over33: d.filter((x) => x > 33.4).length, over50: d.filter((x) => x > 50).length };
};
const phases = [];
for (const f of data.frames) if (!phases.includes(f[2])) phases.push(f[2]);
const byPhase = Object.fromEntries(phases.map((ph) => [ph, summary(data.frames.filter((f) => f[2] === ph))]));
const first = data.frames[0][0];
const hitches = [];
for (let i = 0; i < data.frames.length; i++) {
  const [t, dt, phase, shader, texture, buffer, notes, heap, links] = data.frames[i];
  if (dt <= 33.4) continue;
  const prevHeap = i ? data.frames[i - 1][7] : heap;
  const { gc, top } = topIn(t - dt, t);
  const loaf = data.loaf.find((l) => l.t < t && l.t + l.d > t - dt);
  const parts = { shader, texture, buffer, chunk: notes, gc, layout: loaf ? loaf.layout : 0 };
  const cause = Object.entries(parts).sort((a, b) => b[1] - a[1])[0];
  const script = top.filter((s) => !s.startsWith("(")).join(", ");
  hitches.push({
    at: +((t - first) / 1000).toFixed(2),
    dt: +dt.toFixed(0),
    phase,
    cause: cause[1] >= Math.max(8, dt * 0.25) ? cause[0] : script ? "script" : "other",
    ms: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, +v.toFixed(0)])),
    programsLinked: links || 0,
    heapDropMB: +((prevHeap - heap) / 1048576).toFixed(1),
    top,
    loaf: loaf ? loaf.scripts.map((s) => `${s.inv || ""} ${s.src} ${s.d}ms`.trim()) : [],
  });
}
const all = summary(data.frames);
const after = (s) => summary(data.frames.filter((f) => f[0] - first > s * 1000));
const result = { url, gpu, throttle: THROTTLE, size: [W, H], programs: data.programs, info: data.info, all, after3s: after(3), byPhase, hitches, longTasks: data.lt.length, notes: data.notes.length, errors: [...new Set(consoleErrors)].slice(0, 10) };
if (OUT) {
  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ ...result, raw: { frames: data.frames, marks: data.marks, notes: data.notes, loaf: data.loaf } }, null, 1));
}

// ---- print --------------------------------------------------------------------------------------
const row = (name, s) => `${name.padEnd(22)} ${String(s.frames).padStart(5)} ${String(s.p50).padStart(6)} ${String(s.p95).padStart(6)} ${String(s.p99).padStart(6)} ${String(s.max).padStart(7)} ${String(s.over33).padStart(5)} ${String(s.over50).padStart(5)}`;
console.log(`${url}\nGPU: ${gpu}   CPU throttle: ${THROTTLE}x   programs linked: ${data.programs}   long tasks: ${data.lt.length}`);
if (data.info) console.log(`renderer.info: ${JSON.stringify(data.info)}`);
console.log(`${"phase".padEnd(22)} frames    p50    p95    p99     max  >33  >50`);
for (const ph of phases) console.log(row(ph, byPhase[ph]));
console.log(row("ALL", all));
console.log(row("after 3 s", result.after3s));
if (hitches.length) {
  console.log(`\nhitches (>33 ms): ${hitches.length}${hitches.length > 25 ? " (worst 25)" : ""}`);
  for (const h of [...hitches].sort((a, b) => b.dt - a.dt).slice(0, 25).sort((a, b) => a.at - b.at))
    console.log(`  ${String(h.at).padStart(6)}s ${String(h.dt).padStart(4)}ms ${h.phase.padEnd(14)} ${h.cause.padEnd(7)} sh${h.ms.shader}${h.programsLinked ? "(" + h.programsLinked + "p)" : ""} tx${h.ms.texture} buf${h.ms.buffer} gc${h.ms.gc} lay${h.ms.layout}${h.ms.chunk ? " chunk" + h.ms.chunk : ""} | ${h.top.slice(0, 3).join("; ")}`);
}
if (result.errors.length) console.log(`\npage errors: ${result.errors.join(" | ")}`);
let fail = false;
if (ASSERT) {
  const a = Object.fromEntries(ASSERT.split(",").map((kv) => kv.split("=")).map(([k, v]) => [k.trim(), Number(v)]));
  const s = after(a.after ?? 3);
  if (a.max !== undefined && s.max > a.max) (fail = true), console.log(`FAIL: a frame of ${s.max} ms after ${a.after ?? 3} s (limit ${a.max})`);
  if (a.p95 !== undefined && s.p95 > a.p95) (fail = true), console.log(`FAIL: p95 ${s.p95} ms (limit ${a.p95})`);
  if (!fail) console.log("PASS");
}
setTimeout(() => process.exit(fail ? 1 : 0), 1000);
