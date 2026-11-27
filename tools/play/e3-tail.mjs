// 1.8.0: the E3 tail from the think scene (T_THINK, then the diary-page step T_SQ1 in REIAN) - a check of the route the full play takes
import { helpers } from './lib.mjs';
export default async (api) => {
  const { G, sleep, log, shot } = api, H = helpers(api);
  const pre = (ids) => G(`(window.__gfQ = ${JSON.stringify(ids)}, Object.getOwnPropertyDescriptor(window, '__gfChoice') || Object.defineProperty(window, '__gfChoice', { configurable: true, get() { return (window.__gfQ || []).shift(); }, set() {} }), 1)`);
  const doors = () => G(`g.world.interactables.map((o) => o.userData.interact).filter((i) => i && i.kind === 'door').map((i) => i.id + (i.door && i.door.isOpen ? ':open' : ':shut')).join(' ')`);
  await api.p.waitFor('window.__game && window.__game.state && window.__game.state.started', 60000); await sleep(2500); await H.idle();
  log('start', await G('({ room: g.state.room, x: g.camera.position.x, z: g.camera.position.z, tasks: g.state.tasks.slice(-4) })'));
  await H.walkTo(8.0, 13.4); await pre(['ren', 'father', 'father', 'katsuragi', 'stitched', 'father']);
  log('use', await H.use(7.2, 14.5, 0.75)); await sleep(800); await H.idle(1500); await H.idle(1500);
  log('think left', await G('(window.__gfQ || []).length'), 'wrong', await G('mn.wrong'), 'done', await G(`g.state.tasks.includes('T_THINK')`));
  log('doors', await doors()); await shot('after-think');
  await H.walkTo(9.0, 10.4); log("walk", await H.door(9, 9, 9.0, 7.5), await H.walkTo(10.0, 7.5)); await shot('broka');
  log('door', await H.door(10, 6, 9.4, 4.9)); log('doors', await doors()); await shot('reian-door');
  await H.walkTo(7.6, 3.2); log('sq1', await H.use(6.6, 3.2, 0.75)); await H.idle(); log('named', await G('g.state.flags.includes("named")'));
};
