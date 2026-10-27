/**
 * search-improvement.test.mjs — 検索改善の一周（直す→記録→本番反映→計測→判定）と、作ってはいけない状態・結び付きの検査を固定する
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExperiment, closeExperiment, dispatchIndex, linkErrors, monthlySummary, nextExperimentId, phaseOf, recordImplementation, startExperiment, syncPlan, weeklyQuota, withNoneMarker,
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
const impl = { commit: '1d7867446a2d', at: '2026-10-13', change: 'seoTitle・冒頭で難易度に先に答えた' };
const make = (over = {}, extra = {}) => ({ ...buildExperiment({ id: 'EXP-030', cluster, candidate, period: { startDate: '2026-09-09', endDate: '2026-10-06' }, source: 'data/gsc/reports/2026-10-10.json#page-query', measure, bands, implementation: impl, now, ...extra }), ...over });
const ledger = (experiments) => ({ version: 1, updated_at: '2026-10-13T03:00:00.000Z', experiments });

test('直した改善の EXP は台帳の型と measure 仕様に通り、カード無しで「本番反映待ち」から始まる', () => {
  const e = make();
  assert.deepEqual(specErrors(e.measure), []);
  assert.deepEqual(e.measure.scope, { pages: ['/exam/x/guide/y'], queries: ['技術士 難易度', '技術士 合格率'] });
  assert.deepEqual(e.searchStrategy, { cluster: 'qualification', page: '/exam/x/guide/y' });
  assert.deepEqual(e.implementation, impl);
  assert.equal(phaseOf(e), 'implemented');
  assert.equal(Experiments.safeParse(ledger([e])).success, true);
  assert.equal(Experiments.safeParse(ledger([{ ...e, searchStrategy: undefined }])).success, false, 'search-strategy の実験は対象が必須');
  assert.equal(Experiments.safeParse(ledger([{ ...e, implementation: { ...impl, commit: 'xyz' } }])).success, false, 'commit は SHA');
  assert.equal(nextExperimentId([{ id: 'EXP-009' }, { id: 'EXP-021' }, { id: 'x' }]), 'EXP-022');
});

test('record: 記録は commit・日付・内容が揃い、記録済み・計測中には重ねない', () => {
  const e = make({ implementation: undefined }, { implementation: null });
  assert.equal(phaseOf(e), 'filed');
  assert.throws(() => recordImplementation(structuredClone(e), { ...impl, commit: 'not-a-sha' }, now), /commit が不正/);
  assert.throws(() => recordImplementation(structuredClone(e), { ...impl, change: ' ' }, now), /--change/);
  recordImplementation(e, impl, now);
  assert.equal(phaseOf(e), 'implemented');
  assert.equal(e.history.at(-1).event, 'implemented');
  assert.throws(() => recordImplementation(e, impl, now), /記録できる段階ではない/);
});

test('段階: 記録 → 本番デプロイの日を境目に計測 → 確定した自動計測で判定待ち → 判定済み', () => {
  const e = make();
  const deploy = { id: 1, sha: 'f'.repeat(40), at: '2026-10-21T15:30:00Z', url: 'u' };
  const plan = syncPlan([e], new Map(), (commit, since) => (commit === impl.commit && since === impl.at ? deploy : null));
  assert.deepEqual(plan.map((p) => p.action), ['start']);
  startExperiment(e, deploy, plan[0].implementation, now);
  assert.equal(e.status, 'running');
  assert.equal(e.measure.anchor, '2026-10-22', '本番デプロイの JST の日を境目にする');
  assert.equal(e.next_check_date, completeOn(e.measure, e.started_at));
  assert.equal(measureWindows(e.measure, e.started_at, e.next_check_date).complete, true, 'next_check_date に事後窓が確定する');
  assert.equal(phaseOf(e), 'measuring');
  assert.throws(() => closeExperiment(e, { result: 'success', learning: 'x' }, now), /確定した自動計測が無い/);
  e.measurements = [{ source: 'auto', complete: true, metric: 'gsc.position', pre: { value: 15 }, post: { value: 9 }, verdictHint: 'improved' }];
  assert.equal(phaseOf(e), 'verdict-due');
  assert.throws(() => closeExperiment(e, { result: 'great', learning: 'x' }, now), /--result/);
  closeExperiment(e, { result: 'success', learning: 'title を検索語の答えに合わせると上がった' }, now);
  assert.equal(phaseOf(e), 'closed');
});

test('旧来のカード起票の EXP: カード完了（dispatch-log）でも改善の記録とみなし、swept・fail なら中止', () => {
  const legacy = (id, card) => make({ id, implementation: undefined, searchStrategy: { cluster: 'qualification', page: `/exam/${id}`, card } }, { implementation: null });
  const a = legacy('EXP-030', 'DN-0900');
  const b = legacy('EXP-031', 'DN-0901');
  const c = legacy('EXP-032', 'DN-0902');
  const d = dispatchIndex([{ id: 'DN-0900', outcome: 'done', commit: 'abc1234', at: '2026-10-20' }, { id: 'DN-0901', outcome: 'swept', at: '2026-10-20' }]);
  assert.equal(phaseOf(a, d), 'implemented');
  assert.equal(phaseOf(c, d), 'filed');
  const plan = syncPlan([a, b, c], d, () => null);
  assert.deepEqual(plan.map((p) => [p.id, p.action]), [['EXP-030', 'wait'], ['EXP-031', 'abandon']]);
});

test('週次の改善件数: 直近 7 日に記録した件数が、週の件数と直せる候補の小さい方に届いているか', () => {
  const rows = [{ implementedAt: '2026-10-13' }, { implementedAt: '2026-10-07' }, { implementedAt: '2026-10-06' }, { implementedAt: null }];
  assert.deepEqual(weeklyQuota({ rows, fileable: 10, perWeek: 3, today: '2026-10-13' }), { since: '2026-10-07', recorded: 2, required: 3, perWeek: 3, short: true });
  assert.equal(weeklyQuota({ rows, fileable: 0, perWeek: 3, today: '2026-10-13' }).short, false, '直せる候補が尽きていれば足りている');
});

test('月次の集計: クラスター別に直した数・判定と結果、判定 2 件以上で改善 0 なら見直し', () => {
  const rows = [
    { cluster: 'a', phase: 'closed', result: 'no-effect', closedAt: '2026-11-05', implementedAt: '2026-10-01' },
    { cluster: 'a', phase: 'closed', result: 'negative', closedAt: '2026-11-20' },
    { cluster: 'b', phase: 'closed', result: 'success', closedAt: '2026-11-02' },
    { cluster: 'b', phase: 'measuring', startedAt: '2026-11-03', implementedAt: '2026-11-01' },
  ];
  const s = monthlySummary(rows, [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], '2026-11');
  assert.equal(s.closed, 3);
  assert.equal(s.good, 1);
  assert.equal(s.clusters[0].needsReview, true);
  assert.equal(s.clusters[1].needsReview, false);
  assert.equal(s.clusters[1].implemented, 1);
  assert.equal(s.clusters[1].started, 1);
});

test('本番デプロイの検出: 成功した main の本番ワークフローだけ・含む最初のデプロイを二分探索で引く', () => {
  const run = { conclusion: 'success', status: 'completed', head_branch: 'main', path: DEPLOY_WORKFLOW_PATH, head_sha: 'a'.repeat(40), updated_at: '2026-10-01T00:00:00Z' };
  assert.equal(isProductionDeploy(run), true);
  assert.equal(isProductionDeploy({ ...run, head_branch: 'develop' }), false);
  const deploys = Array.from({ length: 9 }, (_, i) => ({ sha: String(i) }));
  let calls = 0;
  assert.equal(firstDeployContaining(deploys, (sha) => { calls++; return Number(sha) >= 6; }).sha, '6');
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

test('期限: 検索改善は proposed で DECIDE_DUE を出さず、判定待ちは close のコマンドを示す', () => {
  assert.equal(judgeExperiment(make({ created_at: '2026-08-01' }), Date.parse('2026-10-13')).due, false);
  const v = make({ status: 'running', started_at: '2026-09-01', next_check_date: '2026-10-06', measurements: [{ source: 'auto', complete: true, metric: 'gsc.position', pre: { value: 15 }, post: { value: 9 }, verdictHint: 'improved' }] });
  const j = judgeExperiment(v, Date.parse('2026-10-13'));
  assert.ok(j.reasons.some((r) => r.kind === 'VERDICT_DUE'));
  assert.match(j.review, /search-improvement -- close --id EXP-030/);
});

test('検査: 改善の記録の無い EXP・起点が検索キーワード戦略のカードを止め、なし（理由）と旧来のカードの結び付きは通す', () => {
  const clusters = new Set(['qualification']);
  const card = (id, body) => ({ id, body, endLine: 1 });
  assert.deepEqual(linkErrors({ experiments: [make()], cards: [], dispatchById: new Map(), clusters }), []);
  const errs = linkErrors({
    experiments: [
      make(),
      make({ id: 'EXP-031', implementation: undefined, searchStrategy: { cluster: 'qualification', page: '/exam/z' } }, { implementation: null }),
      make({ id: 'EXP-032', searchStrategy: { cluster: 'qualification', page: '/exam/w', card: 'DN-0901' } }),
      make({ id: 'EXP-033' }),
    ],
    cards: [
      card('DN-0901', '**起点**: x'),                                                     // 旧来の結び付きで EXP-ID が無い
      card('DN-0902', '**起点**: 検索キーワード戦略の資格名クラスター'),                     // 作ってはいけないカード
      card('DN-0903', '**起点**: 検索キーワード戦略\n**実験**: なし（新しいページ群の整理）'), // 改善以外は理由つきで通す
      card('DN-0904', '**起点**: y\n**実験**: EXP-099'),                                  // 台帳に無い EXP
    ],
    dispatchById: new Map(),
    clusters,
  });
  const text = errs.join('\n');
  assert.match(text, /EXP-031: 改善の記録が無い/);
  assert.match(text, /EXP-032: カード DN-0901 の本文に EXP-032 が無い/);
  assert.match(text, /EXP-033: \/exam\/x\/guide\/y に計測の終わっていない EXP-030/, '同じページに 2 つ目を記録しない');
  assert.match(text, /DN-0902: 起点が検索キーワード戦略のカードは作らない/);
  assert.doesNotMatch(text, /DN-0903/);
  assert.match(text, /DN-0904: 「\*\*実験\*\*: EXP-099」の EXP-099 が実験台帳/);
  assert.equal(make({ id: 'EXP-033' }).searchStrategy.page, '/exam/x/guide/y');
});

test('なし（理由）に試験日の誤記パターンがあれば書かない（DN-0893）', () => {
  const text = '## 🟡\n\n### [DN-0900] t\nタグ: [領域:サイト]\n\n**起点**: 検索キーワード戦略\n';
  assert.throws(() => withNoneMarker(text, 6, '2級の第二次検定は 2026-10-27 で終わったため'), /check-exam-calendar/);
});

test('なし（理由）の行は改行コードを保ち、backlog の実物の形（parseBacklog）でも読める', () => {
  const text = '## 🟡\r\n\r\n### [DN-0900] t\r\nタグ: [領域:サイト]\r\n\r\n**起点**: 検索キーワード戦略\r\n';
  const out = withNoneMarker(text, 6, '新しいページ群の整理');
  assert.ok(out.includes('\r\n\r\n**実験**: なし（新しいページ群の整理）'));
  assert.ok(!/[^\r]\n/.test(out), 'CRLF の文書に LF だけの行を混ぜない');
  const cards = parseBacklog(out.replace(/\r\n/g, '\n'));
  assert.deepEqual(linkErrors({ experiments: [], cards, dispatchById: new Map(), clusters: new Set() }), []);
});
