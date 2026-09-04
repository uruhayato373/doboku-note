#!/usr/bin/env node
/**
 * 施工経験記述の現行2区画を全販売・発信チャネルで検査する。
 * exit 0=違反なし / 1=A〜E違反 / 2=必須範囲を走査できず検査不成立
 */
import process from 'node:process';
import { analyzeDocuments, collectDocuments, loadLimits } from './lib/keiken-answer-split.mjs';

const TAG = '[check-keiken-answer-split]';
const ROOT = process.cwd();
const AS_JSON = process.argv.includes('--json');
const STRICT_ASSETS = process.argv.includes('--strict-assets');

let collected;
try {
  collected = collectDocuments(ROOT);
} catch (error) {
  console.error(`${TAG} ✗ ZIP/ファイルの読み込みに失敗: ${error.message}`);
  process.exit(2);
}

const missing = collected.scopes.filter((s) => !s.exists || s.documents === 0);
const blockingMissing = missing.filter((s) => !s.optionalHydrated || STRICT_ASSETS);
const results = analyzeDocuments(collected.documents, loadLimits(ROOT));
const violations = results.flatMap((r) => r.violations);
const claims = results.reduce((sum, r) => sum + r.claims, 0);
const measurements = results.reduce((sum, r) => sum + r.measurements, 0);

const report = {
  scopes: collected.scopes,
  files: results.length,
  claims,
  measurements,
  missing: missing.map((s) => s.label),
  violations,
};

if (AS_JSON) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} else {
  for (const scope of collected.scopes) {
    const mark = scope.exists && scope.documents > 0 ? '✓' : scope.optionalHydrated ? '!' : '✗';
    console.log(`${TAG} ${mark} ${scope.label}: ${scope.documents} ファイル${scope.kind === 'zip-glob' ? '（ZIP内）' : ''}を走査`);
  }
  if (missing.some((s) => s.optionalHydrated)) {
    console.log(`${TAG} ! 退避ソースが無い範囲は未検査。完全監査は npm run check-keiken-answer-split -- --strict-assets`);
  }
  console.log(`${TAG} 実検査 ${results.length} ファイル / 割り振り表現 ${claims} 件 / 字数・行数表現 ${measurements} 件`);
}

if (blockingMissing.length) {
  console.error(`${TAG} ✗ 検査不成立: ${blockingMissing.map((s) => s.label).join(' / ')} を走査できない`);
  process.exit(2);
}
if (claims === 0) {
  console.error(`${TAG} ✗ 検査不成立: 割り振り表現を1件も抽出できない`);
  process.exit(2);
}
if (violations.length) {
  if (!AS_JSON) {
    console.error(`${TAG} ✗ A〜E の違反 ${violations.length} 件`);
    for (const v of violations.slice(0, 80)) {
      console.error(`  ${v.file}:${v.line} [${v.type}] [${v.grade}${v.slot ? ` (${v.slot})` : ''}] 「${v.quote}」`);
      console.error(`    → ${v.why}`);
    }
    if (violations.length > 80) console.error(`  …ほか ${violations.length - 80} 件`);
  }
  process.exit(1);
}

if (!AS_JSON) console.log(`${TAG} ✓ A〜E の誤りなし`);
