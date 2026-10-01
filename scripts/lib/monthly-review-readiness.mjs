/**
 * monthly-review-readiness.mjs — 月次レビューで「今月やること」を、人が上から順に見て進められる形に並べる（純関数）。
 * ---------------------------------------------------------------------------
 * 各段は state を持つ:
 *   done    済（データが確定・記録がある）
 *   waiting 待ち（外部の確定日・CI の取得を待つ。人がやることは無い）
 *   todo    やる（コマンドを実行すれば進む）
 *   human   人が判断・入力する（値を入れる・カードを決める）
 * 読み手: 管理画面 /metrics/business/monthly（tools/admin-app）・tests/monthly-review-readiness.test.mjs。
 * 手順の正本は .claude/skills/management/monthly-review/SKILL.md、証拠の判定は review-wiring.mjs（別物）。
 * ---------------------------------------------------------------------------
 */
import { isNoteMonthFinalized, noteSalesFinalizeDate } from './net-receipts.mjs';

const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const cell = (cells, metric) => (cells ?? []).find((c) => c.qualification === 'all' && c.metric === metric) ?? null;

/**
 * @param {object} input
 * @param {{ startDate: string, endDate: string }} input.period 対象月（前の暦月）
 * @param {string} input.today JST の YYYY-MM-DD
 * @param {Record<string, { finalized?: boolean }>} [input.salesMonths] sales-log.json の months
 * @param {string | null} [input.trafficFetchedAt] referrers-YYYY-MM.json の fetchedAt
 * @param {Array<{ qualification: string, metric: string, value: number | null, coverage: string }>} [input.cells] business-review のセル
 * @param {{ estimated?: boolean } | null} [input.kdpMonth] kdp-royalties.json の months[YYYY-MM]
 * @param {{ lowWithoutWhen: unknown[], stale: unknown[] } | null} [input.gate] backlog-gate の monthly
 * @param {Array<{ id: string, overdue?: boolean }>} [input.experiments] report の experiments
 * @param {{ record: string | null } | null} [input.due] report の due のうち monthly
 */
