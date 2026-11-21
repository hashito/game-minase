// What still shows from the normal version around each piece of furniture in /dot-fps: visible meshes within 1.2 m of a furniture box that
// are not dot stacks (name, geometry, size, height), and items that do not rest on a dot stack top (gap to the surface under them).
//   node tools/probe.mjs --public --path dot-fps/ --out <dir> --steps tools/dot/nondot-steps.mjs
export default async (api) => {
  const { G, sleep, log } = api;
  await sleep(2000);
  await G(`(document.getElementById('start-btn').click(), 1)`); await sleep(5000);
  const r = await G(`(() => {
    const T = g.THREE || window.THREE, W = g.world, out = [];
    const furn = (window.__dot && window.__dot.furniture) || [];
    const box = (o) => { const b = new T.Box3().setFromObject(o); return b; };
    const metas = [];
    W.group.updateMatrixWorld(true);
    W.group.traverse((m) => {
      if (!m.isMesh || !m.visible) return; let p = m, vis = true; while (p) { if (!p.visible) { vis = false; break; } p = p.parent; } if (!vis) return;
      if (String(m.name).startsWith('dot-')) return; if (/^(item|doc|station|look|thing|talk):/.test(m.name)) return;
      const b = box(m); if (b.isEmpty()) return; const s = b.getSize(new T.Vector3());
      if (s.x > 3 || s.z > 3) return;   // walls, floors, ceilings
      metas.push({ n: m.name || m.parent && m.parent.name || '?', g: m.geometry && m.geometry.type, mat: m.material && (m.material.name || m.material.type), map: !!(m.material && m.material.map), b: [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].map((v) => +v.toFixed(2)) });
    });
    for (const f of furn) { if (!f.box) { out.push({ f: f.id, skipped: f.why || 'empty' }); continue; } const [x0, y0, z0, x1, y1, z1] = f.box; const near = metas.filter((m) => m.b[3] > x0 - 0.3 && m.b[0] < x1 + 0.3 && m.b[5] > z0 - 0.3 && m.b[2] < z1 + 0.3 && m.b[4] > y0 - 0.1 && m.b[1] < y1 + 1.2); if (near.length) out.push({ f: f.id, k: f.k, near: near.slice(0, 8) }); }
    return { furn: furn.length, nonDotSmall: metas.length, out };
  })()`);
  log('nondot', JSON.stringify(r, null, 1));
};
