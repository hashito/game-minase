// Behind the title, before the start button opens: every shader program of the hospital and the passage is linked one object at a time,
// with a progress bar under the title. Software GL links a program at its first draw (KHR_parallel_shader_compile missing), so the kit's
// single warm-up render took ~4.5 s in one block; here the same work is split into small steps the bar can follow, and nothing is left
// for the first frames of play. Lights are never touched (their count must be the one of play).
import { prewarm, auditScene } from '../kit/frame-guard.js';

export function installBoot(ext, G) {
  ext.registerBoot('minase-shaders', async (ctx, report) => {
    const R = ctx.renderer, S = ctx.scene, C = ctx.camera;
    if (!R || !S || !C || !R.render) return;
    const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
    // the bar under the title (removed when done)
    const status = document.getElementById('boot-status');
    let bar = null;
    if (status && status.parentNode) {
      bar = document.createElement('div'); bar.className = 'mn-bootbar'; bar.innerHTML = '<i></i>';
      status.parentNode.insertBefore(bar, status.nextSibling);
    }
    const set = (k) => { if (bar) bar.firstChild.style.width = `${Math.round(k * 100)}%`; report(k, `病院の中を準備中… ${Math.round(k * 100)}%`); };
    // three's compile(object, camera, scene) builds the program of one object with the lights and fog of the house (the very program the
    // kit's warm-up and play would build); asking for its uniforms finishes the link now, so each step is one program at most
    const objs = [];
    const take = (root) => root.traverse((o) => { if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && o.material) objs.push(o); });
    take(S);
    for (const x of ctx.warmObjects || []) if (x && !x.parent) take(x);
    // play draws the house into the screen effect's target (linear, no tone mapping), then the effect's quad onto the screen: each is
    // compiled against the target it is drawn into, or the programs would be the screen variants play never uses
    const fx = ctx.fx && ctx.fx.rt ? ctx.fx : null;
    const jobs = objs.map((o) => [o, C, S, fx ? fx.rt : null]);
    if (fx && fx.qScene) fx.qScene.traverse((o) => { if (o.isMesh && o.material) jobs.push([o, fx.qCam, fx.qScene, null]); });
    const p0 = R.info.programs ? R.info.programs.length : 0;
    const rt0 = R.getRenderTarget();
    let last = performance.now();
    for (let i = 0; i < jobs.length; i++) {
      const [o, cam, sc, rt] = jobs[i];
      try {
        R.setRenderTarget(rt);
        for (const m of R.compile(o, cam, sc)) { const pr = R.properties.get(m).currentProgram; if (pr && pr.getUniforms) pr.getUniforms(); }
      } catch (e) { /* the kit's warm-up still covers it */ }
      R.setRenderTarget(rt0);
      if (performance.now() - last > 30) { set((i + 1) / jobs.length); await frame(); last = performance.now(); }
    }
    // the kit's warm-up, aimed at the same target (game.json noPrewarm: its own pass compiles the screen variants, ~3 s of programs play
    // never draws): textures up, then one frame with the hidden parts shown and culling off, so meshes and the shadow pass are ready too
    const extra = (ctx.warmObjects || []).filter((x) => x && !x.parent);
    R.setRenderTarget(fx ? fx.rt : rt0);
    const warm = prewarm(R, S, C, { render: false, extra });   // compile runs now, under the target
    R.setRenderTarget(rt0);
    ctx.prewarmReport = await warm;
    set(0.97);
    for (const x of extra) S.add(x);
    const culled = [], shown = [], muted = [];
    S.traverse((x) => {
      if (x.frustumCulled) { culled.push(x); x.frustumCulled = false; }
      if (x.visible === false && !x.isLight && !x.isCamera) { shown.push(x); x.visible = true; }
    });
    for (const x of shown) x.traverse((l) => { if (l.isLight && l.visible) { muted.push(l); l.visible = false; } });
    if (R.shadowMap && R.shadowMap.enabled && R.shadowMap.autoUpdate === false) R.shadowMap.needsUpdate = true;
    try { if (fx) fx.render(S, C); else R.render(S, C); } catch (e) { console.warn('minase warm frame', e); }
    for (const x of culled) x.frustumCulled = true;
    for (const x of shown) x.visible = false;
    for (const l of muted) l.visible = true;
    for (const x of extra) S.remove(x);
    if (ctx.frameGuard && ctx.frameGuard.armPrograms) ctx.frameGuard.armPrograms();
    ctx.sceneAudit = auditScene(S, R);
    set(1); await frame();
    G.bootR = R;
    G.bootShaders = { objects: jobs.length, programs: (R.info.programs ? R.info.programs.length : 0) - p0 };
    if (bar) bar.remove();
  });
}
