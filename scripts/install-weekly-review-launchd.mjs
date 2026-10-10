#!/usr/bin/env node
/**
 * install-weekly-review-launchd.mjs — 週次レビュー（/weekly-review と /plan-weekly）を Mac のヘッドレスの Claude Code で
 * 毎週土曜に回すジョブを launchd へ登録する。
 * ---------------------------------------------------------------------------
 * 中身は scripts/scheduled/weekly-review.sh（なぜ Mac で回すかは同ファイル冒頭）。登録の手順は note の週次同期の
 * インストーラと同じで、plist の絶対パスは端末ごとに違うため template から描画し、リポジトリにはコミットしない。
 *
 * 時刻は毎週土曜 9:30。Mac が寝ていた・閉じていた週は、次に起きたときに launchd が 1 回だけ実行する。
 * 今週のレビューが develop に既にあれば何もしない。電源が切れていた週は、月曜の weekly-review-guard が赤で出す。
 *
 * 使い方:
 *   npm run weekly-review:install                  # 登録（再登録も同じコマンド）。前提: Claude Code にログイン済み・gh にログイン済み
 *   npm run weekly-review:install -- --status      # 登録状況
 *   npm run weekly-review:install -- --run-now     # 今すぐ 1 回走らせる（ログ: ~/Library/Logs/doboku-note/weekly-review.log）
 *   npm run weekly-review:install -- --uninstall   # 解除（専用 worktree は残す。消すなら git worktree remove --force）
 *
 * exit: 0 成功 / 1 失敗 / 2 検査不成立（macOS 以外＝launchd が無い）
 * ---------------------------------------------------------------------------
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { join } from 'node:path';

import { REPO_ROOT } from './lib/repository-paths.mjs';

const LABEL = 'com.doboku-note.weekly-review';
const TAG = '[weekly-review:install]';
const HOME = homedir();
const PLIST_PATH = join(HOME, 'Library', 'LaunchAgents', `${LABEL}.plist`);
const TEMPLATE = join(REPO_ROOT, 'scripts', 'scheduled', `${LABEL}.plist.tmpl`);
const LOG = '~/Library/Logs/doboku-note/weekly-review.log';
const argv = process.argv.slice(2);

if (process.platform !== 'darwin') {
  console.error(`${TAG} launchd は macOS 専用（現在 ${process.platform}）。検査不成立。`);
  console.error(`${TAG} 他 OS では scripts/scheduled/weekly-review.sh を任意のスケジューラから叩く。`);
  process.exit(2);
}

const domain = `gui/${userInfo().uid}`;
const launchctl = (...args) => spawnSync('launchctl', args, { encoding: 'utf-8' });

if (argv.includes('--status')) {
  const r = launchctl('print', `${domain}/${LABEL}`);
  if (r.status === 0) {
    const lines = r.stdout.split('\n').filter((l) => /state|last exit|path =|runs =/.test(l));
    console.log(`${TAG} 登録済み\n${lines.map((l) => `  ${l.trim()}`).join('\n')}\n  ログ: ${LOG}`);
    process.exitCode = 0;
  } else {
    console.log(`${TAG} 未登録。導入: npm run weekly-review:install`);
    process.exitCode = 1;
  }
} else if (argv.includes('--uninstall')) {
  launchctl('bootout', `${domain}/${LABEL}`);
  if (existsSync(PLIST_PATH)) rmSync(PLIST_PATH);
  console.log(`${TAG} 解除した（${PLIST_PATH} を削除）。土曜の自動の週次レビューは止まる（月曜の guard が欠けを赤で出す）。`);
} else if (argv.includes('--run-now')) {
  const r = launchctl('kickstart', '-k', `${domain}/${LABEL}`);
  if (r.status !== 0) {
    console.error(`${TAG} ✗ 実行できない（未登録？）: ${(r.stderr || '').trim()}`);
    process.exitCode = 1;
  } else {
    console.log(`${TAG} 実行した。ログ: ${LOG}`);
  }
} else {
  if (!existsSync(TEMPLATE)) {
    console.error(`${TAG} ✗ テンプレートが無い: ${TEMPLATE}`);
    process.exit(1);
  }
  const plist = readFileSync(TEMPLATE, 'utf-8').replaceAll('__REPO__', REPO_ROOT).replaceAll('__HOME__', HOME);
  mkdirSync(join(HOME, 'Library', 'LaunchAgents'), { recursive: true });
  mkdirSync(join(HOME, 'Library', 'Logs', 'doboku-note'), { recursive: true });
  writeFileSync(PLIST_PATH, plist);

  // 既存を落としてから入れ直す（bootout は未登録なら失敗するので結果は見ない）。
  launchctl('bootout', `${domain}/${LABEL}`);
  const boot = launchctl('bootstrap', domain, PLIST_PATH);
  if (boot.status !== 0) {
    console.error(`${TAG} ✗ bootstrap 失敗: ${(boot.stderr || '').trim()}`);
    process.exit(1);
  }
  console.log(
    `${TAG} ✓ 登録した（毎週土曜 9:30・寝ていた週は起床時に 1 回）\n` +
      `  plist: ${PLIST_PATH}\n` +
      `  log:   ${LOG}\n` +
      '  最初に一度: npm run weekly-review:install -- --run-now でログを確認（今週のレビューが develop にあれば何もしない）',
  );
}
