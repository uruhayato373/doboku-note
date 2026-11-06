// 管理画面の共通部品（shadcn/ui の部品を管理画面の形に束ねたもの）。ページはここと components/ui/* から組み立てる。
// 使い分け: 行の詳細（根拠・説明・メモ・ID）は表に入れず DetailSheet（名前を押すと右から開く）へ／表は DataTable（shadcn の Data Table・並べ替え／絞り込み／ページ送り。行ごとに形が違う表だけ TableFrame を直に置く）／区画が並ぶ画面は PanelCard／数字 1 つの区画は StatCard／状態は StatusBadge／一覧の絞り込みは FacetShell＋Facet。
export { EmptyRow, numCol, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from './table-frame';
export { DataTable, type DataTableColumn, type DataTableRow, type DataTableValue } from './data-table';
export { toDataTable, type DataTableCol } from './data-table-cols';
export { FilterBar, FilterChip } from './filter-chips';
export { PanelCard } from './panel-card';
export { StatCard } from './stat-card';
export { StatusBadge, type Tone } from './status-badge';
export { Facet, FacetHead, FacetShell, type FacetItem } from './facet-rail';
export { DetailList, DetailSheet, DetailText } from './detail-sheet';
