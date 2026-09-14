/**
 * process-list.mjs — 稼働中プロセスの pid とフルコマンドラインを OS 非依存で引く。
 * ---------------------------------------------------------------------------
 * 背景（2026-09-14）: disk-hygiene の「使用中プロファイルは消さない」判定と、Playwright 起動前の
 *   「別プロファイルの Chrome が既に居るか」判定は、どちらもフルコマンドライン（--user-data-dir=）
 *   を見る必要がある。darwin/linux は `ps`、win32 は `tasklist` がコマンドラインを出さないので
 *   PowerShell の Win32_Process を叩く（実測 1〜2 秒。フックに載せる速さではないので quick 経路では
 *   呼ばない）。
 *
 * 契約:
 *   - 失敗は例外にせず null を返す（呼び出し側は「判定不能＝安全側」に倒す）。
 *   - 返す行は { pid: string, command: string }。command は空文字のことがある（保護プロセス）。
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from 'node:child_process';

const PS_COMMAND = [
  '[Console]::OutputEncoding = [Text.Encoding]::UTF8;',
  'Get-CimInstance Win32_Process | ForEach-Object {',
  '  "$($_.ProcessId)`t$($_.CommandLine)"',
  '}',
].join(' ');

/** 1 行 "<pid>\t<command>" / "<pid> <command>" を行オブジェクトへ。pid が取れない行は捨てる。 */
export function parseProcessLines(text, { separator = '\t' } = {}) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      const idx = separator === '\t' ? trimmed.indexOf('\t') : trimmed.search(/\s/);
      const pid = idx === -1 ? trimmed : trimmed.slice(0, idx);
      if (!/^\d+$/.test(pid)) return null;
      const command = idx === -1 ? '' : trimmed.slice(idx + 1).trim();
      return { pid, command };
    })
    .filter(Boolean);
}

/**
 * 稼働中プロセス一覧。取れないときは null。
 * @param {{ platform?: NodeJS.Platform, timeout?: number, spawn?: typeof spawnSync }} [options]
 * @returns {{ pid: string, command: string }[] | null}
 */
export function listProcesses({ platform = process.platform, timeout = 15_000, spawn = spawnSync } = {}) {
  try {
    if (platform === 'win32') {
      const r = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', PS_COMMAND], {
        timeout,
        encoding: 'utf-8',
        windowsHide: true,
        maxBuffer: 32 * 1024 * 1024,
      });
      if (r.error || r.status !== 0) return null;
      return parseProcessLines(r.stdout, { separator: '\t' });
    }
    const r = spawn('ps', ['-axo', 'pid=,command='], { timeout, encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 });
    if (r.error || r.status !== 0) return null;
    return parseProcessLines(r.stdout, { separator: ' ' });
  } catch {
    return null;
  }
}

/**
 * `--user-data-dir=<dir>` を持つブラウザプロセスのうち、dir が profilesRoot 配下のものを返す。
 * Windows はパスの大小文字を無視する。rows が null なら null（判定不能）。
 */
export function browsersUsingProfilesUnder(rows, profilesRoot, { platform = process.platform } = {}) {
  if (!rows) return null;
  if (!profilesRoot) return [];
  const sep = platform === 'win32' ? '\\' : '/';
  const norm = (s) => (platform === 'win32' ? String(s).toLowerCase().replace(/\//g, '\\') : String(s));
  const root = norm(profilesRoot).replace(/[\\/]+$/, '');
  const hits = [];
  for (const row of rows) {
    const command = String(row.command || '');
    const at = command.indexOf('--user-data-dir=');
    if (at === -1) continue;
    // 値は空白を含みうる（macOS の "Application Support"）。次の引数（` --`）か行末までを値とみなし、
    // 囲みの引用符は外す。先頭一致は正規化した文字列で行う。
    let value = command.slice(at + '--user-data-dir='.length);
    const next = value.search(/\s--/);
    if (next !== -1) value = value.slice(0, next);
    value = value.trim().replace(/^"(.*)"$/, '$1');
    const dir = norm(value).replace(/[\\/]+$/, '');
    if (dir === root || dir.startsWith(root + sep)) hits.push({ pid: row.pid, userDataDir: value });
  }
  return hits;
}
