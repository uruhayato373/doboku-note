import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CustomUnorderedList from './CustomUnorderedList';

const meta: Meta<typeof CustomUnorderedList> = {
  title: 'UI/CustomUnorderedList',
  component: CustomUnorderedList,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'カスタムスタイルの順序なしリストコンポーネント。modern、elegant、checklistの3つのスタイルが利用可能です。',
      },
    },
  },
  argTypes: {
    title: {
      description: 'リストのタイトル',
      control: 'text',
    },
    items: {
      description: 'リストアイテムの配列（文字列またはListItemオブジェクト）',
      control: 'object',
    },
    style: {
      description: 'リストのスタイル',
      control: 'select',
      options: ['modern', 'elegant', 'checklist'],
    },
    className: {
      description: '追加のCSSクラス',
      control: 'text',
    },
    interactive: {
      description: 'チェックリストの場合、インタラクティブ機能を有効にするか',
      control: 'boolean',
    },
    onItemCheck: {
      description: 'チェック状態変更時のコールバック関数',
      action: 'itemChecked',
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Modern スタイル
export const Modern: Story = {
  args: {
    title: 'モダンスタイルのリスト',
    items: [
      'リモートワークの実践ポイント',
      '効率的なタスク管理手法',
      'コミュニケーションツールの活用',
      'ワークライフバランスの確保',
      '継続的なスキルアップ',
    ],
    style: 'modern',
  },
};

// Elegant スタイル
export const Elegant: Story = {
  args: {
    title: 'エレガントスタイルのリスト',
    items: [
      '健康管理の基本原則',
      '適切な運動習慣の構築',
      'バランスの取れた食事',
      '質の良い睡眠の確保',
      'ストレス管理テクニック',
    ],
    style: 'elegant',
  },
};

// Checklist スタイル（非インタラクティブ）
export const ChecklistStatic: Story = {
  args: {
    title: '完了済みタスクリスト',
    items: [
      { content: 'プロジェクト企画書の作成', checked: true },
      { content: 'チームメンバーへの説明', checked: true },
      { content: 'リソース確保の調整', checked: true },
      { content: 'スケジュール策定', checked: false },
      { content: 'キックオフミーティング準備', checked: false },
    ],
    style: 'checklist',
    interactive: false,
  },
};

// Checklist スタイル（インタラクティブ）
export const ChecklistInteractive: Story = {
  args: {
    title: 'インタラクティブチェックリスト',
    items: [
      { content: '朝の運動（30分）', checked: true },
      { content: '健康的な朝食摂取', checked: true },
      { content: 'タスクの優先順位設定', checked: false },
      { content: '重要な会議への参加', checked: false },
      { content: '夕方のリフレクション', checked: false },
    ],
    style: 'checklist',
    interactive: true,
    onItemCheck: (index: number, checked: boolean) => {
      console.log(`Item ${index} checked: ${checked}`);
    },
  },
};

// ダークモード用のストーリー
export const DarkMode: Story = {
  args: {
    title: 'ダークモード表示',
    items: [
      'ダークモードでの表示確認',
      'テキストの可読性チェック',
      '背景色とボーダーの確認',
      'ホバー効果の動作確認',
      'アイコンの視認性確認',
    ],
    style: 'modern',
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl dark">
        <div className="p-4 bg-white dark:bg-gray-900 min-h-screen">
          <Story />
        </div>
      </div>
    ),
  ],
};

// ライトダークモード比較
export const LightDarkComparison: Story = {
  args: {
    title: 'ライトダークモード比較',
    items: [
      '同じコンテンツでの表示比較',
      'カラーテーマの適用確認',
      '可読性の違いを確認',
      'デザインの一貫性チェック',
    ],
    style: 'modern',
  },
  decorators: [
    (Story) => (
      <div className="max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-4 bg-white">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">ライトモード</h3>
            <Story />
          </div>
          <div className="p-4 bg-gray-900 dark">
            <h3 className="text-lg font-semibold mb-4 text-gray-200">ダークモード</h3>
            <Story />
          </div>
        </div>
      </div>
    ),
  ],
};
