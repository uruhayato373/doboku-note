#!/usr/bin/env node
/**
 * PE keyword pages（pe-comprehensive-management 配下）に対し、
 * 該当する 5 管理ピラーへのバックリンクを「## 総合技術監理における位置づけ」
 * セクション直下に冪等に挿入する。
 *
 * 1. keyword-2026/article.mdx を解析して「slug → 管理分野」マップを作成
 * 2. 各 PE keyword article.mdx を読み込み、既にピラーリンク済みか判定
 * 3. 未挿入なら「## 総合技術監理における位置づけ」直下に blockquote で挿入
 *
 * Usage:
 *   node .claude/scripts/add-pillar-backlinks.mjs                  # 一括実行
 *   node .claude/scripts/add-pillar-backlinks.mjs --dry-run        # 変更せず対象数のみ表示
 *   node .claude/scripts/add-pillar-backlinks.mjs --slug pdca-cycle  # 単一 slug のみテスト
 *
 * Issue: #72 P10 follow-up（spoke → pillar 双方向リンク確立）
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { readMdxFile, writeMdxFile } from "./lib/mdx-io.mjs";

// ── Config ──

const PE_ROOT = "content/site/pe-comprehensive-management";
const KEYWORD_2026_PATH = join(PE_ROOT, "keyword-2026/article.mdx");

const PILLAR_INFO = {
  economic: {
    slug: "pe-comprehensive-management-economic-management-pillar",
    label: "経済性管理",
    sub: "7 サブカテゴリの体系・頻出論点・学習導線",
  },
  "human-resource": {
    slug: "pe-comprehensive-management-human-resource-management-pillar",
    label: "人的資源管理",
    sub: "4 サブカテゴリの体系・頻出論点・学習導線",
  },
  information: {
    slug: "pe-comprehensive-management-information-management-pillar",
    label: "情報管理",
    sub: "5 サブカテゴリの体系・頻出論点・学習導線",
  },
  safety: {
    slug: "pe-comprehensive-management-safety-management-pillar",
    label: "安全管理",
    sub: "6 サブカテゴリの体系・頻出論点・学習導線",
  },
  "social-environment": {
    slug: "pe-comprehensive-management-social-environment-management-pillar",
    label: "社会環境管理",
    sub: "4 サブカテゴリの体系・頻出論点・学習導線",
  },
};

// 自身がピラーや hub のため除外する slug（無限ループ・自己リンク防止）
const EXCLUDE_SLUGS = new Set([
  "keyword-2026",
  "exam-index",
  "general-overview",
  "essay-exam-strategy",
  "exam-application-guide",
  "exam-passing-strategy",
  "management-tradeoffs",
  "economic-management-pillar",
  "human-resource-management-pillar",
  "information-management-pillar",
  "safety-management-pillar",
  "social-environment-management-pillar",
]);

// ── CLI args ──

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dryRun: false, singleSlug: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") opts.dryRun = true;
    else if (args[i] === "--slug") opts.singleSlug = args[++i];
  }
  return opts;
}

// ── keyword-2026 から slug → area マップを抽出 ──

function buildSlugToAreaMap() {
  const raw = readFileSync(KEYWORD_2026_PATH, "utf-8");
  const lines = raw.split(/\r?\n/);
  const map = new Map();
  let area = null;
  const sectionRe = /^##\s+(\d+)\.\s+(.+)$/;
  const linkRe = /\/docs\/pe-comprehensive-management-([a-z0-9-]+)/g;
  for (const line of lines) {
    const sm = line.match(sectionRe);
    if (sm) {
      const num = sm[1];
      if (num === "2") area = "economic";
      else if (num === "3") area = "human-resource";
      else if (num === "4") area = "information";
      else if (num === "5") area = "safety";
      else if (num === "6") area = "social-environment";
      else area = null;
      continue;
    }
    if (!area) continue;
    let m;
    while ((m = linkRe.exec(line)) !== null) {
      const slug = m[1];
      if (EXCLUDE_SLUGS.has(slug)) continue;
      // 重複時は先勝ち（セクションをまたいで現れた場合）
      if (!map.has(slug)) map.set(slug, area);
    }
  }
  return map;
}

// ── 1 ファイルを処理 ──

function processFile(filePath, area) {
  const pillar = PILLAR_INFO[area];
  if (!pillar) return { status: "no-pillar", slug: null };

  const { raw, eol } = readMdxFile(filePath);

  // 既にピラーへのリンクがあれば skip
  if (raw.includes(`/docs/${pillar.slug}`)) {
    return { status: "skip-already-linked" };
  }

  // 挿入する文字列
  const insertion = `> 📘 **[${pillar.label} 学習ガイド](/docs/${pillar.slug})** — ${pillar.sub}`;

  // 「## 総合技術監理における位置づけ」セクションの直下に挿入
  // セクションが無い場合は body 末尾（最初の <RelatedKeywords> または "## 参考資料" の前）に追加
  const sectionRe = /^## 総合技術監理における位置づけ\s*$/m;
  const sectionMatch = raw.match(sectionRe);
  let newRaw;
  if (sectionMatch) {
    // セクション header 直後に空行 + insertion + 空行を挿入
    const idx = sectionMatch.index + sectionMatch[0].length;
    newRaw =
      raw.slice(0, idx) +
      `\n\n${insertion}\n` +
      raw.slice(idx);
  } else {
    // セクション無し → 末尾の <RelatedKeywords> or "## 参考資料" の前に挿入
    let anchorIdx = -1;
    const anchors = [/<RelatedKeywords\s/, /^## 参考資料\s*$/m, /^## 関連リンク\s*$/m];
    for (const re of anchors) {
      const m = raw.match(re);
      if (m) {
        anchorIdx = m.index;
        break;
      }
    }
    const block = `\n\n## 総合技術監理における位置づけ\n\n${insertion}\n`;
    if (anchorIdx > -1) {
      newRaw = raw.slice(0, anchorIdx) + block + "\n" + raw.slice(anchorIdx);
    } else {
      // 末尾追加
      newRaw = raw.replace(/\s*$/, "") + block + "\n";
    }
  }

  return { status: "modified", newRaw, eol };
}

// ── Main ──

function listKeywordDirs() {
  const dirs = [];
  for (const name of readdirSync(PE_ROOT)) {
    const full = join(PE_ROOT, name);
    try {
      const st = statSync(full);
      if (!st.isDirectory()) continue;
    } catch {
      continue;
    }
    const article = join(full, "article.mdx");
    try {
      statSync(article);
    } catch {
      continue;
    }
    dirs.push({ slug: name, path: article });
  }
  return dirs;
}

function main() {
  const opts = parseArgs();
  const slugMap = buildSlugToAreaMap();
  console.log(`keyword-2026 から ${slugMap.size} slug を抽出`);

  const dirs = listKeywordDirs();
  console.log(`PE 配下の article.mdx: ${dirs.length} ファイル`);

  const counters = {
    modified: 0,
    skipAlreadyLinked: 0,
    skipNotInMap: 0,
    skipExcluded: 0,
    error: 0,
    noSection: 0,
  };
  const modifiedSlugs = [];

  for (const { slug, path } of dirs) {
    if (opts.singleSlug && slug !== opts.singleSlug) continue;
    if (EXCLUDE_SLUGS.has(slug)) {
      counters.skipExcluded++;
      continue;
    }
    const area = slugMap.get(slug);
    if (!area) {
      counters.skipNotInMap++;
      continue;
    }
    let result;
    try {
      result = processFile(path, area);
    } catch (e) {
      counters.error++;
      console.error(`ERROR: ${slug}: ${e.message}`);
      continue;
    }
    if (result.status === "skip-already-linked") {
      counters.skipAlreadyLinked++;
      continue;
    }
    if (result.status !== "modified") continue;

    if (opts.dryRun) {
      console.log(`[DRY] would modify: ${slug} (area=${area})`);
    } else {
      writeMdxFile(path, result.newRaw, result.eol);
      modifiedSlugs.push(slug);
    }
    counters.modified++;
  }

  console.log("");
  console.log("=== Summary ===");
  console.log(`modified:           ${counters.modified}${opts.dryRun ? " (dry-run)" : ""}`);
  console.log(`skip-already-linked: ${counters.skipAlreadyLinked}`);
  console.log(`skip-not-in-map:    ${counters.skipNotInMap}`);
  console.log(`skip-excluded:      ${counters.skipExcluded}`);
  console.log(`error:              ${counters.error}`);
}

main();
