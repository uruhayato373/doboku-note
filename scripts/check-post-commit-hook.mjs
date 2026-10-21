#!/usr/bin/env node
// check-post-commit-hook.mjs — post-commit フック（sync-index-after-commit）が入っているかを pre-commit で確かめる（DN-0554）。
//
// 守りたい事故: #885 で install-pre-commit.mjs に post-commit を足したのに、Mac の .git/hooks には pre-commit しか
// 無かった（2026-10-07）。pre-commit に埋め込む鮮度チェックは pre-commit の本文の hash しか比べないので、post-commit
// だけが増えた版では「古い」と出ない。post-commit が無いと pathspec commit の後に index だけ古い版が残り（MM）、
// 次の commit で dateModified などが黙って戻る。
// この検査はツリーから毎 commit 読まれる（フックを入れ直さなくても効く）ので、ここで欠落・旧版を止める。
//
// 使い方: node scripts/check-post-commit-hook.mjs
// exit 0 = 入っている / 1 = 無い・sync-index-after-commit を呼んでいない

import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { isCliEntry, runAsCli } from './lib/cli-run.mjs';

export const REQUIRED_SCRIPT = 'sync-index-after-commit.mjs';

/** post-commit の本文（無ければ null）から違反を返す */
export function postCommitViolations(content) {
  if (content === null) return ['post-commit フックがありません'];
  if (!content.includes(REQUIRED_SCRIPT)) return [`post-commit フックが ${REQUIRED_SCRIPT} を呼んでいません（古い版）`];
  return [];
}

function postCommitPath() {
  // テスト用の差し替え（install-pre-commit.mjs と同じ変数）
  if (process.env.DOBOKU_HOOKS_DIR) return join(process.env.DOBOKU_HOOKS_DIR, 'post-commit');
  return execFileSync('git', ['rev-parse', '--git-path', 'hooks/post-commit'], { encoding: 'utf8' }).trim();
}

function main() {
  const path = postCommitPath();
  const violations = postCommitViolations(existsSync(path) ? readFileSync(path, 'utf8') : null);
  if (violations.length) {
    for (const v of violations) console.error(`[check-post-commit-hook] ✗ ${v}: ${path}`);
    console.error('  npm run pre-commit:install を実行してから commit してください。');
    return 1;
  }
  return 0;
}

/** pre-commit-dispatch が in-process で呼ぶ入口（process.exit を呼ばず { code } を返す・DN-0688） */
export function run() {
  return { code: main() };
}

if (isCliEntry(import.meta.url)) runAsCli(run);
