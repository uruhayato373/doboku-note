import Link from 'next/link';
import { DataTable, type DataTableColumn, type DataTableRow } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import NoteStatusPage from '../../content/note-status/page';
import KindleContentPage from '../../content/kindle/page';
import { yen } from '@/lib/format';
import { readCatalog } from '../../../../../../scripts/lib/coconala-catalog.mjs';

export const dynamic = 'force-dynamic';

const TABS = [
  { id: 'note', label: 'note', work: [['記事', '/content/note'], ['マガジン', '/content/magazines'], ['画像', '/gallery/note']] },
  { id: 'coconala', label: 'ココナラ', work: [['原稿', '/content/content~coconala']] },
  { id: 'kindle', label: 'Kindle', work: [['原稿', '/content/content~kindle']] },
] as const;

const COCONALA_STATUS: Record<string, string> = { listed: '出品中', published: '出品中', paused: '休止', draft: '下書き', review: '審査中' };

const COCONALA_COLUMNS: DataTableColumn[] = [
  { key: 'title', label: '出品' },
  { key: 'status', label: '状態' },
  { key: 'price', label: '価格', num: true },
];

/**
 * /product/status — 販売状態（人が手を打つもの）。チャネルはサイドバーの枝にせずこのページのタブにする
 * （domains.json navRules）。原稿・画像の作業場は各タブ上のリンクから開く。
 */
export default async function ProductStatusPage({ searchParams }: { searchParams: Promise<{ ch?: string }> }) {
  const { ch } = await searchParams;
  const tab = TABS.find((t) => t.id === ch) ?? TABS[0];
  return (
    <>
      <PageHead title="販売状態" />
      <Stack>
      <nav className="filterbar">
        {TABS.map((t) => (
          <Link key={t.id} href={`/product/status?ch=${t.id}`} className={'chip' + (t.id === tab.id ? ' active' : '')}>
            {t.label}
          </Link>
        ))}
        <span className="small muted ml-auto">
          {tab.work.map(([label, href]) => (
            <Link key={href} href={href} className="ml-3">
              {label}
            </Link>
          ))}
        </span>
      </nav>
      {tab.id === 'note' && <NoteStatusPage />}
      {tab.id === 'kindle' && <KindleContentPage />}
      {tab.id === 'coconala' && <Coconala />}
      </Stack>
    </>
  );
}

function Coconala() {
  let rows: { id: string; title: string; shortTitle?: string; status: string; priceYen?: number; serviceUrl?: string; pauseReason?: string }[] = [];
  try {
    const c = readCatalog() as Record<string, (typeof rows)[number]>;
    rows = Object.entries(c).map(([id, v]) => ({ ...v, id }));
  } catch {
    return <p className="text-sm text-muted-foreground">ココナラの台帳を読み取れません。</p>;
  }
  const order = (s: string) => (s === 'paused' ? 1 : s === 'draft' ? 2 : 0);
  const tableRows: DataTableRow[] = rows
    .sort((a, b) => order(a.status) - order(b.status))
    .map((r) => {
      const title = r.shortTitle ?? r.title;
      const status = `${COCONALA_STATUS[r.status] ?? r.status}${r.pauseReason === 'retired' ? '（終了）' : ''}`;
      return {
        id: r.id,
        values: { title, status, price: r.priceYen || null },
        cells: {
          title: r.serviceUrl ? <a href={r.serviceUrl} target="_blank" rel="noreferrer">{title}</a> : title,
          status: r.status === 'paused' ? <span className="text-muted-foreground">{status}</span> : status,
          price: r.priceYen ? yen(r.priceYen) : '—',
        },
      };
    });
  return <DataTable columns={COCONALA_COLUMNS} rows={tableRows} pageSize={100} />;
}
