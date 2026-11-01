#!/usr/bin/env node
/**
 * page-quality-inventory.mjs — サイトの全ページを採点プロファイル（config/page-quality-profiles.json）の種類に分け、
 * 種類ごとの件数・指標・評価役の有無を出す L0 の棚卸し（LLM を使わない・DN-0936）。
 *
 *   npm run page-quality-inventory            # 種類ごとの表
 *   npm run page-quality-inventory -- --json  # 機械向け（ページごとの指標を含む）
 *
 * 失敗（exit 1）にするのは、結果が設定と記事の中身だけで決まる食い違い:
 *   どの種類にも当たらないページ・2 つ以上に当たるページ・1 件も当たらない種類・
 *   実在しない評価役（.claude/agents/<名前>.md）・quality-audit に無い検査 id。
 * 評価役の無い資格は失敗にしない（穴の一覧として出す。埋めるのは DN-0937）。
 * 対象 0 件は検査不成立（exit 2）。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import matter from 'gray-matter';
import { REPO_ROOT, SITE_CONTENT_ROOT, CLAUDE_ROOT } from './lib/repository-paths.mjs';
import { listSiteMdx } from './lib/mdx-files.mjs';
import { listFiles } from './lib/fs-walk.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { readJson } from './lib/json-io.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { classifyPage, countMetrics, stripFrontmatter, median, evaluatorCoverage } from './lib/page-quality-profiles.mjs';
import { CHECKS } from './quality-audit.mjs';

/** 主の評価役（これが無い資格を「評価役なし」と数える） */
const PRIMARY_ROLES = ['rubric', 'tables'];

const flags = parseCliArgs({ json: { type: 'boolean' } });
const config = readDataset(REPO_ROOT, 'config.page-quality-profiles');
const { profiles } = config;
const categories = readJson(REPO_ROOT, 'src/config/categories.json');
const areaOf = new Map((Array.isArray(categories) ? categories : categories.categories).map((c) => [c.slug ?? c.id, c.area]));
const toRel = (abs) => relative(REPO_ROOT, abs).split(sep).join('/');

// ---- 対象の列挙 ---------------------------------------------------------------------------------
const pages = [];
for (const abs of listSiteMdx({ articleOnly: true })) {
  const raw = readFileSync(abs, 'utf8');
  let data = {};
  try { data = matter(raw).data; } catch { /* frontmatter を読めないページは group 無しで未分類に落ちる */ }
  const rel = toRel(abs);
  const category = data.category ?? rel.split('/')[2];
  pages.push({ rel, category, area: areaOf.get(category) ?? null, group: data.group ?? null, raw });
}
const pathRoots = [...new Set(profiles.flatMap((p) => p.match.paths ?? []))];
for (const root of pathRoots) {
  for (const abs of listFiles(join(REPO_ROOT, root), { ext: '.md', allowMissing: true })) {
    const rel = toRel(abs);
    if (rel.endsWith('/README.md')) continue;
    // 基準書は整備局（content/site/<置き場>/<整備局>/…）を資格の欄に入れて数える
    pages.push({ rel, category: rel.split('/')[3], area: null, group: null, raw: readFileSync(abs, 'utf8') });
  }
}
if (pages.length === 0) {
  console.error('[page-quality-inventory] 検査不成立: 対象のページが 0 件');
  process.exit(2);
}

// ---- 分類と指標 ---------------------------------------------------------------------------------
const problems = [];
const byProfile = new Map(profiles.map((p) => [p.id, []]));
for (const page of pages) {
  const hits = classifyPage(profiles, page);
  if (hits.length !== 1) {
    problems.push(`${page.rel}: ${hits.length === 0 ? 'どの種類にも当たらない' : `2 つ以上の種類に当たる（${hits.join('・')}）`}（area=${page.area} group=${page.group}）`);
    continue;
  }
  byProfile.get(hits[0]).push({ rel: page.rel, category: page.category, metrics: countMetrics(stripFrontmatter(page.raw)) });
}

const auditIds = new Set(CHECKS.map((c) => c.id));
for (const p of profiles) {
  if (byProfile.get(p.id).length === 0) problems.push(`種類「${p.id}」に当たるページが 0 件（match の誤りか、種類が要らなくなった）`);
  for (const e of p.evaluators) {
    if (!existsSync(join(CLAUDE_ROOT, 'agents', `${e.agent}.md`))) problems.push(`種類「${p.id}」の評価役「${e.agent}」が .claude/agents に無い`);
  }
  for (const id of p.machineChecks) if (!auditIds.has(id)) problems.push(`種類「${p.id}」の機械の検査「${id}」が quality-audit に無い`);
}

const summary = profiles.map((p) => {
  const list = byProfile.get(p.id);
  const pagesByCategory = {};
  for (const x of list) pagesByCategory[x.category] = (pagesByCategory[x.category] ?? 0) + 1;
  const coverage = evaluatorCoverage(p, pagesByCategory);
  const uncovered = coverage.filter((c) => !c.roles.some((r) => PRIMARY_ROLES.includes(r)));
  const metrics = Object.fromEntries(
    p.metrics.map((m) => {
      const values = list.map((x) => x.metrics[m]);
      return [m, { median: median(values), total: values.reduce((a, b) => a + b, 0) }];
    }),
  );
  return { id: p.id, label: p.label, pages: list.length, metrics, coverage, uncoveredPages: uncovered.reduce((a, c) => a + c.pages, 0), uncovered };
});

// ---- 出力 ---------------------------------------------------------------------------------------
if (flags.json) {
  const detail = Object.fromEntries([...byProfile].map(([id, list]) => [id, list]));
  process.stdout.write(`${JSON.stringify({ checkedPages: pages.length, problems, summary, pages: detail }, null, 2)}\n`);
} else {
  const classified = summary.reduce((a, s) => a + s.pages, 0);
  console.log(`[page-quality-inventory] ${pages.length} ページを実検査 / 種類に分けた ${classified} ページ / 種類 ${profiles.length}`);
  for (const s of summary) {
    const m = Object.entries(s.metrics).map(([k, v]) => `${k} 中央値 ${v.median ?? '-'}・計 ${v.total}`).join(' / ');
    console.log(`\n■ ${s.label}（${s.id}）${s.pages} ページ`);
    console.log(`  指標: ${m}`);
    console.log(`  評価役の無い資格: ${s.uncovered.length ? s.uncovered.map((c) => `${c.category} ${c.pages}`).join('・') : 'なし'}`);
    if (s.metrics.tableCaptions && s.metrics.tables) {
      console.log(`  展開: 表のキャプション ${s.metrics.tableCaptions.total} に対し表 ${s.metrics.tables.total} / 図のキャプション ${s.metrics.figureCaptions?.total ?? 0} に対し画像 ${s.metrics.images?.total ?? 0}`);
    }
  }
  const gapPages = summary.reduce((a, s) => a + s.uncoveredPages, 0);
  console.log(`\n評価役の無いページ: 計 ${gapPages}（DN-0937 で埋める）`);
  if (problems.length) {
    console.error(`\n✗ 食い違い ${problems.length} 件`);
    for (const p of problems.slice(0, 30)) console.error(`  - ${p}`);
    if (problems.length > 30) console.error(`  …他 ${problems.length - 30} 件`);
  } else {
    console.log('✓ 全ページがちょうど 1 つの種類に当たり、評価役と検査 id は実在する');
  }
}
process.exitCode = problems.length ? 1 : 0;
