#!/usr/bin/env node
//
// scripts/merge-scores.mjs
//
// civil-construction-review サブエージェントが返す評価結果 JSON を
// .claude/state/civil-quality-scores.json にマージする。
//
// 使い方:
//   node scripts/merge-scores.mjs <results.json>
//
// results.json の形式（JSON 配列 or 1オブジェクト）:
//   [
//     {
//       "slug": "textbook-crane",
//       "group": "textbook",
//       "scores": {"structure":3,"principle":3,"mobile":1,"figures":1,"reference":2},
//       "weak_axes": ["mobile","figures"],
//       "qualitative_comment": "..."
//     },
//     ...
//   ]
//
// 動作:
//   - 各 result について weighted を civil-construction-review の重みで再計算
//   - civil-quality-scores.json の pages[slug] に上書き
//   - group も一緒に保存

import { readFileSync } from 'node:fs';
import { readScores, writeScores, computeWeighted } from './lib/civil-state.mjs';

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/merge-scores.mjs <results.json>');
  process.exit(1);
}

let results = JSON.parse(readFileSync(input, 'utf-8'));
if (!Array.isArray(results)) {
  results = [results];
}

const scoresState = readScores();
const nowIso = new Date().toISOString();

let merged = 0;
let skipped = 0;
for (const r of results) {
  if (!r || !r.slug || !r.scores) {
    skipped++;
    continue;
  }
  const s = r.scores;
  const weighted = computeWeighted(s);
  const weak =
    r.weak_axes && r.weak_axes.length
      ? r.weak_axes
      : Object.entries(s)
          .filter(([, v]) => v <= 1)
          .map(([k]) => k);
  scoresState.pages[r.slug] = {
    slug: r.slug,
    group: r.group || null,
    scores: s,
    weighted,
    weak_axes: weak,
    qualitative_comment: r.qualitative_comment || '',
    scored_at: nowIso,
  };
  merged++;
}

writeScores(scoresState);
console.log(
  `merged=${merged} skipped=${skipped} total_scored=${Object.keys(scoresState.pages).length}`,
);
