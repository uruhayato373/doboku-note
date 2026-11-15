import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sha256Hex, sha256File } from '../scripts/lib/sha256.mjs';

const ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

test('sha256Hex は文字列・Buffer のどちらでも既知のダイジェストを返す', () => {
  assert.equal(sha256Hex('abc'), ABC);
  assert.equal(sha256Hex(Buffer.from('abc')), ABC);
  assert.equal(sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});

test('sha256File はファイルの中身のダイジェストを返す', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sha256-'));
  try {
    const f = join(dir, 'a.txt');
    writeFileSync(f, 'abc');
    assert.equal(sha256File(f), ABC);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
