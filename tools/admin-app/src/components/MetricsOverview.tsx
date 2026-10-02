import { PanelCard, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
import { Stack } from '@/components/layout';
import LineChart, { type LinePoint } from '@/components/charts/LineChart';
import { Freshness } from '@/components/ui';
import {
  latestSnapshot,
  loadSnapshot,
  type SnapshotFile,
} from '@/lib/snapshots';

interface GaDateRow {
  date: string;
  activeUsers: number;
  sessions: number;
}
function ymd(d: string): string {
  // "20260706" → "07/06"
  return d.length === 8 ? `${d.slice(4, 6)}/${d.slice(6, 8)}` : d;
}

/**
 * トップ（KPI）の下に置く集客の推移とデータの更新。旧「分析概観」（/metrics）の中身。
 * 集計タイルは KPI ツリー側に寄せたので、ここは推移グラフと鮮度だけ。
 */
export default function MetricsOverview() {
  // GA4 日次
  const gaSnap = latestSnapshot('ga4.date');
  const ga = loadSnapshot<GaDateRow>(gaSnap);
  const gaRows = (ga?.rows ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const usersSeries: LinePoint[] = gaRows.map((r) => ({ label: ymd(r.date), value: r.activeUsers || 0 }));
  const sessSeries: LinePoint[] = gaRows.map((r) => ({ label: ymd(r.date), value: r.sessions || 0 }));

  // GSC・PSI は鮮度だけ出す
  const gscSnap = latestSnapshot('gsc.query');
  const psiSnap = latestSnapshot('psi.batch');

  const period = ga?.meta.startDate && ga?.meta.endDate ? `${ga.meta.startDate} 〜 ${ga.meta.endDate}` : '';

  // Instagram / Cloudflare（CI 取得・date-only ファイル名）
  const igSnap = latestSnapshot('instagram.insights');
  const cfSnap = latestSnapshot('cloudflare.zone');

  return (
    <Stack>
      <PanelCard
        title={`GA4 日次アクティブユーザー${period ? `（${period}）` : ''}`}
        description={<Freshness snapshot={gaSnap} />}
      >
        <LineChart points={usersSeries} unit="人/日" />
      </PanelCard>

      <PanelCard title="GA4 日次セッション">
        <LineChart points={sessSeries} color="var(--good)" unit="件/日" />
      </PanelCard>

      <PanelCard title="データの更新">
        <TableFrame>
            <TableHeader>
              <TableRow>
                <TableHead>データ</TableHead>
                <TableHead>最終取得</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(
                [
                  ['GA4', gaSnap],
                  ['GSC', gscSnap],
                  ['PSI', psiSnap],
                  ['Instagram', igSnap],
                  ['Cloudflare', cfSnap],
                ] as [string, SnapshotFile | null][]
              ).map(([label, snap]) => (
                <TableRow key={label}>
                  <TableCell>{label}</TableCell>
                  <TableCell>
                    <Freshness snapshot={snap} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
        </TableFrame>
      </PanelCard>
    </Stack>
  );
}
