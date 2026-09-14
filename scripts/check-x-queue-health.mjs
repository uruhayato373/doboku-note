#!/usr/bin/env node
// X側は読み取り専用。結果はローカル再生成物 .tmp/x-queue-health/latest.json。
import fs from 'node:fs';
import path from 'node:path';
import { readScheduledQueue } from './lib/x-scheduled-queue.mjs';
import { assessQueueHealth } from './lib/x-queue-health.mjs';

const root = process.cwd();
const out = path.join(root, '.tmp/x-queue-health/latest.json');
let report;
try {
  const { handle } = JSON.parse(fs.readFileSync('.claude/config/x-account.json', 'utf8'));
  const tweets = [], articles = [];
  for (const base of ['content/sns/x/draft', 'content/sns/x/published']) {
    if (!fs.existsSync(base)) continue;
    for (const dir of fs.readdirSync(base, { withFileTypes: true })) {
      if (!dir.isDirectory() || dir.name.startsWith('_') || dir.name.startsWith('.')) continue;
      const statusFile = path.join(base, dir.name, 'status.json');
      if (!fs.existsSync(statusFile)) continue;
      const state = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
      if (!state.tweets || typeof state.tweets !== 'object') throw new Error(`tweetsがない台帳: ${statusFile}`);
      for (const [key, tweet] of Object.entries(state.tweets)) tweets.push({ ...tweet, ref: `${dir.name}/${key}` });
      const articleFile = path.join(base, dir.name, 'article-drafts.json');
      if (fs.existsSync(articleFile)) {
        const data = JSON.parse(fs.readFileSync(articleFile, 'utf8'));
        if (data.account !== handle || !data.articles) throw new Error(`Article台帳のアカウント/形式不一致: ${articleFile}`);
        for (const [key, article] of Object.entries(data.articles)) {
          articles.push({ ...article, ref: `${dir.name}/Article-${key}`, teaser: state.tweets[String(article.teaser_tweet)] });
        }
      }
    }
  }
  if (!tweets.length) throw new Error('投稿台帳を1件も検査できません');
  const snapshot = await readScheduledQueue({ root });
  report = assessQueueHealth({ snapshot, tweets, articles, account: handle });
  process.exitCode = report.issues.length ? 1 : 0;
} catch (error) {
  report = { status: 'BLOCKED', attemptedAt: new Date().toISOString(), error: error.message };
  process.exitCode = 2;
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(`${out}.tmp`, `${JSON.stringify(report, null, 2)}\n`);
fs.renameSync(`${out}.tmp`, out); // 失敗時も古いPASSを残さない
console.log(JSON.stringify(report, null, 2));
