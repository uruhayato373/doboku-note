#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { REPO_ROOT as root } from './lib/repository-paths.mjs';
if (!process.env.npm_execpath) throw new Error('Run with npm run build');
const commands = [
  ['scripts/clean-build-output.mjs'],
  [process.env.npm_execpath, 'run', 'refresh-indexes'],
  ['node_modules/next/dist/bin/next', 'build'],
  ['node_modules/pagefind/lib/runner/bin.cjs', '--site', 'out', '--output-path', 'out/pagefind'],
  ['scripts/generate-sitemap.mjs'],
  ['scripts/generate-rss.mjs'],
];
for (const args of commands) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', windowsHide: true });
  if (result.status !== 0) { process.exitCode = result.status || 1; break; }
}
