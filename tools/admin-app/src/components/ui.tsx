import Link from 'next/link';
import type { SnapshotFile } from '@/lib/snapshots';
import { ageInDays } from '@/lib/snapshots';

/** KPI カード。 */
export function Kpi({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {unit ? <span className="unit">{unit}</span> : null}
      </div>
    </div>
  );
}

/** ページ見出し。 */
export function PageHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {sub ? <p>{sub}</p> : null}
    </div>
  );
}

/** スナップショットの鮮度バッジ（CI 週次: 8 日超で遅延=赤、なし=neutral）。 */
export function Freshness({ snapshot }: { snapshot: SnapshotFile | null }) {
  if (!snapshot) return <span className="badge neutral">スナップショットなし</span>;
  const age = ageInDays(snapshot);
  const cls = age === null ? 'neutral' : age > 8 ? 'bad' : age > 1 ? 'warn' : 'good';
  const label = age === null ? snapshot.stamp : age <= 0 ? '本日' : `${age}日前`;
  return (
    <span className={'badge ' + cls} title={snapshot.file}>
      {label}
    </span>
  );
}

/**
 * スナップショット履歴ピッカー（?snapshot= のリンク列・クライアント JS 不要）。
 * basePath へ ?snapshot=<file> を付けたリンクを最新数件だけ並べる。
 */
export function SnapshotPicker({
  basePath,
  files,
  current,
  paramKey = 'snapshot',
  limit = 6,
}: {
  basePath: string;
  files: SnapshotFile[];
  current: string;
  paramKey?: string;
  limit?: number;
}) {
  if (files.length <= 1) return null;
  return (
    <div className="filterbar" style={{ marginTop: 4 }}>
      <span className="muted small" style={{ alignSelf: 'center', marginRight: 4 }}>
        履歴:
      </span>
      {files.slice(0, limit).map((f, i) => (
        <Link
          key={f.file}
          href={`${basePath}?${paramKey}=${encodeURIComponent(f.file)}`}
          className={'chip' + (f.file === current ? ' active' : '')}
        >
          {f.stamp.slice(0, 10)}
          {i === 0 ? ' (最新)' : ''}
        </Link>
      ))}
    </div>
  );
}

export type Col<Row> = {
  key: string;
  label: string;
  num?: boolean;
  wrap?: boolean;
  render?: (row: Row) => React.ReactNode;
};

/** 汎用データテーブル。 */
export function DataTable<Row>({ cols, rows }: { cols: Col<Row>[]; rows: Row[] }) {
  if (rows.length === 0) return <div className="empty">データなし</div>;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key} className={c.num ? 'num' : ''}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {cols.map((c) => (
                <td key={c.key} className={(c.num ? 'num ' : '') + (c.wrap ? 'wrap' : '')}>
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 数値整形ヘルパ。 */
export const fmt = {
  int: (n: number) => Math.round(n).toLocaleString(),
  pct: (r: number) => (r * 100).toFixed(1) + '%',
  dec: (n: number, d = 1) => n.toFixed(d),
  dur: (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}分${s.toString().padStart(2, '0')}秒`;
  },
};
