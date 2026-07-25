#!/usr/bin/env node
/**
 * 総監模範論文ペルソナ別マガジンの各記事本文（intro / footer）にある
 * マガジンURLプレースホルダを、実際の note マガジン URL に一括置換する。
 *
 * note マガジンを作成して URL が判明したら実行する（公開後 URL 反映フローの一部。
 * .claude/knowledge/reference/note-essay-review-checklist.md Step 10）。
 *
 * Usage:
 *   node .claude/scripts/note/inject-magazine-url.cjs <persona> <マガジンURL>
 *   例) node .claude/scripts/note/inject-magazine-url.cjs 自治体下水道担当 https://note.com/dobokunote/m/mf1cbc32d53aa
 *
 * 対象: docs/note/技術士総監/magazines/総監模範論文-<persona>/<RXX>/article.md（全年度）
 *
 * 置換対象プレースホルダ（いずれも URL 単独行＝note リンクカードに置換）:
 *   - {{MAGAZINE_URL}}（推奨・今後の新規記事はこの形式で書く）
 *   - https://note.com/dobokunote/m/（※公開後に追加）
 *   - ※note 公開後に URL を追加予定 / ※note公開後にURLを追加予定
 *   - ※note 公開後にマガジン URL を追加予定 / ※note 公開後に magazine URL を追加予定
 *
 * 冪等性: 上記プレースホルダにのみ作用。既に実 URL 注入済みの記事はスキップされる。
 * 改行コード（CRLF/LF）は元ファイルのものを保持する。
 */
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const MAG_ROOT = path.join(PROJECT_ROOT, "docs/note/技術士総監/magazines");

// 長い/括弧付きを先に置換する（順序が重要）
const PLACEHOLDERS = [
  "{{MAGAZINE_URL}}",
  "https://note.com/dobokunote/m/（※公開後に追加）",
  "（※note 公開後に URL を追加予定）",
  "※note 公開後にマガジン URL を追加予定",
  "※note 公開後に magazine URL を追加予定",
  "※ magazine URL は note 公開後に追加予定",
  "※note 公開後に magazine URL を追加",
  "※note公開後にURLを追加予定",
  "※note 公開後に URL を追加予定",
  "※note 公開後にURLを追加予定",
  // 旧セッション由来の空白・括弧バリアント（2026-06-10 追加・防御的）
  "（※note公開後にURLを追加予定）",
  "（※ note 公開後に URL を追加予定）",
  "※ note 公開後に URL を追加予定",
  "※ note 公開後にURLを追加予定",
  "※ magazine URL は公開後に追加予定",
];

function main() {
  const persona = process.argv[2];
  const url = process.argv[3];
  if (!persona || !url) {
    console.error(
      "usage: node inject-magazine-url.cjs <persona> <マガジンURL>\n" +
        "  例) node inject-magazine-url.cjs 自治体下水道担当 https://note.com/dobokunote/m/mf1cbc32d53aa",
    );
    process.exit(2);
  }
  if (!/^https:\/\/note\.com\/[^/]+\/m\//.test(url)) {
    console.error(
      `WARN: マガジン URL の形式 (https://note.com/<handle>/m/...) と一致しません: ${url}`,
    );
    console.error("意図した URL か確認してください。中断します。");
    process.exit(2);
  }

  const dirName = persona.startsWith("総監模範論文-")
    ? persona
    : `総監模範論文-${persona}`;
  const personaDir = path.join(MAG_ROOT, dirName);
  if (!fs.existsSync(personaDir)) {
    console.error(`ペルソナdir不在: ${personaDir}`);
    process.exit(2);
  }

  let totalFiles = 0;
  let totalHits = 0;
  for (const slug of fs.readdirSync(personaDir)) {
    const f = path.join(personaDir, slug, "article.md");
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) continue;
    const raw = fs.readFileSync(f, "utf8");
    const eol = raw.includes("\r\n") ? "\r\n" : "\n";
    let text = raw;
    let hits = 0;
    for (const ph of PLACEHOLDERS) {
      while (text.includes(ph)) {
        text = text.replace(ph, url);
        hits++;
      }
    }
    if (hits > 0 && text !== raw) {
      fs.writeFileSync(f, text.split("\r\n").join("\n").split("\n").join(eol));
      totalFiles++;
      totalHits += hits;
      console.log(`  ${slug}: ${hits}箇所置換`);
    } else {
      console.log(`  ${slug}: プレースホルダなし（スキップ）`);
    }
  }
  console.log(`\n完了: ${totalFiles} ファイル / ${totalHits} 箇所を ${url} に置換`);
}

main();
