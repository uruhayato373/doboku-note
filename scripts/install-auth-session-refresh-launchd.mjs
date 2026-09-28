#!/usr/bin/env node
/**
 * install-auth-session-refresh-launchd.mjs — ログイン維持（A8 / もしも / KDP / note / ココナラ）を launchd へ登録する。
 * Windows で実行したときは install-auth-session-refresh-task.mjs（タスクスケジューラ）へ切り替える。
 * ---------------------------------------------------------------------------
 * 中身は scripts/auth-session-refresh.mjs（なぜ Mac で回すかは同ファイル冒頭）。手順は
 * install-gsc-local-launchd.mjs と同じで、plist の絶対パスは端末ごとに違うため template から描画し、
 * リポジトリにはコミットしない。
 *
 * 時刻は毎日 17:45（stats47 の 17:30 の直後）と Mac へのログイン時。寝ていた日は起きたときに 1 回走る。
 * 登録するとすぐ 1 回走る（RunAtLoad）。state が切れていればキーチェーンの ID/PW でログインする。
 *
 * 使い方:
 *   npm run auth-refresh:install                  # 登録（再登録も同じコマンド）。前提: キーチェーン登録（auth-session-refresh.mjs 冒頭）
 *   npm run auth-refresh:install -- --status      # 登録状況
 *   npm run auth-refresh:install -- --run-now     # 今すぐ 1 回走らせる（ログ: ~/Library/Logs/doboku-note/auth-session-refresh.log）
 *   npm run auth-refresh:install -- --uninstall   # 解除（専用 worktree は残す。消すなら git worktree remove --force）
 *
 * exit: 0 成功 / 1 失敗 / 2 検査不成立（macOS 以外＝launchd が無い）
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { join } from 'node:path';

import { REPO_ROOT } from './lib/repository-paths.mjs';

const LABEL = 'com.doboku-note.auth-session-refresh';
const TAG = '[auth-refresh:install]';
const HOME = homedir();
const PLIST_PATH = join(HOME, 'Library', 'LaunchAgents', `${LABEL}.plist`);
const TEMPLATE = join(REPO_ROOT, 'scripts', 'scheduled', `${LABEL}.plist.tmpl`);
const LOG = '~/Library/Logs/doboku-note/auth-session-refresh.log';
const argv = process.argv.slice(2);

if (process.platform === 'win32') {
  // Windows はタスクスケジューラへ登録する（同じ npm run auth-refresh:install で OS を切り替える）
  const { main } = await import('./install-auth-session-refresh-task.mjs');
  process.exit(main());
}
if (process.platform !== 'darwin') {
  console.error(`${TAG} launchd は macOS 専用（現在 ${process.platform}）。検査不成立。`);
  console.error(`${TAG} キーチェーンを使うため macOS 以外では動かさない。`);
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
    console.log(`${TAG} 未登録。導入: npm run auth-refresh:install`);
    process.exitCode = 1;
  }
} else if (argv.includes('--uninstall')) {
  launchctl('bootout', `${domain}/${LABEL}`);
  if (existsSync(PLIST_PATH)) rmSync(PLIST_PATH);
  console.log(`${TAG} 解除した（${PLIST_PATH} を削除）。ログインの自動維持は止まる。`);
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
    `${TAG} ✓ 登録した（毎日 17:45・ログイン時・寝ていた日は起床時に 1 回。登録直後にも 1 回走る）\n` +
      `  plist: ${PLIST_PATH}\n` +
      `  log:   ${LOG}\n` +
      '  結果はログで確認する（切れていればキーチェーンでログインし、失敗は通知センターに出る）',
  );
}
