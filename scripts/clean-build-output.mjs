#!/usr/bin/env node

import { rmSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { REPO_ROOT as root } from './lib/repository-paths.mjs';

const output = resolve(root, 'out');
if (output !== `${root}${sep}out`) {
  throw new Error(`削除対象がリポジトリ直下の out/ ではありません: ${output}`);
}

rmSync(output, { recursive: true, force: true });
console.log(`[clean-build-output] ${output}`);
