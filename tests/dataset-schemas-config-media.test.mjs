import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import * as SCHEMAS from '../scripts/lib/dataset-schemas.mjs';
import { listAreaFiles, matchFiles } from '../scripts/lib/datasets.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const files = ['config', 'data'].flatMap((area) => listAreaFiles(ROOT, area, { tracked: true }));
const { byId: filesById } = matchFiles(files);
const latest = (id) => {
  const fs = filesById.get(id) ?? [];
  assert.ok(fs.length > 0, `${id}: git 管理下のファイルが 0 件（未検査を通さない）`);
  return JSON.parse(readFileSync(join(ROOT, fs[0]), 'utf8'));
};
const issues = (schema, value) => {
  const r = schema.safeParse(value);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.') || '(全体)'}: ${i.message}`);
};
const assertOk = (schema, id) => assert.deepEqual(issues(schema, latest(id)), [], `${id} が型を通らない`);
const assertFails = (schema, value, pattern) => {
  const found = issues(schema, value);
  assert.ok(found.some((l) => pattern.test(l)), `${pattern} が出ない: ${JSON.stringify(found.slice(0, 5))}`);
};
const broken = (value, fn) => {
  const copy = globalThis.structuredClone(value);
  fn(copy);
  return copy;
};
/** 台帳の id に当てた型で、版の欄が schemaVersion 1 以外・欠けは落ち、知らない欄は落ちる（.strict()） */
const commonFailures = (S, id) => {
  const v = latest(id);
  assertFails(S, broken(v, (d) => { d.schemaVersion = 2; }), /schemaVersion/);
  assertFails(S, broken(v, (d) => { delete d.schemaVersion; }), /schemaVersion/);
  assertFails(S, broken(v, (d) => { d.mysteryField = 1; }), /(mysteryField|Unrecognized)/);
  return v;
};

test('ConfigFigureCanvas: 実データが通り、寸法・参照・重複・語彙の誤りが落ちる', () => {
  const S = SCHEMAS.ConfigFigureCanvas;
  assertOk(S, 'config.figure-canvas');
  const v = commonFailures(S, 'config.figure-canvas');
  assertFails(S, broken(v, (d) => { d.canvases.feed.viewBox = [400]; }), /canvases\.feed\.viewBox/);
  assertFails(S, broken(v, (d) => { d.canvases.feed.role = 'main'; }), /canvases\.feed\.role/);
  assertFails(S, broken(v, (d) => { d.derived['vertical-9-16'].from = 'portrait'; }), /derived\.vertical-9-16\.from.*portrait/);
  assertFails(S, broken(v, (d) => { d.guard.migrationAllowlist = ['a.svg', 'a.svg']; }), /migrationAllowlist.*重複/);
  assertFails(S, broken(v, (d) => { d.updated = '2026-06-22T00:00:00Z'; }), /updated/);
});

test('ConfigFigureSources: 実データが通り、語彙・別名・重複・日付の誤りが落ちる', () => {
  const S = SCHEMAS.ConfigFigureSources;
  assertOk(S, 'config.figure-sources');
  const v = commonFailures(S, 'config.figure-sources');
  assertFails(S, broken(v, (d) => { d.manual_needs[0].needs = 'redo'; }), /manual_needs\.0\.needs/);
  assertFails(S, broken(v, (d) => { d.manual_needs[1].figure = d.manual_needs[0].figure; }), /manual_needs\.1.*重複/);
  assertFails(S, broken(v, (d) => { d.manual_needs[0].verified = '2026/07/09'; }), /manual_needs\.0\.verified/);
  assertFails(S, broken(v, (d) => { d.categories['civil-construction-1'].source_kind = 'photo'; }), /categories\.civil-construction-1/);
  assertFails(S, broken(v, (d) => { d.categories['concrete-diagnostician-jci']._alias = 'nowhere'; }), /_alias.*nowhere/);
  assertFails(S, broken(v, (d) => { delete d.categories['civil-construction-2'].rescannable; }), /categories\.civil-construction-2/);
});

