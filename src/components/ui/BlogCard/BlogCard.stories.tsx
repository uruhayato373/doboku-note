import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import BlogCard from './BlogCard';

const meta = {
  title: 'UI/BlogCard',
  component: BlogCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'ブログ記事を表示するカードコンポーネント。3つのバリアント（default、compact、featured）をサポートし、画像、タイトル、説明、カテゴリ、タグなどを表示します。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    post: {
      description: 'ブログ記事のデータ',
      control: 'object',
    },
    variant: {
      description: 'カードのバリアント',
      control: 'select',
      options: ['default', 'compact', 'featured'],
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-4xl mx-auto p-6 bg-gray-50">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BlogCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// サンプルデータ
const samplePost = {
  id: 'sample-blog-post',
  title: 'Next.js 14で始めるモダンWeb開発の基礎知識',
  description: 'Next.js 14の新機能とApp Routerの使い方について詳しく解説します。TypeScript、Tailwind CSS、Storybookを使った開発環境の構築から、実際のアプリケーション開発まで幅広くカバーしています。',
  date: '2024-01-15',
  category: 'シゴデキ' as const,
  subCategory: '仕事効率化' as const,
  tags: ['Next.js', 'React', 'TypeScript', 'Web開発'],
  readTime: '8分',
  isPremium: false,
  content: 'Next.js 14の詳細な解説内容...',
  headings: [{ id: 'h1', text: 'Next.js 14', level: 2 }],
};

const ikeojiPost = {
  id: 'ikeoji-lifestyle',
  title: '40代から始める理想的な生活習慣の作り方',
  description: '仕事とプライベートのバランスを取りながら、健康的で充実した生活を送るための具体的な方法をご紹介します。時間管理、健康管理、趣味の充実など、実践的なアドバイスをまとめました。',
  date: '2024-01-10',
  category: 'イケオジ' as const,
  subCategory: 'ライフスタイル' as const,
  tags: ['生活習慣', '健康', '時間管理', '趣味'],
  readTime: '12分',
  isPremium: false,
  content: '生活習慣についての詳細な内容...',
  headings: [{ id: 'h2', text: '生活習慣', level: 2 }],
};

const shortTitlePost = {
  id: 'short-title',
  title: '簡単なタイトル',
  description: '短い説明文です。',
  date: '2024-01-05',
  category: 'シゴデキ' as const,
  subCategory: '仕事効率化' as const,
  tags: ['効率化', 'Tips'],
  readTime: '3分',
  isPremium: false,
  content: '簡潔な記事内容...',
  headings: [{ id: 'h3', text: '簡潔な記事', level: 2 }],
};

const longTitlePost = {
  id: 'very-long-title-post',
  title: 'これは非常に長いタイトルのブログ記事です。複数行にわたる場合や、詳細な説明を含む場合の表示を確認するためのサンプルです。',
  description: '長いタイトルでの表示確認のためのサンプル記事です。タイトルが長い場合でも適切に表示されることを確認しましょう。',
  date: '2024-01-20',
  category: 'イケオジ' as const,
  subCategory: 'ライフスタイル' as const,
  tags: ['サンプル', 'テスト', '長いタイトル'],
  readTime: '5分',
  isPremium: false,
  content: '長いタイトルのサンプル記事内容...',
  headings: [{ id: 'h4', text: '長いタイトル', level: 2 }],
};

const noSubCategoryPost = {
  id: 'no-subcategory',
  title: 'サブカテゴリなしの記事',
  description: 'サブカテゴリが設定されていない記事の表示を確認するためのサンプルです。',
  date: '2024-01-25',
  category: 'シゴデキ' as const,
  subCategory: '仕事効率化' as const,
  tags: ['サンプル', 'テスト'],
  readTime: '6分',
  isPremium: false,
  content: 'サブカテゴリなしの記事内容...',
  headings: [{ id: 'h5', text: 'サブカテゴリなし', level: 2 }],
};

const noTagsPost = {
  id: 'no-tags',
  title: 'タグなしの記事',
  description: 'タグが設定されていない記事の表示を確認するためのサンプルです。',
  date: '2024-01-30',
  category: 'イケオジ' as const,
  subCategory: 'ライフスタイル' as const,
  tags: [],
  readTime: '4分',
  isPremium: false,
  content: 'タグなしの記事内容...',
  headings: [{ id: 'h6', text: 'タグなし', level: 2 }],
};

// デフォルトバリアント
export const Default: Story = {
  args: {
    post: samplePost,
    variant: 'default',
  },
  parameters: {
    docs: {
      description: {
        story: 'デフォルトバリアント。標準的なサイズとレイアウトでブログ記事を表示します。',
      },
    },
  },
};

// コンパクトバリアント
export const Compact: Story = {
  args: {
    post: samplePost,
    variant: 'compact',
  },
  parameters: {
    docs: {
      description: {
        story: 'コンパクトバリアント。横長のレイアウトで、画像とテキストを横並びに配置します。',
      },
    },
  },
};

// フィーチャーバリアント
export const Featured: Story = {
  args: {
    post: ikeojiPost,
    variant: 'featured',
  },
  parameters: {
    docs: {
      description: {
        story: 'フィーチャーバリアント。大きな画像と詳細な情報を表示し、注目記事向けのレイアウトです。',
      },
    },
  },
};

// イケオジカテゴリ（デフォルト）
export const IkeojiCategory: Story = {
  args: {
    post: ikeojiPost,
    variant: 'default',
  },
  parameters: {
    docs: {
      description: {
        story: 'イケオジカテゴリの記事。ピンク色のカテゴリバッジが表示されます。',
      },
    },
  },
};

// 短いタイトル
export const ShortTitle: Story = {
  args: {
    post: shortTitlePost,
    variant: 'default',
  },
  parameters: {
    docs: {
      description: {
        story: '短いタイトルの記事。コンパクトな表示になります。',
      },
    },
  },
};

// 長いタイトル
export const LongTitle: Story = {
  args: {
    post: longTitlePost,
    variant: 'default',
  },
  parameters: {
    docs: {
      description: {
        story: '長いタイトルの記事。line-clampで適切に省略表示されます。',
      },
    },
  },
};

// サブカテゴリなし
export const NoSubCategory: Story = {
  args: {
    post: noSubCategoryPost,
    variant: 'default',
  },
  parameters: {
    docs: {
      description: {
        story: 'サブカテゴリが設定されていない記事。右上のサブカテゴリバッジは表示されません。',
      },
    },
  },
};

// タグなし
export const NoTags: Story = {
  args: {
    post: noTagsPost,
    variant: 'featured',
  },
  parameters: {
    docs: {
      description: {
        story: 'タグが設定されていない記事。下部のタグエリアは表示されません。',
      },
    },
  },
};

// 全バリアント比較
export const AllVariants: Story = {
  args: {
    post: samplePost,
    variant: 'default',
  },
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900">フィーチャーバリアント</h3>
        <div className="max-w-2xl">
          <BlogCard post={samplePost} variant="featured" />
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900">デフォルトバリアント</h3>
        <div className="max-w-md">
          <BlogCard post={samplePost} variant="default" />
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900">コンパクトバリアント</h3>
        <div className="max-w-2xl">
          <BlogCard post={samplePost} variant="compact" />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '3つのバリアントを一覧で比較表示。サイズとレイアウトの違いを確認できます。',
      },
    },
  },
};

