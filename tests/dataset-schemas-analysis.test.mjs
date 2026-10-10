import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as SCHEMAS from '../scripts/lib/dataset-schemas.mjs';
import { listAreaFiles, matchFiles } from '../scripts/lib/datasets.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const files = ['config', 'data'].flatMap((area) => listAreaFiles(ROOT, area, { tracked: true }));
const { byId: filesById } = matchFiles(files);
const latest = (id) => {
  const file = (filesById.get(id) ?? [])[0];
  assert.ok(file, `${id}: git 管理下のファイルが 0 件（未検査を通さない）`);
  return JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
};
const issues = (schema, value) => {
  const r = schema.safeParse(value);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.') || '(全体)'}: ${i.message}`);
};
const assertOk = (schema, value) => assert.deepEqual(issues(schema, value), []);
/** 週次・日次の取得で配列が空になる週でも失敗例を作れるよう、最新データが使えないときだけ固定サンプルを元にする（DN-0536） */
const sample = (name) => JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/dataset-samples', name + '.json'), 'utf8'));
const assertFails = (schema, value, pattern) => {
  const found = issues(schema, value);
  assert.ok(found.some((l) => pattern.test(l)), `${pattern} が出ない: ${JSON.stringify(found.slice(0, 5))}`);
};
/** 深いコピーを作って fn で壊す */
const broken = (value, fn) => {
  const copy = structuredClone(value);
  fn(copy);
  return copy;
};

// ---- 成長パック ----------------------------------------------------------------------------

test('GrowthPack: 実データの全週が通り、欠け・窓・区画の誤りが落ちる', () => {
  const S = SCHEMAS.GrowthPack;
  for (const f of filesById.get('analysis.growth-pack')) assertOk(S, JSON.parse(readFileSync(join(ROOT, f), 'utf8')));
  const pack = latest('analysis.growth-pack');
  assertFails(S, broken(pack, (p) => { delete p.sections.ga4Events; }), /sections\.ga4Events/);
  assertFails(S, broken(pack, (p) => { p.schemaVersion = 2; }), /schemaVersion/);
  assertFails(S, broken(pack, (p) => { p.week = '2026-W38'; }), /ISO 週/);
  assertFails(S, broken(pack, (p) => { p.period.endDate = '2026-09-28'; }), /6 日後/);
  assertFails(S, broken(pack, (p) => { p.baseline.days = 14; }), /days/);
  assertFails(S, broken(pack, (p) => { p.generatedAt = '2026-10-02T09:22:04+09:00'; }), /generatedAt/);
  assertFails(S, broken(pack, (p) => { p.sections.gscPageWeek.startDate = '2026-09-14'; }), /gscPageWeek の期間/);
  assertFails(S, broken(pack, (p) => { p.sections.ga4Landing.rows[0].week.sessions = 'x'; }), /sessions/);
  assertFails(S, broken(pack, (p) => { delete p.sections.gscPageQueryWeek.rows[0].query; }), /query/);
  assertFails(S, broken(pack, (p) => { p.sections.ga4Landing.rows.push(structuredClone(p.sections.ga4Landing.rows[0])); }), /重複/);
  // 取得失敗の区画（ok:false と error）は通る。error が無いと落ちる
  assertOk(S, broken(pack, (p) => { p.sections.gscPageBase = { ok: false, error: '403' }; }));
  assertFails(S, broken(pack, (p) => { p.sections.gscPageBase = { ok: false }; }), /gscPageBase/);
});

// ---- 成長ダイジェスト ----------------------------------------------------------------------

