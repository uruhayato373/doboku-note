import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as SCHEMAS from '../scripts/lib/dataset-schemas.mjs';
import { listAreaFiles, matchFiles } from '../scripts/lib/datasets.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

/** 違反を「場所: 内容」の行にする（通れば空） */
const issues = (schema, value) => {
  const r = schema.safeParse(value);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.') || '(全体)'}: ${i.message}`);
};
const assertOk = (schema, value) => assert.deepEqual(issues(schema, value), []);
const assertFails = (schema, value, pattern) => {
  const found = issues(schema, value);
  assert.ok(found.some((l) => pattern.test(l)), `${pattern} が出ない: ${JSON.stringify(found.slice(0, 5))}`);
};

const files = ['config'].flatMap((area) => listAreaFiles(ROOT, area, { tracked: true }));
const { byId } = matchFiles(files);
const clone = (v) => JSON.parse(JSON.stringify(v));
/** 設定の中身（実データ。無ければ落とす＝検査ゼロを緑にしない） */
const config = (id) => {
  const file = (byId.get(id) ?? [])[0];
  assert.ok(file, `${id}: git 管理下のファイルが無い`);
  return clone(JSON.parse(readFileSync(join(ROOT, file), 'utf8')));
};
const mutated = (value, fn) => {
  const copy = clone(value);
  fn(copy);
  return copy;
};
/** 実データが通り、版の欄・知らない欄・必須欄の欠けが落ちること（全型共通） */
const envelope = (name, id, { requiredKey }) => {
  const schema = SCHEMAS[name];
  assert.ok(schema, `${name} が dataset-schemas に export されていない`);
  const v = config(id);
  assertOk(schema, v);
  assertFails(schema, mutated(v, (x) => delete x.schemaVersion), /schemaVersion/);
  assertFails(schema, mutated(v, (x) => (x.schemaVersion = 2)), /schemaVersion/);
  assertFails(schema, mutated(v, (x) => (x.surprise = 1)), /surprise|Unrecognized/);
  assertFails(schema, mutated(v, (x) => delete x[requiredKey]), new RegExp(requiredKey));
  return { schema, v };
};

test('ConfigBusinessDirection: 指標の語彙・単位・重点資格の欄の欠けが落ちる', () => {
  const { schema, v } = envelope('ConfigBusinessDirection', 'config.business-direction', { requiredKey: 'northStar' });
  assertFails(schema, mutated(v, (x) => (x.metrics[0].stage = '売上')), /metrics\.0\.stage/);
  assertFails(schema, mutated(v, (x) => (x.metrics[0].unit = 'ドル')), /metrics\.0\.unit/);
  assertFails(schema, mutated(v, (x) => (x.metrics[0].channel = 'tiktok')), /metrics\.0\.channel/);
  assertFails(schema, mutated(v, (x) => delete x.metrics[0].definition), /metrics\.0\.definition/);
  assertFails(schema, mutated(v, (x) => delete x.qualifications[0].journey), /qualifications\.0\.journey/);
  assertFails(schema, mutated(v, (x) => (x.effectiveDate = '2026/09/15')), /effectiveDate/);
  assertFails(schema, mutated(v, (x) => (x.review.timezone = 'UTC')), /review\.timezone/);
  assertFails(schema, mutated(v, (x) => (x.qualifications = [])), /qualifications/);
});

test('ConfigExamFormats: 形式・区分・公開範囲の語彙と照合日が落ちる', () => {
  const { schema, v } = envelope('ConfigExamFormats', 'config.exam-formats', { requiredKey: 'exams' });
  const id = Object.keys(v.exams)[0];
  assertFails(schema, mutated(v, (x) => (x.exams[id].stages[0].types = ['quiz'])), /stages\.0\.types\.0/);
  assertFails(schema, mutated(v, (x) => (x.exams[id].stages[0].types = [])), /stages\.0\.types/);
  assertFails(schema, mutated(v, (x) => (x.exams[id].stages[0].key = 'third')), /stages\.0\.key/);
  assertFails(schema, mutated(v, (x) => (x.exams[id].pastExams.questions = 'all')), /pastExams\.questions/);
  assertFails(schema, mutated(v, (x) => (x.exams[id].verification.checkedAt = '2026-9-26')), /verification\.checkedAt/);
  assertFails(schema, mutated(v, (x) => (x.exams[id].verification.checkedBy = 'human')), /verification\.checkedBy/);
  assertFails(schema, mutated(v, (x) => delete x.exams[id].pastExams), /pastExams/);
  assertFails(schema, mutated(v, (x) => (x.exams['Bad_ID'] = x.exams[id])), /Bad_ID|英小文字/);
});

