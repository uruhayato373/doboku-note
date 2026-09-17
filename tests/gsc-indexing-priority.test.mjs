import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIndexingPriority, classifyInspection, evaluateIndexingDue, toPath } from '../scripts/lib/gsc-indexing-priority.mjs';

const S = 'https://doboku-note.com';
const idx = (verdict, coverage_state) => ({ verdict, coverage_state });
const batch = [
  { url: `${S}/exam/a/indexed`, index: idx('PASS', '送信して登録されました') },
  { url: `${S}/exam/a/hot`, index: idx('NEUTRAL', '検出 - インデックス未登録') },
  { url: `${S}/exam/a/dup`, index: idx('NEUTRAL', '重複しています。Google により、ユーザーがマークしたページとは異なるページが正規ページとして選択されました') },
  { url: `${S}/standards/x/cold`, index: idx('NEUTRAL', '検出 - インデックス未登録') },
  { url: `${S}/exam/a/cold`, index: idx('NEUTRAL', 'URL が Google に認識されていません') },
  { url: `${S}/exam/a/recent`, index: idx('NEUTRAL', '検出 - インデックス未登録') },
];
const legacy = new Map([['/docs/a-hot', '/exam/a/hot'], ['/docs/a-dup', '/exam/a/dup']]);
const gsc = [
  { keys: [`${S}/docs/a-hot`], clicks: 1, impressions: 40 },
  { keys: [`${S}/exam/a/hot`], clicks: 0, impressions: 30 },
  { keys: [`${S}/docs/a-dup`], clicks: 3, impressions: 12 },
  { keys: [`${S}/exam/a/indexed`], clicks: 9, impressions: 900 },
];
const now = new Date('2026-09-17T00:00:00Z');

test('coverage_state を 5 分類にする', () => {
  assert.equal(classifyInspection(idx('PASS', 'x')), 'indexed');
  assert.equal(classifyInspection(idx('NEUTRAL', '検出 - インデックス未登録')), 'discovered');
  assert.equal(classifyInspection(idx('NEUTRAL', 'クロール済み - インデックス未登録')), 'crawled-not-indexed');
  assert.equal(toPath(`${S}/exam/a/hot/?utm=1`), '/exam/a/hot');
});

test('登録済みを除き、旧 /docs と新 URL の表示を合算して表示順に並べ、直近リクエスト済みは cooldown で外す', () => {
  const runs = [{ collectedAt: '2026-09-15T00:00:00Z', accepted: 1, acceptedSlugs: ['/exam/a/recent'] }];
  const { counts, items } = buildIndexingPriority({ batchResults: batch, gscPageRows: gsc, legacyRoutes: legacy, requestRuns: runs, now });
  assert.deepEqual(counts, { inspected: 6, indexed: 1, candidates: 4, withDemand: 2, cooledDown: 1 });
  assert.deepEqual(items.map((i) => i.path), ['/exam/a/hot', '/exam/a/dup', '/exam/a/cold', '/standards/x/cold']);
  assert.equal(items[0].impressions, 70);
  assert.equal(items[1].clicks, 3);
  assert.equal(items[1].status, 'duplicate');
});

test('cooldown を過ぎたリクエスト済み URL は候補に戻る', () => {
  const runs = [{ collectedAt: '2026-08-01T00:00:00Z', accepted: 1, acceptedSlugs: ['/exam/a/recent'] }];
  const { counts } = buildIndexingPriority({ batchResults: batch, gscPageRows: gsc, legacyRoutes: legacy, requestRuns: runs, now });
  assert.equal(counts.cooledDown, 0);
  assert.equal(counts.candidates, 5);
});

test('DUE 判定: 順位表なし=検査不能で DUE、表示実績あり×7 日無送信で DUE、送信直後は OK、候補 0 は OK', () => {
  assert.equal(evaluateIndexingDue({ priority: null, now }).due, true);
  const priority = { counts: { withDemand: 12 } };
  assert.equal(evaluateIndexingDue({ priority, requestRuns: [], now }).due, true);
  const old = [{ collectedAt: '2026-09-01T00:00:00Z', accepted: 10 }];
  assert.equal(evaluateIndexingDue({ priority, requestRuns: old, now }).due, true);
  const fresh = [{ collectedAt: '2026-09-15T00:00:00Z', accepted: 10 }];
  const v = evaluateIndexingDue({ priority, requestRuns: fresh, now });
  assert.equal(v.due, false);
  assert.equal(v.daysSinceAccepted, 2);
  assert.equal(evaluateIndexingDue({ priority: { counts: { withDemand: 0 } }, requestRuns: [], now }).due, false);
});
