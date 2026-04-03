"use client";

import React from 'react';
import { TableRow, DataTableProps } from '@/types/table';

const DataTable: React.FC<DataTableProps> = ({
  data: dataProp,
  columns: columnsProp,
  headers,
  rows,
  title,
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

  // サイズに基づくスタイル設定
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: 'max-w-2xl',
          padding: 'p-4',
          title: 'text-xl',
        };
      default: // medium
        return {
          container: 'max-w-4xl',
          padding: 'p-6',
          title: 'text-2xl',
        };
    }
  };

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
