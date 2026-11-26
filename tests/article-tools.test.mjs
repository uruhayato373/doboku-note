// 記事末の「関連ツール」の対応表（src/lib/tools.ts の ARTICLE_TOOLS）が、公開中の記事と実在するツールだけを指す（2026-11-26・実務記事へ広げた）。
// 記事を改名・非公開にしたり、ツールのパスを変えたりすると、関連ツールが黙って出なくなるので止める。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const source = readFileSync(join(ROOT, 'src/lib/tools.ts'), 'utf8');
const tools = new Set([...source.matchAll(/href: "\/tools\/([^"]+)"/g)].map((m) => m[1]));
const table = source.slice(source.indexOf('const ARTICLE_TOOLS'), source.indexOf('};', source.indexOf('const ARTICLE_TOOLS')));
const entries = [...table.matchAll(/'([^']+)': \[([^\]]*)\]/g)].map((m) => ({ slug: m[1], paths: [...m[2].matchAll(/'([^']+)'/g)].map((p) => p[1]) }));
const docs = JSON.parse(readFileSync(join(ROOT, 'src/config/doc-meta-index.json'), 'utf8')).docs;

test('関連ツールの対応表は、公開中の記事と実在するツールだけを、1 記事 2 つまで指す', () => {
  assert.ok(tools.size >= 10, `ツール ${tools.size} 件`);
  assert.ok(entries.length >= 10, `対応表 ${entries.length} 件`);
  for (const { slug, paths } of entries) {
    assert.ok(docs[slug] && docs[slug].published !== false, `${slug}: 公開中の記事に無い`);
    assert.ok(paths.length >= 1 && paths.length <= 2, `${slug}: ツール ${paths.length} 件（1〜2 件）`);
    for (const path of paths) assert.ok(tools.has(path), `${slug}: ツール /tools/${path} が一覧（TOOLS）に無い`);
  }
});
