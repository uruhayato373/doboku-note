import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CardList from './CardList';

const meta = {
  title: 'UI/CardList',
  component: CardList,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'データをカード形式で表示するリストコンポーネント。パーセンテージ表示、カラーインジケーター、レイアウト切り替えなどの機能をサポートします。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      description: 'リストのタイトル',
      control: 'text',
    },
    data: {
      description: '表示するデータの配列',
      control: 'object',
    },
    showPercentage: {
      description: 'パーセンテージ表示の有無',
      control: 'boolean',
    },
    showColorIndicator: {
      description: 'カラーインジケーターの表示有無',
      control: 'boolean',
    },
    layout: {
      description: 'レイアウトタイプ',
      control: 'select',
      options: ['simple', 'detailed'],
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl mx-auto p-6 bg-white">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CardList>;

export default meta;
type Story = StoryObj<typeof meta>;

// サンプルデータ
const sampleData = [
  { name: '国内株式', value: 300, color: '#3b82f6' },
  { name: '外国株式', value: 200, color: '#10b981' },
  { name: '国内債券', value: 150, color: '#f59e0b' },
  { name: '外国債券', value: 100, color: '#8b5cf6' },
  { name: '不動産', value: 100, color: '#ef4444' },
  { name: 'コモディティ', value: 50, color: '#06b6d4' },
];

const investmentData = [
  { name: 'NISA', value: 400, color: '#3b82f6' },
  { name: 'iDeCo', value: 300, color: '#10b981' },
  { name: '一般口座', value: 200, color: '#f59e0b' },
];

const budgetData = [
  { name: '食費', value: 50000, color: '#ef4444' },
  { name: '住居費', value: 80000, color: '#3b82f6' },
  { name: '光熱費', value: 20000, color: '#10b981' },
  { name: '交通費', value: 30000, color: '#f59e0b' },
  { name: '娯楽費', value: 40000, color: '#8b5cf6' },
];

// デフォルト（詳細レイアウト、パーセンテージ表示）
export const Default: Story = {
  args: {
    title: '資産配分',
    data: sampleData,
    showPercentage: true,
    showColorIndicator: true,
    layout: 'detailed',
  },
  parameters: {
    docs: {
      description: {
        story: 'デフォルト設定の詳細レイアウト。パーセンテージ表示とカラーインジケーター付き。',
      },
    },
  },
};

// シンプルレイアウト
export const SimpleLayout: Story = {
  args: {
    title: '投資口座別配分',
    data: investmentData,
    showPercentage: true,
    showColorIndicator: false,
    layout: 'simple',
  },
  parameters: {
    docs: {
      description: {
        story: 'シンプルレイアウト。コンパクトな表示で、カラーインジケーターなし。',
      },
    },
  },
};

// パーセンテージ表示なし（金額表示）
export const AmountDisplay: Story = {
  args: {
    title: '月間支出',
    data: budgetData,
    showPercentage: false,
    showColorIndicator: true,
    layout: 'detailed',
  },
  parameters: {
    docs: {
      description: {
        story: 'パーセンテージ表示なし。金額を直接表示する形式。',
      },
    },
  },
};

// カラーインジケーターなし
export const NoColorIndicator: Story = {
  args: {
    title: '資産配分（カラーなし）',
    data: sampleData,
    showPercentage: true,
    showColorIndicator: false,
    layout: 'detailed',
  },
  parameters: {
    docs: {
      description: {
        story: 'カラーインジケーターなし。シンプルな表示。',
      },
    },
  },
};

// タイトルなし
export const NoTitle: Story = {
  args: {
    title: '',
    data: sampleData,
    showPercentage: true,
    showColorIndicator: true,
    layout: 'detailed',
  },
  parameters: {
    docs: {
      description: {
        story: 'タイトルなしの表示。コンパクトなレイアウト。',
      },
    },
  },
};

// 少数のデータ
export const FewItems: Story = {
  args: {
    title: '主要資産',
    data: [
      { name: '株式', value: 500, color: '#3b82f6' },
      { name: '債券', value: 300, color: '#10b981' },
    ],
    showPercentage: true,
    showColorIndicator: true,
    layout: 'detailed',
  },
  parameters: {
    docs: {
      description: {
        story: '少数のアイテムでの表示。シンプルで見やすい。',
      },
    },
  },
};

// 多数のデータ
export const ManyItems: Story = {
  args: {
    title: '詳細資産配分',
    data: [
      { name: '国内大型株', value: 150, color: '#3b82f6' },
      { name: '国内中型株', value: 100, color: '#1d4ed8' },
      { name: '国内小型株', value: 50, color: '#1e40af' },
      { name: '米国大型株', value: 120, color: '#10b981' },
      { name: '米国中型株', value: 60, color: '#059669' },
      { name: '欧州株式', value: 40, color: '#047857' },
      { name: 'アジア株式', value: 30, color: '#065f46' },
      { name: '新興国株式', value: 20, color: '#064e3b' },
      { name: '国内債券', value: 100, color: '#f59e0b' },
      { name: '外国債券', value: 80, color: '#d97706' },
      { name: '不動産投資信託', value: 80, color: '#ef4444' },
      { name: '金', value: 30, color: '#dc2626' },
      { name: '原油', value: 20, color: '#b91c1c' },
    ],
    showPercentage: true,
    showColorIndicator: true,
    layout: 'detailed',
  },
  parameters: {
    docs: {
      description: {
        story: '多数のアイテムでの表示。スクロールが必要になる場合。',
      },
    },
  },
};

// ゼロ値のデータ
export const ZeroValues: Story = {
  args: {
    title: '月間実績',
    data: [
      { name: '達成', value: 80, color: '#10b981' },
      { name: '未達成', value: 0, color: '#ef4444' },
      { name: '保留', value: 20, color: '#f59e0b' },
    ],
    showPercentage: true,
    showColorIndicator: true,
    layout: 'detailed',
  },
  parameters: {
    docs: {
      description: {
        story: 'ゼロ値を含むデータでの表示。パーセンテージ計算の確認。',
      },
    },
  },
};

// 全レイアウト比較
export const LayoutComparison: Story = {
  args: {
    title: 'レイアウト比較',
    data: sampleData.slice(0, 3),
    showPercentage: true,
    showColorIndicator: true,
    layout: 'detailed',
  },
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900">詳細レイアウト</h3>
        <CardList
          title="資産配分"
          data={sampleData.slice(0, 3)}
          showPercentage={true}
          showColorIndicator={true}
          layout="detailed"
        />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900">シンプルレイアウト</h3>
        <CardList
          title="資産配分"
          data={sampleData.slice(0, 3)}
          showPercentage={true}
          showColorIndicator={false}
          layout="simple"
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '詳細レイアウトとシンプルレイアウトの比較表示。',
      },
    },
  },
};

