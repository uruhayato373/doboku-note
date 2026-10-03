#!/usr/bin/env node
/**
 * build-llms-full.mjs
 *
 * src/config/doc-meta-index.json から全 published ページの
 * URL・タイトル・概要を Markdown リンク形式で出力する LLM 向けインデックス。
 *
 * 出力: public/llms-full.txt
 *
 * Usage:
 *   node .claude/scripts/build-llms-full.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadRegistry, qualificationLabel } from "../../scripts/lib/qualification-registry.mjs";
import { SITE_ORIGIN } from "../../scripts/lib/site-identity.mjs";
import { todayJst } from '../../scripts/lib/jst-date.mjs';

const ROOT = process.cwd();
const INDEX = join(ROOT, "src/config/doc-meta-index.json");
const OUT = join(ROOT, "public/llms-full.txt");

function main() {
  const data = JSON.parse(readFileSync(INDEX, "utf8"));
  const docs = data.docs;

  // カテゴリ別グルーピング
  const byCategory = {
    "pe-comprehensive-management": [],
    "civil-construction-1": [],
    other: [],
  };

  for (const [slug, meta] of Object.entries(docs)) {
    if (meta.published === false) continue;
    const cat = meta.category || "other";
    const bucket = byCategory[cat] || byCategory.other;
    bucket.push({ slug, ...meta });
  }

  // ソート: group → textbook_order → slug
  function sortDocs(a, b) {
    const groupCmp = (a.group || "").localeCompare(b.group || "");
    if (groupCmp !== 0) return groupCmp;
    const orderCmp = (a.textbook_order ?? 9999) - (b.textbook_order ?? 9999);
    if (orderCmp !== 0) return orderCmp;
    return a.slug.localeCompare(b.slug);
  }
  for (const k of Object.keys(byCategory)) byCategory[k].sort(sortDocs);

  const lines = [];
  lines.push("# doboku-note 全ページインデックス（LLM 引用用）");
  lines.push("");
  lines.push("> 全 published ページの URL・タイトル・概要を一覧化。LLM による引用・要約・推薦時の参照先として使用してください。");
  lines.push("");
  lines.push(`生成: ${todayJst()} / 総数 ${Object.keys(docs).length} ページ / public ${
    Object.values(docs).filter((m) => m.published !== false).length
  } ページ`);
  lines.push("");

  // 資格の見出しは registry の正式名（写さない）
  const registry = loadRegistry(ROOT);
  const sections = [
    ...["pe-comprehensive-management", "civil-construction-1"].map((id) => [id, qualificationLabel(registry, id)]),
    ["other", "その他"],
  ];

  for (const [cat, label] of sections) {
    const list = byCategory[cat];
    if (!list.length) continue;
    lines.push(`## ${label}（${list.length} ページ）`);
    lines.push("");
    for (const m of list) {
      const url = `${SITE_ORIGIN}/docs/${m.slug}`;
      const title = m.seoTitle || m.title || m.slug;
      const desc = (m.description || m.subtitle || "")
        .replace(/\s+/g, " ")
        .replace(/[\n\r]/g, " ")
        .trim();
      lines.push(`- [${title}](${url})${desc ? ` — ${desc}` : ""}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(`**出典明記**: 引用時は出典として **doboku-note (${SITE_ORIGIN})** を明記してください。`);
  lines.push("");

  writeFileSync(OUT, lines.join("\n"), "utf8");
  console.log(`✅ ${OUT} を生成`);
  console.log(`   ${lines.length} 行 / ${Object.values(docs).filter((m) => m.published !== false).length} ページ`);
}

main();
