import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import CategoryHeader from "./CategoryHeader";

const meta: Meta<typeof CategoryHeader> = {
  title: "UI/CategoryHeader",
  component: CategoryHeader,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["shigodeki", "ikeoji"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Shigodeki: Story = {
  args: {
    title: "シゴデキ",
    subtitle: "仕事・資産形成・ライフスタイル最適化",
    icon: (
      <svg
        className="w-10 h-10 md:w-12 md:h-12 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    variant: "shigodeki",
  },
};

export const Ikeoji: Story = {
  args: {
    title: "イケオジ",
    subtitle: "40代からの外見・内面磨き",
    icon: (
      <svg
        className="w-10 h-10 text-primary-600 dark:text-primary-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    ),
    variant: "ikeoji",
  },
};

export const Custom: Story = {
  args: {
    title: "カスタムカテゴリ",
    subtitle: "カスタムサブタイトル",
    icon: (
      <svg
        className="w-10 h-10 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
    variant: "shigodeki",
  },
};
