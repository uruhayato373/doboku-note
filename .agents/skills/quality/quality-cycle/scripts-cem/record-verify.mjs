#!/usr/bin/env node
// 採点結果をアトミックに記録する 1 ステップ。
// merge-scores.mjs（scores.json 反映）+ state.status='verified' 更新 +
// build-progress-md.mjs（進捗 md 再生成）を 1 コマンドで実行し、
// scores.json と state.json のドリフトを構造的に防ぐ。
//
// Usage: node record-verify.mjs <results.json> [--wave G-8-reverify]
//   results.json: [{ slug, scores:{structure,mobile,principle,reference,linking}, weak_axes?, qualitative_comment? }, ...]

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  readScores,
  writeScores,
  readState,
  writeState,
  updatePageState,
} from './lib/quality-state.mjs';

const WEIGHTS = { structure: 0.3, mobile: 0.25, principle: 0.2, reference: 0.15, linking: 0.1 };
function computeWeighted(scores) {
  const hasZero = Object.values(scores).some((v) => v === 0);
  const raw = Object.entries(WEIGHTS).reduce((a, [k, w]) => a + (scores[k] || 0) * w, 0);
  return hasZero ? Math.min(raw, 1.0) : parseFloat(raw.toFixed(2));
}

const input = process.argv[2];
const waveFlag = process.argv.indexOf('--wave');
const wave = waveFlag !== -1 ? process.argv[waveFlag + 1] : 'G-8-reverify';
if (!input) {
  console.error('Usage: node record-verify.mjs <results.json> [--wave <label>]');
  process.exit(1);
}

const results = JSON.parse(readFileSync(input, 'utf-8'));
const scores = readScores();
const state = readState();
const nowIso = new Date().toISOString();

let merged = 0;
let skipped = 0;
const passed = [];
for (const r of results) {
  if (!r || !r.slug || !r.scores) {
    skipped++;
    continue;
  }
  const weighted = computeWeighted(r.scores);
  const weak =
    r.weak_axes && r.weak_axes.length
      ? r.weak_axes
      : Object.entries(r.scores)
          .filter(([, v]) => v <= 1)
          .map(([k]) => k);
  // (a) scores.json
  scores.pages[r.slug] = {
    slug: r.slug,
    scores: r.scores,
    weighted,
    weak_axes: weak,
    qualitative_comment: r.qualitative_comment || '',
    scored_at: nowIso,
  };
  // (b) state.json status='verified'（同一処理内で同期＝ドリフトなし）
  updatePageState(state, r.slug, 'verified', { weighted, wave });
  merged++;
  if (weighted >= 2.5) passed.push(r.slug);
}

writeScores(scores);
writeState(state);

// (c) 進捗 md 再生成
const here = dirname(fileURLToPath(import.meta.url));
try {
  execFileSync('node', [join(here, 'build-progress-md.mjs')], { stdio: 'inherit' });
} catch (e) {
  console.error('build-progress-md.mjs 失敗（scores/state は更新済み）:', e.message);
}

const avg = merged ? (results.filter((r) => r && r.scores).reduce((a, r) => a + computeWeighted(r.scores), 0) / merged).toFixed(2) : '0';
console.log(`\n記録完了: merged=${merged} skipped=${skipped} / 平均weighted=${avg} / ≥2.5達成=${passed.length}/${merged}`);
