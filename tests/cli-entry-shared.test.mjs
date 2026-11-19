// scripts/ の「直接起動されたか」の判定は scripts/lib/cli-run.mjs の isCliEntry(import.meta.url) だけを使う（2026-11-19）。
//
// 経緯: 83 本が `import.meta.url === pathToFileURL(process.argv[1]).href` などを各自で書いていた。import.meta.url は
// realpath 済みなので、シンボリックリンク越しに起動すると（macOS の /var → /private/var、リンクした checkout）一致せず、
// 検査が何も実行しないまま exit 0 で終わる＝落ちるべき検査が緑になる。isCliEntry は argv[1] も realpath で比べる。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

test('scripts/ は起動の判定を自前で書かない（isCliEntry を使う）', () => {
  const files = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', 'scripts'], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\n').filter((f) => /\.(mjs|cjs|js)$/.test(f) && f !== 'scripts/lib/cli-run.mjs');
  assert.ok(files.length > 100, `検査不成立: 対象のスクリプトが ${files.length} 本`);
  const own = [];
  for (const f of files) {
    readFileSync(join(REPO_ROOT, f), 'utf8').split('\n').forEach((line, i) => {
      if (/process\.argv\[1\]/.test(line) && /import\.meta\.url/.test(line)) own.push(`${f}:${i + 1}`);
    });
  }
  assert.deepEqual(own, [], `isCliEntry(import.meta.url)（scripts/lib/cli-run.mjs）に置き換える: ${own.slice(0, 5).join(' / ')}`);
});
