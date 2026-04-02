import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Callout from './Callout';

const meta = {
  title: 'UI/Callout',
  component: Callout,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'ブログ記事内で重要な情報を強調表示するためのコールアウトコンポーネント。type により色とアイコンが変わります。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      description: 'コールアウトのタイプ',
      control: 'select',
      options: ['info', 'warning', 'success', 'error'],
    },
    children: {
      description: 'コールアウト内に表示するコンテンツ',
      control: 'text',
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl mx-auto p-6 bg-white">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Callout>;

export default meta;
type Story = StoryObj<typeof meta>;

// 情報タイプ（デフォルト）
export const Info: Story = {
  args: {
    type: 'info',
    children: 'これは重要な情報をユーザーに伝えるためのインフォメーションコールアウトです。ブログ記事内で補足情報や参考情報を提供する際に使用します。',
  },
  parameters: {
    docs: {
      description: {
        story: '一般的な情報や補足説明に使用するinfoタイプのコールアウト',
      },
    },
  },
};

// 警告タイプ
export const Warning: Story = {
  args: {
    type: 'warning',
    children: '注意が必要な内容や、ユーザーが気をつけるべきポイントを伝える警告コールアウトです。重要な注意事項がある場合に使用します。',
  },
  parameters: {
    docs: {
      description: {
        story: '注意喚起や警告メッセージに使用するwarningタイプ',
      },
    },
  },
};

// 成功タイプ
export const Success: Story = {
  args: {
    type: 'success',
    children: 'タスクの完了や成功した事例、ポジティブな情報を伝える際に使用する成功コールアウトです。達成感や満足感を演出できます。',
  },
  parameters: {
    docs: {
      description: {
        story: '成功メッセージやポジティブな情報に使用するsuccessタイプ',
      },
    },
  },
};

// エラータイプ
export const Error: Story = {
  args: {
    type: 'error',
    children: 'エラーや失敗例、避けるべき行動について伝えるエラーコールアウトです。重要な警告や禁止事項を明確に示すことができます。',
  },
  parameters: {
    docs: {
      description: {
        story: 'エラーメッセージや重要な警告に使用するerrorタイプ',
      },
    },
  },
};

// 短いテキスト
export const ShortText: Story = {
  args: {
    type: 'info',
    children: 'これは短いメッセージです。',
  },
  parameters: {
    docs: {
      description: {
        story: '短いテキストでのコールアウト表示',
      },
    },
  },
};

// 長いテキスト
export const LongText: Story = {
  args: {
    type: 'warning',
    children: `これは非常に長いテキストのコールアウトです。複数の段落にわたる場合や、詳細な説明を含む場合の表示を確認するためのサンプルです。

このように複数行にわたるテキストでも適切に表示されることを確認します。改行や段落も含めて、読みやすいレイアウトが保たれているかをチェックしましょう。

長いテキストの場合でも、適切な余白とタイポグラフィが維持されることが重要です。`,
  },
  parameters: {
    docs: {
      description: {
        story: '長いテキストや複数段落でのコールアウト表示',
      },
    },
  },
};

// リスト付きコールアウト
export const WithList: Story = {
  args: {
    type: 'info',
    children: (
      <>
        <p>以下のポイントに注意してください：</p>
        <ul>
          <li>定期的にバックアップを取る</li>
          <li>パスワードは複雑なものを使用する</li>
          <li>二段階認証を有効にする</li>
          <li>ソフトウェアを最新に保つ</li>
        </ul>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'リストやその他のHTML要素を含むコールアウト',
      },
    },
  },
};

// ダークモード
export const DarkMode: Story = {
  args: {
    type: 'info',
    children: 'ダークモードでのコールアウト表示を確認するためのサンプルテキストです。',
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'ダークモードでのコールアウト表示',
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

// 全タイプ比較
export const AllTypes: Story = {
  args: {
    type: 'info',
    children: '全てのタイプのコールアウトを一覧で表示',
  },
  render: () => (
    <div className="space-y-4">
      <Callout type="info">
        <strong>Info:</strong> 一般的な情報や補足説明に使用します。
      </Callout>
      <Callout type="warning">
        <strong>Warning:</strong> 注意が必要な内容に使用します。
      </Callout>
      <Callout type="success">
        <strong>Success:</strong> 成功メッセージやポジティブな情報に使用します。
      </Callout>
      <Callout type="error">
        <strong>Error:</strong> エラーや重要な警告に使用します。
      </Callout>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '全てのタイプのコールアウトを一覧で表示',
      },
    },
  },
};