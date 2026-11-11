#!/usr/bin/env node
/**
 * check-answer-marks — 過去問 MDX の正答と解説の ✅/❌ の整合を検査する（DN-0665）。判定は scripts/lib/answer-marks.mjs。
 *
 *   node scripts/check-answer-marks.mjs                 # content/site の過去問（解答・解説に正答行がある記事）すべて
 *   node scripts/check-answer-marks.mjs <article.mdx>…  # 指定した記事だけ（取り込み直後の確認）
 *   node scripts/check-answer-marks.mjs --json
 *
 * FAIL: 正答と印の集合が合わない／問い方の向きと印が逆／記述（①〜）の解説を選択肢の番号で書いている／
 *       解説の文の判定（正しい・誤り）と印が食い違う／ExamPoint に印がある／正答行から番号が読めない。
 * 記述式・全員得点・印の無い問題は件数だけ出す。
 * exit 0 = FAIL 0 / exit 1 = FAIL あり、または印を検査した問題が 0 件（検査不成立。指定した記事が過去問でないときも）
 *
 * npm run check-answer-marks — 過去問 MDX の正答と解説の ✅/❌ の整合（集合・問い方の向き・解説の文と印・記述（①〜）の解説の番号）を全記事で FAIL（引数に記事を渡すとその記事だけ）。✅＝記述が正しい・適当、否定の問いは正答だけ ❌。「該当しない」「許可を必要としない」「適用されない」「対象とならない」「含まれない」を選ぶ問いも否定として、問いに当てはまる選択肢＝正答だけ ❌（DN-0673）。罠: 「改善の必要がない」「どれにも当てはまらない」のように選ぶ対象が肯定の中身・語句の穴埋めになる問い、○×の組合せ・数を問う問いは向きを照合しない（集合だけ）。直した値を述べる「『3 cm以下』が正しい」は判定の語として読まない
 */
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { parseCliArgs } from './lib/cli-args.mjs';
import { listFiles } from './lib/fs-walk.mjs';
import { REPO_ROOT, SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';
import { checkArticleMarks } from './lib/answer-marks.mjs';

const NAME = 'check-answer-marks';
const args = parseCliArgs({ json: { type: 'boolean' } });
const explicit = args._.length > 0;
const files = explicit ? args._ : listFiles(SITE_CONTENT_ROOT, { ext: '.mdx' });

const articles = [];
for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  if (!explicit && !/\*\*正[答解]\s*[：:]/u.test(raw)) continue;
  const result = checkArticleMarks(raw);
  if (!explicit && result.questions === 0) continue;
  articles.push({ file: relative(REPO_ROOT, file), ...result });
}

const sum = (key) => articles.reduce((n, a) => n + a[key], 0);
const totals = {
  articles: articles.length,
  questions: sum('questions'),
  checked: sum('checked'),
  directionChecked: sum('directionChecked'),
  linesChecked: sum('linesChecked'),
  essay: sum('essay'),
  void: sum('void'),
  unmarked: sum('unmarked'),
  issues: articles.reduce((n, a) => n + a.issues.length, 0),
};
const empty = articles.filter((a) => a.checked === 0 && a.essay === 0 && a.void === 0 && a.unmarked === 0);

if (args.json) {
  process.stdout.write(JSON.stringify({ ...totals, articles: articles.filter((a) => a.issues.length) }, null, 2) + '\n');
} else {
  for (const a of articles) {
    if (!a.issues.length) continue;
    console.log(`\n${a.file}（${a.issues.length} 件）`);
    for (const issue of a.issues) console.log(`  - ${issue}`);
  }
  if (explicit) for (const a of empty) console.log(`  ! ${a.file}: 正答行のある問題が 0 問（過去問の記事でないか、書式を読めていない）`);
  console.log(`[${NAME}] 記事 ${totals.articles} / 問題 ${totals.questions}（印を照合 ${totals.checked}・うち問い方の向きまで照合 ${totals.directionChecked}・解説の文と印を照合 ${totals.linesChecked} 行）`);
  console.log(`[${NAME}] 照合しない: 記述式 ${totals.essay}・全員得点 ${totals.void}・番号付きの解説に印なし ${totals.unmarked}`);
}

if (totals.checked === 0 || (explicit && empty.length)) {
  console.error(`[${NAME}] 検査不成立: 印を照合した問題が ${totals.checked} 問`);
  process.exitCode = 1;
} else if (totals.issues) {
  console.error(`[${NAME}] FAIL ${totals.issues} 件`);
  process.exitCode = 1;
} else if (!args.json) {
  console.log(`[${NAME}] ✓ 正答と ✅/❌ は整合`);
}
