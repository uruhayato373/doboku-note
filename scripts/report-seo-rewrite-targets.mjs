#!/usr/bin/env node
/**
 * report-seo-rewrite-targets.mjs — seoTitle・description を検索語に合わせる候補のページを、GSC の page×query から出す。
 *
 * 平均 4〜20 位で表示があるのにクリックが少ないページは、順位より検索結果のタイトル・説明が検索の問いに答えていないことが多い
 * （CTR の打ち手。.claude/memory/feedback_hub_strengthening_approach.md）。1 ページごとに上位の検索語と、今の seoTitle・description を並べる。
 *
 *   node scripts/report-seo-rewrite-targets.mjs --area pe-construction [--min-impressions 40] [--limit 40] [--date 2026-11-08] [--out .tmp/seo-targets]
 *   area: 資格のカテゴリ（/exam/<area>/…）・practice・standards
 *
 * 書き換えは scripts/apply-seo-meta.mjs。standards は生成ページで MDX が無い（config/standards-structure.json の seo で上書きする）。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import matter from 'gray-matter';
import { parseCliArgs } from './lib/cli-args.mjs';
import { datasetFiles, datasetPath } from './lib/datasets.mjs';
import { REPO_ROOT, SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';
import { SITE_ORIGIN } from '../src/config/site-identity.mjs';

const args = parseCliArgs({
  area: { type: 'string' },
  'min-impressions': { type: 'integer', default: 40 },
  limit: { type: 'integer', default: 40 },
  date: { type: 'string' },
  out: { type: 'string', default: '.tmp/seo-targets' },
  'min-position': { type: 'number', default: 4 },
  'max-position': { type: 'number', default: 20 },
});
if (!args.area) { console.error('usage: --area <pe-construction|pe-comprehensive-management|civil-construction-1|practice|standards|…>'); process.exit(2); }

/** page×query を持つ最新の取得（水曜分は page だけのことがあるので、新しい順に探す） */
function pickReport() {
  if (args.date) return join(REPO_ROOT, datasetPath('gsc.reports', { date: args.date }));
  for (const rel of datasetFiles(REPO_ROOT, 'gsc.reports')) {
    const f = join(REPO_ROOT, rel);
    if (JSON.parse(readFileSync(f, 'utf8')).reports?.['page-query']) return f;
  }
  return null;
}

const reportPath = pickReport();
if (!reportPath || !existsSync(reportPath)) { console.error('page×query を持つ GSC の取得が無い（検査不成立）'); process.exit(2); }
const report = JSON.parse(readFileSync(reportPath, 'utf8')).reports;
const req = report.page?.meta?.requests?.[0] ?? {};

// 見出しへのリンク（#…）は GSC が別の URL として数えるので、ページにまとめる
const pathOf = (url) => url.replace(SITE_ORIGIN, '').replace(/#.*$/, '').replace(/\/$/, '');
const inArea = (p) => (args.area === 'practice' || args.area === 'standards')
  ? p.startsWith(`/${args.area}/`)
  : p === `/exam/${args.area}` || p.startsWith(`/exam/${args.area}/`);

/** URL → 記事の MDX（/exam/<cat>/<group>/<slug> と /practice/<slug>）。置き場は <slug> か <group>-<slug>。standards とハブは null */
function mdxOf(p) {
  let m = p.match(/^\/exam\/([^/]+)\/([^/]+)\/([^/]+)$/);
  if (m) {
    for (const dir of [m[3], `${m[2]}-${m[3]}`]) {
      const f = join(SITE_CONTENT_ROOT, m[1], dir, 'article.mdx');
      if (existsSync(f)) return f;
    }
    return null;
  }
  m = p.match(/^\/practice\/([^/]+)$/);
  if (m) return join(SITE_CONTENT_ROOT, 'civil-practice', m[1], 'article.mdx');
  return null;
}

/** 同じページの行（見出しの URL 違い）を足し合わせる。順位は表示で重み付けした平均 */
const byPath = new Map();
for (const r of report.page?.rows ?? []) {
  const path = pathOf(r.keys[0]);
  const a = byPath.get(path) ?? { path, clicks: 0, impressions: 0, pw: 0 };
  a.clicks += r.clicks; a.impressions += r.impressions; a.pw += r.position * r.impressions;
  byPath.set(path, a);
}
const pages = [...byPath.values()].map((a) => ({ path: a.path, clicks: a.clicks, impressions: a.impressions, ctr: a.impressions ? a.clicks / a.impressions : 0, position: a.impressions ? a.pw / a.impressions : 0 }));
const inspected = pages.filter((r) => inArea(r.path));
const targets = inspected
  .filter((r) => r.impressions >= args.minImpressions && r.position >= args.minPosition && r.position <= args.maxPosition)
  .sort((a, b) => b.impressions - a.impressions)
  .slice(0, args.limit);

const pq = report['page-query']?.rows ?? [];
const out = targets.map((t) => {
  const qm = new Map();
  for (const r of pq) {
    if (pathOf(r.keys[0]) !== t.path) continue;
    const a = qm.get(r.keys[1]) ?? { query: r.keys[1], impressions: 0, clicks: 0, pw: 0 };
    a.impressions += r.impressions; a.clicks += r.clicks; a.pw += r.position * r.impressions;
    qm.set(r.keys[1], a);
  }
  const queries = [...qm.values()].sort((a, b) => b.impressions - a.impressions).slice(0, 5)
    .map((a) => ({ query: a.query, impressions: a.impressions, clicks: a.clicks, position: Math.round((a.pw / a.impressions) * 10) / 10 }));
  const file = mdxOf(t.path);
  let fm = null;
  if (file && existsSync(file)) {
    const d = matter(readFileSync(file, 'utf8')).data;
    fm = { title: d.title ?? null, seoTitle: d.seoTitle ?? null, description: typeof d.description === 'string' ? d.description.trim() : null };
  }
  return {
    path: t.path, file: file && existsSync(file) ? relative(REPO_ROOT, file) : null,
    impressions: t.impressions, clicks: t.clicks, ctr: Math.round(t.ctr * 1000) / 10, position: Math.round(t.position * 10) / 10,
    queries, current: fm,
  };
});

const outDir = join(REPO_ROOT, args.out);
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, `${args.area}.json`);
writeFileSync(outFile, JSON.stringify({ area: args.area, report: relative(REPO_ROOT, reportPath), window: `${req.startDate ?? '?'}〜${req.endDate ?? '?'}`, targets: out }, null, 2) + '\n');

console.log(`[seo-targets] ${args.area}: 取得 ${relative(REPO_ROOT, reportPath)}（${req.startDate ?? '?'}〜${req.endDate ?? '?'}）`);
console.log(`[seo-targets] 面のページ ${inspected.length} 件を検査 → 候補 ${out.length} 件（表示 ${args.minImpressions} 以上・平均 ${args.minPosition}〜${args.maxPosition} 位）・MDX あり ${out.filter((o) => o.file).length} 件`);
console.log(`[seo-targets] → ${relative(REPO_ROOT, outFile)}`);
if (inspected.length === 0) { console.error('面のページが 1 件も無い（area の綴りを確かめる・検査不成立）'); process.exit(1); }
