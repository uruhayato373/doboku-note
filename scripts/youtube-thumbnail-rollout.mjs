#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { google } from 'googleapis';
import { createEnvelopeKeys, sealReport, openReport } from './lib/youtube-rollout-envelope.mjs';
import { channelInventory } from './lib/youtube-channel-inventory.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values: args } = parseArgs({ options: { mode: { type: 'string', default: 'inventory' },
  out: { type: 'string', default: '.tmp/youtube-rollout' }, input: { type: 'string' }, 'key-file': { type: 'string' } } });
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
  if (args.mode !== 'inventory') throw new Error('Unsupported mode');
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
  const result = await channelInventory(google.youtube({ version: 'v3', auth }), expected, { knownVideoIds: [...knownVideoIds], record: entry => {
    trace.push(entry);
    writeFileSync(join(out, 'inventory-trace.enc.json'), JSON.stringify(sealReport({ trace }, publicKey)) + '\n');
  } });
  writeFileSync(join(out, 'inventory.enc.json'), JSON.stringify(sealReport(result, publicKey)) + '\n');
  console.log(JSON.stringify({ complete: result.complete, checked: result.checked, changed: 0 }));
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
