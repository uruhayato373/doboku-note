import { DataTable, DetailList, DetailSheet, type DataTableColumn, type DataTableRow, PanelCard, StatusBadge, type Tone, FilterBar, FilterChip } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { MAGAZINES_STALE_DAYS, membershipState, STATUS_STALE_DAYS, statusSnapshot } from '@/lib/note-status';

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
];

/** 鮮度バッジ。0-1 日=good / staleDays 以内=warn / 超過・不明=bad。staleDays は台帳の freshness.failDays。 */
function Age({ days, staleDays }: { days: number | null; staleDays: number }) {
  if (days == null) return <StatusBadge tone="bad">鮮度不明</StatusBadge>;
  const tone: Tone = days <= 1 ? 'good' : days <= staleDays ? 'warn' : 'bad';
  return <StatusBadge tone={tone}>{days} 日前</StatusBadge>;
}

const TABS = [
  { id: 'membership', label: 'マガジン収録' },
  { id: 'articles', label: '記事の公開状態' },
] as const;

export default async function NoteStatusPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const current = tab === 'articles' ? 'articles' : 'membership';
  const m = membershipState();
  const s = statusSnapshot();
  const bad = m.rows.filter((r) => !r.ok);

  return (
    <>
      <PageHead title="note 公開状態" />
      <FilterBar className="mb-3!">
        {TABS.map((t) => (
          <FilterChip key={t.id} active={t.id === current} href={t.id === 'membership' ? '/content/note-status' : `/content/note-status?tab=${t.id}`}>{t.label}</FilterChip>
        ))}
      </FilterBar>

      <Stack>
      {/* ─── 表1: マガジン収録の三軸 ─── */}
      {current === 'membership' && <PanelCard title="マガジン収録">
        <Stack>
        <p className="text-sm">
          {!m.ok ? (
            <><StatusBadge tone="bad">突合できていません</StatusBadge> {m.error}</>
          ) : (
            <>
              マガジン <strong>{m.rows.length}</strong> 件（記事 {m.articles} 本）· ズレ <StatusBadge tone={bad.length ? 'bad' : 'good'}>{bad.length}</StatusBadge> 件 · ライブ{' '}
              {m.freshness.ok ? (
                <><Age days={m.freshness.ageDays} staleDays={MAGAZINES_STALE_DAYS} /> （{m.freshness.fetchedAt}）</>
              ) : (
                <><StatusBadge tone="bad">未検査</StatusBadge> {m.freshness.reason}</>
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
                  magazine: r.title || r.id,
                  expected: r.expected,
                  repo: r.repoCount,
                  declared: r.declared ?? null,
                  live: r.liveCount ?? null,
                  verdict,
                },
                cells: {
                  magazine: (
                    <DetailSheet trigger={r.title || r.id} title={r.title || r.id} description={r.id}>
                      <DetailList items={[{ label: '注意', value: r.descWarn }, { label: '判定', value: verdict }]} />
                    </DetailSheet>
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

        {m.ok && m.unclassified.length > 0 && (
          <p className="text-sm">
            <StatusBadge tone="bad">未分類 {m.unclassified.length} 種</StatusBadge> {m.unclassified.map((u) => `${u.label}(${u.count})`).join('、')}
          </p>
        )}
        {m.ok && m.unreferenced.length > 0 && (
          <p className="text-sm">ラベルから辿れないマガジン {m.unreferenced.length} 件</p>
        )}
        </Stack>
      </PanelCard>}

      {/* ─── 表2: 記事別の公開状態 ─── */}
      {current === 'articles' && <PanelCard title="記事の公開状態">
        <Stack>
        <p className="text-sm">
          {!s.ok ? (
            <><StatusBadge tone="bad">未取得</StatusBadge> {s.error}</>
          ) : (
            <>
              <Age days={s.ageDays} staleDays={STATUS_STALE_DAYS} /> （{s.fetchedAt}） · 運用 <strong>{s.tracked}</strong> 本のうち実検査 <strong>{s.inspected}</strong> 本
              {s.stale && <> <StatusBadge tone="bad">古い</StatusBadge></>}
            </>
          )}
        </p>

        {s.ok && (
          <DataTable
            columns={SUMMARY_COLUMNS}
            rows={[
              { id: 'drift', n: s.drift.length, tone: 'bad', kind: 'ドリフト', meaning: 'ライブは公開済みだが frontmatter の noteStatus が古い' },
              { id: 'warn', n: s.warn.length, tone: 'warn', kind: '要確認', meaning: 'frontmatter は公開を主張するがライブが published でない' },
              { id: 'noLive', n: s.noLive.length, tone: 'warn', kind: '取得不能', meaning: 'throttle・予約未 live など' },
            ].map((x): DataTableRow => ({
              id: x.id,
              values: { kind: x.kind, count: x.n },
              cells: {
                kind: <DetailSheet trigger={x.kind} title={x.kind}><DetailList items={[{ label: '意味', value: x.meaning }]} /></DetailSheet>,
                count: x.n ? <StatusBadge tone={x.tone as Tone}>{x.n}</StatusBadge> : <StatusBadge tone="good">0</StatusBadge>,
              },
            }))}
          />
        )}

        {s.ok && s.drift.length > 0 && (
          <DetailSheet trigger={`ドリフト ${s.drift.length} 本の一覧`} title="ドリフト">
            <ul className="list-disc pl-5">{s.drift.map((d) => <li key={d.rel}>{d.rel}</li>)}</ul>
          </DetailSheet>
        )}
        </Stack>
      </PanelCard>}
      </Stack>
    </>
  );
}
