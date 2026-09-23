/**
 * readDocMetaIndex: 索引（生成物・git 管理外）が無い新しい worktree でも、pre-commit の検査が
 * ENOENT で落ちずに生成してから読むことを固定する（2026-09-23 に 3 回手で生成していた）。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { readDocMetaIndex, DOC_META_INDEX } from '../scripts/lib/doc-meta-index.mjs';

function fakeRepo(indexBody) {
  const root = mkdtempSync(join(tmpdir(), 'dmi-'));
  mkdirSync(join(root, '.claude/scripts'), { recursive: true });
  mkdirSync(join(root, 'src/config'), { recursive: true });
  // 本物の生成器の代わりに、呼ばれたら索引を書くだけのスタブを置く
  writeFileSync(join(root, '.claude/scripts/build-doc-meta-index.mjs'),
    `import { writeFileSync } from 'node:fs';\nwriteFileSync('${DOC_META_INDEX}', JSON.stringify({ docs: { generated: {} } }));\n`);
  if (indexBody) writeFileSync(join(root, DOC_META_INDEX), JSON.stringify(indexBody));
  return root;
}

test('索引が無ければ生成器を呼んでから読む', () => {
  const root = fakeRepo(null);
  try {
    assert.deepEqual(Object.keys(readDocMetaIndex(root).docs), ['generated']);
    assert.ok(existsSync(join(root, DOC_META_INDEX)));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('索引があれば生成器を呼ばずにそのまま読む', () => {
  const root = fakeRepo({ docs: { existing: {} } });
  try {
    assert.deepEqual(Object.keys(readDocMetaIndex(root).docs), ['existing']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
