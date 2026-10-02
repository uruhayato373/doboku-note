import Link from 'next/link';
import { EmptyRow, numCol, PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { isStoreKind, loadStoreView, type StoreView } from '@/lib/stores';

export const dynamic = 'force-dynamic';

const href = (k: string, d?: string, f?: string) =>
  `/ops/store?${new URLSearchParams({ k, ...(d ? { d } : {}), ...(f ? { f } : {}) }).toString()}`;
const short = (s: string | null, n = 70) => (!s ? '' : s.length > n ? `${s.slice(0, n)}…` : s);
const Untracked = () => <StatusBadge tone="neutral" title="手元だけにあり git 管理外（CI からは見えない）">手元のみ</StatusBadge>;

/**
 * /ops/store — 設定（config/）とデータ（data/）の一覧と型（read-only）。k=config|data、d=領域、f=系列。
 * 日付・時刻だけ違うファイルは 1 系列にまとめ、型は系列の最新ファイルの実物から読む（scripts/lib/data-stores.mjs）。
 * 領域の割り当ては domains.json の documents。書き換えはファイルと PR で行う。
 */
export default async function StorePage({ searchParams }: { searchParams: Promise<{ k?: string; d?: string; f?: string }> }) {
  const { k, d, f } = await searchParams;
  const kind = isStoreKind(k) ? k : 'config';
  const v = loadStoreView(kind, d, f);
  const title = v.domain ? `${v.kindLabel} ＞ ${v.domain.label}` : v.kindLabel;

  return (
    <>
      <PageHead title={title} sub={`${kind}/ の ${v.total.files} ファイル（${v.total.series} 系列）。領域は domains.json の documents、型は実物から読む`} />
      <Stack>
        {v.error && <p className="project-warning-text text-sm">読めなかった: {v.error}</p>}

        {v.unassigned.length > 0 && (
          <PanelCard title={<>領域が決まらないファイル <StatusBadge tone="bad">{v.unassigned.length} 件</StatusBadge></>} description="domains.json の documents に割り当てを足す（git 管理下なら npm run check-domains が止める）">
            <ul className="text-sm">
              {v.unassigned.map((p) => <li key={p}><code>{p}</code></li>)}
            </ul>
          </PanelCard>
        )}

        {v.detail ? <Detail v={v} /> : v.domain ? <Rows v={v} /> : <Domains v={v} />}
      </Stack>
    </>
  );
}

function Domains({ v }: { v: StoreView }) {
  return (
    <PanelCard title="領域ごと">
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>領域</TableHead>
            <TableHead className={numCol}>系列</TableHead>
            <TableHead className={numCol}>ファイル</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {v.domains.length === 0 && <EmptyRow colSpan={3}>なし</EmptyRow>}
          {v.domains.map((d) => (
            <TableRow key={d.id}>
              <TableCell><Link href={href(v.kind, d.id)}>{d.label}</Link></TableCell>
              <TableCell className={numCol}>{d.series}</TableCell>
              <TableCell className={numCol}>{d.files}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableFrame>
    </PanelCard>
  );
}

function Rows({ v }: { v: StoreView }) {
  return (
    <PanelCard title={`${v.rows.length} 系列`} description="* は日付・時刻・ハッシュの部分。名前を開くと型・ファイル・参照しているコード">
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>名前・説明</TableHead>
            <TableHead>型</TableHead>
            <TableHead className={numCol}>ファイル</TableHead>
            <TableHead>更新</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {v.rows.map((r) => (
            <TableRow key={r.key} className="align-top">
              <TableCell className="whitespace-normal">
                <Link href={href(v.kind, v.domain?.id, r.key)}><code className="break-all text-xs">{r.name}</code></Link> {r.untracked && <Untracked />}
                {r.doc && <div className="mt-1 text-xs text-muted-foreground">{short(r.doc)}</div>}
              </TableCell>
              <TableCell className="text-sm">{r.shape}</TableCell>
              <TableCell className={numCol}>{r.files}</TableCell>
              <TableCell className="text-sm">{r.updated ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableFrame>
    </PanelCard>
  );
}

function Detail({ v }: { v: StoreView }) {
  const x = v.detail!;
  return (
    <>
      <PanelCard
        title={<code>{x.name}</code>}
        description={`${x.shape.format}・${x.shape.summary}`}
        action={<Link href={href(v.kind, v.domain?.id ?? x.domain ?? undefined)} className="text-sm">一覧へ</Link>}
      >
        {x.shape.doc ? <p className="whitespace-pre-wrap text-sm">{x.shape.doc}</p> : <p className="text-sm text-muted-foreground">説明（_doc）なし</p>}
        {x.shape.error && <p className="project-warning-text text-sm">読み取れない: {x.shape.error}</p>}
      </PanelCard>

      {x.shape.rows.length > 0 && (
        <PanelCard title="型" description={`最新ファイル（${x.files[0]?.path ?? '—'}）の実物から。? は無いことがある項目、{id} は対応表の各行`}>
          <TableFrame>
            <TableHeader>
              <TableRow>
                <TableHead>場所</TableHead>
                <TableHead>型</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {x.shape.rows.map((r, i) => (
                <TableRow key={`${r.path}${i}`}>
                  <TableCell><code className="text-xs">{r.path}</code></TableCell>
                  <TableCell className="text-sm">{r.type}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableFrame>
        </PanelCard>
      )}

      <PanelCard title={`ファイル ${x.files.length + x.more} 件`} description={x.more ? `新しい順に ${x.files.length} 件` : undefined}>
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>パス</TableHead>
              <TableHead>更新</TableHead>
              <TableHead className={numCol}>大きさ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {x.files.map((file) => (
              <TableRow key={file.path}>
                <TableCell><code className="text-xs">{file.path}</code> {file.untracked && <Untracked />}</TableCell>
                <TableCell className="text-sm">{file.updated ?? '—'}</TableCell>
                <TableCell className={numCol}>{file.size}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableFrame>
      </PanelCard>

      <PanelCard title={`参照しているコード ${x.refs.length} 件`} description={`「${x.refToken}」を含むファイル（scripts・管理画面・サイト・workflow の文字列一致）`}>
        {x.refs.length === 0 ? (
          <p className="text-sm text-muted-foreground">見つからない（読み手の無い設定・記録かもしれない）</p>
        ) : (
          <ul className="text-sm">
            {x.refs.map((r) => <li key={r}><code className="text-xs">{r}</code></li>)}
          </ul>
        )}
      </PanelCard>
    </>
  );
}
