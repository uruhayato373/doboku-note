#!/usr/bin/env node
/**
 * note-probe.mjs — 「この記事、ライブでどうなってる？」を 1 コマンドで確かめる read-only 診断。
 *
 * 背景: backlog カードの実査のたびに同じ形の Playwright/curl プローブを都度書いていた
 *   （2026-08-25・不具合カード 26 枚の消化で 6 回）。read-only の実査を 1 コマンドへ集約する。
 *
 * **書き込み経路を持たない**。公開 API（scripts/lib/note-api.mjs）で見えるところまでを表示し、
 * 会員限定などで見えない場合は「計測不能」と表示するだけで、それ以上は追わない
 * （著者ログインでの実査は別途 Playwright が要る＝本ツールの範囲外）。
 *
 * Usage:
 *   node scripts/note-probe.mjs n3f5b4f4dfd04                      # noteId 直指定
 *   node scripts/note-probe.mjs content/note/…/article.md          # 記事パス（frontmatter から解決）
 *   node scripts/note-probe.mjs --json n3f5b4f4dfd04
 * exit: 0 常に（診断ツールなので合否判定はしない。--json は state==='dead' のときだけ 1）
 */
import { readFileSync, existsSync } from 'node:fs';
import { fetchNote } from './lib/note-api.mjs';

const NAME = 'note-probe';
const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const target = argv.find((a) => !a.startsWith('--'));

if (!target) {
  console.error(`使い方: node scripts/${NAME}.mjs <noteId|記事パス> [--json]`);
  process.exit(2);
}

/** frontmatter から必要な値だけ拾う（gray-matter を要らない・単純な 1 行キー読みで足りる）。 */
function readFrontmatter(src) {
  const block = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!block) return {};
  const out = {};
  for (const line of block[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z][\w]*):\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

let noteId = target;
let source = null;
if (!/^n[a-f0-9]{10,}$/.test(target)) {
  if (!existsSync(target)) {
    console.error(`FAIL: noteId の形でも既存ファイルパスでもない: ${target}`);
    process.exit(2);
  }
  const raw = readFileSync(target, 'utf8');
  const fm = readFrontmatter(raw);
  if (!fm.noteId) {
    console.error(`FAIL: ${target} の frontmatter に noteId が無い（未公開の可能性）`);
    process.exit(2);
  }
  noteId = fm.noteId;
  source = { path: target, price: fm.price || null, notePricing: fm.notePricing || null, paidBoundary: fm.paidBoundary || null };
}

const live = await fetchNote(noteId);

// 中断台帳（note-update-body.mjs が保存前に止まった記録）。あれば必ず知らせる——
// これを見ずに再実行すると note のアップロード上限に無駄打ちするだけで再開しない。
const ABORT_LEDGER = '.claude/state/note-update-aborted.json';
let abortRecord = null;
if (existsSync(ABORT_LEDGER)) {
  try {
    const j = JSON.parse(readFileSync(ABORT_LEDGER, 'utf8'));
    abortRecord = (j.aborted || []).find((a) => a.noteId === noteId) || null;
  } catch { /* 台帳が読めなくても診断は続ける */ }
}

const result = { noteId, source, live, abortRecord };

if (JSON_OUT) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(live.state === 'dead' ? 1 : 0);
}

console.log(`[${NAME}] ${noteId}${source ? `  ← ${source.path}` : ''}`);
console.log(`  state: ${live.state}${live.error ? `  (${live.error})` : ''}`);
if (live.state === 'alive' || live.state === 'unmeasurable') {
  console.log(`  status=${live.status}  price=${live.price ?? '—'}  isLimited=${live.isLimited}`);
  console.log(`  無料本文=${live.bodyLen}字  タグ=${live.tags}`);
}
if (live.state === 'unmeasurable') {
  console.log('  ※ 未ログイン公開 API では中身が返らない（会員限定等）。「不足」ではなく計測不能——著者ログインで実査すること');
}
if (source) {
  const srcPaid = source.notePricing === 'paid';
  console.log(`  ソース: notePricing=${source.notePricing || '—'}  price=${source.price || '—'}  paidBoundary=${source.paidBoundary || '—'}`);
  if (srcPaid && live.price != null && String(live.price) !== String(source.price)) {
    console.log(`  ⚠ 価格ドリフト: ソース ${source.price} ≠ live ${live.price}`);
  }
}
if (abortRecord) {
  console.log(`  ⚠ 中断台帳あり: ${abortRecord.reason}（${abortRecord.at}）`);
  console.log('    再実行するなら --force-retry。まずこの diag の live 実体を見て事故が無いか確認してから。');
}
