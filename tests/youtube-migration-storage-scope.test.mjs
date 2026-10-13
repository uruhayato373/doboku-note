import assert from 'node:assert/strict';
import test from 'node:test';
import { migrationReceiptPrefix } from '../scripts/lib/youtube-migration-storage.mjs';
import { assertPlan, MIGRATION } from '../scripts/lib/youtube-migration.mjs';
const prefix = `youtube-migration/${MIGRATION}/`;
test('新版の記録は旧移行の記録を上書きせず、既存計画の置き場は維持する', () => {
  assert.equal(migrationReceiptPrefix(prefix), `${prefix}receipts/`);
  assert.equal(migrationReceiptPrefix(prefix, 'pop-soil-v1'), `${prefix}revisions/pop-soil-v1/receipts/`);
  assert.notEqual(migrationReceiptPrefix(prefix, 'pop-soil-v1'), migrationReceiptPrefix(prefix, 'pop-soil-v2'));
});
test('計画と保存先の両方で履歴scopeのパス逸脱を拒否する', () => {
  const plan = { schemaVersion: 1, migration: MIGRATION, channel: { id: 'UCHRnXPqoc0Hls8nXiK_ZYqA', title: 'doboku-note' }, entries: [{ oldVideo: { id: 'hJYV_U0qKvA', snippet: { channelId: 'UCHRnXPqoc0Hls8nXiK_ZYqA' } } }] };
  assert.doesNotThrow(() => assertPlan(plan));
  assert.doesNotThrow(() => assertPlan({ ...plan, receiptScope: 'pop-soil-v1' }));
  for (const receiptScope of ['', '../old', 'A-b', 'a'.repeat(81)]) {
    assert.throws(() => migrationReceiptPrefix(prefix, receiptScope), /scope/);
    assert.throws(() => assertPlan({ ...plan, receiptScope }), /scope/);
  }
});
