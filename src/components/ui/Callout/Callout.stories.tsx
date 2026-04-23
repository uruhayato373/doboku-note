import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Callout from "./Callout";

const meta = {
  title: "UI/Callout",
  component: Callout,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "MDX 記事本文中で論点を視覚分離するためのコンポーネント。12 種のセマンティック type（note / tip / warn / danger / success / exam / formula / standard / example / reference / faq / quote）から選ぶ。デザインは Claude Design ハンドオフ（2026-04-22）準拠で、左アクセントバー + 円形アイコン + 任意タイトルのミニマル構成。",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    type: {
      description: "Callout の種別（12 種）",
      control: "select",
      options: [
        "note",
        "tip",
        "warn",
        "danger",
        "success",
        "exam",
        "formula",
        "standard",
        "example",
        "reference",
        "faq",
        "quote",
      ],
    },
    title: {
      description: "任意タイトル（トーン色で強調表示）",
      control: "text",
    },
    children: {
      description: "Callout 内に表示するコンテンツ",
      control: "text",
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

// ─── 汎用種別（5 種） ───

export const Note: Story = {
  args: {
    type: "note",
    title: "この記事の目的",
    children: "事実の強調・補足情報に使う。旧 info / note の統合先。",
  },
};

export const Tip: Story = {
  args: {
    type: "tip",
    title: "覚え方のコツ",
    children: "学習コツ・覚え方のヒントに使う。",
  },
};

export const Warn: Story = {
  args: {
    type: "warn",
    title: "変動性を逆転させた誤答に注意",
    children: "行動への警告・頻出引っかけに使う。旧 warning / caution の統合先。",
  },
};

export const Danger: Story = {
  args: {
    type: "danger",
    title: "この誤答は致命的",
    children: "致命的な誤解・重大な誤答に使う。",
  },
};

export const Success: Story = {
  args: {
    type: "success",
    title: "合格ラインの目安",
    children: "到達水準・達成条件の明示に使う。",
  },
};

// ─── ドメイン特化種別（7 種） ───

export const Exam: Story = {
  args: {
    type: "exam",
    title: "頻出：直近 5 年で 3 回出題",
    children:
      "本文中の出題頻度アクセント。ExamPoint（記事末尾総括）とは役割が異なる。",
  },
};

export const Formula: Story = {
  args: {
    type: "formula",
    title: "価値工学（VE）の基本公式",
    children: "V = F / C — 価値は機能をコストで割った比率。",
  },
};

export const Standard: Story = {
  args: {
    type: "standard",
    title: "JIS Z 8141 生産管理用語",
    children: "JIT: 必要なときに必要な量だけ生産・供給する方式。",
  },
};

export const Example: Story = {
  args: {
    type: "example",
    title: "R04 Ⅰ-1-3 の逆算",
    children: "FS₃ = 354, Y₂ = 340, α = 0.3 → FS₂ = 360。",
  },
};

export const Reference: Story = {
  args: {
    type: "reference",
    title: "参考文献",
    children: "ゴールドラット著『ザ・ゴール』（ダイヤモンド社、2001）",
  },
};

export const Faq: Story = {
  args: {
    type: "faq",
    title: "Q: αと k の違いは？",
    children:
      "A: αは指数平滑法の平滑化定数（0〜1）、k は移動平均法の次数（期間数）。",
  },
};

export const Quote: Story = {
  args: {
    type: "quote",
    title: "建設業法 第 1 条",
    children:
      "この法律は、建設業を営む者の資質の向上、建設工事の請負契約の適正化等を図ることを目的とする。",
  },
};

// ─── 追加バリエーション ───

export const WithoutTitle: Story = {
  args: {
    type: "note",
    children: "タイトルなし。アイコン + 色だけのミニマル表示。",
  },
  parameters: {
    docs: {
      description: {
        story: "タイトルを省略した場合はアイコン + 色 + 本文のみで表示される",
      },
    },
  },
};

export const LongText: Story = {
  args: {
    type: "warn",
    title: "長文 Callout の例",
    children: `これは非常に長いテキストの Callout です。複数の段落にわたる場合や詳細な説明を含む場合の表示を確認するためのサンプルです。

このように複数行にわたるテキストでも適切に表示されることを確認します。改行や段落も含めて、読みやすいレイアウトが保たれているかをチェックしましょう。

長いテキストの場合でも、適切な余白とタイポグラフィが維持されることが重要です。`,
  },
};

export const WithList: Story = {
  args: {
    type: "tip",
    title: "チェックリスト",
    children: (
      <>
        <p>以下のポイントに注意する：</p>
        <ul>
          <li>太字は 30 字以下に絞る</li>
          <li>Callout は 1 記事 3 個以内</li>
          <li>絵文字は使わない</li>
          <li>参考資料は WebFetch で実在確認する</li>
        </ul>
      </>
    ),
  },
};

export const AllTypes: Story = {
  render: () => (
    <div className="space-y-4">
      <Callout type="note" title="note（メモ）">
        事実の強調・補足情報
      </Callout>
      <Callout type="tip" title="tip（ポイント）">
        学習コツ・覚え方のヒント
      </Callout>
      <Callout type="warn" title="warn（注意）">
        行動への警告・頻出引っかけ
      </Callout>
      <Callout type="danger" title="danger（重大リスク）">
        致命的な誤解・重大な誤答
      </Callout>
      <Callout type="success" title="success（合格ライン）">
        到達水準・達成条件の明示
      </Callout>
      <Callout type="exam" title="exam（出題頻度）">
        本文中の出題頻度アクセント
      </Callout>
      <Callout type="formula" title="formula（公式）">
        公式・計算原理
      </Callout>
      <Callout type="standard" title="standard（基準・規格）">
        JIS / ISO / 法令条文
      </Callout>
      <Callout type="example" title="example（実例）">
        具体的な計算例・事例
      </Callout>
      <Callout type="reference" title="reference（参考文献）">
        書籍・論文・URL への誘導
      </Callout>
      <Callout type="faq" title="faq（よくある質問）">
        Q&A 形式の補足
      </Callout>
      <Callout type="quote" title="quote（引用）">
        原典文献の直接引用
      </Callout>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "全 12 種の Callout を一覧表示。デザインの統一感を確認する用",
      },
    },
  },
};
