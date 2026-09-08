#!/usr/bin/env node
/** 全 bookBundle を設定順に生成する。既定 dry-run、--commit で Drive へ書く。 */

import { spawnSync } from 'node:child_process';
import { loadReferenceSources } from './lib/reference-sources.mjs';

const commit = process.argv.includes('--commit');
const replaceDerived = process.argv.includes('--replace-derived');
const targets = loadReferenceSources().sources.filter((source) => source.bookBundle);
if (!targets.length) {
  console.error('[build-all-reference-books] 対象 0 件。検査不成立');
  process.exit(2);
}

const failures = [];
for (let i = 0; i < targets.length; i++) {
  const source = targets[i];
  console.log(`\n[build-all-reference-books] ${i + 1}/${targets.length} ${source.id}`);
  const args = ['scripts/build-reference-book-pages.mjs', '--source-id', source.id];
  if (commit) args.push('--commit');
  if (replaceDerived) args.push('--replace-derived');
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) failures.push({ id: source.id, status: result.status });
}

if (failures.length) {
  for (const failure of failures) console.error(`  ✗ ${failure.id}: exit ${failure.status}`);
  console.error(`[build-all-reference-books] FAIL ${failures.length}/${targets.length}`);
  process.exit(1);
}
console.log(`[build-all-reference-books] ✓ ${targets.length} 冊 ${commit ? '生成完了' : 'dry-run 完了'}`);
