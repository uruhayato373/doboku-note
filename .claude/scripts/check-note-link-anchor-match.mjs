#!/usr/bin/env node
// note 公開ドラフト（content/note/{slug}/article.md）内の `[anchor](URL)` について、
// URL のスラッグ末尾（pe-comprehensive-management-{slug}）に対応する pe-chapters.json の
// title と anchor テキストが概念一致しているかをヒューリスティック検査する。
//
// 一致条件（OR）:
//   - 正規化後に anchor と title が完全一致
//   - 一方が他方を substring として含む
//   - 2 文字以上の共通連続文字列を持つ
// 上記いずれも満たさない場合は MISMATCH として警告。
//
// 注意: ヒューリスティックなので誤検知/見逃しはあり得る。
//   - 見逃し例: "リスクコミュニケーション" → slug=risk-perception (title="リスク認知")
//     共通 2 文字 "リス"/"スク" があるため OK 判定（実際は別概念）
//   - 検知例: "公益通報者保護法" → slug=occupational-safety-act (title="労働安全衛生法")
//     共通 2 文字なし → MISMATCH
//
// Usage: node .claude/scripts/check-note-link-anchor-match.mjs <article.md>

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const articlePath = process.argv[2];
if (!articlePath) {
  console.error('Usage: node check-note-link-anchor-match.mjs <article.md>');
  process.exit(1);
}

const dictPath = resolve('src/config/pe-chapters.json');
const dict = JSON.parse(readFileSync(dictPath, 'utf8'));
const slugToTitle = new Map();
for (const c of dict.chapters || []) {
  for (const s of c.sections || []) {
    for (const k of s.keywords || []) {
      slugToTitle.set(k.slug, k.title);
    }
  }
}

// 過去問・年度別ページ・SUMMARY_REGEX に該当するスラッグはキーワード辞書の対象外。
// anchor は通常 "R07" / "R05" / "記述式過去問 R05（…）" 等の年度ラベルなので照合スキップ。
const SKIP_SLUG_RE = /^(r\d+-(primary|secondary)|h\d+-[ab]|exam-index)$/;

// pe-chapters.json に未登録のスラッグは、`content/site/.../article.mdx`
// の frontmatter title を fallback で読む（pillar / hub / cross-cutting 等）
function loadFrontmatterTitle(slug) {
  const p = resolve(`content/site/pe-comprehensive-management/${slug}/article.mdx`);
  if (!existsSync(p)) return null;
  const head = readFileSync(p, 'utf8').slice(0, 2000);
  const m = head.match(/^title:\s*["']?([^"'\n]+)["']?\s*$/m);
  return m ? m[1].trim() : null;
}

const text = readFileSync(articlePath, 'utf8');

const norm = (s) => s.replace(/[\s（）()「」、。…\[\]?!./・]/g, '');
const shareN = (a, b, n) => {
  if (a.length < n || b.length < n) return false;
  for (let i = 0; i <= a.length - n; i++) {
    if (b.includes(a.slice(i, i + n))) return true;
  }
  return false;
};

const re = /\[([^\]]+)\]\(https:\/\/doboku-note\.com\/docs\/pe-comprehensive-management-([a-z0-9-]+)/g;
const issues = [];
let lineNo = 1;
let lastIdx = 0;
let m;
while ((m = re.exec(text)) !== null) {
  while (lastIdx < m.index) {
    if (text[lastIdx] === '\n') lineNo++;
    lastIdx++;
  }
  const anchor = m[1];
  const slug = m[2];
  if (SKIP_SLUG_RE.test(slug)) continue;
  let title = slugToTitle.get(slug);
  if (!title) {
    title = loadFrontmatterTitle(slug);
    if (!title) {
      issues.push({ line: lineNo, type: 'UNKNOWN_SLUG', anchor, slug });
      continue;
    }
  }
  const na = norm(anchor);
  const nt = norm(title);
  if (na === nt || na.includes(nt) || nt.includes(na)) continue;
  if (shareN(na, nt, 2)) continue;
  issues.push({ line: lineNo, type: 'MISMATCH', anchor, slug, title });
}

if (issues.length === 0) {
  console.log('LINK_ANCHOR: OK (リンク全件で anchor↔title 概念一致)');
  process.exit(0);
}

console.log(`LINK_ANCHOR: ${issues.length} 件の懸念`);
for (const i of issues) {
  if (i.type === 'UNKNOWN_SLUG') {
    console.log(`  L${i.line} UNKNOWN_SLUG slug=${i.slug} (anchor="${i.anchor}") — pe-chapters.json 未登録`);
  } else {
    console.log(`  L${i.line} MISMATCH anchor="${i.anchor}" → ${i.slug} (title="${i.title}")`);
  }
}
console.log('注: ヒューリスティック検査。誤検知/見逃しあり得るので目視確認推奨');
process.exit(0);