test('ConfigExamStats: 数値・合格率の範囲・照合記録・latest の欠けが落ちる', () => {
  const { schema, v } = envelope('ConfigExamStats', 'config.exam-stats', { requiredKey: 'exams' });
  const id = 'pe-comprehensive-management';
  assertFails(schema, mutated(v, (x) => (x.exams[id].latest.passRate = 120)), /latest\.passRate/);
  assertFails(schema, mutated(v, (x) => (x.exams[id].latest.passers = -1)), /latest\.passers/);
  assertFails(schema, mutated(v, (x) => (x.exams[id].latest.examinees = '2575')), /latest\.examinees/);
  assertFails(schema, mutated(v, (x) => (x.exams[id].latest.stage = 'oral')), /latest\.stage/);
  assertFails(schema, mutated(v, (x) => delete x.exams[id].latest), /latest/);
  assertFails(schema, mutated(v, (x) => (x.exams[id].verification.checkedBy = 'bot')), /verification\.checkedBy/);
  assertFails(schema, mutated(v, (x) => (x.exams[id].latest.surprise = 1)), /latest|Unrecognized/);
  assertFails(schema, mutated(v, (x) => (x.peSecondaryDivisions.R7.stage = 'oral')), /peSecondaryDivisions\.R7\.stage/);
  assertFails(schema, mutated(v, (x) => (x.peSecondaryDivisions.R7.divisions['建設'].passRate = 101)), /divisions\.建設\.passRate/);
  assertFails(schema, mutated(v, (x) => (x.exams['civil-construction-1'].latest.stages.first.examinees = 'many')), /stages\.first\.examinees/);
  assertFails(schema, mutated(v, (x) => (x.exams[id].source = 'not a url')), /exams\.pe-comprehensive-management\.source/);
});

test('ConfigMarketScan: 検索語・閾値・結果件数の欠けと型が落ちる', () => {
  const { schema, v } = envelope('ConfigMarketScan', 'config.market-scan', { requiredKey: 'density' });
  const id = Object.keys(v.queries)[0];
  assertFails(schema, mutated(v, (x) => (x.queries[id].keywords = [])), /queries\..+\.keywords/);
  assertFails(schema, mutated(v, (x) => delete x.queries[id].coconala), /queries\..+\.coconala/);
  assertFails(schema, mutated(v, (x) => (x.queries[id].keyword = 'x')), /keyword|Unrecognized/);
  assertFails(schema, mutated(v, (x) => (x.density.bands.low = 0)), /density\.bands\.low/);
  assertFails(schema, mutated(v, (x) => (x.density.youtube.strongViews = '10000')), /strongViews/);
  assertFails(schema, mutated(v, (x) => (x.results.note = 0)), /results\.note/);
  assertFails(schema, mutated(v, (x) => (x.queries['Bad_ID'] = x.queries[id])), /Bad_ID|英小文字/);
});

test('ConfigCompetitors: 枠の欠け・handle の重複・資格 id の語彙が落ちる', () => {
  const { schema, v } = envelope('ConfigCompetitors', 'config.competitors', { requiredKey: 'youtube' });
  assertFails(schema, mutated(v, (x) => delete x.note.competitors[0].handle), /note\.competitors\.0\.handle/);
  assertFails(schema, mutated(v, (x) => (x.x.competitors[0].exams = [])), /x\.competitors\.0\.exams/);
  assertFails(schema, mutated(v, (x) => (x.coconala.competitors[0].exams = ['Bad Id'])), /coconala\.competitors\.0\.exams/);
  assertFails(schema, mutated(v, (x) => x.youtube.competitors.push(clone(x.youtube.competitors[0]))), /handle「.+」が重複/);
  assertFails(schema, mutated(v, (x) => delete x.instagram.competitors[0].note), /instagram\.competitors\.0\.note/);
  assertFails(schema, mutated(v, (x) => (x.tiktok = { _note: 'x', competitors: [] })), /tiktok|Unrecognized/);
});

