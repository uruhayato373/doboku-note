// verify-note-magazines --contents: 収録記事の取得失敗を 0 件として扱わない（DN-0482）。
// 偽の curl（マガジン一覧は JSON・収録記事は HTML＝取得失敗）を PATH の先頭に置いて実行し、
// 「収録 0 件」と出さずに取得失敗として数え、過半なら検査不成立（exit 1）で止まることを確かめる。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('収録記事の取得失敗は 0 件にせず、過半なら検査不成立で止まる', { skip: process.platform === 'win32' }, () => {
  const bin = mkdtempSync(join(tmpdir(), 'fake-curl-'));
  try {
    writeFileSync(
      join(bin, 'curl'),
      [
        '#!/bin/sh',
        'for a in "$@"; do url="$a"; done',
        'case "$url" in',
        '  *contents?kind=magazine*) echo \'{"data":{"contents":[{"key":"mfake0000001","name":"テスト誌","price":0,"isPublished":true}],"isLastPage":true}}\' ;;',
        '  *) echo "<html>429 Too Many Requests</html>" ;;',
        'esac',
      ].join('\n'),
    );
    chmodSync(join(bin, 'curl'), 0o755);
    const r = spawnSync('node', ['scripts/verify-note-magazines.mjs', '--contents'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
      timeout: 60_000,
    });
    const out = `${r.stdout}\n${r.stderr}`;
    assert.doesNotMatch(out, /収録0件/, '取得失敗を 0 件として出している');
    assert.match(out, /取得失敗 1 誌/);
    assert.match(r.stderr, /検査不成立/);
    assert.equal(r.status, 1);
  } finally {
    rmSync(bin, { recursive: true, force: true });
  }
});
