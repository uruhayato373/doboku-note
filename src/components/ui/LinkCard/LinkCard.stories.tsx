import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import LinkCardClient from './LinkCardClient';

const meta = {
  title: 'UI/LinkCard',
  component: LinkCardClient,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '外部リンクを表示するカードコンポーネント。画像、タイトル、説明、サイト名、カテゴリを表示し、クリックで外部リンクを開きます。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    url: {
      description: 'リンク先のURL',
      control: 'text',
    },
    title: {
      description: 'リンクのタイトル',
      control: 'text',
    },
    description: {
      description: 'リンクの説明文',
      control: 'text',
    },
    imageUrl: {
      description: '表示する画像のURL',
      control: 'text',
    },
    siteName: {
      description: 'サイト名',
      control: 'text',
    },
    category: {
      description: 'カテゴリ',
      control: 'text',
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-4xl mx-auto p-6 bg-gray-50">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LinkCardClient>;

export default meta;
type Story = StoryObj<typeof meta>;

// サンプルデータ
const sampleLink = {
  url: 'https://nextjs.org/',
  title: 'Next.js - The React Framework for Production',
  description: 'Next.js gives you the best developer experience with all the features you need for production: hybrid static & server rendering, TypeScript support, smart bundling, route pre-fetching, and more.',
  imageUrl: 'https://nextjs.org/static/twitter-cards/home.jpg',
  siteName: 'nextjs.org',
  category: '参考資料',
};

const ikeojiLink = {
  url: 'https://www.amazon.co.jp/dp/B08N5WRWNW',
  title: '40代から始める理想的な生活習慣の作り方',
  description: '仕事とプライベートのバランスを取りながら、健康的で充実した生活を送るための具体的な方法をご紹介します。',
  imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/71L9ouJwA3L._AC_UL600_SR600,600_.jpg',
  siteName: 'Amazon.co.jp',
  category: 'イケオジ',
};

const noImageLink = {
  url: 'https://github.com/vercel/next.js',
  title: 'vercel/next.js: The React Framework for Production',
  description: 'Next.js is a React framework that gives you building blocks to create web applications.',
  siteName: 'GitHub',
  category: '開発ツール',
};

const shortDescriptionLink = {
  url: 'https://tailwindcss.com/',
  title: 'Tailwind CSS',
  description: 'A utility-first CSS framework.',
  imageUrl: 'https://tailwindcss.com/img/og-image.jpg',
  siteName: 'tailwindcss.com',
  category: 'CSS',
};

const longTitleLink = {
  url: 'https://www.example.com/very-long-title-article',
  title: 'これは非常に長いタイトルのリンクカードです。複数行にわたる場合や、詳細な説明を含む場合の表示を確認するためのサンプルです。',
  description: '長いタイトルでの表示確認のためのサンプルリンクです。タイトルが長い場合でも適切に表示されることを確認しましょう。',
  imageUrl: 'https://via.placeholder.com/300x200/3b82f6/ffffff?text=Long+Title',
  siteName: 'example.com',
  category: 'サンプル',
};

const noDescriptionLink = {
  url: 'https://www.example.com/no-description',
  title: '説明なしのリンク',
  imageUrl: 'https://via.placeholder.com/300x200/10b981/ffffff?text=No+Desc',
  siteName: 'example.com',
  category: 'サンプル',
};

const noCategoryLink = {
  url: 'https://www.example.com/no-category',
  title: 'カテゴリなしのリンク',
  description: 'カテゴリが設定されていないリンクの表示を確認するためのサンプルです。',
  imageUrl: 'https://via.placeholder.com/300x200/f59e0b/ffffff?text=No+Cat',
  siteName: 'example.com',
};

// デフォルト（画像あり、カテゴリあり）
export const Default: Story = {
  args: {
    ...sampleLink,
  },
  parameters: {
    docs: {
      description: {
        story: 'デフォルト設定。画像、タイトル、説明、サイト名、カテゴリが全て表示されます。',
      },
    },
  },
};

// イケオジカテゴリ
export const IkeojiCategory: Story = {
  args: {
    ...ikeojiLink,
  },
  parameters: {
    docs: {
      description: {
        story: 'イケオジカテゴリのリンク。ピンク系のカテゴリバッジが表示されます。',
      },
    },
  },
};

// 画像なし
export const NoImage: Story = {
  args: {
    ...noImageLink,
  },
  parameters: {
    docs: {
      description: {
        story: '画像なしのリンク。画像エリアは表示されず、テキストのみのレイアウトになります。',
      },
    },
  },
};

// 短い説明
export const ShortDescription: Story = {
  args: {
    ...shortDescriptionLink,
  },
  parameters: {
    docs: {
      description: {
        story: '短い説明文のリンク。コンパクトな表示になります。',
      },
    },
  },
};

// 長いタイトル
export const LongTitle: Story = {
  args: {
    ...longTitleLink,
  },
  parameters: {
    docs: {
      description: {
        story: '長いタイトルのリンク。line-clampで適切に省略表示されます。',
      },
    },
  },
};

// 説明なし
export const NoDescription: Story = {
  args: {
    ...noDescriptionLink,
  },
  parameters: {
    docs: {
      description: {
        story: '説明文なしのリンク。説明エリアは表示されません。',
      },
    },
  },
};

// カテゴリなし
export const NoCategory: Story = {
  args: {
    ...noCategoryLink,
  },
  parameters: {
    docs: {
      description: {
        story: 'カテゴリなしのリンク。カテゴリバッジは表示されません。',
      },
    },
  },
};

// 技術系リンク
export const TechLinks: Story = {
  args: {
    ...sampleLink,
  },
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900">技術系リンク集</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LinkCardClient
          url="https://nextjs.org/"
          title="Next.js - The React Framework"
          description="React ベースのフルスタックフレームワーク"
          imageUrl="https://via.placeholder.com/300x200/3b82f6/ffffff?text=Next.js"
          siteName="nextjs.org"
          category="フレームワーク"
        />
        
        <LinkCardClient
          url="https://react.dev/"
          title="React - A JavaScript library"
          description="ユーザーインターフェース構築のためのJavaScriptライブラリ"
          imageUrl="https://via.placeholder.com/300x200/06b6d4/ffffff?text=React"
          siteName="react.dev"
          category="ライブラリ"
        />
        
        <LinkCardClient
          url="https://tailwindcss.com/"
          title="Tailwind CSS"
          description="ユーティリティファーストのCSSフレームワーク"
          imageUrl="https://via.placeholder.com/300x200/10b981/ffffff?text=Tailwind"
          siteName="tailwindcss.com"
          category="CSS"
        />
        
        <LinkCardClient
          url="https://typescriptlang.org/"
          title="TypeScript"
          description="JavaScriptの型付きスーパーセット"
          imageUrl="https://via.placeholder.com/300x200/8b5cf6/ffffff?text=TypeScript"
          siteName="typescriptlang.org"
          category="言語"
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '技術系のリンクをグリッドレイアウトで表示。様々なカテゴリのリンクを確認できます。',
      },
    },
  },
};

