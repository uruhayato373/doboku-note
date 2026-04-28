import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SeeAlso from "./SeeAlso";

const meta = {
  title: "UI/SeeAlso",
  component: SeeAlso,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "本文中で「別ページに集約された論点」を強調誘導する内部リンク専用カード。Callout の 1 記事 3 個ルールから独立。1 記事に 5 個以内を目安に使う。",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    href: { description: "遷移先（内部 URL）", control: "text" },
    title: { description: "誘導先ページのタイトル", control: "text" },
    reason: { description: "なぜ読むべきか（1〜2 行）", control: "text" },
  },
} satisfies Meta<typeof SeeAlso>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithReason: Story = {
  args: {
    href: "/docs/pe-comprehensive-management-management-tradeoffs",
    title: "5 管理間トレードオフ 頻出パターンと解決フレーム",
    reason:
      "5 管理の交差点で起こる調整パターンを、出題頻度・解答テンプレ込みで一箇所に集約している。",
  },
};

export const TitleOnly: Story = {
  args: {
    href: "/docs/pe-comprehensive-management-essay-exam-strategy",
    title: "記述式試験の解答戦略",
  },
};