test('GrowthDigest: 実データの全週が通り、語彙・件数・窓の誤りが落ちる', () => {
  const S = SCHEMAS.GrowthDigest;
  for (const f of filesById.get('analysis.growth-digest')) assertOk(S, JSON.parse(readFileSync(join(ROOT, f), 'utf8')));
  const latestDigest = latest('analysis.growth-digest');
  assertOk(S, sample('growth-digest'));
  // 機会が 0 件の週は最新データから失敗例を作れないので、固定サンプルを元にする
  const d = latestDigest.surfaced.length > 0 ? latestDigest : sample('growth-digest');
  assertFails(S, broken(d, (x) => { delete x.kpis; }), /kpis/);
  assertFails(S, broken(d, (x) => { x.surfaced[0].category = 'misc'; }), /category/);
  assertFails(S, broken(d, (x) => { x.surfaced[0].id = 'OPP-xyz'; }), /OPP-/);
  assertFails(S, broken(d, (x) => { x.surfaced[0].type = 'seo-x'; x.surfaced[0].category = 'revenue'; }), /接頭辞/);
  assertFails(S, broken(d, (x) => { x.surfaced.push(structuredClone(x.surfaced[0])); }), /重複/);
  assertFails(S, broken(d, (x) => { x.candidates = 0; }), /候補/);
  assertFails(S, broken(d, (x) => { x.pack = 'data/analysis/growth/pack-2026-W01.json'; }), /パックでない/);
  assertFails(S, broken(d, (x) => { x.inputs[0].coverage = 'partial'; }), /coverage/);
  assertFails(S, broken(d, (x) => { x.surfaced[0].expectedWeeklyGain = { value: 1, unit: 'yen' }; }), /unit/);
  assertFails(S, broken(d, (x) => { x.period.startDate = '2026-09-22'; x.period.endDate = '2026-09-28'; }), /月曜/);
  assertOk(S, broken(d, (x) => { x.kpis.ga4 = null; x.kpis.gsc = null; x.kpis.cta = null; x.topMovers = null; }));
});

// ---- 収益導線の網羅 ------------------------------------------------------------------------

test('MonetizationCoverage: 実データが通り、導線の判定と集計の食い違いが落ちる', () => {
  const S = SCHEMAS.MonetizationCoverage;
  const c = latest('analysis.monetization-coverage');
  assertOk(S, c);
  assertFails(S, broken(c, (x) => { delete x.meta.minUsers; }), /minUsers/);
  assertFails(S, broken(c, (x) => { delete x.schemaVersion; }), /schemaVersion/);
  assertFails(S, broken(c, (x) => { x.summary.trafficked += 1; }), /流入のある行/);
  assertFails(S, broken(c, (x) => { x.summary.gaps += 1; }), /gap の行/);
  assertFails(S, broken(c, (x) => { x.rows[0].monetized = !x.rows[0].monetized; }), /monetized/);
  assertFails(S, broken(c, (x) => { x.rows[0].gap = !x.rows[0].gap; x.summary.gaps += x.rows[0].gap ? 1 : -1; }), /gap/);
  assertFails(S, broken(c, (x) => { x.rows.push(structuredClone(x.rows[0])); }), /重複/);
  assertFails(S, broken(c, (x) => { x.rows[0].noteCta = 'home-links-hub'; }), /noteCta/);
  assertFails(S, broken(c, (x) => { x.idClickCoverage.idClicks = x.idClickCoverage.totalClicks + 1; }), /超える/);
  // noteGap はファイル外の条件でも消える（立たない側は見ない）。立っているのに流入が足りない行は落とす
  assertFails(S, broken(c, (x) => { const r = x.rows.find((y) => y.users < x.meta.minUsers); r.noteGap = true; }), /noteGap が立っている/);
  if (c.coverage) assertFails(S, broken(c, (x) => { x.coverage.trafficRows += 1; }), /流入の URL 数と合わない/);
  // クリックの入力が無い実行（clickWindow・clickFile・クリック数が null）は通る
  assertOk(S, broken(c, (x) => { x.meta.clickWindow = null; x.meta.clickFile = null; for (const r of x.rows) { r.noteClicks = null; r.affClicks = null; } }));
});

// ---- 演習アプリの有料化ファネル ------------------------------------------------------------

