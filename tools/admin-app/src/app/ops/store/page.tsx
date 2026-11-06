import Link from 'next/link';
import { DataTable, DetailList, DetailSheet, DetailText, PanelCard, StatusBadge, type DataTableColumn, FilterBar, FilterChip } from '@/components/admin';
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
  { key: 'name', label: '名前', wrap: true },
  { key: 'kind', label: '種類' },
  { key: 'shape', label: '型' },
  { key: 'files', label: 'ファイル', num: true },
  { key: 'updated', label: '更新' },
];
const SCHEMA_COLUMNS: DataTableColumn[] = [
  { key: 'path', label: '場所' },
  { key: 'type', label: '型', wrap: true },
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
const TABS = [
  { id: 'schema', label: '型' },
  { id: 'rows', label: '行を絞る' },
  { id: 'files', label: 'ファイル' },
  { id: 'refs', label: '参照コード' },
] as const;
type TabId = (typeof TABS)[number]['id'];
const Local = () => <StatusBadge tone="neutral" title="手元だけにあり git 管理外（CI からは見えない）">手元のみ</StatusBadge>;

/**
 * /ops/store — 設定（config/）・データ（data/）・作業状態（.claude/state/）・コンテンツ台帳（content/registry/）の台帳（read-only）。k=config|data|state|registry、d=領域、f=データセット id。
 * 何がどのデータかは scripts/lib/datasets.mjs の台帳が正本。型（zod）のあるものは型の定義と検査結果、
 * 無いものは最新ファイルの実物から読んだ形を出す。書き換えはファイルと PR で行う。
 * 資格の正本（qualification-registry.json）を開いたときは、中身と名前の写しの検査結果を型の上に出す（旧 /ops/ssot）。
 * 詳細では、JSON のデータセットの行を q=「欄=値」で絞れる（DN-0585・npm run data -- query と同じ関数）。
 */
export default async function StorePage({ searchParams }: { searchParams: Promise<{ k?: string; d?: string; f?: string; q?: string; t?: string }> }) {
  const { k, d, f, q, t } = await searchParams;
  const area = isStoreArea(k) ? k : 'config';
  const v = loadStoreView(area, d, f);
  const title = v.domain ? `${v.areaLabel} ＞ ${v.domain.label}` : v.areaLabel;

  return (
    <>
      <PageHead title={title} sub={`${v.total.files} ファイル・${v.total.datasets} データセット（型あり ${v.total.typed}）`} />
      <Stack>
        {v.error && <p className="project-warning-text text-sm">読めなかった: {v.error}</p>}

        {v.unmatched.length > 0 && (
          <PanelCard title={<>台帳に無いファイル <StatusBadge tone="bad">{v.unmatched.length} 件</StatusBadge></>}>
            <ul className="text-sm">
              {v.unmatched.map((p) => <li key={p}><code>{p}</code></li>)}
            </ul>
          </PanelCard>
        )}

        {v.detail ? <Detail v={v} q={q} t={t} /> : v.domain ? <Rows v={v} /> : <Domains v={v} />}
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
    <PanelCard title={`${v.rows.length} データセット`}>
      <DataTable
        columns={DATASET_COLUMNS}
        rows={v.rows.map((r) => ({
          id: r.id,
          values: { name: `${r.name} ${r.doc}`, kind: r.kind, shape: r.typed ? '型あり' : r.shape, files: r.files, updated: r.updated },
          cells: {
            name: (
              <>
                <Link href={href(v.area, v.domain?.id, r.id)}><code className="break-all text-xs">{r.name}</code></Link> {r.local && <Local />}
                {r.doc && (
                  <>
                    {' '}
                    <DetailSheet trigger={<span className="text-muted-foreground">説明</span>} title={<code>{r.name}</code>}>
                      <DetailText title="説明" items={[r.doc]} />
                    </DetailSheet>
                  </>
                )}
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

function Detail({ v, q, t }: { v: StoreView; q?: string; t?: string }) {
  const x = v.detail!;
  const fail = x.schema?.errors.length ?? 0;
  const hasRows = x.files.some((file) => /\.jsonl?$/.test(file.path));
  const tabs = TABS.filter((tab) => tab.id !== 'rows' || hasRows);
  const current: TabId = tabs.some((tab) => tab.id === t) ? (t as TabId) : 'schema';
  const tabHref = (id: string) => `${href(v.area, v.domain?.id ?? x.domain, x.id)}${id === 'schema' ? '' : `&t=${id}`}`;
  return (
    <>
      <PanelCard
        title={
          <DetailSheet trigger={<code>{x.name}</code>} title={<code>{x.name}</code>} description={`${x.id}・${x.kind}`}>
            <DetailText title="説明" items={[x.doc]} />
            <DetailText title="ファイルの説明" items={[x.fileDoc]} />
            <DetailList items={[{ label: '印', value: x.flags.join('・') }]} />
          </DetailSheet>
        }
        action={<Link href={href(v.area, v.domain?.id ?? x.domain)} className="text-sm">一覧へ</Link>}
      >
        {x.flags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {x.flags.map((f) => <StatusBadge key={f} tone="neutral">{f}</StatusBadge>)}
          </div>
        )}
      </PanelCard>

      {x.path === REGISTRY_PATH && <QualificationSsot />}

      <FilterBar className="mb-3!">
        {tabs.map((tab) => (
          <FilterChip key={tab.id} active={tab.id === current} href={tabHref(tab.id)}>
            {tab.label}
          </FilterChip>
        ))}
      </FilterBar>

      {current === 'schema' && (x.schema ? (
        <PanelCard title={<>型 {fail ? <StatusBadge tone="bad">違反 {fail} 件</StatusBadge> : <StatusBadge tone="good">{x.schema.checked} ファイルが型に合う</StatusBadge>}</>}>
          {fail > 0 && (
            <ul className="mb-3 text-sm">
              {x.schema.errors.map((e, i) => <li key={`${e.file}${i}`}><code className="text-xs">{e.file}</code> {e.message}</li>)}
            </ul>
          )}
          <DataTable
            columns={SCHEMA_COLUMNS}
            rows={x.schema.rows.map((r, i) => ({
              id: `${r.path}${i}`,
              values: { path: r.path, type: r.type },
              cells: {
                path: r.description ? (
                  <DetailSheet trigger={<code className="text-xs">{r.path}</code>} title={<code>{r.path}</code>}>
                    <DetailText title="意味" items={[r.description]} />
                  </DetailSheet>
                ) : <code className="text-xs">{r.path}</code>,
              },
            }))}
            pageSize={100}
            filter="場所・型で絞り込む"
          />
        </PanelCard>
      ) : (
        x.shape && x.shape.rows.length > 0 && (
          <PanelCard title="型（実物から読んだもの）">
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
      ))}

      {current === 'rows' && <DatasetQuery id={x.id} area={v.area} domain={v.domain?.id ?? x.domain} q={q} />}

      {current === 'files' && (
        <PanelCard title={`ファイル ${x.files.length + x.more} 件`}>
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
      )}

      {current === 'refs' && (
        <PanelCard title={`参照しているコード ${x.refs.length} 件`}>
          {x.refs.length === 0 ? (
            <p className="text-sm text-muted-foreground">見つからない</p>
          ) : (
            <ul className="text-sm">
              {x.refs.map((r) => <li key={r}><code className="text-xs">{r}</code></li>)}
            </ul>
          )}
        </PanelCard>
      )}
    </>
  );
}
