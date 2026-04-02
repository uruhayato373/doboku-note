import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CustomOrderedList from './CustomOrderedList';

const meta: Meta<typeof CustomOrderedList> = {
  title: 'UI/CustomOrderedList',
  component: CustomOrderedList,
  parameters: {
    layout: 'padded',
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1024px',
            height: '768px',
          },
        },
      },
      defaultViewport: 'responsive',
    },
    docs: {
      description: {
        component: 'カスタムスタイルの順序ありリストコンポーネント。numbered、modern、actionの3つのスタイルが利用可能です。',
      },
    },
  },
  argTypes: {
    title: {
      description: 'リストのタイトル',
      control: 'text',
    },
    items: {
      description: 'リストアイテムの配列（文字列、ReactNode、またはListItemオブジェクト）',
      control: 'object',
    },
    style: {
      description: 'リストのスタイル',
      control: 'select',
      options: ['numbered', 'modern', 'action'],
    },
    className: {
      description: '追加のCSSクラス',
      control: 'text',
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

// Numbered スタイル（デフォルト）
export const Numbered: Story = {
  args: {
    title: '基本的な数字付きリスト',
    items: [
      'アカウント作成とプロフィール設定',
      '初期設定とカスタマイズ',
      '基本機能の理解と練習',
      '実際のプロジェクトでの活用',
      '継続的な改善とフィードバック',
    ],
    style: 'numbered',
  },
};


// Action スタイル
export const Action: Story = {
  args: {
    title: '今すぐできる具体的なアクション',
    items: [
      '今週末：控除限度額をシミュレーターで計算（5分で完了）',
      '来月：返礼品選びとワンストップ特例制度の準備',
      '来年度：年間3〜13万円の節約と地方創生への貢献を実現',
    ],
    style: 'action',
  },
};

// Modern スタイル
export const Modern: Story = {
  args: {
    title: 'モダンなデザインのリスト',
    items: [
      '最新の技術トレンドを調査',
      'プロトタイプの作成と検証',
      'ユーザーフィードバックの収集',
      '本格実装とテスト',
      'リリースと運用開始',
    ],
    style: 'modern',
  },
};

// タイトルなしのリスト
export const WithoutTitle: Story = {
  args: {
    items: [
      'タイトルなしのステップ1',
      'タイトルなしのステップ2',
      'タイトルなしのステップ3',
    ],
    style: 'numbered',
  },
};

// カスタムクラス付き
export const WithCustomClass: Story = {
  args: {
    title: 'カスタムスタイル適用例',
    items: [
      '追加スタイルが適用されたアイテム1',
      '追加スタイルが適用されたアイテム2',
      '追加スタイルが適用されたアイテム3',
    ],
    style: 'numbered',
    className: 'shadow-lg border-dashed',
  },
};

// 投資戦略の例（実用的な例）
export const InvestmentStrategy: Story = {
  args: {
    title: '40代からの投資戦略',
    items: [
      '現在の家計状況と投資可能額の把握',
      'リスク許容度と投資目標の設定',
      'NISA・iDeCo制度の最大限活用',
      'ポートフォリオ構築と分散投資の実践',
      '定期的なリバランスと見直し',
    ],
    style: 'numbered',
  },
};

// プロジェクト管理の例
export const ProjectManagement: Story = {
  args: {
    title: 'プロジェクト成功のための7ステップ',
    items: [
      'プロジェクト憲章の作成',
      'ワークブレークダウンストラクチャーの策定',
      'スケジュールとマイルストーンの設定',
      'チーム編成と役割分担の明確化',
      'コミュニケーション計画の立案',
      '進捗管理とリスクモニタリング',
      '成果物の品質管理と納期調整',
    ],
    style: 'numbered',
  },
};

// キャリア開発の例
export const CareerDevelopment: Story = {
  args: {
    title: '戦略的キャリア開発計画',
    items: [
      '現在のスキルセットと市場価値の客観的評価',
      '5年後・10年後のキャリアビジョンの明確化',
      '必要なスキルギャップの特定と学習計画策定',
      'ネットワーキングと業界情報収集の強化',
      '実績作りと成果の可視化',
    ],
    style: 'numbered',
  },
};

// 長いコンテンツのテスト
export const LongContent: Story = {
  args: {
    title: '詳細な説明を含むプロセス',
    items: [
      'これは非常に詳細な説明を含む最初のステップです。複数の要素を考慮し、関係者との調整を行いながら慎重に進める必要があります。',
      '第二段階では、前の段階で収集した情報を基に、具体的なアクションプランを策定します。この段階では特に品質と効率性のバランスを重視することが重要です。',
      '最終段階として、実装と評価を行います。継続的な改善サイクルを回しながら、目標達成に向けて着実に進んでいきます。',
    ],
    style: 'numbered',
  },
};

// 少数アイテムのテスト
export const FewItems: Story = {
  args: {
    title: '簡潔な3ステップ',
    items: [
      '計画',
      '実行',
      '評価',
    ],
    style: 'numbered',
  },
};

// 多数アイテムのテスト
export const ManyItems: Story = {
  args: {
    title: '詳細な10ステップ手順',
    items: [
      '事前調査と情報収集',
      '要件定義と目標設定',
      'ステークホルダーとの合意形成',
      'リソース確保と予算調整',
      'プロジェクト計画の策定',
      'チーム編成と役割分担',
      '実装フェーズの開始',
      '中間評価と軌道修正',
      'テストと品質確認',
      'デプロイと運用開始',
    ],
    style: 'numbered',
  },
};

// レスポンシブ表示テスト用のストーリー
export const ResponsiveTest: Story = {
  args: {
    title: 'レスポンシブ表示テスト',
    items: [
      'モバイル表示での確認',
      'タブレット表示での確認',
      'デスクトップ表示での確認',
      'ビューポート切り替えテスト',
    ],
    style: 'action',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
};