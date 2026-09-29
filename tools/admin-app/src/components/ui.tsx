import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow, numCol } from '@/components/admin';
import { cn } from '@/lib/cn';
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
    <Card className="kpi gap-0 py-0">
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
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">データなし</p>;
  return (
    <TableFrame>
      <TableHeader>
        <TableRow>
          {cols.map((c) => (
            <TableHead key={c.key} className={c.num ? numCol : undefined}>
              {c.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, ri) => (
          <TableRow key={ri}>
            {cols.map((c) => (
              <TableCell key={c.key} className={cn(c.num && numCol, c.wrap && 'whitespace-normal')}>
                {c.render
                  ? c.render(row)
                  : String((row as Record<string, unknown>)[c.key] ?? '')}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </TableFrame>
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
