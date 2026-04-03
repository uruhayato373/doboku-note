import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import RelatedPosts from "./RelatedPosts";
import type { Post } from "@/types/blog";

const meta = {
  title: "Blog/Content/RelatedPosts",
  component: RelatedPosts,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "記事の下部に表示される関連記事セクション。スコアリングシステムに基づいて関連性の高い記事を表示します。",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    currentPost: {
      description: "現在の記事データ",
      control: "object",
    },
    maxPosts: {
      description: "表示する関連記事の最大数",
      control: { type: "number", min: 1, max: 10 },
    },
  },
} satisfies Meta<typeof RelatedPosts>;

export default meta;
type Story = StoryObj<typeof meta>;

// デフォルト
export const Default: Story = {
  args: {
    currentPost: {
      id: "sample-post",
      title: "サンプル記事タイトル",
      description: "これはサンプル記事の説明文です。",
      date: "2024-01-15",
      category: "シゴデキ",
      subCategory: "仕事効率化",
      tags: ["タスク管理", "生産性", "GTD"],
      readTime: "5分",
      isPremium: false,
      content: "サンプル記事の内容...",
      headings: [
        { id: "heading-1", text: "タスク管理の基本", level: 2 },
        { id: "heading-2", text: "GTDの実践方法", level: 3 },
      ],
    } as Post,
    maxPosts: 3,
  },
  parameters: {
    docs: {
      description: {
        story:
          "デフォルトの関連記事表示。3件の関連記事がグリッドレイアウトで表示されます。",
      },
    },
  },
};

// 関連記事が多い場合
export const ManyRelatedPosts: Story = {
  args: {
    currentPost: {
      id: "many-tags-post",
      title: "包括的なタスク管理ガイド",
      description: "様々なタスク管理手法を網羅した記事です。",
      date: "2024-01-15",
      category: "シゴデキ",
      subCategory: "仕事効率化",
      tags: ["タスク管理", "生産性", "GTD", "ポモドーロテクニック", "時間管理"],
      readTime: "10分",
      isPremium: false,
      content: "包括的なタスク管理の内容...",
      headings: [
        { id: "heading-1", text: "包括的タスク管理", level: 2 },
        { id: "heading-2", text: "ポモドーロテクニック", level: 3 },
      ],
    } as Post,
    maxPosts: 6,
  },
  parameters: {
    docs: {
      description: {
        story:
          "多くのタグを持つ記事での関連記事表示。より多くの関連記事が表示されます。",
      },
    },
  },
};

// 関連記事が少ない場合
export const FewRelatedPosts: Story = {
  args: {
    currentPost: {
      id: "ikeoji-post",
      title: "40代からのスキンケア",
      description: "40代男性のためのスキンケア方法。",
      date: "2024-01-15",
      category: "イケオジ",
      subCategory: "美容・服装",
      tags: ["スキンケア", "40代"],
      readTime: "6分",
      isPremium: false,
      content: "イケオジ記事の内容...",
      headings: [
        { id: "heading-1", text: "40代のスキンケア", level: 2 },
        { id: "heading-2", text: "基本の手順", level: 3 },
      ],
    } as Post,
    maxPosts: 3,
  },
  parameters: {
    docs: {
      description: {
        story:
          "関連記事が少ない場合の表示。カテゴリやタグが異なる記事も含めて表示されます。",
      },
    },
  },
};

// 最大記事数が多い場合
export const LargeMaxPosts: Story = {
  args: {
    currentPost: {
      id: "large-max-posts",
      title: "最大記事数テスト記事",
      description: "最大記事数を多く設定した場合のテスト用記事です。",
      date: "2024-01-15",
      category: "シゴデキ",
      subCategory: "仕事効率化",
      tags: ["テスト", "記事数"],
      readTime: "5分",
      isPremium: false,
      content: "最大記事数テストの内容...",
      headings: [
        { id: "heading-1", text: "テスト記事", level: 2 },
        { id: "heading-2", text: "記事数テスト", level: 3 },
      ],
    } as Post,
    maxPosts: 9,
  },
  parameters: {
    docs: {
      description: {
        story:
          "最大記事数を多く設定した場合の表示。より多くの関連記事がグリッドで表示されます。",
      },
    },
  },
};