// カテゴリ比較
export const CategoryComparison: Story = {
  args: {
    post: samplePost,
    variant: 'default',
  },
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900">仕事デキカテゴリ</h3>
        <BlogCard post={samplePost} variant="default" />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900">イケオジカテゴリ</h3>
        <BlogCard post={ikeojiPost} variant="default" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '仕事デキ（青）とイケオジ（ピンク）のカテゴリバッジの色の違いを比較。',
      },
    },
  },
};

// グリッドレイアウト
export const GridLayout: Story = {
  args: {
    post: samplePost,
    variant: 'default',
  },
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <BlogCard post={samplePost} variant="default" />
      <BlogCard post={ikeojiPost} variant="default" />
      <BlogCard post={shortTitlePost} variant="default" />
      <BlogCard post={longTitlePost} variant="default" />
      <BlogCard post={noSubCategoryPost} variant="default" />
      <BlogCard post={noTagsPost} variant="default" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '複数のBlogCardをグリッドレイアウトで表示。レスポンシブ対応の確認。',
      },
    },
  },
};

// ダークモード対応確認
export const DarkMode: Story = {
  args: {
    post: samplePost,
    variant: 'default',
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'ダークモードでのBlogCardの表示確認。',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-4xl mx-auto p-6 bg-gray-900 dark">
        <Story />
      </div>
    ),
  ],
};

// ホバー効果の確認
export const HoverEffects: Story = {
  args: {
    post: samplePost,
    variant: 'default',
  },
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900">ホバー効果の説明</h3>
        <p className="text-gray-600 mb-4">
          以下のカードにマウスを乗せると、以下の効果が確認できます：
        </p>
        <ul className="text-gray-600 space-y-2">
          <li>• 影の変化（shadow-sm → shadow-lg）</li>
          <li>• ボーダーカラーの変化（青系）</li>
          <li>• 画像の拡大（scale-105）</li>
          <li>• タイトルの色変化（青系）</li>
        </ul>
      </div>
      
      <div className="max-w-md">
        <BlogCard post={samplePost} variant="default" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'ホバー効果の詳細説明と実際の動作確認。',
      },
    },
  },
}; 