test('ConfigImageLimits: 実データが通り、閾値・正規表現・欠けが落ちる', () => {
  const S = SCHEMAS.ConfigImageLimits;
  assertOk(S, 'config.image-limits');
  const v = commonFailures(S, 'config.image-limits');
  assertFails(S, broken(v, (d) => { d.maxBytes.png = '100KB'; }), /maxBytes\.png/);
  assertFails(S, broken(v, (d) => { d.maxBytes.PNG = 1; }), /maxBytes/);
  assertFails(S, broken(v, (d) => { d.filenamePattern = '^[A-Z'; }), /filenamePattern.*正規表現/);
  assertFails(S, broken(v, (d) => { d.roots = []; }), /roots/);
  assertFails(S, broken(v, (d) => { delete d.roots[0].dir; }), /roots\.0\.dir/);
});

test('ConfigPublicViewBreakpoints: 実データが通り、帯・名前・端末の誤りが落ちる', () => {
  const S = SCHEMAS.ConfigPublicViewBreakpoints;
  assertOk(S, 'config.public-view-breakpoints');
  const v = commonFailures(S, 'config.public-view-breakpoints');
  assertFails(S, broken(v, (d) => { d.note.viewports[0].device = 'watch'; }), /note\.viewports\.0\.device/);
  assertFails(S, broken(v, (d) => { d.note.allPagesViewport = 'sp-xl'; }), /allPagesViewport/);
  assertFails(S, broken(v, (d) => { d.youtube.viewports[1].name = d.youtube.viewports[0].name; }), /youtube\.viewports.*重複/);
  assertFails(S, broken(v, (d) => { d.note.breakpoints = [480, 360]; }), /note\.breakpoints.*昇順/);
  assertFails(S, broken(v, (d) => { d.note.measuredAt = '2026-09-23T00:00:00Z'; }), /note\.measuredAt/);
  assertFails(S, broken(v, (d) => { delete d.userAgents.tablet; }), /userAgents\.tablet/);
});

test('ConfigStandardsStructure: 実データが通り、文書名・二重指定・理由の誤りが落ちる', () => {
  const S = SCHEMAS.ConfigStandardsStructure;
  assertOk(S, 'config.standards-structure');
  const v = commonFailures(S, 'config.standards-structure');
  assertFails(S, broken(v, (d) => { d.build.documents[0] = 'chubu'; }), /build\.documents\.0/);
  assertFails(S, broken(v, (d) => { d.build.documents.push(d.build.documents[0]); }), /build\.documents.*重複/);
  assertFails(S, broken(v, (d) => { d.skipped.reasons['duplicate-source'].documents = ['kinki/common']; }), /skipped\.reasons\.duplicate-source.*build\.documents/);
  assertFails(S, broken(v, (d) => { d.skipped.reasons.other = { label: 'x', documents: '*' }; }), /skipped\.reasons.*1 つだけ/);
  assertFails(S, broken(v, (d) => { d.documents['chubu/common'].bodyStartPage = 0; }), /bodyStartPage/);
  assertFails(S, broken(v, (d) => { delete d.canonical.commonAgencyId; }), /canonical\.commonAgencyId/);
});

test('ConfigOgpSettings: 実データが通り、テンプレート参照・文字の大きさ・規則の誤りが落ちる', () => {
  const S = SCHEMAS.ConfigOgpSettings;
  assertOk(S, 'config.ogp-settings');
  const v = commonFailures(S, 'config.ogp-settings');
  assertFails(S, broken(v, (d) => { d.rules.default = 'navy-white'; }), /rules\.default.*navy-white/);
  assertFails(S, broken(v, (d) => { d.rules.rules = [{ match: { category: 'a' }, template: 'dark-wood' }]; }), /rules\.rules\.0\.template.*dark-wood/);
  assertFails(S, broken(v, (d) => { d.rules.rules = [{ match: { cat: 'a' }, template: 'mono-tag' }]; }), /rules\.rules\.0\.match/);
  assertFails(S, broken(v, (d) => { d.text.fontSizeTable = [48, 76]; }), /fontSizeTable.*大きい順/);
  assertFails(S, broken(v, (d) => { d.text.maxLines = '4'; }), /text\.maxLines/);
  assertFails(S, broken(v, (d) => { delete d.text.budouX.enabled; }), /text\.budouX\.enabled/);
  assertFails(S, broken(v, (d) => { d.templates.templates['mono-tag'].backgroundImage = undefined; }), /backgroundImage/);
});

