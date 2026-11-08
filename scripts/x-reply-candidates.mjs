#!/usr/bin/env node
/**
 * x-reply-candidates.mjs
 *
 * X の返信候補を、資格ごとの話題（config/x-reply-trial.json の topics）で集める。読むだけで送信はしない。
 *   1. Yahoo!リアルタイム検索（X のアカウントを使わない）を話題ごとの検索語で引く
 *   2. 内蔵ブラウザで読んだ X のタイムライン・検索（最新）の投稿を .tmp/x-outreach/x-posts/*.json から取り込む
 *      （取り出しは .claude/skills/social/x-reply/references/extract-x-posts.js。lookbackHours より古いファイルは読まない）
 * 手順は .claude/skills/social/x-reply/SKILL.md。
 *
 * 出力: .tmp/x-outreach/candidates.json（個人の投稿を含むので Git に入れない）
 * exit: 0 検索できた（候補 0 件も含む） / 1 取得失敗が支配的で検査不成立
 *
 * Usage: npm run x-reply-candidates [-- --x-posts <dir>] [-- --all]（--all は話題ごと・全体の上限を外して全部出す）
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { readDataset, readDatasetIf } from './lib/dataset-io.mjs';
import { fetchFailDominant } from './lib/inconclusive-gate.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { X_HANDLE } from './lib/site-identity.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { qualificationShortLabel } from './lib/qualification-names.mjs';
import { parseRealtimeHtml, parseXPosts, selectCandidates } from './lib/x-reply-candidates.mjs';

const OUT = path.join(REPO_ROOT, '.tmp', 'x-outreach', 'candidates.json');
const UA = 'Mozilla/5.0 (compatible; doboku-note-research/1.0)';

const flags = parseCliArgs({ 'x-posts': { type: 'string' }, all: { type: 'boolean' } });
const X_POSTS_DIR = path.resolve(REPO_ROOT, flags.xPosts ?? path.join('.tmp', 'x-outreach', 'x-posts'));
// 話題の表示名は資格の台帳から引く（設定に名前を写さない・check-qualification-ssot）
const registry = readDataset(REPO_ROOT, 'config.qualification-registry');
const rawConfig = readDataset(REPO_ROOT, 'config.x-reply-trial');
const limits = flags.all ? { ...rawConfig.limits, perTopic: Number.MAX_SAFE_INTEGER, candidatesPerRun: Number.MAX_SAFE_INTEGER } : rawConfig.limits;
const config = { ...rawConfig, limits, topics: rawConfig.topics.map((t) => ({ ...t, label: t.qualifications.map((id) => qualificationShortLabel(registry, id)).join('・') })) };
const log = readDatasetIf(REPO_ROOT, 'x.reply-log') ?? { replies: [], skips: [] };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function search(query) {
  const url = `https://search.yahoo.co.jp/realtime/search?p=${encodeURIComponent(query)}&ei=UTF-8`;
  const html = execFileSync('curl', ['-sS', '--ssl-no-revoke', '--max-time', '25', '-A', UA, url], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  const posts = parseRealtimeHtml(html);
  if (!posts) throw new Error('ページの構造が想定と違います');
  return posts;
}

const posts = [];
let failed = 0;
const queries = config.topics.flatMap((t) => t.queries.map((q) => ({ topic: t.id, label: t.label, q })));
for (const { topic, label, q } of queries) {
  try {
    const found = search(q);
    posts.push(...found.map((p) => ({ ...p, topic, source: 'yahoo' })));
    console.log(`  [${label}] ${q}: ${found.length} 件`);
  } catch (error) {
    failed += 1;
    console.error(`  [${label}] ${q}: 失敗（${error.message}）`);
  }
  await sleep(1500 + Math.random() * 1500);
}
console.log(`Yahoo 検索 ${queries.length - failed}/${queries.length} 語を実行`);

// 内蔵ブラウザで保存した X のタイムライン・検索の投稿。古いファイル（lookbackHours 超）は読まない
let xFiles = 0;
let xInvalid = 0;
if (fs.existsSync(X_POSTS_DIR)) {
  const since = Date.now() - config.limits.lookbackHours * 3600_000;
  for (const name of fs.readdirSync(X_POSTS_DIR).filter((n) => n.endsWith('.json'))) {
    const file = path.join(X_POSTS_DIR, name);
    if (fs.statSync(file).mtimeMs < since) continue;
    let rows;
    try {
      rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      console.error(`  X の投稿 ${name}: JSON として読めない（飛ばす）`);
      continue;
    }
    const { posts: found, invalid } = parseXPosts(rows);
    xFiles += 1;
    xInvalid += invalid;
    posts.push(...found);
    console.log(`  X ${name}: ${found.length} 件${invalid ? `（形の合わない ${invalid} 件を捨てた）` : ''}`);
  }
}
console.log(`X のタイムライン・検索 ${xFiles} ファイルを取り込み${xFiles === 0 ? '（無し。内蔵ブラウザで読むとここに足される）' : ''}`);

if (fetchFailDominant(failed, queries.length)) {
  console.error('取得失敗が多いので検査不成立です。候補は書き出しません。');
  process.exitCode = 1;
} else {
  const { candidates, counts, excluded } = selectCandidates(posts, { ...config, excludeAccounts: [...config.excludeAccounts, X_HANDLE] }, {
    now: Date.now(),
    repliedHashes: new Set(log.replies.map((r) => r.userHash)),
    skippedHashes: new Set(log.skips.map((r) => r.userHash)),
  });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify({ collectedAt: new Date().toISOString(), counts, candidates }, null, 2)}\n`);

  // 外した投稿（理由つき・配慮の投稿は本文を残さない）。語の調整に読む
  fs.writeFileSync(path.join(path.dirname(OUT), 'excluded.json'), `${JSON.stringify(excluded, null, 2)}\n`);
  console.log(`投稿 ${counts.total} 件を判定 / 候補 ${candidates.length} 件`);
  console.log(`除外: 古い ${counts.old}・返信済みの相手 ${counts.replied}・見送り済みの相手 ${counts.skipped}・配慮 ${counts.care}・講座や宣伝 ${counts.supplier}・返信やリポスト ${counts.reply}・場面が合わない ${counts.other}・どの資格にも当たらない ${counts.offTopic}・上限超え ${counts.overTopicLimit}`);
  const byTopic = Object.groupBy(candidates, (c) => c.topicLabel ?? '（話題なし）');
  for (const [label, list] of Object.entries(byTopic)) console.log(`  ${label}: ${list.length} 件（${Object.entries(Object.groupBy(list, (c) => c.kind)).map(([k, v]) => `${k} ${v.length}`).join('・')}）`);
  if (candidates.length === 0) console.log('対象 0 件でした（失敗ではありません）。');
  console.log(`書き出し: ${path.relative(REPO_ROOT, OUT)}`);
}
