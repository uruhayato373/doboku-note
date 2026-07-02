#!/usr/bin/env node
/**
 * check-x-length.mjs
 *
 * X(Twitter) の文字数上限に対する違反検出。
 * docs/sns/x/draft/<NNN>-*\/tweets.md を読み、`## Tweet NN` ブロックごとに
 * 重み付き文字数を算出する。
 *
 * 上限（ハイブリッド運用・policy §2/§2.1）:
 *  - 既定は 280（短文デフォルト＝リーチ最適）
 *  - `## Tweet NN:` 見出しに [longform] マーカーが付いたツイートのみ 25,000 に緩和
 *    （X Premium 長文。weighted 判定なので実文字数 25,000 より保守的＝安全側）
 *
 * X の重み規則:
 *  - URL は実長によらず 23 固定
 *  - U+0000..U+10FF / U+2000..U+200D / U+2010..U+201F / U+2032..U+2037 は 1
 *  - それ以外（CJK 等）は 2
 *
 * Usage:
 *   node scripts/check-x-length.mjs                  # 全ドラフト
 *   node scripts/check-x-length.mjs --draft 004      # 単一
 *   node scripts/check-x-length.mjs --over           # 違反のみ表示
 *   node scripts/check-x-length.mjs --json           # JSON 出力
 *
 * Exit code: 違反があれば 1
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = join(__dirname, "../docs/sns/x/draft");
const LIMIT = 280;
const LONGFORM_LIMIT = 25000; // X Premium 長文（[longform] マーカー時のみ）
const URL_WEIGHT = 23;

function charWeight(cp) {
  if (cp <= 0x10ff) return 1;
  if (cp >= 0x2000 && cp <= 0x200d) return 1;
  if (cp >= 0x2010 && cp <= 0x201f) return 1;
  if (cp >= 0x2032 && cp <= 0x2037) return 1;
  return 2;
}

function weightFor(s) {
  let w = 0;
  for (const ch of s) w += charWeight(ch.codePointAt(0));
  return w;
}

export function tweetLength(text) {
  const urlRe = /https?:\/\/[^\s]+/g;
  let weighted = 0;
  let last = 0;
  let m;
  while ((m = urlRe.exec(text)) !== null) {
    weighted += weightFor(text.slice(last, m.index));
    weighted += URL_WEIGHT;
    last = m.index + m[0].length;
  }
  weighted += weightFor(text.slice(last));
  return weighted;
}

function splitTweets(md) {
  const blocks = md.split(/^## Tweet /m).filter((_, i) => i > 0);
  return blocks.map((b, i) => {
    const lines = b.split("\n");
    const header = lines[0].trim();
    const numMatch = header.match(/^(\d+)/);
    const num = numMatch ? parseInt(numMatch[1], 10) : i + 1;
    const longform = /\[longform\]/i.test(header);
    // Body = block 内、`---` 区切り線で終端
    const body = lines
      .slice(1)
      .join("\n")
      .replace(/\n---\s*\n[\s\S]*$/m, "")
      .trim();
    return { num, header, body, longform };
  });
}

function checkDraft(folder) {
  const path = join(DRAFTS_DIR, folder, "tweets.md");
  if (!existsSync(path)) return null;
  const md = readFileSync(path, "utf8");
  const tweets = splitTweets(md);
  return tweets.map((t) => {
    const length = tweetLength(t.body);
    const limit = t.longform ? LONGFORM_LIMIT : LIMIT;
    return {
      folder,
      num: t.num,
      header: t.header,
      length,
      limit,
      longform: t.longform,
      over: length > limit,
      body: t.body,
    };
  });
}

function listDrafts() {
  return readdirSync(DRAFTS_DIR)
    .filter((e) => /^\d{3}-/.test(e))
    .sort();
}

function main() {
  const args = process.argv.slice(2);
  const draftIdx = args.indexOf("--draft");
  const onlyOver = args.includes("--over");
  const asJson = args.includes("--json");

  let folders;
  if (draftIdx !== -1) {
    const id = String(parseInt(args[draftIdx + 1], 10)).padStart(3, "0");
    folders = listDrafts().filter((f) => f.startsWith(id + "-"));
  } else {
    folders = listDrafts();
  }

  const all = [];
  for (const f of folders) {
    const rows = checkDraft(f) || [];
    all.push(...rows);
  }

  const violations = all.filter((r) => r.over);

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          total: all.length,
          violations: violations.length,
          rows: onlyOver ? violations : all,
        },
        null,
        2
      )
    );
  } else {
    const byFolder = new Map();
    for (const r of all) {
      if (!byFolder.has(r.folder)) byFolder.set(r.folder, []);
      byFolder.get(r.folder).push(r);
    }
    for (const [folder, rows] of byFolder) {
      const overs = rows.filter((r) => r.over);
      if (onlyOver && overs.length === 0) continue;
      const summary = overs.length
        ? `${overs.length}/${rows.length} OVER`
        : `${rows.length} OK`;
      console.log(`\n📄 ${folder}  (${summary})`);
      for (const r of rows) {
        if (onlyOver && !r.over) continue;
        const mark = r.over ? "❌" : "✅";
        const lf = r.longform ? " [LF]" : "";
        console.log(
          `  ${mark} Tweet ${String(r.num).padStart(2, "0")}  ${String(r.length).padStart(3, " ")}/${r.limit}${lf}  ${r.header.slice(0, 40)}`
        );
      }
    }
    const lfCount = all.filter((r) => r.longform).length;
    console.log(
      `\n── Summary: ${all.length} tweets / ${violations.length} violations (short ${LIMIT} / longform ${LONGFORM_LIMIT}; ${lfCount} longform)`
    );
  }

  process.exit(violations.length > 0 ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