// 表示オプション比較
export const DisplayOptionsComparison: Story = {
  args: {
    title: '表示オプション比較',
    data: sampleData.slice(0, 3),
    showPercentage: true,
    showColorIndicator: true,
    layout: 'detailed',
  },
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900">パーセンテージ + カラー</h3>
        <CardList
          title="資産配分"
          data={sampleData.slice(0, 3)}
          showPercentage={true}
          showColorIndicator={true}
          layout="detailed"
        />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900">金額 + カラー</h3>
        <CardList
          title="資産配分"
          data={sampleData.slice(0, 3)}
          showPercentage={false}
          showColorIndicator={true}
          layout="detailed"
        />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900">パーセンテージのみ</h3>
        <CardList
          title="資産配分"
          data={sampleData.slice(0, 3)}
          showPercentage={true}
          showColorIndicator={false}
          layout="detailed"
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '様々な表示オプションの組み合わせを比較表示。',
      },
    },
  },
};

// ダークモード対応確認
export const DarkMode: Story = {
  args: {
    title: 'ダークモード対応',
    data: sampleData.slice(0, 3),
    showPercentage: true,
    showColorIndicator: true,
    layout: 'detailed',
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'ダークモードでのCardListの表示確認。',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl mx-auto p-6 bg-gray-800 dark">
        <Story />
      </div>
    ),
  ],
};

// エラー状態（空データ）
export const EmptyData: Story = {
  args: {
    title: 'エラー状態',
    data: [],
    showPercentage: true,
    showColorIndicator: true,
    layout: 'detailed',
  },
  parameters: {
    docs: {
      description: {
        story: 'データが空の場合のエラー表示。',
      },
    },
  },
};

// エラー状態（無効データ）
export const InvalidData: Story = {
  args: {
    title: '無効データ',
    data: [
      { name: '正常データ', value: 100, color: '#10b981' },
      { name: '', value: 'invalid', color: '#ef4444' },
      { name: '正常データ2', value: 200, color: '#3b82f6' },
    ] as any,
    showPercentage: true,
    showColorIndicator: true,
    layout: 'detailed',
  },
  parameters: {
    docs: {
      description: {
        story: '無効なデータが含まれる場合の表示。エラーハンドリングの確認。',
      },
    },
  },
}; 