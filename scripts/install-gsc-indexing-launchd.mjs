#!/usr/bin/env node
/**
 * install-gsc-indexing-launchd.mjs — 登録リクエストの日次送信を launchd へ登録する。
 * ---------------------------------------------------------------------------
 * なぜ日次か: 未クロールの URL が 200 件近くあり、土曜の週 10 件では 5 か月かかる（2026-11-04）。
 * 登録リクエストは API が無く、ログインしたブラウザの Mac でしか送れない。
 *
 * 使い方:
 *   npm run gsc-indexing:install                  # 登録（再登録も同じコマンド）
 *   npm run gsc-indexing:install -- --status      # 登録状況
 *   npm run gsc-indexing:install -- --run-now     # 今すぐ 1 回走らせる
 *   npm run gsc-indexing:install -- --uninstall   # 解除
 *
 * exit: 0 成功 / 1 失敗 / 2 検査不成立（macOS 以外＝launchd が無い）
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { join } from 'node:path';

import { REPO_ROOT } from './lib/repository-paths.mjs';

const LABEL = 'com.doboku-note.gsc-indexing';
const HOME = homedir();
const PLIST_PATH = join(HOME, 'Library', 'LaunchAgents', `${LABEL}.plist`);
const TEMPLATE = join(REPO_ROOT, 'scripts', 'scheduled', `${LABEL}.plist.tmpl`);
const argv = process.argv.slice(2);

if (process.platform !== 'darwin') {
  console.error(`[gsc-indexing:install] launchd は macOS 専用（現在 ${process.platform}）。検査不成立。`);
  process.exit(2);
}

const uid = userInfo().uid;
const domain = `gui/${uid}`;
const launchctl = (...args) => spawnSync('launchctl', args, { encoding: 'utf-8' });

if (argv.includes('--status')) {
  const r = launchctl('print', `${domain}/${LABEL}`);
  if (r.status === 0) {
    const lines = r.stdout.split('\n').filter((l) => /state|last exit|path =|runs =/.test(l));
    console.log(`[gsc-indexing:install] 登録済み\n${lines.map((l) => `  ${l.trim()}`).join('\n')}`);
    process.exit(0);
  }
  console.log('[gsc-indexing:install] 未登録。導入: npm run gsc-indexing:install');
  process.exit(1);
}

if (argv.includes('--uninstall')) {
  launchctl('bootout', `${domain}/${LABEL}`);
  if (existsSync(PLIST_PATH)) rmSync(PLIST_PATH);
  console.log(`[gsc-indexing:install] 解除した（${PLIST_PATH} を削除）。日次の送信は止まる（土曜の収集の 10 件は残る）。`);
  process.exit(0);
}

if (argv.includes('--run-now')) {
  const r = launchctl('kickstart', '-k', `${domain}/${LABEL}`);
  if (r.status !== 0) {
    console.error(`[gsc-indexing:install] ✗ 実行できない（未登録？）: ${(r.stderr || '').trim()}`);
    process.exit(1);
  }
  console.log(`[gsc-indexing:install] 実行した。ログ: ~/Library/Logs/doboku-note/gsc-indexing.log`);
  process.exit(0);
}

// --- install ---------------------------------------------------------------
if (!existsSync(TEMPLATE)) {
  console.error(`[gsc-indexing:install] ✗ テンプレートが無い: ${TEMPLATE}`);
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
  console.error(`[gsc-indexing:install] ✗ bootstrap 失敗: ${(boot.stderr || '').trim()}`);
  process.exit(1);
}
console.log(
  `[gsc-indexing:install] ✓ 登録した（毎日 07:40）\n` +
    `  plist: ${PLIST_PATH}\n` +
    `  log:   ~/Library/Logs/doboku-note/gsc-indexing.log\n` +
    '  確認:  npm run gsc-indexing:install -- --status / 即実行: -- --run-now',
);
