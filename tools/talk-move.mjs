#!/usr/bin/env node
// P51 (1.31.1): after a talk the player still walks, on a phone, with touch only (水無瀬病院 「ひなたと喋った後に携帯で動けなくなります」:
// a game's canStart wrapper recursed once a task was done, the frame threw, and three.js stopped asking for frames - the game froze).
// On the phone profile (390x844, DPR 3, iPhone UA, touch=1), for every person you can talk to - an interactable within 1.2 m of a person
// (objects named person:* / figure:* / npc:*) or whose label says 話す - the tool stands 1.1 m in front of it, taps the 操作 button (the
// touch use), taps through every window and talk (the primary button, else the first choice) with real touches, then drags the stick
// forward (else back) for a second: the player must move 15 cm or more, with no frame error (ctx.frameErrors, kit 1.31.1) and no new page error.
//   node tools/talk-move.mjs [gameDir] --public [--path dot-fps/] [--query "qa=1&scene=genkan"] [--only S_HINA1] [--shots dir]   (exit 1 on a failure)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { launch } from './cdp.mjs';
import { IPHONE_UA } from './figure-phone.mjs';

export const MIN_MOVE = 0.15;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** page code: the people you can talk to -> [{ i, id, kind, x, z, y, who }] */
export const talkTargetsSource = () => `(() => { const g = window.__game, out = [], people = [];
  const shown = (o, self = true) => { for (let a = self ? o : o.parent; a; a = a.parent) if (a.visible === false) return false; return true; };
  g.scene.traverse((o) => { if (/^(person|figure|npc):/.test(o.name || '') && shown(o)) people.push({ n: o.name, p: o.getWorldPosition(o.position.clone()) }); });
  g.world.interactables.forEach((o, i) => { const it = o.userData && o.userData.interact; if (!it || ['doc', 'item', 'door', 'stairs'].includes(it.kind) || !shown(o, false)) return; const p = o.getWorldPosition(o.position.clone());
    const near = people.find((q) => Math.hypot(q.p.x - p.x, q.p.z - p.z) < 1.2 && Math.abs(q.p.y - p.y) < 2);
    const says = /話す|話しかける/.test(String(it.label || '') + ' ' + String(it.title || '')) || ((g.data && g.data.tasks) || []).some((t) => t.station && t.station === it.id && /話す|話しかける/.test(t.title || ''));
    if (near || says) out.push({ i, id: it.id || o.name, kind: it.kind, x: p.x, y: p.y, z: p.z, who: near ? near.n : '' }); });
  return out; })()`;

