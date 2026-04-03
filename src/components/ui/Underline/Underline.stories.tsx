import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Underline from "./Underline";

const meta: Meta<typeof Underline> = {
  title: "UI/Underline",
  component: Underline,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    children: {
      control: { type: "text" },
      description: "アンダーラインを引くテキスト",
    },
    className: {
      control: { type: "text" },
      description: "追加のCSSクラス",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "デフォルトのアンダーライン",
  },
};

export const WithCustomClass: Story = {
  args: {
    children: "カスタムクラス付きアンダーライン",
    className: "text-lg font-bold",
  },
};

export const LongText: Story = {
  args: {
    children: "これは長いテキストの例で、アンダーラインがどのように表示されるかを確認できます。",
  },
};

export const MultipleWords: Story = {
  args: {
    children: "複数の単語を含むテキスト",
  },
};

export const WithEmoji: Story = {
  args: {
    children: "絵文字付きテキスト 🎉",
  },
};

export const JapaneseText: Story = {
  args: {
    children: "日本語テキストのアンダーライン表示",
  },
};
