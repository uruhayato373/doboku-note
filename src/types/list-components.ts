import { ReactNode } from "react";

export interface ListItem {
  content: string | ReactNode;
  checked?: boolean; // チェックリスト用
  id?: string; // 識別用
}

export interface BaseListProps {
  title?: string;
  items: string[] | ReactNode[] | ListItem[];
  className?: string;
}

export interface CustomUnorderedListProps extends BaseListProps {
  style?: "modern" | "elegant" | "checklist" | "summary";
  items: string[] | ReactNode[] | ListItem[]; // 拡張された型
  onItemCheck?: (index: number, checked: boolean) => void; // チェック状態変更コールバック
  interactive?: boolean; // インタラクティブ機能の有効/無効
}

export interface CustomOrderedListProps extends BaseListProps {
  style?: "numbered" | "modern" | "action";
}

export interface BlueTheme {
  primary: string;
  primaryDark: string;
  light: string;
  lightDark: string;
  border: string;
  text: string;
  bodyText: string;
  bodyTextDark: string;
}

export interface StyleSet {
  container: string;
  title: string;
  marker: string;
  itemPadding: string;
  markerColor: string;
}