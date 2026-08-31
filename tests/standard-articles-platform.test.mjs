import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// check-standard-articles は catalog/manifest に記録された LF 基準のハッシュ・バイト数と
// 突き合わせ、見出しと GFM 表を `\n` 前提の regex で数える。autocrlf の作業ツリー
// （Windows）では実体が CRLF で展開されるため、正規化しないと中身が同一でも
// ハッシュが必ず不一致になり、見出し・表は軒並み 0 件と数えられる（＝構造的な偽赤）。
// 2026-08-31 時点で check 9/10 が全 8 文書 FAIL、check 5 が INCONCLUSIVE だった。
// Linux CI では再現しないので、この検査自体が platform 差を踏む唯一の見張りになる。

function runChecker() {
  const stdout = execFileSync(process.execPath, ['scripts/check-standard-articles.mjs', '--json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(stdout);
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
