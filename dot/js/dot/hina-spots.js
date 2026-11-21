// ひなた's waiting spots in the dot version (pure: dot/js/dot/index.js and tools/dot/check-props.mjs).
// 2026-11-21 「ひなたがずっと手をあげてます」: she stands (idle), never holds the lean; a spot 0.36 m off a wall (the lean spots of
// js/ext/hina.js) moves out along the way she faces until she is at least CLEAR from every wall and piece of furniture.
export const CLEAR = 0.4;

/** the distance from a point to the nearest wall of its room and to the nearest furniture footprint (plan.json) */
export function clearance(plan, room, x, z) {
  const r = plan.rooms.find((q) => q.id === room);
  // to the wall FACE: the plan line is the middle of a wall 0.16 m thick (js/kit/world-from-plan.js DEFAULTS.wallT)
  let d = r ? Math.min(x - r.x, r.x + r.w - x, z - r.z, r.z + r.d - z) - 0.08 : 9;
  let what = 'wall';
  for (const f of plan.furniture || []) {
    if (f.room !== room) continue;
    const q = Math.abs(((f.rot || 0) % 180)) === 90, hw = (q ? f.d : f.w) / 2, hd = (q ? f.w : f.d) / 2;
    const dx = Math.max(0, Math.abs(x - f.x) - hw), dz = Math.max(0, Math.abs(z - f.z) - hd), e = Math.hypot(dx, dz);
    if (e < d) { d = e; what = f.id; }
  }
  return { d, what };
}

/** HINA (js/ext/hina.js) rewritten in place: pose 'lean' -> 'idle', each spot moved toward where she looks until CLEAR is met */
export function standSpots(HINA, plan, roomOf) {
  const moved = {};
  for (const [k, s] of Object.entries(HINA)) {
    const [x, z, , look] = s;
    const room = roomOf(x, z, s[2]);
    if (s[4] === 'lean') s[4] = 'idle';
    if (!room || s[5]) continue;   // a spot with its own height (on the desk in the pump room) stays
    const L = Math.hypot(look[0] - x, look[1] - z) || 1, ux = (look[0] - x) / L, uz = (look[1] - z) / L;
    let nx = x, nz = z, n = 0;
    while (clearance(plan, room, nx, nz).d < CLEAR && n++ < 20) { nx += ux * 0.03; nz += uz * 0.03; }
    if (n) { s[0] = +nx.toFixed(2); s[1] = +nz.toFixed(2); moved[k] = [x, z, s[0], s[1]]; }
  }
  return moved;
}

/** the room of a point on a floor (plan.json) */
export const roomAt = (plan) => (x, z, floor) => {
  const r = plan.rooms.find((q) => q.floor === floor && x >= q.x && x <= q.x + q.w && z >= q.z && z <= q.z + q.d);
  return r ? r.id : null;
};
