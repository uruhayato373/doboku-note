/**
 * search-opportunities.test.mjs — 検索キーワード戦略の改善候補（改善候補の帯をページ単位に束ねる）の境界と、実験台帳から引く印を固定する
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeCluster, summarizeBing, bandLabels, candidateMarks, fileableCandidates, inTop, inStriking, triageCandidate, triageExperiment, decisionFor, escapeEre } from '../scripts/lib/search-opportunities.mjs';
import { experimentsByPage, dispatchIndex } from '../scripts/lib/search-improvement.mjs';

const S = 'https://doboku-note.com';
const row = (page, query, position, impressions, clicks = 0) => ({ keys: [`${S}${page}`, query], position, impressions, clicks });
const cluster = { id: 'standards', label: '技術図書', queryPattern: '共通仕様書', pagePrefixes: ['/standards/'] };
const striking = { minPosition: 10.5, maxPosition: 30, minImpressions: 3, maxCandidatesPerCluster: 5 };

test('改善候補の帯の検索語をページ単位に束ね、表示の少ないページと上位・圏外は候補にしない', () => {
  const rows = [
    row('/standards/okinawa', '沖縄県 共通仕様書', 10.7, 9),
    row('/standards/okinawa', '沖縄県土木工事共通仕様書', 11, 6),
    row('/standards/kinki', '近畿 共通仕様書', 8, 20),      // 上位
    row('/standards/tohoku', '東北 共通仕様書', 45, 30),    // 圏外
    row('/standards/hokuriku', '北陸 共通仕様書', 12, 2),   // 表示不足
    row('/docs/old-standards', '九州 共通仕様書', 15, 4),   // 旧 URL
    row('/standards/okinawa', '沖縄 歩掛', 12, 50),         // クラスター外の語
  ];
  const c = summarizeCluster(cluster, rows, striking);
  assert.equal(c.queries, 6);
  assert.equal(c.top10, 1);
  assert.deepEqual(c.candidates.map((p) => p.page), ['/standards/okinawa', '/docs/old-standards']);
  assert.equal(c.candidates[0].impressions, 15);
  assert.equal(c.candidates[0].fileable, true);
  assert.equal(c.candidates[1].legacyUrl, true);
  assert.equal(c.candidates[1].inTarget, false);
  assert.equal(c.candidates[1].fileable, false);
});

test('帯の境目は設定の minPosition だけが決める（10.3 位は上位・境目の上下で取りこぼさない）', () => {
  assert.equal(inTop(10.3, striking), true);
  assert.equal(inStriking(10.3, striking), false);
  assert.equal(inStriking(10.5, striking), true);
  const c = summarizeCluster(cluster, [row('/standards/a', 'a 共通仕様書', 10.3, 5), row('/standards/b', 'b 共通仕様書', 10.6, 5)], striking);
  assert.equal(c.top10 + c.striking, 2, '境目の前後の検索語はどちらかの帯に必ず入る');
  const wide = { ...striking, minPosition: 20.5 };
  assert.equal(summarizeCluster(cluster, [row('/standards/a', 'a 共通仕様書', 15, 5)], wide).top10, 1, '設定を変えると帯が変わる');
  assert.deepEqual(bandLabels(striking), { top: '10位以内', striking: '11〜30位' });
  assert.deepEqual(bandLabels(wide), { top: '20位以内', striking: '21〜30位' });
});

test('起票済み・判定済みの印は実験台帳（kind: search-strategy）から ID で引く', () => {
  const open = { id: 'EXP-030', kind: 'search-strategy', status: 'proposed', searchStrategy: { cluster: 'standards', page: '/standards/okinawa', card: 'DN-0900' } };
  const done = { id: 'EXP-020', kind: 'search-strategy', status: 'done', result: 'no-effect', closed_at: '2026-09-01T00:00:00.000Z', searchStrategy: { cluster: 'standards', page: '/standards/kinki', card: 'DN-0800' } };
  const other = { id: 'EXP-001', status: 'running' };
  const byPage = experimentsByPage([open, done, other]);
  const dispatchById = dispatchIndex([{ id: 'DN-0900', outcome: 'done', commit: 'abc123', at: '2026-10-01' }]);
  const rows = [row('/standards/okinawa', '沖縄 共通仕様書', 12, 9), row('/standards/kinki', '近畿 共通仕様書', 13, 9)];
  const c = summarizeCluster(cluster, rows, striking, { byPage, dispatchById });
  const okinawa = c.candidates.find((p) => p.page === '/standards/okinawa');
  const kinki = c.candidates.find((p) => p.page === '/standards/kinki');
  assert.deepEqual(okinawa.experiment, { id: 'EXP-030', phase: 'implemented', card: 'DN-0900', nextCheck: null });
  assert.equal(okinawa.fileable, false, '計測の終わっていない実験があるページは起票しない');
  assert.equal(kinki.fileable, true, '判定済みのページは次の起票の候補に戻る');
  assert.deepEqual(candidateMarks(okinawa).map((m) => m.key), ['experiment']);
  assert.deepEqual(candidateMarks(kinki).map((m) => [m.key, m.label]), [['last', '前回 効果なし EXP-020'], ['todo', '未着手']]);
  const every = candidateMarks({ ...okinawa, triage: { kind: 'off-target', status: 'action' }, lastResult: { id: 'EXP-1', result: 'success' }, fileable: true });
  assert.deepEqual(every.map((m) => m.key), ['experiment', 'off-target', 'last', 'todo']);
  assert.ok(every.every((m) => m.hint), '印にはすべて意味（MARK_HINTS）がある');
});

test('週次の処置: 受け皿外は判断が要り、受け皿に加えれば候補に戻り、誘導は期限まで観察してから見直す', () => {
  const opts = { today: '2026-10-13', graceDays: 28, redirectedAt: '2026-08-22' };
  const withDecision = (pageDecisions) => ({ ...cluster, pageDecisions });
  const rows = [row('/practice/x', 'x 共通仕様書', 12, 9)];
  const off = summarizeCluster(cluster, rows, striking).candidates[0];
  assert.equal(off.inTarget, false);
  assert.equal(off.fileable, false, '受け皿外は判断が先（直さない）');
  assert.equal(triageCandidate(off, opts).status, 'action');
  const accepted = summarizeCluster(withDecision([{ path: '/practice/x', decision: 'accept', reason: 'r', decidedAt: '2026-10-13' }]), rows, striking).candidates[0];
  assert.equal(accepted.inTarget, true);
  assert.equal(accepted.fileable, true);
  assert.equal(triageCandidate(accepted, opts).status, 'none');
  const routed = summarizeCluster(withDecision([{ path: '/practice/x', decision: 'route', to: '/standards/a', reason: 'r', decidedAt: '2026-10-01' }]), rows, striking).candidates[0];
  assert.equal(routed.fileable, false);
  assert.equal(triageCandidate(routed, opts).status, 'observe');
  assert.equal(triageCandidate(routed, { ...opts, today: '2026-10-29' }).status, 'action', '誘導から期限を過ぎても出ていれば見直す');
  assert.equal(decisionFor(withDecision([{ path: '/practice/', decision: 'accept', reason: 'r', decidedAt: '2026-10-13' }]), '/practice/x').decision, 'accept', '判断は接頭辞で当てる');
});

test('週次の処置: 旧 URL は転送・公開・サイト内リンクを確かめ、転送か登録リクエストから期限を過ぎたら登録リクエストを促す', () => {
  const opts = { today: '2026-10-13', graceDays: 28, redirectedAt: '2026-08-22' };
  const legacy = (l) => ({ page: '/docs/a', legacyUrl: true, inTarget: false, legacy: l });
  const ok = { to: '/exam/a', published: true, inboundLinks: 0, requestedAt: null };
  assert.match(triageCandidate(legacy({ ...ok, to: null }), opts).action, /転送先が無い/);
  assert.match(triageCandidate(legacy({ ...ok, published: false }), opts).action, /公開されていない/);
  assert.match(triageCandidate(legacy({ ...ok, inboundLinks: 2 }), opts).action, /2 本が旧 URL を指している/);
  assert.match(triageCandidate(legacy(ok), opts).action, /gsc-indexing:request -- --urls \/exam\/a/, '転送から 52 日で置き換わっていない');
  const requested = triageCandidate(legacy({ ...ok, requestedAt: '2026-09-17' }), opts);
  assert.equal(requested.status, 'observe');
  assert.match(requested.note, /登録リクエスト 2026-09-17・置き換え待ち（あと 2 日）/);
  assert.deepEqual(candidateMarks({ ...legacy(ok), triage: requested }).map((m) => m.key), ['legacy-wait']);
});

test('週次の処置: 判定待ちの実験は close を促し、カード完了から期限を過ぎても本番に入らない実験は確かめさせる', () => {
  const opts = { today: '2026-10-13', graceDays: 28 };
  const e = { id: 'EXP-030', card: 'DN-0645', measurement: { pre: 15, post: 9, verdictHint: 'improved' } };
  assert.match(triageExperiment({ ...e, phase: 'verdict-due' }, opts).action, /close --id EXP-030/);
  assert.equal(triageExperiment({ ...e, phase: 'implemented', implementedAt: '2026-10-01' }, opts).status, 'observe');
  assert.equal(triageExperiment({ ...e, phase: 'implemented', implementedAt: '2026-09-01' }, opts).status, 'action');
  assert.match(triageExperiment({ ...e, phase: 'filed' }, opts).action, /改善の記録が無い/, '起票だけの状態は要処置');
  for (const phase of ['measuring', 'closed', 'abandoned']) assert.equal(triageExperiment({ ...e, phase }, opts).status, 'none');
});

test('git grep -E に渡すページは、正規表現の記号とバックスラッシュをすべて逃がす（CodeQL: 不完全な逃がし）', () => {
  assert.equal(escapeEre('/docs/a.b(c)[d]\\e|f+g'), '/docs/a\\.b\\(c\\)\\[d\\]\\\\e\\|f\\+g');
  assert.equal(new RegExp(`^${escapeEre('/a.b\\c')}$`).test('/a.b\\c'), true);
});

test('起票してよい候補は全クラスターで同じページを 1 件にまとめ、表示の多い順に並べる', () => {
  const p = (page, impressions, fileable = true) => ({ page, impressions, bestPosition: 12, fileable });
  const clusters = [
    { id: 'qualification', label: '資格名', candidates: [p('/exam/a', 12), p('/exam/b', 30, false)] },
    { id: 'public-servant', label: '土木公務員', candidates: [p('/exam/a', 17), p('/exam/c', 5)] },
  ];
  assert.deepEqual(fileableCandidates(clusters).map((x) => [x.page, x.cluster]), [['/exam/a', 'public-servant'], ['/exam/c', 'public-servant']]);
});

test('Bing は検索語だけを GSC と同じ日数で合算し、表示で重み付けした順位で改善候補の帯の候補を出す', () => {
  const rows = [
    { date: '2026-09-18', query: '技術士 cpd', impressions: 4, clicks: 0, avgImpressionPosition: 12 },
    { date: '2026-09-11', query: '技術士 cpd', impressions: 4, clicks: 1, avgImpressionPosition: 14 },
    { date: '2026-09-18', query: '技術士 総監', impressions: 50, clicks: 5, avgImpressionPosition: 3 },
    { date: '2026-08-01', query: '技術士 古い', impressions: 99, clicks: 0, avgImpressionPosition: 15 },
    { date: '2026-09-18', query: '土木 別', impressions: 9, clicks: 0, avgImpressionPosition: 20 },
  ];
  const b = summarizeBing({ queryPattern: '技術士' }, rows, striking, 28);
  assert.equal(b.queries, 2);
  assert.equal(b.top10, 1);
  assert.deepEqual(b.candidates.map((q) => [q.query, q.position, q.impressions]), [['技術士 cpd', 13, 8]]);
});
