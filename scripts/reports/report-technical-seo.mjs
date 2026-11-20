#!/usr/bin/env node
/**
 * report-technical-seo.mjs — 技術 SEO の記録（build 検査の履歴・seo-meta・index-coverage・sitemap）を束ねて、悪化と欠測を数える
 * （旧 technical-seo-auditor の束ねと「前回比の悪化」の判定を移した・DN-1242）
 * ---------------------------------------------------------------------------
 * 決定的な検出（404・canonical 不一致・broken link の有無）は check-seo-build / check-seo-meta が済ませている。
 * ここは CI が記録した結果（コミット済み）を読み、次を機械で決める。読み手は /google-search-growth。
 *   build     最新の error>0 → FAIL / 前回より error が増えた・新しい型の error / warn が増えた → 悪化 / 検査数 < sitemap の 90% → FAIL / 最新が 3 日より古い → 欠測 WARN
 *   seo-meta  HIGH の違反 → FAIL / 違反 URL の型別件数 / 生成が 14 日より古い → 欠測 WARN
 *   coverage  indexed_ratio の最新と前回の差（2 pt 以上の低下 → 悪化 WARN）/ sitemap URL 数が build と 5% 超ずれ → WARN
 *   sitemap   送信エラー > 0 → FAIL / 警告 > 0 → WARN / 最後の読み込みが 14 日より古い → 欠測 WARN
 * 意味の判断（何を先に直すか・改善案の文章化）は出力の JSON を親が読んで行う。
 *
 * 使い方: node scripts/reports/report-technical-seo.mjs [--root <repo>] [--now <ISO>] [--json]
 * exit: 0=FAIL なし / 1=FAIL あり / 2=検査不成立（4 つの記録のどれも読めない）
 * ---------------------------------------------------------------------------
 */
import { join } from 'node:path';
import { parseCliArgs } from '../lib/cli-args.mjs';
import { datasetPath } from '../lib/datasets.mjs';
import { REPO_ROOT } from '../lib/repository-paths.mjs';
import { exitCodeOf, readJsonOrNull } from '../lib/run-audit.mjs';
import { isCliEntry } from '../lib/cli-run.mjs';

const TAG = '[report-technical-seo]';
export const LIMITS = { buildStaleDays: 3, metaStaleDays: 14, sitemapStaleDays: 14, coverageDropPt: 0.02, sitemapDriftRatio: 0.05, minCoverage: 0.9 };
const days = (iso, now) => (iso ? (now - Date.parse(iso)) / 86_400_000 : null);

