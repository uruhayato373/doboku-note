import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * コードの先頭に BOM を置かない。BOM の直後にシバン行（#!）があると node が構文エラーで起動できない
 * （2026-08-22 から yt-shorts-create.mjs など 5 本が実行できなかった。ESLint は BOM を読み飛ばすので no-undef の検査では気づけない）。
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('追跡中のコードファイルは先頭に BOM を持たない', () => {
  const files = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '-z', '--', '*.mjs', '*.js', '*.cjs', '*.mts', '*.ts', '*.tsx'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0')
    .filter(Boolean);
  assert.ok(files.length > 100, `走査したコードが少なすぎる（${files.length}）`);
  const withBom = files.filter((f) => readFileSync(join(ROOT, f)).subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])));
  assert.deepEqual(withBom, []);
});
