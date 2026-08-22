/**
 * 「ピラーガイド」アンカーテキスト + 本文中の文字列を「学習ガイド」に一括置換
 *
 * 対象: content/site/ 配下の全 MDX
 * 改行コードは元ファイルのものを維持（CRLF/LF）。
 *
 * Usage:
 *   node .claude/scripts/replace-pillar-guide-text.mjs --dry-run
 *   node .claude/scripts/replace-pillar-guide-text.mjs
 */

import { readdirSync, statSync } from "fs";
import { join } from "path";
import { transformMdxFile } from "./lib/mdx-io.mjs";

const ROOT = "content/site";
const DRY = process.argv.includes("--dry-run");

function findMdx(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) findMdx(p, out);
    else if (name.endsWith(".mdx")) out.push(p);
  }
  return out;
}

function replace(raw) {
  // 1) アンカーテキストの「ピラーガイド」を「学習ガイド」へ
  //    パターン: [○○管理 ピラーガイド](/docs/...)
  const re1 = /\[([^\]]+管理)\s+ピラーガイド\]/g;
  // 2) 本文中の単独の「ピラーガイド」を「学習ガイド」へ
  //    既に置換済の frontmatter title は「学習ガイド」化されているので影響なし
  const re2 = /ピラーガイド/g;

  const after1 = raw.replace(re1, "[$1 学習ガイド]");
  const after2 = after1.replace(re2, "学習ガイド");
  return after2;
}

let total = 0,
  changed = 0;
const files = findMdx(ROOT);
console.log(`Scanning ${files.length} MDX files...\n`);

for (const f of files) {
  total++;
  let didChange = false;
  if (DRY) {
    // dry: 読むだけ
    const { raw } = (await import("./lib/mdx-io.mjs")).readMdxFile(f);
    const newRaw = replace(raw);
    didChange = raw !== newRaw;
    if (didChange) console.log(`  WOULD CHANGE: ${f}`);
  } else {
    didChange = transformMdxFile(f, replace);
    if (didChange) console.log(`  changed: ${f}`);
  }
  if (didChange) changed++;
}

console.log(`\n${DRY ? "[DRY RUN] " : ""}Files: ${changed} / ${total} changed`);
