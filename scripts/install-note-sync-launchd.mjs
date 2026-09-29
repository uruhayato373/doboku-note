#!/usr/bin/env node
/**
 * install-note-sync-launchd.mjs — note の記事単位の週次同期（本文・カバー・タグを 1 記事 1 回で反映）を launchd へ登録する。
 * ---------------------------------------------------------------------------
 * 中身は scripts/note-sync-routine.mjs（なぜ Mac で回すかは同ファイル冒頭）。手順は
 * install-gsc-local-launchd.mjs と同じで、plist の絶対パスは端末ごとに違うため template から描画し、
 * リポジトリにはコミットしない。
 *
 * 時刻は毎週日曜 3:00。Mac が寝ていた・閉じていた週は、次に起きたときに launchd が 1 回だけ実行する。
 * 電源が切れていた週は動かず、CI の note-sync-live（check-note-sync・週次）が反映待ちの残りを赤で出す。
 *
 * 使い方:
 *   npm run note-sync:install                  # 登録（再登録も同じコマンド）。前提: note にログイン済みのプロファイル
 *   npm run note-sync:install -- --status      # 登録状況
 *   npm run note-sync:install -- --run-now     # 今すぐ 1 回走らせる（ログ: ~/Library/Logs/doboku-note/note-sync.log）
 *   npm run note-sync:install -- --uninstall   # 解除（専用 worktree は残す。消すなら git worktree remove --force）
 *
 * exit: 0 成功 / 1 失敗 / 2 検査不成立（macOS 以外＝launchd が無い）
 * ---------------------------------------------------------------------------
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { join } from 'node:path';

import { REPO_ROOT } from './lib/repository-paths.mjs';

const LABEL = 'com.doboku-note.note-sync';
const TAG = '[note-sync:install]';
const HOME = homedir();
const PLIST_PATH = join(HOME, 'Library', 'LaunchAgents', `${LABEL}.plist`);
const TEMPLATE = join(REPO_ROOT, 'scripts', 'scheduled', `${LABEL}.plist.tmpl`);
const LOG = '~/Library/Logs/doboku-note/note-sync.log';
const argv = process.argv.slice(2);

if (process.platform !== 'darwin') {
  console.error(`${TAG} launchd は macOS 専用（現在 ${process.platform}）。検査不成立。`);
  console.error(`${TAG} 他 OS では scripts/scheduled/note-sync.sh 相当（worktree で node scripts/note-sync-routine.mjs）を任意のスケジューラから叩く。`);
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
    console.log(`${TAG} 未登録。導入: npm run note-sync:install`);
    process.exitCode = 1;
  }
} else if (argv.includes('--uninstall')) {
  launchctl('bootout', `${domain}/${LABEL}`);
  if (existsSync(PLIST_PATH)) rmSync(PLIST_PATH);
  console.log(`${TAG} 解除した（${PLIST_PATH} を削除）。note の週次同期は止まる。`);
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
    `${TAG} ✓ 登録した（毎週日曜 3:00・寝ていた週は起床時に 1 回）\n` +
      `  plist: ${PLIST_PATH}\n` +
      `  log:   ${LOG}\n` +
      '  最初に一度: npm run note-sync:install -- --run-now でログを確認（反映待ちがあれば Chrome が開き、件数により数時間かかる）',
  );
}
