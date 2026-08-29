#!/usr/bin/env node
/**
 * Doc Meta Index Builder
 *
 * 全 MDX の frontmatter を走査し、静的メタデータインデックスを
 * src/config/doc-meta-index.json に出力する。
 *
 * ランタイムの getDocMeta() / getDocsMetaByCategory() はこの JSON を
 * 直接 import して使用する（ファイル I/O ゼロ）。
 *
 * Usage:
 *   node .claude/scripts/build-doc-meta-index.mjs
 *   node .claude/scripts/build-doc-meta-index.mjs --ci   # git 日付フォールバックが1件でも
 *                                                          # 発生したら案内を出して exit 1
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, dirname, extname } from 'node:path';
import matter from 'gray-matter';
import { loadGitDates, lookupGitDates } from './lib/git-dates.mjs';

const ROOT = process.cwd();
const POSTS_ROOT = join(ROOT, 'content/site');
const OUT_PATH = join(ROOT, 'src/config/doc-meta-index.json');
const CI_MODE = process.argv.includes('--ci');

// ── MDX 列挙 ────────────────────────────────────────────────────

function walkMdx(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkMdx(p));
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.mdx') {
      out.push(p);
    }
  }
  return out;
}

// ── slug 生成 ──────────────────────────────────────────────────
// Convention A: `content/site/<cat>/dir/file.mdx` → `<cat>-dir-file`
// Convention B: `content/site/<cat>/dir/article.mdx` → `<cat>-dir`

function toSlug(filePath) {
  const rel = relative(POSTS_ROOT, filePath);
  const withoutExt = rel.replace(/\.mdx$/i, '');
  const parts = withoutExt.split(/[\\/]/).filter((s) => s && s !== 'article');
  return parts.join('-');
}

// ── メイン処理 ─────────────────────────────────────────────────

function main() {
  const files = walkMdx(POSTS_ROOT);
  console.log(`[doc-meta] ${files.length} MDX を走査`);

  // git log 全体走査で created / dateModified を上書き（frontmatter の値より優先）
  // git は frontmatter が欠けたときだけの保険。呼ばれなければ履歴に触れない。
  let _gitDates = null;
  let gitFallbackCount = 0;
  const gitFallbackFiles = [];
  const gitDatesLazy = () => {
    if (!_gitDates) {
      console.log('[doc-meta] frontmatter に日付が無いファイルがあるため git-dates を読み込む');
      _gitDates = loadGitDates();
    }
    return _gitDates;
  };

  const docs = {};
  const byCategory = {};
  let unpublished = 0;

  for (const filePath of files) {
    let parsed;
    try {
      const raw = readFileSync(filePath, 'utf8');
      parsed = matter(raw);
    } catch (e) {
      console.error(`[doc-meta] skip (parse error): ${filePath} ${e.message}`);
      continue;
    }

    const data = parsed.data || {};

    // published: false は除外
    if (data.published === false) {
      unpublished++;
      continue;
    }

    const slug = toSlug(filePath);

    // frontmatter を正規化して格納（slug はキーなので含めない）
    const meta = {
      title: data.title || '',
      description: data.description || '',
      ...data,
      published: data.published !== false,
    };

    // Date オブジェクトを文字列に変換（JSON シリアライズ対応）。
    // 日付フィールドは **YYYY-MM-DD** に揃える——gray-matter は YAML の裸の日付を
    // Date にパースするので、そのまま toISOString() すると
    // `2026-06-02` が `2026-06-02T00:00:00.000Z` になり、sitemap lastmod と
    // JSON-LD datePublished の書式が全ページで変わってしまう（2026-08-22 実測）。
    const DATE_ONLY_KEYS = new Set(['created', 'dateModified', 'publishedAt', 'updatedAt', 'lastRewrittenAt']);
    for (const [key, value] of Object.entries(meta)) {
      if (value instanceof Date) {
        meta[key] = DATE_ONLY_KEYS.has(key) ? value.toISOString().slice(0, 10) : value.toISOString();
      }
    }

    // 日付は **frontmatter が真実源**（2026-08-22 に反転）。
    //
    // 以前は git log の値で無条件に上書きしていた。frontmatter が誰にも更新されず
    // 実測 1,117 件中 1,040 件が古びていたためで、診断としては正しかった。だが
    // **公開 SEO 信号（sitemap lastmod / JSON-LD datePublished）がリポジトリ基盤に依存する**
    // 副作用が大きすぎた——リネーム・移行・履歴書換えのたびに 1,117 ページの日付が黙って動き
    // （2026-08-18 の情報アーキテクチャ移行で全 1,084 記事が created まで巻き戻った）、
    // ビルドが全履歴を要求するので shallow clone も履歴の切り詰めもできなかった。
    //
    // 正しい形は「commit 時に frontmatter へ書き、ビルドは frontmatter だけを読む」。
    // git は **frontmatter が欠けているときだけの保険**で、通常のビルドでは一切呼ばない
    // （loadGitDates は遅延ロード。呼ばれた件数は最後にサマリへ出す）。
    const relPath = relative(ROOT, filePath);
    if (!meta.created) meta.created = meta.publishedAt || null;
    if (!meta.dateModified) meta.dateModified = meta.updatedAt || null;
    if (!meta.created || !meta.dateModified) {
      const gd = lookupGitDates(gitDatesLazy(), relPath);
      if (gd) {
        if (!meta.created) meta.created = gd.created;
        if (!meta.dateModified) meta.dateModified = gd.dateModified;
        gitFallbackCount += 1;
        gitFallbackFiles.push({ slug, relPath });
      }
    }

    docs[slug] = meta;

    // カテゴリ別カウント
    const cat = data.category || '_uncategorized';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }

  const published = Object.keys(docs).length;

  // 「git を一度も呼ばずに済んだ」ことを可視化する。件数が増えていたら
  // frontmatter への書き込み（pre-commit）が効いていない合図。
  if (gitFallbackCount === 0) {
    console.log('[doc-meta] 日付はすべて frontmatter から解決（git 履歴に触れていない）');
  } else {
    console.warn(`[doc-meta] frontmatter に日付が無く git へフォールバックした: ${gitFallbackCount} 件`);
    for (const f of gitFallbackFiles.slice(0, 10)) console.warn(`    ${f.relPath}`);
    console.warn('    → node .claude/scripts/backfill-mdx-dates.mjs で frontmatter へ書き込むこと');

    // --ci: git フォールバックは「ビルドが git 履歴に依存している」証拠そのもの
    // （shallow clone・履歴書換え・リネームで公開 SEO 信号が黙って動く。§113-124 のコメント参照）。
    // CI ではこれを許容せず、frontmatter を backfill させてから再実行させる。
    if (CI_MODE) {
      console.error('');
      console.error(`[doc-meta] --ci: git フォールバックが ${gitFallbackCount} 件発生したため中断します`);
      console.error('  対象 slug:');
      for (const f of gitFallbackFiles) console.error(`    ${f.slug}`);
      console.error('  → node .claude/scripts/backfill-mdx-dates.mjs を実行してから再試行してください');
      process.exit(1);
    }
  }

  // slug 順でソート（決定論的出力）
  const sorted = {};
  for (const key of Object.keys(docs).sort()) {
    sorted[key] = docs[key];
  }

  const output = {
    version: 1,
    generated_at: new Date().toISOString(),
    summary: {
      total: files.length,
      published,
      unpublished,
      by_category: byCategory,
    },
    docs: sorted,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');

  console.log(`[doc-meta] ✓ ${relative(ROOT, OUT_PATH)} に出力`);
  console.log(`  published: ${published}`);
  console.log(`  unpublished (skipped): ${unpublished}`);
  for (const [cat, count] of Object.entries(byCategory).sort()) {
    console.log(`  ${cat}: ${count}`);
  }
}

main();
