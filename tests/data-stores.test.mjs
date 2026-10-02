import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { seriesKey, groupStores, deadStoreKeys, storeDomainIds, inferShape } from '../scripts/lib/data-stores.mjs';

const cfg = {
  domains: [{ id: 'strategy', label: '戦略' }, { id: 'site', label: 'サイト' }, { id: 'ops', label: '管理' }],
  documents: { 'data/metrics/': 'site', 'data/metrics/business/': 'strategy', 'config/domains.json': 'ops', 'data/gone/': 'site' },
};

test('seriesKey: 日付・時刻・UUID・ハッシュ・版番号だけ違うファイルは同じ系列', () => {
  assert.equal(seriesKey('data/metrics/psi/psi-batch-2026-10-01T21-36-01.json'), 'data/metrics/psi/psi-batch-*.json');
  assert.equal(
    seriesKey('data/metrics/business/measurement-2026-09-13T02-19-08-867Z-0b3048b5-56ce-4bb9-8bb9-38866952d7b5.json'),
    'data/metrics/business/measurement-*.json',
  );
  assert.equal(seriesKey('data/metrics/business/checks-monthly-2026-08-2026-10-01T06-52-13-780Z.json'), 'data/metrics/business/checks-monthly-*.json');
  assert.equal(seriesKey('data/metrics/business/site-to-sales-2026-08-r2.json'), 'data/metrics/business/site-to-sales-*.json');
  assert.equal(seriesKey('data/weekly-metrics/2026-W40.json'), 'data/weekly-metrics/*.json');
  assert.equal(seriesKey('data/metrics/gsc/rank-watch/run-2026-09-13T01-12-59-276Z-402dcd83.json'), 'data/metrics/gsc/rank-watch/run-*.json');
  assert.equal(seriesKey('config/qualification-registry.json'), 'config/qualification-registry.json');
});

test('groupStores: 長い一致の領域を付け、決まらないファイルを返す', () => {
  const { series, unassigned } = groupStores(cfg, [
    'data/metrics/psi/psi-batch-2026-10-01T21-36-01.json',
    'data/metrics/psi/psi-batch-2026-09-30T21-12-48.json',
    'data/metrics/business/target-2026-09-27T06-42-21-089Z-1228b2ef-128a-4c0f-9a9a-d3aa97d6b221.json',
    'data/other/x.json',
  ]);
  const psi = series.find((s) => s.key === 'data/metrics/psi/psi-batch-*.json');
  assert.equal(psi.domain, 'site');
  assert.equal(psi.files[0], 'data/metrics/psi/psi-batch-2026-10-01T21-36-01.json', '新しい順');
  assert.equal(series.find((s) => s.key.includes('target')).domain, 'strategy');
  assert.deepEqual(unassigned, ['data/other/x.json']);
});

test('deadStoreKeys / storeDomainIds: 当たらないキーと、割り当てのある領域', () => {
  assert.deepEqual(deadStoreKeys(cfg, ['data/metrics/a.json', 'config/domains.json', 'data/metrics/business/b.json']), ['data/gone/']);
  assert.deepEqual(storeDomainIds(cfg, 'data'), ['strategy', 'site']);
  assert.deepEqual(storeDomainIds(cfg, 'config'), ['ops']);
});

test('inferShape: 対応表・配列の要素・無いことがある項目を書く', () => {
  const dir = mkdtempSync(join(tmpdir(), 'stores-'));
  try {
    writeFileSync(join(dir, 'a.json'), JSON.stringify({
      _doc: '説明',
      items: [{ id: 'a', n: 1 }, { id: 'b', n: 2, opt: true }],
      byId: { 'x-1': { label: 'X' }, 'y-2': { label: 'Y' } },
    }));
    const s = inferShape(dir, 'a.json');
    assert.equal(s.doc, '説明');
    const row = (p) => s.rows.find((r) => r.path === p)?.type;
    assert.equal(row('items'), 'array（2 件）');
    assert.equal(row('items[].n'), 'number');
    assert.equal(row('items[].opt?'), 'boolean');
    assert.equal(row('byId'), '対応表（2 件）');
    assert.equal(row('byId.{id}.label'), 'string');

    writeFileSync(join(dir, 'b.csv'), 'a,b,c\n1,2,3\n');
    assert.equal(inferShape(dir, 'b.csv').summary, '1 行 × 3 列');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
