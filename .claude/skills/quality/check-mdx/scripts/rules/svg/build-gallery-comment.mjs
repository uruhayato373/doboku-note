#!/usr/bin/env node
/**
 * audit-svg の副ツール: 全 SVG ギャラリーを Markdown で生成する。
 *
 * 目的:
 *   全 SVG をブラウザプレビュー付きで一覧できる Markdown を生成し、
 *   SVG デザイン一貫性の継続改善（.claude/todo/ で追跡）の進捗を視覚化する。
 *   改善完了時に再生成して差分を確認できる。GitHub Issue は使わない。
 *
 * 入力:
 *   - .claude/state/svg-audit.json  （audit 結果、事前に audit 実行必須）
 *   - content/site/**\/img/*.svg （全 SVG）
 *
 * 出力:
 *   - .tmp/svg-gallery-comment.md  （ギャラリー Markdown。視覚確認用）
 *
 * Usage:
 *   # 1. audit 実行で state 更新
 *   node .claude/skills/quality/check-mdx/scripts/rules/svg/audit.mjs
 *
 *   # 2. ギャラリー生成
 *   node .claude/skills/quality/check-mdx/scripts/rules/svg/build-gallery-comment.mjs
 *
 * URL 形式:
 *   doboku-note.com/posts/... は Next.js のルートで 301 redirect が
 *   返るため、GitHub の camo プロキシが画像を取得できない。
 *   **R2 直接配信の storage.doboku-note.com/posts/...** を使う。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { globSync } from "glob";

const AUDIT_STATE = ".claude/state/svg-audit.json";
const OUTPUT = ".tmp/svg-gallery-comment.md";
const IMAGE_HOST = "https://storage.doboku-note.com";

if (!existsSync(AUDIT_STATE)) {
  console.error(`audit state not found: ${AUDIT_STATE}`);
  console.error(`先に audit を実行: node .claude/skills/quality/check-mdx/scripts/rules/svg/audit.mjs`);
  process.exit(1);
}

const audit = JSON.parse(readFileSync(AUDIT_STATE, "utf-8"));

// file -> {HIGH: n, MEDIUM: n, LOW: n, patterns: Set}
const fileSeverity = {};
for (const f of audit.findings) {
  const path = f.file.replace(/\\/g, "/");
  if (!fileSeverity[path]) {
    fileSeverity[path] = { HIGH: 0, MEDIUM: 0, LOW: 0, patterns: new Set() };
  }
  fileSeverity[path][f.severity]++;
  fileSeverity[path].patterns.add(f.pattern);
}

const allFiles = globSync("content/site/**/img/*.svg").map((f) =>
  f.replace(/\\/g, "/")
);

function getCategory(path) {
  const m = path.match(/\content\/site\/([^/]+)/);
  return m ? m[1] : "other";
}

function getSlug(path) {
  const m = path.match(/\content\/site\/([^/]+)\/([^/]+)\/img\//);
  if (!m) return null;
  return `${m[1]}-${m[2]}`;
}

function getImgUrl(path) {
  // content/site/... → https://storage.doboku-note.com/posts/...
  const rel = path.replace(/^\.local\/r2\//, "");
  return `${IMAGE_HOST}/${rel}`;
}

function getSvgName(path) {
  const m = path.match(/\/([^/]+\.svg)$/);
  return m ? m[1] : path;
}

function getSeverityIcon(sev) {
  if (!sev || (sev.HIGH === 0 && sev.MEDIUM === 0 && sev.LOW === 0)) return "✅";
  if (sev.HIGH > 0) return "🔴";
  if (sev.MEDIUM > 0) return "🟡";
  return "🟢";
}

function getSeverityBadge(sev) {
  if (!sev) return "clean";
  const parts = [];
  if (sev.HIGH > 0) parts.push(`HIGH ${sev.HIGH}`);
  if (sev.MEDIUM > 0) parts.push(`MEDIUM ${sev.MEDIUM}`);
  if (sev.LOW > 0) parts.push(`LOW ${sev.LOW}`);
  return parts.length ? parts.join(" / ") : "clean";
}

// カテゴリごとにグループ化
const byCategory = {};
for (const f of allFiles) {
  const cat = getCategory(f);
  if (!byCategory[cat]) byCategory[cat] = [];
  byCategory[cat].push(f);
}

// 各カテゴリ内で: HIGH -> MEDIUM -> CLEAN 順にソート
for (const cat of Object.keys(byCategory)) {
  byCategory[cat].sort((a, b) => {
    const sa = fileSeverity[a] || { HIGH: 0, MEDIUM: 0, LOW: 0 };
    const sb = fileSeverity[b] || { HIGH: 0, MEDIUM: 0, LOW: 0 };
    if (sb.HIGH !== sa.HIGH) return sb.HIGH - sa.HIGH;
    if (sb.MEDIUM !== sa.MEDIUM) return sb.MEDIUM - sa.MEDIUM;
    return a.localeCompare(b);
  });
}

// Markdown 構築
const lines = [];
const now = new Date().toISOString().split("T")[0];
lines.push(`## 🖼️ 全 SVG ブラウザプレビュー（${now} 生成）`);
lines.push("");
lines.push(
  `全 **${allFiles.length}** 件の SVG を category 別に列挙。各 SVG は Cloudflare R2（${IMAGE_HOST}）から直接配信するため、GitHub の camo プロキシ経由で直接プレビュー表示される。`
);
lines.push("");
lines.push("**凡例**:");
lines.push("- 🔴 HIGH 違反あり（優先修正）");
lines.push("- 🟡 MEDIUM 違反あり（計画的改善）");
lines.push("- ✅ audit クリア");
lines.push("");
lines.push(
  `**再生成コマンド**: \`node .claude/skills/quality/check-mdx/scripts/rules/svg/audit.mjs && node .claude/skills/quality/check-mdx/scripts/rules/svg/build-gallery-comment.mjs\``
);
lines.push("");
lines.push("---");
lines.push("");

const categories = Object.keys(byCategory).sort();
for (const cat of categories) {
  const files = byCategory[cat];
  const totals = files.reduce(
    (acc, f) => {
      const s = fileSeverity[f];
      if (!s) acc.clean++;
      else if (s.HIGH > 0) acc.high++;
      else if (s.MEDIUM > 0) acc.mid++;
      else acc.clean++;
      return acc;
    },
    { high: 0, mid: 0, clean: 0 }
  );

  lines.push(`## ${cat} (${files.length} files)`);
  lines.push("");
  lines.push(`内訳: 🔴 ${totals.high} / 🟡 ${totals.mid} / ✅ ${totals.clean}`);
  lines.push("");

  lines.push("<details open>");
  lines.push(`<summary>展開して全 ${files.length} SVG をプレビュー</summary>`);
  lines.push("");

  for (const f of files) {
    const sev = fileSeverity[f];
    const icon = getSeverityIcon(sev);
    const badge = getSeverityBadge(sev);
    const slug = getSlug(f);
    const name = getSvgName(f);
    const url = getImgUrl(f);
    const patterns = sev ? [...sev.patterns].sort().join(", ") : "";

    lines.push(`### ${icon} \`${slug}/${name}\` — ${badge}`);
    if (patterns) lines.push(`<sub>patterns: ${patterns}</sub>`);
    lines.push("");
    lines.push(`![${name}](${url})`);
    lines.push("");
  }

  lines.push("</details>");
  lines.push("");
  lines.push("---");
  lines.push("");
}

lines.push("## 運用");
lines.push("");
lines.push("- リライト完了 → アイコンが ✅ に変化（再生成で反映）");
lines.push("- 新規 SVG 追加もリストに反映");
lines.push("- 本コメントは **差し替え運用**（古いコメントを削除 → 新規投稿、または edit）");

if (!existsSync(".tmp")) mkdirSync(".tmp", { recursive: true });
writeFileSync(OUTPUT, lines.join("\n"));
console.error(`generated: ${OUTPUT}`);
console.error(`  total SVGs: ${allFiles.length}`);
console.error(`  categories: ${categories.join(", ")}`);
console.error(`  bytes: ${lines.join("\n").length}`);
