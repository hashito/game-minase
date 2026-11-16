/* game-kit 0641622: js/mg-order-steps.js — edit in game-kit and run tools/kit-sync.js */
// Library mini game "order-steps" (standard 1.8.4: the order of a rite, the steps of an old manual, the pages of a torn diary): put the steps
// in the right order. Tap one step, then another, to swap them (or move a step with its ▲ ▼). 「これで確かめる」 tells how many are in the
// right place - nothing else is lost.
//   cfg: title, help, steps (['…', …] in the right order; default a purification rite), seed (10), ok, skin, stamp
//   hooks: { sound(name, ctx) }  name = 'move' | 'miss' | 'ok'
import { icon } from './icons.js';
import { mgFrame, esc, rng } from './mg-frame.js';

const DEF = ['手と口を清める', '鈴を一度鳴らす', '賽銭を納める', '二度礼をする', '二度手を打つ', '一度礼をする'];
/** a shuffle of 0..n-1 that is never already in order (seeded) */
export function shuffleOrder(n, seed = 10) { const r = rng(seed), a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } if (a.every((v, i) => v === i)) [a[0], a[1]] = [a[1], a[0]]; return a; }
export const rightPlaces = (order) => order.filter((v, i) => v === i).length;
export const orderStepsOk = (order) => rightPlaces(order) === order.length;

export default {
  type: 'order-steps',
  about: '手順の札を並べ替えて、正しい順番にする',
  mount(host, cfg = {}, ctx = {}, hooks = {}) {
    return new Promise((done) => {
      const steps = cfg.steps || DEF, order = shuffleOrder(steps.length, cfg.seed ?? 10), snd = (k) => hooks.sound && hooks.sound(k, ctx);
      let picked = -1;
      const f = mgFrame(host, { cfg, ctx, title: cfg.title || '手順を並べる', help: cfg.help || '札を二つ続けて押すと入れ替わります（上下の矢印で一つずつ動かすこともできます）。並べたら「これで確かめる」。' }, done);
      f.body.innerHTML = `<div class="mgx-order"><ol class="mgx-order-list"></ol><div class="mgx-row"><button type="button" class="btn primary" data-check>これで確かめる</button></div></div>`;
      const list = f.body.querySelector('.mgx-order-list');
      const draw = (moved = []) => {
        list.innerHTML = order.map((v, i) => `<li class="${picked === i ? 'picked' : ''}${moved.includes(i) ? ' moved' : ''}"><button type="button" class="mgx-order-step" data-i="${i}" aria-pressed="${picked === i}"><b>${i + 1}</b>${esc(steps[v])}</button><span class="mgx-order-mv"><button type="button" class="btn" data-up="${i}" aria-label="上へ" ${i ? '' : 'disabled'}>${icon('up')}</button><button type="button" class="btn" data-dn="${i}" aria-label="下へ" ${i < order.length - 1 ? '' : 'disabled'}>${icon('down')}</button></span></li>`).join('');
      };
      const swap = (a, b) => { [order[a], order[b]] = [order[b], order[a]]; picked = -1; snd('move'); draw([a, b]); const el = list.querySelector(`[data-i="${b}"]`); el && el.focus(); };
      list.addEventListener('click', (e) => {
        if (f.done) return;
        const up = e.target.closest('[data-up]'), dn = e.target.closest('[data-dn]'), st = e.target.closest('[data-i]');
        if (up) return swap(+up.dataset.up, +up.dataset.up - 1);
        if (dn) return swap(+dn.dataset.dn, +dn.dataset.dn + 1);
        if (!st) return;
        const i = +st.dataset.i;
        if (picked < 0) { picked = i; draw(); list.querySelector(`[data-i="${i}"]`).focus(); f.say('入れ替える札を押してください。'); }
        else if (picked === i) { picked = -1; draw(); f.say(''); }
        else swap(picked, i);
      });
      f.body.querySelector('[data-check]').addEventListener('click', () => {
        if (f.done) return;
        if (orderStepsOk(order)) { snd('ok'); f.say(cfg.ok || '正しい順番に並んだ。'); f.win(800); return; }
        snd('miss'); f.miss(); f.say(`${rightPlaces(order)} つは正しい場所にある。残りを入れ替えてみよう。`);
      });
      draw();
      if (ctx.qa) return f.end(true);
      list.querySelector('button').focus();
    });
  },
};
