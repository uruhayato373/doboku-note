#!/usr/bin/env node
// 総監模範論文ペルソナ記事の「導入部」散文段落を文(。)単位の短い段落へ分割する（note 可読性）。
// 対象は frontmatter 後 〜 最初の「## 試験問題 / ## 予想問題 / ## A 案」直前まで。
// 答案本文・見出し・箇条書き・URL・引用・括弧内の。は分割しない（連体形/連結語の誤分割も回避）。
// 真実源: .claude/knowledge/reference/note-essay-review-checklist.md Step 3c
//
// 使い方:
//   node scripts/split-essay-intro-paragraphs.mjs 自治体下水道担当         # ペルソナ配下の全 article.md
//   node scripts/split-essay-intro-paragraphs.mjs 自治体下水道担当 --dry    # 変更せずプレビュー
//   node scripts/split-essay-intro-paragraphs.mjs content/note/.../R03/article.md  # 単一ファイル
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'content/note/技術士総監/magazines';
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const target = args.find((a) => !a.startsWith('--'));
if (!target) {
  console.error('使い方: node scripts/split-essay-intro-paragraphs.mjs <ペルソナ名 | article.md パス> [--dry]');
  process.exit(2);
}

function splitIntro(file) {
  const raw = readFileSync(file, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split('\r\n').join('\n').split('\n');
  let dashes = 0, introEnd = -1, fmEnd = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^---$/.test(lines[i])) { dashes++; if (dashes === 2) fmEnd = i; }
    if (dashes >= 2 && /^## (試験問題|予想問題|A 案)/.test(lines[i])) { introEnd = i; break; }
  }
  if (introEnd < 0) return { file, changed: false, reason: '導入部終端未検出' };
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const inIntro = i > fmEnd && i < introEnd;
    const isStruct = /^(\s*[-*]\s|#{1,6}\s|>\s|\||https?:|---\s*$)/.test(l) || l.trim() === '';
    if (inIntro && !isStruct && /。[^」』）】]/.test(l)) {
      out.push(l.replace(/。(?=[^」』）】])/g, '。\n\n'));
    } else out.push(l);
  }
  const next = out.join('\n').replace(/\n{3,}/g, '\n\n');
  const changed = next !== lines.join('\n');
  if (changed && !DRY) writeFileSync(file, next.split('\n').join(eol));
  return { file, changed };
}

const files = [];
if (target.endsWith('.md')) {
  files.push(target);
} else {
  const dir = join(ROOT, target.startsWith('総監模範論文-') ? target : `総監模範論文-${target}`);
  if (!existsSync(dir)) { console.error(`ペルソナdir不在: ${dir}`); process.exit(2); }
  for (const slug of readdirSync(dir)) {
    const f = join(dir, slug, 'article.md');
    if (existsSync(f) && statSync(f).isFile()) files.push(f);
  }
}

let n = 0;
for (const f of files) {
  const r = splitIntro(f);
  if (r.reason) { console.log(`- ${f}: SKIP (${r.reason})`); continue; }
  console.log(`${r.changed ? (DRY ? '[dry] 変更あり' : '分割') : '変更なし'}: ${f.replace(/\\/g, '/')}`);
  if (r.changed) n++;
}
console.log(`\n${DRY ? '(dry) ' : ''}導入部分割: ${n} ファイル`);
