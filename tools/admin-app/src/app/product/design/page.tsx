import Link from 'next/link';
import { numCol, PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
import { Stack } from '@/components/layout';
import { Kpi, PageHead } from '@/components/ui';
import { loadDesignView, type DesignMagazine, type DesignSingle } from '@/lib/product-design';

export const dynamic = 'force-dynamic';

const yen = (n: number | null) => (n == null ? '—' : `¥${n.toLocaleString('ja-JP')}`);

/**
 * /product/design — 商品設計（read-only）。資格ごとに note 商品をパック・マガジン・単品の層で並べる。
 * 層は note の実際の収録から決める（lib/product-design.ts）。資格はサイドバーの「商品設計」の枝、試験区分はページのタブ。
 */
export default async function ProductDesignPage({ searchParams }: { searchParams: Promise<{ q?: string; s?: string }> }) {
  const { q, s } = await searchParams;
  const view = loadDesignView(q ?? null);

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

  const stage = view.stages.find((x) => x.stageId === s) ?? view.stages[0];
  return (
    <>
      <PageHead title={`商品設計：${view.qualificationLabel}`} />
      <Stack>
        {view.sourceErrors.length > 0 && (
          <PanelCard title="読み込めないもの">
            <ul className="text-sm">
              {view.sourceErrors.map((e) => (
                <li key={e} className="project-warning-text">{e}</li>
              ))}
            </ul>
          </PanelCard>
        )}
        <nav className="filterbar">
          {view.stages.map((x) => (
            <Link key={x.stageId} href={`/product/design?q=${view.qualificationId}&s=${x.stageId}`} className={'chip' + (x.stageId === stage?.stageId ? ' active' : '')}>
              {x.stageLabel}
            </Link>
          ))}
          {view.snapshotAt && <span className="small muted ml-auto">収録 {view.snapshotAt.slice(0, 10)}</span>}
        </nav>
        {stage ? (
          <>
            <div className="grid cols-4">
              <Kpi label="パック" value={stage.packs.length} />
              <Kpi label="マガジン" value={stage.magazines.length} />
              <Kpi label="単品" value={stage.singles.length} />
              <Kpi label="マガジン無しの単品" value={stage.noMagazine} />
            </div>
            <PanelCard title="パック">
              <MagazineTable rows={stage.packs} relation="含む" pick={(m) => m.contains} />
            </PanelCard>
            <PanelCard title="マガジン">
              <MagazineTable rows={stage.magazines} relation="パック" pick={(m) => m.inPacks} />
            </PanelCard>
            <PanelCard title="単品">
              <SingleTable rows={stage.singles} />
            </PanelCard>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">note の商品がありません。</p>
        )}
      </Stack>
    </>
  );
}

function MagazineTable({ rows, relation, pick }: { rows: DesignMagazine[]; relation: string; pick: (m: DesignMagazine) => string[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">なし</p>;
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
        {rows.map((m) => (
          <TableRow key={m.id} className="align-top">
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
            <TableCell className={numCol}>{m.count ?? '—'}</TableCell>
            <TableCell className="whitespace-normal text-sm">{pick(m).join('・') || <span className="text-muted-foreground">—</span>}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </TableFrame>
  );
}

function SingleTable({ rows }: { rows: DesignSingle[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">なし</p>;
  return (
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
        {rows.map((x) => (
          <TableRow key={x.key} className="align-top">
            <TableCell className="whitespace-normal">
              <a href={x.url} target="_blank" rel="noreferrer">{x.title}</a>
            </TableCell>
            <TableCell className={numCol}>{yen(x.price)}</TableCell>
            <TableCell className="whitespace-normal text-sm">
              {x.inMagazines.length ? x.inMagazines.join('・') : <StatusBadge tone="warn">なし</StatusBadge>}
            </TableCell>
            <TableCell className="whitespace-normal text-sm">{x.inPacks.join('・') || <span className="text-muted-foreground">—</span>}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </TableFrame>
  );
}
