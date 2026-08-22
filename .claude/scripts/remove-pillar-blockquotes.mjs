// .claude/scripts/remove-pillar-blockquotes.mjs
//
// pe-comprehensive-management 配下のキーワードページ（および他ページ）から
//   > 📘 **[XX管理 学習ガイド](slug)** — Y サブカテゴリの体系・頻出論点・学習導線
// 形式の blockquote 行を一括削除する。
//
// 削除理由: PillarNavCard（feat 0e3db512）でサイドバー＋モバイル末尾に
// 5 管理ピラーへの導線を提供したため、本文中の重複ナビは不要。
//
// 使い方:
//   node .claude/scripts/remove-pillar-blockquotes.mjs           # ドライラン（件数のみ）
//   node .claude/scripts/remove-pillar-blockquotes.mjs --apply   # 実際に書き換え

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { readMdxFile, writeMdxFile } from './lib/mdx-io.mjs';

const ROOT = 'content/site/pe-comprehensive-management';
const APPLY = process.argv.includes('--apply');

// 末尾改行 + blockquote 行 + 前後の余白を吸収して空行 1 行に正規化
// 例: "...\n\n> 📘 **[XX管理 学習ガイド](slug)** — N サブカテゴリの体系・頻出論点・学習導線\n\n..."
// → "...\n\n..."
const PATTERN = /\r?\n\s*\r?\n> 📘 \*\*\[[^\]]+学習ガイド\]\([^)]+\)\*\* — [^\r\n]+\r?\n/g;

let matchedFiles = 0;
let totalLines = 0;

const slugs = readdirSync(ROOT);
for (const slug of slugs) {
  const path = join(ROOT, slug, 'article.mdx');
  let stat;
  try {
    stat = statSync(path);
  } catch {
    continue;
  }
  if (!stat.isFile()) continue;

  const { raw, eol } = readMdxFile(path);
  const matches = raw.match(PATTERN);
  if (!matches) continue;

  matchedFiles++;
  totalLines += matches.length;

  if (APPLY) {
    // 削除後、隣接段落との間に 1 行の空行を確保（連続改行 3 つ以上にならないように）
    const newRaw = raw.replace(PATTERN, eol === '\r\n' ? '\r\n\r\n' : '\n\n');
    writeMdxFile(path, newRaw, eol);
  }
}

console.log(
  `${APPLY ? 'Removed' : 'Would remove'} ${totalLines} blockquote(s) from ${matchedFiles} file(s).`,
);
if (!APPLY) {
  console.log('Re-run with --apply to write changes.');
}
