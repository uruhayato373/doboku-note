import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import RealEstateCostsTable from '../../features/real-estate-investment/RealEstateCostsTable';

const meta: Meta<typeof RealEstateCostsTable> = {
  title: 'Features/RealEstateCostsTable',
  component: RealEstateCostsTable,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: '不動産購入時の諸費用を表示するテーブルコンポーネント。汎用のDataTableコンポーネントを使用し、固定の設定で表示します。'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    theme: {
      control: { type: 'select' },
      options: ['default', 'dark', 'minimal'],
      description: 'テーブルのテーマスタイル'
    }
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-gray-50 p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// デフォルトの表示
export const Default: Story = {
  args: {},
};

// ダークテーマ
export const DarkTheme: Story = {
  args: {
    theme: 'dark'
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-gray-900 p-4">
        <Story />
      </div>
    ),
  ],
};

// ミニマルテーマ
export const MinimalTheme: Story = {
  args: {
    theme: 'minimal'
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-white p-4">
        <Story />
      </div>
    ),
  ],
};

// カスタムデータ（現在は固定データのみ表示）
export const CustomData: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: '現在は固定の費用データを表示します。カスタムデータの表示は今後のアップデートで対応予定です。'
      }
    }
  }
};

// モバイル表示
export const Mobile: Story = {
  args: {},
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

// タブレット表示
export const Tablet: Story = {
  args: {},
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

// デスクトップ表示
export const Desktop: Story = {
  args: {},
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
  },
};

// 印刷用スタイル
export const Print: Story = {
  args: {},
  parameters: {
    backgrounds: {
      default: 'white',
    },
  },
};

// ダーク背景 + 大サイズ表示
export const DarkLarge: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-gray-900 p-4">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'ダーク背景での表示例。コンポーネント自体は固定設定で表示されます。'
      }
    }
  }
};

// ミニマル背景 + 小サイズ表示
export const MinimalSmall: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-white p-4">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'ミニマル背景での表示例。コンポーネント自体は固定設定で表示されます。'
      }
    }
  }
}; 