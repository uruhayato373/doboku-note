import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveWindow, pickByLabelSnapshot } from '../.claude/scripts/lib/ga4-snapshot.mjs';
import { latestReportRef, writeReport } from '../scripts/lib/metric-reports.mjs';

/**
 * GA4 スナップショットの窓契約（DN-0062）。
 *
 * 固定したい事故は 1 つ。**月次窓を取っても、週次 cron が後から 28 日窓を吐いた瞬間に
 * 黙って負ける**こと。ファイル名が取得時刻順で、辞書順の最後を無条件に選んでいたため、
 * EPC の分母だけが月境界から外れていた。選択は windowKind で行う。
 */

/** 一時リポジトリに by-label のレポートを書く（[取得時刻, meta] の組）。戻り値はルート */
function snapshotRoot(entries) {
  const root = mkdtempSync(join(tmpdir(), 'ga4-snap-'));
  for (const [stamp, meta] of entries) writeReport(root, 'ga4.cta-clicks-by-label', { meta, rows: [] }, { stamp });
  return root;
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
  const root = snapshotRoot([
    ['2026-08-01T00-00-00', { windowKind: 'month' }],
    ['2026-08-28T21-00-00', { windowKind: 'days' }],
  ]);
  assert.equal(pickByLabelSnapshot(root), 'data/ga4/reports/2026-08-01.json#cta-clicks-by-label:month');
});

test('pickByLabelSnapshot: windowKind 未設定の既存レポートは days 扱い', () => {
  const root = snapshotRoot([
    ['2026-08-13T21-36-59', { startDate: '2026-07-16' }],
    ['2026-08-20T21-00-00', { windowKind: 'month' }],
  ]);
  assert.equal(pickByLabelSnapshot(root), 'data/ga4/reports/2026-08-21.json#cta-clicks-by-label:month');
});

test('pickByLabelSnapshot: 月次が複数あれば最新の月次を選ぶ', () => {
  const root = snapshotRoot([
    ['2026-07-01T00-00-00', { windowKind: 'month' }],
    ['2026-08-01T00-00-00', { windowKind: 'month' }],
  ]);
  assert.equal(pickByLabelSnapshot(root), 'data/ga4/reports/2026-08-01.json#cta-clicks-by-label:month');
});

test('pickByLabelSnapshot: 月次が無ければ従来どおり最新を返す', () => {
  const root = snapshotRoot([
    ['2026-08-13T21-36-59', { windowKind: 'days' }],
    ['2026-08-20T21-00-00', { windowKind: 'days' }],
  ]);
  assert.equal(pickByLabelSnapshot(root), 'data/ga4/reports/2026-08-21.json#cta-clicks-by-label');
});

test('pickByLabelSnapshot: 同じ日の 28 日窓と月次窓は別の枠に入り、月次を選ぶ', () => {
  const root = snapshotRoot([
    ['2026-08-28T21-00-00', { windowKind: 'days' }],
    ['2026-08-28T21-05-00', { windowKind: 'month' }],
  ]);
  assert.equal(pickByLabelSnapshot(root), 'data/ga4/reports/2026-08-29.json#cta-clicks-by-label:month');
});

test('pickByLabelSnapshot: 壊れた日のファイルがあっても選択は続行する', () => {
  const root = snapshotRoot([['2026-08-02T00-00-00', { windowKind: 'month' }]]);
  mkdirSync(join(root, 'data/ga4/reports'), { recursive: true });
  writeFileSync(join(root, 'data/ga4/reports/2026-08-05.json'), '{ 壊れ');
  assert.equal(pickByLabelSnapshot(root), 'data/ga4/reports/2026-08-02.json#cta-clicks-by-label:month');
});

test('pickByLabelSnapshot: 候補が無ければ null（空を成功と呼ばない）', () => {
  assert.equal(pickByLabelSnapshot(mkdtempSync(join(tmpdir(), 'ga4-snap-'))), null);
  assert.equal(pickByLabelSnapshot(join(tmpdir(), 'ga4-snap-does-not-exist')), null);
});

test('latestReportRef: windowKind を指定すると、後から書かれた暦月の枠ではなく 28 日窓を返す（配置別と並べる読み手・2026-10-07）', () => {
  const root = snapshotRoot([
    ['2026-10-02T00-21-30', { windowKind: 'days' }],
    ['2026-10-02T00-21-36', { windowKind: 'month' }],
  ]);
  assert.equal(latestReportRef(root, 'ga4.cta-clicks-by-label'), 'data/ga4/reports/2026-10-02.json#cta-clicks-by-label:month', '指定しなければ従来どおり最新（暦月）');
  assert.equal(latestReportRef(root, 'ga4.cta-clicks-by-label', { windowKind: 'days' }), 'data/ga4/reports/2026-10-02.json#cta-clicks-by-label');
  assert.equal(latestReportRef(root, 'ga4.cta-clicks-by-label', { windowKind: 'month' }), 'data/ga4/reports/2026-10-02.json#cta-clicks-by-label:month');
});

test('latestReportRef: windowKind 未設定の既存レポートは days として選ばれる', () => {
  const root = snapshotRoot([['2026-09-27T11-52-30', {}]]);
  assert.equal(latestReportRef(root, 'ga4.cta-clicks-by-label', { windowKind: 'days' }), 'data/ga4/reports/2026-09-27.json#cta-clicks-by-label');
  assert.equal(latestReportRef(root, 'ga4.cta-clicks-by-label', { windowKind: 'month' }), null);
});
