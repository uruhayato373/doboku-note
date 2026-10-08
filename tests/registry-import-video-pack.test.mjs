import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistryConfig } from '../scripts/lib/content-registry.mjs';
import { videoPackRows } from '../scripts/lib/registry-import-video-pack.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rules = loadRegistryConfig(ROOT).idRules;

test('総まとめパックを作品と通常動画の公開に変換する（状態は今の台帳から写す）', () => {
  const state = { packs: { 'matome-2kyu-chokuzen': { derivatives: { longform: { status: 'qa_passed', qa: { avg: 2.33, blocks: 0, at: '2026-10-08', by: 'qa' } } } } } };
  const { exam, work, publications } = videoPackRows(ROOT, 'content/sns/video-packs/civil-construction-2/matome-2kyu-chokuzen', { state, rules });
  assert.equal(exam, 'civil-construction-2');
  assert.deepEqual(work, { id: 'matome-2kyu-chokuzen', kind: 'video-pack', definition: 'content/sns/video-packs/civil-construction-2/matome-2kyu-chokuzen', format: 'compilation', qa: { avg: 2.33, blocks: 0, at: '2026-10-08', by: 'qa' } });
  assert.equal(publications.length, 1);
  assert.equal(publications[0].id, 'civil-construction-2/matome-2kyu-chokuzen/youtube.longform');
  assert.equal(publications[0].status, 'qa_passed');
  assert.equal(publications[0].copy, 'content/sns/video-packs/civil-construction-2/matome-2kyu-chokuzen/youtube.json#longform');
});

test('Shorts は鍵を variant にし、規則に合わない既存の鍵は idException を付ける。measured は published に写し証拠を付ける', () => {
  const state = { packs: { 'keiken-koji-ga-nai': { derivatives: {
    longform: { status: 'measured', videoId: 'v1', approvedBy: 'user', approvedAt: '2026-09-05T01:43:32.352Z', publishAt: '2026-10-19T20:00:00+09:00' },
    shorts: [{ key: 'point-taisho-1', status: 'uploaded_private', videoId: 's1', privacyStatus: 'private', approvedBy: 'user', approvedAt: '2026-09-05T01:43:32.352Z' }],
  } } } };
  const { publications } = videoPackRows(ROOT, 'content/sns/video-packs/civil-construction-2/keiken-koji-ga-nai', { state, rules });
  const longform = publications.find((p) => p.format === 'longform');
  assert.equal(longform.status, 'published');
  assert.deepEqual(longform.platform.evidence, { kind: 'legacy-ledger', ref: 'video-content-status.json' });
  assert.equal(longform.approval.grandfathered, true);
  const short = publications.find((p) => p.variant === 'point-taisho-1');
  assert.equal(short.idException, 'imported-before-cutover');
  assert.equal(short.relatedTo, longform.id);
  assert.equal(short.platform.privacy, 'private');
});
