/**
 * coconala-guards.test.mjs — ココナラ運用ガードの境界を固定する
 * ---------------------------------------------------------------------------
 * 2026-08-05 のココナラ大改編で入れた判定は手動の変異テストでしか確認していなかった。
 * ここで固定するのは「間違えると金銭・商品構成が壊れる」境界:
 *   - 実売中の商品を休止/アーカイブできてしまわないか
 *   - 一括復帰で**恒久廃止した商品まで復活**しないか（今日いちばん危なかった所）
 *   - 復帰忘れ（不在明けに戻さない）を検知できるか
 *   - 「取引0件だから緑」と「1件も見ていないから緑」を区別しているか
 * ---------------------------------------------------------------------------
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  selectTargets,
  selectAbsenceResume,
  checkPauseReasons,
  findOverdueResume,
  reconcileOrders,
  classifyReplyDeadlines,
  assessSnapshot,
} from '../scripts/lib/coconala-guards.mjs';

/** 本日のカタログを模したフィクスチャ */
const CATALOG = [
  { id: 'sv-listed', status: 'listed' },
  { id: 'sv-draft', status: 'draft' },
  { id: 'sv-retired', status: 'paused', pauseReason: 'retired', archivedAt: '2026-08-05' },
  { id: 'sv-absence', status: 'paused', pauseReason: 'absence', resumeOn: '2026-08-17' },
];

// ---------------------------------------------------------------- selectTargets

test('休止できるのは paused だけ（listed の実売商品は構造的に選べない）', () => {
  const { targets, rejected } = selectTargets(CATALOG, { mode: 'pause', ids: ['sv-listed', 'sv-absence'] });
  assert.deepEqual(targets.map((t) => t.id), ['sv-absence']);
  assert.equal(rejected.length, 1);
  assert.match(rejected[0], /sv-listed/);
});

test('再開できるのは listed だけ（カタログを先に戻す運用を強制する）', () => {
  const { targets, rejected } = selectTargets(CATALOG, { mode: 'resume', ids: ['sv-listed', 'sv-absence'] });
  assert.deepEqual(targets.map((t) => t.id), ['sv-listed']);
  assert.equal(rejected.length, 1);
});

test('アーカイブは retired 限定＝不在で休止中の商品を消さない', () => {
  const { targets, rejected } = selectTargets(CATALOG, { mode: 'archive', ids: ['sv-absence', 'sv-retired'] });
  assert.deepEqual(targets.map((t) => t.id), ['sv-retired']);
  assert.match(rejected[0], /アーカイブできるのは 'retired' だけ/);
});

test('--all-retired は absence を一切含まない', () => {
  const { targets } = selectTargets(CATALOG, { mode: 'archive', all: true });
  assert.deepEqual(targets.map((t) => t.id), ['sv-retired']);
});

test('カタログに無い id は拒否する', () => {
  const { targets, rejected } = selectTargets(CATALOG, { mode: 'pause', ids: ['nope'] });
  assert.equal(targets.length, 0);
  assert.match(rejected[0], /カタログに存在しない/);
});

// ------------------------------------------------------- selectAbsenceResume

test('不在復帰は absence だけを戻し retired は据え置く', () => {
  const r = selectAbsenceResume(CATALOG);
  assert.deepEqual(r.absent.map((s) => s.id), ['sv-absence']);
  assert.deepEqual(r.retired.map((s) => s.id), ['sv-retired']);
  assert.equal(r.blocked, false);
});

test('pauseReason 未設定の paused があれば中断する（意味が判別できない）', () => {
  const r = selectAbsenceResume([...CATALOG, { id: 'sv-unknown', status: 'paused' }]);
  assert.equal(r.blocked, true);
  assert.deepEqual(r.unmarked.map((s) => s.id), ['sv-unknown']);
});

// --------------------------------------------------------- checkPauseReasons

test('paused に理由が無ければ違反', () => {
  const v = checkPauseReasons([{ id: 'x', status: 'paused' }]);
  assert.equal(v.length, 1);
  assert.match(v[0], /pauseReason がありません/);
});

test('未知の理由は違反', () => {
  const v = checkPauseReasons([{ id: 'x', status: 'paused', pauseReason: 'vacation' }]);
  assert.match(v[0], /未知の pauseReason/);
});

test('listed に理由が残っていれば違反（復帰時の消し忘れ）', () => {
  const v = checkPauseReasons([{ id: 'x', status: 'listed', pauseReason: 'absence' }]);
  assert.match(v[0], /消し忘れ/);
});

test('正しい表明は違反ゼロ', () => {
  assert.deepEqual(checkPauseReasons(CATALOG), []);
});

// ---------------------------------------------------------- findOverdueResume

