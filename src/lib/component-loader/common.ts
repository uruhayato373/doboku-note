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
  NoteLink: "NoteLink",
  MagazineInlineCard: "MagazineInlineCard",
  MagazineCard: "MagazineCard",
  SeeAlso: "SeeAlso",
  SpokeNavCard: "SpokeNavCard",
  PersonaSelector: "PersonaSelector",
  SourceBadges: "SourceBadges",
  ReferenceLinks: "ReferenceLinks",
  ExamContext: "ExamContext",
  DataTable: "DataTable",
  Nowrap: "Nowrap",
  Underline: "Underline",
  AuthorCallout: "AuthorCallout",
  Timeline: "Timeline",
  ExamFields: "ExamFields",
  PdcaCycle: "PdcaCycle",
  CareerAffiliate: "CareerAffiliate",
  // 汎用コンポーネント（将来追加予定）
  // ImageGallery: 'ImageGallery',
  // TableOfContents: 'TableOfContents',
  // RelatedPosts: 'RelatedPosts',
} as const;

export type CommonComponentName = keyof typeof commonComponents;
