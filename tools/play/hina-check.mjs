// 1.3.0 (2nd play test #4 #6 #11): ひなた in walls, on desks, in the air. Every waiting spot is checked with her pose on (bones against walls,
// furniture and the floor: js/kit/npc-audit.js), and every corridor she walks (each edge of js/ext/hina.js, and the way from each spot to its
// nearest node) is swept with a body 22 cm round. Exit code 1 on a problem.
//   node tools/probe.mjs --out D:/minase-stages/hina --query "scene=kaidan" --steps tools/play/hina-check.mjs
export default async (api) => {
  const { p, G, sleep, log } = api;
  await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 60000);
  await sleep(2500);
  const r = await G(`(async () => {
    const out = [], Gr = mn.hinaGraph;
    for (const k of Object.keys(Gr.HINA)) { mn.placeHina(k); for (let i = 0; i < 40; i++) mn.hina.update(0.05); for (const x of g.npcAudit.now()) if (!(x.what === 'perch' && mn.hina.root.userData.perch)) out.push('spot ' + k + ': ' + x.what + ' ' + x.detail); }
    for (const [f, edges] of Object.entries(Gr.EDGES)) for (const e of edges) { const [a, b] = e.split('-'), A = Gr.NODES[f][a], B = Gr.NODES[f][b]; for (const x of g.npcAudit.path([A, B], +f)) out.push('edge ' + e + ': ' + x.detail); }
    for (const [k, s] of Object.entries(Gr.HINA)) { const n = Gr.nearest(s[2], s[0], s[1]), N = Gr.NODES[s[2]][n], d = Math.hypot(N[0] - s[0], N[1] - s[1]) || 1, from = s[5] ? [s[0] + ((N[0] - s[0]) / d) * 0.7, s[1] + ((N[1] - s[1]) / d) * 0.7] : [s[0], s[1]]; for (const x of g.npcAudit.path([from, N], s[2])) out.push('to ' + k + ' from ' + n + ': ' + x.detail); }
    mn.placeHina(null);
    return out; })()`);
  for (const x of r) log('PROBLEM', x);
  log(r.length ? `hina-check: ${r.length} problem(s)` : 'hina-check: every spot and corridor is clear');
  if (r.length) process.exitCode = 1;
};
