// /dot-fps: what lies on the furniture (1.4.2, 「机の上からはみ出してる」「これも浮いてます」). For every dot desk, bed, bench, shelf and gurney:
//   - every visible thing on its top (pickups, documents, the stations' parts) rests on it: its footprint inside the furniture's, its bottom
//     within 1 cm of the surface under it (rays down from its corners and middle)
//   - no visible mesh of the normal version on the top (only dot parts: material vertex colours or userData.dot)
//   - (dot rollout #6) no wall-hung part overlaps a pickup or a document
// Ends with a line "desk-check: N finding(s)" (FAIL) or "desk-check: ok".
//   node tools/probe.mjs --public --path dot-fps/ --query "qa=1&scene=genkan" --out <dir> --steps tools/dot/desk-check-steps.mjs
export default async ({ p, G, sleep, log }) => {
  await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 120000);
  await sleep(4000);
  const r = await G(`(() => {
    const T = g.THREE || window.THREE, W = g.world, bad = [], seen = [];
    W.group.updateMatrixWorld(true);
    const isDot = (m) => { const ms = Array.isArray(m.material) ? m.material : [m.material]; return ms.every((x) => x && (x.vertexColors || (x.userData && x.userData.dot) || x.colorWrite === false || x.visible === false)); };
    const shown = (m) => { let q = m; while (q) { if (!q.visible) return false; q = q.parent; } return true; };
    const tops = W.group.children.filter((o) => String(o.name).startsWith('dot-stack:') && /desk|bed|bench|shelf|gurney|cabinet|filing|crate|drum/.test(o.name));
    const ray = new T.Raycaster(); ray.far = 0.6;
    for (const f of tops) {
      const F = new T.Box3().setFromObject(f);
      const on = [];
      W.group.traverse((m) => {
        if (!(m.isMesh || m.isSprite) || m === f || !shown(m)) return;
        if (String(m.name).startsWith('dot-stack:')) return;
        const ms = Array.isArray(m.material) ? m.material : [m.material]; if (ms.every((x) => x && (x.colorWrite === false || x.visible === false))) return;   // picking boxes
        const b = new T.Box3().setFromObject(m); if (b.isEmpty()) return;
        const c = b.getCenter(new T.Vector3());
        if (c.x < F.min.x - 0.05 || c.x > F.max.x + 0.05 || c.z < F.min.z - 0.05 || c.z > F.max.z + 0.05) return;
        if (b.min.y < F.max.y - 0.25 || b.min.y > F.max.y + 0.6) return;
        on.push({ m, b });
      });
      for (const { m, b } of on) {
        const nm = (m.name || '') + ' < ' + ((m.parent && m.parent.name) || '');
        if (!isDot(m)) { bad.push(f.name + ': a normal-version mesh on it: ' + nm + ' (' + (m.geometry && m.geometry.type) + ')'); continue; }
        if (b.min.x < F.min.x - 0.01 || b.max.x > F.max.x + 0.01 || b.min.z < F.min.z - 0.01 || b.max.z > F.max.z + 0.01) bad.push(f.name + ': ' + nm + ' sticks out of its footprint by ' + Math.max(F.min.x - b.min.x, b.max.x - F.max.x, F.min.z - b.min.z, b.max.z - F.max.z).toFixed(2) + ' m');
        let gap = 9;
        const c = b.getCenter(new T.Vector3());
        for (const [x, z] of [[c.x, c.z], [b.min.x + 0.01, b.min.z + 0.01], [b.max.x - 0.01, b.max.z - 0.01], [b.min.x + 0.01, b.max.z - 0.01], [b.max.x - 0.01, b.min.z + 0.01]]) {
          ray.set(new T.Vector3(x, b.min.y + 0.005, z), new T.Vector3(0, -1, 0));
          const h = ray.intersectObject(f, false)[0]; if (h) gap = Math.min(gap, b.min.y - h.point.y);
        }
        if (gap > 0.01) bad.push(f.name + ': ' + nm + ' floats ' + (gap === 9 ? 'over nothing' : (gap * 100).toFixed(1) + ' cm') + ' above it');
        seen.push(nm);
      }
    }
    // (dot rollout #6) a wall-hung part never overlaps a pickup or a document: their boxes (2 cm margin) must not meet
    const wallParts = []; W.group.traverse((m) => { if (m.isMesh && shown(m) && /^dot-(prop|part):/.test(m.name)) { const b = new T.Box3().setFromObject(m); const s = b.getSize(new T.Vector3()); if (Math.min(s.x, s.z) < 0.16 && b.min.y > 0.05 + (g.world.floorY ? 0 : 0)) wallParts.push({ m, b }); } });
    const picks = (W.interactables || []).filter((o) => /^(item|doc):/.test(o.name || '') && shown(o));
    for (const pk of picks) {
      const vis = pk.children.find((x) => String(x.name).startsWith('dot-')) || pk; const pb = new T.Box3().setFromObject(vis).expandByScalar(0.02);
      for (const w of wallParts) if (!pk.children.includes(w.m) && w.b.intersectsBox(pb)) bad.push('wall part ' + w.m.name + ' overlaps ' + pk.name);
    }
    return { tops: tops.length, things: seen.length, walls: wallParts.length, picks: picks.length, bad };
  })()`);
  for (const b of r.bad) log('FAIL', b);
  log('desk-check', r.bad.length ? `${r.bad.length} finding(s) on ${r.tops} pieces (${r.things} things on them)` : `ok: ${r.tops} pieces, ${r.things} things on them; ${r.walls} wall parts clear of ${r.picks} pickups`);
};
