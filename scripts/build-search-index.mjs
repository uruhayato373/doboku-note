#!/usr/bin/env node
/** サイト内検索の索引を作る。noindex のページは検索の入口にしないので索引へ入れない。 */
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import * as pagefind from 'pagefind';
import { isCliEntry } from './lib/cli-run.mjs';
import { listFiles } from './lib/fs-walk.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const OUT = join(REPO_ROOT, 'out');
const NOINDEX = /<meta name="robots" content="noindex/;

export function isIndexableHtml(html) {
  return !NOINDEX.test(html.split('</head>')[0]);
}

async function main() {
  const files = listFiles(OUT).filter((path) => path.endsWith('.html') && !relative(OUT, path).startsWith('pagefind'));
  if (files.length === 0) throw new Error('out/ に HTML が無い（検査不成立）');
  const { index, errors } = await pagefind.createIndex({});
  if (!index) throw new Error(`索引を作れない: ${errors.join(' / ')}`);
  let added = 0;
  for (const path of files) {
    const content = readFileSync(path, 'utf8');
    if (!isIndexableHtml(content)) continue;
    const result = await index.addHTMLFile({ sourcePath: relative(OUT, path), content });
    if (result.errors.length) throw new Error(`${path}: ${result.errors.join(' / ')}`);
    added += 1;
  }
  if (added === 0) throw new Error('索引へ入れたページが 0 件（検査不成立）');
  const written = await index.writeFiles({ outputPath: join(OUT, 'pagefind') });
  if (written.errors.length) throw new Error(written.errors.join(' / '));
  await pagefind.close();
  console.log(`[search-index] HTML ${files.length} 件を検査 / 索引 ${added} 件 / noindex で除外 ${files.length - added} 件`);
}

if (isCliEntry(import.meta.url)) await main();
