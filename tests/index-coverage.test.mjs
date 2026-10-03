import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { datasetPath } from '../scripts/lib/datasets.mjs';
import { expandEntry, indexHistory, latestIndexAsOf, qualificationIdsIn, qualificationRatios } from '../scripts/lib/index-coverage.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const row = (url, verdict, extra = {}) => ({ url: `https://doboku-note.com${url}`, index: verdict ? { verdict, coverage_state: verdict === 'PASS' ? '送信して登録されました' : '検出 - インデックス未登録' } : undefined, ...extra });

const ROWS = [
  row('/', 'PASS'),
  row('/exam/civil-construction-1/a', 'PASS'),
  row('/exam/civil-construction-1/b', 'NEUTRAL'),
  row('/exam/civil-construction-1/c', null, { error: 'quota' }), // 検査できなかった行も検査数に数える（登録済みではない）
  row('/exam/rccm/x', 'PASS'),
  row('/practice/y', 'PASS'),
];

test('qualificationIdsIn: URL の /exam/<資格id>/ から資格 id を名前順に拾う', () => {
  assert.deepEqual(qualificationIdsIn(ROWS), ['civil-construction-1', 'rccm']);
  assert.deepEqual(qualificationIdsIn([row('/practice/a')]), []);
});

test('qualificationRatios: 資格ごとの検査数・登録数・率（verdict PASS だけが登録済み）', () => {
  const r = qualificationRatios(ROWS, ['civil-construction-1', 'rccm', 'pe-construction']);
  assert.deepEqual(r['civil-construction-1'], { inspected: 3, indexed: 1, ratio: 1 / 3 });
  assert.deepEqual(r.rccm, { inspected: 1, indexed: 1, ratio: 1 });
  assert.deepEqual(r['pe-construction'], { inspected: 0, indexed: 0, ratio: null });
});

test('expandEntry: 資格別は履歴の by_qualification だけを読み（バッチは開かない）、記録の無い資格・行は 0 件・率 null', () => {
  const entry = { date: '2026-10-01', inspected: 6, indexed: 4, indexed_ratio: 0.667, by_qualification: qualificationRatios(ROWS, qualificationIdsIn(ROWS)) };
  const e = expandEntry(entry, ['civil-construction-1', 'pe-construction']);
  assert.deepEqual(e.all, { inspected: 6, indexed: 4, ratio: 0.667 });
  assert.deepEqual(e.byQualification['civil-construction-1'], { inspected: 3, indexed: 1, ratio: 1 / 3 });
  assert.deepEqual(e.byQualification['pe-construction'], { inspected: 0, indexed: 0, ratio: null });
  // バッチが消えて数え直せない行（by_qualification が無い）
  const old = expandEntry({ date: '2026-04-27', inspected: 756, indexed: 407, indexed_ratio: 0.538, batch_file: 'inspection-batch-gone.json' }, ['civil-construction-1']);
  assert.deepEqual(old.byQualification['civil-construction-1'], { inspected: 0, indexed: 0, ratio: null });
});

test('latestIndexAsOf: 期間の末日以前で最新の検査を、履歴だけから展開する', () => {
  const root = mkdtempSync(join(tmpdir(), 'index-coverage-'));
  try {
    const file = join(root, datasetPath('gsc.index-coverage-history'));
    mkdirSync(dirname(file), { recursive: true });
    const entry = (date, indexed, by) => ({ date, run_at: `${date}T00:00:00Z`, sitemap_urls: 10, inspected: 10, indexed, indexed_ratio: indexed / 10, ...(by ? { by_qualification: by } : {}) });
    writeFileSync(file, JSON.stringify({ schema_version: '1.0', updated_at: '2026-10-01T00:00:00Z', entries: [entry('2026-09-30', 8, { rccm: { inspected: 2, indexed: 1, ratio: 0.5 } }), entry('2026-09-01', 5)] }));
    assert.deepEqual(indexHistory(root).map((e) => e.date), ['2026-09-01', '2026-09-30'], '古い順');
    const got = latestIndexAsOf(root, '2026-09-30', ['rccm']);
    assert.equal(got.date, '2026-09-30');
    assert.deepEqual(got.byQualification.rccm, { inspected: 2, indexed: 1, ratio: 0.5 });
    assert.equal(latestIndexAsOf(root, '2026-09-15', ['rccm']).byQualification.rccm.ratio, null);
    assert.equal(latestIndexAsOf(root, '2026-08-01', ['rccm']), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('append-coverage-history: 履歴の 1 行に資格別（by_qualification）を書く', () => {
  const dir = mkdtempSync(join(tmpdir(), 'append-coverage-'));
  try {
    const batch = join(dir, '2026-10-02T00-00-00.json');
    writeFileSync(batch, JSON.stringify({ version: 1, partial: false, results: ROWS.map((r) => (r.error ? { url: r.url, error: r.error } : { url: r.url, index: r.index })) }));
    const history = join(dir, 'history.json');
    execFileSync(process.execPath, [join(ROOT, '.claude/scripts/append-coverage-history.mjs'), '--batch', batch, '--date', '2026-10-02', '--sitemap-count', '6', '--history', history], { cwd: ROOT, encoding: 'utf8' });
    const [entry] = JSON.parse(readFileSync(history, 'utf8')).entries;
    assert.equal(entry.inspected, 6);
    assert.equal(entry.indexed, 4);
    assert.deepEqual(entry.by_qualification, qualificationRatios(ROWS, ['civil-construction-1', 'rccm']));
    assert.deepEqual(Object.keys(entry).slice(-3), ['by_qualification', 'batch_file', 'notes']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
