// テーブル行の型定義
export interface TableRow {
  [key: string]: string | number | boolean;
}

// カラムの型定義
export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  isTotal?: boolean;
  className?: string;
}

// DataTableコンポーネントのprops型定義
export interface DataTableProps {
  data?: TableRow[];
  columns?: TableColumn[];
  /** headers/rows形式（簡易記法） */
  headers?: string[];
  rows?: (string | number | boolean)[][];
  title?: string;
  theme?: 'default' | 'dark' | 'minimal';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  totalRowKey?: string; // 合計行を識別するキー
  striped?: boolean;
  bordered?: boolean;
} 