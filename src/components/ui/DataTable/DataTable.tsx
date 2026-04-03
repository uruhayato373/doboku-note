"use client";

import React, { useEffect, useState } from 'react';
import { TableRow, DataTableProps } from '@/types/table';

const DataTable: React.FC<DataTableProps> = ({
  data: dataProp,
  columns: columnsProp,
  headers,
  rows,
  title,
  theme: propTheme = 'default',
  size = 'medium',
  className = "",
  totalRowKey = 'isTotal'
}) => {
  // headers/rows形式からcolumns/data形式に変換
  const columns: { key: string; label: string; align?: string; className?: string }[] = columnsProp ?? (Array.isArray(headers) ? headers : []).map((label: string, i: number) => ({
    key: `col${i}`,
    label,
  }));
  const data = dataProp ?? (Array.isArray(rows) ? rows : []).map((row: (string | number | boolean)[]) =>
    Object.fromEntries(columns.map((col, i) => [col.key, row[i] ?? '']))
  );

  const [theme, setTheme] = useState<'default' | 'dark' | 'minimal'>(propTheme || 'default');

  // ダークモード検出
  useEffect(() => {
    // propsでテーマが指定されている場合はそれを使用
    if (propTheme) {
      setTheme(propTheme);
      return;
    }

    const checkDarkMode = () => {
      // CSS変数またはクラスでダークモードを検出
      if (typeof window !== 'undefined') {
        const isDark = document.documentElement.classList.contains('dark') || 
                      window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(isDark ? 'dark' : 'default');
      }
    };

    checkDarkMode();

    // ダークモードの変更を監視
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDarkMode);

    // クラス変更の監視（Tailwind CSSのダークモード切り替え）
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      mediaQuery.removeEventListener('change', checkDarkMode);
      observer.disconnect();
    };
  }, [propTheme]);
  // テーマに基づくスタイル設定
  const getThemeStyles = () => {
    switch (theme) {
      case 'dark':
        return {
          container: 'bg-gray-900 text-white',
          table: 'bg-gray-800',
          header: 'bg-gray-700 text-white',
          row: 'border-gray-600',
          evenRow: 'bg-gray-800',
          oddRow: 'bg-gray-700',
          totalRow: 'bg-gray-600 border-gray-500',
          text: 'text-gray-200',
          totalText: 'text-white'
        };
      case 'minimal':
        return {
          container: 'bg-white',
          table: 'bg-white',
          header: 'bg-gray-50 text-gray-900',
          row: 'border-gray-100',
          evenRow: 'bg-white',
          oddRow: 'bg-gray-50',
          totalRow: 'bg-gray-100 border-gray-200',
          text: 'text-gray-900',
          totalText: 'text-gray-900'
        };
      default:
        return {
          container: 'bg-white',
          table: 'bg-white',
          header: 'bg-gray-50 text-gray-900',
          row: 'border-gray-100',
          evenRow: 'bg-white',
          oddRow: 'bg-white',
          totalRow: 'bg-gray-50 border-gray-200',
          text: 'text-gray-900',
          totalText: 'text-gray-900'
        };
    }
  };

  // サイズに基づくスタイル設定
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: 'max-w-2xl',
          padding: 'p-4',
          title: 'text-xl',
          cell: 'p-1',
          text: 'text-sm'
        };
      default: // medium
        return {
          container: 'max-w-4xl',
          padding: 'p-6',
          title: 'text-2xl',
          cell: 'p-2',
          text: 'text-sm'
        };
    }
  };

  const themeStyles = getThemeStyles();
  const sizeStyles = getSizeStyles();

  if (!columns.length) return null;

  // 行が合計行かどうかを判定
  const isTotalRow = (row: TableRow) => {
    return row[totalRowKey] === true;
  };

    return (
    <div className={`${sizeStyles.container} mx-auto ${sizeStyles.padding} ${className}`}>
      {title && (
        <div className="mb-6">
          <div className={`${sizeStyles.title} font-bold text-center relative inline-block w-full`}>
            <span className="relative z-10 bg-white px-6 py-2 text-[#4c9ac0] dark:bg-gray-900 dark:text-blue-400">
              {title}
            </span>
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-[#4c9ac0] dark:bg-blue-400 transform -translate-y-1/2"></div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="border border-gray-300 dark:border-gray-600 shadow-sm w-full text-sm leading-5">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.key}
                  className={`py-3 px-4 ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'} font-medium text-gray-600 dark:text-gray-300`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => {
              const isTotal = isTotalRow(row);
              const isEvenRow = index % 2 === 0;
              return (
                <tr key={index} className={isEvenRow ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                  {columns.map((column) => (
                    <td 
                      key={column.key}
                      className={`py-3 px-4 ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'} ${isTotal ? 'font-medium text-gray-600 dark:text-gray-300' : 'text-gray-900 dark:text-gray-100'} ${column.className || ''}`}
                    >
                      {row[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable; 