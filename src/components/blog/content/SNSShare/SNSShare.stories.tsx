import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SNSShare from './SNSShare';

const meta = {
  title: 'Blog/Content/SNSShare',
  component: SNSShare,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '記事のSNSシェアボタン。Twitter、Facebook、LINEでのシェア機能を提供します。コンパクトと拡張の2つのバリエーションがあります。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      description: 'シェアする記事のタイトル',
      control: 'text',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'undefined' },
      },
    },
    variant: {
      description: '表示バリエーション',
      control: 'select',
      options: ['compact', 'extended'],
      table: {
        type: { summary: "'compact' | 'extended'" },
        defaultValue: { summary: "'compact'" },
      },
    },
    align: {
      description: 'ボタンの配置（compactバリエーションのみ有効）',
      control: 'select',
      options: ['start', 'center', 'end'],
      table: {
        type: { summary: "'start' | 'center' | 'end'" },
        defaultValue: { summary: "'end'" },
      },
    },
    showHeading: {
      description: '見出しの表示/非表示（extendedバリエーションのみ有効）',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
      },
    },
    showCopy: {
      description: 'リンクコピーボタンの表示/非表示（extendedバリエーションのみ有効）',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
      },
    },
  },
} satisfies Meta<typeof SNSShare>;

export default meta;
type Story = StoryObj<typeof meta>;

// デフォルト（コンパクト）
export const Default: Story = {
  args: {
    title: '公務員のためのタスク管理入門：GTDメソッドで仕事を効率化しよう',
    variant: 'compact',
    align: 'end',
  },
  parameters: {
    docs: {
      description: {
        story: 'デフォルトのコンパクトなSNSシェアボタン。記事上部に配置されるシンプルなアイコンのみの表示です。',
      },
    },
  },
};

// 拡張バリエーション
export const Extended: Story = {
  args: {
    title: '公務員のためのタスク管理入門：GTDメソッドで仕事を効率化しよう',
    variant: 'extended',
    showHeading: true,
    showCopy: true,
  },
  parameters: {
    docs: {
      description: {
        story: '拡張バリエーションのSNSシェアボタン。記事下部に配置される詳細なボタンとコピー機能を含む表示です。',
      },
    },
  },
};

// コンパクト - 左寄せ
export const CompactStart: Story = {
  args: {
    title: 'タスク管理の基本',
    variant: 'compact',
    align: 'start',
  },
  parameters: {
    docs: {
      description: {
        story: 'コンパクトバリエーションを左寄せで表示。',
      },
    },
  },
};

// コンパクト - 中央寄せ
export const CompactCenter: Story = {
  args: {
    title: 'タスク管理の基本',
    variant: 'compact',
    align: 'center',
  },
  parameters: {
    docs: {
      description: {
        story: 'コンパクトバリエーションを中央寄せで表示。',
      },
    },
  },
};

// コンパクト - 右寄せ
export const CompactEnd: Story = {
  args: {
    title: 'タスク管理の基本',
    variant: 'compact',
    align: 'end',
  },
  parameters: {
    docs: {
      description: {
        story: 'コンパクトバリエーションを右寄せで表示。',
      },
    },
  },
};

// 拡張 - 左寄せ（alignプロパティの動作確認）
export const ExtendedAlignStart: Story = {
  args: {
    title: '公務員のための投資・副業完全ガイド（2024年版）',
    variant: 'extended',
    align: 'start',
    showHeading: true,
    showCopy: true,
  },
  parameters: {
    docs: {
      description: {
        story: '拡張バリエーションでalign=startを指定した場合。extendedバリエーションではalignプロパティは通常無視されますが、動作を確認できます。',
      },
    },
  },
};

// 拡張 - 中央寄せ（alignプロパティの動作確認）
export const ExtendedAlignCenter: Story = {
  args: {
    title: '公務員のための投資・副業完全ガイド（2024年版）',
    variant: 'extended',
    align: 'center',
    showHeading: true,
    showCopy: true,
  },
  parameters: {
    docs: {
      description: {
        story: '拡張バリエーションでalign=centerを指定した場合。extendedバリエーションではalignプロパティは通常無視されますが、動作を確認できます。',
      },
    },
  },
};