test('ConfigAnnualRoadmap: 期間の形式・前後と買い場の週数が落ちる', () => {
  const { schema, v } = envelope('ConfigAnnualRoadmap', 'config.annual-roadmap', { requiredKey: 'period' });
  assertFails(schema, mutated(v, (x) => (x.period.start = '2026-13')), /period\.start/);
  assertFails(schema, mutated(v, (x) => (x.period = { start: '2027-10', end: '2026-10' })), /開始月が終了月より後/);
  assertFails(schema, mutated(v, (x) => (x.buyWindowWeeks = 0)), /buyWindowWeeks/);
  assertFails(schema, mutated(v, (x) => (x.items = [])), /items|Unrecognized/);
});

test('ConfigContentThemes: ルールの照合キー・テーマ id・区分の欠けが落ちる', () => {
  const { schema, v } = envelope('ConfigContentThemes', 'config.content-themes', { requiredKey: 'rules' });
  assertFails(schema, mutated(v, (x) => (x.rules.note[1] = { theme: 'career' })), /pathPrefix か utmCampaignPrefix/);
  assertFails(schema, mutated(v, (x) => (x.rules.note[0].theme = 'Bad Theme')), /rules\.note\.0\.theme/);
  assertFails(schema, mutated(v, (x) => (x.topics[0].label = '')), /topics\.0\.label/);
  assertFails(schema, mutated(v, (x) => x.topics.push(clone(x.topics[0]))), /id「.+」が重複/);
  assertFails(schema, mutated(v, (x) => delete x.stageRules.note[0].stage), /stageRules\.note\.0\.stage/);
  assertFails(schema, mutated(v, (x) => (x.shortLabels = {})), /shortLabels|Unrecognized/);
});

test('ConfigNoteMembership: プランの欄・id の形・一意と撤退日が落ちる', () => {
  const { schema, v } = envelope('ConfigNoteMembership', 'config.note-membership', { requiredKey: 'plans' });
  assertFails(schema, mutated(v, (x) => (x.plans[0].price = -1)), /plans\.0\.price/);
  assertFails(schema, mutated(v, (x) => (x.plans[0].id = 'xyz')), /plans\.0\.id/);
  assertFails(schema, mutated(v, (x) => (x.plans[0].limit = 0)), /plans\.0\.limit/);
  assertFails(schema, mutated(v, (x) => delete x.plans[0].published), /plans\.0\.published/);
  assertFails(schema, mutated(v, (x) => (x.plans[1].key = x.plans[0].key)), /key「.+」が重複/);
  assertFails(schema, mutated(v, (x) => (x.retiredAt = '2026-09-31')), /retiredAt/);
  assertFails(schema, mutated(v, (x) => (x.mirrors = [{ file: 'a.md' }])), /mirrors\.0\.must/);
});

test('ConfigNoteMagazineMembership: 束ねの欄・同梱の値・例外の本数が落ちる', () => {
  const { schema, v } = envelope('ConfigNoteMagazineMembership', 'config.note-magazine-membership', { requiredKey: 'labels' });
  const pack = Object.keys(v.packs).find((k) => k !== '_doc' && v.packs[k].fromMagazines);
  assertFails(schema, mutated(v, (x) => delete x.packs[pack].reason), new RegExp(`packs\\.${pack}\\.reason`));
  assertFails(schema, mutated(v, (x) => (x.packs[pack].fromMagazines.x = 'some')), /fromMagazines\.x/);
  assertFails(schema, mutated(v, (x) => (x.packs[pack].labels = 'ラベル')), new RegExp(`packs\\.${pack}\\.labels`));
  assertFails(schema, mutated(v, (x) => (x.packs[pack].surprise = 1)), /surprise|Unrecognized/);
  assertFails(schema, mutated(v, (x) => (x.excluded['未分類ラベル'] = {})), /excluded\.未分類ラベル\.reason/);
  const extra = Object.keys(v.extras)[0];
  assertFails(schema, mutated(v, (x) => (x.extras[extra].count = 1.5)), /extras\..+\.count/);
  assertFails(schema, mutated(v, (x) => delete x.extras[extra].reason), /extras\..+\.reason/);
  assertFails(schema, mutated(v, (x) => (x.labels['総監模範論文-ゼネコン'] = 1)), /labels\.総監模範論文-ゼネコン/);
});

