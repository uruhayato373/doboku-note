import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditGscRun } from '../scripts/check-gsc-ui-run.mjs';
import { exitCodeOf } from '../scripts/lib/run-audit.mjs';

const sha = (s) => createHash('sha256').update(s).digest('hex');

function makeRoot(runs) {
  const root = mkdtempSync(join(tmpdir(), 'gsc-run-'));
  for (const run of runs) {
    const dir = join(root, 'data', 'gsc', 'ui', run.id);
    mkdirSync(join(dir, 'normalized'), { recursive: true });
    const units = [];
    for (const u of run.units) {
      const key = `${u.issueKey}--allKnownPages`;
      const csv = u.csv ?? 'URL\nhttps://doboku-note.com/a\n';
      writeFileSync(join(dir, `${key}.csv`), csv);
      units.push({ issueKey: u.issueKey, scope: 'allKnownPages', status: u.status ?? 'downloaded', uiTotal: u.uiTotal ?? u.rows, csvRows: u.rows, truncated: u.truncated ?? false, rawFile: `${key}.csv`, sha256: u.sha ?? sha(csv) });
      writeFileSync(join(dir, 'normalized', `${key}.json`), JSON.stringify({
        schemaVersion: 1, exportedRows: u.exported ?? u.rows, uiTotal: u.uiTotal ?? u.rows, truncated: u.truncated ?? false,
        rows: Array.from({ length: u.exported ?? u.rows }, (_, i) => ({ url: `https://doboku-note.com/${i}`, comparisonKey: `/${i}`, raw: { URL: 'x' }, duplicateCount: 1 })),
        rejects: u.rejects ?? [],
      }));
    }
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ schemaVersion: 1, runId: run.id, status: 'ok', units }));
  }
  return root;
}

test('正常な run は FAIL 0・実検査数が出て exit 0', () => {
  const root = makeRoot([{ id: '2026-11-01T00-00-00Z', units: [{ issueKey: 'noindex', rows: 5 }, { issueKey: 'redirect', rows: 3 }] }]);
  const r = auditGscRun({ root });
  assert.equal(r.checked, 2);
  assert.deepEqual(r.fail, []);
  assert.equal(exitCodeOf(r), 0);
  rmSync(root, { recursive: true });
});

test('sha256 不一致・行数の不一致・上限で説明できない欠けは FAIL（exit 1）', () => {
  const root = makeRoot([{ id: '2026-11-01T00-00-00Z', units: [
    { issueKey: 'a', rows: 5, sha: 'deadbeef' },
    { issueKey: 'b', rows: 5, exported: 4 },
    { issueKey: 'c', rows: 5, uiTotal: 50 },
  ] }]);
  const r = auditGscRun({ root });
  assert.ok(r.fail.some((m) => m.includes('sha256')));
  assert.ok(r.fail.some((m) => m.includes('不一致') && m.startsWith('b--')));
  assert.ok(r.fail.some((m) => m.includes('取得失敗') && m.startsWith('c--')));
  assert.equal(exitCodeOf(r), 1);
  rmSync(root, { recursive: true });
});

test('前回 run から半分超の急減は WARN・rejects が 5% 超でも WARN', () => {
  const root = makeRoot([
    { id: '2026-10-01T00-00-00Z', units: [{ issueKey: 'a', rows: 100 }] },
    { id: '2026-11-01T00-00-00Z', units: [{ issueKey: 'a', rows: 10, rejects: [{}, {}] }] },
  ]);
  const r = auditGscRun({ root });
  assert.ok(r.warn.some((m) => m.includes('急減')));
  assert.ok(r.warn.some((m) => m.includes('reject 比率')));
  assert.equal(exitCodeOf(r), 0);
  rmSync(root, { recursive: true });
});

test('run が無い（対象 0 件）は検査不成立 exit 2', () => {
  const root = mkdtempSync(join(tmpdir(), 'gsc-run-'));
  const r = auditGscRun({ root });
  assert.equal(r.checked, 0);
  assert.equal(exitCodeOf(r), 2);
  rmSync(root, { recursive: true });
});
