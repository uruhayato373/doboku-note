import Link from 'next/link';
import { DataTable, PanelCard, StatusBadge, type DataTableColumn, type DataTableRow, type Tone } from '@/components/admin';
import { Grid, Section, Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { num, yen } from '@/lib/format';
import { loadIssueView, type CalendarMark, type DnRef, type IssueState, type LeafView, type MetricValue, type Stage } from '@/lib/issues';

export const dynamic = 'force-dynamic';

/**
 * /strategy/issues — 事業イシューマップ（人が見る画面・読み取り専用）。組み立ては lib/issues.ts、正本は config/issue-map.json。
 * 判定日はバックログのカード、KPI は事業レポートから引く。更新は weekly-review・monthly-review の段で行う。
 */
const STATE: Record<IssueState, { label: string; tone: Tone }> = {
  seen: { label: '見えている', tone: 'good' },
  open: { label: '未検証', tone: 'warn' },
  unknown: { label: '判定不能', tone: 'neutral' },
  decided: { label: '決まっている', tone: 'good' },
  estimate: { label: '試算のみ', tone: 'warn' },
};
const MARK_CLASS: Record<CalendarMark, string> = {
  hot: 'text-primary',
  ok: 'text-primary',
  weak: 'text-amber-700 dark:text-amber-300',
  open: 'text-amber-700 dark:text-amber-300',
  zero: 'text-muted-foreground',
  prep: '',
  empty: 'text-muted-foreground',
};

const metricText = (m: MetricValue) => {
  if (m.value == null) return '未計測';
  return m.unit === '円' ? yen(m.value) : `${num(m.value)}${m.unit}`;
};
const todoHref = (id: string) => `/todo?f=backlog&id=${encodeURIComponent(id)}`;

/** 列が多い表のセル。スマホでは横にスクロールさせ、1 文字ずつ折り返さない幅を保つ。 */
function WideCell({ children }: { children: React.ReactNode }) {
  return <div className="min-w-36 text-xs whitespace-normal">{children}</div>;
}

function Dn({ dn }: { dn: DnRef }) {
  return (
    <span className="whitespace-nowrap">
      <Link href={todoHref(dn.id)} title={dn.title ?? undefined} className="font-mono">{dn.id}</Link>
      <span className="text-muted-foreground"> {dn.label}</span>
    </span>
  );
}

function Metric({ m }: { m: MetricValue }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-muted-foreground">{m.scope ? `${m.scope} ` : ''}{m.label} </span>
      <span className="font-medium tabular-nums">{metricText(m)}</span>
      {m.asOf && <span className="text-muted-foreground"> {m.asOf}</span>}
    </span>
  );
}

function LeafCard({ leaf }: { leaf: LeafView }) {
  const s = STATE[leaf.state];
  return (
    <div className="flex flex-col gap-1.5 rounded-md border p-3 dark:border-border">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-mono text-xs text-muted-foreground">{leaf.id}</span>
        <span className="text-sm font-semibold">{leaf.question}</span>
        <span className="ml-auto flex flex-wrap gap-1">
          <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
          {leaf.focus && <StatusBadge tone="info">今月の重点</StatusBadge>}
        </span>
      </div>
      <p className="m-0 text-xs leading-relaxed text-muted-foreground">{leaf.evidence}</p>
      {leaf.next && <p className="m-0 text-xs">次: {leaf.next}</p>}
      {leaf.metrics.length + leaf.proposed.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
          {leaf.metrics.map((m) => <Metric key={m.key} m={m} />)}
          {leaf.proposed.map((p) => <span key={p} className="text-muted-foreground">{p} 承認待ち</span>)}
        </div>
      )}
      {leaf.dns.length + leaf.competitors.length > 0 || leaf.map ? (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
          {leaf.dns.map((d) => <Dn key={d.id} dn={d} />)}
          {leaf.competitors.map((c) => <Link key={c.ref} href={c.href}>競合: {c.label}</Link>)}
          {leaf.map && <Link href={`/strategy/issues?map=${leaf.map.id}`}>掘り下げ: {leaf.map.label}</Link>}
        </div>
      ) : null}
    </div>
  );
}

