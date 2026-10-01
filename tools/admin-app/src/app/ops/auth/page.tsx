import { PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { authCredentialsView, type CredentialRow } from '@/lib/auth-credentials';

export const dynamic = 'force-dynamic';

/**
 * /ops/auth — ログインが必要な全サービスについて、人が見るべきことだけを出す:
 * ログイン ID・この PC の登録・CI の登録・自動ログインの有無・要対応。
 * 正本は .claude/config/playwright-auth-profiles.json の credential、ID とパスワードは各 PC の資格情報ストア（パスワードは読まない）。
 */
const MACHINE_LABEL = { windows: 'Windows', mac: 'Mac', other: 'この PC' } as const;

/** 人が手を打つべきこと（無ければ null）。 */
function action(r: CredentialRow): { text: string; detail?: string } | null {
  const registered = r.storePresent === true || r.sharedPresent === true;
  if (r.storePresent === false && !registered) return { text: '未登録' };
  if (r.failMarks.length > 0) return { text: 'ログインし直す', detail: `npm run auth:login -- --service ${r.id} の後、失敗印を消す:\n${r.failMarks.join('\n')}` };
  if (r.lastRefresh && r.lastRefresh.status !== 'ok' && r.lastRefresh.status !== 'skipped') return { text: 'ログインし直す', detail: r.lastRefresh.reason ?? r.lastRefresh.status };
  const ciWanted = r.ciCredential || r.ciStored;
  if (ciWanted && (r.ciUser === null || r.ciPassword === null)) return null;
  if (ciWanted && (!r.ciUser || !r.ciPassword)) return { text: 'CI 未登録' };
  return null;
}

function ciCell(r: CredentialRow) {
  if (!r.ciCredential && !r.ciStored) return <span className="text-muted-foreground">—</span>;
  if (r.ciUser === null || r.ciPassword === null) return <span className="text-muted-foreground">?</span>;
  if (!r.ciUser || !r.ciPassword) return <StatusBadge tone="warn">未</StatusBadge>;
  // CI が実際に読むのは ciCredential だけ。保管だけのものは「保管」と出し、理由は自動ログイン欄のツールチップ（方針）
  return r.ciCredential ? <StatusBadge tone="good">済</StatusBadge> : <StatusBadge tone="info" title={r.policyNote}>保管</StatusBadge>;
}

export default function AuthCredentialsPage() {
  const v = authCredentialsView();
  const todo = v.rows.map((r) => ({ r, a: action(r) })).filter((x) => x.a);
  const unregistered = v.rows.filter((r) => action(r)?.text === '未登録');
  const registerCmd = v.machine === 'mac' ? v.register.mac : v.register.windows;

  return (
    <>
      <PageHead
        title="ログインと資格情報"
        sub={`${MACHINE_LABEL[v.machine]} · 登録 ${v.rows.length - unregistered.length}/${v.rows.length} · 要対応 ${todo.length} 件 · 毎日のログイン維持 ${v.task.registered === true ? '登録済み' : v.task.registered === false ? '未登録' : '不明'}`}
      />
      <Stack>
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>サービス</TableHead>
              <TableHead>ログイン ID</TableHead>
              <TableHead title="この PC の資格情報マネージャー（Mac はキーチェーン）">この PC</TableHead>
              <TableHead title="GitHub Secrets。済＝CI がログインに使う／保管＝登録だけで CI は使わない（理由はマウスで）">CI</TableHead>
              <TableHead title="切れたときに自動でログインし直すか">自動ログイン</TableHead>
              <TableHead>要対応</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {v.rows.map((r) => {
              const a = action(r);
              const user = r.storeUser ?? (r.sharedPresent ? r.sharedUser : null);
              const registered = r.storePresent === true || r.sharedPresent === true;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  <TableCell>{user ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    {r.storePresent === null && r.sharedPresent === null
                      ? <span className="text-muted-foreground">?</span>
                      : registered ? <StatusBadge tone="good">済</StatusBadge> : <StatusBadge tone="warn">未</StatusBadge>}
                  </TableCell>
                  <TableCell>{ciCell(r)}</TableCell>
                  <TableCell title={r.policyNote}>{r.autoLogin ? 'する' : <span className="text-muted-foreground">しない</span>}</TableCell>
                  <TableCell>{a ? <StatusBadge tone="bad" title={a.detail}>{a.text}</StatusBadge> : <span className="text-muted-foreground">—</span>}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </TableFrame>

        {unregistered.length > 0 && registerCmd && (
          <PanelCard title="未登録のサービスを登録する" description="ターミナルで実行し、聞かれたらパスワードを入力する。登録後にこのページを再読み込みする">
            <Stack gap="sm">
              {unregistered.map((r) => (
                <code key={r.id} className="text-sm">{registerCmd.replace('<storeItem>', r.storeItem)}</code>
              ))}
            </Stack>
          </PanelCard>
        )}
      </Stack>
    </>
  );
}
