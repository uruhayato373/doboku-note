import { PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
import type { Tone } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { authCredentialsView, type CredentialRow } from '@/lib/auth-credentials';

export const dynamic = 'force-dynamic';

/**
 * /ops/auth — ログインが必要な全サービスの資格情報（正本 .claude/config/playwright-auth-profiles.json の credential）と、
 * この PC の登録・ログイン維持・CI の Secrets を 1 枚で見る。パスワードは読まない（有無と更新日だけ）。
 */
const MACHINE_LABEL = { windows: 'Windows', mac: 'Mac', other: 'この OS（資格情報ストア非対応）' } as const;

function presence(v: boolean | null, ok = '登録済み', ng = '未登録') {
  if (v === null) return <StatusBadge tone="neutral">確認できない</StatusBadge>;
  return v ? <StatusBadge tone="good">{ok}</StatusBadge> : <StatusBadge tone="warn">{ng}</StatusBadge>;
}

function refreshTone(status: string): Tone {
  if (status === 'ok') return 'good';
  if (status === 'skipped' || status === 'needs-login') return 'neutral';
  return 'bad';
}

function ciCell(r: CredentialRow, secretsError: string | null) {
  if (!r.ciCredential) return <span className="text-muted-foreground">使わない</span>;
  if (secretsError) return <StatusBadge tone="neutral" title={secretsError}>確認できない</StatusBadge>;
  const both = Boolean(r.ciUser && r.ciPassword);
  const date = [r.ciUser, r.ciPassword].filter(Boolean).sort().at(-1)?.slice(0, 10);
  return both ? <StatusBadge tone="good" title={`更新 ${date}`}>登録済み</StatusBadge> : <StatusBadge tone="bad">{r.ciUser ? 'パスワード未登録' : 'ID 未登録'}</StatusBadge>;
}

export default function AuthCredentialsPage() {
  const v = authCredentialsView();
  const missing = v.rows.filter((r) => r.storePresent === false && !(r.sharedPresent === true));
  const failing = v.rows.filter((r) => r.failMarks.length > 0);

  return (
    <>
      <PageHead
        title="ログインと資格情報"
        sub={`正本 ${v.registryPath}（credential）· この PC: ${MACHINE_LABEL[v.machine]} · 資格情報 ${v.rows.length - missing.length}/${v.rows.length} 件登録 · パスワードは表示しない`}
      />
      <Stack>
        <PanelCard title="この PC のログイン維持" description="毎日 17:45 に各サービスのログインを確かめ、切れていれば資格情報で 1 回だけ入り直す（自動ログイン対応のサービスだけ）">
          <Stack gap="sm">
            <div className="filterbar">
              {v.task.registered === true && <StatusBadge tone="good">定期実行 登録済み</StatusBadge>}
              {v.task.registered === false && <StatusBadge tone="bad">定期実行 未登録</StatusBadge>}
              {v.task.registered === null && <StatusBadge tone="neutral">定期実行 確認できない</StatusBadge>}
              {failing.length > 0 && <StatusBadge tone="bad">失敗印 {failing.length} 件</StatusBadge>}
            </div>
            <pre className="m-0 whitespace-pre-wrap text-xs text-muted-foreground">{v.task.detail}</pre>
            <p className="m-0 text-sm text-muted-foreground">
              ログ <code>{v.log.path}</code>（最終更新 {v.log.updatedAt ? v.log.updatedAt.slice(0, 16).replace('T', ' ') + ' UTC' : 'まだ無い'}）。
              未登録なら <code>npm run auth-refresh:install</code>。
            </p>
          </Stack>
        </PanelCard>

        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>サービス</TableHead>
              <TableHead title="切れたときに資格情報で自動で入り直すか（正本の autoLogin）">自動ログイン</TableHead>
              <TableHead title="この PC の OS 資格情報ストア（Mac キーチェーン / Windows 資格情報マネージャー）">この PC の資格情報</TableHead>
              <TableHead title="GitHub Secrets DOBOKU_AUTH_<SERVICE>_USER / _PASSWORD（正本の ciCredential）">CI</TableHead>
              <TableHead title="ログイン維持ログの最新結果（この PC）">最新の維持結果</TableHead>
              <TableHead>方針</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {v.rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.label}</div>
                  <code className="text-xs text-muted-foreground">{r.storeItem}</code>
                </TableCell>
                <TableCell>{r.autoLogin ? <StatusBadge tone="info">自動</StatusBadge> : <StatusBadge tone="neutral">人が入る</StatusBadge>}</TableCell>
                <TableCell>
                  {presence(r.storePresent)}
                  {r.sharedStoreItem && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      共用 <code>{r.sharedStoreItem}</code> {r.sharedPresent === null ? '?' : r.sharedPresent ? 'あり' : 'なし'}
                    </div>
                  )}
                </TableCell>
                <TableCell>{ciCell(r, v.secretsError)}</TableCell>
                <TableCell>
                  {r.failMarks.length > 0 ? (
                    <StatusBadge tone="bad" title={r.failMarks.join('\n')}>失敗印あり</StatusBadge>
                  ) : r.lastRefresh ? (
                    <StatusBadge tone={refreshTone(r.lastRefresh.status)} title={r.lastRefresh.reason}>{r.lastRefresh.status}</StatusBadge>
                  ) : (
                    <span className="text-muted-foreground">記録なし</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.policyNote}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableFrame>

        <PanelCard title="登録のしかた" description="値は対話入力にして、コマンドの引数や履歴にパスワードを残さない。登録後にこのページを開き直すと反映される">
          <Stack gap="sm">
            {Object.entries(v.register).map(([k, cmd]) => (
              <div key={k} className="text-sm">
                <span className="mr-2 font-medium">{k === 'mac' ? 'Mac' : k === 'windows' ? 'Windows' : 'CI'}</span>
                <code>{cmd}</code>
              </div>
            ))}
            {missing.length > 0 && (
              <p className="m-0 text-sm text-muted-foreground">
                この PC で未登録: {missing.map((r) => r.label).join('・')}
              </p>
            )}
            <p className="m-0 text-sm text-muted-foreground">
              見えるのはこの PC の登録だけ。もう一方の PC（Mac / Windows）はその PC で管理画面を開いて確かめる。
            </p>
          </Stack>
        </PanelCard>
      </Stack>
    </>
  );
}
