import { PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { authCredentialsView, type CollectAuthStage, type CredentialRow } from '@/lib/auth-credentials';

export const dynamic = 'force-dynamic';

/**
 * /ops/auth — ログインが必要な全サービスについて、人が見るべきことだけを出す:
 * ログイン ID・この PC の登録・自動ログインの有無・要対応・土曜の Mac 収集の直近のログイン確認（auth 段）。
 * CI（GitHub Actions）はログインしない。正本は .claude/config/playwright-auth-profiles.json の credential、ID とパスワードは各 PC の資格情報ストア（パスワードは読まない）。
 */
const MACHINE_LABEL = { windows: 'Windows', mac: 'Mac', other: 'この PC' } as const;

/** 人が手を打つべきこと（無ければ null）。 */
function action(r: CredentialRow): { text: string; detail?: string } | null {
  const registered = r.storePresent === true || r.sharedPresent === true;
  if (r.storePresent === false && !registered) return { text: '未登録' };
  if (r.failMarks.length > 0) return { text: 'ログインし直す', detail: `npm run auth:login -- --service ${r.id} の後、失敗印を消す:\n${r.failMarks.join('\n')}` };
  return null;
}

const COLLECT_TONE = { ok: 'good', warn: 'warn', skipped: 'info', failed: 'bad' } as const;
const COLLECT_LABEL = { ok: '成功', warn: '注意', skipped: '省略', failed: '失敗' } as const;

/** 土曜の収集の auth 段の結果を 1 行で（日時は JST 表示）。 */
function collectLine(c: CollectAuthStage): string {
  if (!c.finishedAt) return c.reason;
  const when = new Date(c.finishedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', dateStyle: 'short', timeStyle: 'short' });
  return `${when} 終了${c.reason ? `・${c.reason}` : ''}`;
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
        sub={`${MACHINE_LABEL[v.machine]} · 登録 ${v.rows.length - unregistered.length}/${v.rows.length} · 要対応 ${todo.length} 件 · 土曜の収集のログイン確認 ${v.collectAuth.status ? COLLECT_LABEL[v.collectAuth.status] : '記録なし'}`}
      />
      <Stack>
        <PanelCard title="土曜の Mac 収集のログイン確認" description="weekly-collect の auth 段（切れていれば資格情報で 1 回だけ入り直す）の直近の結果。CI はログインしない">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {v.collectAuth.status
              ? <StatusBadge tone={COLLECT_TONE[v.collectAuth.status]}>{COLLECT_LABEL[v.collectAuth.status]}</StatusBadge>
              : <StatusBadge tone="info">記録なし</StatusBadge>}
            <span>{collectLine(v.collectAuth)}</span>
          </div>
        </PanelCard>
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>サービス</TableHead>
              <TableHead>ログイン ID</TableHead>
              <TableHead title="この PC の資格情報マネージャー（Mac はキーチェーン）">この PC</TableHead>
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
