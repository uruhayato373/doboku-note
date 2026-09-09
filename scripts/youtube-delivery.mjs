#!/usr/bin/env node
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { google } from 'googleapis';
import { assertPlan, assertChannel, sha256, uploadReplacement } from './lib/youtube-migration.mjs';
import { migrationStorage } from './lib/youtube-migration-storage.mjs';
import { inspectPlaylists, auditReplacement, updateReplacementThumbnail, activateReplacement, deleteOldReplacement } from './lib/youtube-migration-finalize.mjs';
import { scheduleReplacement } from './lib/youtube-delivery-schedule.mjs';
import { runDelivery } from './lib/youtube-delivery.mjs';

const config = JSON.parse(readFileSync('.claude/config/youtube-delivery.json'));
const commit = process.env.APPLY_DELIVERY === 'true';
let storage;
const json = value => Buffer.from(JSON.stringify(value));

function publicationFor(item) {
  const [exam, pack, key, extra] = item.sourceKey.split('/');
  if (exam === 'legacy' || key === 'longform' || extra || !key || item.oldVideo.status.privacyStatus !== 'private' || item.oldVideo.status.publishAt) return null;
  if (![exam, pack, key].every(x => /^[a-z0-9-]+$/.test(x))) throw new Error('Invalid publication source');
  const path = `content/sns/video-packs/${exam}/${pack}/youtube.json`;
  if (!existsSync(path)) throw new Error('Publication metadata missing');
  const data = JSON.parse(readFileSync(path));
  const publication = data.shorts?.find(s => s.key === key);
  if (!publication?.publishAt || publication.sha256 !== item.media.sha256) throw new Error('Publication media/slot mismatch');
  return publication;
}


async function main() {
  storage = migrationStorage();
  const bytes = await storage.get(`${storage.prefix}plans/${config.planSha256}.json`);
  if (!bytes || sha256(bytes) !== config.planSha256) throw new Error('Private delivery plan integrity mismatch');
  const plan = JSON.parse(bytes);
  assertPlan(plan);
  // Cache private receipts for this run; writes update the cache only after
  // private storage has read the bytes back. This avoids repeated R2 scans.
  const durableLoad = storage.load, durableSave = storage.save, receipts = new Map();
  storage.load = async id => {
    if (!receipts.has(id)) receipts.set(id, await durableLoad(id));
    return structuredClone(receipts.get(id));
  };
  storage.save = async (id, receipt) => { await durableSave(id, receipt); receipts.set(id, structuredClone(receipt)); };
  for (let i = 0; i < plan.entries.length; i += 8) await Promise.all(plan.entries.slice(i, i + 8).map(item => storage.load(item.oldVideo.id)));
  for (const key of ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN']) if (!process.env[key]) throw new Error('YouTube credentials missing');
  const auth = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  const youtube = google.youtube({ version: 'v3', auth });
  await assertChannel(youtube, plan.channel);
  let playlists;
  const getBytes = async media => {
    const value = await storage.get(media.key);
    if (!value || value.length !== media.bytes || sha256(value) !== media.sha256) throw new Error('Delivery media integrity mismatch');
    return value;
  };
  const readJson = async key => { const b = await storage.get(`${storage.prefix}${key}`); return b ? JSON.parse(b) : null; };
  const actions = { upload: uploadReplacement, audit: auditReplacement, thumbnail: updateReplacementThumbnail, activate: activateReplacement, delete: deleteOldReplacement };
  const summary = await runDelivery({ config, entries: plan.entries, commit, load: storage.load, publicationFor,
    loadState: () => readJson('delivery-state.json'),
    saveState: state => storage.put(`${storage.prefix}delivery-state.json`, json(state)),
    onProgress: summary => { console.log(JSON.stringify({ actions: summary.actions })); },
    act: async (phase, item, publication) => {
      if (phase === 'schedule') {
        const parentSource = item.sourceKey.split('/').slice(0, 2).join('/') + '/longform';
        const parent = plan.entries.find(entry => entry.sourceKey === parentSource);
        const parentReceipt = parent ? await storage.load(parent.oldVideo.id) : null;
        return scheduleReplacement(youtube, item, { publication, load: storage.load, save: storage.save, parentNewId: parentReceipt?.newId });
      }
      if (phase === 'audit' && !playlists) playlists = await inspectPlaylists(youtube);
      return actions[phase](youtube, item, { commit, playlists, load: storage.load, save: storage.save,
        getBytes, getMedia: async media => Readable.from(await getBytes(media)),
        loadControl: async () => (await readJson('control.json')) ?? {},
        saveControl: value => storage.put(`${storage.prefix}control.json`, json(value)),
      });
    },
  });
  // Public repository: only counts and fixed reason codes go to Actions logs.
  console.log(JSON.stringify(summary));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `YouTube delivery (${commit ? 'apply' : 'dry-run'})\n\n\`\`\`json\n${JSON.stringify(summary, null, 2)}\n\`\`\`\n\nPrivate receipts contain the review queue; no private video IDs are exported.\n`);
}
main().catch(async error => {
  // API error messages can contain private IDs. Never use a plaintext fallback.
  if (storage && commit) {
    try { await storage.put(`${storage.prefix}delivery-error.json`, json({ checkedAt: new Date().toISOString(), message: error.message, status: error.response?.status, reasons: error.response?.data?.error?.errors?.map(e => e.reason) })); } catch { /* Retain earlier durable journal. */ }
  }
  console.error('YouTube delivery stopped. Inspect the private delivery journal; raw API errors are not public.');
  process.exitCode = 1;
});
