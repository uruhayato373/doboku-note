'use client';

import { useMemo } from 'react';

interface CardItem {
  name: string;
  value: number;
  color?: string;
}

interface CardListProps {
  title: string;
  data: CardItem[];
  showPercentage?: boolean;
  showColorIndicator?: boolean;
  layout?: 'simple' | 'detailed';
}

export default function CardList({ 
  title, 
  data, 
  showPercentage = true, 
  showColorIndicator = true,
  layout = 'detailed'
}: CardListProps) {
  // データの合計を計算
  const total = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return 0;
    return data.reduce((sum, item) => {
      if (typeof item.value === 'number' && !isNaN(item.value)) {
        return sum + item.value;
      }
      return sum;
    }, 0);
  }, [data]);

  // パーセンテージを計算
  const dataWithPercentage = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return data.map(item => {
      if (typeof item.value === 'number' && !isNaN(item.value) && typeof item.name === 'string') {
        return {
          ...item,
          percentage: total > 0 ? Math.round((item.value / total) * 100) : 0
        };
      }
      return {
        name: 'データエラー',
        value: 0,
        percentage: 0,
        color: '#ef4444'
      };
    });
  }, [data, total]);

  // データの検証
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="w-full bg-red-50 dark:bg-gray-900/20 border border-red-200 dark:border-red-800 rounded-sm p-4">
        <p className="text-red-600 dark:text-red-400 text-sm">
          データが正しく設定されていません。
        </p>
      </div>
    );
  }

  if (layout === 'simple') {
    return (
      <div className="w-full bg-gray-50 dark:bg-gray-900 rounded-card-content p-4">
        {title && (
          <h5 className="font-medium text-gray-900 dark:text-white mb-3">
            {title}
          </h5>
        )}
        <div className="space-y-2">
          {dataWithPercentage.map((item, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {item.name}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {showPercentage ? `${item.percentage}%` : `${item.value}万円`}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <h5 className="font-medium text-gray-900 dark:text-white mb-3">
          {title}
        </h5>
      )}
      <ul className="space-y-3">
        {dataWithPercentage.map((item, index) => (
          <li key={index} className="bg-white dark:bg-gray-800 rounded-card-content p-4 shadow-card-content border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {showColorIndicator && (
                  <div 
                    className="w-4 h-4 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: item.color || `hsl(${index * 45}, 70%, 60%)` }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-white text-sm">
                    {item.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    分散投資効果
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {showPercentage ? `${item.percentage}%` : `${item.value}万円`}
                </div>
                {showPercentage && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    配分比率
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            合計
          </span>
                          <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
            {showPercentage ? '100%' : `${total}万円`}
          </span>
        </div>
      </div>
    </div>
  );
} 