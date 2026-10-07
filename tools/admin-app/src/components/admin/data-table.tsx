'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { EmptyRow, numCol, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from './table-frame';

export type DataTableValue = string | number | null;

/** 列。label・セルはサーバーで描いた ReactNode を渡せる（関数は渡せないので、並べ替え・絞り込みは values で行う）。 */
export interface DataTableColumn {
  key: string;
  label: React.ReactNode;
  num?: boolean;
  wrap?: boolean;
  /** 既定 true */
  sortable?: boolean;
}

/** 行。values は並べ替え・絞り込みに使う生の値、cells は表示（無ければ values を表示する）。 */
export interface DataTableRow {
  id: string;
  values: Record<string, DataTableValue>;
  cells?: Record<string, React.ReactNode>;
}

const show = (v: DataTableValue | undefined, num?: boolean) =>
  v == null ? '—' : num && typeof v === 'number' ? v.toLocaleString('en-US') : String(v);

/**
 * shadcn/ui の Data Table（TanStack Table ＋ Table 部品）の公式の形。列見出しで並べ替え、
 * filter を渡すと全列の絞り込み、行が pageSize を超えるとページ送りを出す。
 * サーバーのページから使えるよう、列と行は直列化できる形（DataTableColumn / DataTableRow）で受け取る。
 */
export function DataTable({
  columns,
  rows,
  filter,
  pageSize = 25,
  emptyText = 'データなし',
}: {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  /** 絞り込み欄の placeholder。渡したときだけ絞り込み欄を出す */
  filter?: string;
  pageSize?: number;
  emptyText?: React.ReactNode;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');

  const defs = React.useMemo<ColumnDef<DataTableRow>[]>(
    () =>
      columns.map((c) => ({
        id: c.key,
        accessorFn: (r) => r.values[c.key] ?? undefined,
        enableSorting: c.sortable !== false,
        sortUndefined: 'last',
        header: ({ column }) => {
          if (!column.getCanSort()) return c.label;
          const dir = column.getIsSorted();
          const icon = dir === 'asc' ? <ArrowUp /> : dir === 'desc' ? <ArrowDown /> : <ArrowUpDown className="opacity-50" />;
          // 見出しの文字をセルの文字と同じ端にそろえる（ボタンの内側の余白ぶん外へずらす。セルの余白 px-2 を越えると表が横にスクロールするので 2 まで。数値の列は右端）
          return c.num ? (
            <Button variant="ghost" size="sm" className="-mr-2" onClick={column.getToggleSortingHandler()}>
              {icon}
              {c.label}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="-ml-2" onClick={column.getToggleSortingHandler()}>
              {c.label}
              {icon}
            </Button>
          );
        },
        cell: ({ row }) => {
          const cells = row.original.cells;
          return cells && c.key in cells ? cells[c.key] : show(row.original.values[c.key], c.num);
        },
        meta: c,
      })),
    [columns],
  );

  const table = useReactTable({
    data: rows,
    columns: defs,
    getRowId: (r) => r.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, globalFilter },
    initialState: { pagination: { pageSize } },
  });

  const colOf = (meta: unknown) => meta as DataTableColumn;
  const shown = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex flex-col gap-3">
      {filter && (
        <Input
          placeholder={filter}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
      )}
      <TableFrame>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id} className={cn(colOf(header.column.columnDef.meta).num && numCol)}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  const c = colOf(cell.column.columnDef.meta);
                  return (
                    <TableCell key={cell.id} className={cn(c.num && numCol, c.wrap && 'whitespace-normal')}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : (
            <EmptyRow colSpan={columns.length}>{rows.length ? '該当なし' : emptyText}</EmptyRow>
          )}
        </TableBody>
      </TableFrame>
      {shown > pageSize && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()} ページ（{shown} 行）
          </span>
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            前へ
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            次へ
          </Button>
        </div>
      )}
    </div>
  );
}