function StageCard({ no, stage, factValues }: { no: number; stage: Stage; factValues: Record<string, MetricValue> }) {
  return (
    <PanelCard title={`${'①②③④'[no]} ${stage.title}`}>
      <Stack>
        {stage.lead && <p className="m-0 text-sm">{stage.lead}</p>}
        {stage.facts && (
          <div className="flex flex-wrap gap-2 text-xs">
            {stage.facts.map((f) => {
              const live = f.metric ? factValues[f.metric] : null;
              return (
                <span key={f.label} className="rounded-md border px-2 py-1 dark:border-border">
                  <span className="text-muted-foreground">{f.label} </span>
                  <span className="font-medium tabular-nums">{live ? metricText(live) : f.value}</span>
                </span>
              );
            })}
          </div>
        )}
        {stage.claim && <p className="m-0 border-l-2 border-primary pl-3 text-sm">{stage.claim}</p>}
        {stage.subs && <ol className="m-0 list-decimal space-y-1 pl-5 text-sm">{stage.subs.map((t) => <li key={t}>{t}</li>)}</ol>}
        {stage.checks && (
          <Grid min="md">
            {stage.checks.map((c, i) => (
              <div key={c.hypothesis} className="flex flex-col gap-1.5 rounded-md border p-3 dark:border-border">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
                  <StatusBadge tone={STATE[c.state].tone}>{STATE[c.state].label}</StatusBadge>
                </div>
                <p className="m-0 text-sm font-semibold">{c.hypothesis}</p>
                <p className="m-0 text-xs text-muted-foreground">{c.evidence}</p>
                <p className="m-0 text-xs">絵: {c.sketch}</p>
                <p className="m-0 text-xs">白黒: {c.judge}</p>
              </div>
            ))}
          </Grid>
        )}
        {stage.implications && <ol className="m-0 list-decimal space-y-1 pl-5 text-sm">{stage.implications.map((t) => <li key={t}>{t}</li>)}</ol>}
        {stage.forks && <ul className="m-0 list-disc space-y-1 pl-5 text-xs text-muted-foreground">{stage.forks.map((t) => <li key={t}>分岐: {t}</li>)}</ul>}
      </Stack>
    </PanelCard>
  );
}

const JUDGMENT_COLUMNS: DataTableColumn[] = [
  { key: 'when', label: '判定日' },
  { key: 'issues', label: '問い' },
  { key: 'picture', label: '白黒がつく絵', wrap: true },
  { key: 'kpi', label: 'KPI', wrap: true, sortable: false },
];
const RECEIPT_COLUMNS: DataTableColumn[] = [
  { key: 'month', label: '月' },
  { key: 'total', label: '受取', num: true },
  { key: 'gap', label: '目標との差', num: true },
];

