#!/usr/bin/env node
// Headless probe: serve, open the game, start it, run a few expressions, take screenshots. (TEMP decides where the browser profile goes.)
//   node tools/probe.mjs --out D:/kagamiya-stages/s1 [--qa] [--mobile WxH] [--steps file.mjs] [--public --path dot/] (public/: the built site, a page under it)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch } from './cdp.mjs';
const args = process.argv.slice(2), arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const out = arg('--out', 'shots/probe'); fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 47000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, [path.join(import.meta.dirname, 'serve.js'), '--port', String(port), ...(args.includes('--public') ? ['--public'] : [])], { stdio: 'ignore' });
const base = `http://127.0.0.1:${port}/${arg('--path', '')}`;
for (let i = 0; i < 50; i++) { if (await fetch(base).then((r) => r.ok).catch(() => false)) break; await sleep(100); }
const [w, h] = (arg('--size', '1280x720')).split('x').map(Number);
const mobile = args.includes('--mobile');
const p = await launch({ width: w, height: h, mobile, dpr: 1 });
const t0 = Date.now(), log = (...a) => console.log(`${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s`, ...a);
let n = 0;
const api = {
  p, log, sleep, base,
  shot: async (name) => { const f = path.join(out, `${String(++n).padStart(2, '0')}_${name}.jpg`); await p.shot(f); log('shot', f); return f; },
  G: (expr) => Promise.race([new Promise((_, no) => setTimeout(() => no(new Error(`eval timed out: ${expr.slice(0, 80)}`)), 20000)), p.eval(`(async () => { const g = window.__game, kg = window.__kg, kc = window.__kc, mn = window.__mn; return JSON.stringify(await (${expr})); })()`).then((s) => (s === undefined ? undefined : JSON.parse(s)))]),
  errors: () => p.errors,
};
try {
  const q = arg('--query', args.includes('--qa') ? 'qa=1' : '');
  await p.goto(`${base}${q ? `?${q}` : ''}${mobile ? `${q ? '&' : '?'}touch=1` : ''}`);
  await p.waitFor("window.__game && document.getElementById('start-btn') && !document.getElementById('start-btn').disabled", 120000);
  log('ready');
  const steps = arg('--steps', null);
  if (steps) { const m = await import(pathToFileURL(path.resolve(steps)).href); await m.default(api); }
} catch (e) { log('ERROR', e.message); }
finally {
  if (p.errors.length) log('page errors:\n  ' + [...new Set(p.errors)].slice(0, 20).join('\n  '));
  await p.close(); server.kill();
}