test('ConfigNotePriceConsistency: 期待価格の型・理由の欠けが落ちる', () => {
  const { schema, v } = envelope('ConfigNotePriceConsistency', 'config.note-price-consistency', { requiredKey: 'uniformSeries' });
  const series = Object.keys(v.uniformSeries)[0];
  assertFails(schema, mutated(v, (x) => (x.uniformSeries[series].price = '780')), /uniformSeries\..+\.price/);
  assertFails(schema, mutated(v, (x) => (x.uniformSeries[series].price = -780)), /uniformSeries\..+\.price/);
  assertFails(schema, mutated(v, (x) => delete x.uniformSeries[series].reason), /uniformSeries\..+\.reason/);
  const mag = Object.keys(v.allowMagazines)[0];
  assertFails(schema, mutated(v, (x) => (x.allowMagazines[mag] = 500)), /allowMagazines\./);
});

test('ConfigNoteIntroStandard: マガジン導線の欠け・規則が指す先・案内文のキーが落ちる', () => {
  const { schema, v } = envelope('ConfigNoteIntroStandard', 'config.note-intro-standard', { requiredKey: 'variants' });
  assertFails(schema, mutated(v, (x) => (x.variants.civil1.rules[0].home = 'no-such-magazine')), /rules\.0\.home.*magazines に無い/);
  assertFails(schema, mutated(v, (x) => (x.variants.civil1.rules[0].upper = 'no-such-magazine')), /rules\.0\.upper.*magazines に無い/);
  assertFails(schema, mutated(v, (x) => (x.variants.civil1.rules[0].coconalaLead = 'nothing')), /coconalaLead.*coconala\.lead に無い/);
  assertFails(schema, mutated(v, (x) => delete x.variants.civil1.rules[0].dq), /rules\.0\.dq/);
  assertFails(schema, mutated(v, (x) => (x.variants.civil1.coconala.urls = ['coconala'])), /coconala\.urls\.0/);
  assertFails(schema, mutated(v, (x) => delete x.variants.civil1.coconala.lead.default), /lead\.default/);
  const mag = Object.keys(v.variants.civil1.magazines)[0];
  assertFails(schema, mutated(v, (x) => delete x.variants.civil1.magazines[mag].title), /magazines\..+\.title/);
  assertFails(schema, mutated(v, (x) => (x.variants.civil1.magazines[mag].url = 'note')), /magazines\..+\.url/);
});

test('ConfigNoteCovers: 記事の上書き・分類のルール・マガジンの文言の欠けと重複が落ちる', () => {
  const { schema, v } = envelope('ConfigNoteCovers', 'config.note-covers', { requiredKey: 'categories' });
  const article = Object.keys(v.characterCovers.articleOverrides)[0];
  assertFails(schema, mutated(v, (x) => delete x.characterCovers.articleOverrides[article].headline), /articleOverrides\..+\.headline/);
  assertFails(schema, mutated(v, (x) => x.characterCovers.additionalMagazines.push(clone(x.characterCovers.additionalMagazines[0]))), /id「.+」が重複/);
  assertFails(schema, mutated(v, (x) => delete x.characterCovers.additionalMagazines[0].magazineDir), /additionalMagazines\.0\.magazineDir/);
  assertFails(schema, mutated(v, (x) => (x.categories.rules.note[1] = { category: 'column' })), /pathPrefix か noteSeries/);
  assertFails(schema, mutated(v, (x) => x.categories.categories.push(clone(x.categories.categories[0]))), /id「.+」が重複/);
  assertFails(schema, mutated(v, (x) => delete x.categories.defaults.qualification.paid), /defaults\.qualification\.paid/);
  const mag = Object.keys(v.magazineText).find((k) => k !== '$comment');
  assertFails(schema, mutated(v, (x) => delete x.magazineText[mag].benefit), /magazineText\..+\.benefit/);
  assertFails(schema, mutated(v, (x) => (x.magazineText[mag].proof = '')), /magazineText\..+\.proof/);
  assertFails(schema, mutated(v, (x) => (x.magazineText[mag].price = 1)), /price|Unrecognized/);
});

