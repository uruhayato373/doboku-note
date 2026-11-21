#!/usr/bin/env node
// X側は読み取り専用。投稿の状態はコンテンツ台帳（loadXPosts）から読む。結果はローカル再生成物 .tmp/x-queue-health/latest.json。
import fs from 'node:fs';
import path from 'node:path';
import { readScheduledQueue } from '../lib/x-scheduled-queue.mjs';
import { assessQueueHealth } from '../lib/x-queue-health.mjs';
import { readDataset } from '../lib/dataset-io.mjs';
import { REPO_ROOT as root } from '../lib/repository-paths.mjs';
import { loadXPosts } from '../lib/registry-x-store.mjs';

const out = path.join(root, '.tmp/x-queue-health/latest.json');
let report;
try {
  const { handle } = readDataset(root, 'config.x-account');
  const tweets = loadXPosts(root).map(p => ({ ref: `${p.folder}/${p.key}`, text: p.text, scheduled_at: p.publishAt, phase: p.phase }));
  if (!tweets.length) throw new Error('投稿台帳を1件も検査できません');
  const snapshot = await readScheduledQueue({ root });
  report = assessQueueHealth({ snapshot, tweets, account: handle });
  process.exitCode = report.issues.length ? 1 : 0;
} catch (error) {
  report = { status: 'BLOCKED', attemptedAt: new Date().toISOString(), error: error.message };
  process.exitCode = 2;
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(`${out}.tmp`, `${JSON.stringify(report, null, 2)}\n`);
fs.renameSync(`${out}.tmp`, out); // 失敗時も古いPASSを残さない
console.log(JSON.stringify(report, null, 2));
