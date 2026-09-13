#!/usr/bin/env node
// Monthly bounded readback: hash remote bytes without saving media locally.
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { REPO_ROOT as root } from './lib/repository-paths.mjs';
import { acquireLock } from './lib/local-resources.mjs';
import { loadConfig, loadManifest, loadEnvLocal, makeS3, hasR2Credentials } from './lib/asset-storage.mjs';
import { loadDriveConfig, loadDriveManifest, vaultRelFor } from './lib/drive-vault.mjs';

const policy = JSON.parse(readFileSync(join(root, '.claude/config/local-resources.json'), 'utf8'));
const release = acquireLock(root, 'cloud-verify');
const results = [];
const month = new Date().toISOString().slice(0, 7);
function select(entries) {
  return Object.entries(entries).filter(([, e]) => e.sha256 && e.bytes > 0 && e.bytes <= policy.cloudSampleMaxBytes)
    .sort(([a], [b]) => createHash('sha256').update(month + a).digest('hex').localeCompare(createHash('sha256').update(month + b).digest('hex')))
    .slice(0, policy.cloudSampleCount);
}
async function verify(stream, entry) {
  let bytes = 0; const hash = createHash('sha256');
  for await (const chunk of stream) {
    bytes += chunk.length;
    if (bytes > entry.bytes || bytes > policy.cloudSampleMaxBytes) throw new Error('Remote size exceeded sample limit');
    hash.update(chunk);
  }
  if (bytes !== entry.bytes || hash.digest('hex') !== entry.sha256) throw new Error('Remote hash/size mismatch');
  return bytes;
}
try {
  loadEnvLocal();
  const r2 = select(loadManifest().entries || {});
  if (!hasR2Credentials()) results.push({ provider: 'r2', status: 'unavailable', reason: 'credentials unavailable', inspected: 0 });
  else {
    const cfg = loadConfig(); const s3 = await makeS3();
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    for (const [path, entry] of r2) {
      try {
        const response = await s3.send(new GetObjectCommand({ Bucket: cfg.buckets[entry.bucket].name, Key: entry.r2Key }), { abortSignal: AbortSignal.timeout(60000) });
        const bytes = await verify(response.Body, entry);
        results.push({ provider: 'r2', path, status: 'verified', bytes });
      } catch (e) { results.push({ provider: 'r2', path, status: 'failed', reason: e.name || 'verification failed' }); }
    }
    s3.destroy();
  }
  const cfg = loadDriveConfig();
  const manifest = loadDriveManifest();
  for (const [path, entry] of select(manifest.entries || {})) {
    const group = cfg.groups.find(g => g.id === entry.group);
    if (!group) { results.push({ provider: 'drive', path, status: 'failed', reason: 'group missing' }); continue; }
    const vaultPath = entry.vaultPath || vaultRelFor(path, group);
    const remote = `${cfg.cloud.rcloneRemote}:${cfg.cloud.remoteRoot}/${vaultPath}`;
    const child = spawn('rclone', ['cat', remote, '--contimeout', '10s', '--timeout', '30s', '--retries', '1'], { stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });
    const timer = setTimeout(() => child.kill(), 60000);
    const completed = new Promise(resolve => { child.on('error', () => resolve(false)); child.on('close', code => resolve(code === 0)); });
    try {
      const bytes = await verify(child.stdout, entry);
      if (!await completed) throw new Error('Drive transfer unavailable');
      results.push({ provider: 'drive', path, status: 'verified', bytes });
    } catch { child.kill(); await completed; results.push({ provider: 'drive', path, status: 'failed', reason: 'Drive transfer or hash verification failed; check rclone connection' }); }
    finally { clearTimeout(timer); }
  }
  for (const provider of ['r2', 'drive']) if (!results.some(r => r.provider === provider)) results.push({ provider, status: 'unavailable', inspected: 0, reason: 'no eligible sample' });
  const report = { at: new Date().toISOString(), mode: 'remote-byte-sample', maxBytesPerSample: policy.cloudSampleMaxBytes, results };
  const dir = join(root, '.local/resource-audit'); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'cloud-latest.json.tmp'), JSON.stringify(report, null, 2) + '\n');
  renameSync(join(dir, 'cloud-latest.json.tmp'), join(dir, 'cloud-latest.json'));
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = results.every(r => r.status === 'verified') ? 0 : 2;
} finally { release(); }
