#!/usr/bin/env node
/**
 * check-growth-triage.mjs — 週次レビューが計測を「確実に」反映したかの機械ゲート（月曜の weekly-review-guard が実行）。
 *
 * 検査（最新の機会ダイジェストと最新の週次レビューに対して）:
 *   1. ダイジェストの表示対象がすべて triage-log で処分されている（backlog / 実験 / watchword / 裁定 / 束ね / 却下 / 保留）
 *   2. 最新の週次レビュー本文にダイジェストのマーカー `<!-- growth-digest:YYYY-Www -->` がある（計測を埋め込んだ証跡）
 *
 * 「## 来週への申し送り」の振り分け先（DN / 定常 / #Issue / EXP）は scripts/check-handoff-extraction.mjs が
 * pre-commit で検査する唯一の実装（DN-0230）。ここでは重ねて判定しない。
 *
 * なぜ: guard はレビューファイルの実在しか見ておらず、計測が surface した機会が起票されないまま
 * 翌週へ流れても誰も気づかなかった（W37→W38 で同じ Must が 2 週連続未達）。
 *
 * Usage: node scripts/check-growth-triage.mjs [--json]
 * exit: 0 すべて反映 / 1 未処分・未反映あり / 2 検査不成立（ダイジェストやレビューが無い・ダイジェストが古い）
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pendingItems } from './lib/growth-triage.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[check-growth-triage]';
const MAX_DIGEST_AGE_DAYS = 10;

/** 検査本体（純関数）。 */
export function checkTriage({ digest, log, review, reviewName, now = Date.now() }) {
  const violations = [];
  const age = Math.floor((now - Date.parse(digest.generatedAt)) / 86400000);
  if (!(age >= 0 && age <= MAX_DIGEST_AGE_DAYS)) return { invalid: `ダイジェスト ${digest.week} が ${age} 日前（${MAX_DIGEST_AGE_DAYS} 日超）＝fetch-metrics の停止を疑う` };
  const pending = pendingItems(digest, log);
  for (const i of pending) violations.push(`未処分: ${i.id} [${i.category}] ${i.title}`);
  if (!review.includes(`<!-- growth-digest:${digest.week} -->`)) violations.push(`${reviewName} に計測ダイジェスト ${digest.week} が埋め込まれていない（\`npm run growth-digest -- --print\` の出力を貼る）`);
  return { week: digest.week, surfaced: digest.surfaced.length, triaged: digest.surfaced.length - pending.length, violations };
}

function latest(dir, re) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => re.test(f)).sort();
  return files.at(-1) ?? null;
}

function main() {
  const growth = join(ROOT, '.claude/state/metrics/growth');
  const reviews = join(ROOT, 'docs/reviews/weekly');
  const digestName = latest(growth, /^digest-\d{4}-W\d{2}\.json$/);
  const reviewName = latest(reviews, /^\d{4}-W\d{2}-review\.md$/);
  if (!digestName || !reviewName) {
    console.error(`${TAG} 検査不成立: ${!digestName ? '機会ダイジェスト（growth/digest-*.json）' : '週次レビュー（docs/reviews/weekly/*-review.md）'}が無い`);
    return 2;
  }
  const digest = JSON.parse(readFileSync(join(growth, digestName), 'utf8'));
  const logPath = join(growth, 'triage-log.json');
  const log = existsSync(logPath) ? JSON.parse(readFileSync(logPath, 'utf8')) : { entries: [] };
  const r = checkTriage({ digest, log, review: readFileSync(join(reviews, reviewName), 'utf8'), reviewName });
  if (process.argv.includes('--json')) console.log(JSON.stringify({ digest: digestName, review: reviewName, ...r }, null, 2));
  if (r.invalid) { console.error(`${TAG} 検査不成立: ${r.invalid}`); return 2; }
  console.error(`${TAG} ${digestName} × ${reviewName}: 表示 ${r.surfaced} 件中 処分済み ${r.triaged} を実検査 / 違反 ${r.violations.length}`);
  for (const v of r.violations) console.error(`  ✗ ${v}`);
  if (r.violations.length) {
    console.error(`${TAG} 次: ローカルで \`npm run growth-triage -- list\` → 判断を .tmp/ に書き \`apply --decisions <file> --commit\`、レビュー本文へダイジェストを貼って push する`);
    return 1;
  }
  console.error(`${TAG} ✓ 計測ダイジェストの全件処分とレビューへの反映を確認`);
  return 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) process.exitCode = main();
