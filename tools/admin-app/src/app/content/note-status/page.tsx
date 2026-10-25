import { DataTable, type DataTableColumn, type DataTableRow, PanelCard, StatusBadge, type Tone } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { MAGAZINES_STALE_DAYS, membershipState, STATUS_STALE_DAYS, statusSnapshot } from '@/lib/note-status';
import { datasetPath } from '../../../../../../scripts/lib/datasets.mjs';

export const dynamic = 'force-dynamic';

const MEMBERSHIP_COLUMNS: DataTableColumn[] = [
  { key: 'magazine', label: 'マガジン', wrap: true },
  { key: 'expected', label: '期待' },
  { key: 'repo', label: 'repo' },
  { key: 'declared', label: 'SoT' },
  { key: 'live', label: 'ライブ' },
  { key: 'verdict', label: '判定' },
];

const SUMMARY_COLUMNS: DataTableColumn[] = [
  { key: 'kind', label: '区分' },
  { key: 'count', label: '件数' },
  { key: 'meaning', label: '意味' },
];

/** 鮮度バッジ。0-1 日=good / staleDays 以内=warn / 超過・不明=bad。staleDays は台帳の freshness.failDays。 */
function Age({ days, staleDays }: { days: number | null; staleDays: number }) {
  if (days == null) return <StatusBadge tone="bad">鮮度不明</StatusBadge>;
  const tone: Tone = days <= 1 ? 'good' : days <= staleDays ? 'warn' : 'bad';
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
                  <Age days={m.freshness.ageDays} staleDays={MAGAZINES_STALE_DAYS} /> （{m.freshness.fetchedAt}）
                </>
              ) : (
                <>
                  <StatusBadge tone="bad">未検査</StatusBadge> {m.freshness.reason} —
                  「ライブ」列の空欄は<strong>問題なしではありません</strong>。
                  土曜の収集の note-audit 段（npm run check-weekly-collect）の snapshot 供給を確認すること
                </>
              )}
            </>
          )}
        </p>

        {m.ok && m.rows.length > 0 && (
          <DataTable
            columns={MEMBERSHIP_COLUMNS}
            rows={m.rows.map((r): DataTableRow => {
              const verdict = !r.ok ? r.detail || r.kind : r.liveCount == null ? 'repo↔SoT のみ' : r.declared == null ? 'repo↔ライブ のみ' : '一致';
              return {
                id: r.id,
                values: {
                  magazine: `${r.title || r.id} ${r.id}`,
                  expected: r.expected,
                  repo: r.repoCount,
                  declared: r.declared ?? null,
                  live: r.liveCount ?? null,
                  verdict,
                },
                cells: {
                  magazine: (
                    <div className="max-w-[28rem]">
                      {r.title || r.id}
                      <br />
                      <span className="text-muted-foreground">{r.id}</span>
                      {r.descWarn && (
                        <>
                          <br />
                          <StatusBadge tone="warn">{r.descWarn}</StatusBadge>
                        </>
                      )}
                    </div>
                  ),
                  repo: (
                    <>
                      {r.repoCount}
                      {r.extra ? (
                        <span className="text-muted-foreground"> {r.extra > 0 ? `+${r.extra}` : r.extra}</span>
                      ) : null}
                    </>
                  ),
                  declared: r.declared ?? <span className="text-muted-foreground">—</span>,
                  live: r.liveCount ?? <span className="text-muted-foreground">—</span>,
                  verdict: !r.ok ? (
                    <StatusBadge tone="bad">{r.detail || r.kind}</StatusBadge>
                  ) : r.liveCount == null ? (
                    // ライブを見ていない行を緑にしない。「repo↔SoT は合っている」と
                    // 「三軸とも合っている」は別物で、緑にすると後者に読める。
                    <StatusBadge tone="warn">repo↔SoT のみ</StatusBadge>
                  ) : r.declared == null ? (
                    <StatusBadge tone="warn">repo↔ライブ のみ</StatusBadge>
                  ) : (
                    <StatusBadge tone="good">一致</StatusBadge>
                  ),
                },
              };
            })}
            pageSize={100}
            filter="マガジン・判定で絞り込む"
          />
        )}

        {m.ok && (
          m.unclassified.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              <StatusBadge tone="bad">未分類 {m.unclassified.length} 種</StatusBadge>{' '}
              {m.unclassified.map((u) => `${u.label}(${u.count})`).join('、')}
              <br />
              <code>{datasetPath('config.note-magazine-membership')}</code> の{' '}
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
              <code>{datasetPath('note.status')}</code> が読めません。
              記事別のライブ公開状態は<strong>判定していません</strong>。
              土曜の収集の note-audit 段が週次で供給します（管理画面はライブ API を叩きません）。{s.error}
            </>
          ) : (
            <>
              <Age days={s.ageDays} staleDays={STATUS_STALE_DAYS} /> （{s.fetchedAt}） · noteStatus 運用 <strong>{s.tracked}</strong> 本
              のうち実検査 <strong>{s.inspected}</strong> 本 · noteUrl のみで管理 {s.untracked} 本
              {s.stale && (
                <>
                  {' '}
                  <StatusBadge tone="bad">古い</StatusBadge> {STATUS_STALE_DAYS} 日を超えています
                </>
              )}
            </>
          )}
        </p>

        {s.ok && (
          <DataTable
            columns={SUMMARY_COLUMNS}
            rows={[
              { id: 'drift', n: s.drift.length, tone: 'bad', kind: 'ドリフト', meaning: 'ライブは公開済みだが frontmatter の noteStatus が古い' },
              { id: 'warn', n: s.warn.length, tone: 'warn', kind: '要確認', meaning: 'frontmatter は公開を主張するがライブが published でない' },
              { id: 'noLive', n: s.noLive.length, tone: 'warn', kind: '取得不能', meaning: 'throttle・予約未 live など。再実行で解消することが多い' },
            ].map((x): DataTableRow => ({
              id: x.id,
              values: { kind: x.kind, count: x.n, meaning: x.meaning },
              cells: {
                count: x.n ? <StatusBadge tone={x.tone as Tone}>{x.n}</StatusBadge> : <StatusBadge tone="good">0</StatusBadge>,
                meaning: <span className="text-muted-foreground">{x.meaning}</span>,
              },
            }))}
          />
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
