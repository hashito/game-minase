// The game's own words wherever the kit would answer with a generic line ("まだ、この作業には進めません", "先に済ませることがある：…",
// "（いまは使えません）"). Two parts:
//   1. ctx.canStart is wrapped: a "not yet" answer for a task becomes what the protagonist knows is missing and where to go.
//   2. a station whose task is not open yet shows "[E] <the thing>", not a bare name, and [E] gives that answer.
import { W } from './words.js';

export function installAnswers(ext, G) {
  let ctx = null;
  const done = (id) => ctx.state.tasks.includes(id);
  const has = (id) => ctx.state.inv.includes(id);
  void G;
  function why(task) {
    switch (task.id) {
      case 'T_FRONT': return done('T_HINA') ? null : W.hina_first;
      case 'T_KEY': return done('T_FRONT') ? null : W.front_first;
      case 'T_RADIO': return done('T_GEN') ? null : W.radio_gen;
      case 'T_BOUSUI': return done('T_RADIO') ? null : W.bousui_radio;
      case 'T_LAMP1': case 'T_LAMP2': case 'T_LAMP3': case 'T_LAMP4': return W.lamp_order;
      case 'T_GATE': return W.gate_look;
      case 'T_RESCUE': return done('T_SEAL') ? null : done('T_GEN') ? W.pump_ok : W.pump_early;
      case 'T_LEDGER': return has('NAMETAG') ? null : W.cab_locked;
      case 'T_THINK': return done('T_LEDGER') ? null : W.desk_early;
      case 'T_RETURN': return done('T_THINK') ? null : W.drain_wait;
      case 'T_END': return !has('HEARSE_KEY') ? W.hearse_locked : !done('T_RETURN') ? W.hearse_jar : null;
      case 'T_GIVE': return has('JAR') ? null : W.give_nojar;
      case 'T_GEN': return null;
      default: return null;
    }
  }
  const GENERIC = /^(まだ、この作業には進めません|先に済ませることがある：|いまは、まだできません|この作業は、もう終わっています)/;

  ext.on('game:ready', (c) => {
    ctx = c;
    const cs0 = ctx.canStart;
    ctx.canStart = (task) => {
      const r = cs0(task);
      if (r === true || !task || typeof r !== 'string' || !GENERIC.test(r)) return r;
      if (/^この作業は、もう終わっています/.test(r)) return W.done_here;
      return why(task) || W.not_yet;
    };
    // a station whose task is not open yet still offers [E] (the answer says what is missing)
    const NAMES = { S_FRONT: '正面の扉（黒木さん）', S_HINA1: 'ひなた', S_HINA2: 'ひなた', S_CAB: '鍵のかかった台帳の棚', S_DRAIN: '床の排水口', S_HEARSE: '霊安室の搬出口', S_DESK: '事務机', S_PUMPSW: '排水ポンプの制御盤' };
    const tasks = ctx.data.tasks || [];
    for (const o of ctx.world.interactables) {
      const it = o.userData && o.userData.interact;
      if (!it || it.kind !== 'station') continue;
      const base = NAMES[it.id] || it.label;
      if (!base) continue;
      Object.defineProperty(it, 'label', { configurable: true, get: () => (tasks.some((t) => t.station === it.id && !done(t.id)) ? `[E] ${base}` : base) });
    }
  });
}
