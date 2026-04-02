import { PostData, PostSummary } from "@/types/blog";

export const mockPost: PostData = {
  id: "mock-post-001",
  title: "サンプル記事タイトル",
  description: "これはStorybook用のサンプル記事です。コンポーネントのテストに使用されます。",
  date: "2024-01-15",
  category: "シゴデキ",
  subCategory: "仕事効率化",
  tags: ["サンプル", "テスト", "Storybook"],
  readTime: "5分",
  isPremium: false,
  content: `# サンプル記事

## はじめに
これはStorybook用のサンプル記事です。

## セクション1
コンテンツの例文です。

### サブセクション
さらなる例文が続きます。

## まとめ
最後のセクションです。`,
  headings: [
    { id: "heading-1", text: "はじめに", level: 2 },
    { id: "heading-2", text: "セクション1", level: 2 },
    { id: "heading-3", text: "サブセクション", level: 3 },
    { id: "heading-4", text: "まとめ", level: 2 },
  ],
  relatedPosts: ["related-post-1", "related-post-2"],
};

export const mockPosts: PostSummary[] = [
  {
    id: "mock-post-001",
    title: "サンプル記事タイトル",
    description: "これはStorybook用のサンプル記事です。",
    date: "2024-01-15",
    category: "シゴデキ",
    subCategory: "仕事効率化",
    tags: ["サンプル", "テスト"],
    readTime: "5分",
    isPremium: false,
  },
  {
    id: "mock-post-002",
    title: "別のサンプル記事",
    description: "2番目のサンプル記事です。",
    date: "2024-01-14",
    category: "イケオジ",
    subCategory: "美容・服装",
    tags: ["美容", "ファッション"],
    readTime: "3分",
    isPremium: true,
  },
  {
    id: "mock-post-003",
    title: "3番目の記事",
    description: "3番目のサンプル記事です。",
    date: "2024-01-13",
    category: "シゴデキ",
    subCategory: "投資・副業",
    tags: ["投資", "副業"],
    readTime: "7分",
    isPremium: false,
  },
];
