#!/usr/bin/env node
// Voices for every spoken line of data/talk.json through the local media queue (http://127.0.0.1:8765, kind "voice"), saved as
// assets/voice/<line id>.mp3 (ffmpeg, mono). Lines that already have a file are skipped; --force redoes them, --only ID,ID does a few.
//   node tools/gen-voice.mjs [--force] [--only MSG-001,MSG-002] [--dry]
// Then run tools/gen-data.mjs: it adds "voice" to each line whose file exists.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'http://127.0.0.1:8765';
const args = process.argv.slice(2), force = args.includes('--force'), dry = args.includes('--dry');
const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : null;
// VOICEVOX speakers (by the queue's speaker number) and speed per character
export const VOICES = { 'ひなた': { speaker: 8, speed: 1.05 }, '黒木': { speaker: 13, speed: 0.95 }, '浅井': { speaker: 14, speed: 0.8 }, '私': { speaker: 11, speed: 1.0 }, '葛城': { speaker: 21, speed: 0.9 } };
const talk = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/talk.json'), 'utf8'));
const lines = new Map();
const add = (L) => { if (L && L.id && L.text && VOICES[L.who] && !lines.has(L.id)) lines.set(L.id, L); };
for (const seq of Object.values(talk)) for (const L of seq) { add(L); for (const o of L.options || []) for (const r of o.reply || []) add(r); }
// the protagonist's thoughts and answers (js/ext/words.js): assets/voice/t-<key>.mp3, listed in assets/voice/thoughts.json (game.json "thoughtVoices")
const { W } = await import(new URL('../js/ext/words.js', import.meta.url).href);
for (const [k, text] of Object.entries(W)) if (text.length > 6) lines.set(`t-${k}`, { id: `t-${k}`, who: '私', text });
// 1.7.0 (5th play test #13 「最後も音声をつけてあげてください」): the ending cards (data/endings.json pages), read by 私
for (const e of JSON.parse(fs.readFileSync(path.join(ROOT, 'data/endings.json'), 'utf8'))) for (const pg of e.pages || []) if (pg.voice && pg.text) { const id = path.basename(pg.voice, '.mp3'); lines.set(id, { id, who: '私', text: pg.text }); }
const out = path.join(ROOT, 'assets/voice'); fs.mkdirSync(out, { recursive: true });
const todo = [...lines.values()].filter((L) => (!only || only.has(L.id)) && (force || !fs.existsSync(path.join(out, `${L.id}.mp3`))));
console.log(`${lines.size} spoken lines, ${todo.length} to make`);
if (dry) process.exit(0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (t) => t.replace(/水無瀬/g, 'みなせ').replace(/蓮/g, 'れん').replace(/湊/g, 'みなと').replace(/止水弁/g, 'しすいべん').replace(/（[^）]*）/g, '').replace(/[「」『』]/g, '').replace(/……/g, '、').replace(/―/g, '、').replace(/[\[［][^\]］]*[\]］]\s*/g, '');
const post = async (L) => { const v = VOICES[L.who]; const r = await fetch(`${API}/v1/jobs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'voice', params: { text: say(L.text), speaker: v.speaker, speed: v.speed } }) }); const j = await r.json(); if (!j.id) throw new Error(JSON.stringify(j)); return j.id; };
let n = 0;
const pending = [];
for (const L of todo) pending.push({ L, id: await post(L) });
for (const job of pending) {
  for (;;) {
    const j = await (await fetch(`${API}/v1/jobs/${job.id}`)).json();
    if (j.status === 'done') {
      const src = j.files[0].path, dst = path.join(out, `${job.L.id}.mp3`);
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-ac', '1', '-b:a', '56k', dst]);
      await fetch(`${API}/v1/jobs/${job.id}`, { method: 'DELETE' }).catch(() => {});
      if (++n % 20 === 0) console.log(`${n} / ${pending.length}`);
      break;
    }
    if (j.status === 'failed' || j.status === 'cancelled') { console.log('failed', job.L.id, j.error || ''); break; }
    await sleep(800);
  }
}
console.log(`made ${n}`);
const th = {};
for (const [k, text] of Object.entries(W)) { const f = `t-${k}.mp3`; if (fs.existsSync(path.join(out, f))) { let sec = text.length * 0.13; try { sec = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(out, f)]).toString().trim()) || sec; } catch {} th[k] = { text, file: f, sec: Math.round(sec * 10) / 10 }; } }
fs.writeFileSync(path.join(out, 'thoughts.json'), JSON.stringify(th, null, 1) + String.fromCharCode(10));
console.log('thoughts.json', Object.keys(th).length);
