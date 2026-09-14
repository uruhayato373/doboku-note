#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync, unlinkSync, lstatSync } from 'node:fs';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT as repoRoot } from './lib/repository-paths.mjs';
import { resolveAuthRoot } from './lib/playwright-auth-profile.mjs';
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
export function cleanMain(args = process.argv.slice(2), { root = repoRoot, inspectProcesses = processInventory, quiet = false } = {}) {
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
    const processes = inspectProcesses(root);
    let roots = [...(config.roots || [])];
    if (category === 'browser-cache') {
      const local = join(root, '.local');
      for (const profile of existsSync(local) ? readdirSync(local) : []) {
        if (!/^playwright-[\w-]+-profile$/.test(profile)) continue;
        for (const cache of config.names) for (const prefix of ['', 'Default/']) roots.push(`.local/${profile}/${prefix}${cache}`);
      }
    }
    const candidates = roots.map(rel => ({ base: root, rel }));
    if (category === 'build' && existsSync(join(root, '.next'))) {
      for (const name of readdirSync(safePath(root, '.next'))) {
        if (/^dev-backup-\d{8}-\d{6}$/.test(name)) candidates.unshift({ base: root, rel: `.next/${name}` });
      }
    }
    if (category === 'browser-cache' && root === repoRoot) {
      const base = join(resolveAuthRoot(), 'profiles');
      if (existsSync(base) && !lstatSync(base).isSymbolicLink()) {
        for (const profile of readdirSync(base)) {
          for (const cache of config.names) for (const prefix of ['', 'Default/']) candidates.push({ base, rel: `${profile}/${prefix}${cache}` });
        }
      }
    }
    const onlyIndex = args.indexOf('--only');
    const selected = onlyIndex < 0 ? candidates : candidates.filter(c => c.base === root && c.rel === args[onlyIndex + 1]);
    if (onlyIndex >= 0 && !selected.length) throw new Error('--only must name a configured cleanup target');
    // Protect all assets registered in either tier, even if someone put one inside scratch.
    const protectedPaths = ['.claude/state/assets/manifest.json', '.claude/state/assets/drive-manifest.json']
      .flatMap(path => Object.keys(JSON.parse(readFileSync(join(root, path), 'utf8')).entries || {}));
    let deleted = 0, bytes = 0;
    const rows = [];
    for (const { base, rel } of selected) {
      const abs = safePath(base, rel);
      const row = scanTree(base, rel, Date.now() + policy.scanTimeoutMs, true);
      if (!row.files && !row.errors.length && !row.links) continue;
      const tracked = base !== root ? { status: 0, stdout: '' } : spawnSync('git', ['ls-files', '-z', '--', rel], { cwd: root, encoding: 'utf8', timeout: 15000 });
      const registered = protectedPaths.some(p => { const child = relative(abs, resolve(root, p)); return !child || (!child.startsWith('..') && !isAbsolute(child)); });
      const eligible = tracked.status === 0 && !tracked.stdout && !registered && canClean(row, minAgeDays, processes, category);
      rows.push({ path: base === root ? rel : abs, files: row.files, bytes: row.bytes, eligible, inspectionIncomplete: tracked.status !== 0 || row.errors.length > 0, reason: eligible ? 'expired regenerable output' : 'active, recent, tracked, registered, linked or inspection incomplete' });
      if (!commit || !eligible) continue;
      // Rescan immediately before deletion; changes since planning abort the whole category.
      const fresh = scanTree(base, rel, Date.now() + policy.scanTimeoutMs, true);
      if (JSON.stringify(fresh) !== JSON.stringify(row)) throw new Error(`Changed during inspection: ${rel}`);
      const currentProcesses = inspectProcesses(root);
      if (!canClean(fresh, minAgeDays, currentProcesses, category)) throw new Error(`Became active: ${rel}`);
      for (const file of fresh.entries) {
        const path = safePath(base, file.path);
        const st = lstatSync(path);
        if (!st.isFile() || st.mtimeMs !== file.mtimeMs || st.size !== file.bytes) throw new Error(`Changed file: ${file.path}`);
        unlinkSync(path); deleted++; bytes += st.size;
      }
      // Empty directories may stay; do not recursively remove an open writer's new files.
      void abs;
    }
    const result = { mode: commit ? 'commit' : 'dry-run', category, targets: selected.length, inspected: selected.length, processInspection: processes.complete, rows, deleted, freedBytes: bytes, complete: processes.complete && !rows.some(row => row.inspectionIncomplete) };
    if (!quiet) console.log(JSON.stringify(result, null, 2));
    return result;
  } finally { releaseHeavy?.(); release(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!cleanMain().complete) process.exitCode = 2;
}