test('ConfigCoconalaAccount: 出品者名・URL・日付・プロフィールの欠けが落ちる', () => {
  const { schema, v } = envelope('ConfigCoconalaAccount', 'config.coconala-account', { requiredKey: 'profile' });
  assertFails(schema, mutated(v, (x) => delete x.sellerName), /sellerName/);
  assertFails(schema, mutated(v, (x) => (x.profileUrl = 'coconala.com/users/1')), /profileUrl/);
  assertFails(schema, mutated(v, (x) => (x.listedAt = '2026-07-32')), /listedAt/);
  assertFails(schema, mutated(v, (x) => delete x.profile.bio), /profile\.bio/);
  assertFails(schema, mutated(v, (x) => (x.profile.avatarImage = '')), /profile\.avatarImage/);
  assertOk(schema, mutated(v, (x) => (x.profileUrl = ''))); // 出品前は空
});

test('ConfigCoconalaBlog: 偵察間隔・検索語・追跡ユーザーの形と重複が落ちる', () => {
  const { schema, v } = envelope('ConfigCoconalaBlog', 'config.coconala-blog', { requiredKey: 'queries' });
  assertFails(schema, mutated(v, (x) => (x.cadenceDays = 0)), /cadenceDays/);
  assertFails(schema, mutated(v, (x) => delete x.queries[0].exam), /queries\.0\.exam/);
  assertFails(schema, mutated(v, (x) => x.queries.push(clone(x.queries[0]))), /q「.+」が重複/);
  assertFails(schema, mutated(v, (x) => (x.watchUsers[0].id = 'abc')), /watchUsers\.0\.id/);
  assertFails(schema, mutated(v, (x) => (x.watchUsers[0].exams = [])), /watchUsers\.0\.exams/);
  assertFails(schema, mutated(v, (x) => x.watchUsers.push(clone(x.watchUsers[0]))), /id「.+」が重複/);
});

test('ConfigKdpMemo: 既定値の語彙・本の欄・キーワード数・上書きの語彙が落ちる', () => {
  const { schema, v } = envelope('ConfigKdpMemo', 'config.kdp-memo', { requiredKey: 'books' });
  const id = Object.keys(v.books)[0];
  assertFails(schema, mutated(v, (x) => (x.defaults.accessibility = 'readable-ish')), /defaults\.accessibility/);
  assertFails(schema, mutated(v, (x) => (x.defaults.aiDeclaration.images = 'LOTS')), /aiDeclaration\.images/);
  assertFails(schema, mutated(v, (x) => (x.defaults.kdpSelect = 'yes')), /defaults\.kdpSelect/);
  assertFails(schema, mutated(v, (x) => (x.defaults.accountEmail = 'not-mail')), /accountEmail/);
  assertFails(schema, mutated(v, (x) => (x.defaults.categoryAssign.unknownTrack = ['z-'])), /categoryAssign\.unknownTrack.*categoryPaths に無い/);
  assertFails(schema, mutated(v, (x) => delete x.defaults.categoryPaths.concrete.leaf), /categoryPaths\.concrete\.leaf/);
  assertFails(schema, mutated(v, (x) => x.books[id].keywords.push('8つ目', '9つ目')), new RegExp(`books\\.${id}\\.keywords`));
  assertFails(schema, mutated(v, (x) => delete x.books[id].description), new RegExp(`books\\.${id}\\.description`));
  assertFails(schema, mutated(v, (x) => (x.books[id].kdp = { kdpSelect: 'no' })), /kdp\.kdpSelect/);
  assertFails(schema, mutated(v, (x) => (x.books[id].price = 980)), /price|Unrecognized/);
  assertFails(schema, mutated(v, (x) => (x.books['BAD ID'] = x.books[id])), /BAD ID|本の id/);
});

