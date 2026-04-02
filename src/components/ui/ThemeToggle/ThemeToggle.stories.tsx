import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ThemeToggle from './ThemeToggle';

const meta: Meta<typeof ThemeToggle> = {
  title: 'UI/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'ライトモードとダークモードを切り替えるトグルボタン。next-themesを使用してテーマ状態を管理し、適切なアイコンとスタイルを表示します。',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-900">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// デフォルト（ライトモード）
export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'デフォルトのライトモードでの表示。月のアイコンが表示されます。',
      },
    },
  },
};

// ダークモード
export const DarkMode: Story = {
  args: {},
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'ダークモードでの表示。太陽のアイコンが表示されます。',
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

// 複数配置
export const MultipleToggle: Story = {
  args: {},
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">複数のテーマトグル</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          複数のテーマトグルを配置した場合の表示を確認できます。
        </p>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">ヘッダー用</p>
          <ThemeToggle />
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">サイドバー用</p>
          <ThemeToggle />
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">フッター用</p>
          <ThemeToggle />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '複数のテーマトグルを配置した場合の表示。一貫性のあるデザインを確認できます。',
      },
    },
  },
};

// ホバー効果の確認
export const HoverEffects: Story = {
  args: {},
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">ホバー効果の説明</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          以下のテーマトグルにマウスを乗せると、以下の効果が確認できます：
        </p>
        <ul className="text-gray-600 dark:text-gray-400 space-y-2">
          <li>• 背景色の変化（hover:bg-gray-300 / dark:hover:bg-gray-600）</li>
          <li>• スムーズなトランジション（transition-colors duration-200）</li>
          <li>• カーソルの変化（cursor: pointer）</li>
        </ul>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">ライトモード</p>
          <ThemeToggle />
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">ダークモード</p>
          <div className="w-9 h-9 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors duration-200 flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>
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

// アクセシビリティ
export const Accessibility: Story = {
  args: {},
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">アクセシビリティ機能</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          テーマトグルには以下のアクセシビリティ機能が含まれています：
        </p>
        <ul className="text-gray-600 dark:text-gray-400 space-y-2">
          <li>• aria-label=&quot;テーマ切り替え&quot; - スクリーンリーダー用の説明</li>
          <li>• button要素 - キーボード操作対応</li>
          <li>• 適切なコントラスト比 - 視認性の向上</li>
          <li>• フォーカス可能 - Tabキーでの移動</li>
        </ul>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">フォーカス状態</p>
          <div className="w-9 h-9 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors duration-200 flex items-center justify-center ring-2 ring-primary-500 ring-offset-2">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">通常状態</p>
          <ThemeToggle />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'アクセシビリティ機能の説明と確認。',
      },
    },
  },
};

// ローディング状態
export const LoadingState: Story = {
  args: {},
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">ローディング状態</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          コンポーネントがマウントされる前のローディング状態を表示します。
        </p>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">ローディング中</p>
          <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">通常状態</p>
          <ThemeToggle />
        </div>
      </div>
      
      <div className="text-sm text-gray-500 dark:text-gray-400">
        <p>ローディング状態では以下の特徴があります：</p>
        <ul className="mt-2 space-y-1">
          <li>• アニメーション付きのプレースホルダー</li>
          <li>• テーマ状態に応じた背景色</li>
          <li>• アイコンは表示されない</li>
        </ul>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'ローディング状態の表示確認。マウント前の状態を確認できます。',
      },
    },
  },
}; 