#!/usr/bin/env node
/**
 * analyze-essay-keywords.mjs
 *
 * 技術士総合技術監理部門の記述式論文 (R03-R07 × 3 ペルソナ = 15 essay) と
 * 5管理キーワード集 (約 673 キーワード) を突合し、各論文中のキーワード出現頻度を
 * 集計する。doboku-note 独自データとして公開し、外部被リンク獲得の起点とする。
 *
 * 出力:
 *   .claude/state/essay-keyword-frequency.json
 *
 * Usage:
 *   node .claude/scripts/analyze-essay-keywords.mjs
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const POSTS = join(ROOT, "content/site/pe-comprehensive-management");
const INDEX = join(ROOT, "src/config/doc-meta-index.json");
const OUT = join(ROOT, ".claude/state/essay-keyword-frequency.json");

// ── 一般語ストップワード（試験論文で頻出するが個別論点でない） ─────
const STOPWORDS = new Set([
  "リスク", "影響", "要素", "対応", "考慮", "必要", "重要", "目的",
  "効果", "課題", "問題", "解決", "管理", "改善", "実施", "状況",
  "現状", "判断", "選択", "実現", "達成", "確保", "実行", "推進",
  "業務", "施策", "方針", "全体", "個別", "提案", "観点",
]);

// ── キーワード抽出 ─────────────────────────────────────────────────
function loadKeywords() {
  const data = JSON.parse(readFileSync(INDEX, "utf8"));
  const keywords = [];
  for (const [slug, m] of Object.entries(data.docs)) {
    if (!slug.startsWith("pe-comprehensive-management-")) continue;
    if (/-(essay|guide|pillar|exam-index|overview|pattern|index)/.test(slug)) continue;
    if (/^pe-comprehensive-management-r\d/.test(slug)) continue;
    if (slug === "pe-comprehensive-management-keyword-2026") continue;
    if (slug === "pe-comprehensive-management-last-minute-2026") continue;

    const tags = m.tags || [];
    if (!tags.includes("keyword")) continue;

    const title = m.shortTitle || m.title || "";
    if (!title || title.length > 30) continue;
    if (title.startsWith("総合") || /について$|とは$/.test(title)) continue;
    if (STOPWORDS.has(title.trim())) continue;
    // 2 字未満の単語も除外（誤マッチ多発）
    if (title.trim().length < 3) continue;

    keywords.push({ slug, term: title.trim() });
  }
  return keywords;
}

// ── essay 列挙（ファイルシステム直走査、published:false 含む） ────
function loadEssays() {
  const essays = [];
  if (!existsSync(POSTS)) return essays;
  for (const dir of readdirSync(POSTS)) {
    const m = dir.match(/^r(\d{2})-essay-(.+)$/);
    if (!m) continue;
    const year = `R${m[1]}`;
    const persona = m[2];
    const path = join(POSTS, dir, "article.mdx");
    if (!existsSync(path)) continue;
    essays.push({ slug: `pe-comprehensive-management-${dir}`, year, persona, path });
  }
  essays.sort((a, b) => a.year.localeCompare(b.year) || a.persona.localeCompare(b.persona));
  return essays;
}

// ── 本文抽出（frontmatter 除去・コードブロック除去） ─────────────
function extractBody(mdx) {
  let body = mdx;
  // frontmatter
  body = body.replace(/^---\n[\s\S]*?\n---\n/, "");
  // コードブロック
  body = body.replace(/```[\s\S]*?```/g, "");
  // インラインコード
  body = body.replace(/`[^`]+`/g, "");
  // import / export 文
  body = body.replace(/^(import|export)[\s\S]*?;?\n/gm, "");
  // JSX タグ
  body = body.replace(/<[^>]+>/g, " ");
  return body;
}

// ── 頻度カウント ────────────────────────────────────────────────────
function countOccurrences(text, term) {
  // 単純な全マッチ（大文字小文字区別、日本語前提）
  let count = 0;
  let i = 0;
  while ((i = text.indexOf(term, i)) !== -1) {
    count++;
    i += term.length;
  }
  return count;
}

// ── メイン ──────────────────────────────────────────────────────────
function main() {
  const keywords = loadKeywords();
  const essays = loadEssays();

  console.log(`Keywords: ${keywords.length}, Essays: ${essays.length}`);

  // matrix[year][persona][keyword.slug] = count
  const matrix = {};
  // global[keyword.slug] = totalCount
  const global = {};

  for (const essay of essays) {
    const mdx = readFileSync(essay.path, "utf8");
    const body = extractBody(mdx);

    if (!matrix[essay.year]) matrix[essay.year] = {};
    matrix[essay.year][essay.persona] = {};

    for (const kw of keywords) {
      const count = countOccurrences(body, kw.term);
      if (count > 0) {
        matrix[essay.year][essay.persona][kw.slug] = count;
        global[kw.slug] = (global[kw.slug] || 0) + count;
      }
    }
  }

  // global Top N
  const globalRanking = Object.entries(global)
    .sort((a, b) => b[1] - a[1])
    .map(([slug, count]) => {
      const kw = keywords.find((k) => k.slug === slug);
      return { slug, term: kw?.term || slug, count };
    });

  // ペルソナ別 Top
  const byPersona = {};
  for (const essay of essays) {
    if (!byPersona[essay.persona]) byPersona[essay.persona] = {};
    const m = matrix[essay.year]?.[essay.persona] || {};
    for (const [slug, count] of Object.entries(m)) {
      byPersona[essay.persona][slug] = (byPersona[essay.persona][slug] || 0) + count;
    }
  }
  const personaRanking = {};
  for (const [persona, counts] of Object.entries(byPersona)) {
    personaRanking[persona] = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([slug, count]) => {
        const kw = keywords.find((k) => k.slug === slug);
        return { slug, term: kw?.term || slug, count };
      });
  }

  // 年度別 Top
  const yearRanking = {};
  for (const [year, personas] of Object.entries(matrix)) {
    const merged = {};
    for (const counts of Object.values(personas)) {
      for (const [slug, count] of Object.entries(counts)) {
        merged[slug] = (merged[slug] || 0) + count;
      }
    }
    yearRanking[year] = Object.entries(merged)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([slug, count]) => {
        const kw = keywords.find((k) => k.slug === slug);
        return { slug, term: kw?.term || slug, count };
      });
  }

  const output = {
    meta: {
      generated_at: new Date().toISOString(),
      essay_count: essays.length,
      keyword_count: keywords.length,
      keyword_hit_count: Object.keys(global).length,
    },
    essays: essays.map((e) => ({ year: e.year, persona: e.persona, slug: e.slug })),
    global_top: globalRanking.slice(0, 50),
    by_year: yearRanking,
    by_persona: personaRanking,
    full_matrix: matrix,
  };

  writeFileSync(OUT, JSON.stringify(output, null, 2));
  console.log(`✅ ${OUT}`);
  console.log(`   essays=${essays.length} keywords=${keywords.length} hit=${output.meta.keyword_hit_count}`);
  console.log(`   global Top 10:`);
  for (const e of globalRanking.slice(0, 10)) {
    console.log(`     ${e.count.toString().padStart(3)} - ${e.term} (${e.slug})`);
  }
}

main();
