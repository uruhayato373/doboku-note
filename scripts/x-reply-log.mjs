#!/usr/bin/env node
/**
 * x-reply-log.mjs
 *
 * X の返信の送信記録と、送信前の門番。記録に相手の ID は残さず、ハッシュだけを持つ。
 *
 * Usage:
 *   npm run x-reply-log -- --check --user <screenName>     # 送ってよいか（だめなら exit 1）
 *   npm run x-reply-log -- --check --user <screenName> --answer  # 返信した相手からの質問に答えてよいか
 *   npm run x-reply-log -- --add --user <screenName> --target <statusId> --reply <statusId> --kind ask|pass|fail|study|answer --topic <資格の id> --text "<送った文面>"
 *   npm run x-reply-log -- --skip --user <screenName> --reason situation|offtopic|supplier|not-self|other  # 見送りを記録
 *   npm run x-reply-log -- --report                        # 件数の集計（種類別・資格別）
 */
import { parseCliArgs } from './lib/cli-args.mjs';
import { readDataset, readDatasetIf } from './lib/dataset-io.mjs';
import { writeDataset } from './lib/dataset-write.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { checkSendAllowed, hashUser } from './lib/x-reply-candidates.mjs';

const flags = parseCliArgs({
  check: { type: 'boolean' },
  add: { type: 'boolean' },
  report: { type: 'boolean' },
  skip: { type: 'boolean' },
  reason: { type: 'string' },
  user: { type: 'string' },
  target: { type: 'string' },
  reply: { type: 'string' },
  kind: { type: 'string' },
  topic: { type: 'string' },
  text: { type: 'string' },
  answer: { type: 'boolean' },
});

const config = readDataset(REPO_ROOT, 'config.x-reply-trial');
const log = readDatasetIf(REPO_ROOT, 'x.reply-log') ?? { schemaVersion: 1, replies: [], skips: [] };
const REASONS = ['situation', 'offtopic', 'supplier', 'not-self', 'other'];
const TOPICS = (config.topics ?? []).map((t) => t.id);

function usage(message) {
  console.error(message);
  process.exitCode = 2;
}

if (flags.check) {
  if (!flags.user) usage('--user が要ります');
  else {
    const reason = checkSendAllowed(log.replies, { user: flags.user, now: Date.now(), limits: config.limits, trial: config.trial, skips: log.skips, answer: Boolean(flags.answer) });
    if (reason) {
      console.error(`BLOCK: ${reason}`);
      process.exitCode = 1;
    } else console.log('OK: 送信できます');
  }
} else if (flags.add) {
  if (!flags.user || !flags.target || !flags.reply || !['ask', 'pass', 'fail', 'study', 'answer'].includes(flags.kind) || !flags.text?.trim() || !TOPICS.includes(flags.topic)) {
    usage(`--user・--target・--reply・--text（送った文面）と --kind ask|pass|fail|study|answer、--topic ${TOPICS.join('|')} が要ります`);
  } else {
    log.replies.push({
      at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
      kind: flags.kind,
      topic: flags.topic,
      targetId: flags.target,
      replyId: flags.reply,
      userHash: hashUser(flags.user),
      text: flags.text.trim(),
    });
    writeDataset(REPO_ROOT, 'x.reply-log', log);
    console.log(`記録しました（全 ${log.replies.length} 件）`);
  }
} else if (flags.skip) {
  if (!flags.user || !REASONS.includes(flags.reason)) {
    usage(`--user と --reason ${REASONS.join('|')} が要ります`);
  } else if (log.skips.some((r) => r.userHash === hashUser(flags.user))) {
    console.log('すでに見送りにしています');
  } else {
    log.skips.push({ at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), reason: flags.reason, userHash: hashUser(flags.user) });
    writeDataset(REPO_ROOT, 'x.reply-log', log);
    console.log(`見送りを記録しました（全 ${log.skips.length} 件）`);
  }
} else if (flags.report) {
  const byKind = Object.groupBy(log.replies, (r) => r.kind);
  const summary = Object.entries(byKind).map(([k, v]) => `${k} ${v.length}`).join('・');
  const byTopic = Object.groupBy(log.replies, (r) => r.topic);
  const topics = Object.entries(byTopic).map(([k, v]) => `${k} ${v.length}`).join('・');
  console.log(`返信 ${log.replies.length} 件（${summary || '記録なし'}）・見送り ${log.skips.length} 件`);
  if (topics) console.log(`資格別: ${topics}`);
} else {
  usage('使い方: npm run x-reply-log -- --check|--add|--skip|--report');
}
