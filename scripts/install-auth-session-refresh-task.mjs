#!/usr/bin/env node
/**
 * install-auth-session-refresh-task.mjs — ログイン維持（auth-session-refresh）を Windows のタスクスケジューラへ登録する。
 * ---------------------------------------------------------------------------
 * Mac の install-auth-session-refresh-launchd.mjs の Windows 版。`npm run auth-refresh:install` は OS を見て
 * どちらかを呼ぶ。中身は scripts/scheduled/auth-session-refresh.ps1 → scripts/auth-session-refresh.mjs。
 *
 * 時刻は毎日 17:45。PC が止まっていた日は、次に起動したときに 1 回走る（StartWhenAvailable）。
 * 管理者権限は要らない（現在のユーザー・ログオン中だけ動く）。登録しただけでは走らない（--run-now で即実行）。
 *
 * 使い方:
 *   npm run auth-refresh:install                  # 登録（再登録も同じコマンド）。前提: 資格情報の登録（auth-session-refresh.mjs 冒頭）
 *   npm run auth-refresh:install -- --status      # 登録状況と前回結果
 *   npm run auth-refresh:install -- --run-now     # 今すぐ 1 回走らせる
 *   npm run auth-refresh:install -- --uninstall   # 解除（専用 worktree は残す）
 *
 * exit: 0 成功 / 1 失敗 / 2 検査不成立（Windows 以外）
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

import { REPO_ROOT } from './lib/repository-paths.mjs';

const TASK_PATH = '\\doboku-note\\';
const TASK_NAME = 'auth-session-refresh';
const TAG = '[auth-refresh:install]';
const LOG = join(process.env.USERPROFILE ?? '~', '.local', 'state', 'doboku-note', 'logs', 'auth-session-refresh.log');
const argv = process.argv.slice(2);

/** PowerShell を実行する。値は環境変数で渡す（コマンド文字列へ埋め込まない）。 */
function ps(script, env = {}) {
  return spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8',
    env: { ...process.env, DN_TASK_PATH: TASK_PATH, DN_TASK_NAME: TASK_NAME, ...env },
    windowsHide: true,
  });
}

export function main() {
  if (process.platform !== 'win32') {
    console.error(`${TAG} タスクスケジューラは Windows 専用（現在 ${process.platform}）。検査不成立。`);
    return 2;
  }

  if (argv.includes('--status')) {
    const r = ps(`$t = Get-ScheduledTask -TaskPath $env:DN_TASK_PATH -TaskName $env:DN_TASK_NAME -ErrorAction SilentlyContinue
if (-not $t) { exit 3 }
$i = $t | Get-ScheduledTaskInfo
"state=$($t.State) lastRun=$($i.LastRunTime.ToString('o')) lastResult=$($i.LastTaskResult) nextRun=$($i.NextRunTime.ToString('o'))"`);
    if (r.status === 0) {
      console.log(`${TAG} 登録済み\n  ${r.stdout.trim()}\n  ログ: ${LOG}`);
      return 0;
    }
    console.log(`${TAG} 未登録。導入: npm run auth-refresh:install`);
    return 1;
  }
  if (argv.includes('--uninstall')) {
    ps('Unregister-ScheduledTask -TaskPath $env:DN_TASK_PATH -TaskName $env:DN_TASK_NAME -Confirm:$false -ErrorAction SilentlyContinue');
    console.log(`${TAG} 解除した。ログインの自動維持は止まる。`);
    return 0;
  }
  if (argv.includes('--run-now')) {
    const r = ps('Start-ScheduledTask -TaskPath $env:DN_TASK_PATH -TaskName $env:DN_TASK_NAME');
    if (r.status !== 0) {
      console.error(`${TAG} ✗ 実行できない（未登録？）: ${(r.stderr || '').trim().slice(0, 200)}`);
      return 1;
    }
    console.log(`${TAG} 実行した。ログ: ${LOG}`);
    return 0;
  }

  if (/[\\/]\.claude[\\/]worktrees[\\/]/.test(REPO_ROOT)) {
    console.error(`${TAG} ✗ worktree から登録しない（worktree を消すとタスクが壊れる）。本体の checkout で実行する: ${REPO_ROOT}`);
    return 1;
  }
  const wrapper = join(REPO_ROOT, 'scripts', 'scheduled', 'auth-session-refresh.ps1');
  const r = ps(`$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $env:DN_WRAPPER + '"') -WorkingDirectory $env:DN_REPO
$trigger = New-ScheduledTaskTrigger -Daily -At 17:45
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskPath $env:DN_TASK_PATH -TaskName $env:DN_TASK_NAME -Action $action -Trigger $trigger -Settings $settings -Description 'doboku-note: 切れたログインを資格情報マネージャーで取り直す（scripts/auth-session-refresh.mjs）' -Force | Out-Null`,
  { DN_WRAPPER: wrapper, DN_REPO: REPO_ROOT });
  if (r.status !== 0) {
    console.error(`${TAG} ✗ 登録失敗: ${(r.stderr || '').trim().slice(0, 300)}`);
    return 1;
  }
  console.log(
    `${TAG} ✓ 登録した（毎日 17:45・止まっていた日は次の起動時に 1 回）\n` +
      `  タスク: ${TASK_PATH}${TASK_NAME}\n` +
      `  log:    ${LOG}\n` +
      '  今すぐ試す: npm run auth-refresh:install -- --run-now（失敗は Windows の通知に出る）',
  );
  return 0;
}

if (process.argv[1] && /install-auth-session-refresh-task\.mjs$/.test(process.argv[1])) {
  process.exitCode = main();
}
