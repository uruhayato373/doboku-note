#!/usr/bin/env node
/**
 * x-reply-candidates.mjs
 *
 * X の返信候補を Yahoo!リアルタイム検索から集める（X のアカウントを使わない・読むだけ）。
 * 候補を出すところまでで、送信はしない。手順は .claude/skills/social/x-reply/SKILL.md。
 *
 * 出力: .tmp/x-outreach/candidates.json（個人の投稿を含むので Git に入れない）
 * exit: 0 検索できた（候補 0 件も含む） / 1 取得失敗が支配的で検査不成立
 *
 * Usage: npm run x-reply-candidates
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { readDataset, readDatasetIf } from './lib/dataset-io.mjs';
import { fetchFailDominant } from './lib/inconclusive-gate.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { X_HANDLE } from './lib/site-identity.mjs';
import { parseRealtimeHtml, selectCandidates } from './lib/x-reply-candidates.mjs';

const OUT = path.join(REPO_ROOT, '.tmp', 'x-outreach', 'candidates.json');
const UA = 'Mozilla/5.0 (compatible; doboku-note-research/1.0)';

const config = readDataset(REPO_ROOT, 'config.x-reply-trial');
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
for (const query of config.queries) {
  try {
    const found = search(query);
    posts.push(...found);
    console.log(`  ${query}: ${found.length} 件`);
  } catch (error) {
    failed += 1;
    console.error(`  ${query}: 失敗（${error.message}）`);
  }
  await sleep(1500 + Math.random() * 1500);
}

console.log(`検索 ${config.queries.length - failed}/${config.queries.length} 語を実行`);
if (fetchFailDominant(failed, config.queries.length)) {
  console.error('取得失敗が多いので検査不成立です。候補は書き出しません。');
  process.exitCode = 1;
} else {
  const { candidates, counts } = selectCandidates(posts, { ...config, excludeAccounts: [...config.excludeAccounts, X_HANDLE] }, {
    now: Date.now(),
    repliedHashes: new Set(log.replies.map((r) => r.userHash)),
    skippedHashes: new Set(log.skips.map((r) => r.userHash)),
  });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify({ collectedAt: new Date().toISOString(), counts, candidates }, null, 2)}\n`);

  console.log(`投稿 ${counts.total} 件を判定 / 候補 ${candidates.length} 件`);
  console.log(`除外: 古い ${counts.old}・返信済みの相手 ${counts.replied}・見送り済みの相手 ${counts.skipped}・配慮 ${counts.care}・講座や宣伝 ${counts.supplier}・返信やリポスト ${counts.reply}・無関係 ${counts.other}`);
  if (candidates.length === 0) console.log('対象 0 件でした（失敗ではありません）。');
  console.log(`書き出し: ${path.relative(REPO_ROOT, OUT)}`);
}
