/**
 * backlog-gate.mjs — 週次・月次レビューで回すバックログの関門（判断待ち・期日切れ・新規・時期なし・長期滞留）の唯一の実装。
 * ---------------------------------------------------------------------------
 * 週次: 判断待ち（🟣）を全件、選択肢つきで運営者に諮る／期日切れを片付ける／前週の起票の重要度と時期を確かめる。
 * 月次: 時期の無い 🟢 を全件、月を付けるか削除する／起票から 90 日を超えたカードを残すか決める／今月の件数を見る。
 * 読み手: npm run backlog-gate（週次・月次スキル）・管理画面 戦略 ＞ レビュー。
 * ---------------------------------------------------------------------------
 */
import { parseBacklog, whenCovers } from './backlog-lib.mjs';

export const STALE_DAYS = 90;
export const NEW_DAYS = 7;

const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

/** backlog 本文と今日（YYYY-MM-DD）から関門の対象を組み立てる（純関数）。 */
export function buildGate(backlogText, today) {
  const cards = parseBacklog(backlogText).filter((c) => c.id);
  const month = today.slice(0, 7);
  const view = (c) => ({ id: c.id, title: c.title, tier: c.tier, when: c.when, due: c.due, filed: c.filed, ageDays: c.filed ? daysBetween(c.filed, today) : null });
  const byAgeDesc = (a, b) => (b.ageDays ?? 0) - (a.ageDays ?? 0);
  const decisions = cards.filter((c) => c.tier === 'hold').map(view).sort(byAgeDesc);
  return {
    today,
    total: cards.length,
    byTier: cards.reduce((a, c) => ((a[c.tier] = (a[c.tier] ?? 0) + 1), a), {}),
    weekly: {
      decisions,
      overdue: cards.filter((c) => c.due && c.due < today).map(view),
      filedThisWeek: cards.filter((c) => c.filed && daysBetween(c.filed, today) <= NEW_DAYS).map(view),
    },
    monthly: {
      lowWithoutWhen: cards.filter((c) => c.tier === 'low' && !c.when).map(view).sort(byAgeDesc),
      stale: cards.filter((c) => c.filed && daysBetween(c.filed, today) > STALE_DAYS).map(view).sort(byAgeDesc),
      thisMonth: cards.filter((c) => (c.tier === 'high' || c.tier === 'mid') && whenCovers(c.when, month)).length,
    },
  };
}
