/**
 * 共通MDXコンポーネント定義
 * 3つ以上の記事で使用される、または将来的に多用される見込みのコンポーネント
 */

export const commonComponents = {
  // UI基本コンポーネント
  ArticleImage: "ArticleImage",
  Callout: "Callout",
  ExamPoint: "ExamPoint",
  RelatedKeywords: "RelatedKeywords",
  SpecSheetList: "SpecSheetList",
  LinkCard: "LinkCard",
  CardList: "CardList",
  ReferenceLinks: "ReferenceLinks",
  ExamContext: "ExamContext",
  DataTable: "DataTable",
  Underline: "Underline",
  AuthorCallout: "AuthorCallout",
  Timeline: "Timeline",
  ExamFields: "ExamFields",
  StatsCard: "StatsCard",
  PdcaCycle: "PdcaCycle",
  // 汎用コンポーネント（将来追加予定）
  // ImageGallery: 'ImageGallery',
  // TableOfContents: 'TableOfContents',
  // RelatedPosts: 'RelatedPosts',
} as const;

export type CommonComponentName = keyof typeof commonComponents;
