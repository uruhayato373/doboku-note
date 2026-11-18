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
  { key: 'role', label: '役割' },
  { key: 'target', label: '対象' },
];
const DOC_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: '文書' },
  { key: 'updates', label: '更新' },
  { key: 'approves', label: '承認' },
];
const ROLE_COLUMNS: DataTableColumn[] = [
  { key: 'item', label: '項目' },
  { key: 'who', label: '担当' },
  { key: 'note', label: '補足', wrap: true },
];
const DATASET_COLUMNS: DataTableColumn[] = [
  { key: 'id', label: 'データ' },
  { key: 'writers', label: '書き手', wrap: true },
];

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
  const { domain, cards, skills, agents, documents, roles, datasets } = o;

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
  const members = [
    ...skills.map((s) => ({ ...s, kind: 'スキル', role: '', target: '' })),
    ...agents.map((a) => ({ ...a, kind: 'エージェント' })),
  ];
  const memberRows: DataTableRow[] = members.map((x) => ({
    id: x.kind + x.name,
    values: { name: x.name, kind: x.kind, role: x.role, target: x.target },
    cells: {
      name: <span className="font-mono text-xs">{x.name}</span>,
      kind: <span className="text-xs text-muted-foreground">{x.kind}</span>,
      role: <span className="text-xs">{x.role}</span>,
      target: <span className="text-xs text-muted-foreground">{x.target}</span>,
    },
  }));
  const docRows: DataTableRow[] = documents.map((d) => {
    const name = d.path.split('/').pop()!.replace(/\.md$/, '');
    return {
      id: d.path,
      values: { name, updates: d.updates, approves: d.approves },
      cells: {
        name: <Link href={docHref(d.path)} className="text-xs">{name}</Link>,
        updates: <span className="text-xs">{d.updates}</span>,
        approves: <span className="text-xs">{d.approves}</span>,
      },
    };
  });
  const roleItems = roles
    ? [
        { item: '決める', who: roles.decides, note: '' },
        { item: '判断の場', who: roles.review.join('・'), note: '' },
        ...roles.gaps.map((g) => ({ item: `空白: ${g.job}`, who: g.by, note: g.reason })),
      ]
    : [];
  const roleRows: DataTableRow[] = roleItems.map((r) => ({
    id: r.item,
    values: r,
    cells: { item: <span className="text-xs">{r.item}</span>, who: <span className="text-xs">{r.who}</span>, note: <span className="text-xs text-muted-foreground">{r.note}</span> },
  }));
  const unwritten = datasets.filter((d) => d.writers.length === 0).length;
  const datasetRows: DataTableRow[] = datasets.map((d) => {
    const writers = d.writers.join('・') || '未記入';
    return {
      id: d.id,
      values: { id: d.id, writers },
      cells: {
        id: d.area ? (
          <Link href={`/ops/store?k=${encodeURIComponent(d.area)}&d=${encodeURIComponent(domain.id)}&f=${encodeURIComponent(d.id)}`} className="font-mono text-xs" title={d.path}>{d.id}</Link>
        ) : (
          <span className="font-mono text-xs" title={d.path}>{d.id}</span>
        ),
        writers: <span className={d.writers.length ? 'text-xs' : 'text-xs text-muted-foreground'} title={d.writerNote || undefined}>{writers}</span>,
      },
    };
  });

  return (
    <>
      <PageHead title={domain.label} />
      <UpcomingEvents domain={domain.id as ScheduleDomain} />

      <div className="grid cols-2">
        <PanelCard title={<>担当 <span className="sub">空白 {roles?.gaps.length ?? 0} 件</span></>}>
          <DataTable columns={ROLE_COLUMNS} rows={roleRows} pageSize={50} emptyText="未設定（領域の正本の roles）" />
        </PanelCard>
        <PanelCard title={<>持ち物（データ） <span className="sub">{datasets.length} 件・書き手未記入 {unwritten} 件</span></>}>
          <DataTable columns={DATASET_COLUMNS} rows={datasetRows} pageSize={20} filter={datasetRows.length > 20 ? 'データ・書き手で絞り込む' : undefined} emptyText="なし" />
        </PanelCard>
      </div>

      <PanelCard title={<>タスク <span className="sub">{cards.length} 件</span></>} className="mt-4">
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
