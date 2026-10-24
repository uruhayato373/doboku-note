import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { findRepoRoot } from './repo-root';
import type { CollectRun } from './automations';
import { loadCredentialRegistry, storedAccounts } from '../../../../scripts/lib/credential-store.mjs';
import { datasetPath } from '../../../../scripts/lib/datasets.mjs';
import { resolveMetadataPath } from '../../../../scripts/lib/playwright-auth-profile.mjs';

/** 資格情報の正本の 1 行（.claude/config/playwright-auth-profiles.json の services.<id>.credential）。 */
export type CredentialPolicy = {
  id: string;
  label: string;
  storeItem: string;
  sharedStoreItem?: string;
  autoLogin: boolean;
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
  /** 自動ログインの失敗印（人が確認して消すまで再試行しない） */
  failMarks: string[];
};

/** 土曜の Mac 収集（weekly-collect）の直近の pre の回の auth 段（ログインの確認と入り直し）。 */
export type CollectAuthStage = {
  /** 回の終了時刻（UTC の ISO 8601）。回が 1 件も無ければ null */
  finishedAt: string | null;
  /** auth 段の結果。回が無い・auth 段が無いときは null */
  status: 'ok' | 'warn' | 'skipped' | 'failed' | null;
  reason: string;
};

export type AuthCredentialsView = {
  machine: 'windows' | 'mac' | 'other';
  registryPath: string;
  rows: CredentialRow[];
  collectAuth: CollectAuthStage;
  register: Record<string, string>;
};

const REGISTRY = '.claude/config/playwright-auth-profiles.json';

function machine(): AuthCredentialsView['machine'] {
  return process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : 'other';
}

/** 土曜の収集の記録（state.weekly-collect）から、直近の pre の回の auth 段を読む。 */
function lastCollectAuth(root: string): CollectAuthStage {
  const abs = join(root, datasetPath('state.weekly-collect'));
  if (!existsSync(abs)) return { finishedAt: null, status: null, reason: '土曜の収集の記録がまだ無い' };
  try {
    const runs = (JSON.parse(readFileSync(abs, 'utf8')) as { runs?: CollectRun[] }).runs ?? [];
    const pre = runs.filter((r) => r.phase === 'pre').at(-1);
    if (!pre) return { finishedAt: null, status: null, reason: 'pre の回の記録がまだ無い' };
    const auth = pre.stages.find((st) => st.id === 'auth');
    return { finishedAt: pre.finishedAt, status: auth?.status ?? null, reason: auth ? auth.reason : 'auth 段が記録に無い' };
  } catch (e) {
    return { finishedAt: null, status: null, reason: `記録を読めない: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export function authCredentialsView(): AuthCredentialsView {
  const root = findRepoRoot();
  const registryPath = join(root, REGISTRY);
  const policies = loadCredentialRegistry(registryPath) as CredentialPolicy[];
  const names = policies.flatMap((p) => [p.storeItem, ...(p.sharedStoreItem ? [p.sharedStoreItem] : [])]);
  const accounts = storedAccounts(names) as Record<string, { present: boolean | null; user: string | null }>;
  const authOptions = { cwd: root, repoRoot: root };

  const rows: CredentialRow[] = policies.map((p) => {
    const metaDir = dirname(resolveMetadataPath(p.id, authOptions) as string);
    const failMarks = [`${p.id}.autologin-failed`, `${p.id}.reauth-failed`].map((f) => join(metaDir, f)).filter((f) => existsSync(f));
    return {
      ...p,
      storePresent: accounts[p.storeItem]?.present ?? null,
      sharedPresent: p.sharedStoreItem ? accounts[p.sharedStoreItem]?.present ?? null : null,
      storeUser: accounts[p.storeItem]?.user ?? null,
      sharedUser: p.sharedStoreItem ? accounts[p.sharedStoreItem]?.user ?? null : null,
      failMarks,
    };
  });

  const config = JSON.parse(readFileSync(registryPath, 'utf8')) as { credentialPolicy?: { register?: Record<string, string> } };
  return {
    machine: machine(),
    registryPath: REGISTRY,
    rows,
    collectAuth: lastCollectAuth(root),
    register: config.credentialPolicy?.register ?? {},
  };
}
