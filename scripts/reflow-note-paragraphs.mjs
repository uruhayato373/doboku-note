#!/usr/bin/env node
/**
 * reflow-note-paragraphs.mjs — note 記事本文の長い段落を「文（。）境界」で短い段落に分割する
 *
 * note はモバイル閲覧が主で、1 段落が長いと読まれない。本ツールは長い段落（既定 >120 字）を
 * 文単位で再パッキングし、1 段落 ~120 字（1〜2 文）に揃える。**語句・文意は一切変えず、改行
 * （空行）を足すだけ**（生成 AI の書き換えによる内容改変リスクを排除した決定論処理）。
 *
 * 対象外（触らない）: frontmatter / 見出し(#) / 箇条書き(- * +) / 引用(>) / 表(|) / 水平線(---) /
 *   コードフェンス(```) / URL 単独行 / 太字だけの行（**こんな人…** **Q. …** 等の見出し的ブロック）/
 *   画像行（![alt](...)）/ essay マガジンの答案本文（「## 試験問題 / ## 予想問題 / ## A 案 / ## B 案」以降）。
 *
 * ⚠ 画像行保護: isPlainPara で `![` 先頭を除外（2026-06-23 修正）。
 *   修正前は alt text 内の「。」で誤分割し img/... 参照が壊れる事故が発生していた。
 *
 * 真実源（段落長の目安）: .claude/knowledge/reference/content-principles.md §14-e
 * 関連: scripts/note-lint.mjs（note 非互換の BLOCK ゲート）/ /note-prepublish-review（--dry を WARN として呼ぶ）
 *
 * usage:
 *   node scripts/reflow-note-paragraphs.mjs [--target N] [--dry] <file|dir ...>
 *   --target N  1 段落の最大字数（既定 120）。これを超える段落のみ、≤N になるよう文単位で分割
 *   --dry       書き込まず、長い段落の件数だけ報告（公開前 WARN・点検用）
 *   引数が dir のときは配下の article.md を再帰探索
 *
 * 例:
 *   node scripts/reflow-note-paragraphs.mjs --dry "docs/note/技術士建設部門"        # 点検
 *   node scripts/reflow-note-paragraphs.mjs --target 110 "docs/note/技術士建設部門/道路の論文キーワード/article.md"
 *
 * 終了コード: 常に 0（--dry は WARN 扱いで GO 判定に影響させない方針のため、長段落ありでも 0）。
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { readMdxFile, writeMdxFile } from '../.claude/scripts/lib/mdx-io.mjs';

let argv = process.argv.slice(2);
let target = 120, dry = false;
const inputs = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--target') target = parseInt(argv[++i], 10);
  else if (argv[i] === '--dry') dry = true;
  else inputs.push(argv[i]);
}
if (inputs.length === 0) {
  console.error('usage: reflow-note-paragraphs.mjs [--target N] [--dry] <file|dir ...>');
  process.exit(2);
}

function walk(p) {
  let st;
  try { st = statSync(p); } catch { return []; }
  if (st.isFile()) return p.endsWith('.md') ? [p] : [];
  return readdirSync(p).flatMap((c) => walk(join(p, c)));
}

const visLen = (s) => s.replace(/\s/g, '').length;

function isPlainPara(block) {
  const t = block.trimStart();
  if (/^(#{1,6}\s|[-*+]\s|>\s?|\||---|```|https?:\/\/|!\[)/.test(t)) return false;
  // 太字だけの見出し的ブロック（**こんな人…** / **Q. …**）は対象外
  if (/^\*\*/.test(t) && /\*\*\s*$/.test(t.split('\n')[0])) return false;
  return true;
}

function reflow(block) {
  if (!isPlainPara(block)) return block;
  if (block.includes('\n')) return block; // 複数行ブロックは触らない
  if (visLen(block) <= target) return block;
  const sentences = block.split(/(?<=。)/).filter((s) => s.length > 0);
  if (sentences.length <= 1) return block; // 1 文だけなら分割不能
  const groups = [];
  let cur = '';
  for (const s of sentences) {
    if (cur === '') cur = s;
    else if (visLen(cur + s) <= target) cur += s;
    else { groups.push(cur); cur = s; }
  }
  if (cur) groups.push(cur);
  return groups.join('\n\n');
}

const files = inputs.flatMap(walk).filter((f) => f.endsWith('article.md') || inputs.includes(f));
let totalLong = 0;
for (const file of files) {
  const { raw, eol } = readMdxFile(file);
  const lf = raw.replace(/\r\n/g, '\n');
  const fm = lf.match(/^(---\n[\s\S]*?\n---\n)/);
  const head = fm ? fm[1] : '';
  const body = fm ? lf.slice(head.length) : lf;
  const blocks = body.split(/\n\n+/);
  // essay マガジン記事の「答案本文」保護: 「## 試験問題 / ## 予想問題 / ## A 案 / ## B 案」以降は
  // 連続散文（模範答案・設問再掲）なので分割しない（split-essay-intro-paragraphs.mjs と同じ境界）。
  // 一般記事（入口/ガイド等）にこの見出しは無いので全段落が対象になる。
  let answerStart = blocks.findIndex((b) => /^##\s*(試験問題|予想問題|A 案|B 案)/.test(b.trim()));
  if (answerStart === -1) answerStart = blocks.length;
  let longCount = 0, afterCount = 0;
  const out = blocks.map((b, idx) => {
    const bb = b.replace(/\n+$/, '');
    if (!bb.trim()) return bb;
    if (idx >= answerStart) return bb; // 答案本文域は触らない
    const isLong = isPlainPara(bb) && !bb.includes('\n') && visLen(bb) > target;
    const r = reflow(bb);
    if (isLong) { longCount++; afterCount += r.split('\n\n').length; }
    return r;
  });
  totalLong += longCount;
  if (dry) {
    if (longCount > 0) console.log(`WARN ${file}: >${target}字の段落 ${longCount} 件（分割推奨→ node scripts/reflow-note-paragraphs.mjs --target ${target} "${file}"）`);
  } else {
    if (longCount > 0) {
      writeMdxFile(file, head + out.join('\n\n'), eol);
      console.log(`OK ${file}  (${longCount}段落を分割→${afterCount})`);
    } else {
      console.log(`skip ${file}  (>${target}字の段落なし)`);
    }
  }
}
if (dry && totalLong === 0) console.log(`✅ 段落長 OK（>${target}字の段落なし）`);
process.exit(0);
