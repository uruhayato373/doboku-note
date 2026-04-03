"use client";

import { useMemo, useCallback } from "react";
import { 
  ChevronRight, 
  Circle, 
  CheckSquare
} from 'lucide-react';
import { CustomUnorderedListProps, StyleSet, ListItem } from "@/types/list-components";

/**
 * @description
 * カスタマイズ可能なリストコンポーネント。
 * 複数のスタイルバリエーションを持ち、インタラクティブな機能にも対応します。
 * 
 * @component
 * 
 * @features
 * - 4種類のスタイルバリエーション（modern, elegant, checklist, default）
 * - カスタムマーカーアイコン
 * - ダークモード対応
 * - レスポンシブデザイン
 * 
 * @props
 * - title: リストのタイトル（オプション）
 * - items: リストアイテムの配列（string | ListItem | ReactNode）
 * - style: リストのスタイル（"modern" | "elegant" | "checklist"）
 * - className: 追加のCSSクラス（オプション）
 * 
 * @styling
 * - Tailwind CSSによるスタイリング
 * - 青系統一カラーテーマ
 * - カスタムマーカーアイコン（Lucide React）
 * - レスポンシブテキストサイズ
 * - ダークモード対応
 * 
 * @example
 * ```tsx
 * <CustomUnorderedList
 *   title="チェックリスト"
 *   items={["項目1", "項目2", "項目3"]}
 *   style="checklist"
 * />
 * ```
 */
