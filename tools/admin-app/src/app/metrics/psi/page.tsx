import { DataTable, PanelCard, StatusBadge, type DataTableColumn, type DataTableRow } from '@/components/admin';
import { Stack } from '@/components/layout';
import { Freshness, PageHead, SnapshotPicker } from '@/components/ui';
import {
  latestSnapshot,
  listSnapshots,
  readJsonFile,
  snapshotByFile,
  type SnapshotFile,
} from '@/lib/snapshots';

export const dynamic = 'force-dynamic';

interface PsiResult {
  url: string;
  strategy: 'mobile' | 'desktop' | string;
  scores?: { performance?: number; accessibility?: number; best_practices?: number; seo?: number };
  lab_data?: { LCP_ms?: number; CLS?: number; TBT_ms?: number };
}
interface PsiBatch {
  generated_at?: string;
  results?: PsiResult[];
}

/** スコアを色バッジで（90+緑 / 50-89橙 / <50赤）。 */
function ScoreBadge({ v }: { v?: number }) {
  if (v == null) return <span className="text-muted-foreground">—</span>;
  const tone = v >= 90 ? 'good' : v >= 50 ? 'warn' : 'bad';
  return <StatusBadge tone={tone}>{v}</StatusBadge>;
}

function shortUrl(u: string): string {
  return u.replace(/^https?:\/\/[^/]+/, '') || '/';
}

const COLUMNS: DataTableColumn[] = [
  { key: 'url', label: 'URL', wrap: true },
  { key: 'perfM', label: '性能(M)', num: true },
  { key: 'perfD', label: '性能(D)', num: true },
  { key: 'seoM', label: 'SEO(M)', num: true },
  { key: 'a11yM', label: 'A11y(M)', num: true },
  { key: 'lcpM', label: 'LCP(M)', num: true },
  { key: 'clsM', label: 'CLS(M)', num: true },
  { key: 'tbtM', label: 'TBT(M)', num: true },
];

export default async function PsiPage({
  searchParams,
}: {
  searchParams: Promise<{ snapshot?: string }>;
}) {
  const sp = await searchParams;
  const history = listSnapshots('psi.batch');
  const snap: SnapshotFile | null = sp.snapshot
    ? snapshotByFile('psi.batch', sp.snapshot)
    : latestSnapshot('psi.batch');
  const batch = snap ? readJsonFile<PsiBatch>(snap.abs) : null;
  const results = batch?.results ?? [];

  // URL 単位に mobile/desktop を pivot。
  const byUrl = new Map<string, { mobile?: PsiResult; desktop?: PsiResult }>();
  for (const r of results) {
    const e = byUrl.get(r.url) ?? {};
    if (r.strategy === 'mobile') e.mobile = r;
    else if (r.strategy === 'desktop') e.desktop = r;
    byUrl.set(r.url, e);
  }
  const rows = [...byUrl.entries()].sort((a, b) => {
    const pa = a[1].mobile?.scores?.performance ?? 999;
    const pb = b[1].mobile?.scores?.performance ?? 999;
    return pa - pb; // 性能の低い（要改善）順
  });

  const tableRows: DataTableRow[] = rows.map(([url, e]) => {
    const m = e.mobile;
    const d = e.desktop;
    const lcp = m?.lab_data?.LCP_ms;
    const cls = m?.lab_data?.CLS;
    const tbt = m?.lab_data?.TBT_ms;
    return {
      id: url,
      values: {
        url: shortUrl(url),
        perfM: m?.scores?.performance ?? null,
        perfD: d?.scores?.performance ?? null,
        seoM: m?.scores?.seo ?? null,
        a11yM: m?.scores?.accessibility ?? null,
        lcpM: lcp != null ? Math.round(lcp) : null,
        clsM: cls ?? null,
        tbtM: tbt != null ? Math.round(tbt) : null,
      },
      cells: {
        url: <span className="font-mono text-xs">{shortUrl(url)}</span>,
        perfM: <ScoreBadge v={m?.scores?.performance} />,
        perfD: <ScoreBadge v={d?.scores?.performance} />,
        seoM: <ScoreBadge v={m?.scores?.seo} />,
        a11yM: <ScoreBadge v={m?.scores?.accessibility} />,
        lcpM: lcp != null ? Math.round(lcp) + 'ms' : '—',
        clsM: cls != null ? cls.toFixed(3) : '—',
        tbtM: tbt != null ? Math.round(tbt) + 'ms' : '—',
      },
    };
  });

  return (
    <>
      <PageHead
        title="表示速度（PSI）"
        sub="PageSpeed Insights スコア（URL 別 mobile / desktop・モバイル性能の低い順）"
      />

      <PanelCard
        title="スコア一覧"
        description={
          <>
            <Freshness snapshot={snap} /> {byUrl.size} URL
          </>
        }
      >
        <Stack gap="sm">
          <SnapshotPicker basePath="/metrics/psi" files={history} current={snap?.file ?? ''} />
          <DataTable columns={COLUMNS} rows={tableRows} pageSize={100} emptyText="PSI バッチデータなし" />
        </Stack>
      </PanelCard>
    </>
  );
}
