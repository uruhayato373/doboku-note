import { existsSync } from 'node:fs';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableRow } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { Card, CardContent } from '@/components/ui/card';
import { loadLedgerView, readApprovedThumbs } from '@/lib/ledger';
import { repoPath } from '@/lib/repo-root';
import { readCatalog, readListings } from '../../../../../../../../scripts/lib/coconala-catalog.mjs';
import { datasetPath } from '../../../../../../../../scripts/lib/datasets.mjs';

export const dynamic = 'force-dynamic';

/**
 * /content/ledger/coconala/<id> — ココナラの 1 サービスの正本を 1 画面で見る（DN-0438）。
 * 正本は 3 ファイルに分かれている（カタログ＝価格と状態、listings＝本文とカテゴリ、承認済み画像）。ここは読むだけで、
 * 直すのは各ファイル → 公開は /coconala-publish（coconala-edit）。公開ページとの照合は索引（npm run content-ledger）の結果。
 */

type Catalog = Record<string, { id: string; status: string; serviceUrl: string; priceYen: number | null; title: string; shortTitle: string | null; listedAt?: string; pauseReason: string | null }>;
type Listing = {
  category?: { _labels?: string };
  catchphrase?: string;
  deliveryDays?: number;
  purchaseNote?: string;
  body?: string;
  faq?: { q: string; a: string }[];
  options?: { title: string; priceYen: number; deliveryDays?: number }[];
};

const SOURCES = [
  { file: 'src/lib/coconala-services.ts', what: 'タイトル・価格・出品状態・公開 URL（カタログ）' },
  { file: datasetPath('config.coconala-listings'), what: 'キャッチコピー・カテゴリ・本文・FAQ・オプション（出品本文）' },
  { file: datasetPath('coconala.thumb-approved'), what: '商品画像（承認済みの POP 画像のパスと SHA-256）' },
];

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <TableRow>
      <TableHead className="w-40 align-top font-normal text-muted-foreground">{k}</TableHead>
      <TableCell className="whitespace-normal">{v}</TableCell>
    </TableRow>
  );
}

export default async function CoconalaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = decodeURIComponent(raw);
  const s = (readCatalog() as Catalog)[id];
  if (!s) notFound();
  const l = ((readListings() as Record<string, Listing>)[id] ?? {}) as Listing;
  const thumb = readApprovedThumbs()[id] ?? null;
  const thumbRel = thumb?.path.replace(/^content\/coconala\/assets\//, '') ?? null;
  const thumbLocal = thumb ? existsSync(repoPath(...thumb.path.split('/'))) : false;
  const row = loadLedgerView().rows.find((r) => r.key === `coconala-product:${id}`);
  const live = row?.live ?? null;
  const issues = live ? [...live.sale, ...live.text, ...live.price] : [];
  const bodyChars = (l.body ?? '').length;

  return (
    <>
      <PageHead title={s.shortTitle ?? s.title} />
      <p className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/content/ledger?c=coconala">← ココナラの台帳</Link>
        <StatusBadge tone="neutral">{s.status}{s.pauseReason ? `（${s.pauseReason}）` : ''}</StatusBadge>
        {s.serviceUrl ? <a href={s.serviceUrl} target="_blank" rel="noopener noreferrer">公開ページ</a> : null}
      </p>

      <Card className="mb-4">
        <CardContent>
          <h3 className="mb-2 font-semibold">公開ページとの照合</h3>
          {!live ? (
            <p className="text-sm text-muted-foreground">出品中ではないので照合していない。</p>
          ) : !live.checkedAt ? (
            <p className="text-sm text-muted-foreground">照合の索引が無い。<code>npm run content-ledger</code> で作る。</p>
          ) : issues.length === 0 ? (
            <p><StatusBadge tone="good">一致</StatusBadge> タイトル・キャッチコピー・本文・価格・販売状態が正本と同じ（照合 {live.checkedAt.slice(0, 16).replace('T', ' ')} UTC）</p>
          ) : (
            <ul className="list-disc pl-5">
              {issues.map((i) => <li key={i}>{i}</li>)}
            </ul>
          )}
          {live?.image ? <p className="mt-2"><StatusBadge tone="warn">画像</StatusBadge> {live.image}（作り方: <code>/create-pop-image</code>）</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <Card>
          <CardContent>
            <TableFrame>
              <TableBody>
                <Row k="タイトル" v={s.title} />
                <Row k="キャッチコピー" v={l.catchphrase ?? '—'} />
                <Row k="価格" v={s.priceYen != null ? `¥${s.priceYen.toLocaleString('ja-JP')}` : '—'} />
                <Row k="オプション" v={l.options?.length ? l.options.map((o) => `${o.title}（+¥${o.priceYen.toLocaleString('ja-JP')}）`).join(' / ') : '—'} />
                <Row k="お届け日数" v={l.deliveryDays != null ? `${l.deliveryDays} 日` : '—'} />
                <Row k="カテゴリ" v={l.category?._labels ?? '—'} />
                <Row k="出品日" v={s.listedAt ?? '—'} />
                <Row k="ID" v={<code>{s.id}</code>} />
              </TableBody>
            </TableFrame>
            <h3 className="mt-4 mb-1 font-semibold">本文（{bodyChars} 字）</h3>
            <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap text-sm">{l.body ?? '（listings に本文が無い）'}</pre>
            {l.purchaseNote ? (
              <>
                <h3 className="mt-4 mb-1 font-semibold">購入にあたってのお願い</h3>
                <pre className="whitespace-pre-wrap text-sm">{l.purchaseNote}</pre>
              </>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent>
              <h3 className="mb-2 font-semibold">商品画像</h3>
              {thumb && thumbLocal && thumbRel ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/media/coconala/${thumbRel}`} alt="承認済みの商品画像" className="w-full border" />
              ) : null}
              <p className="text-xs text-muted-foreground">
                {thumb ? <>承認済み: <code>{thumb.path}</code>{thumbLocal ? '' : '（この端末に無い。Drive vault の coconala-asset から取り戻す）'}</> : '承認済みの POP 画像が無い'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <h3 className="mb-2 font-semibold">正本（ここを直す）</h3>
              <ul className="list-disc pl-5 text-sm">
                {SOURCES.map((x) => <li key={x.file}><code>{x.file}</code> … {x.what}</li>)}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">直したら <code>/coconala-publish</code> で公開ページへ反映し、<code>npm run content-ledger</code> で照合し直す。</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
