#!/usr/bin/env node
/**
 * 月次の未完・再確認日到来を SessionStart と週次 launchd に知らせる。
 * 毎月3日(JST)以降、前月のレポート・記録・snapshot・点検・申し送りを確認する。
 * --due-key は起動対象月だけを出力（対象なしは空、検査エラーは非ゼロ）。
 * --month YYYY-MM はその月の完了検査、--ref は Git 上の証拠を読む。
 * 通常 exit 0=催促なし / 1=要実行。--month は 0=完了 / 1=未完。
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createOutput, runAsCli } from './lib/cli-run.mjs';
import { datasetDir } from './lib/datasets.mjs';
import { jstClock, todayJst } from './lib/jst-date.mjs';
import { reviewReader } from './lib/weekly-review-completion.mjs';
import { monthlyReviewCompletion, monthlyReviewDue } from './lib/monthly-review-completion.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const REVIEW_DIR = join(ROOT, datasetDir('business.review'));
export const DUE_DAY = 3;

/**
 * 純関数: 今（UTC ms）と「その月の月次レビューが在るか」の判定関数から、催促すべき月（YYYY-MM）を返す。
 * reviewed(month) は前月 month を対象にした月次レビューがあれば true。
 */
export function dueMonth(nowMs, reviewed) {
  const jst = jstClock(nowMs);
  if (jst.getUTCDate() < DUE_DAY) return null;
  const prev = new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
  return reviewed(prev) ? null : prev;
}

/** 記録のある月（period.startDate の YYYY-MM）の集合。 */
export function reviewedMonths(dir = REVIEW_DIR) {
  const months = new Set();
  if (!existsSync(dir)) return months;
  for (const f of readdirSync(dir)) {
    if (!/^review-.*\.json$/.test(f)) continue;
    try {
      const j = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      if (j.cadence === 'monthly' && typeof j.period?.startDate === 'string') months.add(j.period.startDate.slice(0, 7));
    } catch {
      /* 壊れた記録は数えない */
    }
  }
  return months;
}

/** session-start.mjs は import して run({ quiet: true }) を呼ぶ */
export async function run({ argv = [], quiet = false } = {}) {
  const out = createOutput({ quiet });
  const args = parseCliArgs({ month: { type: 'string' }, ref: { type: 'string' }, 'due-key': { type: 'boolean' }, json: { type: 'boolean' } }, argv);
  const reader = reviewReader(ROOT, args.ref);
  const month = args.month ?? dueMonth(Date.now(), () => false);
  const result = month ? monthlyReviewCompletion(month, reader) : null;
  const due = monthlyReviewDue(result, todayJst()) ? month : null;
  if (args.dueKey) out.log(due ?? '');
  else if (args.json) out.log(JSON.stringify({ due, ...result, checkedAt: new Date().toISOString() }));
  else if (args.month) out.log(`[monthly-review] ${month}: 対象 ${result.expected}・検査 ${result.checked}・未完 ${result.missing.length}\n${result.missing.join('\n')}`);
  else if (due) out.log(`[monthly-review-due] ${due} の月次レビューが未完または再確認日到来。週次の launchd が /monthly-review を自動起動する（手動でも実行可能）。`);
  return out.result(args.dueKey ? 0 : args.month ? (result.complete ? 0 : 1) : due ? 1 : 0);
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) runAsCli(run);
