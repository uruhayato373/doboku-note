import LineChart, { type LinePoint } from '@/components/charts/LineChart';
import { Freshness, Kpi, PageHead } from '@/components/ui';
import {
  ageInDays,
  latestSnapshot,
  loadSnapshot,
  readJsonFile,
  type SnapshotFile,
} from '@/lib/snapshots';

export const dynamic = 'force-dynamic'; // 常にワークツリーの最新スナップショットを読む

interface GaDateRow {
  date: string;
  activeUsers: number;
  sessions: number;
}
interface GscRow {
  clicks: number;
  impressions: number;
}
interface PsiResult {
  url: string;
  strategy: string;
  scores?: { performance?: number };
}

function ymd(d: string): string {
  // "20260706" → "07/06"
  return d.length === 8 ? `${d.slice(4, 6)}/${d.slice(6, 8)}` : d;
}

export default function MetricsOverview() {
  // GA4 日次
  const gaSnap = latestSnapshot('ga4', 'ga4-date');
  const ga = loadSnapshot<GaDateRow>(gaSnap);
  const gaRows = (ga?.rows ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const gaUsers = gaRows.reduce((s, r) => s + (r.activeUsers || 0), 0);
  const gaSessions = gaRows.reduce((s, r) => s + (r.sessions || 0), 0);
  const usersSeries: LinePoint[] = gaRows.map((r) => ({ label: ymd(r.date), value: r.activeUsers || 0 }));
  const sessSeries: LinePoint[] = gaRows.map((r) => ({ label: ymd(r.date), value: r.sessions || 0 }));

  // GSC クエリ
  const gscSnap = latestSnapshot('gsc', 'gsc-query');
  const gsc = loadSnapshot<GscRow>(gscSnap);
  const gscClicks = (gsc?.rows ?? []).reduce((s, r) => s + (r.clicks || 0), 0);
  const gscImpr = (gsc?.rows ?? []).reduce((s, r) => s + (r.impressions || 0), 0);

  // PSI 最新バッチ（mobile の代表 URL 平均 performance）
  const psiSnap = latestSnapshot('psi', 'psi-batch');
  const psiData = psiSnap ? readJsonFile<{ results?: PsiResult[] }>(psiSnap.abs) : null;
  const psiMobile = (psiData?.results ?? []).filter((r) => r.strategy === 'mobile');
  const psiAvg =
    psiMobile.length > 0
      ? Math.round(
          psiMobile.reduce((s, r) => s + (r.scores?.performance ?? 0), 0) / psiMobile.length,
        )
      : null;

  const period = ga?.meta.startDate && ga?.meta.endDate ? `${ga.meta.startDate} 〜 ${ga.meta.endDate}` : '';

  return (
    <>
      <PageHead
        title="分析概観"
        sub={`GA4 / GSC / PSI の最新スナップショット（CI がコミット・ローカルでは取得しない）${
          period ? ` · GA4 期間 ${period}` : ''
        }`}
      />

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <Kpi label="GA4 アクティブユーザー" value={gaUsers} unit="人" />
        <Kpi label="GA4 セッション" value={gaSessions} />
        <Kpi label="GSC クリック（上位100クエリ）" value={gscClicks} />
        <Kpi label="PSI モバイル性能（平均）" value={psiAvg ?? '—'} />
      </div>

      <div className="card">
        <h2>
          GA4 日次アクティブユーザー
          <span className="sub">
            <Freshness snapshot={gaSnap} /> {gaSnap?.file}
          </span>
        </h2>
        <LineChart points={usersSeries} unit="人/日" />
      </div>

      <div className="card">
        <h2>GA4 日次セッション</h2>
        <LineChart points={sessSeries} color="var(--good)" unit="件/日" />
      </div>

      <div className="card">
        <h2>スナップショット鮮度</h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>ソース</th>
                <th>最新ファイル</th>
                <th className="num">経過</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['GA4 (date)', gaSnap],
                  ['GSC (query)', gscSnap],
                  ['PSI (batch)', psiSnap],
                ] as [string, SnapshotFile | null][]
              ).map(([label, snap]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td className="mono small">{snap?.file ?? '—'}</td>
                  <td className="num">{ageInDays(snap) ?? '—'}日</td>
                  <td>
                    <Freshness snapshot={snap} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
