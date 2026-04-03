"use client";

import { useMemo, useCallback } from "react";
import { CustomOrderedListProps, BlueTheme, StyleSet, ListItem } from "@/types/list-components";

export default function CustomOrderedList({
  title,
  items,
  style = "numbered",
  className = "",
}: CustomOrderedListProps) {
  // actionスタイルの場合はデフォルトタイトルを設定
  const displayTitle = title || (style === "action" ? "今すぐできる具体的なアクション" : undefined);
  // 青系統一カラーテーマ
  const blueTheme: BlueTheme = useMemo(() => ({
    primary: "blue-500",
    primaryDark: "blue-600", 
    light: "blue-50",
    lightDark: "blue-900/20",
    border: "blue-500",
    text: "white",
    bodyText: "gray-700",
    bodyTextDark: "gray-300"
  }), []);

  // スタイルセット
  const styleSet: StyleSet = useMemo(() => {
    const baseContainer = `border-2 border-${blueTheme.border} bg-${blueTheme.light} dark:bg-${blueTheme.lightDark}`;
    const baseTitle = `bg-${blueTheme.primary} text-${blueTheme.text}`;

    switch (style) {
      case "modern":
        return {
          container: "my-5 mx-auto",
          title: "bg-[#4c9ac0] text-white py-2 px-5 m-0 text-xl font-bold dark:bg-blue-500",
          marker: "list-none",
          itemPadding: "pl-8",
          markerColor: "text-[#4c9ac0] dark:text-blue-500",
          markerSymbol: "number"
        };
      case "numbered":
        return {
          container: `my-6 ${baseContainer} rounded-lg p-4`,
          title: `text-xl font-semibold mb-3 p-2 ${baseTitle}`,
          marker: "list-none",
          itemPadding: "pl-10",
          markerColor: `bg-${blueTheme.primary} text-${blueTheme.text}`,
          markerSymbol: "circle"
        };
      case "action":
        return {
          container: "my-6 border-2 border-green-500 bg-green-50 dark:bg-green-900/20 rounded-lg p-4",
          title: "text-xl font-semibold mb-3 p-2 bg-green-500 text-white",
          marker: "list-none",
          itemPadding: "pl-10",
          markerColor: "bg-green-500 text-white",
          markerSymbol: "check-circle"
        };
      default:
        return {
          container: `my-6 ${baseContainer} rounded-lg p-4`,
          title: `text-xl font-semibold mb-3 p-2 ${baseTitle}`,
          marker: "list-none",
          itemPadding: "pl-8",
          markerColor: `text-${blueTheme.primary}`,
          markerSymbol: "number"
        };
    }
  }, [style, blueTheme]);

  // アイテムスタイル生成
  const getItemStyle = useCallback((index: number) => {
    const baseStyle = `text-sm md:text-base text-${blueTheme.bodyText} dark:text-${blueTheme.bodyTextDark} leading-relaxed relative`;
    return `${baseStyle} ${styleSet.itemPadding}`;
  }, [styleSet.itemPadding, blueTheme]);

  // カスタムマーカー描画
  const renderCustomMarker = useCallback((index: number) => {
    const number = index + 1;
    
    if (style === "numbered") {
      return (
        <span className={`absolute left-0 w-6 h-6 ${styleSet.markerColor} text-sm rounded flex items-center justify-center font-bold`}>
          {number}
        </span>
      );
    }
    
    if (style === "action") {
      return (
        <span className={`absolute left-0 w-6 h-6 ${styleSet.markerColor} text-sm rounded-full flex items-center justify-center font-bold`}>
          ✓
        </span>
      );
    }
    
    // modern (default)
    return (
      <span className={`absolute left-0 ${styleSet.markerColor} text-lg font-bold`}>
        {number}.
      </span>
    );
  }, [styleSet.markerColor, style]);

  // アイテムコンテンツの取得
  const getItemContent = useCallback((item: string | React.ReactNode | ListItem): React.ReactNode => {
    if (typeof item === "object" && item && "content" in (item as ListItem)) {
      return (item as ListItem).content;
    }
    return item as React.ReactNode;
  }, []);

  return (
    <div className={`${styleSet.container} ${className}`}>
      {displayTitle && <div className={styleSet.title}>{displayTitle}</div>}
      <div className={style === "modern" ? "py-2.5 px-5 border-2 border-[#4c9ac0] dark:border-blue-500" : ""}>
        <ol className="space-y-3 list-none">
          {items.map((item, index) => (
            <li key={index} className={getItemStyle(index)}>
              {renderCustomMarker(index)}
              {getItemContent(item)}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}