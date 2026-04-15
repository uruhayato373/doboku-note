#!/usr/bin/env node
//
// scripts/log-rewrite.mjs
//
// keyword-rewriter サブエージェントが返す結果 JSON を
// .claude/state/quality-cycle-state.json の history 配列に記録する。
//
// 使い方:
//   node scripts/log-rewrite.mjs <results.json>
//
// results.json の形式（JSON 配列、各要素に wave ラベルを含める）:
//   [
//     {
//       "slug": "heat-island-effect",
//       "wave": "G-5-W1",
//       "applied_patterns": ["G","D"],
//       "added_sections": ["## 参考資料"],
//       "converted_tables": 0,
//       "before_chars": 1720,
//       "after_chars": 2451,
//       "added_chars": 731,
//       "lint_high_before": 0,
//       "lint_high_after": 0,
//       "lint_medium_before": 4,
//       "lint_medium_after": 0,
//       "mojibake": false
//     },
//     ...
//   ]
//
// 動作:
//   - 各 result について、page.history の中で wave が一致し action='rewritten' の
//     エントリを探す。見つかれば extras を in-place でマージ（date は温存）。
//   - 見つからなければ現在時刻で新規エントリを append。
//   - page.status は 'rewritten' に更新。

import { readFileSync } from 'node:fs';
import { readState, writeState } from './lib/quality-state.mjs';

const EXTRA_KEYS = [
  'applied_patterns',
  'added_sections',
  'converted_tables',
  'before_chars',
  'after_chars',
  'added_chars',
  'lint_high_before',
  'lint_high_after',
  'lint_medium_before',
  'lint_medium_after',
  'mojibake',
];

function pickExtras(r) {
  const extras = {};
  for (const key of EXTRA_KEYS) {
    if (r[key] !== undefined) extras[key] = r[key];
  }
  return extras;
}

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/log-rewrite.mjs <results.json>');
  process.exit(1);
}

const results = JSON.parse(readFileSync(input, 'utf-8'));
if (!Array.isArray(results)) {
  console.error('[log-rewrite] results.json must be a JSON array');
  process.exit(1);
}

const state = readState();
const nowIso = new Date().toISOString();

let merged = 0;
let appended = 0;
let skipped = 0;

for (const r of results) {
  if (!r || !r.slug || !r.wave) {
    skipped++;
    continue;
  }
  const { slug, wave } = r;
  if (!state.pages[slug]) {
    state.pages[slug] = { status: 'unscored', history: [] };
  }
  const page = state.pages[slug];
  page.status = 'rewritten';

  const extras = pickExtras(r);

  const existing = page.history.find(
    (h) => h.wave === wave && h.action === 'rewritten'
  );
  if (existing) {
    Object.assign(existing, extras);
    merged++;
  } else {
    page.history.push({
      date: nowIso,
      action: 'rewritten',
      wave,
      ...extras,
    });
    appended++;
  }
}

writeState(state);
console.log(
  `[log-rewrite] merged=${merged} appended=${appended} skipped=${skipped} ` +
    `total_pages=${Object.keys(state.pages).length}`
);
