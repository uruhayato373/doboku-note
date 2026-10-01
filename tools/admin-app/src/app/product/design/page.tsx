import Link from 'next/link';
import { EmptyRow, numCol, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { loadDesignView, type DesignMagazine, type DesignSingle, type DesignStage, type Ref } from '@/lib/product-design';

export const dynamic = 'force-dynamic';

const yen = (n: number | null) => (n == null ? '—' : `¥${n.toLocaleString('ja-JP')}`);

const TIERS = [
  { id: 'pack', label: 'パック' },
  { id: 'magazine', label: 'マガジン' },
  { id: 'single', label: '単品' },
] as const;
type TierId = (typeof TIERS)[number]['id'];

/**
 * /product/design — 商品設計（read-only）。資格ごとに note 商品をパック・マガジン・単品の層で並べる。
 * 層は note の実際の収録から決める（lib/product-design.ts）。資格はサイドバーの「商品設計」の枝、
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
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>資格</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.qualifications.map((x) => (
              <TableRow key={x.id}>
                <TableCell>
                  <Link href={`/product/design?q=${x.id}`}>{x.label}</Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableFrame>
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
  const count = (st: DesignStage, t: TierId) => (t === 'pack' ? st.packs.length : t === 'magazine' ? st.magazines.length : st.singles.length);

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
            {tier === 'single' ? (
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
  return (
    <TableFrame>
      <TableHeader>
        <TableRow>
          <TableHead>商品</TableHead>
          <TableHead className={numCol}>価格</TableHead>
          <TableHead className={numCol}>収録</TableHead>
          <TableHead>{relation}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && <EmptyRow colSpan={4}>なし</EmptyRow>}
        {rows.map((m) => (
          <TableRow key={m.id} id={m.id} className="align-top">
            <TableCell className="min-w-[16rem] whitespace-normal">
              {m.url ? <a href={m.url} target="_blank" rel="noreferrer">{m.title}</a> : m.title}
              {m.stage !== 'published' && (
                <>
                  {' '}
                  <StatusBadge tone="warn">{m.stageLabel}</StatusBadge>
                </>
              )}
            </TableCell>
            <TableCell className={numCol}>{yen(m.price)}</TableCell>
            <TableCell className={numCol}>
              {m.count == null ? '—' : <Link href={href({ t: 'single', m: m.id })}>{m.count}</Link>}
            </TableCell>
            <TableCell className="whitespace-normal text-sm">
              <RefLinks refs={pick(m)} href={href} tierOf={tierOf} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </TableFrame>
  );
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
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>単品</TableHead>
            <TableHead className={numCol}>価格</TableHead>
            <TableHead>マガジン</TableHead>
            <TableHead>パック</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && <EmptyRow colSpan={4}>なし</EmptyRow>}
          {rows.map((x) => (
            <TableRow key={x.key} className="align-top">
              <TableCell className="whitespace-normal">
                <a href={x.url} target="_blank" rel="noreferrer">{x.title}</a>
              </TableCell>
              <TableCell className={numCol}>{yen(x.price)}</TableCell>
              <TableCell className="whitespace-normal text-sm">
                {x.inMagazines.length ? <RefLinks refs={x.inMagazines} href={href} tierOf={tierOf} /> : <StatusBadge tone="warn">なし</StatusBadge>}
              </TableCell>
              <TableCell className="whitespace-normal text-sm">
                <RefLinks refs={x.inPacks} href={href} tierOf={tierOf} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableFrame>
    </>
  );
}
