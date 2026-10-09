import Link from 'next/link';
import { EmptyRow, numCol, PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { isStoreArea, loadStoreView, type StoreView } from '@/lib/stores';
import { REGISTRY_PATH } from '../../../../../../scripts/lib/qualification-registry.mjs';
import { QualificationSsot } from './qualification-ssot';

export const dynamic = 'force-dynamic';

const href = (k: string, d?: string, f?: string) =>
  `/ops/store?${new URLSearchParams({ k, ...(d ? { d } : {}), ...(f ? { f } : {}) }).toString()}`;
const Local = () => <StatusBadge tone="neutral" title="手元だけにあり git 管理外（CI からは見えない）">手元のみ</StatusBadge>;

/**
 * /ops/store — 設定（config/）・データ（data/）・コンテンツ台帳（content/registry/）の台帳（read-only）。k=config|data|registry、d=領域、f=データセット id。
 * 何がどのデータかは scripts/lib/datasets.mjs の台帳が正本。型（zod）のあるものは型の定義と検査結果、
 * 無いものは最新ファイルの実物から読んだ形を出す。書き換えはファイルと PR で行う。
 * 資格の正本（qualification-registry.json）を開いたときは、中身と名前の写しの検査結果を型の上に出す（旧 /ops/ssot）。
 */
export default async function StorePage({ searchParams }: { searchParams: Promise<{ k?: string; d?: string; f?: string }> }) {
  const { k, d, f } = await searchParams;
  const area = isStoreArea(k) ? k : 'config';
  const v = loadStoreView(area, d, f);
  const title = v.domain ? `${v.areaLabel} ＞ ${v.domain.label}` : v.areaLabel;

  return (
    <>
      <PageHead title={title} sub={`${area}/ の ${v.total.files} ファイル・${v.total.datasets} データセット（型あり ${v.total.typed}）。台帳は scripts/lib/datasets.mjs`} />
      <Stack>
        {v.error && <p className="project-warning-text text-sm">読めなかった: {v.error}</p>}

        {v.unmatched.length > 0 && (
          <PanelCard title={<>台帳に無いファイル <StatusBadge tone="bad">{v.unmatched.length} 件</StatusBadge></>} description="scripts/lib/datasets.mjs に宣言を足す（git 管理下なら npm run check-datasets が止める）">
            <ul className="text-sm">
              {v.unmatched.map((p) => <li key={p}><code>{p}</code></li>)}
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
            <TableHead className={numCol}>データセット</TableHead>
            <TableHead className={numCol}>ファイル</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {v.domains.length === 0 && <EmptyRow colSpan={3}>なし</EmptyRow>}
          {v.domains.map((d) => (
            <TableRow key={d.id}>
              <TableCell><Link href={href(v.area, d.id)}>{d.label}</Link></TableCell>
              <TableCell className={numCol}>{d.datasets}</TableCell>
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
    <PanelCard title={`${v.rows.length} データセット`} description="{ts}・{date} などは日時が入る部分。開くと型・ファイル・参照しているコード">
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>名前・説明</TableHead>
            <TableHead>種類</TableHead>
            <TableHead>型</TableHead>
            <TableHead className={numCol}>ファイル</TableHead>
            <TableHead>更新</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {v.rows.map((r) => (
            <TableRow key={r.id} className="align-top">
              <TableCell className="whitespace-normal">
                <Link href={href(v.area, v.domain?.id, r.id)}><code className="break-all text-xs">{r.name}</code></Link> {r.local && <Local />}
                <div className="mt-1 text-xs text-muted-foreground">{r.doc}</div>
              </TableCell>
              <TableCell className="text-sm">{r.kind}</TableCell>
              <TableCell className="text-sm">{r.typed ? <StatusBadge tone="good">型あり</StatusBadge> : r.shape}</TableCell>
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
  const fail = x.schema?.errors.length ?? 0;
  return (
    <>
      <PanelCard
        title={<code>{x.name}</code>}
        description={`${x.id}・${x.kind}`}
        action={<Link href={href(v.area, v.domain?.id ?? x.domain)} className="text-sm">一覧へ</Link>}
      >
        <p className="text-sm">{x.doc}</p>
        {x.flags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {x.flags.map((f) => <StatusBadge key={f} tone="neutral">{f}</StatusBadge>)}
          </div>
        )}
        {x.fileDoc && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{x.fileDoc}</p>}
      </PanelCard>

      {x.path === REGISTRY_PATH && <QualificationSsot />}

      {x.schema ? (
        <PanelCard
          title={<>型 {fail ? <StatusBadge tone="bad">違反 {fail} 件</StatusBadge> : <StatusBadge tone="good">{x.schema.checked} ファイルが型に合う</StatusBadge>}</>}
          description="scripts/lib/dataset-schemas.mjs の定義（zod）。? は無いことがある項目、{id} は対応表の各行"
        >
          {fail > 0 && (
            <ul className="mb-3 text-sm">
              {x.schema.errors.map((e, i) => <li key={`${e.file}${i}`}><code className="text-xs">{e.file}</code> {e.message}</li>)}
            </ul>
          )}
          <TableFrame>
            <TableHeader>
              <TableRow>
                <TableHead>場所</TableHead>
                <TableHead>型</TableHead>
                <TableHead>意味</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {x.schema.rows.map((r, i) => (
                <TableRow key={`${r.path}${i}`}>
                  <TableCell><code className="text-xs">{r.path}</code></TableCell>
                  <TableCell className="whitespace-normal text-sm">{r.type}</TableCell>
                  <TableCell className="whitespace-normal text-sm">{r.description ?? ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableFrame>
        </PanelCard>
      ) : (
        x.shape && x.shape.rows.length > 0 && (
          <PanelCard title="型（実物から読んだもの）" description={`型の定義はまだ無い。最新ファイル（${x.files[0]?.path ?? '—'}）から読んだ形で、意味は書かれていない`}>
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
        )
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
                <TableCell><code className="text-xs">{file.path}</code> {file.untracked && <Local />}</TableCell>
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
