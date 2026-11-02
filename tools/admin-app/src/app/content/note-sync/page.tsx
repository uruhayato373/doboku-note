import { PageHead } from '@/components/ui';
import { Stack } from '@/components/layout';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { noteSyncPlan, noteSyncRuns, type SyncItem, type SyncPart } from '@/lib/note-sync';
import { NOTE_BASE } from '../../../../../../scripts/lib/site-identity.mjs';
import { jstDateTime } from '@/lib/format';
import { DataTable, DetailList, DetailSheet, DetailText, StatusBadge, type DataTableColumn, type DataTableRow } from '@/components/admin';

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
  { key: 'reason', label: '理由' },
  { key: 'parts', label: '未反映' },
];

type Plan = ReturnType<typeof noteSyncPlan>;
function blockedRows(items: SyncItem[], blockers: Plan['blockers']): DataTableRow[] {
  return items.map((i) => ({
    id: i.path,
    values: { title: i.title, reason: blockers[i.blocker ?? '']?.label ?? i.blocker ?? null, parts: partsText(i) },
    cells: {
      title: (
        <DetailSheet trigger={i.title} title={i.title} description={i.path}>
          <DetailList
            items={[
              { label: '理由', value: blockers[i.blocker ?? '']?.label ?? i.blocker },
              { label: '未反映', value: partsText(i) },
              { label: 'note', value: <a href={noteUrl(i.noteId)} target="_blank" rel="noreferrer">開く</a> },
              { label: '中断', value: i.abort ? `${jstDateTime(i.abort.at, { short: true })} ${i.abort.reason}` : null },
            ]}
          />
          <DetailText title="直し方" items={[blockers[i.blocker ?? '']?.action]} />
        </DetailSheet>
      ),
      reason: blockers[i.blocker ?? '']?.label ?? i.blocker,
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
];

function runRows(runs: ReturnType<typeof noteSyncRuns>): DataTableRow[] {
  return runs.map((r) => {
    const problems = [...r.articles.failed.map((f) => `${f.path.split('/').slice(-2, -1)[0]}: ${f.reason}`), ...r.magazines.failed.map((f) => `${f.key}: ${f.reason}`), ...r.problems];
    return {
      id: r.startedAt,
      values: { finishedAt: r.finishedAt, articlesUpdated: r.articles.updated.length, articlesFailed: r.articles.failed.length, magazinesUpdated: r.magazines.updated.length },
      cells: {
        finishedAt: problems.length ? (
          <DetailSheet trigger={jstDateTime(r.finishedAt, { short: true })} title={jstDateTime(r.finishedAt, { short: true })} description="失敗・問題">
            <DetailText title="失敗・問題" items={problems} />
          </DetailSheet>
        ) : jstDateTime(r.finishedAt, { short: true }),
        articlesUpdated: `${r.articles.updated.length}/${r.articles.attempted}`,
        magazinesUpdated: `${r.magazines.updated.length}/${r.magazines.attempted}`,
      },
    };
  });
}

export default async function NoteSyncPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams;
  const plan = noteSyncPlan();
  const runs = noteSyncRuns();
  const blocked = plan.items.filter((i) => i.status === 'blocked');
  const ready = plan.items.filter((i) => i.status === 'ready');
  const tab: TabId = (TABS.find((t) => t.id === tabParam)?.id) ?? (blocked.length ? 'blocked' : 'ready');
  const count: Record<TabId, number> = { blocked: blocked.length, ready: ready.length, runs: runs.length };

  return (
    <Stack>
      <PageHead title="note 反映" />
      {!plan.ok ? (
        <p className="project-warning-text text-sm">
          <StatusBadge tone="bad">取得失敗</StatusBadge> {plan.error}
        </p>
      ) : (
        <>
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
              <DataTable columns={READY_COLUMNS} rows={readyRows(ready)} filter="記事・資格で絞り込む" />
            </>
          )}

          {tab === 'runs' && <DataTable columns={RUN_COLUMNS} rows={runRows(runs)} />}
        </>
      )}
    </Stack>
  );
}
