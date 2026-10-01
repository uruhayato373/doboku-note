import Link from 'next/link';
import {
  numCol, PanelCard, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow,
} from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import UpcomingEvents from '@/components/UpcomingEvents';
import { Badge } from '@/components/ui/badge';
import { loadLineupView, type LineupItem, type LineupRow } from '@/lib/lineup';

export const dynamic = 'force-dynamic';

const STAGE_ORDER = ['published', 'review', 'scheduled', 'draft', 'planned', 'retired', 'unknown'];

function stageVariant(stage: string): 'success' | 'warning' | 'outline' | 'secondary' | 'destructive' {
  if (stage === 'published') return 'success';
  if (stage === 'review' || stage === 'scheduled') return 'warning';
  if (stage === 'draft' || stage === 'planned') return 'outline';
  if (stage === 'unknown') return 'destructive';
  return 'secondary';
}

/**
 * /content/lineup — 商品ラインナップ（資格 × 試験区分 × チャネル）の read-only 画面。
 *
 * 一覧は販売中の件数だけで空きマス（未展開）を見せ、資格名から ?q=<資格id> の詳細（表紙つき・全件）へ進む。分類ルールは
 * `config/product-lineup.json`、判定は `scripts/lib/product-lineup.mjs`。
 * 価格・状態の変更や出品はしない（各チャネルのスキルの担当）。
 */
export default async function LineupPage({ searchParams }: { searchParams: Promise<{ retired?: string; q?: string }> }) {
  const { retired, q } = await searchParams;
  const showRetired = retired === '1';
  const view = loadLineupView();
  const { channels, unclassified, configErrors, sourceErrors } = view;
  // ?q=<資格id> ならその資格の詳細（表紙つき・全件）、無ければ一覧（販売中の件数だけ）
  const detail = q && view.rows.some((r) => r.qualificationId === q) ? q : null;
  const rows = detail ? view.rows.filter((r) => r.qualificationId === detail) : view.rows;
  const query = (extra: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const merged = { q: detail, retired: showRetired ? '1' : null, ...extra };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/content/lineup${s ? `?${s}` : ''}`;
  };

  const visible = (items: LineupItem[]) =>
    items
      .filter((i) => showRetired || i.stage !== 'retired')
      .sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));

  return (
    <>
      <PageHead title={detail ? `商品ラインナップ：${rows[0]!.qualificationLabel}` : '商品ラインナップ'} />
      <Stack>
      <UpcomingEvents domain="product" />

      {(configErrors.length > 0 || sourceErrors.length > 0) && (
        <PanelCard title="読み込みの問題">
          <ul className="text-sm">
            {sourceErrors.map((e) => (
              <li key={e.channel} className="project-warning-text">
                {e.channel}: {e.message}（このチャネルの空きマスは「未展開」ではなく「未検査」）
              </li>
            ))}
            {configErrors.map((e) => (
              <li key={e} className="project-warning-text">config: {e}</li>
            ))}
          </ul>
        </PanelCard>
      )}

      <div className="flex justify-between text-sm">
        <span>{detail && <Link href={query({ q: null })}>← 一覧へ</Link>}</span>
        {showRetired ? (
          <Link href={query({ retired: null })}>停止中を隠す</Link>
        ) : (
          <Link href={query({ retired: '1' })}>停止中も表示する</Link>
        )}
      </div>
      <TableFrame>
        <TableHeader>
          <TableRow>
            {!detail && <TableHead>資格</TableHead>}
            <TableHead>区分</TableHead>
            {channels.map((c) => (
              <TableHead key={c.id}>{c.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <LineupRowView key={row.key} row={row} channels={channels} visible={visible} detail={Boolean(detail)} href={query({ q: row.qualificationId })} />
          ))}
        </TableBody>
      </TableFrame>

      {unclassified.length > 0 && (
        <PanelCard title={`未分類 ${unclassified.length} 件`}>
          <p className="text-sm text-muted-foreground">
            どの分類ルールにも当たらなかった商品。<code>config/product-lineup.json</code> の rules に追加する。
          </p>
          <ul className="text-sm">
            {unclassified.map((i) => (
              <li key={`${i.channel}:${i.id}`}>
                <span className="font-mono">{i.channel}</span> {i.title} <span className="font-mono text-muted-foreground">{i.id}</span>
              </li>
            ))}
          </ul>
        </PanelCard>
      )}
      </Stack>
    </>
  );
}

function LineupRowView({
  row,
  channels,
  visible,
  detail,
  href,
}: {
  row: LineupRow;
  channels: { id: string; label: string }[];
  visible: (items: LineupItem[]) => LineupItem[];
  /** true: 表紙つきで全件（資格の詳細） / false: 販売中の件数だけ（一覧） */
  detail: boolean;
  href: string;
}) {
  return (
    <TableRow className="align-top">
      {row.isFirstStage && !detail && (
        <TableHead rowSpan={row.stageCount} scope="rowgroup" className="whitespace-nowrap">
          {detail ? row.qualificationLabel : <Link href={href}>{row.qualificationLabel}</Link>}
        </TableHead>
      )}
      <TableCell className="whitespace-nowrap">
        <div>{row.stageLabel}</div>
      </TableCell>
      {channels.map((c) => {
        const items = visible(row.byChannel[c.id] ?? []);
        const hasPublished = items.some((i) => i.stage === 'published');
        if (!detail) {
          const published = items.filter((i) => i.stage === 'published').length;
          const other = items.length - published;
          return (
            <TableCell key={c.id} className={numCol}>
              {published > 0 ? published : <span className="text-muted-foreground">未展開</span>}
              {other > 0 && <div className="text-[11px] text-muted-foreground">準備中 {other}</div>}
            </TableCell>
          );
        }
        return (
          <TableCell key={c.id} className="min-w-[200px] max-w-[260px] whitespace-normal">
            {!hasPublished && <div className="mb-1 text-sm text-muted-foreground">未展開</div>}
            <div className="flex flex-col gap-1.5">
              {items.map((i) => (
                <ItemTile key={i.id} item={i} />
              ))}
            </div>
          </TableCell>
        );
      })}
    </TableRow>
  );
}

function ItemTile({ item: i }: { item: LineupItem }) {
  const title = i.url ? (
    <a href={i.url} target="_blank" rel="noreferrer">
      {i.title}
    </a>
  ) : (
    i.title
  );
  return (
    <div className="flex items-start gap-2" title={i.note ?? i.id}>
      {i.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={i.coverUrl} alt="" width={48} loading="lazy" className="shrink-0 rounded-sm border border-border" />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-[27px] w-12 shrink-0 items-center justify-center rounded-sm border border-dashed border-border text-[10px] text-muted-foreground"
        >
          {i.platform ?? '表紙なし'}
        </span>
      )}
      <div className="min-w-0 text-sm leading-[1.35]">
        <div>{title}</div>
        <div className="text-muted-foreground">
          {i.price ?? '—'}
          {i.stage !== 'published' && (
            <>
              {' '}
              <Badge variant={stageVariant(i.stage)}>{i.stageLabel}</Badge>
            </>
          )}
        </div>
        {i.note && <div className="text-[11px] text-muted-foreground">{i.note}</div>}
      </div>
    </div>
  );
}
