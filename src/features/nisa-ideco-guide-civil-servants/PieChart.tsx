'use client';

import { useMemo } from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, LabelList } from 'recharts';

interface PortfolioItem {
  name: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  title: string;
  data: PortfolioItem[];
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
}

const COLORS = [
          '#3B82F6', // primary-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
  '#F97316', // orange-500
];

export default function PieChart({ 
  title, 
  data, 
  size = 'medium', 
  showTooltip = true 
}: PieChartProps) {
  // データに色を割り当て
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      color: item.color || COLORS[index % COLORS.length]
    }));
  }, [data]);

  // サイズに応じた設定
  const sizeConfig = useMemo(() => {
    switch (size) {
      case 'small':
        return { height: 200, innerRadius: 40, outerRadius: 80 };
      case 'large':
        return { height: 400, innerRadius: 80, outerRadius: 160 };
      default: // medium
        return { height: 300, innerRadius: 60, outerRadius: 120 };
    }
  }, [size]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{data.name}</p>
          <p className="text-primary-600 dark:text-primary-400">{data.value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {title && (
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
          {title}
        </h4>
      )}
      
      <ResponsiveContainer width="100%" height={sizeConfig.height}>
        <RechartsPieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={sizeConfig.innerRadius}
            outerRadius={sizeConfig.outerRadius}
            paddingAngle={2}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || '#666666'}>
                <LabelList 
                  dataKey="value" 
                  position="inside" 
                  formatter={(value: any) => `${value}%`}
                  style={{ 
                    fontSize: '12px', 
                    fontWeight: 'bold',
                    fill: '#ffffff',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                  }}
                />
              </Cell>
            ))}
          </Pie>
          
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
} 