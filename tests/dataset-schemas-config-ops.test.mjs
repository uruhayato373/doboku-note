import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as SCHEMAS from '../scripts/lib/dataset-schemas.mjs';
import { listAreaFiles, matchFiles } from '../scripts/lib/datasets.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const files = ['config', 'data'].flatMap((area) => listAreaFiles(ROOT, area, { tracked: true }));
const { byId: filesById } = matchFiles(files);
const all = (id) => {
  const fs = filesById.get(id) ?? [];
  assert.ok(fs.length > 0, `${id}: git 管理下のファイルが 0 件（未検査を通さない）`);
  return fs.map((f) => ({ file: f, value: JSON.parse(readFileSync(join(ROOT, f), 'utf8')) }));
};
const latest = (id) => all(id)[0].value;
const issues = (schema, value) => {
  const r = schema.safeParse(value);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.') || '(全体)'}: ${i.message}`);
};
const assertAllOk = (schema, id) => {
  for (const { file, value } of all(id)) assert.deepEqual(issues(schema, value), [], `${file} が型を通らない`);
};
const assertFails = (schema, value, pattern) => {
  const found = issues(schema, value);
  assert.ok(found.some((l) => pattern.test(l)), `${pattern} が出ない: ${JSON.stringify(found.slice(0, 5))}`);
};
const broken = (value, fn) => {
  const copy = globalThis.structuredClone(value);
  fn(copy);
  return copy;
};

/** 実データの全件が通り、版の誤り・知らない欄・各型固有の壊れ方が落ちる（breakers は [直し方, 期待するメッセージ] の並び） */
const check = (name, id, breakers) => {
  test(`${name}: 実データが通り、壊れた設定が落ちる`, () => {
    const S = SCHEMAS[name];
    assert.ok(S, `${name} が export されていない`);
    assertAllOk(S, id);
    const v = latest(id);
    assertFails(S, broken(v, (d) => { d.schemaVersion = 99; }), /schemaVersion/);
    assertFails(S, broken(v, (d) => { delete d.schemaVersion; }), /schemaVersion/);
    assertFails(S, broken(v, (d) => { d.mysteryKey = 1; }), /(mysteryKey|Unrecognized)/);
    for (const [fn, pattern] of breakers) assertFails(S, broken(v, fn), pattern);
  });
};

check('ConfigAffiliateAsp', 'config.affiliate-asp', [
  [(d) => { d.asps.afb.sites['doboku-note'] = 'abc'; }, /asps\.afb\.sites/],
  [(d) => { d.asps.moshimo.siteSeparation = 'cookie'; }, /asps\.moshimo\.siteSeparation/],
  [(d) => { d.asps.afb.listItemPattern = '(['; }, /asps\.afb\.listItemPattern/],
  [(d) => { d.asps.a8.connectionFrom = 'a8-report-automation'; }, /connectionFrom/],
  [(d) => { d.forbiddenSiteText = []; }, /forbiddenSiteText/],
  [(d) => { delete d.asps.moshimo; }, /asps\.moshimo/],
]);

check('ConfigA8ReportAutomation', 'config.a8-report-automation', [
  [(d) => { d.a8.mediaId = 'x123'; }, /a8\.mediaId/],
  [(d) => { d.a8.reports['site-summary'].siteScope = 'unknown'; }, /siteScope/],
  [(d) => { d.a8.columnAliases.site = 'サイト'; }, /columnAliases\.site/],
  [(d) => { d.a8.programIdMap.s00000000000001 = 5; }, /programIdMap/],
  [(d) => { d.a8.periodForm.granularity = 'week'; }, /periodForm\.granularity/],
  [(d) => { d.browser.timeoutMs = 0; }, /browser\.timeoutMs/],
]);

check('ConfigCareerFunnel', 'config.career-funnel', [
  [(d) => { d.pillarRules.push(d.pillarRules[0]); }, /柱「/],
  [(d) => { d.dimensionRegisteredAt.event_label = '2026/07/07'; }, /dimensionRegisteredAt/],
  [(d) => { delete d.baseline.date; }, /baseline\.date/],
  [(d) => { d.forbiddenCtaPhrases = []; }, /forbiddenCtaPhrases/],
]);

