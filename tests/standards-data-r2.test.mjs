import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeJson } from '../scripts/lib/json-io.mjs';
import { chapterDataKeys, chapterDataFiles } from '../scripts/lib/standards-data-r2.mjs';
import { classifyPublicKeys } from '../scripts/lib/r2-orphans.mjs';

test('ビルド出力なしでも台帳の章を保護し、退役章だけを孤児にする', () => {
  const root = mkdtempSync(join(tmpdir(), 'standards-r2-'));
  try {
    writeJson(root, 'standards-library/catalog.json', { documents: [{ agencyId: 'a', documentId: 'd' }] });
    const manifest = { agencyId: 'a', documentId: 'd', chapters: [{ chapterId: '1', file: '1.md' }] };
    writeJson(root, 'standards-articles/a/d/manifest.json', manifest);
    writeFileSync(join(root, 'standards-articles/a/d/1.md'), '本文');
    const keys = chapterDataKeys(root);
    assert.deepEqual(keys, ['standards-data/a/d/chapters/1.md', 'standards-data/a/d/chapters/1.jsonld']);
    const old = 'standards-data/a/d/chapters/old.md';
    const result = classifyPublicKeys({ keys: [...keys, old], standardsDataKeys: keys, manifestPublicKeys: [], trackedSitePaths: [], pendingDeleteKeys: [], referencedBasenames: [] });
    assert.equal(result.kept, 2);
    assert.deepEqual(result.orphans, [old]);
    const output = join(root, 'output');
    assert.throws(() => chapterDataFiles(output, root), /未生成/);
    mkdirSync(join(output, 'a/d/chapters'), { recursive: true });
    for (const name of ['1.md', '1.jsonld', 'old.md']) writeFileSync(join(output, 'a/d/chapters', name), '出力');
    assert.equal(chapterDataFiles(output, root).length, 2);
    rmSync(join(root, 'standards-articles/a/d/1.md'));
    assert.throws(() => chapterDataKeys(root), /生成元が無い/);
    manifest.chapters = [];
    writeJson(root, 'standards-articles/a/d/manifest.json', manifest);
    assert.throws(() => chapterDataKeys(root), /0 件/);
    rmSync(join(root, 'standards-articles'), { recursive: true });
    assert.throws(() => chapterDataKeys(root));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
