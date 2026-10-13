/**
 * search-improvement.test.mjs — 検索改善の一周（起票→本番反映→計測→判定）と、カード⇄実験の結び付きの検査を固定する
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExperiment, cardBody, closeExperiment, dispatchIndex, linkErrors, nextExperimentId, phaseOf, startExperiment, syncPlan, withMarker, withNoneMarker,
} from '../scripts/lib/search-improvement.mjs';
import { completeOn, measureWindows, specErrors, sumGscPages } from '../scripts/lib/experiment-measure.mjs';
import { judgeExperiment } from '../scripts/lib/experiment-due.mjs';
import { firstDeployContaining, isProductionDeploy, DEPLOY_WORKFLOW_PATH } from '../scripts/lib/production-deploys.mjs';
import { parseBacklog } from '../scripts/lib/backlog-lib.mjs';
import { Experiments } from '../scripts/lib/dataset-schemas.mjs';

const measure = { metric: 'gsc.position', direction: 'decrease', preDays: 28, postDays: 28, lagDays: 3, minEffect: 0.1, minVolume: 10 };
const bands = { top: '10位以内', striking: '11〜30位' };
const cluster = { id: 'qualification', label: '資格名' };
const candidate = { page: '/exam/x/guide/y', impressions: 20, clicks: 1, bestPosition: 12, queries: [{ query: '技術士 難易度', position: 12, impressions: 14, clicks: 1 }, { query: '技術士 合格率', position: 18, impressions: 6, clicks: 0 }] };
const now = new Date('2026-10-13T03:00:00Z');
const make = (over = {}) => ({ ...buildExperiment({ id: 'EXP-030', card: 'DN-0900', cluster, candidate, period: { startDate: '2026-09-09', endDate: '2026-10-06' }, source: 'data/gsc/reports/2026-10-10.json#page-query', measure, bands, now }), ...over });
const ledger = (experiments) => ({ version: 1, updated_at: '2026-10-13T03:00:00.000Z', experiments });

test('起票する実験は台帳の型と measure 仕様に通り、対象ページ×起票時の検索語を測る', () => {
  const e = make();
  assert.deepEqual(specErrors(e.measure), []);
  assert.deepEqual(e.measure.scope, { pages: ['/exam/x/guide/y'], queries: ['技術士 難易度', '技術士 合格率'] });
  assert.equal(e.status, 'proposed');
  assert.deepEqual(e.searchStrategy, { cluster: 'qualification', page: '/exam/x/guide/y', card: 'DN-0900' });
  assert.equal(Experiments.safeParse(ledger([e])).success, true);
  assert.equal(Experiments.safeParse(ledger([{ ...e, searchStrategy: undefined }])).success, false, 'search-strategy の実験は対象が必須');
  assert.equal(nextExperimentId([{ id: 'EXP-009' }, { id: 'EXP-021' }, { id: 'x' }]), 'EXP-022');
});

test('カードの本文に実験の行が入り、既存カードへの結び付け・なし（理由）は改行コードを保つ', () => {
  const body = cardBody({ expId: 'EXP-030', cluster, candidate, period: { startDate: '2026-09-09', endDate: '2026-10-06' }, bands, todo: 'title を直す', measure });
  assert.match(body, /^\*\*起点\*\*: 検索キーワード戦略/);
  assert.match(body, /^\*\*実験\*\*: EXP-030/m);
  const text = '## 🟡\r\n\r\n### [DN-0900] t\r\nタグ: [領域:サイト]\r\n\r\n**起点**: x\r\n';
  const out = withMarker(text, 6, 'EXP-031');
  assert.ok(out.includes('\r\n\r\n**実験**: EXP-031'));
  assert.ok(!/[^\r]\n/.test(out), 'CRLF の文書に LF だけの行を混ぜない');
  assert.ok(withNoneMarker(text, 6, '新しいページ群の整理').includes('**実験**: なし（新しいページ群の整理）'));
});

test('段階: カード完了で本番反映待ち → 本番デプロイの日を境目に計測 → 確定した自動計測で判定待ち → 判定済み', () => {
  const e = make();
  const none = dispatchIndex([]);
  const done = dispatchIndex([{ id: 'DN-0900', outcome: 'done', commit: 'abc123def456', at: '2026-10-20' }]);
  assert.equal(phaseOf(e, none), 'filed');
  assert.equal(phaseOf(e, done), 'implemented');
  const deploy = { id: 1, sha: 'f'.repeat(40), at: '2026-10-21T15:30:00Z', url: 'u' };
  const plan = syncPlan([e], done, (commit, since) => (commit === 'abc123def456' && since === '2026-10-20' ? deploy : null));
  assert.deepEqual(plan.map((p) => p.action), ['start']);
  startExperiment(e, deploy, plan[0].implementation, now);
  assert.equal(e.status, 'running');
  assert.equal(e.measure.anchor, '2026-10-22', '本番デプロイの JST の日を境目にする');
  assert.equal(e.next_check_date, completeOn(e.measure, e.started_at));
  assert.equal(measureWindows(e.measure, e.started_at, e.next_check_date).complete, true, 'next_check_date に事後窓が確定する');
  assert.equal(measureWindows(e.measure, e.started_at, '2026-11-01').complete, false);
  assert.equal(phaseOf(e, done), 'measuring');
  assert.throws(() => closeExperiment(e, { result: 'success', learning: 'x' }, now), /確定した自動計測が無い/);
  e.measurements = [{ source: 'auto', complete: true, metric: 'gsc.position', pre: { value: 15 }, post: { value: 9 }, verdictHint: 'improved' }];
  assert.equal(phaseOf(e, done), 'verdict-due');
  assert.throws(() => closeExperiment(e, { result: 'great', learning: 'x' }, now), /--result/);
  closeExperiment(e, { result: 'success', learning: 'title を検索語の答えに合わせると上がった' }, now);
  assert.equal(phaseOf(e, done), 'closed');
  assert.equal(e.result, 'success');
});

test('sync: 本番に入っていなければ待ち、カードが改善を打たずに閉じたら中止', () => {
  const a = make({ id: 'EXP-030' });
  const b = make({ id: 'EXP-031', searchStrategy: { ...make().searchStrategy, card: 'DN-0901', page: '/exam/z' } });
  const c = make({ id: 'EXP-032', searchStrategy: { ...make().searchStrategy, card: 'DN-0902', page: '/exam/w' } });
  const d = dispatchIndex([{ id: 'DN-0900', outcome: 'done', commit: 'abc', at: '2026-10-20' }, { id: 'DN-0901', outcome: 'swept', at: '2026-10-20' }]);
  const plan = syncPlan([a, b, c], d, () => null);
  assert.deepEqual(plan.map((p) => [p.id, p.action]), [['EXP-030', 'wait'], ['EXP-031', 'abandon']]);
});

test('本番デプロイの検出: 成功した main の本番ワークフローだけ・含む最初のデプロイを二分探索で引く', () => {
  const run = { conclusion: 'success', status: 'completed', head_branch: 'main', path: DEPLOY_WORKFLOW_PATH, head_sha: 'a'.repeat(40), updated_at: '2026-10-01T00:00:00Z' };
  assert.equal(isProductionDeploy(run), true);
  assert.equal(isProductionDeploy({ ...run, head_branch: 'develop' }), false);
  assert.equal(isProductionDeploy({ ...run, conclusion: 'failure' }), false);
  const deploys = Array.from({ length: 9 }, (_, i) => ({ sha: String(i) }));
  let calls = 0;
  const hit = firstDeployContaining(deploys, (sha) => { calls++; return Number(sha) >= 6; });
  assert.equal(hit.sha, '6');
  assert.ok(calls <= 4, `祖先の判定は二分探索で減らす（${calls} 回）`);
  assert.equal(firstDeployContaining(deploys, () => false), null);
});

test('measure 仕様の scope.queries: gsc だけに付き、ページ×検索語の行を絞って集計する', () => {
  const spec = { specVersion: 1, metric: 'gsc.position', scope: { pages: ['/p'], queries: ['a'] }, preDays: 28, postDays: 28, direction: 'decrease' };
  assert.deepEqual(specErrors(spec), []);
  assert.match(specErrors({ ...spec, metric: 'ga4.sessions' }).join(), /gsc\.\* だけ/);
  assert.match(specErrors({ ...spec, scope: { pages: ['/p'], queries: [] } }).join(), /空でない/);
  const rows = [{ page: '/p', query: 'a', clicks: 1, impressions: 10, position: 12 }, { page: '/p', query: 'b', clicks: 5, impressions: 90, position: 3 }];
  assert.deepEqual(sumGscPages(rows, spec), { value: 12, volume: 10 });
});

test('期限: 検索改善の起票中は DECIDE_DUE を出さず（カードの時期が進め方を決める）、判定待ちは close のコマンドを示す', () => {
  const e = make({ created_at: '2026-08-01' });
  assert.equal(judgeExperiment(e, Date.parse('2026-10-13')).due, false);
  const v = make({ status: 'running', started_at: '2026-09-01', next_check_date: '2026-10-06', measurements: [{ source: 'auto', complete: true, metric: 'gsc.position', pre: { value: 15 }, post: { value: 9 }, verdictHint: 'improved' }] });
  const j = judgeExperiment(v, Date.parse('2026-10-13'));
  assert.ok(j.reasons.some((r) => r.kind === 'VERDICT_DUE'));
  assert.match(j.review, /search-improvement -- close --id EXP-030/);
});

test('結び付きの検査: 双方向の ID・起点が検索キーワード戦略のカード・なし（理由）・同じページの重複', () => {
  const clusters = new Set(['qualification']);
  const card = (id, body) => ({ id, body, endLine: 1 });
  const ok = linkErrors({ experiments: [make()], cards: [card('DN-0900', '**起点**: 検索キーワード戦略（資格名）\n**実験**: EXP-030（…）')], dispatchById: new Map(), clusters });
  assert.deepEqual(ok, []);
  const errs = linkErrors({
    experiments: [make(), make({ id: 'EXP-031', searchStrategy: { ...make().searchStrategy, card: 'DN-0901' } })],
    cards: [
      card('DN-0900', '**起点**: x'),                                     // カードに EXP-030 が無い
      card('DN-0902', '**起点**: 検索キーワード戦略の資格名クラスター'),     // 実験の行が無い
      card('DN-0903', '**起点**: 検索キーワード戦略\n**実験**: なし（新しいページ群の整理）'), // 理由つきで実験にしない
      card('DN-0904', '**起点**: y\n**実験**: EXP-099'),                  // 台帳に無い EXP
    ],
    dispatchById: new Map(),
    clusters,
  });
  const text = errs.join('\n');
  assert.match(text, /DN-0900 の本文に EXP-030 が無い/);
  assert.match(text, /EXP-031: カード DN-0901 が backlog にも dispatch-log にも無い/);
  assert.match(text, /EXP-031: \/exam\/x\/guide\/y に計測の終わっていない EXP-030/);
  assert.match(text, /DN-0902: 起点が検索キーワード戦略なのに/);
  assert.doesNotMatch(text, /DN-0903/);
  assert.match(text, /DN-0904: 「\*\*実験\*\*: EXP-099」の EXP-099 が実験台帳/);
});

test('backlog の実物の形（parseBacklog）でも実験の行を読める', () => {
  const md = '## 🟡\n\n### [DN-0900] t\nタグ: [領域:サイト] [種類:改善] [起票:2026-10-13]\n\n**起点**: 検索キーワード戦略（資格名）\n\n**実験**: EXP-030（…）\n';
  const cards = parseBacklog(md);
  assert.equal(cards[0].filed, '2026-10-13');
  assert.deepEqual(linkErrors({ experiments: [make()], cards, dispatchById: new Map(), clusters: new Set(['qualification']) }), []);
});
