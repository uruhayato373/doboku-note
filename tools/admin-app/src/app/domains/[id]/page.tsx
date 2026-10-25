import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DataTable, PanelCard, type DataTableColumn, type DataTableRow } from '@/components/admin';
import { PageHead } from '@/components/ui';
import UpcomingEvents from '@/components/UpcomingEvents';
import { domainOverview } from '@/lib/domains';
import type { ScheduleDomain } from '@/lib/schedule';

export const dynamic = 'force-dynamic';

const TIER: Record<string, string> = { high: '高', mid: '中', low: '低', hold: '判断待ち' };

const CARD_COLUMNS: DataTableColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'タスク', wrap: true },
  { key: 'tier', label: '優先度' },
  { key: 'state', label: '状態' },
];
const MEMBER_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: '名前' },
  { key: 'kind', label: '種類' },
];
const DOC_COLUMNS: DataTableColumn[] = [{ key: 'name', label: '文書' }];

/** 文書パス → 管理画面の閲覧 URL（docs は /docs、作業マニュアルは /knowledge）。 */
function docHref(path: string): string {
  const noExt = path.replace(/\.md$/, '');
  const [base, rest] = noExt.startsWith('docs/') ? ['/docs', noExt.slice('docs/'.length)] : ['/knowledge', noExt.replace(/^\.claude\/knowledge\//, '')];
  // パスはファイル名由来なので区切りごとに符号化する（href に生の値を入れない）
  return `${base}/${rest.split('/').map(encodeURIComponent).join('/')}`;
}

/**
 * /domains/<id> — 領域の概要。次の予定・やりかけのタスク・使うスキルとエージェント・関連文書を1画面に。
 * 領域の正本は config/domains.json（サイドバーのグループ名がここへのリンク）。
 */
export default async function DomainPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = domainOverview(id);
  if (!o) notFound();
  const { domain, cards, skills, agents, documents } = o;

  const cardRows: DataTableRow[] = cards.map((c) => {
    const state = c.wip ? '進行中' : c.due ? `期日 ${c.due.slice(5).replace('-', '/')}` : '';
    return {
      id: c.id,
      values: { id: c.id, title: c.title, tier: TIER[c.tier] ?? c.tier, state },
      cells: {
        id: <Link href={`/todo?f=backlog&id=${encodeURIComponent(c.id)}`} className="font-mono text-xs">{c.id}</Link>,
        tier: <span className="text-xs">{TIER[c.tier] ?? c.tier}</span>,
        state: <span className="text-xs">{state}</span>,
      },
    };
  });
  const memberRows: DataTableRow[] = [...skills.map((s) => ({ ...s, kind: 'スキル' })), ...agents.map((a) => ({ ...a, kind: 'エージェント' }))].map((x) => ({
    id: x.kind + x.name,
    values: { name: x.name, kind: x.kind },
    cells: {
      name: <span className="font-mono text-xs">{x.name}</span>,
      kind: <span className="text-xs text-muted-foreground">{x.kind}</span>,
    },
  }));
  const docRows: DataTableRow[] = documents.map((d) => {
    const name = d.split('/').pop()!.replace(/\.md$/, '');
    return { id: d, values: { name }, cells: { name: <Link href={docHref(d)} className="text-xs">{name}</Link> } };
  });

  return (
    <>
      <PageHead title={domain.label} sub={domain.manages} />
      <UpcomingEvents domain={domain.id as ScheduleDomain} />

      <PanelCard title={<>タスク <span className="sub">{cards.length} 件</span></>}>
        <DataTable columns={CARD_COLUMNS} rows={cardRows} pageSize={50} filter={cards.length > 30 ? 'ID・タスクで絞り込む' : undefined} emptyText="なし" />
      </PanelCard>

      <div className="grid cols-2 mt-4">
        <PanelCard title={<>スキル・エージェント <span className="sub">{skills.length + agents.length} 件</span></>}>
          <DataTable columns={MEMBER_COLUMNS} rows={memberRows} pageSize={50} filter={memberRows.length > 30 ? '名前で絞り込む' : undefined} emptyText="なし" />
        </PanelCard>
        <PanelCard
          title={<>文書 <span className="sub">{documents.length} 件</span></>}
          action={<Link href="/docs" className="text-xs font-normal">すべての文書を探す →</Link>}
        >
          <DataTable columns={DOC_COLUMNS} rows={docRows} pageSize={50} filter={docRows.length > 30 ? '文書で絞り込む' : undefined} emptyText="なし" />
        </PanelCard>
      </div>
    </>
  );
}
