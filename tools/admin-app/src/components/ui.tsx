import Link from 'next/link';
import { Badge, Card } from '@/components/primitives';
import type { SnapshotFile } from '@/lib/snapshots';
import { ageInDays } from '@/lib/snapshots';

/** KPI カード。ラベルと値だけのシンプルな表示（アイコン・装飾線は持たない）。 */
export function Kpi({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <Card className="kpi">
      <div className="label">{label}</div>
      <div className="value">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {unit ? <span className="unit">{unit}</span> : null}
      </div>
    </Card>
  );
}

/** ページ見出し。 */
export function PageHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="page-head">
      <div className="page-head-copy">
        <h1>{title}</h1>
        {sub ? <p>{sub}</p> : null}
      </div>
    </div>
  );
}

/** スナップショットの鮮度バッジ（CI 週次: 8 日超で遅延=赤、なし=neutral）。 */
export function Freshness({ snapshot }: { snapshot: SnapshotFile | null }) {
  if (!snapshot) return <Badge variant="secondary">スナップショットなし</Badge>;
  const age = ageInDays(snapshot);
  const cls =
    age === null ? 'neutral' : age > 8 ? 'bad' : age > 1 ? 'warn' : 'good';
  const label =
    age === null ? snapshot.stamp : age <= 0 ? '本日' : `${age}日前`;
  const variant =
    cls === 'bad'
      ? 'destructive'
      : cls === 'warn'
        ? 'warning'
        : cls === 'good'
          ? 'success'
          : 'secondary';
  return (
    <Badge variant={variant} title={snapshot.file}>
      {label}
    </Badge>
  );
}

/**
 * スナップショット履歴ピッカー（?snapshot= のリンク列・クライアント JS 不要）。
 * basePath へ ?snapshot=<file> を付けたリンクを最新数件だけ並べる。同じ日の取得は最新の1件にまとめる
 * （同じ日付が並ぶと見分けられない）。ファイル名は出さない。
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
  const byDay = files.filter((f, i) => files.findIndex((g) => g.stamp.slice(0, 10) === f.stamp.slice(0, 10)) === i);
  if (byDay.length <= 1) return null;
  return (
    <div className="filterbar" style={{ marginTop: 4 }}>
      {byDay.slice(0, limit).map((f) => (
        <Link
          key={f.file}
          href={`${basePath}?${paramKey}=${encodeURIComponent(f.file)}`}
          className={'chip' + (f.file === current ? ' active' : '')}
        >
          {f.stamp.slice(5, 10).replace('-', '/')}
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
export function DataTable<Row>({
  cols,
  rows,
}: {
  cols: Col<Row>[];
  rows: Row[];
}) {
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
                <td
                  key={c.key}
                  className={(c.num ? 'num ' : '') + (c.wrap ? 'wrap' : '')}
                >
                  {c.render
                    ? c.render(row)
                    : String((row as Record<string, unknown>)[c.key] ?? '')}
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
