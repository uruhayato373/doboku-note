import {
  PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow, type Tone,
} from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { membershipState, statusSnapshot, STALE_DAYS } from '@/lib/note-status';

export const dynamic = 'force-dynamic';

/** 鮮度バッジ。0-1 日=good / STALE_DAYS 以内=warn / 超過・不明=bad。 */
function Age({ days }: { days: number | null }) {
  if (days == null) return <StatusBadge tone="bad">鮮度不明</StatusBadge>;
  const tone: Tone = days <= 1 ? 'good' : days <= STALE_DAYS ? 'warn' : 'bad';
  return <StatusBadge tone={tone}>{days} 日前</StatusBadge>;
}

export default function NoteStatusPage() {
  const m = membershipState();
  const s = statusSnapshot();
  const bad = m.rows.filter((r) => !r.ok);

  return (
    <>
      <PageHead
        title="note 公開状態"
        sub="マガジン収録の三軸（repo 実数 ↔ SoT 件数表記 ↔ ライブ収録数）と、記事別の公開状態"
      />

      <Stack>
        <p className="text-sm text-muted-foreground">
          記事を足したのにライブへ収録し忘れる事故（2026-08-24 ゼネコン/河川コンサル各 2 本）は、
          SoT とライブの 2 者だけを比べる検査では捕まらない。両方が同じ値で古びるため。
          repo の記事実数（frontmatter <code>noteMagazine</code> の集計）が第三の軸になる。
        </p>

      {/* ─── 表1: マガジン収録の三軸 ─── */}
      <PanelCard title="マガジン収録">
        <Stack>
        <p className="text-sm text-muted-foreground">
          {!m.ok ? (
            <>
              <StatusBadge tone="bad">突合できていません</StatusBadge>{' '}
              check-magazine-membership が実行できないため、下の表は表示できません（空欄＝問題なし
              ではありません）。{m.error}
            </>
          ) : (
            <>
              マガジン <strong>{m.rows.length}</strong> 件を実検査（記事 {m.articles} 本）· ズレ{' '}
              <StatusBadge tone={bad.length ? 'bad' : 'good'}>{bad.length}</StatusBadge> 件
              {' · '}
              ライブ軸:{' '}
              {m.freshness.ok ? (
                <>
                  <Age days={m.freshness.ageDays} /> （{m.freshness.fetchedAt}）
                </>
              ) : (
                <>
                  <StatusBadge tone="bad">未検査</StatusBadge> {m.freshness.reason} —
                  「ライブ」列の空欄は<strong>問題なしではありません</strong>。
                  週次 note-live-audit.yml の snapshot 供給を確認すること
                </>
              )}
            </>
          )}
        </p>

        {m.ok && m.rows.length > 0 && (
          <TableFrame>
            <TableHeader>
              <TableRow>
                <TableHead>マガジン</TableHead>
                <TableHead>期待</TableHead>
                <TableHead>repo</TableHead>
                <TableHead>SoT</TableHead>
                <TableHead>ライブ</TableHead>
                <TableHead>判定</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {m.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-[28rem] whitespace-normal">
                    {r.title || r.id}
                    <br />
                    <span className="text-muted-foreground">{r.id}</span>
                    {r.descWarn && (
                      <>
                        <br />
                        <StatusBadge tone="warn">{r.descWarn}</StatusBadge>
                      </>
                    )}
                  </TableCell>
                  <TableCell>{r.expected}</TableCell>
                  <TableCell>
                    {r.repoCount}
                    {r.extra ? (
                      <span className="text-muted-foreground"> {r.extra > 0 ? `+${r.extra}` : r.extra}</span>
                    ) : null}
                  </TableCell>
                  <TableCell>{r.declared ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{r.liveCount ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    {!r.ok ? (
                      <StatusBadge tone="bad">{r.detail || r.kind}</StatusBadge>
                    ) : r.liveCount == null ? (
                      // ライブを見ていない行を緑にしない。「repo↔SoT は合っている」と
                      // 「三軸とも合っている」は別物で、緑にすると後者に読める。
                      <StatusBadge tone="warn">repo↔SoT のみ</StatusBadge>
                    ) : r.declared == null ? (
                      <StatusBadge tone="warn">repo↔ライブ のみ</StatusBadge>
                    ) : (
                      <StatusBadge tone="good">一致</StatusBadge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableFrame>
        )}

        {m.ok && (
          m.unclassified.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              <StatusBadge tone="bad">未分類 {m.unclassified.length} 種</StatusBadge>{' '}
              {m.unclassified.map((u) => `${u.label}(${u.count})`).join('、')}
              <br />
              <code>config/note-magazine-membership.json</code> の{' '}
              <code>labels</code> / <code>packs</code> / <code>excluded</code>{' '}
              のどれかへ登録する（未分類のまま放置すると、そのラベルは検査の射程外になる）。
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              <StatusBadge tone="good">未分類 0</StatusBadge>{' '}
              すべての <code>noteMagazine</code> ラベルが分類済み＝検査の射程に漏れが無い。
            </p>
          )
        )}
        {m.ok && m.unreferenced.length > 0 && (
          <p className="text-sm text-muted-foreground">
            labels から参照されないマガジン {m.unreferenced.length} 件（パック型など・ゲート対象外）
          </p>
        )}
        </Stack>
      </PanelCard>

      {/* ─── 表2: 記事別の公開状態 ─── */}
      <PanelCard title="記事の公開状態">
        <Stack>
        <p className="text-sm text-muted-foreground">
          {!s.ok ? (
            <>
              <StatusBadge tone="bad">未取得</StatusBadge>{' '}
              <code>data/note/status.json</code> が読めません。
              記事別のライブ公開状態は<strong>判定していません</strong>。
              週次 note-live-audit.yml が供給します（管理画面はライブ API を叩きません）。{s.error}
            </>
          ) : (
            <>
              <Age days={s.ageDays} /> （{s.fetchedAt}） · noteStatus 運用 <strong>{s.tracked}</strong> 本
              のうち実検査 <strong>{s.inspected}</strong> 本 · noteUrl のみで管理 {s.untracked} 本
              {s.stale && (
                <>
                  {' '}
                  <StatusBadge tone="bad">古い</StatusBadge> {STALE_DAYS} 日を超えています
                </>
              )}
            </>
          )}
        </p>

        {s.ok && (
          <TableFrame>
            <TableHeader>
              <TableRow>
                <TableHead>区分</TableHead>
                <TableHead>件数</TableHead>
                <TableHead>意味</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>ドリフト</TableCell>
                <TableCell>
                  {s.drift.length ? (
                    <StatusBadge tone="bad">{s.drift.length}</StatusBadge>
                  ) : (
                    <StatusBadge tone="good">0</StatusBadge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">ライブは公開済みだが frontmatter の noteStatus が古い</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>要確認</TableCell>
                <TableCell>
                  {s.warn.length ? (
                    <StatusBadge tone="warn">{s.warn.length}</StatusBadge>
                  ) : (
                    <StatusBadge tone="good">0</StatusBadge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">frontmatter は公開を主張するがライブが published でない</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>取得不能</TableCell>
                <TableCell>
                  {s.noLive.length ? (
                    <StatusBadge tone="warn">{s.noLive.length}</StatusBadge>
                  ) : (
                    <StatusBadge tone="good">0</StatusBadge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">throttle・予約未 live など。再実行で解消することが多い</TableCell>
              </TableRow>
            </TableBody>
          </TableFrame>
        )}

        {s.ok && s.drift.length > 0 && (
          <p className="text-sm text-muted-foreground">
            ドリフト: {s.drift.slice(0, 10).map((d) => d.rel).join('、')}
            {s.drift.length > 10 && ` … 他 ${s.drift.length - 10} 本`}
            <br />
            是正: <code>npm run verify-note-status -- --fix</code>
          </p>
        )}
        </Stack>
      </PanelCard>
      </Stack>
    </>
  );
}
