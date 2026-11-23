#!/usr/bin/env node
/**
 * run-unit-tests.mjs — `npm run test` の実体。tests/*.test.mjs を node:test で回す。
 * 並列数は環境変数 UNIT_TEST_CONCURRENCY で受ける（既定 2 = 8GB の Mac 向け）。CI の test ジョブだけが 4 を渡す。
 */
import { spawnSync } from 'node:child_process';

const concurrency = Number.parseInt(process.env.UNIT_TEST_CONCURRENCY ?? '', 10);
const args = [
  '--test',
  `--test-concurrency=${Number.isInteger(concurrency) && concurrency > 0 ? concurrency : 2}`,
  '--test-timeout=120000',
  'tests/*.test.mjs', // glob は node 自身が展開する（Windows の shell に依らない）
];
const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
process.exit(result.status ?? 1);