export async function talkMove(dir, o = {}) {
  const port = 9100 + Math.floor(Math.random() * 800);
  const server = spawn(process.execPath, [path.join(dir, 'tools/serve.js'), '--port', String(port), ...(o.public ? ['--public'] : [])], { cwd: dir, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { if (await fetch(`http://127.0.0.1:${port}/`).then((r) => r.ok).catch(() => false)) break; await sleep(100); }
  const p = await launch({ width: 390, height: 844, mobile: true, dpr: 3 });
  const E = (x) => p.eval(x), results = [];
  let n = 0;
  const shot = async (name) => { if (o.shots) { fs.mkdirSync(o.shots, { recursive: true }); await p.shot(path.join(o.shots, `${String(++n).padStart(2, '0')}_${name}.png`)); } };
  const rect = (js) => E(`(() => { const e = ${js}; if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? [r.left + r.width / 2, r.top + r.height / 2, (e.textContent || '').trim().slice(0, 24)] : null; })()`);
  const VIS = `((e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.disabled)`;
  const tapRe = async (re) => { const r = await rect(`[...document.querySelectorAll('button, [role=button]')].find((e) => ${VIS}(e) && ${re}.test(e.textContent))`); if (r) await p.tap(r[0], r[1]); return r; };
  const pos = () => E(`(() => { const c = window.__game.camera.position; return [c.x, c.z]; })()`);
  async function drag(dy, ms = 1000) {
    const s = await rect(`document.getElementById('t-stick')`); if (!s) return -1;
    const a = await pos();
    await p.touch('start', s[0], s[1]); await sleep(40);
    for (let i = 1; i <= 6; i++) { await p.touch('move', s[0], s[1] + (dy * i) / 6); await sleep(25); }
    await sleep(ms); await p.touch('end'); await sleep(150);
    const b = await pos(); return Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  const NEXT = `(() => { const b = [...document.querySelectorAll('.wm-layer button, [role=dialog] button, #mg button, #mg-custom button, .gf-overlay button')].filter(${VIS});
    return b.find((e) => e.classList.contains('primary') && !/×/.test(e.textContent)) || b.find((e) => e.classList.contains('gf-talk-choice')) || b.find((e) => /次へ|わかった|閉じる|OK|続ける|進む/.test(e.textContent)) || b.find((e) => !e.classList.contains('wm-x')) || b[0] || null; })()`;
  async function talkThrough() {
    for (let k = 0; k < 80; k++) {
      await sleep(450);
      if (!(await E('window.__game.blocked()'))) { await sleep(600); if (!(await E('window.__game.blocked()'))) return k; }
      const r = await rect(NEXT);
      if (r) await p.tap(r[0], r[1]); else await E(`(document.querySelector('.wm-layer .wm-x') || { click() {} }).click(), 1`);
    }
    return -1;
  }
  try {
    await p.send('Emulation.setUserAgentOverride', { userAgent: IPHONE_UA });
    const q = [o.query, 'touch=1'].filter(Boolean).join('&');
    await p.goto(`http://127.0.0.1:${port}/${o.path || ''}?${q}`);
    await p.waitFor("window.__game && document.getElementById('start-btn') && !document.getElementById('start-btn').disabled", 180000);
    await E(`document.getElementById('start-btn').click()`);
    await p.waitFor('window.__game.state && window.__game.state.started', 60000);
    await sleep(2500);
    for (let i = 0; i < 6; i++) { if (!(await tapRe('/このまま遊ぶ|わかった|はじめる|閉じる/'))) break; await sleep(400); }
    await talkThrough();
    let targets = await E(talkTargetsSource());
    if (o.only) targets = targets.filter((t) => o.only.split(',').includes(String(t.id)));
    for (const t of targets) {
      const errs0 = p.errors.length, fe0 = await E('(window.__game.frameErrors || []).length');
      // stand 1.1 m away on a free side (the first of 8 directions the teleport keeps), facing it
      const stood = await E(`(() => { const g = window.__game, o = g.world.interactables[${t.i}]; let first = null;
        for (const d of [1.1, 0.8, 1.5]) for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4, x = ${t.x} + Math.sin(a) * d, z = ${t.z} + Math.cos(a) * d;
          g.teleport({ x, z, floor: g.floor }); const c = g.camera.position; if (Math.hypot(c.x - x, c.z - z) > 0.12 || (g.world.roomAt && !g.world.roomAt(c.x, c.z, c.y))) continue;
          g.fp.yaw = Math.atan2(-(${t.x} - c.x), -(${t.z} - c.z)); g.fp.pitch = Math.atan2(${t.y} - c.y, d); g.camera.updateMatrixWorld();
          const pk = g.pickNow && g.pickNow(); if (pk && pk.object === o) return true; if (!first) first = [x, z, g.fp.yaw, g.fp.pitch]; }
        if (first) { g.teleport({ x: first[0], z: first[1], floor: g.floor }); g.fp.yaw = first[2]; g.fp.pitch = first[3]; return 'no-pick'; } return false; })()`);
      await sleep(500);
      const prompt = await E(`document.getElementById('prompt').textContent`);
      let use = await tapRe('/^\\s*操作\\s*$/');
      if (!use) { await p.tap(195, 422); use = 'centre'; }
      await sleep(700); await shot(`${t.id}-talk`);
      const steps = await talkThrough();
      let moved = await drag(-60); if (moved < MIN_MOVE) moved = Math.max(moved, await drag(60));
      await shot(`${t.id}-after`);
      const fe = await E(`(window.__game.frameErrors || []).slice(${fe0})`), errs = p.errors.slice(errs0);
      const ok = stood === true && steps >= 0 && moved >= MIN_MOVE && !fe.length && !errs.length;
      results.push({ id: t.id, who: t.who, prompt, stood, steps, moved: +moved.toFixed(2), frameErrors: fe, errors: [...new Set(errs)].slice(0, 3), ok });
    }
  } finally { await p.close(); server.kill(); }
  return { ok: results.length > 0 && results.every((r) => r.ok), results };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
  const dir = path.resolve(a[0] && !a[0].startsWith('--') ? a[0] : '.');
  const r = await talkMove(dir, { public: a.includes('--public'), path: arg('--path', ''), query: arg('--query', ''), only: arg('--only', ''), shots: arg('--shots', '') });
  if (a.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else {
    for (const x of r.results) console.log(`${x.ok ? 'ok  ' : 'FAIL'} ${x.id} (${x.who || 'says 話す'}) prompt "${x.prompt}" taps ${x.steps} moved ${x.moved} m${x.stood === true ? '' : x.stood ? ' (not pickable from any free spot)' : ' (no free spot)'}${x.frameErrors.length ? ' frame errors: ' + x.frameErrors.join(' / ') : ''}${x.errors.length ? ' page errors: ' + x.errors.join(' / ').slice(0, 300) : ''}`);
    console.log(!r.results.length ? 'talk-move (P51): nobody to talk to was found' : r.ok ? `OK: the player walks after all ${r.results.length} talks (P51)` : 'talk-move (P51): FAILED');
  }
  process.exit(r.ok ? 0 : 1);
}
