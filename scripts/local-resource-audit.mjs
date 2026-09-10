#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT as root } from './lib/repository-paths.mjs';
import { scanTree, machineResources, processInventory, warningsFor, acquireLock, GiB } from './lib/local-resources.mjs';

const args = process.argv.slice(2);
const policy = JSON.parse(readFileSync(join(root, '.claude/config/local-resources.json'), 'utf8'));
const quick = args.includes('--quick');
const release = quick ? () => {} : acquireLock(root, 'audit');
try {
  const snapshot = { at: new Date().toISOString(), machine: machineResources(root), mode: quick ? 'quick' : 'full' };
  const dir = join(root, '.local/resource-audit');
  const latest = join(dir, 'latest.json');
  const previous = !quick && existsSync(latest) ? JSON.parse(readFileSync(latest, 'utf8')) : null;
  if (!quick) {
    const deadline = Date.now() + policy.scanTimeoutMs;
    snapshot.directories = policy.roots.map(rel => scanTree(root, rel, deadline));
    // LFS is a subset of .git, not an extra contribution to the total.
    snapshot.directories.push(scanTree(root, '.git/lfs', deadline));
    snapshot.processes = processInventory(root);
  }
  snapshot.warnings = warningsFor(snapshot, policy, previous);
  snapshot.errors = (snapshot.directories || []).flatMap(row => row.errors.map(error => `${row.path}: ${error}`));
  if (!quick && !snapshot.processes.complete) snapshot.errors.push('process inspection unavailable');
  if (!quick) {
    mkdirSync(dir, { recursive: true });
    const historyPath = join(dir, 'history.json');
    const history = existsSync(historyPath) ? JSON.parse(readFileSync(historyPath, 'utf8')) : [];
    for (const [path, value] of [[latest, snapshot], [historyPath, [...history, snapshot].slice(-policy.historyLimit)]]) {
      writeFileSync(`${path}.tmp`, JSON.stringify(value, null, 2) + '\n'); renameSync(`${path}.tmp`, path);
    }
  }
  if (args.includes('--json')) console.log(JSON.stringify(snapshot, null, 2));
  else {
    console.log(`[resources] free disk ${(snapshot.machine.freeDiskBytes / GiB).toFixed(1)} GiB; free memory ${(snapshot.machine.freeMemoryBytes / GiB).toFixed(1)} GiB`);
    for (const row of snapshot.directories || []) console.log(`  ${row.path}: ${(row.bytes / GiB).toFixed(2)} GiB / ${row.files} files / links skipped ${row.links}`);
    for (const warning of snapshot.warnings) console.log(`  WARN ${warning}`);
    for (const error of snapshot.errors) console.error(`  INCOMPLETE ${error}`);
  }
  process.exitCode = snapshot.errors.length ? 2 : 0;
} finally { release(); }
