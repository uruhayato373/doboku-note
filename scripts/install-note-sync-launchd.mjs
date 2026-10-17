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
 *   npm run note-sync:install -- --catch-up-until 2026-10-24 # 期限まで毎日 3:00、以後は日曜だけ同期
 *   npm run note-sync:install -- --status      # 登録状況
 *   npm run note-sync:install -- --run-now     # 今すぐ 1 回走らせる（ログ: ~/Library/Logs/doboku-note/note-sync.log）
 *   npm run note-sync:install -- --uninstall   # 解除（専用 worktree は残す。消すなら git worktree remove --force）
 *
 * exit: 0 成功 / 1 失敗 / 2 検査不成立（macOS 以外＝launchd が無い）
 * ---------------------------------------------------------------------------
 */

import { spawn, spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { dirname, join } from 'node:path';

import { REPO_ROOT } from './lib/repository-paths.mjs';
import { renderNoteSyncBootstrap, renderNoteSyncPlist, validateCatchUpUntil } from './lib/note-sync-launchd.mjs';

const LABEL = 'com.doboku-note.note-sync';
const TAG = '[note-sync:install]';
const HOME = homedir();
const PLIST_PATH = join(HOME, 'Library', 'LaunchAgents', `${LABEL}.plist`);
const TEMPLATE = join(REPO_ROOT, 'scripts', 'scheduled', `${LABEL}.plist.tmpl`);
const LOG = '~/Library/Logs/doboku-note/note-sync.log';
const BOOTSTRAP = join(HOME, 'Library', 'Application Support', 'doboku-note', 'note-sync.sh');
const argv = process.argv.slice(2);
const catchUpArg = argv.indexOf('--catch-up-until');
if (catchUpArg >= 0 && !argv[catchUpArg + 1]) throw new Error('--catch-up-until に期限が必要');
const catchUpUntil = validateCatchUpUntil(catchUpArg >= 0 ? argv[catchUpArg + 1] : '');

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
  if (existsSync(BOOTSTRAP)) rmSync(BOOTSTRAP);
  console.log(`${TAG} 解除した（${PLIST_PATH} を削除）。note の週次同期は止まる。`);
} else if (argv.includes('--run-now')) {
  if (!existsSync(BOOTSTRAP) || launchctl('print', `${domain}/${LABEL}`).status !== 0) {
    console.error(`${TAG} ✗ 未登録、または旧形式。先に npm run note-sync:install を実行する`);
    process.exitCode = 1;
  } else {
    // Unlike kickstart -k, this never kills an in-flight editor update. The runner owns the lock.
    const output = openSync(join(HOME, 'Library', 'Logs', 'doboku-note', 'note-sync.launchd.out'), 'a');
    const child = spawn('/bin/bash', [BOOTSTRAP], { detached: true, stdio: ['ignore', output, output] });
    child.on('error', (error) => { console.error(`${TAG} ✗ ${error.message}`); process.exitCode = 1; });
    child.unref(); closeSync(output);
    console.log(`${TAG} 手動実行を開始した（pid ${child.pid}・実行中なら重複分は終了）。ログ: ${LOG}`);
  }
} else {
  if (!existsSync(TEMPLATE)) {
    console.error(`${TAG} ✗ テンプレートが無い: ${TEMPLATE}`);
    process.exit(1);
  }
  const common = spawnSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: REPO_ROOT, encoding: 'utf8' });
  if (common.status !== 0) throw new Error(`Git の共有メタデータを取得できない: ${common.stderr}`);
  const primaryRoot = dirname(common.stdout.trim());
  const plist = renderNoteSyncPlist(readFileSync(TEMPLATE, 'utf-8'), { repoRoot: primaryRoot, homeDir: HOME, bootstrapPath: BOOTSTRAP, catchUpUntil });
  mkdirSync(dirname(BOOTSTRAP), { recursive: true });
  writeFileSync(BOOTSTRAP, renderNoteSyncBootstrap(primaryRoot, catchUpUntil), { mode: 0o700 });
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
    `${TAG} ✓ 登録した（${catchUpUntil ? `${catchUpUntil} まで毎日 3:00、以後は日曜だけ同期` : '毎週日曜 3:00'}・睡眠時は起床後 1 回）\n` +
      `  plist: ${PLIST_PATH}\n` +
      `  log:   ${LOG}\n` +
      '  最初に一度: npm run note-sync:install -- --run-now でログを確認（反映待ちがあれば Chrome が開き、件数により数時間かかる）',
  );
}