test('ConfigKeikenAnswerSheetLimits: 字数・割合・設問の形式キー・既定の級が落ちる', () => {
  const { schema, v } = envelope('ConfigKeikenAnswerSheetLimits', 'config.keiken-answer-sheet-limits', { requiredKey: 'grades' });
  assertFails(schema, mutated(v, (x) => (x.grades['civil-1'].limits.current2_q1.maxChars = 0)), /current2_q1\.maxChars/);
  assertFails(schema, mutated(v, (x) => delete x.grades['civil-1'].limits.yosou), /limits\.yosou/);
  assertFails(schema, mutated(v, (x) => (x.grades['civil-2'].minimum_fill_ratio = 1.5)), /minimum_fill_ratio/);
  assertFails(schema, mutated(v, (x) => (x.grades['civil-1'].provisional = 'no')), /provisional/);
  assertFails(schema, mutated(v, (x) => (x._meta.default_grade = 'civil-9')), /grades に無い級/);
  assertFails(schema, mutated(v, (x) => (x._meta.borderline_tolerance = 'ten')), /borderline_tolerance/);
  assertFails(schema, mutated(v, (x) => (x.grades['civil-1'].limits.current2_q3 = x.grades['civil-1'].limits.yosou)), /current2_q3|Unrecognized/);
});

test('ConfigCceEssayHistory: 和暦・年度の一意・テーマの実在・persona 設問の数・字数帯が落ちる', () => {
  const { schema, v } = envelope('ConfigCceEssayHistory', 'config.cce-essay-history', { requiredKey: 'answerModel' });
  assertFails(schema, mutated(v, (x) => (x.years[0].era = 'R6')), /years\.0\.era/);
  assertFails(schema, mutated(v, (x) => (x.years[1].year = x.years[0].year)), /year「.+」が重複/);
  assertFails(schema, mutated(v, (x) => (x.years[0].options[0].theme = 'no-such-theme')), /themes に無いテーマ/);
  assertFails(schema, mutated(v, (x) => (x.years[0].confidence = 'certain')), /years\.0\.confidence/);
  assertFails(schema, mutated(v, (x) => delete x.years[0].sources), /years\.0\.sources/);
  assertFails(schema, mutated(v, (x) => (x.answerModel.parts[0].scope = 'persona')), /persona の部分はちょうど 1 つ/);
  assertFails(schema, mutated(v, (x) => (x.answerModel.parts[1].chars = [400, 250])), /parts\.1\.chars/);
  assertFails(schema, mutated(v, (x) => (x.answerModel.totalChars = [800])), /totalChars/);
  assertFails(schema, mutated(v, (x) => x.answerModel.personas.push(x.answerModel.personas[0])), /立場「.+」が重複/);
  assertFails(schema, mutated(v, (x) => (x.charsPerLine.confidence = 'sure')), /charsPerLine\.confidence/);
});

test('ConfigContentRules: 重大度の語彙・ルール id の実在・上書きの形が落ちる', () => {
  const { schema, v } = envelope('ConfigContentRules', 'config.content-rules', { requiredKey: 'defaults' });
  const rule = Object.keys(v.defaults)[0];
  assertFails(schema, mutated(v, (x) => (x.defaults[rule] = 'CRITICAL')), new RegExp(`defaults\\.${rule}`));
  assertFails(schema, mutated(v, (x) => (x.defaults['abc'] = 'HIGH')), /defaults\.abc|ルール id/);
  assertFails(schema, mutated(v, (x) => (x.scopes['99-99'] = { applies: 'all', note: 'x' })), /scopes\.99-99.*defaults に無い/);
  assertFails(schema, mutated(v, (x) => x.fullScan.rules.push('99-99')), /fullScan\.rules\.\d+.*defaults に無い/);
  assertFails(schema, mutated(v, (x) => x.fullScan.rules.push(x.fullScan.rules[0])), /ルール「.+」が重複/);
  assertFails(schema, mutated(v, (x) => (x.overrides['civil-construction-1'].textbook['1-3'] = { enabled: true })), /overrides\.civil-construction-1\.textbook\.1-3\.enabled/);
  assertFails(schema, mutated(v, (x) => (x.overrides['civil-construction-1'].textbook['1-3'] = { severity: 'LOW', surprise: 1 })), /surprise|Unrecognized/);
  assertFails(schema, mutated(v, (x) => (x.overrides['civil-construction-1'].textbook['77-7'] = { enabled: false })), /overrides\..*77-7.*defaults に無い/);
  assertFails(schema, mutated(v, (x) => (x.scopes['3-1'].applies = '')), /scopes\.3-1\.applies/);
});
