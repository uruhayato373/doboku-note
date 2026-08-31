#!/usr/bin/env node
// affiliate-career-only の prose ゲート。
//
// 背景: 2026-06-25 に講座/教材/添削アフィリを完全廃止（PR #272）したが、
// PR #272 はコンポーネント撤去のみで「添削サービスも選択肢」「スタディング/アガルート」
// 等の本文 prose の再提案を 7 ページ取りこぼしていた（2026-06-27 発見・sweep 済）。
// 機械ガード（check-affiliate-mats は a8mat creative 専用で prose を見ない）が無いと
// 再発するため、本文 MDX に廃止アフィリの推奨 prose が混入していないかを SSOT
// 許可リスト src/config/affiliate-prose-denylist.json と突合する。
//
// 判定:
//   - denyTerms のいずれかが本文に出現し、allow 例外でない → ERROR（exit 1）。
//   - allow（{file, term}）に列挙された正当ケース（出典引用・試験コンテンツ）は除外。
//
// 設計方針: 通信講座/講座/添削 の語は試験コンテンツでも正当に出るため denyTerms に
// 入れない。廃止サービス名・講座ブランド名・代行語など高精度語に絞り誤検知を避ける。
//
// 使い方:
//   node scripts/check-affiliate-prose.mjs            # content/site 全体
//   node scripts/check-affiliate-prose.mjs --staged   # git staged の該当ファイルのみ（pre-commit 用）

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const STAGED = process.argv.includes('--staged');
const CONFIG = 'src/config/affiliate-prose-denylist.json';
const SCAN_DIR = 'content/site';
const SCAN_EXT = /\.mdx?$/;

if (!existsSync(CONFIG)) {
  console.error(`[check-affiliate-prose] ${CONFIG} が無いため検証をスキップ`);
  process.exit(0);
}

const config = JSON.parse(readFileSync(CONFIG, 'utf8'));
const denyTerms = config.denyTerms || [];
// allow: (file, term) ペアの集合。term 省略時はそのファイルの全 denyTerms を許可。
const allow = new Set((config.allow || []).map((a) => `${a.file}::${a.term || '*'}`));

// Windows の join() は `\` 区切りを返すため、allow（config は `/` 区切り）と
// 照合が外れ「登録済みなのに違反」になる。表示側も `\v` `\a` が制御文字として
// 解釈されパスが読めなくなる。照合・表示の両方を `/` 区切りへ正規化してから使う。
function toPosix(file) {
  return file.split('\\').join('/');
}

function isAllowed(file, term) {
  const key = toPosix(file);
  return allow.has(`${key}::${term}`) || allow.has(`${key}::*`);
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (SCAN_EXT.test(p)) out.push(p);
  }
  return out;
}

function stagedFiles() {
  try {
    const out = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACM'], {
      encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    return out
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.startsWith(SCAN_DIR + '/') && SCAN_EXT.test(s) && existsSync(s));
  } catch {
    return [];
  }
}

const files = STAGED ? stagedFiles() : walk(SCAN_DIR);

const violations = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const term of denyTerms) {
      if (line.includes(term) && !isAllowed(file, term)) {
        violations.push({ file, line: i + 1, term, text: line.trim().slice(0, 100) });
      }
    }
  });
}

if (violations.length > 0) {
  console.error(
    `[check-affiliate-prose] ✗ 廃止アフィリの推奨 prose を ${violations.length} 件検出（affiliate-career-only 違反）`,
  );
  console.error('  真実源: .claude/knowledge/reference/affiliate-operations.md / memory affiliate-career-only');
  for (const v of violations) {
    console.error(`  ${toPosix(v.file)}:${v.line}  「${v.term}」  ${v.text}`);
  }
  console.error(
    '  → 講座/添削の推奨を除去し、穴は note 模範論文・完成答案＋勉強仲間/職場の有資格者の目で埋める表現へ。',
  );
  console.error(
    `  → 正当な出典引用・試験コンテンツなら ${CONFIG} の allow に {file, term, reason} を追記。`,
  );
  process.exit(1);
}

console.log(
  `[check-affiliate-prose] ✓ ${files.length} ファイルに廃止アフィリ推奨 prose は無し（deny ${denyTerms.length} 語）`,
);
