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
  if (v == null) return <span className="muted">—</span>;
  const cls = v >= 90 ? 'good' : v >= 50 ? 'warn' : 'bad';
  return <span className={'badge ' + cls}>{v}</span>;
}

function shortUrl(u: string): string {
  return u.replace(/^https?:\/\/[^/]+/, '') || '/';
}

export default async function PsiPage({
  searchParams,
}: {
  searchParams: Promise<{ snapshot?: string }>;
}) {
  const sp = await searchParams;
  const history = listSnapshots('psi').get('psi-batch') ?? [];
  const snap: SnapshotFile | null = sp.snapshot
    ? snapshotByFile('psi', sp.snapshot)
    : latestSnapshot('psi', 'psi-batch');
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

  return (
    <>
      <PageHead
        title="PSI 詳細"
        sub="PageSpeed Insights スコア（URL 別 mobile / desktop・モバイル性能の低い順）"
      />

      <div className="card">
        <h2>
          スコア一覧
          <span className="sub">
            <Freshness snapshot={snap} /> {snap?.file} · {byUrl.size} URL
          </span>
        </h2>
        <SnapshotPicker basePath="/metrics/psi" files={history} current={snap?.file ?? ''} />
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>URL</th>
                <th className="num">性能(M)</th>
                <th className="num">性能(D)</th>
                <th className="num">SEO(M)</th>
                <th className="num">A11y(M)</th>
                <th className="num">LCP(M)</th>
                <th className="num">CLS(M)</th>
                <th className="num">TBT(M)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([url, e]) => {
                const m = e.mobile;
                const d = e.desktop;
                return (
                  <tr key={url}>
                    <td className="wrap mono small">{shortUrl(url)}</td>
                    <td className="num">
                      <ScoreBadge v={m?.scores?.performance} />
                    </td>
                    <td className="num">
                      <ScoreBadge v={d?.scores?.performance} />
                    </td>
                    <td className="num">
                      <ScoreBadge v={m?.scores?.seo} />
                    </td>
                    <td className="num">
                      <ScoreBadge v={m?.scores?.accessibility} />
                    </td>
                    <td className="num">{m?.lab_data?.LCP_ms != null ? Math.round(m.lab_data.LCP_ms) + 'ms' : '—'}</td>
                    <td className="num">{m?.lab_data?.CLS != null ? m.lab_data.CLS.toFixed(3) : '—'}</td>
                    <td className="num">{m?.lab_data?.TBT_ms != null ? Math.round(m.lab_data.TBT_ms) + 'ms' : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? <div className="empty">PSI バッチデータなし</div> : null}
      </div>
    </>
  );
}
