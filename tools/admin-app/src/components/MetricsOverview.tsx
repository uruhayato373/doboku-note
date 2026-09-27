import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import LineChart, { type LinePoint } from '@/components/charts/LineChart';
import { Freshness } from '@/components/ui';
import { repoPath } from '@/lib/repo-root';
import {
  latestSnapshot,
  loadSnapshot,
  type SnapshotFile,
} from '@/lib/snapshots';

/**
 * ga4/gsc/psi 以外（date-only ファイル名: `<prefix><YYYY-MM-DD>.json`）の最新スナップショットを
 * 鮮度表にだけ出すためのローカル解決。listSnapshots の TS_RE（時刻まで含むスタンプ）とは
 * ファイル名形式が違うため lib/snapshots.ts の型（MetricKind）は流用しない。
 * stamp は Freshness/ageInDays が読める形（`YYYY-MM-DDT00-00-00`）へ正規化して渡す。
 */
function latestDateFileSnapshot(dir: string, prefix: string): SnapshotFile | null {
  const abs = repoPath('.claude', 'state', dir);
  if (!existsSync(abs)) return null;
  const re = new RegExp(`^${prefix}(\\d{4}-\\d{2}-\\d{2})\\.json$`);
  let best: { file: string; date: string; mtimeMs: number } | null = null;
  for (const file of readdirSync(abs)) {
    const m = re.exec(file);
    if (!m) continue;
    if (!best || m[1]! > best.date) {
      best = { file, date: m[1]!, mtimeMs: statSync(join(abs, file)).mtimeMs };
    }
  }
  if (!best) return null;
  return {
    prefix,
    file: best.file,
    abs: join(abs, best.file),
    stamp: `${best.date}T00-00-00`,
    mtimeMs: best.mtimeMs,
  };
}


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
  const gaSnap = latestSnapshot('ga4', 'ga4-date');
  const ga = loadSnapshot<GaDateRow>(gaSnap);
  const gaRows = (ga?.rows ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const usersSeries: LinePoint[] = gaRows.map((r) => ({ label: ymd(r.date), value: r.activeUsers || 0 }));
  const sessSeries: LinePoint[] = gaRows.map((r) => ({ label: ymd(r.date), value: r.sessions || 0 }));

  // GSC・PSI は鮮度だけ出す
  const gscSnap = latestSnapshot('gsc', 'gsc-query');
  const psiSnap = latestSnapshot('psi', 'psi-batch');

  const period = ga?.meta.startDate && ga?.meta.endDate ? `${ga.meta.startDate} 〜 ${ga.meta.endDate}` : '';

  // Instagram / Cloudflare（CI 取得・date-only ファイル名）
  const igSnap = latestDateFileSnapshot('metrics/instagram', 'ig-insights-');
  const cfSnap = latestDateFileSnapshot('metrics/cloudflare', 'cf-zone-');

  return (
    <>
      <div className="card">
        <h2>
          GA4 日次アクティブユーザー{period ? `（${period}）` : ''}
          <span className="sub">
            <Freshness snapshot={gaSnap} />
          </span>
        </h2>
        <LineChart points={usersSeries} unit="人/日" />
      </div>

      <div className="card">
        <h2>GA4 日次セッション</h2>
        <LineChart points={sessSeries} color="var(--good)" unit="件/日" />
      </div>

      <div className="card">
        <h2>データの更新</h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>データ</th>
                <th>最終取得</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['GA4', gaSnap],
                  ['GSC', gscSnap],
                  ['PSI', psiSnap],
                  ['Instagram', igSnap],
                  ['Cloudflare', cfSnap],
                ] as [string, SnapshotFile | null][]
              ).map(([label, snap]) => (
                <tr key={label}>
                  <td>{label}</td>
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
