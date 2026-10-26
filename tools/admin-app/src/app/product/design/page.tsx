import Link from 'next/link';
import { DataTable, StatusBadge, type DataTableColumn, type DataTableRow } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { loadDesignView, type DesignMagazine, type DesignPlanned, type DesignSingle, type DesignStage, type Intent, type Ref } from '@/lib/product-design';
import { yen } from '@/lib/format';

export const dynamic = 'force-dynamic';


const TIERS = [
  { id: 'pack', label: 'パック' },
  { id: 'magazine', label: 'マガジン' },
  { id: 'single', label: '単品' },
  { id: 'planned', label: '作成予定' },
] as const;
type TierId = (typeof TIERS)[number]['id'];

const QUALIFICATION_COLUMNS: DataTableColumn[] = [{ key: 'label', label: '資格' }];
const PLANNED_COLUMNS: DataTableColumn[] = [
  { key: 'title', label: '商品', wrap: true },
  { key: 'price', label: '価格', num: true },
  { key: 'expected', label: '意図の収録', num: true },
  { key: 'persona', label: 'ペルソナ' },
];
const SINGLE_COLUMNS: DataTableColumn[] = [
  { key: 'title', label: '単品', wrap: true },
  { key: 'price', label: '価格', num: true },
  { key: 'magazines', label: 'マガジン', wrap: true, sortable: false },
  { key: 'packs', label: 'パック', wrap: true, sortable: false },
];

/**
 * /product/design — 商品設計（read-only）。資格ごとに note 商品をパック・マガジン・単品の層で並べる。
 * 層は note の実際の収録から決め、商品の正本（収録の意図）との差と、作成予定の商品を重ねる（lib/product-design.ts）。資格はサイドバーの「商品設計」の枝、
 * 試験区分（s）と層（t）はページのタブ。表は 1 枚だけ置く（Card で囲まない）。
 * マガジン名を押すとその商品の行へ、単品タブは ?m=<マガジン> で収録記事に絞り、?orphan=1 でマガジン無しに絞る。
 */
export default async function ProductDesignPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; s?: string; t?: string; m?: string; orphan?: string }>;
}) {
  const sp = await searchParams;
  const view = loadDesignView(sp.q ?? null);

  if (!view.qualificationId) {
    return (
      <>
        <PageHead title="商品設計" />
        <DataTable
          columns={QUALIFICATION_COLUMNS}
          rows={view.qualifications.map((x): DataTableRow => ({
            id: x.id,
            values: { label: x.label },
            cells: { label: <Link href={`/product/design?q=${x.id}`}>{x.label}</Link> },
          }))}
          pageSize={100}
        />
      </>
    );
  }

  const stage = view.stages.find((x) => x.stageId === sp.s) ?? view.stages[0];
  const tier: TierId = TIERS.some((x) => x.id === sp.t) ? (sp.t as TierId) : 'pack';
  const href = (p: { s?: string; t?: string; m?: string | null; orphan?: boolean }) => {
    const u = new URLSearchParams({ q: view.qualificationId!, s: p.s ?? stage?.stageId ?? '', t: p.t ?? tier });
    if (p.m) u.set('m', p.m);
    if (p.orphan) u.set('orphan', '1');
    return `/product/design?${u.toString()}`;
  };
  const count = (st: DesignStage, t: TierId) =>
    t === 'pack' ? st.packs.length : t === 'magazine' ? st.magazines.length : t === 'planned' ? st.planned.length : st.singles.length;

  return (
    <>
      <PageHead title={`商品設計：${view.qualificationLabel}`} />
      <Stack>
        {view.sourceErrors.map((e) => (
          <p key={e} className="project-warning-text text-sm">{e}</p>
        ))}
        <nav className="filterbar">
          {view.stages.map((x) => (
            <Link key={x.stageId} href={href({ s: x.stageId })} className={'chip' + (x.stageId === stage?.stageId ? ' active' : '')}>
              {x.stageLabel}
            </Link>
          ))}
          {view.snapshotAt && <span className="small muted ml-auto">収録 {view.snapshotAt.slice(0, 10)}</span>}
        </nav>
        {!stage ? (
          <p className="text-sm text-muted-foreground">note の商品がありません。</p>
        ) : (
          <>
            <nav className="filterbar">
              {TIERS.map((x) => (
                <Link key={x.id} href={href({ t: x.id })} className={'chip' + (x.id === tier && !sp.m && !sp.orphan ? ' active' : '')}>
                  {x.label} {count(stage, x.id)}
                </Link>
              ))}
              {tier === 'single' && (
                <Link href={href({ t: 'single', orphan: true })} className={'chip' + (sp.orphan ? ' active' : '')}>
                  マガジン無し {stage.noMagazine}
                </Link>
              )}
            </nav>
            {tier === 'planned' ? (
              <PlannedTable rows={stage.planned} />
            ) : tier === 'single' ? (
              <SingleTable stage={stage} m={sp.m ?? null} orphan={Boolean(sp.orphan)} href={href} />
            ) : (
              <MagazineTable
                rows={tier === 'pack' ? stage.packs : stage.magazines}
                relation={tier === 'pack' ? '含む' : 'パック'}
                pick={(m) => (tier === 'pack' ? m.contains : m.inPacks)}
                href={href}
                packIds={new Set(stage.packs.map((p) => p.id))}
              />
            )}
          </>
        )}
      </Stack>
    </>
  );
}

