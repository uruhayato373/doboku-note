#!/usr/bin/env node
/**
 * check-monthly-review-due.mjs — 月次レビュー（ローカル実行）の催促 surfacer（SessionStart 用）
 * ---------------------------------------------------------------------------
 * 月次レビュー（/monthly-review）は月初にローカルで回す。バックログの「終わらなかったカードを翌月へ回す」
 * （npm run roll-backlog-when）と展開の判断（npm run qualification-market）の見直しはこの手順の中にあるので、
 * 回し忘れると月間計画がずれたまま進む。週次（check-weekly-review-due）と同じく「忘れる」を止める。
 *
 * 判定（JST）: 毎月 DUE_DAY 日以降、前月を対象にした月次レビューの記録
 *   （.claude/state/metrics/business/review-*.json のうち cadence:"monthly" かつ period.startDate が前月 1 日）
 *   が無ければ DUE（exit 1・1 行）。DUE_DAY より前は無言（月初の数日は計測の確定待ち）。
 *
 * 使い方:
 *   node scripts/check-monthly-review-due.mjs          # exit 0 = 催促なし / 1 = DUE
 *   node scripts/check-monthly-review-due.mjs --json
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createOutput, runAsCli } from './lib/cli-run.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REVIEW_DIR = join(ROOT, '.claude/state/metrics/business');
export const DUE_DAY = 3;

/**
 * 純関数: 今（UTC ms）と「その月の月次レビューが在るか」の判定関数から、催促すべき月（YYYY-MM）を返す。
 * reviewed(month) は前月 month を対象にした月次レビューがあれば true。
 */
export function dueMonth(nowMs, reviewed) {
  const jst = new Date(nowMs + 9 * 3600 * 1000);
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
  const months = reviewedMonths();
  const due = dueMonth(Date.now(), (m) => months.has(m));
  if (argv.includes('--json')) out.log(JSON.stringify({ due, reviewedMonths: [...months].sort(), checkedAt: new Date().toISOString() }));
  else if (due) out.log(`[monthly-review-due] ${due} の月次レビューが未実施（毎月 ${DUE_DAY} 日以降）。対話セッションで /monthly-review を実行する（終わらなかったカードを npm run roll-backlog-when で翌月へ回す手順を含む）`);
  return out.result(due ? 1 : 0);
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) runAsCli(run);