test('ConfigXAccount: 実データが通り、ハンドル・字数・投稿時刻の誤りが落ちる', () => {
  const S = SCHEMAS.ConfigXAccount;
  assertOk(S, 'config.x-account');
  const v = commonFailures(S, 'config.x-account');
  assertFails(S, broken(v, (d) => { d.handle = '@doboku373'; }), /handle/);
  assertFails(S, broken(v, (d) => { d.platform = 'instagram'; }), /platform/);
  assertFails(S, broken(v, (d) => { d.profile.bio = 'あ'.repeat(161); }), /profile\.bio.*160/);
  assertFails(S, broken(v, (d) => { d.profile.displayName = 'a'.repeat(51); }), /profile\.displayName.*50/);
  assertFails(S, broken(v, (d) => { d.profile.pinnedPost.postedAt = '2026-09-27 18:52'; }), /pinnedPost\.postedAt/);
  assertFails(S, broken(v, (d) => { d.profile.pinnedPost.postUrl = 'x.com/a'; }), /pinnedPost\.postUrl/);
  assertFails(S, broken(v, (d) => { delete d.limits.bio; }), /limits\.bio/);
});

test('ConfigIgAccount: 実データが通り、固定投稿・字数・asset_id の誤りが落ちる', () => {
  const S = SCHEMAS.ConfigIgAccount;
  assertOk(S, 'config.ig-account');
  const v = commonFailures(S, 'config.ig-account');
  assertFails(S, broken(v, (d) => { d.graph.apiVersion = '23'; }), /graph\.apiVersion/);
  assertFails(S, broken(v, (d) => { d.graph.businessAccountId = ''; }), /graph\.businessAccountId/);
  assertFails(S, broken(v, (d) => { d.profile.pinnedPosts[1].order = 1; }), /pinnedPosts.*重複/);
  assertFails(S, broken(v, (d) => { d.profile.bio = 'あ'.repeat(151); }), /profile\.bio.*150/);
  assertFails(S, broken(v, (d) => { d.businessSuite.assetId = 'abc'; }), /businessSuite\.assetId/);
  assertFails(S, broken(v, (d) => { delete d.profile.highlights; }), /profile\.highlights/);
});

test('ConfigXRepost: 実データが通り、待機・タグ・検索の誤りが落ちる', () => {
  const S = SCHEMAS.ConfigXRepost;
  assertOk(S, 'config.x-repost');
  const v = commonFailures(S, 'config.x-repost');
  assertFails(S, broken(v, (d) => { d.minDelaySec = d.maxDelaySec + 1; }), /minDelaySec.*上限/);
  assertFails(S, broken(v, (d) => { d.maxPerRun = 0; }), /maxPerRun/);
  assertFails(S, broken(v, (d) => { d.queries[0].minFaves = '10'; }), /queries\.0\.minFaves/);
  assertFails(S, broken(v, (d) => { d.baseTags['civil-1'] = ['1級土木']; }), /baseTags\.civil-1/);
  assertFails(S, broken(v, (d) => { delete d.blocklist.bannedKeywords; }), /blocklist\.bannedKeywords/);
  assertFails(S, broken(v, (d) => { d.queries[0].query = 'x'; }), /(queries\.0|Unrecognized)/);
});

