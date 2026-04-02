import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ArticleHeader from "./ArticleHeader";
import type { Post } from "@/types/blog";

const meta = {
  title: "Blog/Content/ArticleHeader",
  component: ArticleHeader,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "記事のヘッダー部分。タイトル、カテゴリ、日付、サムネイル画像を表示します。",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    post: {
      description: "記事データ",
      control: "object",
    },
  },
} satisfies Meta<typeof ArticleHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

// デフォルト
export const Default: Story = {
  args: {
    post: {
      id: "sample-post",
      title: "サンプル記事タイトル",
      description:
        "これはサンプル記事の説明文です。実際の記事では、より詳細で具体的な内容が記載されます。",
      date: "2024-01-15",
      category: "イケオジ",
      subCategory: "美容・服装",
      tags: ["サンプル", "テスト", "記事"],
      readTime: "5分",
      isPremium: false,
      content: "サンプル記事の内容...",
      headings: [
        { id: "heading-1", text: "サンプル見出し1", level: 2 },
        { id: "heading-2", text: "サンプル見出し2", level: 3 },
      ],
    } as Post,
  },
  parameters: {
    docs: {
      description: {
        story:
          "デフォルトの記事ヘッダー表示。タイトル、カテゴリ、日付、サムネイル画像が表示されます。",
      },
    },
  },
};

// イケオジ記事
export const IkeojiPost: Story = {
  args: {
    post: {
      id: "ikeoji-post",
      title: "40代からのメンズスキンケア完全ガイド",
      description:
        "40代男性のための効果的なスキンケア方法とおすすめ商品を紹介します。",
      date: "2024-01-15",
      category: "イケオジ",
      subCategory: "美容・服装",
      tags: ["スキンケア", "40代", "メンズコスメ"],
      readTime: "8分",
      isPremium: false,
      content: "イケオジ記事の内容...",
      headings: [
        { id: "heading-1", text: "メンズスキンケア", level: 2 },
        { id: "heading-2", text: "おすすめ商品", level: 3 },
      ],
    } as Post,
  },
  parameters: {
    docs: {
      description: {
        story:
          "イケオジカテゴリの記事ヘッダー表示。ピンク系のカテゴリバッジが表示されます。",
      },
    },
  },
};

// シゴデキ記事
export const ShigodekiPost: Story = {
  args: {
    post: {
      id: "shigodeki-post",
      title: "GTDメソッドを使ったタスク管理の実践",
      description:
        "Getting Things Doneメソッドを活用した効率的なタスク管理システムの構築方法。",
      date: "2024-01-15",
      category: "シゴデキ",
      subCategory: "仕事効率化",
      tags: ["タスク管理", "生産性", "GTD"],
      readTime: "12分",
      isPremium: false,
      content: "シゴデキ記事の内容...",
      headings: [
        { id: "heading-1", text: "GTDメソッド", level: 2 },
        { id: "heading-2", text: "実践方法", level: 3 },
      ],
    } as Post,
  },
  parameters: {
    docs: {
      description: {
        story:
          "シゴデキカテゴリの記事ヘッダー表示。ブルー系のカテゴリバッジが表示されます。",
      },
    },
  },
};

// 長いタイトル
export const LongTitle: Story = {
  args: {
    post: {
      id: "long-title-post",
      title:
        "これは非常に長い記事タイトルで、複数行にわたって表示される可能性があります。実際の記事ではこのような長いタイトルも適切に処理されます。",
      description: "長いタイトルの記事の説明文です。",
      date: "2024-01-15",
      category: "イケオジ",
      subCategory: "美容・服装",
      tags: ["長いタイトル", "テスト"],
      readTime: "5分",
      isPremium: false,
      content: "長いタイトル記事の内容...",
      headings: [
        { id: "heading-1", text: "長いタイトルテスト", level: 2 },
        { id: "heading-2", text: "表示テスト", level: 3 },
      ],
    } as Post,
  },
  parameters: {
    docs: {
      description: {
        story:
          "長いタイトルの記事ヘッダー表示。タイトルが適切に折り返されて表示されます。",
      },
    },
  },
};
