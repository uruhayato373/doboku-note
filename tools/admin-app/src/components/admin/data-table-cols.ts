import type { ReactNode } from 'react';
import type { DataTableColumn, DataTableRow } from './data-table';

/** サーバーで描く列。render はここで実行し、DataTable（クライアント）へ渡せる形にする */
export type DataTableCol<Row> = Omit<DataTableColumn, 'label'> & { label: string; render?: (row: Row) => ReactNode };

/**
 * 行のオブジェクトと列の定義を DataTable の props へ変える。並べ替えは列の生の値（row[key] が数値・文字列のとき）で行う。
 * 使い方: <DataTable {...toDataTable(cols, rows)} filter="…" />
 */
export function toDataTable<Row>(cols: DataTableCol<Row>[], rows: Row[]): { columns: DataTableColumn[]; rows: DataTableRow[] } {
  const raw = (row: Row, key: string) => {
    const v = (row as Record<string, unknown>)[key];
    return typeof v === 'number' || typeof v === 'string' ? v : null;
  };
  return {
    columns: cols.map(({ key, label, num, wrap, sortable }) => ({ key, label, num, wrap, sortable })),
    rows: rows.map((row, i) => ({
      id: String(i),
      values: Object.fromEntries(cols.map((c) => [c.key, raw(row, c.key)])),
      cells: Object.fromEntries(cols.map((c) => [c.key, c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')])),
    })),
  };
}
