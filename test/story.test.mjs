// 1.5.0 (3rd play test, 2026-11-22): what the third play test asked of the data, kept true.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const text = (x) => JSON.stringify(x);

// #10 「何故キメラっぽい形になったかの説明が要所要所で」: record fragments on the way say who made her (葛城, 合成標本), when (the 1999 flood)
// and who she was (早苗), one fragment per stretch of the passage, before the chase
test('#10 the record fragments explain the chimera along the way', () => {
  const docs = J('data/docs.json').docs || J('data/docs.json');
  const by = Object.fromEntries(docs.map((d) => [d.id, d]));
  for (const id of ['DOC_NURSE', 'DOC_KATSU', 'DOC_FLOOD']) assert.ok(by[id], `${id} is in docs.json`);
  const all = text(docs) + text(J('data/talk.json')) + text(J('data/things.json'));
  for (const w of ['葛城', '合成', '早苗']) assert.ok(all.includes(w), `the fragments name ${w}`);
  assert.ok(/1999|平成十一年/.test(all), 'the fragments date the flood');
  const rooms = new Set(['DOC_NURSE', 'DOC_KATSU', 'DOC_FLOOD'].map((id) => by[id].room));
  assert.ok(rooms.size === 3, 'three different rooms of the passage');
});

// #14 「最後の部屋で色々調べられるように」: the last room (霊安室) has many things to look at
test('#14 the last room has many things to look at', () => {
  const things = J('data/things.json').things || J('data/things.json');
  const n = things.filter((t) => t.room === 'REIAN').length;
  assert.ok(n >= 6, `REIAN has ${n} things (needs 6+)`);
});

// #15 「ホルマリンずけも２０パターンほど」: twenty different jar patterns placed in the dot version
test('#15 twenty formalin jar patterns are placed', () => {
  const props = J('dot/data/props.json').props;
  const kinds = new Set(props.filter((p) => /^jar-\d\d$/.test(p.k)).map((p) => p.k));
  assert.equal(kinds.size, 20);
  const idx = J('dot/assets/stacks/index.json');
  for (const k of kinds) assert.ok(idx[k], `${k} has a stack`);
});

// #19 「結末が短い…外で待っていた人たちのその後も」: every ending is long, names the people outside, and has later pictures
test('#19 the endings are long and tell what became of everyone', () => {
  const E = J('data/endings.json').endings || J('data/endings.json');
  for (const e of E) {
    const t = text(e);
    const n = String(e.text).split('\n').length;
    assert.ok(n >= 8, `${e.id}: ${n} lines (needs 8+)`);
    for (const who of ['ひなた', '黒木']) assert.ok(t.includes(who), `${e.id} tells of ${who}`);
    assert.ok(Array.isArray(e.scenes) && e.scenes.length >= 2, `${e.id} has 2+ later pictures`);
    for (const s of e.scenes) assert.ok(fs.existsSync(s.photo.replace(/^\.?\//, '')), `${e.id}: ${s.photo} exists`);
  }
});