test('QuizPremiumFunnel: 実データが通り、未計測の形と判定の食い違いが落ちる', () => {
  const S = SCHEMAS.QuizPremiumFunnel;
  const f = latest('analysis.quiz-premium-funnel');
  assertOk(S, f);
  assertOk(S, { schemaVersion: 1, measured: false, status: 'not_measured', source: null, metrics: null, gates: null });
  assertFails(S, { schemaVersion: 1, measured: false, status: 'collecting', source: null, metrics: null, gates: null }, /status/);
  assertFails(S, broken(f, (x) => { delete x.metrics.quizUsers; }), /quizUsers/);
  assertFails(S, broken(f, (x) => { x.status = 'done'; }), /status/);
  assertFails(S, broken(f, (x) => { x.source.endDate = '2026/10/01'; }), /endDate/);
  assertFails(S, broken(f, (x) => { x.gates.quizUsers100 = true; }), /利用者 100 人/);
  assertFails(S, broken(f, (x) => { x.status = 'ready'; }), /3 条件/);
  assertFails(S, broken(f, (x) => { x.metrics.premiumIntentRate = 0.3; }), /5%/);
  assertFails(S, broken(f, (x) => { delete x.schemaVersion; }), /schemaVersion/);
});

// ---- 転職アフィリエイトのファネル ----------------------------------------------------------

test('CareerFunnel: 実データが通り、集計の食い違いと欠けが落ちる。基準線は古い写しも通す', () => {
  const S = SCHEMAS.CareerFunnel;
  const c = latest('analysis.career-funnel');
  assertOk(S, c);
  assertFails(S, broken(c, (x) => { delete x.funnel; }), /funnel/);
  assertFails(S, broken(c, (x) => { delete x.coverage.careerArticles; }), /careerArticles/);
  assertFails(S, broken(c, (x) => { x.coverage.careerArticles += 1; }), /ledger/);
  assertFails(S, broken(c, (x) => { x.ledger.push(structuredClone(x.ledger[0])); }), /重複/);
  assertFails(S, broken(c, (x) => { x.funnel.affiliateCta.totalClicks += 1; }), /byPlacement の合計/);
  assertFails(S, broken(c, (x) => { x.funnel.affiliateCta.ctr = 0.5; }), /ctr/);
  assertFails(S, broken(c, (x) => { x.funnel.internalLinks['career-path'] += 1; }), /inboundLinks/);
  assertFails(S, broken(c, (x) => { x.pillars['career-path'].articles += 1; }), /articles/);
  assertFails(S, broken(c, (x) => { x.generatedAt = '2026-09-28T14:21:03+09:00'; }), /generatedAt/);
  assertFails(S, broken(c, (x) => { x.windows.ga4.start = '28/08/2026'; }), /start/);
  assertFails(S, broken(c, (x) => { x.ledger[0].pillar = 3; }), /pillar/);
  // 基準線は同じ形。書き手が後から足した欄（afb・notSet・extraLinkSourcesScanned）が無い古い写しも通す。現行の型は通さない
  const legacy = broken(c, (x) => { delete x.inputs.afb; delete x.funnel.afb; delete x.funnel.affiliateCta.notSet; delete x.coverage.extraLinkSourcesScanned; });
  assertOk(SCHEMAS.CareerFunnelBaseline, legacy);
  assertFails(S, legacy, /afb/);
  assertFails(SCHEMAS.CareerFunnelBaseline, broken(legacy, (x) => { delete x.windows; }), /windows/);
  for (const f of filesById.get('analysis.career-funnel-baseline')) assertOk(SCHEMAS.CareerFunnelBaseline, JSON.parse(readFileSync(join(ROOT, f), 'utf8')));
});

// ---- SEO meta ------------------------------------------------------------------------------