check('ConfigSearchStrategy', 'config.search-strategy', [
  [(d) => { d.striking.minPosition = 40; }, /minPosition は maxPosition より小さい/],
  [(d) => { d.clusters[0].queryPattern = '(['; }, /queryPattern/],
  [(d) => { d.clusters.push(d.clusters[0]); }, /クラスタ id「/],
  [(d) => { d.clusters[0].pagePrefixes = ['exam/']; }, /pagePrefixes/],
]);

check('ConfigSeoWatchwords', 'config.seo-watchwords', [
  [(d) => { d.watchwords[0].mode = 'observe'; }, /watchwords\.0\.mode/],
  [(d) => { d.watchwords[0].intent = 'other'; }, /watchwords\.0\.intent/],
  [(d) => { d.watchwords[0].priority = 4; }, /watchwords\.0\.priority/],
  [(d) => { d.watchwords[0].targetPath = '/exam/x/'; }, /targetPath/],
  [(d) => { d.watchwords.push(d.watchwords[0]); }, /見張りの id「/],
  [(d) => { d.strategy.reviewEveryDays = 3; }, /reviewEveryDays/],
  [(d) => { d.siteUrl = 'https://doboku-note.com'; }, /siteUrl/],
]);

check('ConfigSeoMeta', 'config.seo-meta-config', [
  [(d) => { d.thresholds.description.min_length = 300; }, /min_length は max_length 以下/],
  [(d) => { d.thresholds.description.max_length = 250; }, /max_length は lint_max_length 以下/],
  [(d) => { d.include_routes = ['exam']; }, /include_routes/],
  [(d) => { delete d.thresholds.title; }, /thresholds\.title/],
]);

check('ConfigGrowthCycle', 'config.growth-cycle', [
  [(d) => { d.digest.seo.lowCtrRatio = 3; }, /digest\.seo\.lowCtrRatio/],
  [(d) => { d.digest.seo.strikingPositionMin = 99; }, /strikingPositionMin は strikingPositionMax 以下/],
  [(d) => { d.digest.revenue.ctaClickEvents = []; }, /ctaClickEvents/],
  [(d) => { d.gscCountry = 'japan'; }, /gscCountry/],
]);

check('ConfigIndexnow', 'config.indexnow', [
  [(d) => { d.key = 'not-hex'; }, /key/],
  [(d) => { d.endpoint = 'indexnow'; }, /endpoint/],
  [(d) => { d.windowDays = 0; }, /windowDays/],
]);

check('ConfigGoogleConsoleAutomation', 'config.google-console-automation', [
  [(d) => { d.gsc.issueLabels.noindex = []; }, /issueLabels\.noindex/],
  [(d) => { delete d.gsc.issueLabels.redirect; }, /issueLabels\.redirect/],
  [(d) => { d.ga4.propertyId = 'abc'; }, /ga4\.propertyId/],
  [(d) => { d.gsc.sampleUrlCap = -1; }, /sampleUrlCap/],
]);

check('ConfigGa4AdminDesiredState', 'config.ga4-admin-desired-state', [
  [(d) => { d.customDimensions[0].scope = 'SESSION'; }, /customDimensions\.0\.scope/],
  [(d) => { d.customDimensions.push(d.customDimensions[0]); }, /parameterName「/],
  [(d) => { d.dataRetention.eventDataRetentionMonths = 6; }, /eventDataRetentionMonths/],
  [(d) => { d.keyEvents.push(d.keyEvents[0]); }, /eventName「/],
  [(d) => { d.propertyId = 'x'; }, /propertyId/],
]);

check('ConfigPsi', 'config.psi-config', [
  [(d) => { d.judgment.primary_source = 'crux'; }, /primary_source/],
  [(d) => { d.judgment.field_missing_policy = 'ignore'; }, /field_missing_policy/],
  [(d) => { d.thresholds.performance_score_min = 120; }, /performance_score_min/],
  [(d) => { d.field_thresholds.LCP_category_min = 'GOOD'; }, /LCP_category_min/],
  [(d) => { delete d.thresholds.LCP_ms_max; }, /LCP_ms_max/],
]);

check('ConfigUtmTemplates', 'config.utm-templates', [
  [(d) => { d.channels['x'] = { source: 'x', medium: 'social', content: '' }; }, /channels/],
  [(d) => { delete d.channels['x.post'].medium; }, /channels\.x\.post\.medium/],
  [(d) => { d.siteToNote.magazine.source = ''; }, /siteToNote\.magazine\.source/],
  [(d) => { d.ebook.kindle.campaign = 'x'; }, /ebook\.kindle/],
]);

