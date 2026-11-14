import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { listFiles } from '../scripts/lib/fs-walk.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

// ココナラのカタログ（src/lib/coconala-services.ts）を正規表現で読むのは scripts/lib/coconala-catalog.mjs の parseCatalog だけ。
// 各スクリプトが「id → status → serviceUrl の並び」を前提に独自に読むと、欄の並びが違う出品を黙って読み落とす
// （2026-09-30 に 2 件・2026-11-14 に技術士の添削 4 件。後者は土曜の収集の検算を「カタログに無い」で落とした）。
const ALLOWED = new Set(['scripts/lib/coconala-catalog.mjs']);
// 独自の読み方の目印: カタログの欄を status まで並べた正規表現
const OWN_READER = /id:\\s\*'\(\[\^'\]\+\)',\\s\*status/;

test('ココナラのカタログを独自の正規表現で読むスクリプトが無い（parseCatalog に寄せる）', () => {
  const roots = ['scripts', '.claude/scripts'].map((d) => join(REPO_ROOT, d));
  const files = roots.flatMap((d) => listFiles(d, { ext: '.mjs', allowMissing: true }));
  assert.ok(files.length > 100, `検査したファイルが少なすぎる（${files.length} 本）`);
  const offenders = files
    .map((f) => relative(REPO_ROOT, f).split('\\').join('/'))
    .filter((rel) => !ALLOWED.has(rel))
    .filter((rel) => OWN_READER.test(readFileSync(join(REPO_ROOT, rel), 'utf8')));
  assert.deepEqual(offenders, [], `parseCatalog（scripts/lib/coconala-catalog.mjs）に替える: ${offenders.join(', ')}`);
  // 目印が実物に当たることも確かめる（目印が壊れて 0 件になる偽 PASS を止める）
  const oldReader = String.raw`const re = /id:\s*'([^']+)',\s*status:\s*'([^']+)',\s*serviceUrl:\s*'([^']*)'/g;`;
  assert.ok(OWN_READER.test(oldReader), '目印が 11/14 以前の独自の読み方に当たらない');
});