type Href = (p: { s?: string; t?: string; m?: string | null; orphan?: boolean }) => string;

/** 参照先の層（パックかマガジンか）のタブへ、その行の位置で飛ぶ */
function RefLinks({ refs, href, tierOf }: { refs: Ref[]; href: Href; tierOf: (id: string) => TierId }) {
  if (refs.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <>
      {refs.map((r, i) => (
        <span key={r.id}>
          {i > 0 && '・'}
          <Link href={`${href({ t: tierOf(r.id) })}#${r.id}`}>{r.label}</Link>
        </span>
      ))}
    </>
  );
}

function MagazineTable({
  rows, relation, pick, href, packIds,
}: { rows: DesignMagazine[]; relation: string; pick: (m: DesignMagazine) => Ref[]; href: Href; packIds: Set<string> }) {
  const tierOf = (id: string): TierId => (packIds.has(id) ? 'pack' : 'magazine');
  const columns: DataTableColumn[] = [
    { key: 'title', label: '商品', wrap: true },
    { key: 'price', label: '価格', num: true },
    { key: 'count', label: '収録', num: true },
    { key: 'intent', label: '意図との差', wrap: true },
    { key: 'refs', label: relation, wrap: true, sortable: false },
  ];
  const tableRows: DataTableRow[] = rows.map((m) => ({
    id: m.id,
    values: {
      title: m.title,
      price: m.price,
      count: m.count,
      intent: intentText(m.intent),
      refs: pick(m).map((r) => r.label).join('・') || null,
    },
    cells: {
      // 参照先のリンク（#id）で飛べるよう、行の先頭の列に id を置く
      title: (
        <div id={m.id} className="min-w-[16rem]">
          {m.url ? <a href={m.url} target="_blank" rel="noreferrer">{m.title}</a> : m.title}
          {m.stage !== 'published' && (
            <>
              {' '}
              <StatusBadge tone="warn">{m.stageLabel}</StatusBadge>
            </>
          )}
        </div>
      ),
      price: yen(m.price),
      count: m.count == null ? '—' : <Link href={href({ t: 'single', m: m.id })}>{m.count}</Link>,
      intent: (
        <div className="text-sm">
          <IntentCell intent={m.intent} />
        </div>
      ),
      refs: (
        <div className="text-sm">
          <RefLinks refs={pick(m)} href={href} tierOf={tierOf} />
        </div>
      ),
    },
  }));
  return <DataTable columns={columns} rows={tableRows} emptyText="なし" pageSize={100} />;
}