/** pure。入力は各記録の JSON（読めなければ null）。 */
export function buildTechnicalSeoReport({ build, meta, coverage, sitemaps, now = Date.now() }) {
  const flags = [];
  const flag = (level, code, message) => flags.push({ level, code, message });
  let checked = 0;

  const hist = Array.isArray(build?.history) ? build.history : [];
  const latest = hist.at(-1) ?? null;
  const prev = hist.at(-2) ?? null;
  if (!latest) flag('warn', 'build-missing', 'seo-build-summary に履歴が無い（CI の Publish SEO build summary が回っていない）');
  else {
    checked += 1;
    const age = days(latest.generatedAt, now);
    if (age != null && age > LIMITS.buildStaleDays) flag('warn', 'build-stale', `build 検査の最新が ${Math.floor(age)} 日前（${latest.date}）`);
    if (latest.errors > 0) flag('fail', 'build-errors', `build 検査に error ${latest.errors} 件（${Object.entries(latest.errorsByCode ?? {}).map(([k, v]) => `${k}=${v}`).join(', ')}）`);
    if (latest.sitemapUrls > 0 && latest.checked / latest.sitemapUrls < LIMITS.minCoverage) flag('fail', 'build-coverage', `検査 ${latest.checked} / sitemap ${latest.sitemapUrls}（${Math.round(100 * latest.checked / latest.sitemapUrls)}% < ${LIMITS.minCoverage * 100}%）`);
    if (prev) {
      const newCodes = Object.keys(latest.errorsByCode ?? {}).filter((c) => !(prev.errorsByCode ?? {})[c]);
      if (latest.errors > prev.errors) flag('warn', 'build-worse', `error が前回（${prev.date}）の ${prev.errors} から ${latest.errors} へ増加${newCodes.length ? `・新しい型: ${newCodes.join(', ')}` : ''}`);
      if (latest.warnings > prev.warnings) flag('warn', 'build-warn-up', `warn が前回の ${prev.warnings} から ${latest.warnings} へ増加`);
    }
  }

  if (!meta?.summary) flag('warn', 'meta-missing', 'seo-meta.json が読めない');
  else {
    checked += 1;
    const age = days(meta.generated_at, now);
    if (age != null && age > LIMITS.metaStaleDays) flag('warn', 'meta-stale', `seo-meta の生成が ${Math.floor(age)} 日前`);
    if ((meta.summary.by_severity?.HIGH ?? 0) > 0) flag('fail', 'meta-high', `seo-meta に HIGH の違反 ${meta.summary.by_severity.HIGH} 件`);
    for (const [type, urls] of Object.entries(meta.violations_by_type ?? {})) flag('info', 'meta-violation', `${type}: ${urls.length} URL（例 ${urls[0]}）`);
  }

  const ents = Array.isArray(coverage?.entries) ? coverage.entries : [];
  const cl = ents.at(-1) ?? null;
  const cp = ents.at(-2) ?? null;
  if (!cl) flag('warn', 'coverage-missing', 'index-coverage の履歴が無い');
  else {
    checked += 1;
    if (cp && typeof cl.indexed_ratio === 'number' && typeof cp.indexed_ratio === 'number' && cp.indexed_ratio - cl.indexed_ratio >= LIMITS.coverageDropPt) {
      flag('warn', 'coverage-drop', `indexed_ratio が ${cp.date} の ${cp.indexed_ratio} から ${cl.date} の ${cl.indexed_ratio} へ低下`);
    }
    if (latest && cl.sitemap_urls > 0 && Math.abs(cl.sitemap_urls - latest.sitemapUrls) / latest.sitemapUrls > LIMITS.sitemapDriftRatio) {
      flag('warn', 'sitemap-drift', `sitemap の URL 数が build（${latest.sitemapUrls}）と coverage（${cl.sitemap_urls}・${cl.date}）で 5% 超ずれている`);
    }
  }

  const sm = Array.isArray(sitemaps?.sitemaps) ? sitemaps.sitemaps : [];
  if (sm.length === 0) flag('warn', 'sitemap-missing', 'sitemaps.json に送信済みの sitemap が無い');
  else {
    checked += 1;
    for (const s of sm) {
      if ((s.errors ?? 0) > 0) flag('fail', 'sitemap-errors', `${s.path}: Google 側のエラー ${s.errors} 件`);
      if ((s.warnings ?? 0) > 0) flag('warn', 'sitemap-warnings', `${s.path}: Google 側の警告 ${s.warnings} 件`);
      const age = days(s.lastDownloaded, now);
      if (age != null && age > LIMITS.sitemapStaleDays) flag('warn', 'sitemap-stale', `${s.path}: 最後の読み込みが ${Math.floor(age)} 日前`);
    }
  }

  return {
    check: 'technical-seo',
    checked,
    inputs: { build: latest ? { date: latest.date, checked: latest.checked, sitemapUrls: latest.sitemapUrls, errors: latest.errors, warnings: latest.warnings } : null, indexedRatio: cl?.indexed_ratio ?? null },
    fail: flags.filter((x) => x.level === 'fail').map((x) => x.message),
    warn: flags.filter((x) => x.level === 'warn').map((x) => x.message),
    info: flags.filter((x) => x.level === 'info').map((x) => x.message),
    flags,
  };
}

export function readTechnicalSeoInputs(root) {
  const at = (id) => readJsonOrNull(join(root, datasetPath(id)));
  return { build: at('analysis.seo-build-summary'), meta: at('analysis.seo-meta'), coverage: at('gsc.index-coverage-history'), sitemaps: at('gsc.sitemaps') };
}

const isMain = isCliEntry(import.meta.url);
if (isMain) {
  const args = parseCliArgs({ root: { type: 'string' }, now: { type: 'string' }, json: { type: 'boolean' } });
  const r = buildTechnicalSeoReport({ ...readTechnicalSeoInputs(args.root ?? REPO_ROOT), now: args.now ? Date.parse(args.now) : Date.now() });
  const code = exitCodeOf(r);
  if (args.json) console.log(JSON.stringify({ ...r, exit: code }, null, 2));
  else {
    for (const m of r.info) console.log(`${TAG} INFO ${m}`);
    for (const m of r.warn) console.log(`${TAG} WARN ${m}`);
    for (const m of r.fail) console.log(`${TAG} FAIL ${m}`);
    const b = r.inputs.build;
    console.log(`${TAG} 記録 ${r.checked}/4 を読んだ${b ? `・build ${b.date}: 検査 ${b.checked} / sitemap ${b.sitemapUrls} / error ${b.errors} / warn ${b.warnings}` : ''}・indexed_ratio ${r.inputs.indexedRatio ?? '不明'}・FAIL ${r.fail.length} / WARN ${r.warn.length}`);
    if (code === 2) console.error(`${TAG} 検査不成立: 記録を 1 つも読めていない`);
  }
  process.exit(code);
}
