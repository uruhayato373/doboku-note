#!/usr/bin/env node
/**
 * install-weekly-review-launchd.mjs — 土曜の収集（ログインが要る取得と書き込み）と GSC の記録層を
 * 毎週土曜に回すジョブを launchd へ登録する。週次レビュー自体は運営者の指示で対話セッションが実行する（2026-11-08〜）。
 * ---------------------------------------------------------------------------
 * 中身は scripts/scheduled/weekly-review.sh（なぜ Mac で回すかは同ファイル冒頭）。登録の手順は note の週次同期の
 * インストーラと同じで、plist の絶対パスは端末ごとに違うため template から描画し、リポジトリにはコミットしない。
 *
 * 時刻は毎週土曜 9:30。Mac が寝ていた・閉じていた週は、次に起きたときに launchd が 1 回だけ実行する。
 * 電源が切れていた週の収集の遅れは、日次の ops-audit が weekly-collect の鮮度で出す。
 *
 * 使い方:
 *   npm run weekly-review:install                  # 登録（再登録も同じコマンド）。前提: Claude Code にログイン済み・gh にログイン済み
 *   npm run weekly-review:install -- --status      # 登録状況
 *   npm run weekly-review:install -- --run-now     # 今すぐ 1 回走らせる（ログ: ~/Library/Logs/doboku-note/weekly-review.log）
 *   npm run weekly-review:install -- --uninstall   # 解除（自動実行用の worktree は残す。消すなら git worktree unlock してから git worktree remove --force）
 *
 * exit: 0 成功 / 1 失敗 / 2 検査不成立（macOS 以外＝launchd が無い）
 * ---------------------------------------------------------------------------
 *
 * npm run weekly-review:install — Mac の launchd に土曜 9:30 の収集と GSC の記録層を入れる（`scripts/scheduled/weekly-review.sh`・名前は登録済みの launchd に合わせて残している）。自動実行用の worktree（`.claude/worktrees/weekly-collect`・lock 済み・毎日の GSC の登録と共用）で、土曜の収集の前段（下の `weekly-collect`）・GSC の記録層（`run_gsc_record`・失敗は Issue channel gsc-auto-review・DN-0849）・後段を回す。週次・月次レビューは回さない（2026-11-08〜・運営者の指示で対話セッションが `/weekly-review` を実行）。永続bootstrapからorigin/developのrunnerを起動する。収集の失敗は Issue（channel: weekly-collect）。`-- --status` / `-- --run-now` / `-- --uninstall`。前提は Claude Code と gh にログイン済み。罠: `--run-now` は引数を渡せない（収集は前後とも回る）。
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { dirname, join } from 'node:path';

import { REPO_ROOT } from './lib/repository-paths.mjs';
import { renderWeeklyReviewBootstrap, renderWeeklyReviewPlist } from './lib/weekly-review-launchd.mjs';

const LABEL = 'com.doboku-note.weekly-review';
const TAG = '[weekly-review:install]';
const HOME = homedir();
const PLIST_PATH = join(HOME, 'Library', 'LaunchAgents', `${LABEL}.plist`);
const TEMPLATE = join(REPO_ROOT, 'scripts', 'scheduled', `${LABEL}.plist.tmpl`);
const LOG = '~/Library/Logs/doboku-note/weekly-review.log';
const BOOTSTRAP = join(HOME, 'Library', 'Application Support', 'doboku-note', 'weekly-review.sh');
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
  console.log(`${TAG} 解除した（${PLIST_PATH} を削除）。土曜の収集と GSC の記録層は止まる。`);
} else if (argv.includes('--run-now')) {
  // 収集スクリプトは土日以外・今週の収集が済んだ後は何もしない。印を置くと曜日を問わず最初から回す
  mkdirSync(join(HOME, 'Library', 'Logs', 'doboku-note'), { recursive: true });
  writeFileSync(join(HOME, 'Library', 'Logs', 'doboku-note', 'weekly-review.force'), `${new Date().toISOString()}\n`);
  const r = launchctl('kickstart', `${domain}/${LABEL}`);
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
  const common = spawnSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: REPO_ROOT, encoding: 'utf8' });
  if (common.status !== 0) throw new Error(`Git の共有メタデータを取得できない: ${common.stderr}`);
  const primaryRoot = dirname(common.stdout.trim());
  const plist = renderWeeklyReviewPlist(readFileSync(TEMPLATE, 'utf-8'), { repoRoot: primaryRoot, homeDir: HOME, bootstrapPath: BOOTSTRAP });
  mkdirSync(dirname(BOOTSTRAP), { recursive: true });
  writeFileSync(BOOTSTRAP, renderWeeklyReviewBootstrap(primaryRoot), { mode: 0o700 });
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
      '  最初に一度: npm run weekly-review:install -- --run-now でログを確認（週次が成立済みでも月次が未完・再確認日到来なら月次を実行）',
  );
}
