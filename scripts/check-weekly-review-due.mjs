#!/usr/bin/env node
/**
 * check-weekly-review-due.mjs — 週次レビュー（ローカル実行）の催促 surfacer（SessionStart 用）
 * ---------------------------------------------------------------------------
 * 週次レビューは運営者の指示で対話セッションが実行する（2026-11-08 に土曜の自動実行をやめた）。
 * 抜けた週は月曜以降に回せば足りるので赤落ちはさせず、土曜 09:00 JST を過ぎて
 * docs/reviews/weekly/YYYY-Www-review.md が無ければセッション開始時に 1 行で知らせるだけにする（唯一の知らせ）。
 *
 * 判定（JST）:
 *   - 土曜 09:00 より前 … 対象外（exit 0・無言）
 *   - 土曜 09:00 以降〜日曜 … 今週（ISO 週）の review が無ければ DUE（exit 1・1 行）
 *   - 月曜以降 … 先週分が無ければ DUE（guard と同じ対象）。今週分はまだ問わない
 *
 * 使い方:
 *   node scripts/check-weekly-review-due.mjs          # exit 0 = 催促なし / 1 = DUE
 *   node scripts/check-weekly-review-due.mjs --json
 *
 * npm run check-weekly-review-due — 週次レビューの未作成を知らせる（土曜 09:00 JST 以降に今週分、月〜金は先週分の *-review.md が無ければ exit 1・SessionStart フックが呼ぶ唯一の知らせ。レビューは運営者の指示で実行し、抜けた週は後日でよい。最新レビューに <!-- weekly-review:pending-questions --> があれば諮問待ちとして 1 行）
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createOutput, runAsCli } from './lib/cli-run.mjs';
import { jstClock } from './lib/jst-date.mjs';
import { isoWeekKey } from './lib/review-week.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const DUE_DOW = 6;      // 土曜
const DUE_HOUR = 9;     // 09:00 JST

/** ISO 8601 の週番号（YYYY-Www）。d は「JST に +9h した Date」を渡す（UTC メソッドで読む）。換算は review-week.mjs */
export const isoWeek = (d) => isoWeekKey(d.toISOString().slice(0, 10));

/**
 * 純関数: 今（UTC ms）と「review が在るか」の判定関数から、催促すべき週番号を返す（無ければ null）。
 * exists(weekId) は同期関数。
 */
export function dueWeek(nowMs, exists) {
  const jst = jstClock(nowMs);
  const dow = jst.getUTCDay(); // 0=日 … 6=土（JST）
  const hour = jst.getUTCHours();
  const thisWeek = isoWeek(jst);
  if (dow === DUE_DOW && hour >= DUE_HOUR) return exists(thisWeek) ? null : thisWeek;
  if (dow === 0) return exists(thisWeek) ? null : thisWeek; // 日曜（ISO 週は月曜始まりなので日曜は今週）
  if (dow >= 1 && dow <= 5) {
    const lastWeek = isoWeek(new Date(jst.getTime() - 7 * 86_400_000));
    return exists(lastWeek) ? null : lastWeek;
  }
  return null; // 土曜 09:00 前
}

export const PENDING_MARK = '<!-- weekly-review:pending-questions -->';
/** 最新の週次レビューに諮問待ちの印があればそのファイル名、無ければ null */
export function pendingQuestionsReview(dir) {
  if (!existsSync(dir)) return null;
  const latest = readdirSync(dir).filter((f) => /^\d{4}-W\d{2}-review\.md$/.test(f)).sort().at(-1);
  return latest && readFileSync(join(dir, latest), 'utf8').includes(PENDING_MARK) ? latest : null;
}

/** session-start.mjs は import して run({ quiet: true }) を呼ぶ（DN-0236・子の node を立てない） */
export async function run({ argv = [], quiet = false } = {}) {
  const out = createOutput({ quiet });
  const json = argv.includes('--json');
  const exists = (w) => existsSync(join(ROOT, 'docs', 'reviews', 'weekly', `${w}-review.md`));
  const due = dueWeek(Date.now(), exists);
  if (json) { out.log(JSON.stringify({ due, checkedAt: new Date().toISOString() })); }
  else if (due) { out.log(`[weekly-review-due] ${due} の週次レビューが未作成（土曜 09:00 JST 以降）。運営者の指示で /weekly-review を実行する（後日でよい・完了後 /plan-weekly で weekly.md を更新）`); }
  // 以前のヘッドレスの週次レビューが残した判断待ちの印。印が残っている間は対話セッションで諮る
  const pending = pendingQuestionsReview(join(ROOT, 'docs', 'reviews', 'weekly'));
  if (!json && pending) out.log(`[weekly-review-due] ${pending} に諮問待ちがある（週次レビューが残した判断待ち）。「## バックログの関門」の候補を運営者に諮り、台帳を直して印（${PENDING_MARK}）を消す`);
  return out.result(due ? 1 : 0);
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) runAsCli(run);
