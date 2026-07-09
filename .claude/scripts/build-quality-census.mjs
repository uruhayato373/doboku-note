#!/usr/bin/env node
/**
 * Quality Coverage Census Builder
 *
 * 全 published 記事（真実源: src/config/doc-meta-index.json）に対し、
 * ルーブリック採点の有無・weighted・本文実質字数を突合し、
 * 「資格 × group × {採点済み / 未採点 / 不合格 / 薄層}」の census を出力する。
 *
 * 背景: 内部ルーブリック（5軸）は「本文の実質分量」を軸に持たないため、
 * Google の index selection（demote）と直交する。body_chars を census に持たせ、
 * ルーブリックを改変せずに「薄層」を機械的に常時可視化する（2026-07 gsc-management RCA）。
 *
 * 採点ソース:
 *   - .claude/state/quality-scores.json         （cem = pe-comprehensive-management）
 *   - .claude/state/civil-quality-scores.json   （civil-textbook = civil-construction-1）
 *   - .claude/state/quality/{profile}-scores.json（新 profile・top-level `categories` 必須）
 * いずれも pages[key] のキーは category を除いた bare slug（`${category}-${key}` で full slug）。
 *
 * Usage:
 *   node .claude/scripts/build-quality-census.mjs
 *   npm run quality-census
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, extname, dirname } from 'node:path';

const ROOT = process.cwd();
const POSTS_ROOT = join(ROOT, '.local/r2/posts');
const DOC_META = join(ROOT, 'src/config/doc-meta-index.json');
const QUALITY_DIR = join(ROOT, '.claude/state/quality');
const OUT_PATH = join(QUALITY_DIR, 'census.json');

// 薄層判定の対象 group と字数下限（check-guide-length と同じ SoT: 3,000 字）
const THIN_GROUPS = new Set(['keyword', 'guide', 'textbook']);
const THIN_THRESHOLD = 3000;
// 合否ライン（quality-cycle 共通）
const FAIL_THRESHOLD = 2.0;

// 既存 2 ファイルの category スコープ（bare slug → full slug 解決用）
const LEGACY_SOURCES = [
  { file: join(ROOT, '.claude/state/quality-scores.json'), categories: ['pe-comprehensive-management'] },
  { file: join(ROOT, '.claude/state/civil-quality-scores.json'), categories: ['civil-construction-1'] },
];

// ── MDX 列挙 + slug（build-doc-meta-index.mjs と同一規則）─────────────
function walkMdx(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMdx(p));
    else if (entry.isFile() && extname(entry.name).toLowerCase() === '.mdx') out.push(p);
  }
  return out;
}

function toSlug(filePath) {
  const rel = relative(POSTS_ROOT, filePath);
  const withoutExt = rel.replace(/\.mdx$/i, '');
  const parts = withoutExt.split(/[\\/]/).filter((s) => s && s !== 'article');
  return parts.join('-');
}

// ── 本文実質字数（check-guide-length の SoT 計測に一致）───────────────
function splitFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { body: text };
  return { body: text.slice(m[0].length) };
}
function bodyLen(body) {
  return body.replace(/\s/g, '').length;
}

// ── 採点ソースの読み込み → scoreIndex（full slug → 採点）────────────
function loadScoreSources(docs) {
  const sources = [...LEGACY_SOURCES];
  // 新 profile: .claude/state/quality/*-scores.json（top-level categories 必須）
  if (existsSync(QUALITY_DIR)) {
    for (const name of readdirSync(QUALITY_DIR)) {
      if (!name.endsWith('-scores.json')) continue;
      sources.push({ file: join(QUALITY_DIR, name), categories: null });
    }
  }

  const scoreIndex = new Map();
  for (const src of sources) {
    if (!existsSync(src.file)) continue;
    let data;
    try {
      data = JSON.parse(readFileSync(src.file, 'utf8'));
    } catch (e) {
      console.error(`[census] skip (parse error): ${src.file} ${e.message}`);
      continue;
    }
    const categories = src.categories || data.categories;
    if (!categories || !categories.length) {
      console.error(`[census] skip (categories 未定義): ${relative(ROOT, src.file)}`);
      continue;
    }
    const pages = data.pages || {};
    for (const [key, entry] of Object.entries(pages)) {
      // bare slug → full slug 解決（既に prefix 付きならそのまま）
      let full = null;
      for (const c of categories) {
        const candidate = key.startsWith(`${c}-`) || key === c ? key : `${c}-${key}`;
        if (docs[candidate]) { full = candidate; break; }
      }
      if (!full) continue; // doc-meta に無い（削除済み等）はスキップ
      if (scoreIndex.has(full)) continue; // 先勝ち（legacy 優先）
      scoreIndex.set(full, {
        weighted: typeof entry.weighted === 'number' ? entry.weighted : null,
        scored_at: entry.scored_at || data.scored_at || null,
        source: relative(ROOT, src.file),
      });
    }
  }
  return scoreIndex;
}

// ── メイン ───────────────────────────────────────────────────────
function main() {
  const docMeta = JSON.parse(readFileSync(DOC_META, 'utf8'));
  const docs = docMeta.docs; // published のみ（build-doc-meta が published:false を除外済み）

  // slug → body_chars（実ファイルを読む）
  const files = walkMdx(POSTS_ROOT);
  const bodyCharsBySlug = new Map();
  for (const filePath of files) {
    const slug = toSlug(filePath);
    if (!docs[slug]) continue; // unpublished / 非対象はスキップ
    try {
      const raw = readFileSync(filePath, 'utf8');
      bodyCharsBySlug.set(slug, bodyLen(splitFrontmatter(raw).body));
    } catch {
      bodyCharsBySlug.set(slug, 0);
    }
  }

  const scoreIndex = loadScoreSources(docs);

  const articles = [];
  const agg = {}; // category → group → counts

  for (const slug of Object.keys(docs).sort()) {
    const meta = docs[slug];
    const category = meta.category || '_uncategorized';
    const group = meta.group || '_nogroup';
    const body_chars = bodyCharsBySlug.get(slug) ?? 0;
    const score = scoreIndex.get(slug) || null;
    const scored = !!score;
    const weighted = score ? score.weighted : null;
    const failed = scored && weighted !== null && weighted < FAIL_THRESHOLD;
    const thin = THIN_GROUPS.has(group) && body_chars < THIN_THRESHOLD;

    articles.push({
      slug, category, group, body_chars,
      scored, weighted, scored_at: score ? score.scored_at : null,
      failed, thin,
    });

    agg[category] ??= {};
    agg[category][group] ??= {
      total: 0, scored: 0, unscored: 0, failed: 0, thin: 0, weighted_sum: 0, weighted_n: 0,
    };
    const a = agg[category][group];
    a.total++;
    if (scored) { a.scored++; if (weighted !== null) { a.weighted_sum += weighted; a.weighted_n++; } }
    else a.unscored++;
    if (failed) a.failed++;
    if (thin) a.thin++;
  }

  // 集計の avg 付与 + category 小計 + 全体 census
  const byCategory = {};
  const totals = { total: 0, scored: 0, unscored: 0, failed: 0, thin: 0 };
  for (const [cat, groups] of Object.entries(agg).sort()) {
    const catTotals = { total: 0, scored: 0, unscored: 0, failed: 0, thin: 0 };
    const groupOut = {};
    for (const [g, a] of Object.entries(groups).sort()) {
      groupOut[g] = {
        total: a.total, scored: a.scored, unscored: a.unscored,
        failed: a.failed, thin: a.thin,
        avg_weighted: a.weighted_n ? +(a.weighted_sum / a.weighted_n).toFixed(2) : null,
      };
      for (const k of ['total', 'scored', 'unscored', 'failed', 'thin']) catTotals[k] += a[k];
    }
    byCategory[cat] = { groups: groupOut, totals: catTotals };
    for (const k of Object.keys(totals)) totals[k] += catTotals[k];
  }

  // rewrite queue（Phase 2 の母集団）: 不合格 ∪ 薄層
  const rewrite_queue = articles
    .filter((x) => x.failed || x.thin)
    .map((x) => ({ slug: x.slug, category: x.category, group: x.group, reason: x.failed ? (x.thin ? 'failed+thin' : 'failed') : 'thin', weighted: x.weighted, body_chars: x.body_chars }));

  const output = {
    version: 1,
    generated_at: new Date().toISOString(),
    thresholds: { fail: FAIL_THRESHOLD, thin_chars: THIN_THRESHOLD, thin_groups: [...THIN_GROUPS] },
    totals: {
      ...totals,
      coverage_pct: totals.total ? +((totals.scored / totals.total) * 100).toFixed(1) : 0,
    },
    by_category: byCategory,
    rewrite_queue,
    articles,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');

  // ── コンソール要約 ─────────────────────────────────────────────
  console.log(`[census] published ${totals.total} 件 / doc-meta published ${docMeta.summary.published} 件`);
  if (totals.total !== docMeta.summary.published) {
    console.error(`[census] ⚠️ 件数不一致: census ${totals.total} ≠ doc-meta ${docMeta.summary.published}`);
  }
  console.log(`[census] 採点済み ${totals.scored}（${output.totals.coverage_pct}%）/ 未採点 ${totals.unscored} / 不合格 ${totals.failed} / 薄層 ${totals.thin}`);
  console.log('[census] 資格 × group カバレッジ:');
  for (const [cat, { groups, totals: ct }] of Object.entries(byCategory)) {
    console.log(`  ${cat}: ${ct.scored}/${ct.total} 採点 · 未${ct.unscored} · 不合格${ct.failed} · 薄層${ct.thin}`);
    for (const [g, a] of Object.entries(groups)) {
      const flags = [];
      if (a.unscored) flags.push(`未${a.unscored}`);
      if (a.failed) flags.push(`不合格${a.failed}`);
      if (a.thin) flags.push(`薄層${a.thin}`);
      console.log(`      ${g}: ${a.scored}/${a.total}${a.avg_weighted !== null ? ` (avg ${a.avg_weighted})` : ''}${flags.length ? '  ' + flags.join(' ') : ''}`);
    }
  }
  console.log(`[census] rewrite queue: ${rewrite_queue.length} 件`);
  console.log(`[census] ✓ ${relative(ROOT, OUT_PATH)} に出力`);
}

main();