export function monthlyReadiness({ period, today, salesMonths = {}, trafficFetchedAt = null, cells = [], kdpMonth = null, gate = null, experiments = [], due = null }) {
  const month = period.startDate.slice(0, 7);
  const finalizeDate = noteSalesFinalizeDate(month);
  const noteFinal = isNoteMonthFinalized(month, today);
  const gscReady = addDays(period.endDate, 4);
  const steps = [];

  // 1. note の売上（翌月 2 日に確定）
  const sales = salesMonths[month];
  steps.push({
    key: 'note-sales', group: 'データの確定', label: 'note の売上を確定値で取る',
    ...(sales?.finalized ? { state: 'done', detail: `${month} は確定日以降に取得・検算済み` }
      : !noteFinal ? { state: 'waiting', detail: `note が ${finalizeDate} に確定するまで待つ` }
        : { state: 'todo', detail: '確定済み。取得して検算する', command: `node scripts/note-sales-fetch.mjs --month ${month} --commit` }),
  });

  // 2. note のアクセス（同じく翌月 2 日に確定）
  const trafficDay = trafficFetchedAt ? trafficFetchedAt.slice(0, 10) : null;
  steps.push({
    key: 'note-traffic', group: 'データの確定', label: 'note のアクセス（PV・流入元）を確定値で取る',
    ...(trafficDay && isNoteMonthFinalized(month, trafficDay) ? { state: 'done', detail: `${trafficDay} 取得（確定後）` }
      : !noteFinal ? { state: 'waiting', detail: `note が ${finalizeDate} に確定するまで待つ${trafficDay ? `（${trafficDay} 取得は確定前）` : ''}` }
        : { state: 'todo', detail: trafficDay ? `${trafficDay} 取得は確定前。取り直す` : 'まだ取得していない', command: 'npm run note-traffic-fetch -- --commit' }),
  });

  // 3. Google 検索・GA4（終了日から 4 日で確定し、CI の fetch-metrics（毎週金曜）が取る）
  const google = [cell(cells, 'organicUsers'), cell(cells, 'gscClicks')];
  const googleIn = google.every((c) => c && c.value !== null && c.coverage !== 'missing');
  steps.push({
    key: 'google', group: 'データの確定', label: 'Google 検索・GA4 の月の値が入る',
    ...(googleIn ? { state: 'done', detail: '月の値が入っている' }
      : today < gscReady ? { state: 'waiting', detail: `GSC は ${gscReady} に確定し、その後の金曜に CI が取る` }
        : { state: 'waiting', detail: '確定済み。次の金曜の CI（fetch-metrics）が取る' }),
  });

  // 4. KDP（確定値は翌月中旬以降）
  steps.push({
    key: 'kdp', group: 'データの確定', label: 'KDP ロイヤリティを確定値で取る',
    ...(kdpMonth && kdpMonth.estimated === false ? { state: 'done', detail: '確定値あり' }
      : { state: 'todo', detail: kdpMonth ? '推計値のみ。確定値が出たら取り直す（翌月中旬以降）' : 'まだ取得していない', command: `npm run kdp-report -- --month ${month}` }),
  });

  // 5. 受取額（NSM）。ココナラの控除後額だけは人が入れる
  const receipts = cell(cells, 'netReceipts');
  steps.push({
    key: 'net-receipts', group: '人の入力', label: '月の受取額を記録する（ココナラの控除後額は人が入れる）',
    ...(receipts && receipts.value !== null ? { state: 'done', detail: `記録済み（${receipts.coverage === 'complete' ? '確定' : '一部'}）` }
      : !(sales?.finalized) ? { state: 'waiting', detail: 'note の売上が確定してから記録する' }
        : { state: 'human', detail: 'ココナラの売上履歴で、クローズ日がこの月の手数料控除後の合計を確かめて入れる', command: `npm run record-net-receipts -- --month ${month} --coconala <円> --commit` }),
  });

  // 6. 実験の判定（再計測日が来たもの）
  const overdue = experiments.filter((e) => e.overdue);
  steps.push({
    key: 'experiments', group: '判断', label: '期日が来た実験を判定する（続ける・終える・延ばす理由）',
    ...(overdue.length === 0 ? { state: 'done', detail: '期日が来た実験は無い' }
      : { state: 'human', detail: `${overdue.map((e) => e.id).join('・')} の判定か延長理由を書く` }),
  });

  // 7. バックログの関門（時期の無い 🟢・90 日超）
  const low = gate?.lowWithoutWhen?.length ?? null;
  const stale = gate?.stale?.length ?? null;
  steps.push({
    key: 'backlog-gate', group: '判断', label: 'バックログの関門（時期の無い 🟢 に月を付けるか消す・90 日超を決める）',
    ...(low === null ? { state: 'todo', detail: 'バックログを読めなかった', command: 'npm run backlog-gate -- --monthly' }
      : low + stale === 0 ? { state: 'done', detail: '決めるカードは無い' }
        : { state: 'human', detail: `時期の無い 🟢 ${low} 件・90 日超 ${stale} 件を決める`, command: 'npm run backlog-gate -- --monthly' }),
  });

  // 8. レビューの記録とレポート
  steps.push({
    key: 'record', group: '記録', label: '判断を記録し、月次レポートを書く',
    ...(due?.record ? { state: 'done', detail: '記録あり（データが揃ったら確定へ訂正する）' }
      : { state: 'todo', detail: 'データが揃わなければ暫定で記録し、揃ってから訂正する', command: '/monthly-review' }),
  });

  const count = (s) => steps.filter((x) => x.state === s).length;
  return { month, finalizeDate, steps, summary: { done: count('done'), waiting: count('waiting'), todo: count('todo'), human: count('human'), total: steps.length } };
}
