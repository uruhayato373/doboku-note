import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  DataTable, PanelCard, StatCard, StatusBadge, type DataTableColumn, type DataTableRow, type Tone,
} from '@/components/admin';
import { PageHead } from '@/components/ui';
import CopyButton from '@/components/CopyButton';
import { approvalState, loadXPlan } from '@/lib/x-plans';

export const dynamic = 'force-dynamic';

/** /sns/x/plans/<計画ファイル名> — 承認コマンドを打つ前に、その月の投稿の全文と承認の状態を見る（read-only） */
const STATE: Record<ReturnType<typeof approvalState>, { label: string; tone: Tone }> = {
  approved: { label: '承認済み', tone: 'good' },
  pending: { label: '未承認', tone: 'warn' },
  locked: { label: '予約後で触らない', tone: 'neutral' },
};

const COLUMNS: DataTableColumn[] = [
  { key: 'at', label: '日時' },
  { key: 'slot', label: '時間帯' },
  { key: 'frame', label: '年間の枠' },
  { key: 'status', label: '台帳の状態' },
  { key: 'approval', label: '承認' },
  { key: 'text', label: '本文', wrap: true, sortable: false },
];

export default async function XPlanDetailPage({ params }: { params: Promise<{ plan: string }> }) {
  const { plan: raw } = await params;
  const file = decodeURIComponent(raw);
  const p = loadXPlan(file);
  if (!p) notFound();

  const rows: DataTableRow[] = [...p.rows]
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .map((r): DataTableRow => {
      const s = STATE[approvalState(r)];
      return {
        id: r.id,
        values: { at: `${r.date} ${r.time}`, slot: r.slot, frame: r.frame, status: r.status, approval: s.label, text: r.text },
        cells: {
          at: <span className="whitespace-nowrap tabular-nums">{r.date} {r.time}</span>,
          approval: <StatusBadge tone={s.tone}>{s.label}</StatusBadge>,
          text: <pre className="m-0 whitespace-pre-wrap font-sans text-sm">{r.text}</pre>,
        },
      };
    });

  const count = (k: ReturnType<typeof approvalState>) => p.rows.filter((r) => approvalState(r) === k).length;
  const cmd = `npm run registry -- approve-x-plan --plan ${p.plan} --expect ${p.digest}`;

  return (
    <>
      <PageHead title={p.plan} />
      <p className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/sns/x/plans">← X の月次計画</Link>
        <span className="text-xs text-muted-foreground">digest <code>{p.digest}</code></span>
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="投稿" value={p.rows.length + p.unresolved.length} />
        <StatCard label="承認済み" value={count('approved')} />
        <StatCard label="未承認" value={count('pending')} />
        <StatCard label="予約後" value={count('locked')} />
      </div>

      {p.unresolved.length ? (
        <PanelCard title={`台帳に結べない投稿（${p.unresolved.length} 件）`} className="mb-4">
          <ul className="m-0 list-disc pl-5 text-sm">
            {p.unresolved.map((u) => <li key={u}>{u}</li>)}
          </ul>
        </PanelCard>
      ) : null}

      <PanelCard title="投稿（日時順）" className="mb-4">
        <DataTable columns={COLUMNS} rows={rows} pageSize={100} filter="投稿を絞り込む" emptyText="投稿がない" />
      </PanelCard>

      <PanelCard title="承認コマンド">
        {p.unresolved.length ? (
          <p className="m-0 text-sm">
            結べない投稿が {p.unresolved.length} 件あるため承認できない。上の一覧のとおり直してから、この画面を開き直す。
          </p>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <p className="m-0">本文と日時を上の表で確かめたら、ターミナルで打つ（未承認 {p.toWrite} 件を承認する。予約後の投稿は書き換えない）。</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-xs">{cmd}</code>
              <CopyButton text={cmd} label="コマンドをコピー" />
            </div>
          </div>
        )}
      </PanelCard>
    </>
  );
}
