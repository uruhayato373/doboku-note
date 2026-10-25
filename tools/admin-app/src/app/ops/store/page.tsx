import Link from 'next/link';
import { DataTable, PanelCard, StatusBadge, type DataTableColumn } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { isStoreArea, loadStoreView, type StoreView } from '@/lib/stores';
import { REGISTRY_PATH } from '../../../../../../scripts/lib/qualification-registry.mjs';
import { DatasetQuery } from './dataset-query';
import { QualificationSsot } from './qualification-ssot';

export const dynamic = 'force-dynamic';

const href = (k: string, d?: string, f?: string) =>
  `/ops/store?${new URLSearchParams({ k, ...(d ? { d } : {}), ...(f ? { f } : {}) }).toString()}`;
const DOMAIN_COLUMNS: DataTableColumn[] = [
  { key: 'label', label: '領域' },
  { key: 'datasets', label: 'データセット', num: true },
  { key: 'files', label: 'ファイル', num: true },
];
const DATASET_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: '名前・説明', wrap: true },
  { key: 'kind', label: '種類' },
  { key: 'shape', label: '型' },
  { key: 'files', label: 'ファイル', num: true },
  { key: 'updated', label: '更新' },
];
const SCHEMA_COLUMNS: DataTableColumn[] = [
  { key: 'path', label: '場所' },
  { key: 'type', label: '型', wrap: true },
  { key: 'description', label: '意味', wrap: true },
];
const SHAPE_COLUMNS: DataTableColumn[] = [
  { key: 'path', label: '場所' },
  { key: 'type', label: '型' },
];
const FILE_COLUMNS: DataTableColumn[] = [
  { key: 'path', label: 'パス' },
  { key: 'updated', label: '更新' },
  { key: 'size', label: '大きさ', num: true, sortable: false }, // 大きさは「12KB」の表示文字列（バイト数ではない）なので並べ替えない
];
const Local = () => <StatusBadge tone="neutral" title="手元だけにあり git 管理外（CI からは見えない）">手元のみ</StatusBadge>;

/**
 * /ops/store — 設定（config/）・データ（data/）・作業状態（.claude/state/）・コンテンツ台帳（content/registry/）の台帳（read-only）。k=config|data|state|registry、d=領域、f=データセット id。
 * 何がどのデータかは scripts/lib/datasets.mjs の台帳が正本。型（zod）のあるものは型の定義と検査結果、
 * 無いものは最新ファイルの実物から読んだ形を出す。書き換えはファイルと PR で行う。
 * 資格の正本（qualification-registry.json）を開いたときは、中身と名前の写しの検査結果を型の上に出す（旧 /ops/ssot）。
 * 詳細では、JSON のデータセットの行を q=「欄=値」で絞れる（DN-0585・npm run data -- query と同じ関数）。
 */
export default async function StorePage({ searchParams }: { searchParams: Promise<{ k?: string; d?: string; f?: string; q?: string }> }) {
  const { k, d, f, q } = await searchParams;
  const area = isStoreArea(k) ? k : 'config';
  const v = loadStoreView(area, d, f);
  const title = v.domain ? `${v.areaLabel} ＞ ${v.domain.label}` : v.areaLabel;

  return (
    <>
      <PageHead title={title} sub={`${v.dir}/ の ${v.total.files} ファイル・${v.total.datasets} データセット（型あり ${v.total.typed}）。台帳は scripts/lib/datasets.mjs`} />
      <Stack>
        {v.error && <p className="project-warning-text text-sm">読めなかった: {v.error}</p>}

        {v.unmatched.length > 0 && (
          <PanelCard title={<>台帳に無いファイル <StatusBadge tone="bad">{v.unmatched.length} 件</StatusBadge></>} description="scripts/lib/datasets.mjs に宣言を足す（git 管理下なら npm run check-datasets が止める）">
            <ul className="text-sm">
              {v.unmatched.map((p) => <li key={p}><code>{p}</code></li>)}
            </ul>
          </PanelCard>
        )}

        {v.detail ? <Detail v={v} q={q} /> : v.domain ? <Rows v={v} /> : <Domains v={v} />}
      </Stack>
    </>
  );
}

function Domains({ v }: { v: StoreView }) {
  return (
    <PanelCard title="領域ごと">
      <DataTable
        columns={DOMAIN_COLUMNS}
        rows={v.domains.map((d) => ({
          id: d.id,
          values: { label: d.label, datasets: d.datasets, files: d.files },
          cells: { label: <Link href={href(v.area, d.id)}>{d.label}</Link> },
        }))}
        pageSize={100}
        emptyText="なし"
      />
    </PanelCard>
  );
}

function Rows({ v }: { v: StoreView }) {
  return (
    <PanelCard title={`${v.rows.length} データセット`} description="{ts}・{date} などは日時が入る部分。開くと型・ファイル・参照しているコード">
      <DataTable
        columns={DATASET_COLUMNS}
        rows={v.rows.map((r) => ({
          id: r.id,
          values: { name: `${r.name} ${r.doc}`, kind: r.kind, shape: r.typed ? '型あり' : r.shape, files: r.files, updated: r.updated },
          cells: {
            name: (
              <>
                <Link href={href(v.area, v.domain?.id, r.id)}><code className="break-all text-xs">{r.name}</code></Link> {r.local && <Local />}
                <div className="mt-1 text-xs text-muted-foreground">{r.doc}</div>
              </>
            ),
            shape: r.typed ? <StatusBadge tone="good">型あり</StatusBadge> : r.shape,
          },
        }))}
        pageSize={100}
        filter="名前・説明で絞り込む"
      />
    </PanelCard>
  );
}

function Detail({ v, q }: { v: StoreView; q?: string }) {
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
          <DataTable
            columns={SCHEMA_COLUMNS}
            rows={x.schema.rows.map((r, i) => ({
              id: `${r.path}${i}`,
              values: { path: r.path, type: r.type, description: r.description },
              cells: { path: <code className="text-xs">{r.path}</code>, description: r.description ?? '' },
            }))}
            pageSize={100}
            filter="場所・型・意味で絞り込む"
          />
        </PanelCard>
      ) : (
        x.shape && x.shape.rows.length > 0 && (
          <PanelCard title="型（実物から読んだもの）" description={`型の定義はまだ無い。最新ファイル（${x.files[0]?.path ?? '—'}）から読んだ形で、意味は書かれていない`}>
            <DataTable
              columns={SHAPE_COLUMNS}
              rows={x.shape.rows.map((r, i) => ({
                id: `${r.path}${i}`,
                values: { path: r.path, type: r.type },
                cells: { path: <code className="text-xs">{r.path}</code> },
              }))}
              pageSize={100}
              filter="場所・型で絞り込む"
            />
          </PanelCard>
        )
      )}

      {x.files.some((file) => /\.jsonl?$/.test(file.path)) && <DatasetQuery id={x.id} area={v.area} domain={v.domain?.id ?? x.domain} q={q} />}

      <PanelCard title={`ファイル ${x.files.length + x.more} 件`} description={x.more ? `新しい順に ${x.files.length} 件` : undefined}>
        <DataTable
          columns={FILE_COLUMNS}
          rows={x.files.map((file) => ({
            id: file.path,
            values: { path: file.path, updated: file.updated, size: file.size },
            cells: { path: <><code className="text-xs">{file.path}</code> {file.untracked && <Local />}</> },
          }))}
          pageSize={100}
          filter={x.files.length > 30 ? 'パスで絞り込む' : undefined}
        />
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
