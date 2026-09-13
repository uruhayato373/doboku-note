import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { approvedCoverTransfers, verifyCoverBytes } from '../scripts/stage-youtube-covers.mjs';
import { coverInputDigest } from '../scripts/lib/youtube-approved-cover.mjs';

const bytes = Buffer.from('approved pixels');
const sha256 = createHash('sha256').update(bytes).digest('hex');
const spec = { headline: ['工事概要', '７項目'], format: 'longform' };
spec.approvedImage = { path: '.tmp/video-render/covers/one.png', sha256, specSha256: coverInputDigest(spec) };

test('private staging is content-addressed and duplicate paths are transferred once', () => {
  const rows = approvedCoverTransfers([{ spec }, { spec }]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].key, `youtube-thumbnail-staging/${sha256}.png`);
  assert.equal(verifyCoverBytes(bytes, sha256), bytes);
});
test('missing inputs, path traversal, edited specifications and altered bytes fail closed', () => {
  assert.throws(() => approvedCoverTransfers([]));
  for (const changed of [
    { ...spec, approvedImage: undefined },
    { ...spec, headline: ['変更'] },
    { ...spec, approvedImage: { ...spec.approvedImage, path: '../../secret.png' } },
    { ...spec, approvedImage: { ...spec.approvedImage, sha256: 'wrong' } },
  ]) assert.throws(() => approvedCoverTransfers([{ spec: changed }]));
  assert.throws(() => verifyCoverBytes(Buffer.from('changed'), sha256));
});
