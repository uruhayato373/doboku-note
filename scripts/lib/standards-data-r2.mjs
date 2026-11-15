/** 章台帳から R2 配信の対象を決める。public/ のビルド出力が無くても判定する。 */
import { existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { listFiles } from './fs-walk.mjs';
import { readJson } from './json-io.mjs';
import { SITE_CONTENT_ROOT } from './repository-paths.mjs';

export function chapterDataKeys(siteRoot = SITE_CONTENT_ROOT) {
  const root = join(siteRoot, 'standards-articles');
  const catalog = readJson(siteRoot, 'standards-library/catalog.json');
  const manifests = listFiles(root, { maxDepth: 2, match: (path, name) => name === 'manifest.json' && relative(root, path).split(sep).length === 3 });
  if (!manifests.length) throw new Error('章台帳が 0 件');
  const keys = [];
  for (const path of manifests) {
    const manifest = readJson(dirname(path), 'manifest.json');
    const { agencyId, documentId, chapters } = manifest;
    if (!catalog.documents.some((d) => d.agencyId === agencyId && d.documentId === documentId)) throw new Error(`catalog に文書が無い: ${path}`);
    for (const chapter of chapters) {
      if (!chapter.chapterId || !chapter.file || !existsSync(join(root, agencyId, documentId, chapter.file))) throw new Error(`章の生成元が無い: ${path} / ${chapter.chapterId}`);
      for (const ext of ['md', 'jsonld']) keys.push(`standards-data/${agencyId}/${documentId}/chapters/${chapter.chapterId}.${ext}`);
    }
  }
  if (!keys.length) throw new Error('章データの対象が 0 件');
  return keys;
}

/** 台帳の集合のみ送る。古いビルド出力は送らず、生成漏れは送信前に止める。 */
export function chapterDataFiles(root, siteRoot = SITE_CONTENT_ROOT) {
  return chapterDataKeys(siteRoot).map((key) => {
    const path = join(root, ...key.split('/').slice(1));
    if (!existsSync(path)) throw new Error(`章データが未生成: ${path}`);
    return path;
  });
}
