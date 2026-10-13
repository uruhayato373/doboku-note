#!/usr/bin/env node
/**
 * check-client-chunk-size.mjs — build 済み out/_next/static/chunks の JS 1 本ごとの大きさを見るゲート。
 *
 * なぜ要るか: 2026-10-11、/search だけが読む 1,659,388 B（gzip 325KB）のチャンクに doc-meta-index.json
 * （約 930KB）が同梱されていた。client component（SearchZeroState）が @/lib/content-routes を import し、
 * その先の `import docMetaIndex from '@/config/doc-meta-index.json'` が client バンドルへ入った形
 * （client JS 合計 2.74MB の 60%・DN-0684）。import 1 行で再発するので、build の直後に上限で止める。
 *
 * Usage: node scripts/check-client-chunk-size.mjs [--out out] [--max-bytes 600000] [--json]
 * exit: 0 合格 / 1 上限超えあり / 2 検査不成立（out/ が無い・JS が 0 本）
 */
import { existsSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { listFiles } from './lib/fs-walk.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';

const TAG = '[check-client-chunk-size]';

function main() {
  const f = parseCliArgs({
    out: { type: 'string', default: 'out' },
    'max-bytes': { type: 'integer', default: 600_000 },
    json: { type: 'boolean' },
  });
  const dir = resolve(REPO_ROOT, f.out, '_next', 'static', 'chunks');
  const shown = relative(REPO_ROOT, dir) || dir;
  if (!existsSync(dir)) {
    console.error(`${TAG} ${shown} が無い（build 前・検査不成立）`);
    process.exitCode = 2;
    return;
  }
  const files = listFiles(dir, { ext: '.js' })
    .map((p) => ({ path: relative(REPO_ROOT, p), bytes: statSync(p).size }))
    .sort((a, b) => b.bytes - a.bytes);
  if (files.length === 0) {
    console.error(`${TAG} ${shown} に JS が 0 本（検査不成立）`);
    process.exitCode = 2;
    return;
  }
  const over = files.filter((x) => x.bytes > f.maxBytes);
  const total = files.reduce((n, x) => n + x.bytes, 0);
  const result = { checked: files.length, totalBytes: total, maxBytes: f.maxBytes, over, largest: files.slice(0, 3) };
  if (f.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`${TAG} JS ${files.length} 本 / 合計 ${total.toLocaleString()} B / 上限 ${f.maxBytes.toLocaleString()} B 超え ${over.length} 本`);
    for (const x of files.slice(0, 3)) console.log(`  ${x.bytes.toLocaleString().padStart(11)} B  ${x.path}`);
    for (const x of over) console.error(`  ✗ ${x.path} が ${x.bytes.toLocaleString()} B（client component から doc-meta-index 等の大きい JSON を import していないか）`);
  }
  process.exitCode = over.length ? 1 : 0;
}

main();
