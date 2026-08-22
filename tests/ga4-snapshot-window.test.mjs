import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { resolveWindow, pickByLabelSnapshot } from '../.claude/scripts/lib/ga4-snapshot.mjs';

/**
 * GA4 スナップショットの窓契約（DN-0062）。
 *
 * 固定したい事故は 1 つ。**月次窓を取っても、週次 cron が後から 28 日窓を吐いた瞬間に
 * 黙って負ける**こと。ファイル名が取得時刻順で、辞書順の最後を無条件に選んでいたため、
 * EPC の分母だけが月境界から外れていた。選択は windowKind で行う。
 */

function snapshotDir(files) {
  const dir = mkdtempSync(join(tmpdir(), 'ga4-snap-'));
  for (const [name, meta] of files) {
    writeFileSync(join(dir, name), JSON.stringify({ meta, rows: [] }));
  }
  return dir;
}

test('resolveWindow: --month は月初〜月末に展開する', () => {
  assert.deepEqual(resolveWindow({ month: '2026-08' }), {
    startDate: '2026-08-01', endDate: '2026-08-31', windowKind: 'month',
  });
});

test('resolveWindow: 月末日は月ごとに正しい（閏年を含む）', () => {
  assert.equal(resolveWindow({ month: '2026-02' }).endDate, '2026-02-28');
  assert.equal(resolveWindow({ month: '2024-02' }).endDate, '2024-02-29');
  assert.equal(resolveWindow({ month: '2026-04' }).endDate, '2026-04-30');
});

test('resolveWindow: --start/--end は explicit として通す', () => {
  assert.deepEqual(resolveWindow({ startDate: '2026-08-01', endDate: '2026-08-15' }), {
    startDate: '2026-08-01', endDate: '2026-08-15', windowKind: 'explicit',
  });
});

test('resolveWindow: 既定は days 窓（前日を終端とする）', () => {
  const r = resolveWindow({ days: 28 });
  assert.equal(r.windowKind, 'days');
  const span = (Date.parse(r.endDate) - Date.parse(r.startDate)) / 86400000;
  assert.equal(span, 27, '28 日窓は端点込みで 28 日ぶん');
});

test('resolveWindow: 不正な指定は黙って既定へ落とさず落とす', () => {
  assert.throws(() => resolveWindow({ month: '2026-8' }), /YYYY-MM/);
  assert.throws(() => resolveWindow({ month: '2026-13' }), /範囲外/);
  assert.throws(() => resolveWindow({ startDate: '2026-08-01' }), /両方/);
});

test('pickByLabelSnapshot: 月次窓は、より新しい 28 日窓に負けない', () => {
  const dir = snapshotDir([
    ['ga4-cta-clicks-by-label-2026-08-01T00-00-00.json', { windowKind: 'month' }],
    ['ga4-cta-clicks-by-label-2026-08-28T21-00-00.json', { windowKind: 'days' }],
  ]);
  assert.equal(basename(pickByLabelSnapshot(dir)), 'ga4-cta-clicks-by-label-2026-08-01T00-00-00.json');
});

test('pickByLabelSnapshot: windowKind 未設定の既存ファイルは days 扱い', () => {
  const dir = snapshotDir([
    ['ga4-cta-clicks-by-label-2026-08-13T21-36-59.json', { startDate: '2026-07-16' }],
    ['ga4-cta-clicks-by-label-2026-08-20T21-00-00.json', { windowKind: 'month' }],
  ]);
  assert.equal(basename(pickByLabelSnapshot(dir)), 'ga4-cta-clicks-by-label-2026-08-20T21-00-00.json');
});

test('pickByLabelSnapshot: 月次が複数あれば最新の月次を選ぶ', () => {
  const dir = snapshotDir([
    ['ga4-cta-clicks-by-label-2026-07-01T00-00-00.json', { windowKind: 'month' }],
    ['ga4-cta-clicks-by-label-2026-08-01T00-00-00.json', { windowKind: 'month' }],
  ]);
  assert.equal(basename(pickByLabelSnapshot(dir)), 'ga4-cta-clicks-by-label-2026-08-01T00-00-00.json');
});

test('pickByLabelSnapshot: 月次が無ければ従来どおり最新を返す', () => {
  const dir = snapshotDir([
    ['ga4-cta-clicks-by-label-2026-08-13T21-36-59.json', { windowKind: 'days' }],
    ['ga4-cta-clicks-by-label-2026-08-20T21-00-00.json', { windowKind: 'days' }],
  ]);
  assert.equal(basename(pickByLabelSnapshot(dir)), 'ga4-cta-clicks-by-label-2026-08-20T21-00-00.json');
});

test('pickByLabelSnapshot: 壊れた JSON があっても選択は続行する', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ga4-snap-'));
  writeFileSync(join(dir, 'ga4-cta-clicks-by-label-2026-08-01T00-00-00.json'), '{ 壊れ');
  writeFileSync(join(dir, 'ga4-cta-clicks-by-label-2026-08-02T00-00-00.json'), JSON.stringify({ meta: { windowKind: 'month' }, rows: [] }));
  assert.equal(basename(pickByLabelSnapshot(dir)), 'ga4-cta-clicks-by-label-2026-08-02T00-00-00.json');
});

test('pickByLabelSnapshot: 候補が無ければ null（空を成功と呼ばない）', () => {
  assert.equal(pickByLabelSnapshot(mkdtempSync(join(tmpdir(), 'ga4-snap-'))), null);
  assert.equal(pickByLabelSnapshot(join(tmpdir(), 'ga4-snap-does-not-exist')), null);
});