test('ConfigCharacterPoses: 実データが通り、語彙・切り取り・重複の誤りが落ちる', () => {
  const S = SCHEMAS.ConfigCharacterPoses;
  assertOk(S, 'config.character-poses');
  const v = commonFailures(S, 'config.character-poses');
  assertFails(S, broken(v, (d) => { d.poses[1].slug = d.poses[0].slug; }), /poses\.1.*重複/);
  assertFails(S, broken(v, (d) => { d.poses[0].slug = 'Pointing'; }), /poses\.0\.slug/);
  assertFails(S, broken(v, (d) => { d.poses[0].category = 'pose'; }), /poses\.0\.category/);
  assertFails(S, broken(v, (d) => { d.poses[0].beats = ['outro']; }), /poses\.0\.beats\.0/);
  assertFails(S, broken(v, (d) => { d.poses[0].composition.uses = ['sales']; }), /poses\.0\.composition\.uses\.0.*catalog\.uses/);
  assertFails(S, broken(v, (d) => { d.poses[0].composition.facing = 'back'; }), /composition\.facing/);
  assertFails(S, broken(v, (d) => { d.poses[0].quality.status = 'ok'; }), /quality\.status/);
  assertFails(S, broken(v, (d) => { d.poses[0].framing.variants.full.box = [0, 0, 1, 0.9]; }), /variants\.full\.box.*0,0,1,1/);
  assertFails(S, broken(v, (d) => { d.poses[0].framing.variants.bust.box = [0.5, 0, 0.8, 0.3]; }), /variants\.bust\.box.*外/);
  assertFails(S, broken(v, (d) => { d.poses[0].framing.variants.full.box = null; }), /variants\.full\.box/);
  assertFails(S, broken(v, (d) => { d.poses[0].framing.source.sha256 = 'abc'; }), /framing\.source\.sha256/);
  assertFails(S, broken(v, (d) => { d.poses[0].file = 'pointing.jpg'; }), /poses\.0\.file/);
});

test('ConfigVideoBrand: 実データが通り、画像の記録・日付の誤りが落ちる', () => {
  const S = SCHEMAS.ConfigVideoBrand;
  assertOk(S, 'config.video-brand');
  const v = commonFailures(S, 'config.video-brand');
  assertFails(S, broken(v, (d) => { d.logo.sha256 = d.logo.sha256.slice(1); }), /logo\.sha256/);
  assertFails(S, broken(v, (d) => { d.shorts.width = 0; }), /shorts\.width/);
  assertFails(S, broken(v, (d) => { delete d.longformBackground.path; }), /longformBackground\.path/);
  assertFails(S, broken(v, (d) => { d.adoptedAt = '2026-09'; }), /adoptedAt/);
});

test('ConfigVideoContent: 実データが通り、遷移・尺・カタログの誤りが落ちる', () => {
  const S = SCHEMAS.ConfigVideoContent;
  assertOk(S, 'config.video-content');
  const v = commonFailures(S, 'config.video-content');
  assertFails(S, broken(v, (d) => { d.state.transitions.draft = ['shipped']; }), /transitions\.draft\.0.*statusEnum/);
  assertFails(S, broken(v, (d) => { delete d.state.transitions.stopped; }), /state\.transitions.*stopped/);
  assertFails(S, broken(v, (d) => { d.state.approvalRequiredFrom = 'ok'; }), /approvalRequiredFrom/);
  assertFails(S, broken(v, (d) => { d.state.statusEnum.push('draft'); }), /statusEnum.*重複/);
  assertFails(S, broken(v, (d) => { d.storyboard.durationSeconds.shorts.recommendedMax = 999; }), /durationSeconds\.shorts.*収まっていない/);
  assertFails(S, broken(v, (d) => { d.storyboard.durationSeconds.longform.min = 5000; }), /durationSeconds\.longform.*最大/);
  assertFails(S, broken(v, (d) => { d.cta.catalogs['coconala-ad'] = 'src/x.ts'; }), /cta\.catalogs\.coconala-ad/);
  assertFails(S, broken(v, (d) => { d.manifest.packIdPattern = '^[a-z'; }), /packIdPattern/);
  assertFails(S, broken(v, (d) => { d.forbiddenBinaryExtensions = ['mp4']; }), /forbiddenBinaryExtensions/);
  assertFails(S, broken(v, (d) => { d.utm = { source: 'youtube' }; }), /(utm|Unrecognized)/);
});

test('ConfigYoutubeDelivery: 実データが通り、上限・SHA・工程の誤りが落ちる', () => {
  const S = SCHEMAS.ConfigYoutubeDelivery;
  assertOk(S, 'config.youtube-delivery');
  const v = commonFailures(S, 'config.youtube-delivery');
  assertFails(S, broken(v, (d) => { d.dailyLimits.upload = 101; }), /dailyLimits\.upload/);
  assertFails(S, broken(v, (d) => { d.dailyLimits.delete = -1; }), /dailyLimits\.delete/);
  assertFails(S, broken(v, (d) => { delete d.dailyLimits.schedule; }), /dailyLimits\.schedule/);
  assertFails(S, broken(v, (d) => { d.planSha256 = 'abc'; }), /planSha256/);
  assertFails(S, broken(v, (d) => { d.enabled = 'true'; }), /enabled/);
  assertFails(S, broken(v, (d) => { d.dailyLimits.publish = 1; }), /(dailyLimits|Unrecognized)/);
});

