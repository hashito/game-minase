// 水無瀬病院 ― 七番の瓶: the game's own code. The rule (the valves) is js/ext/water.js; the hospital and the passage js/ext/hospital.js;
// あれ in the passage js/ext/chimera.js; the words and the scripted moments js/ext/story.js (+ words.js); the people js/ext/people.js.
// They share one small state (G). Order matters: the valves first (hospital.js uses their grate picture), then the hospital, her, the story.
import { installWater } from './water.js';
import { installHospital } from './hospital.js';
import { installHina } from './hina.js';
import { installDress } from './dress.js';
import { installChimera } from './chimera.js';
import { installStory } from './story.js';
import { installTests } from './test-scenes.js';
import { installAnswers } from './answers.js';
import { installBoot } from './boot.js';

export default function (ext, env = {}) {
  const G = {};
  // the same game drawn in dots (/dot-fps, tools/build-dot.mjs): from the normal title, a button to it (the dot page's own layer links back)
  if (!(env.manifest && env.manifest.dot)) ext.registerTitleButton('dot-version', { label: 'ドット版（一人称）で遊ぶ', order: 200, run() { location.href = '/dot-fps'; } });
  installWater(ext, G);
  installHospital(ext, G);
  installDress(ext, G);
  installHina(ext, G);
  installChimera(ext, G);
  installStory(ext, G);
  installTests(ext, G);
  installAnswers(ext, G);
  installBoot(ext, G);
  ext.on('bus:error', ({ name, error }) => console.error('[minase]', name, error && error.stack ? error.stack.split(String.fromCharCode(10)).slice(0, 3).join(' ') : String(error)));
  ext.on('player:dead', () => { G.deaths = (G.deaths || 0) + 1; });   // the playthrough tools count them
  ext.on('game:ready', () => { if (typeof window !== 'undefined') window.__mn = G; });
  // 1.8.0: a document hung on a wall (1 m up and higher: the guide board at reception) is a wall thing - in the dot version its board is
  // 17 cm deep, past the 15 cm the rest check takes as thin, and it read as floating 1.12 m over the floor (check-playtest P67)
  ext.on('game:ready', (c) => { for (const d of c.data.docs || []) if ((d.y || 0) >= 1) { const o = c.world.group.getObjectByName(`doc:${d.id}`); if (o) o.userData.wall = true; } });
}
