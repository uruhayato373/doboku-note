#!/usr/bin/env node
/**
 * check-note-intro-benefit.mjs
 * ---------------------------------------------------------------------------
 * 有料 note 記事の**無料プレビュー内**に「**この記事でわかること**」があるかを検査する。
 *
 * なぜ有料記事に限って赤で落とすか: 有料記事の無料部分は購入判断のすべてで、そこに
 * 「何が得られるか」が無い記事は、読者が代金に見合うか判断できないまま買うか離脱するかになる。
 * note-selling-structures.md の「読者が欲しいのは情報ではなく変化。冒頭で約束する」を、
 * 実際の運用で定着している表記（`**この記事でわかること**`）で機械化する。
 *
 * 実測（2026-07-28）: 有料 593 件のうち 580 件が境界前に配置、**境界より後ろは 0 件**、
 *   欠落は 5 件のみ（いずれも最高価格帯の PDF 商品＝¥1,980 / ¥1,480×2 / ¥980×2）。
 *   例外のない慣行なので、機械ゲートにしてよい。
 *
 * 無料記事は対象外（もくじ・索引・「はじめに」など、構造的に benefit 節を持たない記事が
 *   正当に存在するため）。参考として件数だけ INFO で出す。
 *
 * 使い方:
 *   node scripts/check-note-intro-benefit.mjs            # 全量（CI）
 *   node scripts/check-note-intro-benefit.mjs --staged   # pre-commit
 * ---------------------------------------------------------------------------
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = join(ROOT, 'docs/note');
const ALLOW_PATH = join(ROOT, '.claude/config/note-intro-benefit-allow.json');
const MARKER = '**この記事でわかること**';

const argv = process.argv.slice(2);
const STAGED = argv.includes('--staged');

const allow = existsSync(ALLOW_PATH) ? JSON.parse(readFileSync(ALLOW_PATH, 'utf8')) : { entries: [] };
const allowSet = new Set((allow.entries || []).map((e) => e.noteId));

const ARTICLE_RE = /^article(-[^/\\]+)?\.md$/;
function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (ARTICLE_RE.test(e.name)) acc.push(p);
  }
  return acc;
}
const fmv = (fm, k) => (fm.match(new RegExp('^' + k + ':\\s*(?:"(.*?)"|\'(.*?)\'|(.+?))\\s*$', 'm')) || []).slice(1).find(Boolean) || '';

let stagedSet = null;
if (STAGED) {
  const { execFileSync } = await import('node:child_process');
  const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { encoding: 'utf8' });
  stagedSet = new Set(out.split(/\r?\n/).filter((p) => /^docs\/note\/.*\/article(-[^/]+)?\.md$/.test(p)));
}

let paid = 0; let freeMissing = 0; let free = 0;
const missing = []; const afterBoundary = [];
for (const file of walk(BASE)) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  if (stagedSet && !stagedSet.has(rel)) continue;
  const t = readFileSync(file, 'utf8');
  const fm = (t.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1] || '';
  const noteId = fmv(fm, 'noteId');
  if (!noteId) continue;                                    // 未公開は対象外
  const isPaid = fmv(fm, 'notePricing') === 'paid';
  if (!isPaid) { free++; if (!t.includes(MARKER)) freeMissing++; continue; }
  paid++;
  if (allowSet.has(noteId)) continue;

  const price = fmv(fm, 'price') || '?';
  const at = t.indexOf(MARKER);
  if (at < 0) { missing.push({ rel, noteId, price }); continue; }
  // 無料プレビュー内（有料境界より前）にあるか
  const bre = fmv(fm, 'paidBoundary') || '試験問題|予想問題';
  const bm = t.match(new RegExp('^##\\s*(?:' + bre + ')', 'm'));
  if (bm && at > bm.index) afterBoundary.push({ rel, noteId, price });
}

console.log(`[check-note-intro-benefit${STAGED ? ' --staged' : ''}] 実検査 有料 ${paid} 件（無料 ${free} 件は対象外・うち未設置 ${freeMissing} 件）/ allowlist ${allowSet.size} 件`);

const bad = [...missing, ...afterBoundary];
if (bad.length) {
  if (missing.length) {
    console.error(`\n✗ 「${MARKER}」が無い有料記事: ${missing.length} 件`);
    for (const m of missing) console.error(`  ¥${String(m.price).padStart(5)}  ${m.noteId}  ${m.rel}`);
  }
  if (afterBoundary.length) {
    console.error(`\n✗ 有料エリア内にあり購入前に読めない: ${afterBoundary.length} 件`);
    for (const m of afterBoundary) console.error(`  ¥${String(m.price).padStart(5)}  ${m.noteId}  ${m.rel}`);
  }
  console.error('\n  有料記事の無料部分は購入判断のすべて。「何が得られるか」を境界より前に置く。');
  console.error('  構造的に不要な記事（索引・はじめに等）は .claude/config/note-intro-benefit-allow.json に理由付きで登録する。');
}

// 検査ゼロで PASS を返さない（--staged は note 記事を触っていないのが正常）
if (!STAGED && paid === 0) { console.error('✗ 有料記事の検査対象が0件＝走査が壊れている疑い（検査不成立）'); process.exit(1); }
if (!bad.length) console.log(`\n✓ 有料記事 ${paid - allowSet.size} 件すべてが無料プレビュー内に benefit 節を持つ`);
process.exit(bad.length ? 1 : 0);
