#!/usr/bin/env node
// The dot version (ドット版) as an extra build target beside the normal page (dot/site.json "targets"; from 札の家 game-kushi 711ee4f):
//   /dot      見下ろし: the player seen from above (dot/js/dot/topdown.js), the house cut away above the head
//   /dot-fps  一人称: the normal first-person view, drawn in dots
// Both are the same game: the root's js/ext, data, voices, photos and textures are SHARED, not copied. Each target folder holds only
// index.html (dot/index.html with its own head), game.json (the root one with every path made absolute from the site root, the dot
// layer /dot/js/dot/index.js after /js/ext/index.js, style pixel, its own id = its own save slot and GA game name) and og-image.png.
// The dot layer itself (code, figures, stacks, css) is published once under /dot/. Run after tools/build-site.js (npm run build does).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUB = path.join(ROOT, 'public');
const DOT = path.join(ROOT, 'dot');
if (!fs.existsSync(path.join(PUB, 'index.html'))) { console.error('build-dot: run tools/build-site.js first (public/ is missing)'); process.exit(1); }
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const { targets } = JSON.parse(fs.readFileSync(path.join(DOT, 'site.json'), 'utf8'));
const origin = `https://${site.domain}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
let lastmod;
try { lastmod = execSync('git log -1 --format=%cs', { cwd: ROOT }).toString().trim(); } catch { lastmod = new Date().toISOString().slice(0, 10); }

// a root-relative path of the game ("assets/x.webp", "data/plan.json", "js/ext/index.js") -> "/assets/x.webp"
const SHARED = /^(assets|data|js|css|story|vendor)\//;
const absolute = (v) => {
  if (typeof v === 'string') return SHARED.test(v) ? `/${v}` : v;
  if (Array.isArray(v)) return v.map(absolute);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, absolute(x)]));
  return v;
};
const merge = (a, b) => {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return b;
  const o = { ...(a && typeof a === 'object' && !Array.isArray(a) ? a : {}) };
  for (const [k, v] of Object.entries(b)) { if (v === null) delete o[k]; else o[k] = merge(o[k], v); }
  return o;
};
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const rootGame = read(path.join(PUB, 'game.json'));
const common = read(path.join(DOT, 'game.patch.json'));

// 1. the dot layer, once, under /dot/ (files starting with "_" are local sheets)
const LAYER = path.join(PUB, 'dot');
fs.rmSync(LAYER, { recursive: true, force: true });
for (const d of ['css', 'js', 'assets', 'data']) if (fs.existsSync(path.join(DOT, d))) fs.cpSync(path.join(DOT, d), path.join(LAYER, d), { recursive: true, filter: (s) => !path.basename(s).startsWith('_') });
// the root's photos the dot layer redraws as pixel art at boot (dot/js/dot/photos.js): their names only
// 1.8.0: each has a baked pixel copy in dot/assets/photos/<name>.png (tools/dot/bake-photos.py); a missing or older one is drawn in the browser
{ const stale = fs.readdirSync(path.join(ROOT, 'assets/photos')).filter((f) => /\.(webp|png|jpe?g)$/.test(f)).filter((f) => { const b = path.join(DOT, 'assets/photos', f + '.png'); return !fs.existsSync(b) || fs.statSync(b).mtimeMs < fs.statSync(path.join(ROOT, 'assets/photos', f)).mtimeMs; });
  if (stale.length) console.warn(`build-dot: WARNING ${stale.length} photo(s) not baked (run python tools/dot/bake-photos.py): ${stale.slice(0, 5).join(', ')}`); }
fs.writeFileSync(path.join(LAYER, 'photos.json'), JSON.stringify(fs.readdirSync(path.join(ROOT, 'assets/photos')).filter((f) => /\.(webp|png|jpe?g)$/.test(f)).sort()) + '\n');

const template = fs.readFileSync(path.join(DOT, 'index.html'), 'utf8');
for (const k of ['%MODE%', '%MANIFEST%', '<!--DOT-HEAD-->']) if (!template.includes(k)) { console.error(`build-dot: dot/index.html needs ${k}`); process.exit(1); }
const urls = [];
for (const t of targets) {
  const OUT = path.join(PUB, t.path);
  if (t.path !== 'dot') fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  // 2. game.json
  const own = fs.existsSync(path.join(DOT, `game.patch.${t.mode}.json`)) ? read(path.join(DOT, `game.patch.${t.mode}.json`)) : {};
  const game = merge(merge(merge(absolute(rootGame), common), own), { id: t.id, dot: { mode: t.mode, label: t.subtitle } });
  game.ext = [...absolute(rootGame.ext), '/dot/js/dot/index.js'];
  fs.writeFileSync(path.join(OUT, 'game.json'), JSON.stringify(game, null, 2) + '\n');
  // the pixel style's ledger of pictures to load first: none of its own (the dot layer loads its pictures in its boot step)
  fs.writeFileSync(path.join(OUT, 'pixel-items.json'), '{ "items": [] }\n');
  // 3. og image (the target's own key art)
  const og = path.join(DOT, `og-${t.mode}.png`);
  if (fs.existsSync(og)) fs.copyFileSync(og, path.join(OUT, 'og-image.png'));
  else console.warn(`build-dot: WARNING dot/og-${t.mode}.png is missing: ${t.path} shares have no picture`);
  // 4. the page
  const url = `${origin}/${t.path}`;   // firebase.json trailingSlash false: /dot/ redirects to /dot
  urls.push(url);
  const title = `${t.name}｜${t.titleSuffix}`;
  const ogImage = `${url}/og-image.png`;
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'VideoGame', name: t.name, alternateName: t.nameEn, url, description: t.description, image: ogImage,
    genre: [...(site.genre || []), 'ドット絵'], gamePlatform: ['Web browser', 'PC', 'Smartphone', 'Tablet'], applicationCategory: 'Game',
    operatingSystem: 'Any (modern web browser)', playMode: 'SinglePlayer', inLanguage: 'ja', dateModified: lastmod,
    isBasedOn: { '@type': 'VideoGame', name: site.name, url: `${origin}/` },
    author: { '@type': 'Organization', name: site.author, url: site.authorUrl }, offers: { '@type': 'Offer', price: 0, priceCurrency: 'JPY' },
  };
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(t.description)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta name="theme-color" content="#000000">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(site.name)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(t.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:locale" content="ja_JP">`,
    `<meta property="og:image" content="${ogImage}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:type" content="image/png">`,
    `<meta property="og:image:alt" content="${esc(t.ogImageAlt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(t.description)}">`,
    `<meta name="twitter:image" content="${ogImage}">`,
    `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>`,
    // GA4: the root page's property; the page path (/dot, /dot-fps) and content_group tell the versions apart
    site.gaId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${site.gaId}"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${site.gaId}',{content_group:'${t.path}'});</script>` : '',
  ].filter(Boolean).join('\n');
  fs.writeFileSync(path.join(OUT, 'index.html'), template.replaceAll('%MODE%', t.mode).replace('%MANIFEST%', `/${t.path}/game.json`).replace('<!--DOT-HEAD-->', head));
}
// 5. sitemap: the dot pages beside the normal one (the normal page itself is untouched)
const sm = path.join(PUB, 'sitemap.xml');
if (fs.existsSync(sm)) {
  let s = fs.readFileSync(sm, 'utf8');
  for (const u of urls) if (!s.includes(`<loc>${u}</loc>`)) s = s.replace('</urlset>', `  <url><loc>${u}</loc><lastmod>${lastmod}</lastmod></url>\n</urlset>`);
  fs.writeFileSync(sm, s);
}
const size = (d) => fs.readdirSync(d, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).reduce((a, e) => a + fs.statSync(path.join(e.parentPath || e.path, e.name)).size, 0);
console.log(`built ${targets.map((t) => `public/${t.path}/`).join(' ')} (dot layer ${Math.round(size(LAYER) / 1024)} KB, root assets shared; ${urls.join(' ')})`);