// 拡張 - 右寄せ（alignプロパティの動作確認）
export const ExtendedAlignEnd: Story = {
  args: {
    title: '公務員のための投資・副業完全ガイド（2024年版）',
    variant: 'extended',
    align: 'end',
    showHeading: true,
    showCopy: true,
  },
  parameters: {
    docs: {
      description: {
        story: '拡張バリエーションでalign=endを指定した場合。extendedバリエーションではalignプロパティは通常無視されますが、動作を確認できます。',
      },
    },
  },
};

// 拡張 - 見出しなし
export const ExtendedNoHeading: Story = {
  args: {
    title: '公務員のための投資・副業完全ガイド（2024年版）',
    variant: 'extended',
    showHeading: false,
    showCopy: true,
  },
  parameters: {
    docs: {
      description: {
        story: '拡張バリエーションで見出しを非表示にした場合。',
      },
    },
  },
};

// 拡張 - コピーボタンなし
export const ExtendedNoCopy: Story = {
  args: {
    title: '公務員のための投資・副業完全ガイド（2024年版）',
    variant: 'extended',
    showHeading: true,
    showCopy: false,
  },
  parameters: {
    docs: {
      description: {
        story: '拡張バリエーションでコピーボタンを非表示にした場合。',
      },
    },
  },
};

// 拡張 - 見出しとコピーボタンなし
export const ExtendedMinimal: Story = {
  args: {
    title: '公務員のための投資・副業完全ガイド（2024年版）',
    variant: 'extended',
    showHeading: false,
    showCopy: false,
  },
  parameters: {
    docs: {
      description: {
        story: '拡張バリエーションで見出しとコピーボタンの両方を非表示にした場合。',
      },
    },
  },
};

// 長いタイトル
export const LongTitle: Story = {
  args: {
    title: 'これは非常に長い記事タイトルで、SNSシェア時に適切に処理される必要があります。実際の記事ではこのような長いタイトルも適切に処理されます。',
    variant: 'extended',
    showHeading: true,
    showCopy: true,
  },
  parameters: {
    docs: {
      description: {
        story: '長いタイトルの記事でのSNSシェアボタン表示。タイトルが長すぎる場合の処理を確認できます。',
      },
    },
  },
};

// 特殊文字を含むタイトル
export const SpecialCharacters: Story = {
  args: {
    title: '公務員のための「投資・副業」完全ガイド（2024年版）',
    variant: 'extended',
    showHeading: true,
    showCopy: true,
  },
  parameters: {
    docs: {
      description: {
        story: '特殊文字（括弧、記号）を含むタイトルの記事でのSNSシェアボタン表示。',
      },
    },
  },
};

// カスタムURL
export const CustomUrl: Story = {
  args: {
    title: 'カスタムURLのテスト',
    variant: 'extended',
    showHeading: true,
    showCopy: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'SNSShareコンポーネントは内部でusePathname()を使用してURLを自動生成するため、urlプロパティは不要です。',
      },
    },
  },
};

// インタラクティブテスト用
export const Interactive: Story = {
  args: {
    title: 'インタラクティブテスト用の記事タイトル',
    variant: 'extended',
    align: 'end',
    showHeading: true,
    showCopy: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'すべてのpropsをインタラクティブに変更してテストできます。Controlsパネルで各プロパティを変更して動作を確認してください。特にextendedバリエーションでalignプロパティを変更した場合の動作を確認できます。',
      },
    },
  },
};

// 拡張バリエーションのalignプロパティ比較用
export const ExtendedAlignComparison: Story = {
  args: {
    title: 'align比較テスト',
    variant: 'extended',
    align: 'end',
    showHeading: true,
    showCopy: true,
  },
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Extended + align=start</h3>
        <SNSShare 
          title="align=startのテスト" 
          variant="extended" 
          align="start" 
          showHeading={true} 
          showCopy={true} 
        />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Extended + align=center</h3>
        <SNSShare 
          title="align=centerのテスト" 
          variant="extended" 
          align="center" 
          showHeading={true} 
          showCopy={true} 
        />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Extended + align=end</h3>
        <SNSShare 
          title="align=endのテスト" 
          variant="extended" 
          align="end" 
          showHeading={true} 
          showCopy={true} 
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '拡張バリエーションでalignプロパティを変更した場合の比較表示。extendedバリエーションではalignプロパティがどのように動作するかを視覚的に確認できます。',
      },
    },
  },
}; 