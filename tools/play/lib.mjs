// Playthrough helpers over tools/probe.mjs: real key presses (CDP Input events inside the page) to walk, the view turned by setting the
// yaw / pitch (as a mouse would), [E] to use what is in front, [Q] to flash. Positions are absolute metres (the plan's x / z).
export function helpers({ p, G, sleep, log, shot }) {
  const pos = () => G(`({ x: g.camera.position.x, y: g.camera.position.y, z: g.camera.position.z, room: g.state.room, floor: g.floor, yaw: g.fp.yaw })`);
  const face = (x, z, y = null) => G(`(() => { const c = g.camera.position, yw = Math.atan2(-(${x} - c.x), -(${z} - c.z)); g.fp.yaw = yw; ${y == null ? 'g.fp.pitch = 0;' : `g.fp.pitch = Math.atan2(${y} + (g.world.floorY ? g.world.floorY(g.floor) : 0) - c.y, Math.hypot(${x} - c.x, ${z} - c.z));`} return yw; })()`);
  async function idle(ms = 40000) {
    const t = Date.now(); let n = 0;
    while (Date.now() - t < ms) {
      if (await G('!!(g.state.ended)')) return true;
      if (!(await G('g.blocked()'))) return true;
      // a reader: the primary button first; after a few tries the window's own [x] (a paged document keeps offering 次へ)
      if (++n > 30 || !(await closeWindows())) { await G(`(document.querySelector('.wm-layer .wm-x') || { click() {} }).click(), 1`); await sleep(150); if (await G('g.wm.isOpen')) await p.key('Escape'); }
      await sleep(250);
    }
    log('  idle timed out', await G(`({ wm: g.wm.isOpen, ui: !!g.ui.open, mg: !!g.mgOpen })`));
    return false;
  }
  // press the primary button of the talk / card / window that is open (a player reading and going on)
  async function closeWindows() {
    return G(`(() => { const vis = (e) => e && e.offsetParent !== null; const b = [...document.querySelectorAll('.wm-layer .btn.primary:not(.gf-talk-choice), .gf-mo-card button, [role=dialog] .btn.primary:not(.gf-talk-choice)')].find(vis) || [...document.querySelectorAll('.wm-layer button:not(.gf-talk-choice), [role=dialog] button:not(.gf-talk-choice)')].find((e) => vis(e) && /わかった|閉じる|次へ|始める|OK|続ける|やり直す/.test(e.textContent)); if (b) { b.click(); return b.textContent; } return false; })()`);
  }
  async function walkTo(x, z, o = {}) {
    let last = null, stuck = 0;
    for (let i = 0; i < (o.max || 500); i++) {
      const c = await pos(); const d = Math.hypot(x - c.x, z - c.z);
      if (d < (o.near || 0.35)) return true;
      if (await G('g.state.ended')) return true;
      if (await G('g.blocked()')) { await closeWindows(); await sleep(250); continue; }
      if (o.onStep && (await o.onStep())) continue;
      await face(x, z);
      const run = o.run && d > 1.5;
      if (run) await p.key('ShiftLeft', 'down');
      const ms = Math.min(450, Math.max(50, (d / (run ? 4 : 2.2)) * 1000 * 0.8));
      await p.key('KeyW', 'down'); await sleep(ms); await p.key('KeyW', 'up');
      if (run) await p.key('ShiftLeft', 'up');
      if (last && Math.hypot(c.x - last.x, c.z - last.z) < 0.02) { if (++stuck > 8) { log('  stuck at', c, '->', x, z); return false; } } else stuck = 0;
      last = c;
    }
    return false;
  }
  const route = async (pts, o) => { for (const [x, z] of pts) if (!(await walkTo(x, z, o))) return false; return true; };
  const prompt = () => G(`document.getElementById('prompt').textContent`);
  async function use(x, z, y = 1.0, o = {}) {
    await face(x, z, y); await sleep(250);
    const pr = await prompt();
    await p.key('KeyE'); await sleep(o.wait ?? 600);
    if (o.noIdle) return pr;
    await idle(); return pr;
  }
  // a door: stand before it, [E] opens it, then walk through to the far point
  async function door(dx, dz, nx, nz, o = {}) {
    await face(dx, dz, 1.2); await sleep(200);
    if (/閉める/.test(await prompt())) { log('  door', dx, dz, '| already open'); return walkTo(nx, nz, o); }
    const pr = await use(dx, dz, 1.2);
    log('  door', dx, dz, '|', pr);
    await sleep(500);
    return walkTo(nx, nz, o);
  }
  const state = () => G(`({ room: g.state.room, tasks: g.state.tasks.slice(-4), n: g.state.tasks.length, level: g.prog.index, film: kg.film, flags: g.state.flags.slice(-3), prompt: document.getElementById('prompt').textContent, ended: g.state.ended })`);
  const flash = async (x, z, y) => { await face(x, z, y); await sleep(200); await p.key('KeyQ'); await sleep(500); };
  // the tunnel walker near and in sight: turn to her and flash [Q] (what a player is told to do)
  async function guardWalker() {
    const w = await G(`(() => { const m = g.monsters && g.monsters.list && g.monsters.list.find((x) => x.def.id === 'shino'); if (!m || !m.spawned) return null; const c = g.camera.position, p = m.ai.pos; return { x: p.x, z: p.z, d: Math.hypot(p.x - c.x, p.z - c.z), film: kg.film }; })()`);
    if (!w || w.d > 6 || w.film <= 0) return false;
    await face(w.x, w.z, 1.6); await sleep(120); await p.key('KeyQ'); await sleep(400);
    log('  flashed the walker at', w.d.toFixed(1), 'm, film', w.film - 1);
    return true;
  }
  return { guardWalker, pos, face, walkTo, route, use, door, idle, closeWindows, state, prompt, flash };
}
