#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { google } from 'googleapis';
import { createEnvelopeKeys, sealReport, openReport } from './lib/youtube-rollout-envelope.mjs';
import { channelInventory } from './lib/youtube-channel-inventory.mjs';
import { loadCoverSources, buildCoverPlan, specDigest } from './lib/youtube-cover-rollout.mjs';
import { renderYoutubeCover } from './lib/youtube-cover.mjs';
import { fetchThumbnail, compareThumbnail } from './lib/youtube-thumbnail-image.mjs';
import { updateThumbnailBatch } from './lib/youtube-thumbnail-batch.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values: args } = parseArgs({ options: { mode: { type: 'string', default: 'inventory' },
  out: { type: 'string', default: '.tmp/youtube-rollout' }, input: { type: 'string' }, 'key-file': { type: 'string' },
  'expect-plan-sha256': { type: 'string' }, start: { type: 'string', default: '0' }, limit: { type: 'string', default: '1' },
  'only-video-id': { type: 'string' }, commit: { type: 'boolean', default: false } } });
const out = resolve(args.out);
async function main() {
  mkdirSync(out, { recursive: true });
  if (args.mode === 'keygen') {
    const path = join(out, 'keys.json');
    if (existsSync(path)) throw new Error('Key file already exists; reuse it');
    writeFileSync(path, JSON.stringify(createEnvelopeKeys()), { mode: 0o600, flag: 'wx' });
    console.log('Temporary keys generated locally; private key is not printed.');
    return;
  }
  if (args.mode === 'decrypt') {
    if (!args.input || !args['key-file']) throw new Error('--input and --key-file required');
    const keys = JSON.parse(readFileSync(resolve(args['key-file']), 'utf8'));
    const value = openReport(JSON.parse(readFileSync(resolve(args.input), 'utf8')), keys.privateKey);
    writeFileSync(join(out, 'report.json'), JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
    console.log(JSON.stringify({ decrypted: true, checked: value.checked }));
    return;
  }
  const approvalPath = join(root, '.claude/state/youtube-thumbnail-designs.json');
  if (args.mode === 'prepare') {
    if (args.commit) throw new Error('prepare cannot publish');
    const entries=[];
    for (const source of loadCoverSources(root)) {
      const rendered=await renderYoutubeCover(root,source.spec);
      const image=join(out,`${String(entries.length).padStart(4,'0')}.png`);
      writeFileSync(image,rendered.buffer);
      entries.push({sourceKey:source.sourceKey,designPath:source.designPath,key:source.key,
        specSha256:specDigest(source.spec),sha256:rendered.provenance.sha256,
        width:rendered.provenance.width,height:rendered.provenance.height,bytes:rendered.buffer.length});
      writeFileSync(join(out,'designs.json'),JSON.stringify({schemaVersion:1,entries},null,2)+'\n');
      console.log(JSON.stringify({rendered:entries.length}));
    }
    return;
  }
  if (args.mode === 'plan') {
    if (!args.input || args.commit) throw new Error('Local plan requires inventory input and no commit');
    const plan = buildCoverPlan(JSON.parse(readFileSync(resolve(args.input))), loadCoverSources(root), JSON.parse(readFileSync(approvalPath)));
    writeFileSync(join(out, 'plan.json'), JSON.stringify(plan, null, 2)+'\n', { mode: 0o600 });
    console.log(JSON.stringify({planned:plan.count,sha256:plan.sha256,changed:0})); return;
  }
  if (!['inventory','refresh'].includes(args.mode)) throw new Error('Unsupported mode');
  if (args.mode === 'inventory' && args.commit) throw new Error('Inventory cannot commit');
  if (args.mode === 'refresh' && !/^[a-f0-9]{64}$/.test(args['expect-plan-sha256'] ?? '')) throw new Error('Frozen plan SHA-256 required');
  const publicKey = process.env.YOUTUBE_REPORT_PUBLIC_KEY;
  if (!publicKey) throw new Error('Encrypted report public key required before any API call');
  sealReport({ probe: true }, publicKey);
  const env = process.env;
  if (['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'].some(k => !env[k])) throw new Error('YouTube credentials missing; inspected 0, changed 0');
  const auth = new google.auth.OAuth2(env.YOUTUBE_CLIENT_ID, env.YOUTUBE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: env.YOUTUBE_REFRESH_TOKEN });
  const expected = JSON.parse(readFileSync(join(root, 'content/sns/video-packs/civil-construction-1/koji-gaiyo-7items/youtube.json'), 'utf8')).channel;
  const trace = [];
  const knownVideoIds = new Set();
  const collect = value => {
    if (!value || typeof value !== 'object') return;
    if (value.videoId) knownVideoIds.add(value.videoId);
    for (const v of Object.values(value)) collect(v);
  };
  for (const path of ['.claude/state/video-content-status.json', '.claude/state/youtube-schedule.json']) collect(JSON.parse(readFileSync(join(root, path))));
  const youtube = google.youtube({ version: 'v3', auth });
  const result = await channelInventory(youtube, expected, { knownVideoIds: [...knownVideoIds], record: entry => {
    trace.push(entry);
    writeFileSync(join(out, 'inventory-trace.enc.json'), JSON.stringify(sealReport({ trace }, publicKey)) + '\n');
  } });
  writeFileSync(join(out, 'inventory.enc.json'), JSON.stringify(sealReport(result, publicKey)) + '\n');
  console.log(JSON.stringify({ complete: result.complete, checked: result.checked, changed: 0 }));
  if (args.mode === 'inventory') return;
  const plan = buildCoverPlan(result, loadCoverSources(root), JSON.parse(readFileSync(approvalPath)));
  const records = new Map();
  const summary = await updateThumbnailBatch(youtube, plan, {
    commit:args.commit, expectedPlanSha256:args['expect-plan-sha256'], start:Number(args.start), limit:Number(args.limit), onlyVideoId:args['only-video-id'],
    render:async spec=>(await renderYoutubeCover(root,spec)).buffer, fetchImage:fetchThumbnail, compare:compareThumbnail,
    record:report=>{
      if(!records.has(report.videoId))records.set(report.videoId,records.size);
      const index=records.get(report.videoId);
      writeFileSync(join(out,`video-${String(index).padStart(4,'0')}.enc.json`), JSON.stringify(sealReport({...report,recordedAt:new Date().toISOString()},publicKey))+'\n');
      if(['cdn-matched','accepted-cdn-pending','already-matching'].includes(report.phase)) console.log(JSON.stringify({processed:records.size,phase:report.phase}));
    },
  });
  writeFileSync(join(out,'summary.enc.json'),JSON.stringify(sealReport({planSha256:plan.sha256,...summary},publicKey))+'\n');
  console.log(JSON.stringify(summary));
}
// No Axios object/request headers/private metadata in public CI logs.
main().catch(error => {
  if (process.env.YOUTUBE_REPORT_PUBLIC_KEY) {
    try {
      const diagnostic = { complete: false, error: { message: error.message, status: error.response?.status,
        reasons: error.response?.data?.error?.errors?.map(e => e.reason) } };
      writeFileSync(join(out, 'failure.enc.json'), JSON.stringify(sealReport(diagnostic, process.env.YOUTUBE_REPORT_PUBLIC_KEY)) + '\n');
    } catch { /* A bad recipient/disk must not cause a plaintext fallback. */ }
  }
  console.error('YouTube rollout failed; no completion claim. Inspect encrypted report if present.'); process.exitCode = 1;
});
