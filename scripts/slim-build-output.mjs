#!/usr/bin/env node
/**
 * ビルド成果物から配信に要らないファイルを除き、Cloudflare Pages の 20,000 件上限の手前で止める。
 *
 * - __next._full.txt: 同じ階層のルート .txt とバイト単位で同じで、ページ移動で読まれない
 * - standards-data の章の .md・.jsonld: R2 から配信する（upload-standards-data-r2.mjs・_redirects）
 *
 * 上限に近づいたら build を失敗させる。デプロイの段で初めて分かると main が先に進んでしまう（2026-11-06）。
 */
import { rmSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { isCliEntry } from './lib/cli-run.mjs';
import { listFiles } from './lib/fs-walk.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

export const MAX_OUTPUT_FILES = 19_000;
const CHAPTER_DATA = /^standards-data\/[^/]+\/[^/]+\/chapters\/[^/]+\.(?:md|jsonld)$/;

export function isRemovedFromOutput(path) {
  return basename(path) === '__next._full.txt' || CHAPTER_DATA.test(path);
}

function main() {
  const out = join(REPO_ROOT, 'out');
  const files = listFiles(out);
  const removed = files.filter((path) => isRemovedFromOutput(relative(out, path)));
  if (files.length === 0 || removed.length === 0) {
    console.error(`[slim-build-output] 検査不成立: ${files.length} 件を検査 / 除外 ${removed.length} 件`);
    process.exit(2);
  }
  for (const path of removed) rmSync(path);
  const remaining = files.length - removed.length;
  console.log(`[slim-build-output] ${files.length} 件を検査 / 除外 ${removed.length} 件 / 残り ${remaining} 件（上限 ${MAX_OUTPUT_FILES}）`);
  if (remaining > MAX_OUTPUT_FILES) {
    console.error(`[slim-build-output] 上限超過: ${remaining} 件 > ${MAX_OUTPUT_FILES} 件`);
    process.exit(1);
  }
}

if (isCliEntry(import.meta.url)) main();