test('復帰予定日を過ぎて休止のままなら検知する', () => {
  const o = findOverdueResume(CATALOG, '2026-08-20');
  assert.equal(o.length, 1);
  assert.equal(o[0].id, 'sv-absence');
  assert.equal(o[0].overdueDays, 3);
});

test('復帰予定日の当日はまだ検知しない（境界）', () => {
  assert.deepEqual(findOverdueResume(CATALOG, '2026-08-17'), []);
});

test('retired は resumeOn を持たないので検知対象外', () => {
  const o = findOverdueResume([{ id: 'r', status: 'paused', pauseReason: 'retired', resumeOn: '2026-01-01' }], '2026-08-20');
  assert.deepEqual(o, []);
});

// ----------------------------------------------------------- reconcileOrders

const SNAP = [{ talkroomId: '1', serviceId: 'sv-a', priceYen: 2500, soldOn: '2026-08-04', listingText: 'x' }];

test('ココナラに取引があるのに記録が無ければ違反', () => {
  const { violations } = reconcileOrders(SNAP, []);
  assert.equal(violations.length, 1);
  assert.match(violations[0], /記録がありません/);
});

test('金額・商品・販売日の不一致をそれぞれ検出する', () => {
  const { violations } = reconcileOrders(SNAP, [
    { talkroomId: '1', serviceId: 'sv-b', priceYen: 9999, date: '2026-08-01' },
  ]);
  assert.equal(violations.length, 3);
});

test('一致していれば違反ゼロ', () => {
  const { violations } = reconcileOrders(SNAP, [
    { talkroomId: '1', serviceId: 'sv-a', priceYen: 2500, date: '2026-08-04' },
  ]);
  assert.deepEqual(violations, []);
});

test('talkroomId が無い記録は追跡不能として警告', () => {
  const { warnings } = reconcileOrders([], [{ serviceId: 'sv-a', date: '2026-08-04' }]);
  assert.match(warnings[0], /talkroomId がありません/);
});

// --------------------------------------------------- classifyReplyDeadlines

const NOW = Date.parse('2026-08-05T12:00:00+09:00');

test('返信期限を過ぎていれば expired', () => {
  const r = classifyReplyDeadlines([{ talkroomId: '1', replyDueAt: '2026-08-04T12:00' }], NOW);
  assert.equal(r[0].level, 'expired');
});

test('24時間以内なら urgent・それ以上は notice', () => {
  const r = classifyReplyDeadlines(
    [
      { talkroomId: '1', replyDueAt: '2026-08-06T00:00+09:00' },
      { talkroomId: '2', replyDueAt: '2026-08-10T00:00+09:00' },
    ],
    NOW
  );
  assert.deepEqual(r.map((x) => x.level), ['urgent', 'notice']);
});

test('納品予定日の登録で unreplied が false になっても、期限があれば surface する', () => {
  // 2026-08-05 実測: システムメッセージだけで未返信フラグが反転し、期限バナーは残った。
  // ここで守りたいのは「level が何か」ではなく **黙って除外されないこと**（偽陰性の防止）。
  const r = classifyReplyDeadlines([{ talkroomId: '1', unreplied: false, replyDueAt: '2026-08-06T16:00+09:00' }], NOW);
  assert.equal(r.length, 1, 'unreplied=false でも期限があれば surface されること');
  assert.equal(r[0].level, 'notice'); // 28時間後なので urgent(24h以内) ではない
  // 逆に、期限も未返信フラグも無いものは対象外
  assert.deepEqual(classifyReplyDeadlines([{ talkroomId: '2', unreplied: false, replyDueAt: null }], NOW), []);
});

test('未返信でも期限が採れていなければ unknown（黙って緑にしない）', () => {
  const r = classifyReplyDeadlines([{ talkroomId: '1', unreplied: true, replyDueAt: null }], NOW);
  assert.equal(r[0].level, 'unknown');
});

// ------------------------------------------------------------ assessSnapshot

test('snapshot 欠落・partial・陳腐化はいずれも検査不成立', () => {
  assert.equal(assessSnapshot(null, NOW).ok, false);
  assert.equal(assessSnapshot({ status: 'partial', fetchedAt: '2026-08-05T00:00:00Z' }, NOW).ok, false);
  assert.equal(assessSnapshot({ status: 'ok', fetchedAt: '2026-06-01T00:00:00Z' }, NOW).ok, false);
});

test('取引0件でも新しい snapshot なら検査は成立する（0件と未取得は別物）', () => {
  const r = assessSnapshot({ status: 'ok', fetchedAt: '2026-08-05T00:00:00Z', orders: [] }, NOW);
  assert.equal(r.ok, true);
});

test('--no-freshness では鮮度ゲートを外せる（pre-commit 用）', () => {
  const old = { status: 'ok', fetchedAt: '2026-06-01T00:00:00Z' };
  assert.equal(assessSnapshot(old, NOW, { checkFreshness: false }).ok, true);
});
