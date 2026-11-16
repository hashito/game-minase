// The valves (止水弁): the one rule of the game (docs/brief.md) - あれは、水のある所しか進めない。止水弁を回して水を抜けば、そこで止まる。
//   - a valve is two red wheels at the sides of the passage with a drain grate across the floor between them; [E] turns it: the water
//     around it drains into the grate (a dry band appears) and she cannot cross the dry band;
//   - while she presses at the edge of the dry band, rain water seeps back in (the band narrows); when it is full again she comes on;
//   - [E] on a drained valve opens it again (the water comes back at once).
//   - the clogged grates of the water passage (side quest) can be cleared: the water comes back more slowly afterwards.
// The water returning is shown in the HUD (「水が戻るまで ■■■□」, top right) while a valve holds. Everything is built once at game:ready.
import * as THREE from 'three';

/** a drain grate seen from above: dark bars over black water (drawn on a canvas, no generated picture) */
function grateTexture() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#4b4f4c'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(30,32,30,${Math.random() * 0.25})`; g.fillRect(Math.random() * 128, Math.random() * 128, 3, 3); }
  g.fillStyle = '#0b0d0d'; for (let y = 34; y < 96; y += 10) g.fillRect(22, y, 84, 5);
  g.strokeStyle = '#2b2d2b'; g.lineWidth = 3; g.strokeRect(20, 30, 88, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function installWater(ext, G) {
  let ctx = null;
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  const posts = new Map();    // id -> { def, wheels, band, mat, hit, on, burn, press }
  const grates = new Map();   // id -> { def, mesh, hit, done }
  G.posts = posts; G.postsOn = G.postsOn || {}; G.grated = G.grated || [];

  // ---------------- HUD ----------------
  let chip = null;
  G.showValve = () => {
    if (!chip) return;
    let best = null;
    for (const P of posts.values()) if (P.on && (!best || P.burn > best.burn)) best = P;
    chip.hidden = !best;
    if (best) { const n = Math.max(0, Math.round((1 - best.burn) * 5)); chip.textContent = `止水弁：水が戻るまで ${'■'.repeat(n)}${'□'.repeat(5 - n)}`; chip.classList.toggle('mn-none', n <= 1); }
  };

  const red = new THREE.MeshStandardMaterial({ color: 0x8a1d16, roughness: 0.55, metalness: 0.3 });
  const pipe = new THREE.MeshStandardMaterial({ color: 0x3c3f3d, roughness: 0.7, metalness: 0.5 });
  let grateM = null;
  function buildPost(def) {
    const R = ctx.world.rooms.get(def.room), fy = (R && R.y) || 0, room = R.room;
    const grp = new THREE.Group(); grp.name = `valve:${def.id}`; ctx.world.group.add(grp);
    const add = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); grp.add(o); return o; };
    const across = def.along === 'z' ? room.w : room.d, half = across / 2 - 0.08;
    const wheels = [];
    for (const s of [-1, 1]) {
      const px = def.along === 'z' ? def.x + s * half : def.x, pz = def.along === 'z' ? def.z : def.z + s * half;
      // a pipe down the wall and the red wheel on it, facing into the passage
      const p = add(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 10), pipe, px, fy + 1.2, pz);
      void p;
      const w = new THREE.Group(); w.position.set(def.along === 'z' ? px - s * 0.12 : px, fy + 1.15, def.along === 'z' ? pz : pz - s * 0.12);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 6, 18), red); w.add(ring);
      for (let k = 0; k < 3; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.025, 0.025), red); sp.rotation.z = (k * Math.PI) / 3; w.add(sp); }
      w.rotation.y = def.along === 'z' ? Math.PI / 2 : 0;
      grp.add(w); wheels.push(w);
    }
    // the floor grate across the passage (always there) and the dry band over the water (shown while the valve holds)
    const g = add(new THREE.PlaneGeometry(def.along === 'z' ? across - 0.1 : 0.6, def.along === 'z' ? 0.6 : across - 0.1), grateM, def.x, fy + 0.012, def.z); g.rotation.x = -Math.PI / 2;
    const mat = new THREE.MeshStandardMaterial({ color: 0x4a4d4a, roughness: 0.95 });
    const band = add(new THREE.PlaneGeometry(def.along === 'z' ? across - 0.04 : 3.2, def.along === 'z' ? 3.2 : across - 0.04), mat, def.x, fy + 0.13, def.z); band.rotation.x = -Math.PI / 2; band.visible = false; band.renderOrder = 2;
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.7), hidden);
    hit.position.set(def.x, fy + 1.15, def.z); hit.name = `valvehit:${def.id}`; hit.userData.interact = { kind: 'valve', id: def.id };
    ctx.world.group.add(hit); ctx.world.interactables.push(hit);
    const P = { def, wheels, band, mat, hit, on: false, burn: 0, press: false, turn: 0, fy, along: def.along };
    posts.set(def.id, P);
    return P;
  }
  G.setPost = (id, on, burn = 0) => {
    const P = posts.get(id); if (!P) return;
    P.on = on; P.burn = burn; P.band.visible = on; P.band.scale.set(1, 1, 1);
    G.postsOn[id] = on; G.showValve();
  };
  function buildGrate(def) {
    const R = ctx.world.rooms.get(def.room), fy = (R && R.y) || 0;
    const m = new THREE.Group(); m.position.set(def.x, fy, def.z); ctx.world.group.add(m);
    const g = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), grateM); g.rotation.x = -Math.PI / 2; g.position.y = 0.015; m.add(g);
    // the clog: rags and wet paper heaped on the grate
    const rag = new THREE.MeshStandardMaterial({ color: 0x6d6a5c, roughness: 1 });
    const clog = new THREE.Group(); m.add(clog);
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.11 + i * 0.02, 8, 6), rag); b.scale.y = 0.35; b.position.set((i % 2 ? 0.1 : -0.08), 0.13, (i > 1 ? 0.08 : -0.07)); clog.add(b); }
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), hidden);
    hit.position.set(def.x, fy + 0.3, def.z); hit.name = `gratehit:${def.id}`; hit.userData.interact = { kind: 'grate', id: def.id };
    ctx.world.group.add(hit); ctx.world.interactables.push(hit);
    grates.set(def.id, { def, clog, hit });
  }
  G.clearGrate = (id, quiet) => {
    const Gr = grates.get(id); if (!Gr) return;
    Gr.clog.visible = false; const i = ctx.world.interactables.indexOf(Gr.hit); if (i >= 0) ctx.world.interactables.splice(i, 1);
    if (!G.grated.includes(id)) G.grated.push(id);
    if (!quiet) { ctx.sound('noise', 'splash'); ext.emit('minase:grate', { id }); ctx.save(); }
  };

  // ---------------- turning a valve ----------------
  G.canTurn = () => true;   // story.js sets the real rule (from when on)
  function postRun(id) {
    const P = posts.get(id); if (!P) return;
    const ok = G.canTurn(id); if (ok !== true) { ctx.answer(ok); return; }
    if (P.on) {
      if (P.press) { ctx.answer('あれが、乾いた床の向こうで止まっている。今開けたら、すぐに来る。'); return; }
      G.setPost(id, false); P.turn = -1; ctx.sound('creak'); ext.emit('minase:unvalve', { id }); ctx.save(); return;
    }
    G.setPost(id, true); P.turn = 1; ctx.sound('noise', 'splash'); ctx.sound('creak');
    ext.emit('minase:valve', { id }); ctx.save();
  }
  G.turnValve = postRun;

  ext.registerInteract('valve', {
    prompt: (o) => { const P = posts.get(o.id); if (!P) return ''; if (P.on) return P.press ? '止水弁（水を抜いてある）' : '[E] 止水弁を開ける（水を戻す）'; return G.canTurn(o.id) === true ? '[E] 止水弁を回す（水を抜く）' : '止水弁'; },
    run: (o) => postRun(o.id),
  });
  ext.registerInteract('grate', {
    prompt: () => '[E] 詰まった排水口のごみをどける',
    run: (o) => G.clearGrate(o.id),
  });

  // ---------------- every frame: the wheels turning, the water seeping back ----------------
  function update(dt, active) {
    for (const P of posts.values()) if (P.turn) { const k = Math.sign(P.turn); for (const w of P.wheels) w.children.forEach((c) => { c.rotation.z += k * dt * 8; }); P.turn = Math.abs(P.turn) > 0.02 ? P.turn - k * dt * 1.5 : 0; if (Math.sign(P.turn) !== k) P.turn = 0; }
    if (!active) return;
    let any = false;
    for (const P of posts.values()) {
      if (!P.on) continue;
      any = true;
      // the water always seeps back slowly; much faster while she presses at the edge
      const slow = G.grated.length >= 3 ? 1.5 : 1;
      const life = (P.def.id === 'K_LESSON' ? 8 : ctx.calm ? 18 : 12) * slow;
      P.burn = Math.min(1, P.burn + dt / (P.press ? life : life * 5));
      const k = 1 - P.burn;
      if (P.along === 'z') P.band.scale.y = Math.max(0.05, k); else P.band.scale.x = Math.max(0.05, k);
      P.mat.color.setRGB(0.29 * k + 0.12, 0.3 * k + 0.16, 0.29 * k + 0.17);
      if (P.burn >= 1) {
        G.setPost(P.def.id, false); P.press = false;
        ctx.sound('noise', 'splash');
        ext.emit('minase:refill', { id: P.def.id }); ctx.save();
      }
    }
    if (any) G.showValve();
  }

  ext.on('game:ready', (c) => {
    ctx = c;
    grateM = new THREE.MeshStandardMaterial({ map: grateTexture(), roughness: 0.8, metalness: 0.4 });
    G.grateM = grateM;
    const Wd = ctx.data.water;
    for (const p of Wd.posts) buildPost(p);
    for (const g of Wd.grates) buildGrate(g);
    chip = document.createElement('div'); chip.id = 'mn-valve'; chip.className = 'mn-valve'; chip.hidden = true;
    (document.getElementById('hud') || document.body).appendChild(chip);
    ctx.registerHudPart && ctx.registerHudPart('mn-valve', { slot: 'tr', order: 30 });
    ctx.systems.push({ id: 'minase-water', def: { update: (dt, c2, active) => update(dt, active) }, inst: null });
  });
  ext.registerPersist('water', {
    serialize: () => ({ grated: G.grated, posts: Object.fromEntries([...posts.values()].map((P) => [P.def.id, P.on ? Math.round(P.burn * 100) / 100 + 0.001 : 0])) }),
    restore: (s) => {
      if (!s) return;
      for (const id of s.grated || []) G.clearGrate(id, true);
      for (const [id, v] of Object.entries(s.posts || {})) G.setPost(id, v > 0, Math.max(0, v - 0.001));
    },
  });
}