test('SeoMeta: 実データが通り、版・件数・重大度の食い違いが落ちる', () => {
  const S = SCHEMAS.SeoMeta;
  const latestMeta = latest('analysis.seo-meta');
  assertOk(S, latestMeta);
  assertOk(S, sample('seo-meta'));
  // 違反 0 件の回（results が空）は最新データから失敗例を作れないので、固定サンプルを元にする
  const m = latestMeta.results.length > 0 && latestMeta.results[0].violations.length > 0 ? latestMeta : sample('seo-meta');
  assertFails(S, broken(m, (x) => { delete x.summary; }), /summary/);
  assertFails(S, { ...broken(m, (x) => { delete x.schemaVersion; }), version: 3 }, /schemaVersion/);
  assertFails(S, broken(m, (x) => { x.generated_at = '2026-09-29T11:48:08+09:00'; }), /generated_at/);
  assertFails(S, broken(m, (x) => { x.mode = 'dev'; }), /mode/);
  assertFails(S, broken(m, (x) => { x.results[0].violations[0].severity = 'CRITICAL'; }), /severity/);
  assertFails(S, broken(m, (x) => { x.results[0].violations = []; }), /violations/);
  assertFails(S, broken(m, (x) => { x.summary.urls_with_violations = 5; }), /results の/);
  assertFails(S, broken(m, (x) => { x.summary.by_severity.HIGH = 4; }), /重大度の合計/);
  assertFails(S, broken(m, (x) => { x.violations_by_type.ssr_thin_body.push('/x'); }), /by_type/);
  assertFails(S, broken(m, (x) => { x.summary.by_type.extra = 1; }), /種類別の合計/);
  assertOk(S, broken(m, (x) => { x.results = []; x.violations_by_type = {}; x.summary.urls_with_violations = 0; x.summary.by_type = {}; x.summary.by_severity = { HIGH: 0, MEDIUM: 0, LOW: 0 }; }));
});

// ---- evidence（一回きりの調査） ------------------------------------------------------------

test('AffiliateOpportunities: 実データが通り、上位の欄の欠け・語彙の誤りが落ちる', () => {
  const S = SCHEMAS.AffiliateOpportunities;
  const e = latest('analysis.affiliate-opportunities');
  assertOk(S, e);
  assertFails(S, broken(e, (x) => { delete x.decisions; }), /decisions/);
  assertFails(S, broken(e, (x) => { delete x.sources[0].sha256; }), /sha256/);
  assertFails(S, broken(e, (x) => { x.observedAt = '2026-09-08 05:52'; }), /observedAt/);
  assertFails(S, broken(e, (x) => { x.executionUpdate.dateJst = '9/8'; }), /dateJst/);
  assertFails(S, broken(e, (x) => { x.schemaVersion = 2; }), /schemaVersion/);
  assertFails(S, broken(e, (x) => { x.unknownTopLevel = 1; }), /unknownTopLevel|Unrecognized/);
});

test('AffiliateResearch: 実データが通り、件数の食い違いと欠けが落ちる', () => {
  const S = SCHEMAS.AffiliateResearch;
  const r = latest('analysis.affiliate-research');
  assertOk(S, r);
  assertFails(S, broken(r, (x) => { delete x.summary; }), /summary/);
  assertFails(S, broken(r, (x) => { x.asOfJst = '2026-09-31'; }), /asOfJst/);
  assertFails(S, broken(r, (x) => { x.summary.careerArticles += 1; }), /careerInventory/);
  assertFails(S, broken(r, (x) => { x.summary.noteCareerArticles += 1; }), /noteCareerFiles/);
  assertFails(S, broken(r, (x) => { x.summary.gscMatchedUrlRows += 1; }), /gscPages/);
  assertFails(S, broken(r, (x) => { x.careerInventory[0].published = false; }), /publishedInSource/);
  assertFails(S, broken(r, (x) => { x.sources.labels.sha256 = 'abc'; }), /sha256/);
  assertFails(S, broken(r, (x) => { delete x.affiliateEvents.labels.BuildJob; x.affiliateEvents.labels['BuildJob-sidebar'].clicks = -1; }), /clicks/);
});

