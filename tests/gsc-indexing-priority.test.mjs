import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIndexingPriority, classifyInspection, evaluateIndexingDue, pageType, toPath } from '../scripts/lib/gsc-indexing-priority.mjs';

const S = 'https://doboku-note.com';
const idx = (verdict, coverage_state) => ({ verdict, coverage_state });
const batch = [
  { url: `${S}/exam/a/guide/indexed`, index: idx('PASS', '送信して登録されました') },
  { url: `${S}/exam/a/guide/hot`, index: idx('NEUTRAL', '検出 - インデックス未登録') },
  { url: `${S}/exam/a/guide/dup`, index: idx('NEUTRAL', '重複しています。Google により、ユーザーがマークしたページとは異なるページが正規ページとして選択されました') },
  { url: `${S}/standards/x/cold`, index: idx('NEUTRAL', '検出 - インデックス未登録') },
  { url: `${S}/exam/a/guide/cold`, index: idx('NEUTRAL', 'URL が Google に認識されていません') },
  { url: `${S}/exam/a/guide/recent`, index: idx('NEUTRAL', '検出 - インデックス未登録') },
];
const legacy = new Map([['/docs/a-hot', '/exam/a/guide/hot'], ['/docs/a-dup', '/exam/a/guide/dup']]);
const gsc = [
  { keys: [`${S}/docs/a-hot`], clicks: 1, impressions: 40 },
  { keys: [`${S}/exam/a/guide/hot`], clicks: 0, impressions: 30 },
  { keys: [`${S}/docs/a-dup`], clicks: 3, impressions: 12 },
  { keys: [`${S}/exam/a/guide/indexed`], clicks: 9, impressions: 900 },
];
const now = new Date('2026-09-17T00:00:00Z');

test('coverage_state を 5 分類にする', () => {
  assert.equal(classifyInspection(idx('PASS', 'x')), 'indexed');
  assert.equal(classifyInspection(idx('NEUTRAL', '検出 - インデックス未登録')), 'discovered');
  assert.equal(classifyInspection(idx('NEUTRAL', 'クロール済み - インデックス未登録')), 'crawled-not-indexed');
  assert.equal(toPath(`${S}/exam/a/guide/hot/?utm=1`), '/exam/a/guide/hot');
});

test('型: /exam/<資格>/<節>・practice・tools・topics・standards の 4 種・資格ハブ・トップ階層に分ける', () => {
  const k = (path) => pageType(path).key;
  assert.equal(k('/exam/rccm/guide/overview'), 'exam/rccm/guide');
  assert.equal(k('/exam/pe-construction/past-exams/r06-road'), 'exam/pe-construction/past-exams');
  assert.deepEqual(pageType('/exam/rccm/guide/overview'), { key: 'exam/rccm/guide', chain: ['exam/rccm/guide', 'exam/*/guide', 'exam'], qualification: 'rccm' });
  assert.equal(k('/exam'), 'exam/hub');
  assert.equal(k('/exam/rccm'), 'exam/hub');
  assert.equal(k('/practice'), 'practice');
  assert.equal(k('/practice/trench-excavation-safety'), 'practice');
  assert.equal(k('/tools/sling-tension'), 'tools');
  assert.equal(k('/topics/roads'), 'topics');
  assert.equal(k('/standards'), 'standards/org-hub');
  assert.equal(k('/standards/kanto'), 'standards/org-hub');
  assert.equal(k('/standards/kanto/manual'), 'standards/std-hub');
  assert.equal(k('/standards/kanto/manual/part-03'), 'standards/part');
  assert.equal(k('/standards/kinki/common/chapters/10-2'), 'standards/chapters');
  assert.equal(k('/'), 'site/top');
  assert.equal(k('/about'), 'site/top');
  assert.equal(pageType('/tools/sling-tension').qualification, null);
});

test('登録済みを除き、旧 /docs と新 URL の表示を合算して表示順に並べ、直近リクエスト済みは cooldown で外す', () => {
  const runs = [{ collectedAt: '2026-09-15T00:00:00Z', accepted: 1, acceptedSlugs: ['/exam/a/guide/recent'] }];
  const { counts, items } = buildIndexingPriority({ batchResults: batch, gscPageRows: gsc, legacyRoutes: legacy, requestRuns: runs, now });
  assert.deepEqual(counts, { inspected: 6, indexed: 1, candidates: 4, withDemand: 2, cooledDown: 1 });
  assert.deepEqual(items.map((i) => i.path), ['/exam/a/guide/hot', '/exam/a/guide/dup', '/exam/a/guide/cold', '/standards/x/cold']);
  assert.equal(items[0].impressions, 70);
  assert.equal(items[1].clicks, 3);
  assert.equal(items[1].status, 'duplicate');
});

