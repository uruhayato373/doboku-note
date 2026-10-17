#!/usr/bin/env node
// Mac launchd と月曜 CI が同じ完了契約を使う。最新週だけ保持する方針に対応。
import { appendFileSync } from 'node:fs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { addDays, isoWeekKey } from './lib/review-week.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { reviewReader, weeklyReviewCompletion } from './lib/weekly-review-completion.mjs';

const args = parseCliArgs({ week: { type: 'string' }, ref: { type: 'string' }, json: { type: 'boolean' } });
try {
  const reader = reviewReader(REPO_ROOT, args.ref);
  const expectedWeek = args.week ?? isoWeekKey(addDays(todayJst(), -7));
  const latest = reader.list('docs/reviews/weekly').map((p) => /\/(\d{4}-W\d{2})-review\.md$/.exec(p)?.[1]).filter(Boolean).sort().at(-1);
  const week = args.week ?? (latest && latest >= expectedWeek ? latest : expectedWeek);
  const result = weeklyReviewCompletion(week, reader);
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else {
    const lines = [`[weekly-review] ${week}: 対象 ${result.expected}・検査 ${result.checked}・未完 ${result.missing.length}${result.provisional ? '（事業データは暫定）' : ''}`, ...result.missing.map((m) => `- ${m}`)];
    console.log(lines.join('\n'));
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
  }
  process.exitCode = result.complete ? 0 : 1;
} catch (e) {
  console.error(`[weekly-review] 検査不成立: ${e.message}`);
  process.exitCode = 2;
}