// カテゴリ別表示
export const CategoryComparison: Story = {
  args: {
    ...sampleLink,
  },
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900">カテゴリ別表示</h3>
      </div>
      
      <div>
        <h4 className="text-md font-medium mb-3 text-gray-700">参考資料（青）</h4>
        <LinkCardClient
          url="https://example1.com"
          title="参考資料カテゴリのリンク"
          description="青系のカテゴリバッジが表示されます"
          imageUrl="https://via.placeholder.com/300x200/3b82f6/ffffff?text=参考資料"
          siteName="example1.com"
          category="参考資料"
        />
      </div>
      
      <div>
        <h4 className="text-md font-medium mb-3 text-gray-700">イケオジ（ピンク）</h4>
        <LinkCardClient
          url="https://example2.com"
          title="イケオジカテゴリのリンク"
          description="ピンク系のカテゴリバッジが表示されます"
          imageUrl="https://via.placeholder.com/300x200/ec4899/ffffff?text=イケオジ"
          siteName="example2.com"
          category="イケオジ"
        />
      </div>
      
      <div>
        <h4 className="text-md font-medium mb-3 text-gray-700">開発ツール（緑）</h4>
        <LinkCardClient
          url="https://example3.com"
          title="開発ツールカテゴリのリンク"
          description="緑系のカテゴリバッジが表示されます"
          imageUrl="https://via.placeholder.com/300x200/10b981/ffffff?text=開発ツール"
          siteName="example3.com"
          category="開発ツール"
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '様々なカテゴリのリンクを比較表示。カテゴリバッジの色の違いを確認できます。',
      },
    },
  },
};

// レスポンシブレイアウト
export const ResponsiveLayout: Story = {
  args: {
    ...sampleLink,
  },
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900">レスポンシブレイアウト</h3>
        <p className="text-gray-600 mb-4">
          画面サイズに応じてレイアウトが変化します。小さな画面では縦並び、大きな画面では横並びになります。
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <LinkCardClient
          url="https://example1.com"
          title="リンクカード1"
          description="レスポンシブ対応の確認用"
          imageUrl="https://via.placeholder.com/300x200/3b82f6/ffffff?text=Card+1"
          siteName="example1.com"
          category="サンプル"
        />
        
        <LinkCardClient
          url="https://example2.com"
          title="リンクカード2"
          description="レスポンシブ対応の確認用"
          imageUrl="https://via.placeholder.com/300x200/10b981/ffffff?text=Card+2"
          siteName="example2.com"
          category="サンプル"
        />
        
        <LinkCardClient
          url="https://example3.com"
          title="リンクカード3"
          description="レスポンシブ対応の確認用"
          imageUrl="https://via.placeholder.com/300x200/f59e0b/ffffff?text=Card+3"
          siteName="example3.com"
          category="サンプル"
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'レスポンシブ対応の確認。グリッドレイアウトでの表示を確認できます。',
      },
    },
  },
};

// ダークモード対応確認
export const DarkMode: Story = {
  args: {
    ...sampleLink,
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'ダークモードでのLinkCardの表示確認。',
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
    ...sampleLink,
  },
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900">ホバー効果の説明</h3>
        <p className="text-gray-600 mb-4">
          以下のリンクカードにマウスを乗せると、以下の効果が確認できます：
        </p>
        <ul className="text-gray-600 space-y-2">
          <li>• 影の変化（shadow-sm → shadow-md）</li>
          <li>• 画像の拡大（scale-105）</li>
          <li>• タイトルの色変化（青系）</li>
          <li>• 外部リンクアイコンの色変化（青系）</li>
        </ul>
      </div>
      
      <div className="max-w-2xl">
        <LinkCardClient
          url="https://example.com"
          title="ホバー効果確認用のリンクカード"
          description="マウスを乗せて効果を確認してください"
          imageUrl="https://via.placeholder.com/300x200/8b5cf6/ffffff?text=Hover+Effect"
          siteName="example.com"
          category="サンプル"
        />
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