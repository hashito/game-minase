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

<!-- scene-links:start -->
## ドット版（一人称）/dot-fps

同じゲーム（物語・データ・声・写真）を、ドット絵の一人称3Dで描く版。`npm run build` が `public/` と `public/dot-fps/` の両方を作り、一度の firebase deploy で両方が出る（`tools/build-dot.mjs`, `dot/`）。

- 家具・小物・M2の専用パーツ: game-kit スプライトスタック図鑑から `python tools/dot/stacks.py --kit <game-kit main>` で `dot/assets/stacks/` に書き出し、部屋ごとの置き場所は `dot/data/props.json`（`node tools/dot/check-props.mjs` で扉・ひなたの通り道との重なりを確認）
- ひなたと「あれ」: kit の共通リグとモーション（`tools/dot/figures.json` → kit `motion_frames.py` → `dot/assets/figures/`）
- 携帯: 横向きのすすめ、「目的」チップ、全画面（`dot/js/dot/phone.js`）
- 確認: `node tools/probe.mjs --public --path dot-fps/ ...` に `tools/play/*.mjs`（結末3つ・ひなた・寄り道・捕まり・再開）と `tools/dot/*-steps.mjs`（壁の物・読む枠・小物・携帯）、`node tools/check-playtest.mjs . --root public --path dot-fps/`

## テスト用の場面リンク

`?scene=<id>` を付けて開くと、テストモードでその場面から始まります（前の作業は済んだことになり、会話は飛ばします）。
テストモードではセーブを書かず、消しもしません（画面の上に「テストモード」の札が出ます）。`?test` だけを付けると、最初からテストモードで遊べます。
知らない id のときは最初から始まります。場面の一覧は `js/ext/test-scenes.js`、この表は `node tools/scene-links.mjs` で作り直します。


### 一階

| 場面 | 公開版 | 手元 (npm run serve) |
|---|---|---|
| 玄関ホール（はじまり） | [genkan](https://minase.autoarticles.net/?scene=genkan) | [local](http://localhost:8000/?scene=genkan) |
| 鎖の扉 | [front](https://minase.autoarticles.net/?scene=front) | [local](http://localhost:8000/?scene=front) |
| 受付（キーボックス） | [uke](https://minase.autoarticles.net/?scene=uke) | [local](http://localhost:8000/?scene=uke) |
| カルテ庫 | [karte](https://minase.autoarticles.net/?scene=karte) | [local](http://localhost:8000/?scene=karte) |
| 診察室（洗面台） | [shin](https://minase.autoarticles.net/?scene=shin) | [local](http://localhost:8000/?scene=shin) |
| 階段ホール | [kaidan](https://minase.autoarticles.net/?scene=kaidan) | [local](http://localhost:8000/?scene=kaidan) |

### 地下

| 場面 | 公開版 | 手元 (npm run serve) |
|---|---|---|
| 地下の廊下 | [broka](https://minase.autoarticles.net/?scene=broka) | [local](http://localhost:8000/?scene=broka) |
| ポンプ室（発電機） | [pump](https://minase.autoarticles.net/?scene=pump) | [local](http://localhost:8000/?scene=pump) |
| 防水扉の前 | [mouth](https://minase.autoarticles.net/?scene=mouth) | [local](http://localhost:8000/?scene=mouth) |

### 通路

| 場面 | 公開版 | 手元 (npm run serve) |
|---|---|---|
| 配管の通路 | [p1](https://minase.autoarticles.net/?scene=p1) | [local](http://localhost:8000/?scene=p1) |
| 低い通路（しゃがむ） | [p2](https://minase.autoarticles.net/?scene=p2) | [local](http://localhost:8000/?scene=p2) |
| 水の通路 | [p3](https://minase.autoarticles.net/?scene=p3) | [local](http://localhost:8000/?scene=p3) |
| 二枚目の防水扉（窓） | [gate](https://minase.autoarticles.net/?scene=gate) | [local](http://localhost:8000/?scene=gate) |
| 止水弁（練習） | [lesson](https://minase.autoarticles.net/?scene=lesson) | [local](http://localhost:8000/?scene=lesson) |
| 病理標本室 | [hyohon](https://minase.autoarticles.net/?scene=hyohon) | [local](http://localhost:8000/?scene=hyohon) |
| 瓶を持って逃げる（標本室） | [escape](https://minase.autoarticles.net/?scene=escape) | [local](http://localhost:8000/?scene=escape) |
| 逃げる（水の通路の入口） | [escape-p3](https://minase.autoarticles.net/?scene=escape-p3) | [local](http://localhost:8000/?scene=escape-p3) |

### 地下

| 場面 | 公開版 | 手元 (npm run serve) |
|---|---|---|
| 防水扉を閉める | [seal](https://minase.autoarticles.net/?scene=seal) | [local](http://localhost:8000/?scene=seal) |
| ポンプ室（水がたまる） | [rescue](https://minase.autoarticles.net/?scene=rescue) | [local](http://localhost:8000/?scene=rescue) |
| 病理事務室（台帳の棚） | [jimu](https://minase.autoarticles.net/?scene=jimu) | [local](http://localhost:8000/?scene=jimu) |
| 事務机（水が上がる） | [think](https://minase.autoarticles.net/?scene=think) | [local](http://localhost:8000/?scene=think) |
| 排水口（瓶を返す・日誌あり） | [drain](https://minase.autoarticles.net/?scene=drain) | [local](http://localhost:8000/?scene=drain) |
| 霊安室の搬出口（結末の前） | [end](https://minase.autoarticles.net/?scene=end) | [local](http://localhost:8000/?scene=end) |

### 一階

| 場面 | 公開版 | 手元 (npm run serve) |
|---|---|---|
| 鎖の扉（瓶を持って戻った） | [give](https://minase.autoarticles.net/?scene=give) | [local](http://localhost:8000/?scene=give) |

### 段階の頭

| 場面 | 公開版 | 手元 (npm run serve) |
|---|---|---|
| 1. ひなたと話し、扉の外の黒木さんと話し、受付で地下への鍵を探す | [stage:L1](https://minase.autoarticles.net/?scene=stage:L1) | [local](http://localhost:8000/?scene=stage:L1) |
| 2. カルテ庫で「七」の手がかりを探し、階段の防火扉を開けて地下へ降りる | [stage:L2](https://minase.autoarticles.net/?scene=stage:L2) | [local](http://localhost:8000/?scene=stage:L2) |
| 3. 発電機を動かし、ひなたと無線を合わせ、防水扉の先の長い通路を標本室まで行く | [stage:L3](https://minase.autoarticles.net/?scene=stage:L3) | [local](http://localhost:8000/?scene=stage:L3) |
| 4. 七番の瓶を取り、止水弁で「あれ」を止めながら防水扉まで戻る。止まったポンプを動かし、ひなたを助ける | [stage:L4](https://minase.autoarticles.net/?scene=stage:L4) | [local](http://localhost:8000/?scene=stage:L4) |
| 5. 病理事務室で台帳を開き、水が上がるなかで、この病院で起きたことを確かめる | [stage:L5](https://minase.autoarticles.net/?scene=stage:L5) | [local](http://localhost:8000/?scene=stage:L5) |

<!-- scene-links:end -->
