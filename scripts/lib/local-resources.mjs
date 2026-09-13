import { existsSync, lstatSync, readdirSync, statfsSync, readFileSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync, realpathSync } from 'node:fs';
import { resolve, relative, join, isAbsolute, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import os from 'node:os';

export const GiB = 1073741824;
export function inside(root, path) {
  const rel = relative(resolve(root), resolve(path));
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}
export function safePath(root, rel) {
  const abs = resolve(root, rel);
  if (!inside(root, abs)) throw new Error(`Outside workspace: ${rel}`);
  let current = resolve(root);
  for (const part of relative(root, abs).split(sep)) {
    current = join(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error(`Link is protected: ${rel}`);
  }
  if (existsSync(abs) && !inside(realpathSync(root), realpathSync(abs))) throw new Error(`Resolved outside workspace: ${rel}`);
  return abs;
}
// Stream directory traversal; never follow junctions or read file bodies. Deadline is shared across roots.
export function scanTree(root, rel, deadline = Date.now() + 180000, collect = false) {
  const result = { path: rel, bytes: 0, files: 0, newestMs: 0, links: 0, errors: [], entries: [] };
  const base = safePath(root, rel);
  if (!existsSync(base)) return result;
  function visit(abs) {
    if (Date.now() > deadline) throw new Error('scan deadline exceeded');
    const st = lstatSync(abs);
    if (st.isSymbolicLink()) { result.links++; return; }
    result.newestMs = Math.max(result.newestMs, st.mtimeMs);
    if (st.isDirectory()) {
      for (const e of readdirSync(abs, { withFileTypes: true })) visit(join(abs, e.name));
    } else if (st.isFile()) {
      result.bytes += st.size; result.files++;
      if (collect) result.entries.push({ path: relative(root, abs).split(sep).join('/'), bytes: st.size, mtimeMs: st.mtimeMs });
    }
  }
  try { visit(base); } catch (e) { result.errors.push(e.code || e.message); }
  return result;
}
export function machineResources(root) {
  const disk = statfsSync(root);
  return { freeDiskBytes: disk.bavail * disk.bsize, totalMemoryBytes: os.totalmem(), freeMemoryBytes: os.freemem() };
}
export function processInventory(root) {
  // Command lines stay inside PowerShell; only a coarse label and process IDs leave it.
  const script = join(root, 'scripts/local-resource-processes.ps1');
  if (process.platform !== 'win32') {
    const r = spawnSync('ps', ['-axo', 'pid=,ppid=,rss=,comm='], { encoding: 'utf8', timeout: 15000 });
    if (r.status !== 0) return { complete: false, rows: [], reason: 'process inspection unavailable' };
    const rows = r.stdout.trim().split('\n').flatMap(line => {
      const m = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/);
      return m ? [{ pid: +m[1], parentPid: +m[2], bytes: +m[3] * 1024, kind: /chrome|chromium|safari|firefox/i.test(m[4]) ? 'browser' : /node|next|ffmpeg|python/i.test(m[4]) ? 'unknown-runtime' : 'other' }] : [];
    });
    return { complete: rows.length > 0, rows };
  }
  const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', script], { encoding: 'utf8', timeout: 30000, windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
  if (r.status !== 0) return { complete: false, rows: [], reason: 'process inspection unavailable' };
  try { return { complete: true, rows: JSON.parse(r.stdout || '[]') }; }
  catch { return { complete: false, rows: [], reason: 'invalid process inspection' }; }
}
export function warningsFor(snapshot, policy, previous) {
  const warnings = [];
  if (snapshot.machine.freeDiskBytes < policy.minFreeDiskGiB * GiB) warnings.push('low-disk');
  if (snapshot.machine.freeMemoryBytes < policy.minFreeMemoryGiB * GiB) warnings.push('low-memory');
  for (const row of snapshot.directories || []) {
    if (row.bytes > (policy.budgetsGiB[row.path] ?? Infinity) * GiB) warnings.push(`budget:${row.path}`);
    const old = previous?.directories?.find(x => x.path === row.path);
    if (old && row.bytes - old.bytes > policy.growthWarnGiB * GiB) warnings.push(`growth:${row.path}`);
  }
  const counts = {};
  for (const row of snapshot.processes?.rows || []) if (row.kind.startsWith('mcp:')) counts[row.kind] = (counts[row.kind] || 0) + 1;
  for (const [kind, count] of Object.entries(counts)) if (count > 1) warnings.push(`multiple:${kind}:${count}`);
  return warnings;
}
export function acquireLock(root, name) {
  const dir = safePath(root, `.local/resource-audit/${name}.lock`);
  mkdirSync(resolve(dir, '..'), { recursive: true });
  try { mkdirSync(dir); }
  catch (e) {
    if (e.code !== 'EEXIST') throw e;
    // A dead process can leave a lock. Unknown/malformed owner is never treated as dead.
    const owner = JSON.parse(readFileSync(join(dir, 'owner.json'), 'utf8'));
    try { process.kill(owner.pid, 0); throw new Error(`${name} already running (pid ${owner.pid})`); }
    catch (err) { if (err.code !== 'ESRCH') throw err; }
    unlinkSync(join(dir, 'owner.json')); rmdirSync(dir); mkdirSync(dir);
  }
  writeFileSync(join(dir, 'owner.json'), JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  return () => { unlinkSync(join(dir, 'owner.json')); rmdirSync(dir); };
}
