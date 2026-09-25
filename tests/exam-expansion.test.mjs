import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCoverage, marketScore, rankCatalog, scoreExam, validateCatalog } from '../scripts/lib/exam-expansion.mjs';

const catalog = JSON.parse(readFileSync('.claude/config/exam-expansion-catalog.json', 'utf8'));
const { scoring } = catalog;
const exam = (over = {}) => ({
  id: 'x', label: 'X', issuer: 'I', status: 'candidate',
  essay: { type: 'experience', summary: 's' },
  market: { examinees: 5000, year: 'R7', source: 'https://example.jp', confidence: 'official' },
  operatorQualification: null,
  competition: { level: 'mid', players: [], basis: 'b' },
  coverage: { siteDirs: [], noteExamKey: null, coconalaScope: null, kindleSeries: [] },
  scores: { wtp: 2, authenticity: 2, competitionGap: 2, assetReuse: 2, evergreen: 2 },
  rationale: 'r', nextAction: 'n', ...over,
});
const refs = { examStats: { exams: { a: { latest: { examinees: 100 } } } }, profileQualifications: ['保有資格'], noteExamKeys: ['k'], coconalaScopes: ['c'], kindleSeries: ['S'], siteDirs: ['a'], examSiteDirs: [] };
const cat = (exams) => ({ ...catalog, exams });

test('市場スコアは受験者数の閾値から決まり、未確認は null', () => {
  assert.equal(marketScore(10000, scoring.marketThresholds), 3);
  assert.equal(marketScore(2999, scoring.marketThresholds), 1);
  assert.equal(marketScore(0, scoring.marketThresholds), 0);
  assert.equal(marketScore(null, scoring.marketThresholds), null);
});

test('全軸 3 点で 100、全軸 0 点で 0', () => {
  const s3 = { wtp: 3, authenticity: 3, competitionGap: 3, assetReuse: 3, evergreen: 3 };
  assert.equal(scoreExam(exam({ scores: s3, market: { ...exam().market, examinees: 20000 } }), scoring, {}).score, 100);
  const s0 = { wtp: 0, authenticity: 0, competitionGap: 0, assetReuse: 0, evergreen: 0 };
  assert.equal(scoreExam(exam({ scores: s0, market: { ...exam().market, examinees: 10 } }), scoring, {}).score, 0);
});

test('ゲートに掛かった候補はスコアが高くても下に並ぶ', () => {
  const small = exam({ id: 'small', market: { ...exam().market, examinees: 80 }, scores: { wtp: 3, authenticity: 3, competitionGap: 3, assetReuse: 3, evergreen: 3 }, operatorQualification: '保有資格' });
  const ok = exam({ id: 'ok' });
  const ranked = rankCatalog(cat([small, ok]), {});
  assert.deepEqual(ranked.candidate.map((r) => r.id), ['ok', 'small']);
  assert.deepEqual(ranked.candidate[1].gates, ['市場過小']);
});

test('市場未確認はゲートにせずフラグで示す（0 件を過小と混同しない）', () => {
  const r = scoreExam(exam({ market: { ...exam().market, examinees: null } }), scoring, {});
  assert.deepEqual(r.gates, []);
  assert.ok(r.flags.includes('市場未確認'));
});

test('statsRef は exam-stats.json から受験者数を引く', () => {
  const e = exam({ status: 'active', market: { statsRef: { exam: 'a', path: 'latest.examinees', year: 'R7' } }, coverage: { siteDirs: ['a'], noteExamKey: null, coconalaScope: null, kindleSeries: [] } });
  assert.equal(scoreExam(e, scoring, refs.examStats).examinees, 100);
  assert.deepEqual(validateCatalog(cat([e]), refs), []);
});

test('検査: 評点と保有資格・競合・参照先の不整合を検出する', () => {
  const errs = validateCatalog(cat([
    exam({ id: 'q', operatorQualification: '未登録の資格' }),
    exam({ id: 'auth', scores: { ...exam().scores, authenticity: 3 } }),
    exam({ id: 'comp', competition: { level: 'high', players: [], basis: 'b' }, scores: { ...exam().scores, competitionGap: 2 } }),
    exam({ id: 'mkt', scores: { ...exam().scores, market: 3 } }),
    exam({ id: 'cov', coverage: { siteDirs: ['nope'], noteExamKey: 'zz', coconalaScope: 'zz', kindleSeries: ['zz'] } }),
    exam({ id: 'act', status: 'active' }),
  ]), refs);
  for (const needle of ['q: operatorQualification', 'auth: authenticity=3', 'comp: 競合 high', 'mkt: scores.market', 'cov: coverage.siteDirs', 'cov: coverage.noteExamKey', 'cov: coverage.coconalaScope', 'cov: coverage.kindleSeries', 'act: 対応中の資格は exam-stats.json']) {
    assert.ok(errs.some((e) => e.startsWith(needle)), `${needle} を検出できていない: ${errs.join(' / ')}`);
  }
});

test('検査: 同じ対応先を複数の試験に割り当てない・資格ディレクトリの取りこぼしを検出する', () => {
  const a = exam({ id: 'a1', coverage: { siteDirs: ['a'], noteExamKey: null, coconalaScope: null, kindleSeries: [] } });
  const b = exam({ id: 'a2', coverage: { siteDirs: ['a'], noteExamKey: null, coconalaScope: null, kindleSeries: [] } });
  assert.ok(validateCatalog(cat([a, b]), refs).some((e) => e.includes('siteDirs=a が複数')));
  assert.ok(validateCatalog(cat([exam()]), { ...refs, examSiteDirs: ['a'] }).some((e) => e.includes('content/site/a がどの試験にも')));
});

test('対応状況は割り当てた対応先だけを数える', () => {
  const e = exam({ coverage: { siteDirs: ['a', 'b'], noteExamKey: 'k', coconalaScope: 'c', kindleSeries: ['S'] } });
  const c = buildCoverage(e, {
    site: { a: { published: 2, unpublished: 1 }, b: { published: 3, unpublished: 0 }, z: { published: 9, unpublished: 9 } },
    magazines: [{ examKey: 'k', published: true }, { examKey: 'k', published: false }, { examKey: 'other', published: true }],
    coconala: [{ scopes: ['c', 'd'], status: 'listed' }, { scopes: ['c'], status: 'paused' }, { scopes: ['d'], status: 'listed' }],
    kindle: [{ series: 'S', status: 'live' }, { series: 'S', status: 'ready' }, { series: 'T', status: 'live' }],
  });
  assert.deepEqual(c, { site: { published: 5, unpublished: 1 }, note: { published: 1, total: 2 }, coconala: { listed: 1, total: 2 }, kindle: { live: 1, total: 2 } });
});
