// Phones (a first-person dot game, user feedback 2026-11-21): written so that it can move into game-kit as it is (no game names here).
//   「携帯で行う場合は横でのプレイを推奨」  held upright, a notice with a turning-phone picture asks to turn it sideways (このまま遊ぶ keeps it
//                                       upright); the landscape layout is the kit's compact HUD
//   「タスクなどは携帯の場合は常時表示をやめたほうが良い」  on a phone the goal box and the step box are folded into one 「目的」 chip at the
//                                       top left; a tap opens them, a second tap (or 8 s) folds them again; the chip blinks when the step changes.
//                                       Notifications show one at a time (the next waits in the lane)
//   「全画面表示できると良い」            a 全画面 button on the title and a 画面 tab in the menu: the Fullscreen API plus a landscape orientation
//                                       lock where the browser has them; on an iPhone (no fullscreen for pages) the way to add the page to the
//                                       home screen, which opens it full screen (the page links a web app manifest)
// installPhone(ext, { labels }) ; CSS: dot.css "phones" (:root[data-phone], .ph-*)
const svgTurn = `<svg class="ph-turn-svg" viewBox="0 0 120 96" width="120" height="96" aria-hidden="true">
  <rect x="14" y="10" width="34" height="60" rx="5" fill="none" stroke="currentColor" stroke-width="4"/>
  <rect x="52" y="50" width="60" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="4"/>
  <path d="M60 18 q26 0 30 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <path d="M82 38 l8 8 l6 -10" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const PHONE_LABELS = {
  turnTitle: '横向きでの プレイを おすすめします',
  turnBody: 'スマートフォンを横にすると、通路の先と、迫ってくるものが よく見えます。',
  keep: 'このまま遊ぶ', full: '全画面で遊ぶ', fullOff: '全画面をやめる', goal: '目的', tab: '画面',
  iosTitle: '全画面で遊ぶには',
  ios: 'iPhone では、ブラウザの共有ボタン（□に↑）から「ホーム画面に追加」を選び、ホーム画面のアイコンから開くと全画面で遊べます。',
  noFull: 'このブラウザでは全画面にできません。',
};

const isPhone = () => {
  const coarse = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  return coarse && Math.min(screen.width, screen.height) < 600;
};
const isIOS = () => /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const canFull = () => !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
const fullNow = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const store = { get(k) { try { return sessionStorage.getItem(k); } catch { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } } };

export function installPhone(ext, { labels: L = PHONE_LABELS } = {}) {
  const root = document.documentElement;
  const phone = isPhone();
  if (phone) root.dataset.phone = '1';
  let ctx = null;

  async function goFull() {
    const el = document.documentElement;
    if (!canFull()) { showIOS(); return false; }
    try { await (el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen()); } catch { return false; }
    try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch { /* not every browser locks */ }
    return true;
  }
  async function leaveFull() { try { await (document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen()); } catch { /* already out */ } }
  function sheet(html, buttons) {
    const o = document.createElement('div'); o.className = 'ph-sheet'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    o.innerHTML = `<div class="ph-card">${html}<div class="ph-btns"></div></div>`;
    for (const b of buttons) { const e = document.createElement('button'); e.type = 'button'; e.className = `btn${b.primary ? ' primary' : ''}`; e.textContent = b.label; e.addEventListener('click', () => { o.remove(); b.run && b.run(); }); o.querySelector('.ph-btns').appendChild(e); }
    document.body.appendChild(o);
    return o;
  }
  function showIOS() { sheet(`<h2>${L.iosTitle}</h2><p>${isIOS() ? L.ios : L.noFull}</p>`, [{ label: '閉じる', primary: true }]); }

  // ---- held upright: the notice ----
  let turnEl = null;
  function checkTurn() {
    const upright = phone && matchMedia('(orientation: portrait)').matches;
    if (!upright || store.get('gf-ph-keep')) { if (turnEl) { turnEl.remove(); turnEl = null; } root.toggleAttribute('data-ph-upright', upright); return; }
    root.setAttribute('data-ph-upright', '');
    if (turnEl) return;
    turnEl = sheet(`<div class="ph-turn">${svgTurn}</div><h2>${L.turnTitle}</h2><p>${L.turnBody}</p>`, [
      ...(canFull() ? [{ label: L.full, primary: true, run: () => { goFull(); turnEl = null; } }] : []),
      { label: L.keep, primary: !canFull(), run: () => { store.set('gf-ph-keep', '1'); turnEl = null; } },
    ]);
    turnEl.classList.add('ph-turn-sheet');
  }
  if (phone) {
    addEventListener('resize', () => setTimeout(checkTurn, 150));
    if (screen.orientation) screen.orientation.addEventListener('change', () => setTimeout(checkTurn, 150));
    if (document.readyState === 'loading') addEventListener('DOMContentLoaded', checkTurn); else setTimeout(checkTurn, 0);
  }

  // ---- the title and the menu ----
  ext.registerTitleButton('fullscreen', { label: L.full, order: 150, when: () => phone || canFull(), run: () => goFull() });
  ext.registerTab('screen', {
    label: L.tab, order: 90,
    render(host) {
      const on = fullNow();
      host.innerHTML = `<div class="ph-tab"><p>${phone ? '横向きで遊ぶのがおすすめです。' : ''}全画面にすると、ブラウザのバーが消えて画面いっぱいに遊べます。</p><button type="button" class="btn primary ph-full">${on ? L.fullOff : L.full}</button>${isIOS() && !canFull() ? `<p class="ph-note">${L.ios}</p>` : ''}</div>`;
      host.querySelector('.ph-full').addEventListener('click', async () => { if (fullNow()) await leaveFull(); else await goFull(); setTimeout(() => this.render(host), 300); });
    },
  });

  // ---- the 目的 chip (phones only) ----
  ext.on('game:ready', (c) => {
    ctx = c;
    if (!phone) return;
    const chip = document.createElement('button');
    chip.type = 'button'; chip.className = 'ph-goal'; chip.setAttribute('aria-expanded', 'false');
    chip.innerHTML = `<span class="ph-goal-k">${L.goal}</span><span class="ph-goal-t"></span>`;
    chip.hidden = true; document.body.appendChild(chip);
    // only while playing (not on the title, not over a death card or an ending)
    setInterval(() => { chip.hidden = !(ctx.state && ctx.state.started && !ctx.state.ended) || !!(ctx.readingNow && ctx.readingNow()) || !!(ctx.wm && ctx.wm.isOpen); }, 300);
    let t = 0;
    const text = () => { const now = document.querySelector('.pg-hud .pg-now'); return now ? now.textContent.replace(/^次：/, '') : ''; };
    const set = (open) => { root.toggleAttribute('data-goal-open', open); chip.setAttribute('aria-expanded', String(open)); clearTimeout(t); if (open) t = setTimeout(() => set(false), 8000); };
    chip.addEventListener('click', (e) => { e.stopPropagation(); set(!root.hasAttribute('data-goal-open')); });
    let last = '';
    const watch = () => {
      const s = text() + '|' + ((document.querySelector('#guide .sg-title') || {}).textContent || '');
      chip.querySelector('.ph-goal-t').textContent = text();
      if (s !== last) { if (last) { chip.classList.remove('ph-blink'); void chip.offsetWidth; chip.classList.add('ph-blink'); } last = s; }
    };
    new MutationObserver(watch).observe(document.getElementById('hud-left') || document.body, { subtree: true, childList: true, characterData: true });
    watch();
  });
  return { isPhone: phone, goFull, leaveFull };
}
