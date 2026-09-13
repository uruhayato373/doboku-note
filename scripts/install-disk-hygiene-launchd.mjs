#!/usr/bin/env node
/**
 * install-disk-hygiene-launchd.mjs — 日次のディスク掃除を launchd へ登録する。
 * ---------------------------------------------------------------------------
 * なぜ launchd か: 掃除を Claude Code の SessionStart フックに載せると Codex で作業した分は
 *   永久に掃除されない（実測で Codex の worktree が 8.6GB 溜まっていた）。ツールに依存しない
 *   面が要る。plist の絶対パスは端末ごとに違うので、テンプレートから install 時に描画し
 *   リポジトリにはコミットしない。
 *
 * 使い方:
 *   npm run disk-hygiene:install                  # 登録（再登録も同じコマンド）
 *   npm run disk-hygiene:install -- --status      # 登録状況
 *   npm run disk-hygiene:install -- --run-now     # 今すぐ 1 回走らせる
 *   npm run disk-hygiene:install -- --uninstall   # 解除
 *
 * exit: 0 成功 / 1 失敗 / 2 検査不成立（macOS 以外＝launchd が無い）
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { join } from 'node:path';

import { REPO_ROOT } from './lib/repository-paths.mjs';

const LABEL = 'com.doboku-note.disk-hygiene';
const HOME = homedir();
const PLIST_PATH = join(HOME, 'Library', 'LaunchAgents', `${LABEL}.plist`);
const TEMPLATE = join(REPO_ROOT, 'scripts', 'scheduled', `${LABEL}.plist.tmpl`);
const argv = process.argv.slice(2);

if (process.platform !== 'darwin') {
  console.error(`[disk-hygiene:install] launchd は macOS 専用（現在 ${process.platform}）。検査不成立。`);
  console.error('[disk-hygiene:install] 他 OS では `npm run disk-hygiene:fix` を任意のスケジューラから叩く。');
  process.exit(2);
}

const uid = userInfo().uid;
const domain = `gui/${uid}`;
const launchctl = (...args) => spawnSync('launchctl', args, { encoding: 'utf-8' });

if (argv.includes('--status')) {
  const r = launchctl('print', `${domain}/${LABEL}`);
  if (r.status === 0) {
    const lines = r.stdout.split('\n').filter((l) => /state|last exit|path =|runs =/.test(l));
    console.log(`[disk-hygiene:install] 登録済み\n${lines.map((l) => `  ${l.trim()}`).join('\n')}`);
    process.exit(0);
  }
  console.log('[disk-hygiene:install] 未登録。導入: npm run disk-hygiene:install');
  process.exit(1);
}

if (argv.includes('--uninstall')) {
  launchctl('bootout', `${domain}/${LABEL}`);
  if (existsSync(PLIST_PATH)) rmSync(PLIST_PATH);
  console.log(`[disk-hygiene:install] 解除した（${PLIST_PATH} を削除）。日次掃除は止まる。`);
  process.exit(0);
}

if (argv.includes('--run-now')) {
  const r = launchctl('kickstart', '-k', `${domain}/${LABEL}`);
  if (r.status !== 0) {
    console.error(`[disk-hygiene:install] ✗ 実行できない（未登録？）: ${(r.stderr || '').trim()}`);
    process.exit(1);
  }
  console.log(`[disk-hygiene:install] 実行した。ログ: ~/Library/Logs/doboku-note/disk-hygiene.log`);
  process.exit(0);
}

// --- install ---------------------------------------------------------------
if (!existsSync(TEMPLATE)) {
  console.error(`[disk-hygiene:install] ✗ テンプレートが無い: ${TEMPLATE}`);
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
  console.error(`[disk-hygiene:install] ✗ bootstrap 失敗: ${(boot.stderr || '').trim()}`);
  process.exit(1);
}
console.log(
  `[disk-hygiene:install] ✓ 登録した（毎日 04:17）\n` +
    `  plist: ${PLIST_PATH}\n` +
    `  log:   ~/Library/Logs/doboku-note/disk-hygiene.log\n` +
    '  確認:  npm run disk-hygiene:install -- --status / 即実行: -- --run-now',
);
