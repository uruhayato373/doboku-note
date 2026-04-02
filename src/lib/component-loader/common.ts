/**
 * 共通MDXコンポーネント定義
 * 3つ以上の記事で使用される、または将来的に多用される見込みのコンポーネント
 */

export const commonComponents = {
  // UI基本コンポーネント
  ArticleImage: "ArticleImage",
  Callout: "Callout",
  CustomUnorderedList: "CustomUnorderedList",
  CustomOrderedList: "CustomOrderedList",
  LinkCard: "LinkCard",
  CardList: "CardList",
  DataTable: "DataTable",
  Underline: "Underline",
  AuthorCallout: "AuthorCallout",
  Timeline: "Timeline",
  RelatedArticleCard: "RelatedArticleCard",

  // 汎用コンポーネント（将来追加予定）
  // ImageGallery: 'ImageGallery',
  // TableOfContents: 'TableOfContents',
  // RelatedPosts: 'RelatedPosts',
} as const;

export type CommonComponentName = keyof typeof commonComponents;
