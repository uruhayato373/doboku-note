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
  RelatedExamQuestions: "RelatedExamQuestions",
  SpecSheetList: "SpecSheetList",
  LinkCard: "LinkCard",
  NoteLink: "NoteLink",
  MagazineInlineCard: "MagazineInlineCard",
  SeeAlso: "SeeAlso",
  SpokeNavCard: "SpokeNavCard",
  CardList: "CardList",
  ReferenceLinks: "ReferenceLinks",
  ExamContext: "ExamContext",
  DataTable: "DataTable",
  Nowrap: "Nowrap",
  Underline: "Underline",
  AuthorCallout: "AuthorCallout",
  Timeline: "Timeline",
  ExamFields: "ExamFields",
  StatsCard: "StatsCard",
  PdcaCycle: "PdcaCycle",
  CourseAffiliate: "CourseAffiliate",
  // 汎用コンポーネント（将来追加予定）
  // ImageGallery: 'ImageGallery',
  // TableOfContents: 'TableOfContents',
  // RelatedPosts: 'RelatedPosts',
} as const;

export type CommonComponentName = keyof typeof commonComponents;
