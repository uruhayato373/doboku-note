/** Register connector uploads only after full remote byte readback; never uploads or deletes. */
import { readFileSync } from 'node:fs';
import { resolve, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { loadDriveConfig, driveGroupFor, vaultRelFor, realBytesAndHashes,
  loadDriveManifest, writeDriveManifestAtomic } from './lib/drive-vault.mjs';

export async function prepareConnectorEntries(receipt, { root = REPO_ROOT, cfg = loadDriveConfig(), hashes = realBytesAndHashes } = {}) {
  const group = cfg.groups.find(g => g.id === receipt.group && g.status === 'active');
  if (!group || !Array.isArray(receipt.files) || receipt.files.length === 0) throw new Error('active group / nonempty files required');
  if (!receipt.folder?.id || !receipt.folder?.vaultPath) throw new Error('verified destination folder required');
  const entries = {}; const ids = new Set();
  for (const f of receipt.files) {
    const p = f.repoPath;
    if (typeof p !== 'string' || p.includes('\\') || p.startsWith('/') || /^[A-Za-z]:/.test(p) || p.split('/').some(x => !x || x === '..' || x === '.')) throw new Error('unsafe repoPath');
    if (entries[p] || ids.has(f.id)) throw new Error('duplicate path or Drive id');
    if (!/^[\w-]+$/.test(f.id ?? '') || driveGroupFor(p, cfg)?.id !== group.id) throw new Error('invalid Drive id / group mismatch');
    const vaultPath = vaultRelFor(p, group);
    if (f.parentId !== receipt.folder.id || f.name !== posix.basename(p) || posix.dirname(vaultPath) !== receipt.folder.vaultPath) throw new Error('destination mismatch');
    if (f.verification !== 'remote-bytes-sha256' || !Number.isFinite(Date.parse(f.verifiedAt)) || !/^[a-f0-9]{64}$/.test(f.sha256 ?? '')) throw new Error('full remote readback required');
    const local = await hashes(resolve(root, p));
    if (local.sha256 !== f.sha256 || local.bytes !== f.bytes) throw new Error('readback mismatch: ' + p);
    entries[p] = { group: group.id, vaultPath, ...local, driveFileId: f.id, regenerable: group.regenerable, syncedAt: f.verifiedAt, verifiedAt: f.verifiedAt };
    ids.add(f.id);
  }
  return entries;
}

async function main() {
  const args = process.argv.slice(2);
  const index = args.indexOf('--receipt');
  if (index < 0 || !args[index + 1]) throw new Error('Usage: node scripts/drive-connector-register.mjs --receipt FILE [--commit]');
  const receipt = JSON.parse(readFileSync(args[index + 1], 'utf8'));
  const entries = await prepareConnectorEntries(receipt);
  const manifest = loadDriveManifest();
  for (const [p, entry] of Object.entries(entries)) {
    if (manifest.entries[p] && manifest.entries[p].sha256 !== entry.sha256) throw new Error('existing manifest differs: ' + p);
  }
  if (args.includes('--commit')) { Object.assign(manifest.entries, entries); writeDriveManifestAtomic(manifest); }
  console.log(`[drive-connector-register] ${Object.keys(entries).length} verified entries; ${args.includes('--commit') ? 'registered' : 'dry-run'}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(e => { console.error(e.message); process.exitCode = 1; });
