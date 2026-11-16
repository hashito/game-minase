# 水無瀬病院 ― 七番の瓶

A 3D first-person game on the game-kit standard (docs/standard-3d.md in game-kit). Everything is data: `game.json`, `data/*.json`.
Game-specific code goes only into `js/ext/`; the look into `css/theme-game.css` (design tokens).

```
npm run serve      # http://localhost:8000/
npm test           # data checks
npm run plan       # floor-plan check (strict)
npm run media      # photos listed in the data exist
npm run smoke      # headless: start -> first task -> ending (needs Edge/Chrome; serves by itself)
npm run sync-kit   # copy the newest kit parts (kit.json lists them)
```

## This game

水無瀬病院 ― 七番の瓶（key `minase`, β）. One rule: *あれは、水のある所しか進めない。止水弁を回して水を抜けば、そこで止まる。* あれ is a chimera: 葛城's 合成標本 (specimens of many patients sewn into one) with 浅井早苗 taken into it in the 1999 flood.
Turning a valve (止水弁) in the passage drains a dry band across the floor; she stops at its edge until the rain water seeps back.

- Data: `tools/gen-data.mjs` writes every `data/*.json` (edit it, not the JSON). Images: `tools/gen-images.mjs` (prompts in
  `tools/media.json`); voices: `tools/gen-voice.mjs` — both only through the local media queue at 127.0.0.1:8765.
- Code: `js/ext/` — `water.js` (valves, dry bands, grates), `hospital.js` (the hospital, the passage, the water planes, ひなた's places),
  `chimera.js` (あれ on the passage line), `people.js` (あれ and ひなた), `story.js` (tasks, events, endings), `words.js` (the protagonist's
  lines), `answers.js` (the game's own "not yet" answers), `test-scenes.js` (`?scene=<id>`).
- Whole-game check (headless, real keys, every ending):
  `PLAY_END=name|return|give node tools/probe.mjs --qa --out D:/minase-stages/play-e3 --steps tools/play/full.mjs`
- Plan: `docs/brief.md`.
