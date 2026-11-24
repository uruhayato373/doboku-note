// 正規表現の「バックスラッシュ＋c＋英字」の書き損じを止める（DN-1181）。
// /\content\/site/ と書くと \c＋o が制御文字（U+000F）として読まれ、実在のパスに一致しない。
// commit 時の --staged の検査が 0 件で OK を出し続けた事故（check-table-references・check-orphan-figures）と、
// build-gallery-comment.mjs で資格とスラグが取れていなかった 2 か所がこれだった。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const files = execFileSync('git', ['ls-files', '-z', '--', 'scripts', '.claude', 'src', 'tests', 'tools'], { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split('\0')
  .filter((f) => /\.(mjs|js|cjs|mts|ts|tsx)$/.test(f))
  .filter((f) => f !== 'tests/regex-control-escape.test.mjs'); // 下の規則の例文を持つこのファイル自身は除く

// 直前がバックスラッシュでない \c＋英字（"\\c" は文字列の中の普通のバックスラッシュなので除く）
const CONTROL_ESCAPE = /(?<!\\)\\c[A-Za-z]/;

test(`正規表現・文字列に \\c＋英字の書き損じが無い（${files.length} ファイルを検査）`, () => {
  assert.ok(files.length > 100, `検査したファイルが ${files.length} 件しか無い（走査の不成立）`);
  const hits = [];
  for (const f of files) {
    const lines = readFileSync(resolve(repo, f), 'utf8').split('\n');
    lines.forEach((line, i) => {
      const t = line.trimStart();
      if (t.startsWith('//') || t.startsWith('*')) return; // コメントの中の説明は対象外
      if (CONTROL_ESCAPE.test(line)) hits.push(`${f}:${i + 1}: ${t.slice(0, 120)}`);
    });
  }
  assert.deepEqual(hits, [], '\\c＋英字は制御文字のエスケープになる。パスの先頭なら \\ を外す');
});

test('検出の規則そのもの: 書き損じは拾い、二重のバックスラッシュは拾わない', () => {
  assert.ok(CONTROL_ESCAPE.test(String.raw`path.match(/\content\/site/)`));
  assert.ok(!CONTROL_ESCAPE.test(String.raw`'C:\\code\\x'`));
  assert.ok(!CONTROL_ESCAPE.test(String.raw`path.match(/content\/site/)`));
});
