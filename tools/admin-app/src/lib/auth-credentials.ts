import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { findRepoRoot } from './repo-root';
import { ciEnvCredentialServices, ciEnvVarNames, loadCredentialRegistry, storedAccounts } from '../../../../scripts/lib/credential-store.mjs';
import { resolveMetadataPath } from '../../../../scripts/lib/playwright-auth-profile.mjs';

/** 資格情報の正本の 1 行（.claude/config/playwright-auth-profiles.json の services.<id>.credential）。 */
export type CredentialPolicy = {
  id: string;
  label: string;
  storeItem: string;
  sharedStoreItem?: string;
  autoLogin: boolean;
  ciCredential: boolean;
  /** GitHub Secrets に保管しているか（CI が読むのは ciCredential の service だけ） */
  ciStored?: boolean;
  machines: string[];
  policyNote: string;
};

export type CredentialRow = CredentialPolicy & {
  /** この PC の OS 資格情報ストアに項目があるか（null＝この OS では確かめられない） */
  storePresent: boolean | null;
  sharedPresent: boolean | null;
  /** この PC の資格情報ストアに入っているログイン ID（パスワードは読まない） */
  storeUser: string | null;
  sharedUser: string | null;
  /** GitHub Secrets（ciStored の service）。null＝一覧を取れなかった */
  ciUser: string | null | undefined;
  ciPassword: string | null | undefined;
  /** 自動ログインの失敗印（人が確認して消すまで再試行しない） */
  failMarks: string[];
  /** ログイン維持ログの最新結果（この PC） */
  lastRefresh: { status: string; reason?: string } | null;
};

export type AuthCredentialsView = {
  machine: 'windows' | 'mac' | 'other';
  registryPath: string;
  rows: CredentialRow[];
  task: { registered: boolean | null; detail: string };
  log: { path: string; updatedAt: string | null };
  secretsError: string | null;
  register: Record<string, string>;
};

const REGISTRY = '.claude/config/playwright-auth-profiles.json';

function machine(): AuthCredentialsView['machine'] {
  return process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : 'other';
}

function logPath(): string {
  return process.platform === 'darwin'
    ? join(homedir(), 'Library', 'Logs', 'doboku-note', 'auth-session-refresh.log')
    : join(homedir(), '.local', 'state', 'doboku-note', 'logs', 'auth-session-refresh.log');
}

/** ログイン維持ログの各行 `[auth-session-refresh] {"service":...}` から service ごとの最新結果を取る。 */
function lastRefreshByService(path: string): Record<string, { status: string; reason?: string }> {
  const out: Record<string, { status: string; reason?: string }> = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const i = line.indexOf('[auth-session-refresh] {');
    if (i < 0) continue;
    try {
      const r = JSON.parse(line.slice(i + '[auth-session-refresh] '.length)) as { service?: string; status?: string; reason?: string };
      if (r.service && r.status) out[r.service] = { status: r.status, reason: r.reason };
    } catch { /* 途中で切れた行は読まない */ }
  }
  return out;
}

/** GitHub Secrets の名前と更新日（値は取れない・取らない）。gh が使えなければ error。 */
function githubSecrets(root: string): { map: Map<string, string>; error: string | null } {
  const r = spawnSync('gh', ['secret', 'list', '--repo', 'uruhayato373/doboku-note', '--json', 'name,updatedAt'], {
    cwd: root, encoding: 'utf8', timeout: 15000, windowsHide: true,
  });
  if (r.status !== 0) return { map: new Map(), error: (r.stderr || r.error?.message || 'gh secret list に失敗').trim().slice(0, 160) };
  try {
    const rows = JSON.parse(r.stdout) as { name: string; updatedAt: string }[];
    return { map: new Map(rows.map((x) => [x.name, x.updatedAt])), error: null };
  } catch {
    return { map: new Map(), error: 'gh secret list の出力を読めない' };
  }
}

/** ログイン維持の定期実行（Windows タスクスケジューラ / Mac launchd）の登録状況。既存 CLI の --status を使う。 */
function refreshTask(root: string): AuthCredentialsView['task'] {
  const r = spawnSync(process.execPath, [join(root, 'scripts', 'install-auth-session-refresh-launchd.mjs'), '--status'], {
    cwd: root, encoding: 'utf8', timeout: 20000, windowsHide: true,
  });
  const detail = `${r.stdout ?? ''}`.trim() || `${r.stderr ?? ''}`.trim();
  if (r.status === 0) return { registered: true, detail };
  if (r.status === 1) return { registered: false, detail };
  return { registered: null, detail: detail || '登録状況を確かめられない' };
}

export function authCredentialsView(): AuthCredentialsView {
  const root = findRepoRoot();
  const registryPath = join(root, REGISTRY);
  const policies = loadCredentialRegistry(registryPath) as CredentialPolicy[];
  const ciServices = ciEnvCredentialServices(policies) as string[];
  const names = policies.flatMap((p) => [p.storeItem, ...(p.sharedStoreItem ? [p.sharedStoreItem] : [])]);
  const accounts = storedAccounts(names) as Record<string, { present: boolean | null; user: string | null }>;
  const secrets = githubSecrets(root);
  const log = logPath();
  const refresh = lastRefreshByService(log);
  const authOptions = { cwd: root, repoRoot: root };

  const rows: CredentialRow[] = policies.map((p) => {
    const metaDir = dirname(resolveMetadataPath(p.id, authOptions) as string);
    const failMarks = [`${p.id}.autologin-failed`, `${p.id}.reauth-failed`].map((f) => join(metaDir, f)).filter((f) => existsSync(f));
    const env = ciServices.includes(p.id) || p.ciStored ? (ciEnvVarNames(p.id) as { user: string; password: string }) : null;
    const secret = (name: string) => (secrets.error ? null : secrets.map.get(name));
    return {
      ...p,
      storePresent: accounts[p.storeItem]?.present ?? null,
      sharedPresent: p.sharedStoreItem ? accounts[p.sharedStoreItem]?.present ?? null : null,
      storeUser: accounts[p.storeItem]?.user ?? null,
      sharedUser: p.sharedStoreItem ? accounts[p.sharedStoreItem]?.user ?? null : null,
      ciUser: env ? secret(env.user) : undefined,
      ciPassword: env ? secret(env.password) : undefined,
      failMarks,
      lastRefresh: refresh[p.id] ?? null,
    };
  });

  const config = JSON.parse(readFileSync(registryPath, 'utf8')) as { credentialPolicy?: { register?: Record<string, string> } };
  return {
    machine: machine(),
    registryPath: REGISTRY,
    rows,
    task: refreshTask(root),
    log: { path: log, updatedAt: existsSync(log) ? statSync(log).mtime.toISOString() : null },
    secretsError: secrets.error,
    register: config.credentialPolicy?.register ?? {},
  };
}