export default function CustomUnorderedList({
  title,
  items,
  style = "modern",
  className = "",
}: CustomUnorderedListProps) {
  // summaryスタイルの場合はデフォルトタイトルを設定
  const displayTitle = title || (style === "summary" ? "重要なポイントを振り返ってみましょう" : undefined);
  /**
   * スタイルセットの定義
   * 各スタイルバリエーション（modern, elegant, checklist）に応じた
   * スタイリングの設定を管理します
   * 
   * @type {StyleSet}
   * @property {string} container - リストコンテナのスタイル
   * @property {string} title - タイトル部分のスタイル
   * @property {string} marker - リストマーカーのスタイル
   * @property {string} itemPadding - リストアイテムのパディング
   * @property {string} markerColor - マーカーの色
   */
  const styleSet: StyleSet = useMemo(() => {
    const baseContainer = "border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/10";
    const baseTitle = "bg-blue-600 text-white rounded-t-md -m-4 mx-4 mb-3 px-4 py-3";
    
    // 統一されたフォント設定
    const titleFontSize = "text-lg";
    const titleFontWeight = "font-bold";

    switch (style) {
      case "modern":
        return {
          container: "my-5 mx-auto",
          title: `bg-[#4c9ac0]/80 text-white py-2 px-4 m-0 ${titleFontSize} ${titleFontWeight} dark:bg-blue-500/80`,
          marker: "list-none",
          itemPadding: "pl-6",
          markerColor: "text-[#4c9ac0] dark:text-blue-500"
        };
      case "elegant":
        return {
          container: "my-5 mx-auto ml-5 p-3 border border-gray-300 dark:border-gray-600",
          title: `relative -left-10 bg-[#4c9ac0] text-white py-2 px-4 m-0 ${titleFontSize} ${titleFontWeight} dark:bg-blue-500 flex items-center inline-block`,
          marker: "list-none",
          itemPadding: "pl-6",
          markerColor: "text-[#4c9ac0] dark:text-blue-500"
        };
      case "checklist":
        return {
          container: "my-5 mx-auto ml-5 p-3 border border-gray-300 dark:border-gray-600",
          title: `relative -left-10 bg-[#4c9ac0] text-white py-2 px-4 m-0 ${titleFontSize} ${titleFontWeight} dark:bg-blue-500 flex items-center inline-block`,
          marker: "list-none",
          itemPadding: "pl-6",
          markerColor: "text-[#4c9ac0] dark:text-blue-500"
        };
      case "summary":
        return {
          container: "my-5 mx-auto ml-5 p-3 border border-gray-300 dark:border-gray-600 bg-gradient-to-b from-blue-50/20 via-blue-50/10 to-blue-50/20 dark:from-blue-900/10 dark:via-blue-900/5 dark:to-blue-900/10",
          title: `relative -left-10 bg-[#4c9ac0] text-white py-2 px-4 m-0 ${titleFontSize} ${titleFontWeight} dark:bg-blue-500 flex items-center inline-block`,
          marker: "list-none",
          itemPadding: "pl-6",
          markerColor: "text-[#4c9ac0] dark:text-blue-500"
        };
      default:
        return {
          container: `my-6 ${baseContainer} rounded-lg p-4`,
          title: `${titleFontSize} font-semibold ${baseTitle}`,
          marker: "list-none",
          itemPadding: "pl-6",
          markerColor: "text-blue-600"
        };
    }
  }, [style]);

  /**
   * リストアイテムのスタイルを生成する関数
   * ベーススタイルとパディングを組み合わせて、一貫したスタイリングを提供します
   * 
   * @param {number} index - アイテムのインデックス
   * @param {ListItem | string | React.ReactNode} item - リストアイテム
   * @returns {string} 結合されたCSSクラス文字列
   */
  const getItemStyle = useCallback((index: number, item: ListItem | string | React.ReactNode) => {
    const baseStyle = "text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed relative flex items-center";
    return `${baseStyle} ${styleSet.itemPadding}`;
  }, [styleSet.itemPadding]);

  /**
   * カスタムマーカーを描画する関数
   * 各スタイルに応じた適切なアイコンを表示します
   * 
   * @param {number} index - アイテムのインデックス
   * @param {ListItem | string | React.ReactNode} item - リストアイテム
   * @returns {JSX.Element} マーカーのJSX要素
   */
  const renderCustomMarker = useCallback((index: number, item: ListItem | string | React.ReactNode) => {
    if (style === "checklist") {
      return (
        <span className={`absolute left-0 w-6 flex items-center justify-center ${styleSet.markerColor}`}>
          <CheckSquare className="w-4 h-4" />
        </span>
      );
    }
    
    // 他のスタイル用のLucide Reactアイコン
    switch (style) {
      case "modern": 
        return (
          <span className={`absolute left-0 ${styleSet.markerColor}`}>
            <ChevronRight className="w-4 h-4" />
          </span>
        );
      case "elegant": 
        return (
          <span className={`absolute left-0 top-1/2 -translate-y-1/2 ${styleSet.markerColor}`}>
            <Circle className="w-2 h-2 fill-current" />
          </span>
        );
      default: 
        return (
          <span className={`absolute left-0 ${styleSet.markerColor}`}>
            <ChevronRight className="w-4 h-4" />
          </span>
        );
    }
  }, [styleSet.markerColor, style]);

  /**
   * アイテムのコンテンツを取得する関数
   * ListItem型、string型、ReactNode型に対応し、適切なコンテンツを返します
   * 
   * @param {ListItem | string | React.ReactNode} item - リストアイテム
   * @returns {React.ReactNode} 表示用のコンテンツ
   */
  const getItemContent = useCallback((item: ListItem | string | React.ReactNode): React.ReactNode => {
    if (typeof item === "object" && item && "content" in (item as ListItem)) {
      return (item as ListItem).content;
    }
    return item as React.ReactNode;
  }, []);

  /**
   * itemsプロパティの検証
   * 無効な値や空の配列の場合はnullを返し、レンダリングをスキップします
   */
  if (!items || !Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <div className={`${styleSet.container} ${className}`}>
      {displayTitle && <div className={styleSet.title}>{displayTitle}</div>}
      <div className={style === "modern" ? "py-2.5 px-5 border border-[#4c9ac0]/80 dark:border-blue-500/80" : style === "elegant" ? "" : ""}>
        <ul className="space-y-2 list-none">
          {items.map((item, index) => (
            <li key={index} className={getItemStyle(index, item)}>
              {renderCustomMarker(index, item)}
              {getItemContent(item)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}