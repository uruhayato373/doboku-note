import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { readDataset } from '../scripts/lib/dataset-io.mjs';
import { buildChannelView } from '../scripts/lib/channel-economics.mjs';
import { loadMonthReceipts } from '../scripts/lib/net-receipts-ledger.mjs';

const view = buildChannelView(REPO_ROOT, { today: '2026-10-31' });

test('channel-economics: 月別の受取は net-receipts と同じ値（二重の実装にしない）', () => {
  for (const m of view.monthly) {
    const r = loadMonthReceipts(REPO_ROOT, m.month);
    assert.equal(m.total, r.total, m.month);
  }
});

test('channel-economics: KPI は正本の全件を、正本の順で返す', () => {
  const ids = readDataset(REPO_ROOT, 'config.channel-strategy').kpis.map((k) => k.id);
  assert.deepEqual(view.kpis.map((k) => k.id), ids);
});

test('channel-economics: note の 1 件の手取りは確定月の実績の割合で、販売額を超えない', () => {
  assert.ok(view.noteKeepActual > 0.5 && view.noteKeepActual < 1);
  for (const u of view.unit) assert.ok(u.netPerSale <= u.avgPrice, u.item);
});
