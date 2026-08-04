// 「成功だけ数えて緑にする」を防ぐ判定（scripts/lib/report-honesty.mjs）を固定する。
//
// 背景: 2026-08-04 の 1 セッションで同じ形のバグを 3 本のスクリプトで踏んだ。
//   - gsc-request-indexing: 受理 10 件だけ出し button-not-found 3 件に触れず exit 0
//   - fetch-a8-ui-csv: 2 レポート中 1 本が落ちても status="ok" / exit 0
//   - check-a8-report-due: 構造的に必ず起きる crossCheck 超過を毎回 [要対応]（偽赤）
// 各スクリプトに判定を埋め込んでいたためテストできず、直しても再発しうる状態だった。
// ここで境界と語彙を固定する。
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyRun,
  collectFailedRequests,
  classifyCrossCheck,
  isMeasurementWindowAligned,
} from '../scripts/lib/report-honesty.mjs';

// ── classifyRun: 例外が出なかったことを ok と呼ばない ────────────────────────
test('classifyRun: 1 単位でも落ちれば partial（実際に踏んだ 1/2 のケース）', () => {
  const r = classifyRun([{ status: 'downloaded' }, { status: 'report-unreachable' }]);
  assert.equal(r.status, 'partial');
  assert.equal(r.failed.length, 1);
  assert.equal(r.okCount, 1);
  assert.equal(r.total, 2);
});

test('classifyRun: 全部成功なら ok', () => {
  assert.equal(classifyRun([{ status: 'downloaded' }, { status: 'downloaded' }]).status, 'ok');
});

test('classifyRun: dry-run と skipped は失敗ではない', () => {
  assert.equal(classifyRun([{ status: 'dry-run-ok' }, { status: 'skipped' }]).status, 'ok');
});

test('classifyRun: 未知の status を成功側へ倒さない', () => {
  // 新しい失敗理由が増えたとき、既定で「成功」に落ちると事故が静かに通る。
  const r = classifyRun([{ status: 'downloaded' }, { status: 'brand-new-failure-mode' }]);
  assert.equal(r.status, 'partial', '知らない status は失敗として扱うこと');
});

test('classifyRun: 対象 0 件は ok（「何もしなかった」と「全部失敗」を混同しない）', () => {
  const r = classifyRun([]);
  assert.equal(r.status, 'ok');
  assert.equal(r.total, 0, '呼び出し側が 0 件を明示できるよう total を返すこと');
});

// ── collectFailedRequests: 送れなかったものを漏らさない ──────────────────────
test('collectFailedRequests: button-not-found は失敗（実際に 3 件見落とした形）', () => {
  const items = [
    { slug: 'a', request: { status: 'accepted' } },
    { slug: 'b', request: { status: 'button-not-found' } },
    { slug: 'c', request: { status: 'already-indexed' } },
    { slug: 'd', request: { status: 'limit-reached' } },
    { slug: 'e', request: { status: 'unconfirmed' } },
  ];
  const failed = collectFailedRequests(items).map((i) => i.slug);
  assert.deepEqual(failed, ['b', 'e'], '受理文言を読めなかった unconfirmed も成功に数えない');
});

test('collectFailedRequests: request が無い項目は対象外（検査していない ≠ 失敗）', () => {
  assert.equal(collectFailedRequests([{ slug: 'a' }]).length, 0);
});

// ── classifyCrossCheck: 偽赤をやめつつ本物の異常は落とす ────────────────────
test('classifyCrossCheck: 超過が 50% 以下なら想定内（毎回 [要対応] にしない）', () => {
  // 2026-07 実測: サイト別 60 に対し超過 18＝30%
  const c = classifyCrossCheck({ exceeded: true, deltas: { clicks: { site: 60, delta: 18 } } });
  assert.equal(c.abnormal, false);
  assert.equal(Math.round(c.excessRatio * 100), 30);
});

test('classifyCrossCheck: 超過が 50% を超えたら異常', () => {
  const c = classifyCrossCheck({ exceeded: true, deltas: { clicks: { site: 60, delta: 40 } } });
  assert.equal(c.abnormal, true, '写像ミス・新たな共用案件を見逃さない');
});

test('classifyCrossCheck: 境界ちょうど（50%）は想定内', () => {
  const c = classifyCrossCheck({ exceeded: true, deltas: { clicks: { site: 60, delta: 30 } } });
  assert.equal(c.abnormal, false);
});

test('classifyCrossCheck: shortfall は大きさに関係なく常に異常', () => {
  // 取りこぼし＝自社案件の写像もれで、収益の帰属が失われる。超過とは別物。
  const c = classifyCrossCheck({ hasShortfall: true, exceeded: false });
  assert.equal(c.shortfall, true);
  assert.equal(c.abnormal, false, 'shortfall は abnormal(超過側) とは独立に扱う');
});

test('classifyCrossCheck: サイト別が 0 なら比を出さない（0 除算で誤判定しない）', () => {
  const c = classifyCrossCheck({ exceeded: true, deltas: { clicks: { site: 0, delta: 5 } } });
  assert.equal(c.excessRatio, null);
  assert.equal(c.abnormal, false);
});

test('classifyCrossCheck: crossCheck が無くても落ちない', () => {
  const c = classifyCrossCheck(undefined);
  assert.equal(c.shortfall, false);
  assert.equal(c.exceeded, false);
});

// ── isMeasurementWindowAligned: 窓違いの比を CTR と呼ばせない ────────────────
test('isMeasurementWindowAligned: 開始日が計測開始より前なら未整合', () => {
  // 実際のケース: 表示は 2026-07-25 実装、スナップショットは 2026-07-02 開始
  const r = isMeasurementWindowAligned('2026-07-02', '2026-07-25');
  assert.equal(r.aligned, false);
});

test('isMeasurementWindowAligned: 同日以降なら整合', () => {
  assert.equal(isMeasurementWindowAligned('2026-07-25', '2026-07-25').aligned, true);
  assert.equal(isMeasurementWindowAligned('2026-08-01', '2026-07-25').aligned, true);
});

test('isMeasurementWindowAligned: 開始日不明を整合と扱わない', () => {
  assert.equal(isMeasurementWindowAligned(null, '2026-07-25').aligned, false);
});
