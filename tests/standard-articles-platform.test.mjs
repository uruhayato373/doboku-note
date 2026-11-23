import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_CONTENT_ROOT } from '../scripts/lib/repository-paths.mjs';

// check-standard-articles は catalog/manifest に記録された LF 基準のハッシュ・バイト数と
// 突き合わせ、見出しと GFM 表を `\n` 前提の regex で数える。autocrlf の作業ツリー
// （Windows）では実体が CRLF で展開されるため、正規化しないと中身が同一でも
// ハッシュが必ず不一致になり、見出し・表は軒並み 0 件と数えられる（＝構造的な偽赤）。
// 2026-08-31 時点で check 9/10 が全 8 文書 FAIL、check 5 が INCONCLUSIVE だった。
// Linux CI では再現しないので、この検査自体が platform 差を踏む唯一の見張りになる。

// 実リポジトリへの実行は約 8 秒かかるので、モジュール内で遅延して 1 回だけ作り、全テストで共有する。
// （別ファイルとは別プロセスなので共有できない。章 OGP 被覆の判定もここに集めて、実行を 1 回に保つ。）
let cachedReport;
function runChecker() {
  if (cachedReport) return cachedReport;
  const stdout = execFileSync(process.execPath, ['scripts/checks/check-standard-articles.mjs', '--json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  cachedReport = JSON.parse(stdout);
  return cachedReport;
}

test('check-standard-articles が作業ツリーの改行コードに依らず全 PASS する', () => {
  const report = runChecker();
  assert.ok(report.documents.length > 0, '検査できた文書が 0 件（検査不成立）');

  const failures = [];
  for (const doc of report.documents) {
    for (const check of doc.checks) {
      if (check.status !== 'PASS') {
        failures.push(`${doc.target} check${check.id}=${check.status}: ${JSON.stringify(check.violations?.slice(0, 2))}`);
      }
    }
  }
  assert.deepEqual(failures, [], failures.join('\n'));
  assert.equal(report.exitCode, 0, `exitCode が 0 でない（${report.exitCode}）`);
});

test('どの検査も実検査 0 件で PASS していない', () => {
  const report = runChecker();
  const totals = new Map();
  for (const doc of report.documents) {
    for (const check of doc.checks) {
      totals.set(check.id, (totals.get(check.id) ?? 0) + (check.checked ?? 0));
    }
  }
  assert.ok(totals.size > 0, '検査が 1 つも結果を返していない');

  const empty = [...totals.entries()].filter(([, count]) => count === 0).map(([id]) => id);
  assert.deepEqual(empty, [], `実検査 0 件の検査がある（「異常0件」と区別が付かない）: ${empty.join(', ')}`);
});

// 章 OGP 被覆検査（15 番目）。standards-ogp-guards から移した（実リポジトリでの checker 実行を 1 回にするため）。
function chapterCountsByTarget() {
  const root = join(SITE_CONTENT_ROOT, 'standards-articles');
  const counts = new Map();
  if (!existsSync(root)) return counts;
  for (const agency of readdirSync(root, { withFileTypes: true })) {
    if (!agency.isDirectory()) continue;
    for (const documentId of readdirSync(join(root, agency.name))) {
      const manifestPath = join(root, agency.name, documentId, 'manifest.json');
      if (!existsSync(manifestPath)) continue;
      counts.set(`${agency.name}/${documentId}`, JSON.parse(readFileSync(manifestPath, 'utf8')).chapters.length);
    }
  }
  return counts;
}

test('章 OGP 被覆検査（15番目）が全文書で PASS し、検査件数が章数と一致する', () => {
  const report = runChecker();
  assert.ok(report.documents.length > 0, '検査できた文書が 0 件（検査不成立）');
  const expectedCounts = chapterCountsByTarget();

  for (const doc of report.documents) {
    const check = doc.checks.find((c) => c.id === 15);
    assert.ok(check, `${doc.target}: 15 番目の検査（章ごとの OGP）が結果に無い`);
    assert.equal(
      check.status,
      'PASS',
      `${doc.target}: 章 OGP 被覆が PASS でない（${check.status}）。違反: ${JSON.stringify(check.violations)}`,
    );
    const expected = expectedCounts.get(doc.target);
    assert.equal(check.checked, expected, `${doc.target}: 検査 ${check.checked} 章 ≠ manifest の ${expected} 章`);
  }
});