/** 意図との差の、並べ替え・絞り込み用の文字（表示は IntentCell） */
function intentText(intent: Intent | null): string {
  if (!intent) return '正本に無い';
  if (intent.notIn == null || intent.extra == null) return '収録を読めない';
  if (intent.notIn === 0 && intent.extra === 0) return `意図どおり ${intent.expected}`;
  return [intent.notIn > 0 ? `未収録 ${intent.notIn}` : '', intent.extra > 0 ? `意図に無い ${intent.extra}` : ''].filter(Boolean).join(' ');
}

/** 正本の収録の意図に対する note 上の差。一致なら緑、足りない・意図に無いがあれば本数、正本に無い商品は — */
function IntentCell({ intent }: { intent: Intent | null }) {
  if (!intent) return <span className="text-muted-foreground">正本に無い</span>;
  if (intent.notIn == null || intent.extra == null) return <StatusBadge tone="warn">収録を読めない</StatusBadge>;
  const pending = intent.pending ? <span className="text-muted-foreground">（公開待ちの原稿 {intent.pending} 本）</span> : null;
  if (intent.notIn === 0 && intent.extra === 0) {
    return (
      <>
        <StatusBadge tone="good">意図どおり {intent.expected}</StatusBadge> {pending}
      </>
    );
  }
  return (
    <>
      {intent.notIn > 0 && <StatusBadge tone="warn">未収録 {intent.notIn}</StatusBadge>} {intent.extra > 0 && <StatusBadge tone="warn">意図に無い {intent.extra}</StatusBadge>} {pending}
    </>
  );
}

/** 正本にあって未公開の商品（作成予定）。作るときは npm run product -- plan が反映のコマンドを出す */
function PlannedTable({ rows }: { rows: DesignPlanned[] }) {
  const tableRows: DataTableRow[] = rows.map((x) => ({
    id: x.id,
    values: { title: x.title, price: x.price, expected: x.expected, persona: x.persona },
    cells: {
      // 参照先のリンク（#id）で飛べるよう、行の先頭の列に id を置く
      title: <div id={x.id} className="min-w-[16rem]">{x.title}</div>,
      price: x.price ?? '—',
      expected: (
        <>
          {x.expected}
          {x.pending > 0 && <span className="text-muted-foreground">（公開待ち {x.pending}）</span>}
        </>
      ),
      persona: <span className="text-sm">{x.persona ?? '—'}</span>,
    },
  }));
  return <DataTable columns={PLANNED_COLUMNS} rows={tableRows} emptyText="なし" pageSize={100} />;
}

function SingleTable({ stage, m, orphan, href }: { stage: DesignStage; m: string | null; orphan: boolean; href: Href }) {
  const packIds = new Set(stage.packs.map((p) => p.id));
  const holder = m ? [...stage.packs, ...stage.magazines].find((x) => x.id === m) : null;
  const rows: DesignSingle[] = stage.singles.filter(
    (x) => (!orphan || x.inMagazines.length === 0) && (!holder || [...x.inMagazines, ...x.inPacks].some((r) => r.id === holder.id)),
  );
  const tierOf = (id: string): TierId => (packIds.has(id) ? 'pack' : 'magazine');
  return (
    <>
      {holder && (
        <p className="text-sm">
          {holder.title} の収録 {rows.length} 本 <Link href={href({ t: 'single' })}>解除</Link>
        </p>
      )}
      <DataTable
        columns={SINGLE_COLUMNS}
        rows={rows.map((x): DataTableRow => ({
          id: x.key,
          values: {
            title: x.title,
            price: x.price,
            magazines: x.inMagazines.map((r) => r.label).join('・') || 'なし',
            packs: x.inPacks.map((r) => r.label).join('・') || null,
          },
          cells: {
            title: <a href={x.url} target="_blank" rel="noreferrer">{x.title}</a>,
            price: yen(x.price),
            magazines: (
              <div className="text-sm">
                {x.inMagazines.length ? <RefLinks refs={x.inMagazines} href={href} tierOf={tierOf} /> : <StatusBadge tone="warn">なし</StatusBadge>}
              </div>
            ),
            packs: (
              <div className="text-sm">
                <RefLinks refs={x.inPacks} href={href} tierOf={tierOf} />
              </div>
            ),
          },
        }))}
        filter="単品名で絞り込む"
        emptyText="なし"
      />
    </>
  );
}
