import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SpecSheetList from "./SpecSheetList";

const meta: Meta<typeof SpecSheetList> = {
  title: "UI/SpecSheetList",
  component: SpecSheetList,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "土木ノート仕様書調のリストコンポーネント。ordered / unordered 両対応。design system tokens に準拠。",
      },
    },
  },
  argTypes: {
    title: { description: "リストのタイトル", control: "text" },
    items: { description: "リストアイテムの配列", control: "object" },
    ordered: {
      description: "true = <ol> 連番、false = <ul> マーカー",
      control: "boolean",
    },
    marker: {
      description: "unordered 時のマーカー形状",
      control: "select",
      options: ["dot", "dash", "square"],
    },
    className: { description: "追加のCSSクラス", control: "text" },
  },
  decorators: [(Story) => <div className="max-w-2xl">{/* @ts-expect-error - React 19 types compatibility in storybook decoration */}<Story /></div>],
};

export default meta;
type Story = StoryObj<typeof meta>;

const INSPECTION_ITEMS = [
  "ひび割れの発生状況と進展傾向の把握",
  "中性化深さとかぶり厚さの測定",
  "鉄筋腐食に起因する錆汁・剥離の確認",
  "塩化物イオン量の分析と劣化予測",
  "漏水・遊離石灰の析出痕跡の記録",
];

const SAFETY_ITEMS = [
  "重機稼働範囲内での作業員立入禁止",
  "高所作業における墜落防止措置の徹底",
  "掘削法面の安定勾配と土留め工の設置",
];

export const Ordered: Story = {
  args: {
    title: "コンクリート構造物の維持管理における点検項目",
    items: INSPECTION_ITEMS,
    ordered: true,
  },
};

export const UnorderedDot: Story = {
  args: {
    title: "施工時の安全確保に関する留意事項",
    items: SAFETY_ITEMS,
    ordered: false,
    marker: "dot",
  },
};

export const UnorderedDash: Story = {
  args: {
    title: "施工時の安全確保に関する留意事項",
    items: SAFETY_ITEMS,
    ordered: false,
    marker: "dash",
  },
};

export const UnorderedSquare: Story = {
  args: {
    title: "施工時の安全確保に関する留意事項",
    items: SAFETY_ITEMS,
    ordered: false,
    marker: "square",
  },
};

export const NoTitle: Story = {
  args: {
    items: INSPECTION_ITEMS,
    ordered: true,
  },
};
