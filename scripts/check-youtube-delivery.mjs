#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { migrationStorage } from './lib/youtube-migration-storage.mjs';
import { sha256, assertPlan } from './lib/youtube-migration.mjs';
import { assessDelivery } from './lib/youtube-delivery-check.mjs';

const args = process.argv.slice(2), option = key => args.includes(key) ? args[args.indexOf(key) + 1] : null;
try {
  const config = JSON.parse(readFileSync('.claude/config/youtube-delivery.json'));
  let stateBytes, planBytes;
  if (option('--state')) {
    if (!option('--plan')) throw new Error('Offline state requires its frozen plan');
    stateBytes = readFileSync(option('--state')); planBytes = readFileSync(option('--plan'));
  } else {
    const storage = migrationStorage();
    [stateBytes, planBytes] = await Promise.all([storage.get(`${storage.prefix}delivery-state.json`), storage.get(`${storage.prefix}plans/${config.planSha256}.json`)]);
  }
  if (!stateBytes || !planBytes || sha256(planBytes) !== config.planSha256) throw new Error('Missing/inconsistent evidence');
  const plan = JSON.parse(planBytes); assertPlan(plan);
  const result = assessDelivery(JSON.parse(stateBytes), { planSha256: config.planSha256, total: plan.entries.length, requireDeleted: args.includes('--require-deleted') });
  console.log(JSON.stringify(result));
  process.exitCode = result.code;
} catch {
  console.error('YouTube deletion verification not established. Supply private storage credentials, or --state and --plan. No private IDs are printed.');
  process.exitCode = 2;
}
