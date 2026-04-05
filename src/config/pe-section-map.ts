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
  'organization-development': '3.1',
  'motivation': '3.1',
  'organizational-commitment': '3.1',
  'organizational-culture': '3.1',
  'organizational-structure': '3.1',
  'human-behavior-model': '3.1',
  'leadership': '3.1',

  // 3.2 労働関係法と労務管理
  'labor-relations-law': '3.2',
  'wage-management': '3.2',
  'work-style-reform': '3.2',
  'health-management': '3.2',
  'employment-system': '3.2',
  'employee-benefits': '3.2',
  'harassment': '3.2',
  'labor-mobility': '3.2',
  'employment-statistics': '3.2',
  'human-capital-management': '3.2',

  // 3.3 人材活用計画
  'human-relations-management': '3.3',
  'personnel-management': '3.3',
  'job-analysis': '3.3',
  'job-design': '3.3',
  'recruitment-management': '3.3',
  'second-career': '3.3',
  'mandatory-management-retirement': '3.3',
  'diversity-management': '3.3',
  'talent-management': '3.3',
  'internship': '3.3',

  // 3.4 人材開発
  'performance-appraisal': '3.4',
  'human-resource-development': '3.4',
  'training-techniques': '3.4',
  'human-resource-assessment': '3.4',
  'skill-standards': '3.4',
  'cpd': '3.4',
  'job-rotation': '3.4',
  'qc-circle': '3.4',
  'foreign-trainee-program': '3.4',
  'career-path': '3.4',
  'career-ownership': '3.4',

  // 4.1 情報分析と情報活用
  'information-analysis-techniques': '4.1',
  'statistical-analysis': '4.1',
  'big-data-analysis': '4.1',
  'artificial-intelligence': '4.1',
  'business-marketing-analysis': '4.1',
  'knowledge-management': '4.1',
  'open-data': '4.1',

  // 4.2 コミュニケーション
  'communication-methods': '4.2',
  'accountability': '4.2',
  'external-communication': '4.2',
  'digital-communication-tools': '4.2',
  'communication-management': '4.2',
  'emergency-information-management': '4.2',

  // 4.3 知的財産権と情報の保護と活用
  'intellectual-property-rights': '4.3',
  'information-protection': '4.3',
  'personal-information-protection': '4.3',
  'antimonopoly-law': '4.3',
  'intellectual-property-strategy': '4.3',

  // 4.4 情報通信技術動向
  'information-system-implementation-trends': '4.4',
  'system-evaluation-rasis': '4.4',
  'communication-infrastructure': '4.4',
  'information-system-utilization-trends': '4.4',
  'digital-transformation-technology': '4.4',
  'system-development-process': '4.4',

  // 4.5 情報セキュリティ
  'information-security-elements': '4.5',
  'information-security-policy': '4.5',
  'information-security-threats': '4.5',
  'information-security-countermeasures': '4.5',
  'information-security-certification': '4.5',
  'cyber-security': '4.5',

  // 5.1 安全の概念
  'safety-management': '5.1',
  'social-safety': '5.1',
  'process-safety': '5.1',
  'system-safety-concept': '5.1',
  'safety-legislation': '5.1',
  'safety-culture': '5.1',

  // 5.2 安全に関するリスクマネジメント
  'risk-assessment': '5.2',
  'risk': '5.2',
  'risk-management-plan': '5.2',
  'risk-assessment-process': '5.2',
  'risk-response': '5.2',
  'risk-monitoring': '5.2',
  'risk-communication': '5.2',
  'risk-perception-bias': '5.2',

  // 5.3 労働安全衛生管理
  'occupational-accidents': '5.3',
  'occupational-disease': '5.3',
  'mental-health': '5.3',
  'occupational-safety-law': '5.3',
  'occupational-safety-health-management': '5.3',

  // 5.4 事故・災害の未然防止活動・技術
  'safety-education': '5.4',
  'training-drills': '5.4',
  'unsafe-conditions-behavior': '5.4',
  'human-factors': '5.4',
  'near-miss': '5.4',
  'heinrichs-law': '5.4',
  'inherent-safety': '5.4',
  'functional-safety': '5.4',
  'ergonomic-principles': '5.4',
  'high-reliability-systems': '5.4',
  'safety-instrumented-system': '5.4',
  'emergency-stop-device': '5.4',
  'fault-avoidance': '5.4',
  'fault-tolerance': '5.4',
  'fail-soft': '5.4',
  'fool-proof': '5.4',
  'fail-safe': '5.4',
  'interlock': '5.4',
  'safety-confirmation-system': '5.4',
  'isolation-safety': '5.4',
  'redundancy-safety': '5.4',
  'safety-case': '5.4',
  'lopa': '5.4',
  'technical-nontechnical-skills': '5.4',
  'four-m-analysis': '5.4',
  'four-e-countermeasures': '5.4',
  'small-group-activities': '5.4',
  'occupational-accident-prevention-plan': '5.4',
  'voluntary-safety-activities': '5.4',

  // 5.5 危機管理
  'business-continuity-plan': '5.5',
  'crisis': '5.5',
  'natural-disaster': '5.5',
  'hazardous-facility-disaster-prevention': '5.5',
  'nuclear-disaster-prevention': '5.5',
  'terrorism': '5.5',
  'infectious-disease-pandemic': '5.5',
  'crisis-management-system': '5.5',
  'disaster-related-laws': '5.5',

  // 5.6 システム安全工学手法
  'system-safety-engineering-methods': '5.6',
  'human-error-analysis': '5.6',
  'system-reliability-analysis': '5.6',
  'root-cause-analysis': '5.6',

  // 6.1 地球的規模の環境問題
  'sustainable-development': '6.1',
  'ozone-layer-protection': '6.1',
  'acid-rain': '6.1',
  'planetary-boundaries': '6.1',
  'doughnut-economics': '6.1',
  'climate-change-energy': '6.1',
  'biodiversity': '6.1',

  // 6.2 地域環境問題
  'circular-economy-waste': '6.2',
  'sound-water-cycle': '6.2',
  'pollution': '6.2',
  'chemical-substances-environmental-risk': '6.2',
  'extreme-weather-disaster-prevention': '6.2',
  'radioactive-contamination': '6.2',

  // 6.3 環境保全の基本原則
  'environmental-basic-law': '6.3',
  'polluter-pays-principle': '6.3',
  'extended-producer-responsibility': '6.3',
  'prevention-principle': '6.3',
  'precautionary-principle': '6.3',
  'source-control-principle': '6.3',
  'cooperation-principle': '6.3',
  'subsidiarity-principle': '6.3',
  'end-of-pipe': '6.3',
  'regulatory-instruments': '6.3',
  'economic-instruments': '6.3',
  'information-instruments': '6.3',
  'procedural-instruments': '6.3',
  'consensus-instruments': '6.3',
  'voluntary-instruments': '6.3',
  'environmental-education': '6.3',

  // 6.4 組織の社会的責任と環境管理活動
  'esg-environmental-assessment': '6.4',
  'pollution-control-manager': '6.4',
  'social-responsibility': '6.4',
  'csr': '6.4',
  'csv-creating-shared-value': '6.4',
  'socially-responsible-investment': '6.4',
  'esg-investment-finance': '6.4',
  'global-compact': '6.4',
  'iso-14000': '6.4',
  'bioeconomy': '6.4',
  'design-for-environment': '6.4',
  'environmental-accounting': '6.4',
  'environmental-communication': '6.4',
  'integrated-reporting': '6.4',
  'ethical-consumption': '6.4',
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