test('CivilServiceApplicants: 実データが通り、行の欠け・重複・都道府県の欠落が落ちる', () => {
  const S = SCHEMAS.CivilServiceApplicants;
  const c = latest('analysis.civil-service-applicants');
  assertOk(S, c);
  assertFails(S, broken(c, (x) => { delete x.summary; }), /summary/);
  assertFails(S, broken(c, (x) => { x.checkedAt = '2026-9-29'; }), /checkedAt/);
  assertFails(S, broken(c, (x) => { delete x.prefectures.tokyo; }), /47 件/);
  assertFails(S, broken(c, (x) => { delete x.prefectures.tokyo.rows[0].source; }), /source/);
  assertFails(S, broken(c, (x) => { x.prefectures.tokyo.rows[0].applicants = '12'; }), /applicants/);
  assertFails(S, broken(c, (x) => { x.prefectures.tokyo.rows[0].official = 'yes'; }), /official/);
  assertFails(S, broken(c, (x) => { x.prefectures.tokyo.rows.push(structuredClone(x.prefectures.tokyo.rows[0])); }), /重複/);
  assertFails(S, broken(c, (x) => { x.summary.twentyTwentySix = x.summary['2026']; }), /西暦|summary/);
  assertOk(S, broken(c, (x) => { x.prefectures.tokyo.rows[0].applicants = null; }));
});

// ---- 過去問の在庫台帳 ----------------------------------------------------------------------

test('PastExamInventory: 実データが通り、語彙・形式・知らない欄が落ちる', () => {
  const S = SCHEMAS.PastExamInventory;
  const inv = latest('pastexams.inventory');
  assertOk(S, inv);
  const [id] = Object.keys(inv.exams);
  const withFile = Object.entries(inv.exams).find(([, e]) => e.years.some((y) => y.files.length));
  const [fid, fexam] = withFile;
  const y = fexam.years.findIndex((yy) => yy.files.length);
  assertFails(S, broken(inv, (x) => { delete x.exams[id].dir; }), /dir/);
  assertFails(S, broken(inv, (x) => { x.exams[id].dir = 'content/sources/other/x'; }), /dir/);
  assertFails(S, broken(inv, (x) => { delete x.exams[id].official.policy; }), /policy/);
  assertFails(S, broken(inv, (x) => { x.exams[id].years[0].official = 'public'; }), /official/);
  assertFails(S, broken(inv, (x) => { x.exams[id].years[0].year = '2026'; }), /year/);
  assertFails(S, broken(inv, (x) => { x.exams[id].extra = 1; }), /extra|Unrecognized/);
  assertFails(S, broken(inv, (x) => { x.exams[fid].years[y].files[0].kind = 'commentary'; }), /kind/);
  assertFails(S, broken(inv, (x) => { x.exams[fid].years[y].files[0].acquiredAt = '2026/09/29'; }), /acquiredAt/);
  assertFails(S, broken(inv, (x) => { x.exams[fid].years[y].files[0].sourceUrl = 'http://example.com/a.pdf'; }), /sourceUrl/);
  assertFails(S, broken(inv, (x) => { x.exams[fid].years[y].files[0].file = 'R08/q.docx'; }), /file/);
  assertFails(S, broken(inv, (x) => { x.exams[fid].years[y].files[0].sha256 = 'abc'; }), /sha256/);
  assertFails(S, broken(inv, (x) => { x.exams['Bad Id'] = structuredClone(x.exams[fid]); }), /Bad Id|資格 id/);
  // 未取得（acquiredAt が null か欄なし・sourceUrl が null）は通る
  assertOk(S, broken(inv, (x) => { x.exams[fid].years[y].files[0].acquiredAt = null; x.exams[fid].years[y].files[0].sourceUrl = null; }));
  assertOk(S, broken(inv, (x) => { delete x.exams[fid].years[y].files[0].acquiredAt; }));
});
