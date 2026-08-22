#!/usr/bin/env node
/**
 * backfill-published-at.mjs
 *
 * doc-meta-index.json で `published: true` だが `publishedAt` が未設定の
 * MDX に、git log の初回 commit 日から publishedAt を補完する。
 *
 * pre-commit hook の MEDIUM 警告「publishedAt-missing」をゼロ化するため。
 * 構造化データ (Article datePublished) の整合性向上も狙う。
 *
 * Usage:
 *   node .claude/scripts/backfill-published-at.mjs --dry-run  # 対象一覧のみ
 *   node .claude/scripts/backfill-published-at.mjs            # 実書込
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { transformMdxFile } from "./lib/mdx-io.mjs";
import { loadGitDates, lookupGitDates } from "./lib/git-dates.mjs";

const ROOT = process.cwd();
const POSTS = join(ROOT, "content/site");
const INDEX = join(ROOT, "src/config/doc-meta-index.json");

function locateMdx(slug, category) {
  // Convention A: <cat>/<slug-tail>.mdx
  // Convention B: <cat>/<slug-tail>/article.mdx
  // doc-meta-index の slug = "<cat>-<rest>" 形式
  const prefix = `${category}-`;
  if (!slug.startsWith(prefix)) {
    // general/ など prefix が違うものは個別判断
    if (slug.startsWith("reference-materials-")) {
      const tail = slug.replace(/^reference-materials-/, "");
      const p = join(POSTS, `reference-materials-${tail}`, "article.mdx");
      if (existsSync(p)) return p;
    }
    return null;
  }
  const tail = slug.slice(prefix.length);
  const pathB = join(POSTS, category, tail, "article.mdx");
  if (existsSync(pathB)) return pathB;
  const pathA = join(POSTS, category, `${tail}.mdx`);
  if (existsSync(pathA)) return pathA;
  return null;
}

function insertPublishedAt(raw, date) {
  // frontmatter は `---\n...\n---` の間
  const m = raw.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n)/);
  if (!m) return null;
  const fmBody = m[2];
  if (/^publishedAt:/m.test(fmBody)) return null; // 既にある
  // published: true 行の直後に挿入。なければ末尾追加
  const insertLine = `publishedAt: '${date}'`;
  let newFmBody;
  if (/^published:\s*true/m.test(fmBody)) {
    newFmBody = fmBody.replace(/(^published:\s*true)/m, `$1\n${insertLine}`);
  } else {
    newFmBody = fmBody + "\n" + insertLine;
  }
  return raw.replace(m[0], m[1] + newFmBody + m[3]);
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  const data = JSON.parse(readFileSync(INDEX, "utf8"));
  const docs = data.docs;
  const gitDates = loadGitDates();

  const targets = [];
  for (const [slug, m] of Object.entries(docs)) {
    if (m.published === false) continue;
    if (m.publishedAt) continue;
    const cat = m.category;
    if (!cat) continue;
    const mdxPath = locateMdx(slug, cat);
    if (!mdxPath) {
      console.warn(`  [skip] no mdx file for slug=${slug}`);
      continue;
    }
    const rel = mdxPath.replace(ROOT + "/", "");
    const entry = lookupGitDates(gitDates, rel);
    const date = entry?.created;
    if (!date) {
      console.warn(`  [skip] no git date for ${rel}`);
      continue;
    }
    targets.push({ slug, mdxPath, date });
  }

  console.log(`Found ${targets.length} files needing publishedAt`);
  if (dryRun) {
    for (const t of targets.slice(0, 30)) {
      console.log(`  ${t.date}  ${t.slug}`);
    }
    if (targets.length > 30) console.log(`  ... (${targets.length - 30} more)`);
    return;
  }

  let written = 0;
  let skipped = 0;
  for (const t of targets) {
    const ok = transformMdxFile(t.mdxPath, (raw) => insertPublishedAt(raw, t.date));
    if (ok) {
      written++;
      console.log(`  ✓ ${t.date}  ${t.slug}`);
    } else {
      skipped++;
      console.log(`  - ${t.slug} (no change)`);
    }
  }
  console.log(`\n${written} written, ${skipped} skipped`);
}

main();
