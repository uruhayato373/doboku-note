/**
 * 総合技術監理キーワード集2026の章・節構造
 * カテゴリページでキーワードをセクション別にグルーピングするために使用
 */

export type PeSection = {
  id: string;    // "2.1"
  title: string; // "事業企画"
};

export type PeChapter = {
  id: string;    // "2"
  title: string; // "経済性管理"
  sections: PeSection[];
};

export const PE_CHAPTERS: PeChapter[] = [
  {
    id: '1', title: '総合技術監理', sections: [
      { id: '1', title: '総合技術監理の概要' },
    ],
  },
  {
    id: '2', title: '経済性管理', sections: [
      { id: '2.1', title: '事業企画' },
      { id: '2.2', title: '品質の管理' },
      { id: '2.3', title: '工程管理' },
      { id: '2.4', title: '原価管理・管理会計' },
      { id: '2.5', title: '財務会計' },
      { id: '2.6', title: '設備管理' },
      { id: '2.7', title: '計画・管理の数理的手法' },
    ],
  },
  {
    id: '3', title: '人的資源管理', sections: [
      { id: '3.1', title: '人の行動と組織' },
      { id: '3.2', title: '労働関係法と労務管理' },
      { id: '3.3', title: '人材活用計画' },
      { id: '3.4', title: '人材開発' },
    ],
  },
  {
    id: '4', title: '情報管理', sections: [
      { id: '4.1', title: '情報分析と情報活用' },
      { id: '4.2', title: 'コミュニケーション' },
      { id: '4.3', title: '知的財産権と情報の保護と活用' },
      { id: '4.4', title: '情報通信技術動向' },
      { id: '4.5', title: '情報セキュリティ' },
    ],
  },
  {
    id: '5', title: '安全管理', sections: [
      { id: '5.1', title: '安全の概念' },
      { id: '5.2', title: '安全に関するリスクマネジメント' },
      { id: '5.3', title: '労働安全衛生管理' },
      { id: '5.4', title: '事故・災害の未然防止活動・技術' },
      { id: '5.5', title: '危機管理' },
      { id: '5.6', title: 'システム安全工学手法' },
    ],
  },
  {
    id: '6', title: '社会環境管理', sections: [
      { id: '6.1', title: '地球的規模の環境問題' },
      { id: '6.2', title: '地域環境問題' },
      { id: '6.3', title: '環境保全の基本原則' },
      { id: '6.4', title: '組織の社会的責任と環境管理活動' },
    ],
  },
];

/**
 * キーワードslug末尾 → セクション番号の対応表
 * slug例: "pe-comprehensive-management-followership" → キー: "followership" → 値: "3.1"
 */
export const KEYWORD_SECTION_MAP: Record<string, string> = {
  // 2.1 事業企画
  'feasibility-study': '2.1',
  'business-evaluation': '2.1',
  'business-investment-evaluation': '2.1',
  'business-investment-plan': '2.1',
  'pfi': '2.1',

  // 2.2 品質の管理
  'quality': '2.2',
  'quality-management': '2.2',
  'quality-management-broad': '2.2',
  'quality-assurance': '2.2',
  'quality-improvement': '2.2',
  'quality-function-deployment': '2.2',
  'statistical-quality-control': '2.2',
  'cause-and-effect-diagram': '2.2',
  'traceability': '2.2',
  'customer-satisfaction': '2.2',
  'design-management': '2.2',
  'product-safety': '2.2',
  'product-liability': '2.2',
  'consumer-protection': '2.2',

  // 2.3 工程管理
  'pert-cpm': '2.3',
  'schedule-planning': '2.3',
  'procedure-planning': '2.3',
  'load-planning': '2.3',
  'production-control': '2.3',
  'production-method': '2.3',
  'production-activity-indicators': '2.3',
  'four-m-of-production': '2.3',
  'project-management': '2.3',

  // 2.4 原価管理・管理会計
  'cost-accounting': '2.4',
  'manufacturing-cost': '2.4',
  'cost-variance-analysis': '2.4',
  'target-costing': '2.4',
  'lifecycle-costing': '2.4',

  // 2.5 財務会計
  'financial-statements': '2.5',
  'corporate-accounting-standards': '2.5',
  'depreciation': '2.5',
  'break-even-analysis': '2.5',
  'wacc-roic': '2.5',

  // 2.6 設備管理
  'equipment-management': '2.6',
  'equipment-planning': '2.6',
  'equipment-maintenance': '2.6',
  'lifecycle-management': '2.6',
  'construction-planning': '2.6',

  // 2.7 計画・管理の数理的手法
  'mathematical-programming': '2.7',
  'simulation': '2.7',
  'game-theory': '2.7',
  'analytic-hierarchy-process': '2.7',
  'effort-estimation': '2.7',
  'idea-generation-methods': '2.7',
  'value-engineering': '2.7',
  'economic-engineering': '2.7',
  'key-performance-indicators': '2.7',
  'pdca-cycle': '2.7',
  'improvement-activities': '2.7',
  'supply-chain-management': '2.7',
  'theory-of-constraints': '2.7',

  // 3.1 人の行動と組織
  'followership': '3.1',
  'servant-leadership': '3.1',
  'situational-leadership-theory': '3.1',
  'pm-theory': '3.1',
  'professional-system': '3.1',

  // 5.2 安全に関するリスクマネジメント
  'risk-assessment': '5.2',

  // 5.5 危機管理
  'business-continuity-plan': '5.5',

  // 6.4 組織の社会的責任と環境管理活動
  'esg-environmental-assessment': '6.4',
};

/**
 * slugからキーワード部分を抽出
 * "pe-comprehensive-management-followership" → "followership"
 */
export function extractKeywordSlug(fullSlug: string): string {
  return fullSlug.replace(/^pe-comprehensive-management-/, '');
}

/**
 * キーワードが属するセクション番号を返す（未登録はnull）
 */
export function getKeywordSection(fullSlug: string): string | null {
  const key = extractKeywordSlug(fullSlug);
  return KEYWORD_SECTION_MAP[key] ?? null;
}