test('ConfigYoutubeProductionDisclosure: 実データが通り、申告・文面の欠けが落ちる', () => {
  const S = SCHEMAS.ConfigYoutubeProductionDisclosure;
  assertOk(S, 'config.youtube-production-disclosure');
  const v = commonFailures(S, 'config.youtube-production-disclosure');
  assertFails(S, broken(v, (d) => { d.containsSyntheticMedia = 'false'; }), /containsSyntheticMedia/);
  assertFails(S, broken(v, (d) => { d.authorityNotice = ''; }), /authorityNotice/);
  assertFails(S, broken(v, (d) => { delete d.profile; }), /profile/);
});

test('ConfigReferenceSources: 実データが通り、区分・出どころ・id・参照の誤りが落ちる', () => {
  const S = SCHEMAS.ConfigReferenceSources;
  assertOk(S, 'config.reference-sources');
  const v = commonFailures(S, 'config.reference-sources');
  const drive = v.sources.findIndex((s) => s.origin.kind === 'drive');
  const bundle = v.sources.findIndex((s) => s.bookBundle);
  assert.ok(drive >= 0 && bundle >= 0, 'テストの前提: drive と bookBundle の行がある');
  assertFails(S, broken(v, (d) => { d.sources[1].id = d.sources[0].id; }), /sources\.1.*重複/);
  assertFails(S, broken(v, (d) => { d.sources[0].id = 'Bad_Id'; }), /sources\.0\.id/);
  assertFails(S, broken(v, (d) => { d.sources[0].class = 'mystery'; }), /sources\.0\.class.*mystery/);
  assertFails(S, broken(v, (d) => { d.classes['commercial-book'].verbatim = 'always'; }), /classes\.commercial-book\.verbatim/);
  assertFails(S, broken(v, (d) => { d.classes['commercial-book'].figureReuse = 'no'; }), /figureReuse/);
  assertFails(S, broken(v, (d) => { delete d.sources[drive].origin.vaultDir; }), new RegExp(`sources\\.${drive}\\.origin`));
  assertFails(S, broken(v, (d) => { d.sources[0].origin = { kind: 'cloud' }; }), /sources\.0\.origin/);
  assertFails(S, broken(v, (d) => { d.sources[bundle].bookBundle.transcriptDir = 'tmp/ocr'; }), /bookBundle\.transcriptDir/);
  assertFails(S, broken(v, (d) => { delete d.sources[bundle].bookBundle.renderProfile.mode; }), /renderProfile\.mode/);
  assertFails(S, broken(v, (d) => { d.sources[0].appliesTo = ['docs/a.md']; }), /sources\.0\.appliesTo/);
  assertFails(S, broken(v, (d) => { d.sources[0].author = 'x'; }), /(sources\.0|Unrecognized)/);
});

test('設定の型はすべて JSON Schema にでき、タイトルを持つ', () => {
  for (const name of ['ConfigFigureCanvas', 'ConfigFigureSources', 'ConfigImageLimits', 'ConfigPublicViewBreakpoints', 'ConfigStandardsStructure', 'ConfigOgpSettings', 'ConfigXAccount', 'ConfigXRepost', 'ConfigIgAccount', 'ConfigCharacterPoses', 'ConfigVideoBrand', 'ConfigVideoContent', 'ConfigYoutubeDelivery', 'ConfigYoutubeProductionDisclosure', 'ConfigReferenceSources']) {
    const S = SCHEMAS[name];
    assert.ok(S, `${name} が export されていない`);
    assert.doesNotThrow(() => z.toJSONSchema(S), `${name} を JSON Schema にできない`);
    assert.ok(S.meta()?.title, `${name} に .meta({ title }) が無い`);
  }
});
