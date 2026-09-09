#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { google } from 'googleapis';
import { sealReport } from './lib/youtube-rollout-envelope.mjs';
import { assertPlan, assertChannel, sha256, uploadReplacement } from './lib/youtube-migration.mjs';
import { migrationStorage } from './lib/youtube-migration-storage.mjs';
import { inspectPlaylists, auditReplacement, updateReplacementThumbnail, activateReplacement, deleteOldReplacement } from './lib/youtube-migration-finalize.mjs';

const env = process.env, out = '.tmp/youtube-migration-export';
mkdirSync(out, { recursive: true });
const report = value => writeFileSync(`${out}/report.enc.json`, JSON.stringify(sealReport(value, env.YOUTUBE_REPORT_PUBLIC_KEY)));
const rows = [];
async function main() {
  sealReport({ probe: true }, env.YOUTUBE_REPORT_PUBLIC_KEY);
  if (!/^[a-f0-9]{64}$/.test(env.PLAN_SHA256 ?? '')) throw new Error('Frozen private plan SHA-256 required');
  const storage = migrationStorage();
  const bytes = await storage.get(`${storage.prefix}plans/${env.PLAN_SHA256}.json`);
  if (!bytes || sha256(bytes) !== env.PLAN_SHA256) throw new Error('Frozen plan integrity mismatch');
  const plan = JSON.parse(bytes);
  assertPlan(plan);
  for (const key of ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN']) if (!env[key]) throw new Error('YouTube credentials unavailable');
  const auth = new google.auth.OAuth2(env.YOUTUBE_CLIENT_ID, env.YOUTUBE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: env.YOUTUBE_REFRESH_TOKEN });
  const youtube = google.youtube({ version: 'v3', auth });
  await assertChannel(youtube, plan.channel);
  const start = Number(env.BATCH_START ?? 0), limit = Number(env.BATCH_LIMIT ?? 1);
  if (!Number.isInteger(start) || start < 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Invalid batch range');
  const targets = plan.entries.slice(start, start + limit);
  if (!targets.length) throw new Error('No migration targets');
  const operation = env.MIGRATION_OPERATION ?? 'migration-upload';
  const actions = { 'migration-upload': uploadReplacement, 'migration-audit': auditReplacement,
    'migration-thumbnail': updateReplacementThumbnail, 'migration-activate': activateReplacement, 'migration-delete': deleteOldReplacement };
  if (!actions[operation]) throw new Error('Unknown migration operation');
  const playlists = operation === 'migration-audit' ? await inspectPlaylists(youtube) : null;
  if (playlists && env.APPLY_MIGRATION === 'true') await storage.put(`${storage.prefix}playlist-inventory.json`, Buffer.from(JSON.stringify(playlists)));
  const getBytes = async media => {
    const buffer = await storage.get(media.key);
    if (!buffer || buffer.length !== media.bytes || sha256(buffer) !== media.sha256) throw new Error('Staged media integrity mismatch');
    return buffer;
  };
  for (const item of targets) {
    const result = await actions[operation](youtube, item, { commit: env.APPLY_MIGRATION === 'true', playlists,
      load: storage.load, save: async (id, receipt) => { await storage.save(id, receipt); report({ complete: false, rows, latestReceipt: receipt }); },
      getBytes, getMedia: async media => Readable.from(await getBytes(media)),
      loadControl: async () => { const b = await storage.get(`${storage.prefix}control.json`); return b ? JSON.parse(b) : {}; },
      saveControl: async value => storage.put(`${storage.prefix}control.json`, Buffer.from(JSON.stringify(value))),
    });
    rows.push({ oldId: item.oldVideo.id, sourceKey: item.sourceKey, ...result, receipt: await storage.load(item.oldVideo.id) });
    report({ complete: false, planSha256: env.PLAN_SHA256, rows });
    console.log(JSON.stringify({ checked: rows.length, phase: result.phase }));
  }
  report({ complete: true, planSha256: env.PLAN_SHA256, rows });
  console.log(JSON.stringify({ checked: rows.length, deleted: rows.filter(r => r.phase === 'deleted').length, activated: rows.filter(r => r.phase === 'activated').length }));
}
main().catch(error => {
  try { report({ complete: false, rows, error: { message: error.message, status: error.response?.status, reasons: error.response?.data?.error?.errors?.map(e => e.reason) } }); } catch { /* No plaintext fallback. */ }
  console.error('Migration stopped. Inspect encrypted report and durable receipts before resuming.');
  process.exitCode = 1;
});
