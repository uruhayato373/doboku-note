#!/usr/bin/env node
// sales-log.json に出現する productId と、公開済み単品商品が sales-recorder エージェントの
// mapping テーブルに文書化されているかを検証する（capability ドリフトの再発防止）。
//
// 背景: .claude/knowledge/reference/sales-tracking.md「新商品の追加」手順② は「新商品を売ったら
// .claude/agents/sales-recorder.md の productId 推定ルールに追加する」と定めるが、
// 人手の規律のため取りこぼす（2026-06、建設部門2次 選択科目マガジン・他科目R8予想 等が
// mapping に1件も無く、エージェントに任せると半数が article:unknown-* に落ちて手作業化した）。
// check-doc-coupling.mjs が「台帳の更新もれ」を機械検知するのと同じ思想で、本ガードは
// 「sales mapping の更新もれ」を commit 時に検知して止める。
//
// 検査内容:
//   1. .claude/state/sales/sales-log.json の distinct productId を収集
//   2. src/lib/note-magazines.ts の公開済み単品（/n/）を article:<id> として収集
//   3. .claude/agents/sales-recorder.md の backtick コードスパンから productId パターンを抽出し
//      （`{subject}`→任意 slug, `{N}`→数字, `{a|b}`→選択肢, `*`→任意）正規表現に変換
//   4. どのパターンにも一致しない productId、公開単品の明示 mapping 漏れ、
//      article:unknown-* を違反として列挙
//
// --staged 時は sales-log.json / sales-recorder.md / note-magazines.ts のいずれかが
// staged の場合のみ起動（それ以外は no-op）。
// 違反が 1 件でもあれば exit 1。緊急回避: SKIP_SALES_MAPPING=1、または git commit --no-verify。
//
// 使い方:
//   node scripts/check-sales-mapping.mjs            # 常時フル検査
//   node scripts/check-sales-mapping.mjs --staged   # pre-commit 用
//   npm run check-sales-mapping
//
// 真実源: .claude/knowledge/reference/sales-tracking.md / .claude/agents/sales-recorder.md

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { publishedArticleProductIds } from './lib/sales-mapping.mjs';

const SALES_LOG = '.claude/state/sales/sales-log.json';
const RECORDER = '.claude/agents/sales-recorder.md';
const NOTE_CATALOG = 'src/lib/note-magazines.ts';

if (process.env.SKIP_SALES_MAPPING === '1') {
  console.log('[check-sales-mapping] スキップ（SKIP_SALES_MAPPING=1）');
  process.exit(0);
}

const staged = process.argv.includes('--staged');

if (staged) {
  let stagedFiles = [];
  try {
    stagedFiles = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
      encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    stagedFiles = [];
  }
  if (
    !stagedFiles.includes(SALES_LOG) &&
    !stagedFiles.includes(RECORDER) &&
    !stagedFiles.includes(NOTE_CATALOG)
  ) {
    process.exit(0); // 売上系の変更が無いコミットは対象外
  }
}

// --- 1. sales-log.json の distinct productId ---
let log;
try {
  log = JSON.parse(readFileSync(SALES_LOG, 'utf8'));
} catch (e) {
  console.error(`[check-sales-mapping] ${SALES_LOG} を読めません: ${e.message}`);
  process.exit(1);
}
const productIds = [...new Set((log.sales || []).map((s) => s.productId).filter(Boolean))];

// --- 2. sales-recorder.md から productId パターンを抽出 ---
// フェンス付きコードブロック（```...```）を先に除去する。フェンスの ``` がインライン
// コードスパンのペアリングをずらし、id 列セルが取りこぼされるのを防ぐ。
const recorderSrc = readFileSync(RECORDER, 'utf8').replace(/```[\s\S]*?```/g, '');
const codeSpans = [...recorderSrc.matchAll(/`([^`]+)`/g)].map((m) =>
  m[1].trim().replace(/\\\|/g, '|') // markdown のパイプエスケープ \| を | に戻す
);

// productId らしいトークンのみ採用（小文字 slug。空白・大文字・< > （ 等を含むものは除外）
// 先頭は小文字/数字。以降は `{N}` 等プレースホルダ内の大文字も許容する。
const idLike = (t) =>
  /^[a-z0-9][a-zA-Z0-9:_*{}|/.\-]*$/.test(t) && (t.startsWith('article:') || t.includes('-'));
const patternTokens = [...new Set(codeSpans.filter(idLike))];

// 正規表現メタ文字をエスケープ（リテラル部分用）
const escapeLit = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, (r) => '\\' + r);

// パターン文字列 → 正規表現。`{subject}`→slug, `{N}`→数字, `{a|b}`→選択肢, `*`→任意。
// `{...}` と `*` を境界にトークン分割し、リテラル部分だけをエスケープする。
function patternToRegExp(p) {
  let out = '';
  let last = 0;
  const re = /\{([^}]+)\}|\*/g;
  let m;
  while ((m = re.exec(p)) !== null) {
    out += escapeLit(p.slice(last, m.index));
    if (m[0] === '*') {
      out += '.*';
    } else {
      const inner = m[1];
      if (inner.includes('|')) {
        out += '(' + inner.split('|').map((x) => escapeLit(x.trim())).join('|') + ')';
      } else if (/^N$/i.test(inner)) {
        out += '[0-9]+';
      } else {
        out += '[a-z0-9-]+';
      }
    }
    last = re.lastIndex;
  }
  out += escapeLit(p.slice(last));
  return new RegExp('^' + out + '$');
}

const patterns = patternTokens.map((t) => ({ src: t, re: patternToRegExp(t) }));
const catalogArticleIds = publishedArticleProductIds(readFileSync(NOTE_CATALOG, 'utf8'));

// --- 3. 公開済み単品カタログを収集し、売上実績と合わせて照合 ---
const violations = [];
for (const id of productIds) {
  if (/(^|:)unknown-/.test(id)) {
    violations.push({ id, reason: 'article:unknown-* は要解決（正しい productId に確定して mapping へ）' });
    continue;
  }
  const hit = patterns.some((p) => p.re.test(id));
  if (!hit) {
    violations.push({ id, reason: 'sales-recorder.md の mapping に未文書化' });
  }
}

for (const id of catalogArticleIds) {
  if (!patternTokens.includes(id)) {
    violations.push({
      id,
      reason: 'note-magazines.ts の公開済み単品だが sales-recorder.md に明示 mapping がない',
    });
  }
}

if (violations.length === 0) {
  console.log(
    `[check-sales-mapping] ✓ 売上 productId ${productIds.length} 種＋公開単品 ${catalogArticleIds.length} 件は全て sales-recorder.md の mapping に存在`
  );
  process.exit(0);
}

console.error('[check-sales-mapping] ✗ mapping 未文書化の productId を検出:');
for (const v of violations) {
  console.error(`  - ${v.id}  （${v.reason}）`);
}
console.error('');
console.error('対処: .claude/agents/sales-recorder.md の productId 推定テーブルに該当行を追加し');
console.error('      （命名規則は .claude/knowledge/reference/sales-tracking.md）、同一コミットに含めてください。');
console.error('      slug 自体が誤りなら sales-log.json を修正。緊急回避は SKIP_SALES_MAPPING=1。');
process.exit(1);
