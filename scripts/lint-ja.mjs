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

import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const SCAN_DIR = join(ROOT, 'content', 'site');
const SCAN_EXT = /\.mdx$/;

const mode = process.argv.includes('--all') ? 'all' : 'staged';

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

const files = mode === 'staged' ? stagedMdxFiles() : allMdxFiles(SCAN_DIR);

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
const violations = [];

for (const batch of batches) {
  const result = spawnSync('npx', ['textlint', '--format', 'json', ...batch], {
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
    if (fileReport.messages.length === 0) continue;
    totalErrors += fileReport.messages.length;
    violations.push(fileReport);
  }
}

console.log(
  `[lint-ja --${mode}] 対象 ${files.length} 件 / 実検査 ${scannedFiles} 件 / 検知 ${totalErrors} 件（${violations.length} ファイル）` +
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

if (mode === 'staged' && totalErrors > 0) {
  console.error(
    `\n[lint-ja --staged] ${totalErrors} 件の表記ゆれ/校正指摘があります。'npx textlint --fix <file>' で機械修正可能な項目は自動修正されます。`,
  );
  process.exit(1);
}

process.exit(0);
