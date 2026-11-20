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

export default function (ext) {
  const G = {};
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
}
