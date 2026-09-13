#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync, unlinkSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT as root } from './lib/repository-paths.mjs';
import { safePath, scanTree, processInventory, acquireLock } from './lib/local-resources.mjs';

export function canClean(row, minAgeDays, processes, kind, now = Date.now()) {
  if (row.errors.length || row.links || !row.files) return false;
  if (row.newestMs > now - minAgeDays * 86400000) return false;
  if (!processes.complete) return false;
  // Conservative on POSIX: ps does not expose command lines, so any Node runtime blocks builds.
  if (kind === 'build' && processes.rows.some(p => ['next', 'preview', 'unknown-runtime'].includes(p.kind))) return false;
  if (kind === 'browser-cache' && processes.rows.some(p => p.kind === 'browser')) return false;
  return true;
}
export function cleanMain(args = process.argv.slice(2)) {
  const policy = JSON.parse(readFileSync(join(root, '.claude/config/local-resources.json'), 'utf8'));
  const index = args.indexOf('--category');
  const category = index < 0 ? 'scratch' : args[index + 1];
  if (!policy.cleanup[category]) throw new Error('Unknown cleanup category');
  const commit = args.includes('--commit');
  const release = acquireLock(root, 'maintenance');
  let releaseHeavy;
  try {
    releaseHeavy = acquireLock(root, 'heavy-work');
    const config = policy.cleanup[category];
    const minAgeDays = args.includes('--include-recent') ? 0 : config.minAgeDays;
    const processes = processInventory(root);
    let roots = [...(config.roots || [])];
    if (category === 'browser-cache') {
      const local = join(root, '.local');
      for (const profile of existsSync(local) ? readdirSync(local) : []) {
        if (!/^playwright-[\w-]+-profile$/.test(profile)) continue;
        for (const cache of config.names) for (const prefix of ['', 'Default/']) roots.push(`.local/${profile}/${prefix}${cache}`);
      }
    }
    // Protect all assets registered in either tier, even if someone put one inside scratch.
    const protectedPaths = ['.claude/state/assets/manifest.json', '.claude/state/assets/drive-manifest.json']
      .flatMap(path => Object.keys(JSON.parse(readFileSync(join(root, path), 'utf8')).entries || {}));
    let deleted = 0, bytes = 0;
    const rows = [];
    for (const rel of roots) {
      const abs = safePath(root, rel);
      const row = scanTree(root, rel, Date.now() + policy.scanTimeoutMs, true);
      if (!row.files && !row.errors.length && !row.links) continue;
      const tracked = spawnSync('git', ['ls-files', '-z', '--', rel], { cwd: root, encoding: 'utf8', timeout: 15000 });
      const registered = protectedPaths.some(p => p === rel || p.startsWith(`${rel}/`));
      const eligible = tracked.status === 0 && !tracked.stdout && !registered && canClean(row, minAgeDays, processes, category);
      rows.push({ path: rel, files: row.files, bytes: row.bytes, eligible, inspectionIncomplete: tracked.status !== 0 || row.errors.length > 0, reason: eligible ? 'expired regenerable output' : 'active, recent, tracked, registered, linked or inspection incomplete' });
      if (!commit || !eligible) continue;
      // Rescan immediately before deletion; changes since planning abort the whole category.
      const fresh = scanTree(root, rel, Date.now() + policy.scanTimeoutMs, true);
      if (JSON.stringify(fresh) !== JSON.stringify(row)) throw new Error(`Changed during inspection: ${rel}`);
      const currentProcesses = processInventory(root);
      if (!canClean(fresh, minAgeDays, currentProcesses, category)) throw new Error(`Became active: ${rel}`);
      for (const file of fresh.entries) {
        const path = safePath(root, file.path);
        const st = lstatSync(path);
        if (!st.isFile() || st.mtimeMs !== file.mtimeMs || st.size !== file.bytes) throw new Error(`Changed file: ${file.path}`);
        unlinkSync(path); deleted++; bytes += st.size;
      }
      // Empty directories may stay; do not recursively remove an open writer's new files.
      void abs;
    }
    console.log(JSON.stringify({ mode: commit ? 'commit' : 'dry-run', category, processInspection: processes.complete, rows, deleted, freedBytes: bytes }, null, 2));
    if (!processes.complete || rows.some(row => row.inspectionIncomplete)) process.exitCode = 2;
  } finally { releaseHeavy?.(); release(); }
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) cleanMain();