check('ConfigCloudflare', 'config.cloudflare', [
  [(d) => { d.graphql = 'api'; }, /graphql/],
  [(d) => { d.rulesetPhases = ['a', 'a']; }, /重複/],
  [(d) => { d.zoneName = 'https://doboku-note.com'; }, /zoneName/],
]);

check('ConfigWorkflowHealth', 'config.workflow-health', [
  [(d) => { d.workflows[0].maxAgeDays = 0; }, /workflows\.0\.maxAgeDays/],
  [(d) => { d.workflows.push(d.workflows[0]); }, /ワークフロー@ブランチ「/],
  [(d) => { d.workflows[0].workflow = 'ci'; }, /workflows\.0\.workflow/],
  [(d) => { d.workflows.find((w) => w.schedule).schedule.activeSince = '2026-09-21'; }, /activeSince/],
  [(d) => { delete d.defaults.maxAgeDays; }, /defaults\.maxAgeDays/],
]);

check('ConfigAssetStorage', 'config.asset-storage', [
  [(d) => { d.groups[0].bucket = 'archive'; }, /groups\.0\.bucket/],
  [(d) => { d.groups[0].audience = 'cloud'; }, /groups\.0\.audience/],
  [(d) => { d.groups[0].match.pathRegex = '(['; }, /pathRegex/],
  [(d) => { d.buckets.private.publicHost = 'storage.example.com'; }, /buckets\.private\.publicHost/],
  [(d) => { d.cache.maxBytes = 0; }, /cache\.maxBytes/],
  [(d) => { delete d.groups[0].reason; }, /groups\.0\.reason/],
]);

check('ConfigDriveVault', 'config.drive-vault', [
  [(d) => { d.groups[0].status = 'done'; }, /groups\.0\.status/],
  [(d) => { d.groups[0].audience = 'site'; }, /groups\.0\.audience/],
  [(d) => { d.vaultRoot.candidates[0].platform = 'ios'; }, /candidates\.0\.platform/],
  [(d) => { d.vaultRoot.candidates[0].path = '/x'; }, /glob か path/],
  [(d) => { d.groups[0].match.pathRegex = '(['; }, /pathRegex/],
]);

check('ConfigGitBinaryPolicy', 'config.git-binary-policy', [
  [(d) => { d.sizeLimits.png = 'big'; }, /sizeLimits/],
  [(d) => { d.sizeLimits._comment = 5; }, /sizeLimits/],
  [(d) => { d.magicBytes.png = ['ZZ']; }, /magicBytes/],
  [(d) => { d.denyRules.push(d.denyRules[0]); }, /拒否ルールの id「/],
  [(d) => { d.allowlist[0].reason = ''; }, /allowlist\.0\.reason/],
  [(d) => { d.budgets['content/note'] = -1; }, /budgets/],
  [(d) => { d.denyRules[0].contentPattern = '(['; }, /contentPattern/],
]);

check('ConfigDiskHygiene', 'config.disk-hygiene', [
  [(d) => { d.thresholds.freeFailBytes = d.thresholds.freeWarnBytes + 1; }, /freeFailBytes は freeWarnBytes 以下/],
  [(d) => { d.thresholds.npxMaxAgeDays = 0; }, /npxMaxAgeDays/],
  [(d) => { d.stampPath.freebsd = '/x'; }, /stampPath/],
  [(d) => { d.reportOnly[0].path = ''; }, /reportOnly\.0\.path/],
  [(d) => { delete d.baseRefs; }, /baseRefs/],
]);

check('ConfigLocalResources', 'config.local-resources', [
  [(d) => { d.minFreeDiskGiB = -1; }, /minFreeDiskGiB/],
  [(d) => { d.budgetsGiB['.tmp'] = 0; }, /budgetsGiB/],
  [(d) => { d.cleanup.scratch.minAgeDays = 0; }, /cleanup\.scratch\.minAgeDays/],
  [(d) => { d.cleanup.scratch.unknown = 1; }, /cleanup\.scratch/],
  [(d) => { d.roots = []; }, /roots/],
]);