test('cooldown を過ぎたリクエスト済み URL は候補に戻る', () => {
  const runs = [{ collectedAt: '2026-08-01T00:00:00Z', accepted: 1, acceptedSlugs: ['/exam/a/guide/recent'] }];
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

// ---- 表示 0 の並び = 型ごとの期待値（降順）-----------------------------------------------------------------

const ix = (path) => ({ url: `${S}${path}`, index: idx('PASS', '送信して登録されました') });
const un = (path) => ({ url: `${S}${path}`, index: idx('NEUTRAL', '検出 - インデックス未登録') });
const rows = (map) => Object.entries(map).map(([path, impressions]) => ({ keys: [`${S}${path}`], clicks: 0, impressions }));
const build = (batchResults, gscPageRows = [], extra = {}) => buildIndexingPriority({ batchResults, gscPageRows, legacyRoutes: new Map(), requestRuns: [], now, ...extra });
const typeOf = (result, key) => result.types.find((t) => t.type === key);

/**
 * 型ごとの算定（手計算）:
 *   exam/rccm/guide  登録 1/4 → n<3 で全資格の guide（登録 6 本 [100,40,30,20,10,10]・最大を除く平均 22）で代用 × 未登録率 3/4 = 16.5
 *   practice         登録 4/6 [60,30,20,10]・最大を除く平均 20 × 2/6 = 6.67
 *   exam/civ/guide   登録 5/6 [100,40,30,20,10]・最大を除く平均 25 × 1/6 = 4.17
 *   tools            登録 3/4 [50,10,0]・最大を除く平均 5 × 1/4 = 1.25
 *   standards/part   登録 5/10 すべて表示 0・平均 0 → 期待値 0
 * パス昇順だと /exam/civ → /exam/rccm → /practice → /standards → /tools になる。
 */
const typedBatch = () => [
  ix('/exam/rccm/guide/g0'), un('/exam/rccm/guide/g1'), un('/exam/rccm/guide/g2'), un('/exam/rccm/guide/g3'),
  ix('/exam/civ/guide/a'), ix('/exam/civ/guide/b'), ix('/exam/civ/guide/c'), ix('/exam/civ/guide/d'), ix('/exam/civ/guide/e'), un('/exam/civ/guide/z'),
  ix('/practice/p1'), ix('/practice/p2'), ix('/practice/p3'), ix('/practice/p4'), un('/practice/p5'), un('/practice/p6'),
  ix('/tools/t1'), ix('/tools/t2'), ix('/tools/t3'), un('/tools/t4'),
  ...[1, 2, 3, 4, 5].map((n) => ix(`/standards/x/y/part-0${n}`)),
  ...[6, 7, 8, 9].map((n) => un(`/standards/x/y/part-0${n}`)),
  un('/standards/x/y/part-10'),
];
const typedRows = () => rows({
  '/exam/rccm/guide/g0': 10,
  '/exam/civ/guide/a': 100, '/exam/civ/guide/b': 40, '/exam/civ/guide/c': 30, '/exam/civ/guide/d': 20, '/exam/civ/guide/e': 10,
  '/practice/p1': 60, '/practice/p2': 30, '/practice/p3': 20, '/practice/p4': 10,
  '/tools/t1': 50, '/tools/t2': 10,
});

test('表示 0 の候補は型の期待値の降順に並ぶ（パス昇順ではない）', () => {
  const r = build(typedBatch(), typedRows());
  assert.deepEqual(r.counts, { inspected: 30, indexed: 18, candidates: 12, withDemand: 0, cooledDown: 0 });
  assert.deepEqual(r.items.map((i) => i.path), [
    '/exam/rccm/guide/g1', '/exam/rccm/guide/g2', '/exam/rccm/guide/g3',
    '/practice/p5', '/practice/p6',
    '/exam/civ/guide/z',
    '/tools/t4',
    '/standards/x/y/part-06', '/standards/x/y/part-07', '/standards/x/y/part-08', '/standards/x/y/part-09', '/standards/x/y/part-10',
  ]);
  assert.deepEqual(r.items.map((i) => [i.type, i.expectedValue]), [
    ...Array(3).fill(['exam/rccm/guide', 16.5]),
    ...Array(2).fill(['practice', 6.67]),
    ['exam/civ/guide', 4.17],
    ['tools', 1.25],
    ...Array(5).fill(['standards/part', 0]),
  ]);
  assert.deepEqual(r.types.map((t) => t.type), ['exam/rccm/guide', 'practice', 'exam/civ/guide', 'tools', 'standards/part']);
});

test('型の根拠: 型の登録済み本数・最大を除く平均表示・未登録率が types に残る', () => {
  const r = build(typedBatch(), typedRows());
  assert.deepEqual(typeOf(r, 'practice'), {
    type: 'practice', qualification: null, priorityQualification: false,
    inspected: 6, indexed: 4, unindexed: 2, unindexedRate: 0.333,
    basis: 'own', meanSource: 'practice', meanSourceIndexed: 4, meanImpressions: 20, expectedValue: 6.67,
  });
  assert.equal(typeOf(r, 'exam/civ/guide').meanImpressions, 25);
  assert.equal(typeOf(r, 'tools').meanImpressions, 5);
  assert.equal(typeOf(r, 'standards/part').expectedValue, 0);
});

test('登録済みが 3 本未満の型は上位のまとまり（全資格の同じ節）の平均で代用し、未登録率は自分の型のまま。代用は根拠に残る', () => {
  const r = build(typedBatch(), typedRows());
  const rccm = typeOf(r, 'exam/rccm/guide');
  assert.equal(rccm.basis, 'substitute');
  assert.equal(rccm.meanSource, 'exam/*/guide');
  assert.equal(rccm.meanSourceIndexed, 6);
  assert.equal(rccm.meanImpressions, 22);
  assert.equal(rccm.indexed, 1);
  assert.equal(rccm.unindexedRate, 0.75);
  assert.equal(rccm.expectedValue, 16.5);
  // 同じ節にも登録済みが少なければ /exam 全体まで広げる
  const wide = build(
    [ix('/exam/a/guide/g'), un('/exam/a/guide/h'), ix('/exam/b/primary/p1'), ix('/exam/b/primary/p2'), ix('/exam/b/primary/p3')],
    rows({ '/exam/a/guide/g': 5, '/exam/b/primary/p1': 40, '/exam/b/primary/p2': 20, '/exam/b/primary/p3': 8 }),
  );
  const g = typeOf(wide, 'exam/a/guide');
  assert.deepEqual([g.basis, g.meanSource, g.meanSourceIndexed, g.meanImpressions, g.unindexedRate, g.expectedValue], ['substitute', 'exam', 4, 11, 0.5, 5.5]);
});

test('どの層にも登録済みが 3 本ない型は insufficient（最も多い層の平均・1 本以下なら 0）として残す', () => {
  const two = typeOf(build([ix('/tools/t1'), ix('/tools/t2'), un('/tools/t3')], rows({ '/tools/t1': 30, '/tools/t2': 10 })), 'tools');
  assert.deepEqual([two.basis, two.meanSource, two.meanSourceIndexed, two.meanImpressions], ['insufficient', 'tools', 2, 10]);
  const one = typeOf(build([ix('/tools/t1'), un('/tools/t2')], rows({ '/tools/t1': 30 })), 'tools');
  assert.deepEqual([one.basis, one.meanImpressions, one.expectedValue], ['insufficient', 0, 0]);
});

test('未登録率の分母は検査した全 URL（cooldown 中の未登録も数える）。cooldown は候補から外れるだけ', () => {
  const runs = [{ collectedAt: '2026-09-15T00:00:00Z', accepted: 1, acceptedSlugs: ['/practice/p5'] }];
  const r = build(typedBatch(), typedRows(), { requestRuns: runs });
  assert.equal(r.counts.cooledDown, 1);
  assert.equal(r.items.some((i) => i.path === '/practice/p5'), false);
  assert.equal(typeOf(r, 'practice').unindexedRate, 0.333);
  assert.equal(typeOf(r, 'practice').unindexed, 2);
});

test('表示のある未登録は、期待値がどれだけ高い型の表示 0 より先に置く（表示降順）', () => {
  const r = build(typedBatch(), [...typedRows(), ...rows({ '/standards/x/y/part-06': 3, '/tools/t4': 7 })]);
  assert.deepEqual(r.items.slice(0, 2).map((i) => i.path), ['/tools/t4', '/standards/x/y/part-06']);
  assert.deepEqual(r.items.slice(0, 2).map((i) => i.impressions), [7, 3]);
  assert.equal(r.counts.withDemand, 2);
  // その次から表示 0 が期待値順
  assert.equal(r.items[2].path, '/exam/rccm/guide/g1');
});

test('旧 /docs の表示は正規パスに合算してから型の平均に入れる', () => {
  const legacyRoutes = new Map([['/docs/p1', '/practice/p1']]);
  const r = build([ix('/practice/p1'), ix('/practice/p2'), ix('/practice/p3'), ix('/practice/p4'), un('/practice/p5')], [
    { keys: [`${S}/docs/p1`], clicks: 0, impressions: 90 },
    { keys: [`${S}/practice/p1`], clicks: 0, impressions: 10 },
    ...rows({ '/practice/p2': 40, '/practice/p3': 20, '/practice/p4': 0 }),
  ], { legacyRoutes });
  assert.equal(typeOf(r, 'practice').meanImpressions, 20); // [100,40,20,0] の最大 100 を除く (40+20+0)/3
});

test('期待値が同じ（小数 1 桁）なら重点資格の型を先に。期待値が違えば重点資格でも後ろ', () => {
  // 資格ごとの guide: 登録済み 4 本 [a,b,c,d]・未登録 1 本（z）。最大を除く平均 × 1/5
  const guides = (impressions) =>
    ['p', 'q'].flatMap((qual, k) => {
      const [a, b, c, d] = impressions[k];
      return { batch: [...'abcd'].map((s) => ix(`/exam/${qual}/guide/${s}`)).concat(un(`/exam/${qual}/guide/z`)), gsc: rows(Object.fromEntries([...'abcd'].map((s, i) => [`/exam/${qual}/guide/${s}`, [a, b, c, d][i]]))) };
    });
  const make = (impressions) => {
    const parts = guides(impressions);
    return { batch: parts.flatMap((x) => x.batch), gsc: parts.flatMap((x) => x.gsc) };
  };
  const same = make([[90, 10, 10, 10], [90, 10, 10, 10]]); // どちらも 10 × 1/5 = 2.0
  assert.equal(build(same.batch, same.gsc).items[0].path, '/exam/p/guide/z'); // 重点資格なし: パス昇順
  const prioritized = build(same.batch, same.gsc, { priorityQualifications: ['q'] });
  assert.equal(prioritized.items[0].path, '/exam/q/guide/z');
  assert.equal(typeOf(prioritized, 'exam/q/guide').priorityQualification, true);
  assert.equal(typeOf(prioritized, 'exam/p/guide').priorityQualification, false);
  // q の期待値が 0.2 低い（9 × 1/5 = 1.8）と、重点資格でも後ろ（加点は同点の並びだけ）
  const lower = make([[90, 10, 10, 10], [90, 9, 9, 9]]);
  const r = build(lower.batch, lower.gsc, { priorityQualifications: ['q'] });
  assert.deepEqual(r.items.map((i) => i.path), ['/exam/p/guide/z', '/exam/q/guide/z']);
});

test('同じ期待値の中は内部リンク数の降順（渡したときだけ）、無ければパス昇順', () => {
  const batch = [ix('/practice/p1'), ix('/practice/p2'), ix('/practice/p3'), un('/practice/a'), un('/practice/b'), un('/practice/c')];
  const gsc = rows({ '/practice/p1': 30, '/practice/p2': 20, '/practice/p3': 10 });
  assert.deepEqual(build(batch, gsc).items.map((i) => i.path), ['/practice/a', '/practice/b', '/practice/c']);
  const inbound = new Map([['/practice/b', 5], ['/practice/c', 9]]);
  assert.deepEqual(build(batch, gsc, { internalInbound: inbound }).items.map((i) => i.path), ['/practice/c', '/practice/b', '/practice/a']);
});

test('候補 0 件でも型は空・items は空で返る（全部登録済みは正常）', () => {
  const r = build([ix('/practice/p1'), ix('/practice/p2')], rows({ '/practice/p1': 3 }));
  assert.deepEqual(r.counts, { inspected: 2, indexed: 2, candidates: 0, withDemand: 0, cooledDown: 0 });
  assert.deepEqual(r.items, []);
  assert.deepEqual(r.types, []);
});
