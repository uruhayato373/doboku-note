#!/usr/bin/env node
/**
 * install-disk-hygiene-schtasks.mjs — 日次のディスク掃除を Windows タスクスケジューラへ登録する。
 * ---------------------------------------------------------------------------
 * macOS の install-disk-hygiene-launchd.mjs と対になる Windows 版。
 *   - 実行は ~/.local/state/doboku-note/disk-hygiene.cmd（install 時に描画・node と repo の絶対パス入り）
 *   - 12:30 日次 + StartWhenAvailable（PC が寝ていて逃した回は次に起きたとき走る）
 *   - ログは ~/.local/state/doboku-note/logs/disk-hygiene.log、stamp は同 logs/disk-hygiene.last-ok
 *     （AppData 配下にしないのは、MSIX アプリ〔ChatGPT/Codex〕から読むと仮想化で別の場所を見るため）
 *
 * 使い方:
 *   npm run disk-hygiene:install:win                # 登録（再登録も同じコマンド）
 *   npm run disk-hygiene:install:win -- --status    # 登録状況
 *   npm run disk-hygiene:install:win -- --run-now   # 今すぐ 1 回走らせる
 *   npm run disk-hygiene:install:win -- --uninstall # 解除
 *
 * exit: 0 成功 / 1 失敗 / 2 検査不成立（Windows 以外）
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { REPO_ROOT } from './lib/repository-paths.mjs';

const TASK_NAME = 'doboku-note disk-hygiene';
const HOME = homedir();
const STATE_DIR = join(HOME, '.local', 'state', 'doboku-note');
const LOG_DIR = join(STATE_DIR, 'logs');
const WRAPPER = join(STATE_DIR, 'disk-hygiene.cmd');
const LOG = join(LOG_DIR, 'disk-hygiene.log');
const argv = process.argv.slice(2);

if (process.platform !== 'win32') {
  console.error(`[disk-hygiene:install:win] タスクスケジューラは Windows 専用（現在 ${process.platform}）。検査不成立。`);
  console.error('[disk-hygiene:install:win] macOS は `npm run disk-hygiene:install`（launchd）。');
  process.exit(2);
}

/** PowerShell を 1 回叩く。stdout を UTF-8 で受ける（既定の OEM コードページだと日本語が壊れる）。 */
function ps(script) {
  return spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `[Console]::OutputEncoding=[Text.Encoding]::UTF8; ${script}`], {
    encoding: 'utf-8',
    windowsHide: true,
    timeout: 60_000,
  });
}
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

if (argv.includes('--status')) {
  const r = ps(`$t = Get-ScheduledTask -TaskName ${q(TASK_NAME)} -ErrorAction SilentlyContinue; if (-not $t) { exit 3 }; $i = $t | Get-ScheduledTaskInfo; "state=$($t.State) last=$($i.LastRunTime) result=$($i.LastTaskResult) next=$($i.NextRunTime)"`);
  if (r.status === 0) {
    console.log(`[disk-hygiene:install:win] 登録済み\n  ${r.stdout.trim()}\n  wrapper: ${WRAPPER}\n  log:     ${LOG}`);
    process.exit(0);
  }
  console.log('[disk-hygiene:install:win] 未登録。導入: npm run disk-hygiene:install:win');
  process.exit(1);
}

if (argv.includes('--uninstall')) {
  ps(`Unregister-ScheduledTask -TaskName ${q(TASK_NAME)} -Confirm:$false -ErrorAction SilentlyContinue`);
  if (existsSync(WRAPPER)) rmSync(WRAPPER);
  console.log(`[disk-hygiene:install:win] 解除した（${WRAPPER} を削除）。日次掃除は止まる。`);
  process.exit(0);
}

if (argv.includes('--run-now')) {
  const r = ps(`Start-ScheduledTask -TaskName ${q(TASK_NAME)}`);
  if (r.status !== 0) {
    console.error(`[disk-hygiene:install:win] ✗ 実行できない（未登録？）: ${(r.stderr || '').trim()}`);
    process.exit(1);
  }
  console.log(`[disk-hygiene:install:win] 実行した。ログ: ${LOG}`);
  process.exit(0);
}

// --- install ---------------------------------------------------------------
mkdirSync(LOG_DIR, { recursive: true });
const script = join(REPO_ROOT, 'scripts', 'disk-hygiene.mjs');
// node の出力は UTF-8、cmd の echo は cp932 で書く。ja-JP の %date% は曜日「(月)」を含むので
// 先頭 10 文字（YYYY/MM/DD）だけ使い、ログを ASCII + UTF-8 に保つ。
const wrapper = [
  '@echo off',
  `cd /d "${REPO_ROOT}"`,
  `echo [%date:~0,10% %time:~0,8%] start >> "${LOG}"`,
  `"${process.execPath}" "${script}" --fix >> "${LOG}" 2>&1`,
  `echo [%date:~0,10% %time:~0,8%] exit=%errorlevel% >> "${LOG}"`,
  '',
].join('\r\n');
writeFileSync(WRAPPER, wrapper);

const register = [
  `$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument ${q(`/c "${WRAPPER}"`)}`,
  `$trigger = New-ScheduledTaskTrigger -Daily -At 12:30`,
  `$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1) -MultipleInstances IgnoreNew`,
  `Register-ScheduledTask -TaskName ${q(TASK_NAME)} -Action $action -Trigger $trigger -Settings $settings -RunLevel Limited -Force | Out-Null`,
  `"ok"`,
].join('; ');
const r = ps(register);
if (r.status !== 0 || !/ok/.test(r.stdout)) {
  console.error(`[disk-hygiene:install:win] ✗ 登録失敗: ${(r.stderr || r.stdout || '').trim().split('\n')[0]}`);
  process.exit(1);
}
console.log(
  `[disk-hygiene:install:win] ✓ 登録した（毎日 12:30・逃した回は次回起動時）\n` +
    `  task:    ${TASK_NAME}\n` +
    `  wrapper: ${WRAPPER}\n` +
    `  log:     ${LOG}\n` +
    '  確認:  npm run disk-hygiene:install:win -- --status / 即実行: -- --run-now',
);
