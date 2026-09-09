import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareConnectorEntries } from '../scripts/drive-connector-register.mjs';
const sha256 = 'a'.repeat(64);
const sample = () => ({ group: 'youtube-approved-cover', folder: { id: 'folder', vaultPath: '制作物/動画レンダー/採用カバー/youtube-covers-test' }, files: [{ repoPath: '.tmp/video-render/youtube-covers-test/all-001.png', id: 'file1', parentId: 'folder', name: 'all-001.png', verification: 'remote-bytes-sha256', verifiedAt: '2026-09-09T00:00:00Z', bytes: 123, sha256 }] });
const options = { hashes: async () => ({ sha256, bytes: 123, md5: 'b'.repeat(32) }) };
test('connector readback registers a mount-compatible entry with Drive id', async () => {
 const entries = await prepareConnectorEntries(sample(), options);
 assert.equal(Object.values(entries)[0].driveFileId, 'file1');
 assert.equal(Object.values(entries)[0].vaultPath, sample().folder.vaultPath + '/all-001.png');
});
test('rejects missing readback, wrong content, wrong parent, duplicate and traversal', async () => {
 for (const change of [r => { r.files=[]; }, r => { r.files[0].verification='size-only'; }, r => { r.files[0].sha256='c'.repeat(64); }, r => { r.files[0].parentId='wrong'; }, r => { r.files.push({...r.files[0]}); }, r => { r.files[0].repoPath='../secret.png'; }]) {
  const r=sample();change(r);await assert.rejects(prepareConnectorEntries(r, options));
 }
});
