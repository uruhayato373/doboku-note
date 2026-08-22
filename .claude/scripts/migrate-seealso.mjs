#!/usr/bin/env node
/**
 * SeeAlso 一括移行スクリプト（Phase 2 — keyword ページ向け）
 *
 * 対象: `content/site/pe-comprehensive-management/<keyword-slug>/article.mdx`
 *   - pillar / hub / 過去問（r*-primary, r*-secondary）は除外
 *   - 行 trim 後に「詳細は [タイトル](/docs/pe-comprehensive-management-...)を参照。」
 *     の形に厳密一致する行だけを SeeAlso カードに置換
 *
 * 厳密マッチ正規表現:
 *   ^詳細は \[([^\]]+)\]\((/docs/pe-comprehensive-management-[^\)]+)\)(?:\s*を)?\s*参照(?:してください)?。?$
 *
 * 出力 MDX:
 *   <SeeAlso
 *     href="<dest>"
 *     title="<text>"
 *   />
 *
 * 使い方:
 *   node .claude/scripts/migrate-seealso.mjs --dry-run   # 変換候補のみ表示
 *   node .claude/scripts/migrate-seealso.mjs --apply     # 実書き換え
 */

import { readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { transformMdxFile, readMdxFile } from "./lib/mdx-io.mjs";

const ROOT = "content/site/pe-comprehensive-management";
const DRY_RUN = !process.argv.includes("--apply");

const EXCLUDED_SLUGS = new Set([
  "economic-management-pillar",
  "human-resource-management-pillar",
  "information-management-pillar",
  "safety-management-pillar",
  "social-environment-management-pillar",
  "exam-index",
  "general-overview",
  "keyword-2026",
  "essay-exam-strategy",
  "management-tradeoffs",
  "exam-passing-strategy",
  "exam-application-guide",
]);

const PAST_QUESTION_REGEX = /^r\d+-(primary|secondary)$/;

// 行末に「詳細は[X](url)を参照。」が来るケースを拾う。
// 前段（prefix）があれば残し、見出し節を split して SeeAlso を独立ブロックとして挿入する。
const SEE_ALSO_TAIL =
  /^(?<prefix>.*?)詳細は\s?\[(?<title>[^\]]+)\]\((?<href>\/docs\/pe-comprehensive-management-[^\)]+)\)(?:\s*を)?\s*参照(?:してください)?。?$/;

function listKeywordFiles() {
  const entries = readdirSync(ROOT);
  const out = [];
  for (const slug of entries) {
    if (EXCLUDED_SLUGS.has(slug)) continue;
    if (PAST_QUESTION_REGEX.test(slug)) continue;
    const articlePath = join(ROOT, slug, "article.mdx");
    try {
      if (statSync(articlePath).isFile()) out.push(articlePath);
    } catch {
      // 個別 mdx を持たないディレクトリはスキップ
    }
  }
  return out;
}

function transform(raw) {
  const lines = raw.split(/\r?\n/);
  const replacements = [];
  const matches = [];

  for (let i = 0; i < lines.length; i++) {
    const original = lines[i];
    const trimmed = original.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("<")) continue;
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) continue;
    if (trimmed.startsWith(">")) continue;
    if (trimmed.startsWith("|")) continue;
    if (trimmed.startsWith("#")) continue;

    const m = trimmed.match(SEE_ALSO_TAIL);
    if (!m) continue;

    const title = m.groups.title.trim();
    const href = m.groups.href.trim();
    const prefix = m.groups.prefix.trim().replace(/[、。\s]+$/, "").trim();

    matches.push({ lineIndex: i, title, href, prefix, original });

    const card =
      `<SeeAlso\n` +
      `  href="${href}"\n` +
      `  title="${title}"\n` +
      `/>`;

    if (prefix) {
      replacements.push({ lineIndex: i, value: `${prefix}。\n\n${card}` });
    } else {
      replacements.push({ lineIndex: i, value: card });
    }
  }

  if (replacements.length === 0) return { newRaw: null, count: 0, matches: [] };

  for (const r of replacements.slice().reverse()) {
    lines[r.lineIndex] = r.value;
  }

  return { newRaw: lines.join("\n"), count: replacements.length, matches };
}

const files = listKeywordFiles();
console.log(`[migrate-seealso] target keyword files: ${files.length}`);
console.log(`[migrate-seealso] mode: ${DRY_RUN ? "DRY-RUN" : "APPLY"}\n`);

let totalChanged = 0;
let totalCards = 0;
const fileSummaries = [];

for (const file of files) {
  if (DRY_RUN) {
    const { raw } = readMdxFile(file);
    const { count, matches } = transform(raw);
    if (count === 0) continue;
    totalChanged++;
    totalCards += count;
    fileSummaries.push({ file, count, matches });
  } else {
    let count = 0;
    const changed = transformMdxFile(file, (raw) => {
      const r = transform(raw);
      count = r.count;
      return r.newRaw;
    });
    if (changed) {
      totalChanged++;
      totalCards += count;
      console.log(`[apply] ${file}  +${count} card(s)`);
    }
  }
}

if (DRY_RUN) {
  for (const { file, matches } of fileSummaries) {
    console.log(`\n--- ${file}  (${matches.length} match)`);
    for (const m of matches) {
      console.log(`  L${m.lineIndex + 1}: ${m.original.slice(0, 100)}`);
      console.log(`     → href="${m.href}"`);
      console.log(`        title="${m.title}"`);
    }
  }
}

console.log(`\n[migrate-seealso] files changed: ${totalChanged}`);
console.log(`[migrate-seealso] total cards inserted: ${totalCards}`);
if (DRY_RUN) {
  console.log("\nRun with --apply to write changes.");
}
