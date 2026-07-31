#!/usr/bin/env node
/**
 * wire-note-paid-cta.mjs
 * ---------------------------------------------------------------------------
 * 有料 note 記事の L3 CTA を「非購入者に見える位置」へ配線する冪等トランスフォーム。
 *
 * 背景（2026-07-31）:
 *   note の有料記事は paidBoundary 以降が paywall の中に入る。L3 の帰路 CTA（資格別
 *   L2 もくじ）は wire-note-funnel-cta が「記事末尾」に置く設計のため、有料記事では
 *   非購入者に一度も見えない。実測: n74c193d154e5 の無料本文 7,450 字に土木もくじ URL
 *   が不在。paid+published 251 本のうち 155 本が同状態、さらに 83 本はもくじ CTA 自体が
 *   未配線だった（magazines/ は audit-note-funnel の D1-D6 スコープ外で未監視）。
 *   note-funnel-architecture.md §37 が既に「有料単品記事は無料プレビュー域の
 *   カードが実質の回遊導線」と認めており、本スクリプトはそれを機械化したもの。
 *
 * やること（冪等・順序固定）:
 *   1. 著者権威画像の重複除去 — 冒頭と末尾に同一の `![...](img/...)` 行がある記事で
 *      2 枚目以降を削除。note は同一画像の 2 枚目 CDN 確定に失敗して本文更新が ABORT
 *      するため、ライブ反映の前提条件（2026-07-30 に手作業で行った処置の機械化）。
 *   2. L2 もくじ CTA を有料境界の直前（＝無料プレビューの末尾）へ移設 / 新規挿入。
 *   3. civil の二次系のみ: 空いた記事末尾（有料域）にメンバーシップ CTA を追加。
 *      「答案を書き換えた直後に第三者の目がほしい」瞬間に添削を提示する。
 *      一次（択一）記事は intent が違うので対象外（note-funnel-architecture.md 原則 7）。
 *      総監・建設部門は資格セグメント違反になるので対象外（同 原則 1）。
 *
 * 使い方:
 *   node scripts/wire-note-paid-cta.mjs                 # dry-run（既定・書き込まない）
 *   node scripts/wire-note-paid-cta.mjs --apply         # 実書き込み
 *   node scripts/wire-note-paid-cta.mjs --check         # ゲート（要修正が残っていれば exit 1）
 *   node scripts/wire-note-paid-cta.mjs --list out.txt  # 変更した記事のパスを出力（ライブ反映用）
 *
 * 真実源: .claude/config/note-funnel.json（L2 URL・もくじ文面）
 *         .claude/knowledge/reference/note-funnel-architecture.md（原則）
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'docs/note';
const DEFAULT_BOUNDARY = '試験問題|予想問題';
const CFG = JSON.parse(readFileSync('.claude/config/note-funnel.json', 'utf8'));

const APPLY = process.argv.includes('--apply');
const CHECK = process.argv.includes('--check');
const LIST_OUT = (() => { const i = process.argv.indexOf('--list'); return i >= 0 ? process.argv[i + 1] : null; })();

const EXAMS = Object.entries(CFG.exams).map(([key, v]) => ({
  key,
  dir: v.articleGlob.replace(/\\/g, '/'),
  marker: `<!-- ${v.bottomCta.marker} -->`,
  block: v.bottomCta.text.split('\n'),
  l2Id: v.L2.noteId,
}));

const MEMBERSHIP_MARKER = '<!-- cta:civil-membership-lab -->';
const MEMBERSHIP_URL = 'https://note.com/dobokunote/membership/join';
// 経験記述系（完成答案を自分の現場へ書き換える読者）
const MEMBERSHIP_KEIKEN = [
  MEMBERSHIP_MARKER,
  '書き換えた答案を「これで通るか」第三者に確認してほしい方へ。',
  '',
  '月例の予想問題と施工経験記述のマンツーマン添削がつくメンバーシップ「土木セコカン合格ラボ」があります。',
  '',
  MEMBERSHIP_URL,
];
// 二次学科記述・出題分析系（答案そのものではなく書き方・論点を学ぶ読者）
const MEMBERSHIP_NIJI = [
  MEMBERSHIP_MARKER,
  '書いた答案を第三者の目で見てもらう手段がない、という方へ。',
  '',
  '月例の予想問題と施工経験記述のマンツーマン添削がつくメンバーシップ「土木セコカン合格ラボ」があります。',
  '',
  MEMBERSHIP_URL,
];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/^article(-[^/\\]+)?\.md$/.test(e)) out.push(p.split('\\').join('/'));
  }
  return out;
}
const fmv = (raw, k) => { const m = raw.match(new RegExp('^' + k + ':[ \\t]*(.*)$', 'm')); return m ? m[1].trim().replace(/^["']|["']$/g, '') : null; };

// 有料境界となる H2 の行番号（check-note-boundary.mjs と同じ prefix 一致ロジック）
function boundaryIdx(lines, boundary) {
  const alts = boundary.split('|').map((s) => s.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+(.+)$/);
    if (m && alts.some((a) => m[1].trim().startsWith(a))) return i;
  }
  return -1;
}
const lastNonBlank = (lines, from) => { let i = from; while (i >= 0 && lines[i].trim() === '') i--; return i; };

// メンバーシップ CTA の対象（civil の二次系のみ）と文面の選択
function membershipBlock(file) {
  if (!file.startsWith('docs/note/1級・2級土木/')) return null;
  if (/一次/.test(file)) return null;              // 択一は intent が別
  if (/経験記述|想定工事バンク/.test(file)) return MEMBERSHIP_KEIKEN;
  if (/二次/.test(file)) return MEMBERSHIP_NIJI;
  return null;
}

const stats = { scanned: 0, paid: 0, dedupedImg: 0, movedMokuji: 0, insertedMokuji: 0, addedMembership: 0, alreadyOk: 0, noBoundary: [], noExam: [] };
const changed = [];

for (const file of walk(ROOT)) {
  stats.scanned++;
  const raw = readFileSync(file, 'utf8');
  if (fmv(raw, 'notePricing') !== 'paid') continue;
  // 公開判定は noteId / noteUrl の有無で行う（check-note-boundary.mjs と同一）。
  // 2026-07-31: 当初 noteStatus:'published' を必須にしていたが、この行を持たない
  // 公開済み記事が 326 本あり（577 中）、静かに検査対象から落ちていた。
  if (!fmv(raw, 'noteId') && !fmv(raw, 'noteUrl')) continue;
  stats.paid++;

  const exam = EXAMS.find((e) => file.startsWith(e.dir + '/'));
  if (!exam) { stats.noExam.push(file); continue; }

  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const endsWithNewline = /\r?\n$/.test(raw);
  let lines = raw.split(/\r?\n/);
  if (endsWithNewline) lines.pop();
  const before = lines.join('\n');

  // --- 1. 同一画像の重複除去（2 枚目以降）---
  const seenImg = new Set();
  const kept = [];
  let removedImg = 0;
  for (const l of lines) {
    if (/^!\[/.test(l)) {
      if (seenImg.has(l)) { removedImg++; continue; }
      seenImg.add(l);
    }
    kept.push(l);
  }
  if (removedImg) {
    lines = kept.filter((l, i) => !(l.trim() === '' && kept[i - 1] !== undefined && kept[i - 1].trim() === ''));
    stats.dedupedImg++;
  }

  // --- 2. もくじ CTA を無料域（有料境界の直前）へ ---
  const bi = boundaryIdx(lines, fmv(raw, 'paidBoundary') || DEFAULT_BOUNDARY);
  if (bi < 0) { stats.noBoundary.push(file); continue; }

  const mi = lines.findIndex((l) => l.trim() === exam.marker);
  let removedTailBlock = false;
  if (mi >= 0 && mi < bi) {
    stats.alreadyOk++;
  } else {
    if (mi >= 0) {
      // 既存ブロック（marker 〜 L2 URL 行）を撤去
      let ui = mi;
      while (ui < lines.length && !lines[ui].includes(exam.l2Id)) ui++;
      if (ui >= lines.length) { stats.noBoundary.push(file + ' (L2 URL 行が見つからない)'); continue; }
      lines.splice(mi, ui - mi + 1);
      // 末尾に取り残された空行と区切り線を掃除
      let e = lastNonBlank(lines, lines.length - 1);
      lines.length = e + 1;
      if (lines[lines.length - 1] && lines[lines.length - 1].trim() === '---') lines.pop();
      let e2 = lastNonBlank(lines, lines.length - 1);
      lines.length = e2 + 1;
      removedTailBlock = true;
      stats.movedMokuji++;
    } else {
      stats.insertedMokuji++;
    }

    // 撤去でズレるので境界を取り直す
    const bi2 = boundaryIdx(lines, fmv(raw, 'paidBoundary') || DEFAULT_BOUNDARY);
    const prev = lastNonBlank(lines, bi2 - 1);
    const head = lines.slice(0, prev + 1);
    const tail = lines.slice(bi2);
    const sep = head[head.length - 1] && head[head.length - 1].trim() === '---' ? [] : ['', '---'];
    lines = [...head, ...sep, '', ...exam.block, '', ...tail];
  }

  // --- 3. civil 二次系: 記事末尾（有料域）にメンバーシップ CTA ---
  const memb = membershipBlock(file);
  if (memb && !lines.some((l) => l.trim() === MEMBERSHIP_MARKER)) {
    let e = lastNonBlank(lines, lines.length - 1);
    lines.length = e + 1;
    const sep = lines[lines.length - 1].trim() === '---' ? [] : ['', '---'];
    lines = [...lines, ...sep, '', ...memb];
    stats.addedMembership++;
  }

  const after = lines.join('\n');
  if (after === before) continue;
  changed.push(file);
  if (APPLY) writeFileSync(file, lines.join(eol) + (endsWithNewline ? eol : ''), 'utf8');
}

console.log(`[wire-note-paid-cta] 走査 ${stats.scanned} 件 / paid+published(noteId有) ${stats.paid} 件を実検査`);
console.log(`  もくじ移設(有料域→無料域): ${stats.movedMokuji}`);
console.log(`  もくじ新規挿入(未配線)   : ${stats.insertedMokuji}`);
console.log(`  メンバーシップCTA追加     : ${stats.addedMembership}`);
console.log(`  重複画像を除去した記事    : ${stats.dedupedImg}`);
console.log(`  既に無料域にあり(据置)    : ${stats.alreadyOk}`);
if (stats.noExam.length) console.log(`  L2 もくじ未定義の資格     : ${stats.noExam.length} 件（対象外）`);
if (stats.noBoundary.length) { console.log(`  有料境界を解決できず      : ${stats.noBoundary.length} 件`); stats.noBoundary.forEach((f) => console.log('    - ' + f)); }
console.log(`  => 変更対象 ${changed.length} 件 ${APPLY ? '(書き込み済み)' : '(dry-run・未書き込み)'}`);

if (stats.paid === 0) { console.error('[wire-note-paid-cta] FAIL: paid 記事を 1 件も検査していない（検査ゼロは PASS ではない）'); process.exit(1); }
if (LIST_OUT) { writeFileSync(LIST_OUT, changed.join('\n') + '\n', 'utf8'); console.log(`  -> ${LIST_OUT}`); }
if (CHECK && changed.length) { console.error(`[wire-note-paid-cta] FAIL: ${changed.length} 件の有料記事で L3 CTA が非購入者に見えない位置にある。 node scripts/wire-note-paid-cta.mjs --apply`); process.exit(1); }
