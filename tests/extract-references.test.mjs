import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

/**
 * 参考資料の行の解析（src/lib/extract-references.ts）。
 * 行頭以外にリンクがある行を平文にして `[題](URL)` が画面に出ていた（2026-10-28・23 記事 53 行）。
 */

function references(md) {
  const cli = join(ROOT, 'node_modules/tsx/dist/cli.mjs');
  const out = execFileSync(process.execPath, [cli, '-e', `
    import { extractReferencesSection } from './src/lib/extract-references.ts';
    process.stdout.write(JSON.stringify(extractReferencesSection(${JSON.stringify(md)}).references));
  `], { cwd: ROOT, encoding: 'utf8' });
  return JSON.parse(out);
}

test('行頭のリンク 1 本は行全体のリンクのまま・太字の ** は外す', () => {
  const [a, b] = references('## 参考資料\n\n- [A](https://a)（出典）\n- [**e-Stat**](https://e)（総務省）\n');
  assert.deepEqual(a, { title: 'A', url: 'https://a', source: '出典' });
  assert.deepEqual(b, { title: 'e-Stat', url: 'https://e', source: '総務省' });
});

test('行の途中のリンク・複数のリンクは parts に分け、記法を文字に残さない', () => {
  const [a, b] = references('## 参考資料\n\n- **NISC**「[ISMAP](https://n)」— 説明\n- [X](/docs/x)・[Y](https://y)\n');
  assert.equal(a.url, '');
  assert.deepEqual(a.parts, [{ text: 'NISC「' }, { text: 'ISMAP', url: 'https://n' }, { text: '」— 説明' }]);
  assert.deepEqual(b.parts, [{ text: 'X', url: '/docs/x' }, { text: '・' }, { text: 'Y', url: 'https://y' }]);
  for (const item of [a, b]) assert.doesNotMatch(item.title, /\]\(|\*\*/);
});
