import Link from 'next/link';
import { PageHead } from '@/components/ui';
import NoteStatusPage from '../../content/note-status/page';
import KindleContentPage from '../../content/kindle/page';
import { readCatalog } from '../../../../../../scripts/lib/coconala-catalog.mjs';

export const dynamic = 'force-dynamic';

const TABS = [
  { id: 'note', label: 'note', work: [['記事', '/content/note'], ['マガジン', '/content/magazines'], ['画像', '/gallery/note']] },
  { id: 'coconala', label: 'ココナラ', work: [['原稿', '/content/content~coconala']] },
  { id: 'kindle', label: 'Kindle', work: [['原稿', '/content/content~kindle']] },
] as const;

const COCONALA_STATUS: Record<string, string> = { listed: '出品中', published: '出品中', paused: '休止', draft: '下書き', review: '審査中' };

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
      <nav className="filterbar" style={{ marginBottom: 12 }}>
        {TABS.map((t) => (
          <Link key={t.id} href={`/product/status?ch=${t.id}`} className={'chip' + (t.id === tab.id ? ' active' : '')}>
            {t.label}
          </Link>
        ))}
        <span className="small muted" style={{ marginLeft: 'auto' }}>
          {tab.work.map(([label, href]) => (
            <Link key={href} href={href} style={{ marginLeft: 12 }}>
              {label}
            </Link>
          ))}
        </span>
      </nav>
      {tab.id === 'note' && <NoteStatusPage />}
      {tab.id === 'kindle' && <KindleContentPage />}
      {tab.id === 'coconala' && <Coconala />}
    </>
  );
}

function Coconala() {
  let rows: { id: string; title: string; shortTitle?: string; status: string; priceYen?: number; serviceUrl?: string; pauseReason?: string }[] = [];
  try {
    const c = readCatalog() as Record<string, (typeof rows)[number]>;
    rows = Object.entries(c).map(([id, v]) => ({ ...v, id }));
  } catch {
    return <p className="card">ココナラの台帳を読み取れません。</p>;
  }
  const order = (s: string) => (s === 'paused' ? 1 : s === 'draft' ? 2 : 0);
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>出品</th>
            <th>状態</th>
            <th className="num">価格</th>
          </tr>
        </thead>
        <tbody>
          {rows
            .sort((a, b) => order(a.status) - order(b.status))
            .map((r) => (
              <tr key={r.id}>
                <td>{r.serviceUrl ? <a href={r.serviceUrl} target="_blank" rel="noreferrer">{r.shortTitle ?? r.title}</a> : r.shortTitle ?? r.title}</td>
                <td className={r.status === 'paused' ? 'muted' : undefined}>
                  {COCONALA_STATUS[r.status] ?? r.status}
                  {r.pauseReason === 'retired' ? '（終了）' : ''}
                </td>
                <td className="num">{r.priceYen ? `¥${r.priceYen.toLocaleString('en-US')}` : '—'}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
