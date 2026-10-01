/**
 * credential-store.mjs — 自動ログイン用の ID / パスワードを OS の資格情報ストアから読む唯一の入口。
 *
 * Mac = キーチェーン（`security`）、Windows = 資格情報マネージャー（Win32 CredRead を PowerShell 5.1 から呼ぶ。
 * 追加モジュール不要）。CI などそれ以外の OS では常に null（CI はパスワードを持たず、暗号化 state だけを使う）。
 * 例外は readServiceCredential の CI_ENV_CREDENTIAL_SERVICES（note・ココナラ・GitHub Secrets）。
 * 同じ項目名を両 OS で使うので、呼び出し側は OS を意識しない。stats47 の
 * `.claude/scripts/measurement/credential-store.mjs` と同じ読み口（項目名の接頭辞だけが違う）。
 *
 * 登録（オーナーが各マシンで 1 回だけ。値を値なしで指定すると対話入力になる）:
 *   Mac:     security add-generic-password -s doboku-note-auth-<service> -a <ログインID> -w
 *   Windows: cmdkey /generic:doboku-note-auth-<service> /user:<ログインID> /pass
 *
 * 守ること: 戻り値をログ・引数・ファイルへ出さない。読み出しの失敗は理由を問わず null（登録なしと同じ扱い）。
 * 資格情報ストアを直接呼ぶコードをこのファイルの外に書かない。
 */
import { execFileSync } from 'node:child_process';

/**
 * `security find-generic-password` の属性出力からアカウント名を取り出す。
 * ASCII 以外や制御文字を含む値は `"acct"<blob>=0x<16進>  "<エスケープ表示>"` の形で出るので、16進を優先して復号する
 * （2026-09-28 実測: stats47-measurement-a8 がこの形で、引用符の形だけを見ていたため no_credential になった）。
 */
export function parseKeychainAccount(text) {
  const s = String(text ?? '');
  const hex = /"acct"<blob>=0x([0-9A-Fa-f]+)/.exec(s);
  if (hex) return Buffer.from(hex[1], 'hex').toString('utf8').trim() || null;
  const m = /"acct"<blob>="([^"]*)"/.exec(s);
  return m ? m[1] : null;
}

function readMacKeychain(name, exec) {
  const run = (extra) => exec('security', ['find-generic-password', '-s', name, ...extra],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  try {
    const user = parseKeychainAccount(run([]));
    const password = run(['-w']).replace(/\n$/, '');
    return user && password ? { user, password } : null;
  } catch { return null; }
}

// 対象名は環境変数で渡す（コマンド文字列へ埋め込まない）。出力は base64 の JSON 1 行で、文字コードの取り違えを避ける。
// 存在確認だけのとき（DOBOKU_CRED_PROBE=1）はパスワードを出力しない。
export const WINDOWS_CRED_READ_SCRIPT = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class DobokuCred {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct CREDENTIAL {
    public int Flags; public int Type; public string TargetName; public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist;
    public int AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
  }
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool CredRead(string target, int type, int flags, out IntPtr cred);
  [DllImport("advapi32.dll")]
  public static extern void CredFree(IntPtr cred);
}
"@
$ptr = [IntPtr]::Zero
if (-not [DobokuCred]::CredRead($env:DOBOKU_CRED_TARGET, 1, 0, [ref]$ptr)) { exit 3 }
try {
  if ($env:DOBOKU_CRED_PROBE -eq '1') { [Console]::Out.Write('present'); exit 0 }
  $c = [Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][DobokuCred+CREDENTIAL])
  $pw = if ($c.CredentialBlobSize -gt 0) { [Runtime.InteropServices.Marshal]::PtrToStringUni($c.CredentialBlob, $c.CredentialBlobSize / 2) } else { '' }
  $json = @{ user = $c.UserName; password = $pw } | ConvertTo-Json -Compress
  [Console]::Out.Write([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json)))
} finally { [DobokuCred]::CredFree($ptr) }
`;

export function parseWindowsCredOutput(stdout) {
  try {
    const { user, password } = JSON.parse(Buffer.from(String(stdout).trim(), 'base64').toString('utf8'));
    return user && password ? { user, password } : null;
  } catch { return null; }
}

function runWindowsCred(name, exec, probe) {
  return exec('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', WINDOWS_CRED_READ_SCRIPT], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    env: { ...process.env, DOBOKU_CRED_TARGET: name, DOBOKU_CRED_PROBE: probe ? '1' : '0' },
    windowsHide: true,
  });
}

/** 1 つの項目名を読む。登録なし・読めない・未対応 OS はすべて null。 */
export function readSecret(name, { platform = process.platform, exec = execFileSync } = {}) {
  if (platform === 'darwin') return readMacKeychain(name, exec);
  if (platform === 'win32') {
    try { return parseWindowsCredOutput(runWindowsCred(name, exec, false)); } catch { return null; }
  }
  return null;
}

/** 項目があるかだけを見る（パスワードを取り出さない）。 */
export function hasSecret(name, { platform = process.platform, exec = execFileSync } = {}) {
  try {
    if (platform === 'darwin') {
      exec('security', ['find-generic-password', '-s', name], { stdio: 'ignore' });
      return true;
    }
    if (platform === 'win32') return String(runWindowsCred(name, exec, true)).trim() === 'present';
  } catch { /* 無い */ }
  return false;
}

/** 候補の項目名を優先順に読み、最初に取れたものを返す（source に項目名を入れる）。 */
export function readFirstCredential(names, options = {}) {
  for (const name of names) {
    const cred = readSecret(name, options);
    if (cred) return { ...cred, source: name };
  }
  return null;
}

/**
 * CI（GitHub Actions）で ID/PW を環境変数から読んでよい service。CI は原則パスワードを持たないが、
 * note の売上ページは端末ごとのパスワード再確認があり、暗号化 state だけでは通れない（2026-09-21 run 35606437507）。
 * 2026-10-01 オーナー決定で note を GitHub Secrets（DOBOKU_AUTH_NOTE_USER / _PASSWORD）に持たせ、同日ココナラも加えた
 * （DOBOKU_AUTH_COCONALA_USER / _PASSWORD。暗号化 state が切れたときに CI で入り直す: auth-session-refresh --ci）。
 */
export const CI_ENV_CREDENTIAL_SERVICES = Object.freeze(['note', 'coconala']);

export function ciEnvVarNames(service) {
  const key = String(service).toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return { user: `DOBOKU_AUTH_${key}_USER`, password: `DOBOKU_AUTH_${key}_PASSWORD` };
}

/**
 * service の ID/PW を読む。GitHub Actions では許可 service だけ環境変数から、手元の PC では
 * 資格情報ストアの doboku-note-auth-<service> から読む。どちらも無ければ null。
 */
export function readServiceCredential(service, { env = process.env, platform = process.platform, exec = execFileSync } = {}) {
  if (env.GITHUB_ACTIONS === 'true') {
    if (!CI_ENV_CREDENTIAL_SERVICES.includes(service)) return null;
    const names = ciEnvVarNames(service);
    const user = env[names.user];
    const password = env[names.password];
    return user && password ? { user, password, source: `env:${names.password}` } : null;
  }
  return readFirstCredential([`doboku-note-auth-${service}`], { platform, exec });
}

/** この OS で資格情報ストアを使えるか。 */
export function credentialStoreSupported(platform = process.platform) {
  return platform === 'darwin' || platform === 'win32';
}
