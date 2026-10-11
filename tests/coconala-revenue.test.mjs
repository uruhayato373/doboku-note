/**
 * coconala-revenue.test.mjs — ココナラ売上履歴の読み取り（手数料控除後・クローズ日・おひねり・累積売上との一致）を固定する
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCoconalaRevenue, reconcileRevenue } from '../scripts/lib/coconala-revenue.mjs';

// 2026-10-11 の実画面の形（サービス名は伏せた）
const PAGE = [
  '売上管理・振込申請', '売上金残高', '11,700 円', '売上実績', 'サービス', '今月の売上', '0 円', '累積売上', '21,450 円', '累積売上', '0 円',
  '売上履歴', '売上データを全件CSVダウンロードする', 'サービス',
  '2026/09/25 21:02', 'トークルームNo：18351970', 'おひねり サービスA', '7,020 円',
  '2026/09/25 21:02', 'トークルームNo：18351970', 'サービスA', '4,680 円',
  '2026/09/10 14:00', 'トークルームNo：18194267', 'サービスB', '振込済み', '1,950 円',
  '2026/08/10 07:00', 'トークルームNo：18082691', 'サービスB', '振込済み', '1,950 円',
  '2026/08/08 12:00', 'トークルームNo：18091375', 'サービスC', '振込済み', '5,850 円',
  '1',
].join('\n');

test('売上履歴の 1 件ごとに計上日・トークルーム・おひねりか・控除後の金額を読み、名前は返さない', () => {
  const r = parseCoconalaRevenue(PAGE);
  assert.equal(r.cumulativeYen, 21450);
  assert.deepEqual(r.rows[0], { closedAt: '2026-09-25', talkroomId: '18351970', kind: 'tip', netYen: 7020 });
  assert.deepEqual(r.rows.map((x) => x.kind), ['tip', 'service', 'service', 'service', 'service']);
  assert.ok(!JSON.stringify(r).includes('サービスA'));
  assert.deepEqual(reconcileRevenue(r), { ok: true, sum: 21450, expected: 21450 });
});

test('行が欠けたら累積売上と合わず、書かない側に倒れる', () => {
  const r = parseCoconalaRevenue(PAGE.replace('2026/08/08 12:00', 'x'));
  assert.equal(reconcileRevenue(r).ok, false);
  assert.equal(reconcileRevenue(parseCoconalaRevenue('')).ok, false);
});
