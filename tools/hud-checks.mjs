// Page-side probes for check-playtest P35-P36 (standard 1.21.1, 水無瀬病院 ドット版 on an iPhone). Each *Source() returns an expression string
// that check-playtest evaluates in the game page (g = window.__game).
//   hudOverlapSource (a helper for a game's own phone scripts; check-playtest uses tools/phone-layout.mjs P31 since 1.21.0): message boxes overlapping.
//   P35 「閉じるで閉じられないです」: every close button on screen is the top element at its centre (nothing over it takes the finger);
//       check-playtest then taps it with a real touch and expects its box gone.
//   P36 「文字が改行されると回す位置が変わってハンチングする」: in each library mini game, a longer text in any caption / message moves none of
//       its controls (the knob, the buttons, the sliders).
export const MSG_BOXES = ['#say', '#prompt', '#gf-ch', '.tl-lane .tl-item', '#objective', '#hud-left', '.ph-goal', '#guide'];

export function hudOverlapSource(sel = MSG_BOXES) {
  return `(() => {
    const sel = ${JSON.stringify(sel)}, boxes = [];
    const vis = (e) => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false; const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth && (e.textContent || '').trim().length > 0; };
    for (const s of sel) for (const e of document.querySelectorAll(s)) { if (!vis(e) || e.closest('#gf-reader')) continue; let p = e.parentElement, inner = false; while (p) { if (p.style && getComputedStyle(p).visibility === 'hidden') { inner = true; break; } p = p.parentElement; } if (inner) continue; boxes.push({ s, e, r: e.getBoundingClientRect() }); }
    const ov = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j]; if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
      const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (ix > 2 && iy > 2 && ix * iy > 64) ov.push(a.s + ' x ' + b.s + ' (' + Math.round(ix) + 'x' + Math.round(iy) + ')');
    }
    const msgs = boxes.filter((b) => b.s !== '#prompt').map((b) => b.s);
    return { overlaps: [...new Set(ov)], messages: msgs };
  })()`;
}

export function closeTapSource() {
  return `(() => {
    const out = [];
    const all = [...document.querySelectorAll('button, [role=button]')].filter((b) => /閉じる|close/i.test((b.getAttribute('aria-label') || '') + ' ' + (b.textContent || '')) || b.matches('.tl-close, .wm-x, .mgx-close'));
    for (const b of all) {
      const s = getComputedStyle(b), r = b.getBoundingClientRect();
      if (s.display === 'none' || s.visibility === 'hidden' || r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) continue;
      const x = r.left + r.width / 2, y = r.top + r.height / 2, e = document.elementFromPoint(x, y);
      const box = b.closest('#gf-ch, .tl-item, .wm-layer, #gf-reader, .mgx, .gf-mo-card, .ph-sheet') || b;
      out.push({ id: (box.id ? '#' + box.id : '.' + String(box.className || box.tagName).split(' ')[0]), x: Math.round(x), y: Math.round(y), on: !!e && (e === b || b.contains(e)), top: e ? (e.id ? '#' + e.id : '.' + String(e.className || e.tagName).split(' ')[0]) : null });
    }
    return out;
  })()`;
}

/** open the library mini game of task <id>, make every caption longer, and report the controls that moved (then close it) */
export function mgStableSource(id) {
  return `(async () => {
    const t = g.data.tasks.find((x) => x.id === ${JSON.stringify(id)}); if (!t || !g.runMinigame) return null;
    const run = g.runMinigame(t); await new Promise((r) => setTimeout(r, 700));
    const host = document.getElementById('mg-custom') || document.querySelector('.mgx'); if (!host) return { type: (t.minigame || {}).type, open: false };
    const ctl = [...host.querySelectorAll('[role=slider], button:not(.mgx-close), input, select, canvas, [draggable=true], [data-k]')].filter((e) => e.getBoundingClientRect().width > 2);
    const at = () => ctl.map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.top]; });
    const before = at(), moved = [];
    const texts = [...host.querySelectorAll('[aria-live], .mgx-msg, .mgx-body p, .mgx-body output, .mgx-body [class*=heard], .mgx-body [class*=cap]')];
    for (const el of texts) {
      const old = el.textContent, long = ('「……聞こえるか……」声だ。そのまま止める。' + (old || '')).slice(0, Math.max(30, (old || '').length * 2));
      el.textContent = long; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const now = at(); now.forEach((p, i) => { const d = Math.hypot(p[0] - before[i][0], p[1] - before[i][1]); if (d > 2) moved.push((el.className || el.tagName) + ' -> ' + (ctl[i].className || ctl[i].tagName) + ' ' + Math.round(d) + 'px'); });
      el.textContent = old; await new Promise((r) => requestAnimationFrame(r));
    }
    (host.querySelector('.mgx-close') || { click() {} }).click(); await Promise.race([run, new Promise((r) => setTimeout(r, 800))]);
    return { type: (t.minigame || {}).type, open: true, controls: ctl.length, texts: texts.length, moved: [...new Set(moved)].slice(0, 6) };
  })()`;
}