export default async function IssuesPage({ searchParams }: { searchParams: Promise<{ map?: string }> }) {
  const { map } = await searchParams;
  const v = loadIssueView(map);
  const m = v.map;

  const judgmentRows: DataTableRow[] = v.judgments.map((j) => ({
    id: j.key,
    values: { when: j.timing[0]?.label ?? null, issues: j.issues.join('・'), picture: j.picture, kpi: null },
    cells: {
      when: (
        <span className="flex flex-col gap-0.5 text-xs">
          {j.timing.map((t) => (t.id ? <Dn key={t.id} dn={t} /> : <span key={t.label}>{t.label}</span>))}
          {j.due && <StatusBadge tone="warn" title={j.due}>更新の番</StatusBadge>}
        </span>
      ),
      kpi: <span className="flex flex-col gap-0.5 text-xs">{j.metrics.map((k) => <Metric key={k.key} m={k} />)}</span>,
    },
  }));
  const receiptRows: DataTableRow[] = (v.receipts?.rows ?? []).map((r) => ({
    id: r.month,
    values: { month: r.month, total: r.total, gap: r.gap },
    cells: {
      total: r.complete ? yen(r.total) : <span className="text-muted-foreground">{yen(r.total)}</span>,
      gap: r.gap == null ? '—' : <StatusBadge tone={r.gap >= 0 ? 'good' : 'warn'}>{`${r.gap >= 0 ? '+' : '−'}${yen(Math.abs(r.gap))}`}</StatusBadge>,
    },
  }));

  const calendarColumns: DataTableColumn[] = v.calendar
    ? [
        { key: 'label', label: '資格', wrap: true, sortable: false },
        ...v.calendar.columns.map((c) => ({
          key: c.id,
          wrap: true,
          sortable: false,
          label: (
            <WideCell>
              <div>{c.label}</div>
              <div className="font-normal text-muted-foreground">{c.sub}</div>
            </WideCell>
          ),
        })),
      ]
    : [];
  const calendarRows: DataTableRow[] = (v.calendar?.rows ?? []).map((r) => ({
    id: r.id,
    values: { label: r.label, ...Object.fromEntries((v.calendar?.columns ?? []).map((c, i) => [c.id, r.cells[i]?.text ?? null])) },
    cells: {
      label: (
        <WideCell>
          <div className="text-sm font-medium">{r.label}</div>
          {r.sub && <div className="text-muted-foreground">{r.sub}</div>}
          {r.receiptsYen != null && <div className="text-muted-foreground tabular-nums">累計の手取り {yen(r.receiptsYen)}</div>}
        </WideCell>
      ),
      ...Object.fromEntries(
        (v.calendar?.columns ?? []).map((col, i) => {
          const c = r.cells[i];
          return [
            col.id,
            c && (
              <WideCell>
                {c.head && <div className={`font-semibold ${MARK_CLASS[c.mark]}`}>{c.head}</div>}
                {c.text && <div className="text-muted-foreground">{c.text}</div>}
                {c.dns.length > 0 && <div className="mt-0.5 flex flex-col">{c.dns.map((d) => <Dn key={d.id} dn={d} />)}</div>}
              </WideCell>
            ),
          ];
        }),
      ),
    },
  }));
  const comparisonColumns: DataTableColumn[] = v.comparison
    ? [{ key: 'label', label: '', wrap: true, sortable: false }, ...v.comparison.columns.map((c, i) => ({ key: `q${i}`, label: c, wrap: true, sortable: false }))]
    : [];
  const comparisonRows: DataTableRow[] = (v.comparison?.rows ?? []).map((r) => ({
    id: r.label,
    values: { label: r.label, ...Object.fromEntries(r.cells.map((c, i) => [`q${i}`, c])) },
    cells: {
      label: <span className="text-xs text-muted-foreground">{r.label}</span>,
      ...Object.fromEntries(r.cells.map((c, i) => [`q${i}`, <WideCell key={i}>{c}</WideCell>])),
    },
  }));

  return (
    <>
      <PageHead title="イシューマップ" sub={`根拠の観測 ${m.asOf}・KPI ${v.period.startDate.slice(0, 7)}`} />
      <nav className="filterbar mb-3!">
        {v.maps.map((x) => (
          <Link key={x.id} className={'chip' + (x.id === m.id ? ' active' : '')} href={x.id === v.maps[0]?.id ? '/strategy/issues' : `/strategy/issues?map=${x.id}`}>
            {x.label}
          </Link>
        ))}
      </nav>

      <Stack gap="lg">
        <PanelCard title={m.question} description={v.parent ? <Link href={`/strategy/issues?map=${v.parent.mapId}`}>全体の {v.parent.issue} を掘り下げたマップ</Link> : undefined}>
          <Stack>
            <p className="m-0 text-sm">{m.stance}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {m.criteria.map((c) => <span key={c} className="rounded-md border px-2 py-0.5 dark:border-border">{c}</span>)}
            </div>
          </Stack>
        </PanelCard>

        <Section title="判定日">
          <DataTable columns={JUDGMENT_COLUMNS} rows={judgmentRows} pageSize={30} />
        </Section>

        {v.calendar && (
          <Section title="資格 × 時期の地図" note={v.calendar.notes.join(' ')}>
            <DataTable columns={calendarColumns} rows={calendarRows} pageSize={30} />
          </Section>
        )}

        {v.comparison && (
          <Section title={v.comparison.title} note={v.comparison.note}>
            <DataTable columns={comparisonColumns} rows={comparisonRows} pageSize={30} />
          </Section>
        )}

        <Section title="イシューツリー">
          <Stack>
            {v.branches.map((b) => (
              <PanelCard key={b.id} title={`${b.tag}: ${b.title}`} description={b.lead ?? undefined}>
                <Stack gap="sm">{b.leaves.map((l) => <LeafCard key={l.id} leaf={l} />)}</Stack>
              </PanelCard>
            ))}
          </Stack>
        </Section>

        {m.tables?.map((t) => (
          <Section key={t.title} title={t.title} note={t.note}>
            <DataTable
              columns={t.columns.map((c, i) => ({ key: `c${i}`, label: c, wrap: true, sortable: false }))}
              rows={t.rows.map((r) => ({
                id: r[0] as string,
                values: Object.fromEntries(r.map((c, i) => [`c${i}`, c])),
                cells: Object.fromEntries(r.map((c, i) => [`c${i}`, <WideCell key={i}>{c}</WideCell>])),
              }))}
            />
          </Section>
        ))}

        {v.receipts && (
          <Section title={`月の受取と目標 ${yen(v.receipts.targetYen)}`} note="薄い字は確定前の月を含む">
            <DataTable columns={RECEIPT_COLUMNS} rows={receiptRows} pageSize={24} />
          </Section>
        )}

        <Section title="ストーリーライン">
          <Stack>
            {m.storyline.map((s, i) => <StageCard key={s.title} no={i} stage={s} factValues={v.factValues} />)}
          </Stack>
        </Section>

        {m.notes.length > 0 && (
          <Section title="分解して見えたこと" note={m.asks}>
            <Grid min="md">
              {m.notes.map((n) => (
                <PanelCard key={n.title} title={n.title}>
                  <p className="m-0 text-sm">{n.body}</p>
                </PanelCard>
              ))}
            </Grid>
          </Section>
        )}

        {v.proposed.length > 0 && (
          <Section title="承認待ちの KPI">
            <ul className="m-0 list-disc space-y-1 pl-5 text-sm">
              {v.proposed.map((p) => (
                <li key={p.id}>
                  {p.label}: {p.why} <Link href={todoHref(p.dn)} className="font-mono text-xs">{p.dn}</Link>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </Stack>
    </>
  );
}
