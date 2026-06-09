#!/usr/bin/env node
// 総監模範論文の「施策/答案ブロック」字数ゲート。
// 設問2/設問3 の施策ブロック（### 方法N / 施策N / 戦略N / 予想…施策）は答案用紙1枚=600字制約。
// 各ブロックの本文 CJK 文字数（≒答案マス数）を概算し、600字超過を検出する。
//
// 使い方:
//   node scripts/essay-shisaku-charcount.mjs                         # 全ペルソナ サマリ
//   node scripts/essay-shisaku-charcount.mjs <persona-dir|article.md> [--detail]  # 個別・ブロック明細
//   node scripts/essay-shisaku-charcount.mjs <path> --strict         # 超過1件でも exit 1（ゲート用）
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'docs/note/技術士総監/magazines';
const LIMIT = 600;
const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const target = args.find((a) => !a.startsWith('--'));
const DETAIL = flags.includes('--detail');
const STRICT = flags.includes('--strict');

// 施策ブロック見出し（1枚=600字制約が明確なもの）
const SHISAKU_HEAD = /^###\s.*(方法\s*\d|施策\s*\d|施策[1１２２３3]|戦略\s*\d|戦略[1１２３3]|^###\s.*将来の新たな)/;
const SHISAKU_HEAD2 = /^###\s.*(方法|施策|戦略|デジタルツイン|将来の)/;

function cjkLen(s) {
  // markdown 記号・リスト・太字記号・見出しを除去し、日本語文字（かな・漢字・全角）を数える
  const body = s
    .replace(/^###.*$/m, '')
    .replace(/\*\*/g, '')
    .replace(/[`>|#]/g, '');
  const jp = body.match(/[぀-ヿ㐀-鿿豈-﫿々〆ー、。「」（）：・…？！]/g) || [];
  return jp.length;
}

function articlesIn(p) {
  const out = [];
  const st = statSync(p);
  if (st.isFile()) return p.endsWith('.md') ? [p] : [];
  for (const e of readdirSync(p)) out.push(...articlesIn(join(p, e)));
  return out;
}

function measureArticle(path) {
  const raw = readFileSync(path, 'utf8').split('\r\n').join('\n');
  let body = raw;
  const start = body.search(/##\s*(A\s*案|フル模範|予想問題\s*1|設問)/);
  const end = body.search(/##\s*(採点者|元公務員|関連)/);
  if (start >= 0) body = body.slice(start, end > start ? end : undefined);
  // 見出し（##/### いずれか）で区切る。### 施策ブロックが直後の ## B案 等を巻き込むのを防ぐ。
  const blocks = body.split(/\n(?=#{2,}\s)/).filter((b) => /^###\s/.test(b));
  const res = [];
  for (const b of blocks) {
    const head = b.split('\n')[0].replace(/^###\s*/, '').trim();
    if (!SHISAKU_HEAD2.test('### ' + head)) continue;
    const len = cjkLen(b);
    if (len < 120) continue;
    res.push({ head: head.slice(0, 36), len, over: len > LIMIT });
  }
  return res;
}

if (!target) {
  // 全ペルソナ サマリ
  const personas = readdirSync(ROOT).filter((d) => d.startsWith('総監模範論文-'));
  let totOver = 0, totBlk = 0;
  const rows = [];
  for (const p of personas) {
    let over = 0, blk = 0;
    for (const a of articlesIn(join(ROOT, p))) for (const r of measureArticle(a)) { blk++; if (r.over) over++; }
    rows.push([p.replace('総監模範論文-', ''), over, blk]); totOver += over; totBlk += blk;
  }
  rows.sort((a, b) => b[1] - a[1]);
  console.log(`全${personas.length}ペルソナ / 施策ブロック ${totBlk} / 600字超過 ${totOver}\n`);
  for (const [p, o, b] of rows) console.log(`  ${String(o).padStart(3)}/${String(b).padStart(3)}  ${p}`);
  process.exit(0);
}

// 個別
const path = existsSync(target) ? target : join(ROOT, target);
const arts = articlesIn(path);
let over = 0, blk = 0;
for (const a of arts) {
  const res = measureArticle(a);
  const ov = res.filter((r) => r.over);
  blk += res.length; over += ov.length;
  if (DETAIL || ov.length) {
    console.log(`\n${a.replace(ROOT + '/', '').replace(/\\/g, '/')}`);
    for (const r of (DETAIL ? res : ov)) console.log(`  ${r.over ? '✗' : '✓'} ${String(r.len).padStart(4)}字  ${r.head}`);
  }
}
console.log(`\n施策ブロック ${blk} / 600字超過 ${over}`);
if (STRICT && over > 0) process.exit(1);
