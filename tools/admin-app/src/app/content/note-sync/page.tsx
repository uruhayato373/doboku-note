import { PageHead } from '@/components/ui';
import { Grid, Stack } from '@/components/layout';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { noteSyncPlan, noteSyncRuns, type SyncItem, type SyncPart } from '@/lib/note-sync';
import { NOTE_BASE } from '../../../../../../scripts/lib/site-identity.mjs';
import { jstDateTime } from '@/lib/format';
import { DataTable, StatCard, StatusBadge, type DataTableColumn, type DataTableRow } from '@/components/admin';

export const dynamic = 'force-dynamic';

const PART_LABEL: Record<SyncPart, string> = { body: '本文', cover: 'カバー', tags: 'タグ', title: '題名' };
const TABS = [
  { id: 'blocked', label: '止まっている' },
  { id: 'ready', label: '反映待ち' },
  { id: 'runs', label: '週次の結果' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const noteUrl = (noteId: string) => `${NOTE_BASE}/n/${noteId}`;

function Title({ item }: { item: SyncItem }) {
  return (
    <a href={noteUrl(item.noteId)} target="_blank" rel="noreferrer" className="hover:underline">
      {item.title}
    </a>
  );
}

function Parts({ item }: { item: SyncItem }) {
  return (
    <span className="flex flex-wrap gap-1">
      {item.parts.map((p) => (
        <StatusBadge key={p} tone="info">{PART_LABEL[p]}</StatusBadge>
      ))}
      {item.needsPdfPull && <StatusBadge tone="neutral">PDF 取り寄せ</StatusBadge>}
    </span>
  );
}

const partsText = (i: SyncItem) => [...i.parts.map((p) => PART_LABEL[p]), ...(i.needsPdfPull ? ['PDF 取り寄せ'] : [])].join('・');

const BLOCKED_COLUMNS: DataTableColumn[] = [
  { key: 'title', label: '記事', wrap: true },
  { key: 'reason', label: '理由', wrap: true },
  { key: 'action', label: '直し方', wrap: true, sortable: false },
  { key: 'parts', label: '未反映' },
];

type Plan = ReturnType<typeof noteSyncPlan>;
function blockedRows(items: SyncItem[], blockers: Plan['blockers']): DataTableRow[] {
  return items.map((i) => ({
    id: i.path,
    values: { title: i.title, reason: blockers[i.blocker ?? '']?.label ?? i.blocker ?? null, action: blockers[i.blocker ?? '']?.action ?? null, parts: partsText(i) },
    cells: {
      title: <Title item={i} />,
      reason: (
        <>
          {blockers[i.blocker ?? '']?.label ?? i.blocker}
          {i.abort && <span className="block text-xs text-muted-foreground">{jstDateTime(i.abort.at, { short: true })} {i.abort.reason}</span>}
        </>
      ),
      action: <span className="text-xs">{blockers[i.blocker ?? '']?.action}</span>,
      parts: <Parts item={i} />,
    },
  }));
}

const READY_COLUMNS: DataTableColumn[] = [
  { key: 'title', label: '記事', wrap: true },
  { key: 'exam', label: '資格' },
  { key: 'parts', label: '未反映' },
];

function readyRows(items: SyncItem[]): DataTableRow[] {
  return items.map((i) => ({
    id: i.path,
    values: { title: i.title, exam: i.exam ?? null, parts: partsText(i) },
    cells: { title: <Title item={i} />, exam: <span className="text-xs">{i.exam}</span>, parts: <Parts item={i} /> },
  }));
}

const RUN_COLUMNS: DataTableColumn[] = [
  { key: 'finishedAt', label: '終了' },
  { key: 'articlesUpdated', label: '記事 更新', num: true },
  { key: 'articlesFailed', label: '記事 失敗', num: true },
  { key: 'magazinesUpdated', label: 'マガジン 更新', num: true },
  { key: 'problems', label: '失敗・問題', wrap: true, sortable: false },
];

function runRows(runs: ReturnType<typeof noteSyncRuns>): DataTableRow[] {
  return runs.map((r) => ({
    id: r.startedAt,
    values: {
      finishedAt: r.finishedAt,
      articlesUpdated: r.articles.updated.length,
      articlesFailed: r.articles.failed.length,
      magazinesUpdated: r.magazines.updated.length,
      problems: [...r.articles.failed.map((f) => `${f.path.split('/').slice(-2, -1)[0]}: ${f.reason}`), ...r.magazines.failed.map((f) => `${f.key}: ${f.reason}`), ...r.problems].slice(0, 8).join(' / ') || null,
    },
    cells: {
      finishedAt: jstDateTime(r.finishedAt, { short: true }),
      articlesUpdated: `${r.articles.updated.length}/${r.articles.attempted}`,
      magazinesUpdated: `${r.magazines.updated.length}/${r.magazines.attempted}`,
      problems: <span className="text-xs">{[...r.articles.failed.map((f) => `${f.path.split('/').slice(-2, -1)[0]}: ${f.reason}`), ...r.magazines.failed.map((f) => `${f.key}: ${f.reason}`), ...r.problems].slice(0, 8).join(' / ')}</span>,
    },
  }));
}

export default async function NoteSyncPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams;
  const plan = noteSyncPlan();
  const runs = noteSyncRuns();
  const blocked = plan.items.filter((i) => i.status === 'blocked');
  const ready = plan.items.filter((i) => i.status === 'ready');
  const tab: TabId = (TABS.find((t) => t.id === tabParam)?.id) ?? (blocked.length ? 'blocked' : 'ready');
  const count: Record<TabId, number> = { blocked: blocked.length, ready: ready.length, runs: runs.length };
  const last = runs[0];

  return (
    <Stack>
      <PageHead title="note 反映" />
      {!plan.ok ? (
        <p className="project-warning-text text-sm">
          <StatusBadge tone="bad">取得失敗</StatusBadge> {plan.error}
        </p>
      ) : (
        <>
          <Grid min="sm">
            <StatCard label="止まっている" value={plan.counts.blocked} />
            <StatCard label="反映待ち" value={plan.counts.ready} />
            <StatCard label="反映済み" value={plan.counts.synced} />
            <StatCard label="前回の週次" value={last ? `${jstDateTime(last.finishedAt, { short: true })}・${last.articles.updated.length} 件` : 'なし'} />
          </Grid>

          <TabsList aria-label="反映の状態">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} href={`/content/note-sync?tab=${t.id}`} active={t.id === tab}>
                {t.label}
                <StatusBadge tone={t.id === 'blocked' && count.blocked ? 'warn' : 'info'}>{count[t.id]}</StatusBadge>
              </TabsTrigger>
            ))}
          </TabsList>

          {tab === 'blocked' && <DataTable columns={BLOCKED_COLUMNS} rows={blockedRows(blocked, plan.blockers)} filter="記事・理由で絞り込む" />}

          {tab === 'ready' && (
            <>
              <Grid min="sm">
                <StatCard label="本文" value={plan.counts.parts.body} />
                <StatCard label="カバー" value={plan.counts.parts.cover} />
                <StatCard label="タグ" value={plan.counts.parts.tags} />
                <StatCard label="題名" value={plan.counts.parts.title ?? 0} />
                <StatCard label="PDF 取り寄せ" value={plan.counts.pdfPull} />
              </Grid>
              <DataTable columns={READY_COLUMNS} rows={readyRows(ready)} filter="記事・資格で絞り込む" />
            </>
          )}

          {tab === 'runs' && <DataTable columns={RUN_COLUMNS} rows={runRows(runs)} />}
        </>
      )}
    </Stack>
  );
}
