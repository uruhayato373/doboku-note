#!/usr/bin/env node
/**
 * backlog-gate.mjs — 週次・月次レビューで回すバックログの関門の対象を出す（読み取り専用）。
 *
 * 使い方: npm run backlog-gate [-- --weekly | --monthly] [-- --json] [-- --today YYYY-MM-DD]
 *   --weekly  判断待ち（今決められる全件。[時期:] が来月以降のものは件数だけ）・期日切れ・直近 7 日の起票
 *   --monthly 時期の無い 🟢（全件）・起票から 90 日超・今月の 🔴🟡 の件数
 * 判定は scripts/lib/backlog-gate.mjs。読み手＝/weekly-review・/monthly-review（運営者に諮って台帳を直す）。
 * 終了コード: 0＝読めた / 2＝backlog が読めない（検査不成立）
 */
import { existsSync, readFileSync } from 'node:fs';
import { buildGate } from './lib/backlog-gate.mjs';

const TAG = '[backlog-gate]';
const PATH = '.claude/todo/backlog.md';
const TIER_JA = { high: '🔴', mid: '🟡', low: '🟢', hold: '🟣' };

function main() {
  const args = process.argv.slice(2);
  if (!existsSync(PATH)) {
    console.error(`${TAG} 検査不成立: ${PATH} が無い`);
    return 2;
  }
  const i = args.indexOf('--today');
  const today = i >= 0 ? args[i + 1] : new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const g = buildGate(readFileSync(PATH, 'utf8'), today);
  const scope = args.includes('--monthly') ? 'monthly' : args.includes('--weekly') ? 'weekly' : 'both';
  if (args.includes('--json')) {
    console.log(JSON.stringify(scope === 'both' ? g : { today: g.today, total: g.total, byTier: g.byTier, [scope]: g[scope] }, null, 2));
  } else {
    const line = (c) => `  ${c.id} ${TIER_JA[c.tier] ?? ''} ${c.title}${c.ageDays != null ? `（起票 ${c.ageDays} 日前）` : ''}${c.due ? ` 期日 ${c.due}` : ''}`;
    if (scope !== 'monthly') {
      console.log(`■ 週次: 今決められる判断待ち ${g.weekly.decisions.length} 件（全件を運営者に諮る）`);
      g.weekly.decisions.forEach((c) => console.log(line(c)));
      console.log(`■ 週次: 判断の時期が先の判断待ち ${g.weekly.decisionsLater.length} 件（その月に諮る）`);
      g.weekly.decisionsLater.forEach((c) => console.log(`${line(c)} 時期 ${c.when}`));
      console.log(`■ 週次: 期日切れ ${g.weekly.overdue.length} 件`);
      g.weekly.overdue.forEach((c) => console.log(line(c)));
      console.log(`■ 週次: 直近 7 日の起票 ${g.weekly.filedThisWeek.length} 件（重要度と時期を確かめる）`);
    }
    if (scope !== 'weekly') {
      console.log(`■ 月次: 時期の無い 🟢 ${g.monthly.lowWithoutWhen.length} 件（月を付けるか削除する）`);
      g.monthly.lowWithoutWhen.forEach((c) => console.log(line(c)));
      console.log(`■ 月次: 起票から 90 日超 ${g.monthly.stale.length} 件`);
      g.monthly.stale.forEach((c) => console.log(line(c)));
      console.log(`■ 月次: 今月の 🔴🟡 ${g.monthly.thisMonth} 件`);
    }
  }
  console.error(`${TAG} カード ${g.total} 件を実検査（${today}）`);
  return 0;
}

process.exitCode = main();
