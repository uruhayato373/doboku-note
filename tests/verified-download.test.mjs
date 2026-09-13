import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { downloadVerified } from '../scripts/lib/verified-download.mjs';
test('streamed download verifies bytes/hash and removes partial corrupt downloads', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'download-test-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'asset'); const bytes = Buffer.from('good');
  const entry = { bytes: 4, sha256: createHash('sha256').update(bytes).digest('hex') };
  await downloadVerified(Readable.from([bytes.subarray(0, 2), bytes.subarray(2)]), path, entry);
  assert.equal(readFileSync(path, 'utf8'), 'good'); rmSync(path);
  for (const value of ['bad!', 'too long', 'x']) {
    await assert.rejects(downloadVerified(Readable.from([Buffer.from(value)]), path, entry));
    assert.equal(existsSync(path), false);
  }
  writeFileSync(path, 'existing');
  await assert.rejects(downloadVerified(Readable.from([bytes]), path, entry));
  assert.equal(readFileSync(path, 'utf8'), 'existing');
  await assert.rejects(downloadVerified(Readable.from([Buffer.from('oversized')]), path, entry));
  assert.equal(readFileSync(path, 'utf8'), 'existing');
});
