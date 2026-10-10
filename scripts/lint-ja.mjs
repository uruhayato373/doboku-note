#!/usr/bin/env node
// 日本語校正（textlint + prh）ラチェット導入（DN-0239）。
//
// 背景: 1,267 記事の表記ゆれ（送り仮名違い等）を人手では追えない。既存の check-mdx は
// 構造（Callout・表・リンク）を見るが日本語そのものは見ていない。全件は初回ノイズが多いため、
// pre-commit / CI では staged / PR diff の MDX だけに掛ける（ci:true・--staged）。
// 全件は週次で件数を出す report（ci:false・--all）とし、辞書（prh.yml）を育てながら漸減させる。
//
// ルール定義の実体は .textlintrc.json（preset-ja-technical-writing の一部・
// preset-jtf-style の 2.1.8/2.1.9・prh.yml）。数式・コード・frontmatter は
// textlint-plugin-mdx が Str ノード以外（Code/Math/frontmatter）を対象外にするため除外済み。
//
// 使い方:
//   node scripts/lint-ja.mjs --staged   # pre-commit / CI 用（staged の content/site/**/*.mdx のみ・違反で exit 1）
//   node scripts/lint-ja.mjs --all      # 全件 report（content/site/**/*.mdx・違反があっても exit 0）
//   node scripts/lint-ja.mjs --files a.mdx b.mdx  # 指定した MDX だけ（staged と同じ判定・違反で exit 1。コミット前に作業中の記事を確かめる）

import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import { OFFICIAL_QUESTION_PAGE, officialTextRanges } from './lib/official-question-text.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

// textlint は npx でなく node で直接起動する（Windows の spawnSync は npx.cmd を解決できない）。
const TEXTLINT_BIN = createRequire(import.meta.url).resolve('textlint/bin/textlint.js');
const SCAN_DIR = join(ROOT, 'content', 'site');
const SCAN_EXT = /\.mdx$/;

const mode = process.argv.includes('--all') ? 'all' : process.argv.includes('--files') ? 'files' : 'staged';
const listedFiles = () => process.argv.slice(process.argv.indexOf('--files') + 1).filter((a) => !a.startsWith('--')).map((f) => relative(ROOT, resolve(f)).split(sep).join('/'));

function stagedMdxFiles() {
  const out = execFileSync(
    'git',
    ['-c', 'core.quotepath=false', 'diff', '--cached', '--no-renames', '--name-status', '--diff-filter=ACM'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
  );
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split('\t'))
    .filter(([, path]) => path && path.startsWith('content/site/') && SCAN_EXT.test(path))
    .map(([, path]) => path);
}

function allMdxFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...allMdxFiles(full));
    } else if (SCAN_EXT.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

const files = mode === 'staged' ? stagedMdxFiles() : mode === 'files' ? listedFiles() : allMdxFiles(SCAN_DIR);

if (files.length === 0) {
  console.log(`[lint-ja --${mode}] 対象 0 件（該当する MDX の変更なし）`);
  process.exit(0);
}

// 全件（1,280+ファイル）を1プロセスへ一括投入すると textlint 子プロセスが
// JS heap OOM で無出力のまま落ちる（実測: 2026-09-26）。無出力を「検知0件」に
// フォールバックすると偽PASSになるため（CLAUDE.md §9）、バッチ分割し、
// 各バッチの実行不成立を集計して区別する。
const BATCH_SIZE = 100;
const batches = [];
for (let i = 0; i < files.length; i += BATCH_SIZE) {
  batches.push(files.slice(i, i + BATCH_SIZE));
}

let totalErrors = 0;
let scannedFiles = 0;
let failedBatches = 0;
let officialSkipped = 0;
const violations = [];

for (const batch of batches) {
  const result = spawnSync(process.execPath, [TEXTLINT_BIN, '--format', 'json', ...batch], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });

  if (result.error || result.status === null) {
    failedBatches++;
    console.error(
      `[lint-ja --${mode}] バッチ実行不成立（${batch.length} ファイル・status=${result.status}）: ${
        result.error ? result.error.message : (result.stderr || '').slice(0, 500)
      }`,
    );
    continue;
  }

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    failedBatches++;
    console.error(
      `[lint-ja --${mode}] バッチの JSON 解析に失敗（${batch.length} ファイル・stderr: ${(result.stderr || '').slice(0, 500)}）`,
    );
    continue;
  }

  scannedFiles += batch.length;
  for (const fileReport of report) {
    if (OFFICIAL_QUESTION_PAGE.test(fileReport.filePath)) {
      const official = officialTextRanges(readFileSync(fileReport.filePath, 'utf8'));
      const kept = fileReport.messages.filter((msg) => !(official.has(msg.line) && msg.column <= official.get(msg.line)));
      officialSkipped += fileReport.messages.length - kept.length;
      fileReport.messages = kept;
    }
    if (fileReport.messages.length === 0) continue;
    totalErrors += fileReport.messages.length;
    violations.push(fileReport);
  }
}

console.log(
  `[lint-ja --${mode}] 対象 ${files.length} 件 / 実検査 ${scannedFiles} 件 / 検知 ${totalErrors} 件（${violations.length} ファイル）` +
    (officialSkipped > 0 ? ` / 公式問題の原文で除外 ${officialSkipped} 件` : '') +
    (failedBatches > 0 ? ` / 実行不成立バッチ ${failedBatches} 件` : ''),
);

for (const fileReport of violations) {
  const relPath = fileReport.filePath.replace(`${ROOT}/`, '');
  for (const msg of fileReport.messages) {
    console.log(`  ${relPath}:${msg.line}:${msg.column}  ${msg.message}  [${msg.ruleId}]`);
  }
}

if (failedBatches > 0) {
  // 実行不成立は「0件検知」と区別する（検査ゼロを PASS と呼ばない）。
  process.exit(2);
}

if ((mode === 'staged' || mode === 'files') && totalErrors > 0) {
  console.error(
    `\n[lint-ja --${mode}] ${totalErrors} 件の表記ゆれ/校正指摘があります。'npx textlint --fix <file>' で機械修正可能な項目は自動修正されます。`,
  );
  process.exit(1);
}

process.exit(0);
