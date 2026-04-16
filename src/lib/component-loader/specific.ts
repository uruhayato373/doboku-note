/**
 * 記事固有MDXコンポーネント定義
 * 特定の記事またはトピックでのみ使用されるコンポーネント
 */

export const specificComponents = {
  // 不動産投資関連
  RealEstateCostsTable: 'RealEstateCostsTable',
  RealEstateApartmentCostsTable: 'RealEstateApartmentCostsTable',
  
  // NISA・iDeCo関連
  StackedBarChart: 'StackedBarChart',
  PieChart: 'PieChart',

  // 時間管理関連
  TimeBlockChart: 'TimeBlockChart',

  // 技術士総監 keyword-2026 ハブ専用
  KeywordProgress: 'KeywordProgress',

  // 将来追加される記事固有コンポーネント
  // ProteinComparisonTable: 'ProteinComparisonTable',
  // WorkoutPlanChart: 'WorkoutPlanChart',
} as const;

export type SpecificComponentName = keyof typeof specificComponents;
