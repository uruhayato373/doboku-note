#!/usr/bin/env node
/**
 * record-seo-build-summary.mjs — check-seo-build の 1 回分の結果（--summary-out）を、台帳 analysis.seo-build-summary の履歴へ足す（DN-0676）。
 *
 * CI の publish ジョブが develop を checkout したうえで呼ぶ。日付（JST）ごとに 1 行で、同じ日の再実行は置き換える。
 * 件数が同じなら書かない（時刻だけ違うコミットを作らない）。
 *
 * Usage: node scripts/record-seo-build-summary.mjs <run.json>
 * exit: 0 記録した／変化なしで書かなかった / 2 入力が読めない・形が違う（検査不成立。偽の成功にしない）
 */
import { readFileSync } from 'node:fs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { jstDayOf } from './lib/jst-date.mjs';
import { readDatasetIf } from './lib/dataset-io.mjs';
import { writeDataset } from './lib/dataset-write.mjs';
import { entryFromRun, recordEntry } from './lib/seo-build-summary.mjs';

const TAG = '[record-seo-build-summary]';
const ID = 'analysis.seo-build-summary';
const args = parseCliArgs({});
const input = args._[0];
if (!input) { console.error(`${TAG} 検査不成立: 入力の run.json を渡す`); process.exit(2); }

let run;
try { run = JSON.parse(readFileSync(input, 'utf8')); } catch (e) { console.error(`${TAG} 検査不成立: ${input} を読めない（${e.message}）`); process.exit(2); }
const numeric = ['sitemapUrls', 'checked', 'errors', 'warnings'];
if (typeof run.generatedAt !== 'string' || numeric.some((k) => !Number.isInteger(run[k]) || run[k] < 0)) {
  console.error(`${TAG} 検査不成立: ${input} が check-seo-build --summary-out の形でない`); process.exit(2);
}
if (run.checked === 0) { console.error(`${TAG} 検査不成立: 検査した URL が 0 件の結果は履歴に積まない`); process.exit(2); }

const doc = readDatasetIf(REPO_ROOT, ID) ?? { schemaVersion: 1, history: [] };
const entry = entryFromRun(run, jstDayOf(run.generatedAt));
const { history, changed } = recordEntry(doc.history, entry);
if (!changed) { console.error(`${TAG} ${entry.date} は件数が同じ（検査 ${entry.checked} / error ${entry.errors} / warn ${entry.warnings}）。書かない`); process.exit(0); }
const { file } = writeDataset(REPO_ROOT, ID, { ...doc, history });
console.error(`${TAG} ${file} に ${entry.date} を記録: 検査 ${entry.checked} / error ${entry.errors} / warn ${entry.warnings}（履歴 ${history.length} 日）`);
