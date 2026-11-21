#!/usr/bin/env node
// The share picture of a dot page: a background shot (og-steps.mjs) with the title in the pixel font, 1200 x 630.
//   node tools/dot/og-compose.mjs <background.jpg> <out.png> top|fps
import fs from 'node:fs';
import path from 'node:path';
import { launch } from '../cdp.mjs';

const [bg, out, mode = 'top'] = process.argv.slice(2);
const label = mode === 'top' ? 'ドット版・見下ろし' : 'ドット版・一人称';
const right = mode === 'top';   // the title on the side the picture leaves dark
const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DotGothic16&display=swap">
<style>
html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#000}
.bg{position:absolute;inset:0;background:url(data:image/jpeg;base64,${fs.readFileSync(bg).toString('base64')}) ${right ? 'center/cover' : 'left center/122% auto'};image-rendering:pixelated}
.shade{position:absolute;inset:0;background:linear-gradient(${right ? 270 : 90}deg,rgba(0,0,0,.9) 0,rgba(0,0,0,.62) 34%,rgba(0,0,0,0) 54%)}
.t{position:absolute;${right ? 'right:64px;text-align:right' : 'left:64px'};top:150px;font-family:'DotGothic16';color:#e4ecdf;text-shadow:4px 4px 0 #000,-2px 0 0 #0b2a22}
h1{margin:0;font-size:88px;letter-spacing:.06em;font-weight:400}
h2{margin:6px 0 0;font-size:46px;font-weight:400;letter-spacing:.1em}
.b{display:inline-block;margin-top:34px;padding:8px 18px;font-size:30px;color:#06120e;background:#5f9c88;box-shadow:0 0 0 4px #000,6px 6px 0 4px rgba(0,0,0,.6);letter-spacing:.2em}
.f{position:absolute;${right ? 'right:64px' : 'left:64px'};bottom:44px;font-family:'DotGothic16';font-size:24px;color:#9fc4b0;letter-spacing:.12em;text-shadow:2px 2px 0 #000}
.frame{position:absolute;inset:14px;border:4px solid #5f9c88;box-shadow:0 0 0 4px #000 inset}
</style></head><body><div class="bg"></div><div class="shade"></div><div class="frame"></div>
<div class="t"><h1>水無瀬病院</h1><h2>― 七番の瓶 ―</h2><div class="b">${label}</div></div>
<div class="f">廃病院ホラー ｜ PC・スマホ ｜ 無料</div></body></html>`;
const tmp = path.join(path.dirname(path.resolve(out)), `_og-${mode}.html`);
fs.writeFileSync(tmp, html);
const p = await launch({ width: 1200, height: 630, dpr: 1 });
try {
  await p.goto('file:///' + tmp.split(path.sep).join('/'));
  await p.waitFor("document.fonts.status === 'loaded' && document.fonts.check('40px DotGothic16', '水無瀬病院')", 30000);
  await new Promise((r) => setTimeout(r, 400));
  await p.shot(out);
} finally { await p.close(); fs.rmSync(tmp, { force: true }); }
console.log('wrote', out);
