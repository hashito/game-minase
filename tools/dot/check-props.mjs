// dot/data/props.json against the plan: every prop inside its room, clear of doorways and door swings (playtest item 8: no wall item where a
// door slides or swings), solid props off ひなた's corridor nodes and the stations' standing spots. Exit 1 on a finding.
//   node tools/dot/check-props.mjs
import fs from 'node:fs';
const plan = JSON.parse(fs.readFileSync('data/plan.json', 'utf8'));
const { props } = JSON.parse(fs.readFileSync('dot/data/props.json', 'utf8'));
const hina = fs.readFileSync('js/ext/hina.js', 'utf8');
const stacks = JSON.parse(fs.readFileSync('dot/assets/stacks/index.json', 'utf8'));
// half the part's footprint (its longer side) + a body's 0.35 m
const reach = (p) => { const s = stacks[p.k]; return s ? Math.max(s.w, s.d) * s.mpp * (p.s || 1) / 2 + 0.35 : 0.7; };
const nodes = [...hina.matchAll(/\b[a-z0-9]+: \[(-?[\d.]+), (-?[\d.]+)\]/g)].map((m) => [+m[1], +m[2]]);
const bad = [];
for (const p of props) {
  const r = plan.rooms.find((x) => x.id === p.room);
  const tag = `${p.room} ${p.k} (${p.x}, ${p.z})`;
  if (!r) { bad.push(`${tag}: no such room`); continue; }
  if (p.x < r.x - 0.01 || p.x > r.x + r.w + 0.01 || p.z < r.z - 0.01 || p.z > r.z + r.d + 0.01) bad.push(`${tag}: outside the room`);
  for (const d of plan.doors) {
    if (d.x == null || (d.a !== p.room && d.b !== p.room)) continue;
    const w = d.width || 1.2, dist = Math.hypot(p.x - d.x, p.z - d.z), need = w / 2 + (p.mount === 'wall' ? 0.7 : 0.6);
    if (dist < need) bad.push(`${tag}: ${dist.toFixed(2)} m from door ${d.id} (needs ${need.toFixed(2)})`);
  }
  if (p.solid) {
    for (const [x, z] of nodes) if (Math.hypot(p.x - x, p.z - z) < reach(p)) bad.push(`${tag}: on ひなた's node (${x}, ${z})`);
    for (const s of plan.stations || []) if (s.room === p.room && Math.hypot(p.x - s.x, p.z - s.z) < reach(p) + 0.1) bad.push(`${tag}: on station ${s.id}`);
  }
}
console.log(bad.length ? bad.join('\n') : `props ok: ${props.length}`);
process.exit(bad.length ? 1 : 0);
