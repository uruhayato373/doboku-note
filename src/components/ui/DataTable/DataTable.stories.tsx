import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import DataTable from './DataTable';

const meta: Meta<typeof DataTable> = {
  title: 'UI/DataTable',
  component: DataTable,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: '汎用的なデータテーブルコンポーネント。様々なデータ構造とデザインパターンに対応し、再利用可能です。'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    theme: {
      control: { type: 'select' },
      options: ['default', 'dark', 'minimal'],
      description: 'テーブルのテーマスタイル'
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
      description: 'テーブルのサイズ'
    },

    title: {
      control: { type: 'text' },
      description: 'テーブルのタイトル'
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

// 基本的な使用例
export const Basic: Story = {
  args: {
    data: [
      { name: '田中太郎', age: 30, department: '営業部', isTotal: false },
      { name: '佐藤花子', age: 25, department: '開発部', isTotal: false },
      { name: '鈴木一郎', age: 35, department: '営業部', isTotal: false },
      { name: '合計', age: 90, department: '3名', isTotal: true }
    ],
    columns: [
      { key: 'name', label: '名前', align: 'left' },
      { key: 'age', label: '年齢', align: 'center' },
      { key: 'department', label: '部署', align: 'left' }
    ],
    title: '社員一覧'
  },
};

// 不動産費用テーブル
export const RealEstateCosts: Story = {
  args: {
    data: [
      { item: "頭金（10%）", amount: "200万円", note: "融資率90%の場合", isTotal: false },
      { item: "仲介手数料", amount: "66万円", note: "(2,000万円×3%+6万円)×1.1", isTotal: false },
      { item: "登記費用", amount: "20万円", note: "司法書士報酬含む", isTotal: false },
      { item: "合計", amount: "286万円", note: "物件価格の約14.3%", isTotal: true }
    ],
    columns: [
      { key: 'item', label: '項目', align: 'left' },
      { key: 'amount', label: '金額', align: 'right' },
      { key: 'note', label: '備考', align: 'left' }
    ],
    title: '不動産購入時の諸費用'
  },
};

// 商品一覧テーブル
export const ProductList: Story = {
  args: {
    data: [
      { product: 'ノートPC', price: '150,000円', stock: 50, category: '電化製品', isTotal: false },
      { product: 'スマートフォン', price: '80,000円', stock: 100, category: '電化製品', isTotal: false },
      { product: 'ヘッドフォン', price: '25,000円', stock: 200, category: 'アクセサリー', isTotal: false },
      { product: '合計', price: '255,000円', stock: 350, category: '3商品', isTotal: true }
    ],
    columns: [
      { key: 'product', label: '商品名', align: 'left' },
      { key: 'price', label: '価格', align: 'right' },
      { key: 'stock', label: '在庫', align: 'center' },
      { key: 'category', label: 'カテゴリ', align: 'left' }
    ],
    title: '商品在庫一覧',
    size: 'large'
  },
};

// ダークテーマ
export const DarkTheme: Story = {
  args: {
    data: [
      { name: '田中太郎', age: 30, department: '営業部', isTotal: false },
      { name: '佐藤花子', age: 25, department: '開発部', isTotal: false },
      { name: '合計', age: 55, department: '2名', isTotal: true }
    ],
    columns: [
      { key: 'name', label: '名前', align: 'left' },
      { key: 'age', label: '年齢', align: 'center' },
      { key: 'department', label: '部署', align: 'left' }
    ],
    title: '社員一覧（ダークテーマ）',
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
    data: [
      { name: '田中太郎', age: 30, department: '営業部', isTotal: false },
      { name: '佐藤花子', age: 25, department: '開発部', isTotal: false },
      { name: '合計', age: 55, department: '2名', isTotal: true }
    ],
    columns: [
      { key: 'name', label: '名前', align: 'left' },
      { key: 'age', label: '年齢', align: 'center' },
      { key: 'department', label: '部署', align: 'left' }
    ],
    title: '社員一覧（ミニマル）',
    theme: 'minimal'
  },
};

// 小サイズ
export const SmallSize: Story = {
  args: {
    data: [
      { name: '田中太郎', age: 30, isTotal: false },
      { name: '佐藤花子', age: 25, isTotal: false },
      { name: '合計', age: 55, isTotal: true }
    ],
    columns: [
      { key: 'name', label: '名前', align: 'left' },
      { key: 'age', label: '年齢', align: 'center' }
    ],
    title: '社員一覧（小サイズ）',
    size: 'small'
  },
};

// 大サイズ
export const LargeSize: Story = {
  args: {
    data: [
      { name: '田中太郎', age: 30, department: '営業部', isTotal: false },
      { name: '佐藤花子', age: 25, department: '開発部', isTotal: false },
      { name: '合計', age: 55, department: '2名', isTotal: true }
    ],
    columns: [
      { key: 'name', label: '名前', align: 'left' },
      { key: 'age', label: '年齢', align: 'center' },
      { key: 'department', label: '部署', align: 'left' }
    ],
    title: '社員一覧（大サイズ）',
    size: 'large'
  },
};

// シンプルな表示
export const SimpleDisplay: Story = {
  args: {
    data: [
      { name: '田中太郎', age: 30, department: '営業部', isTotal: false },
      { name: '佐藤花子', age: 25, department: '開発部', isTotal: false },
      { name: '合計', age: 55, department: '2名', isTotal: true }
    ],
    columns: [
      { key: 'name', label: '名前', align: 'left' },
      { key: 'age', label: '年齢', align: 'center' },
      { key: 'department', label: '部署', align: 'left' }
    ],
    title: '社員一覧（シンプル表示）'
  },
};

// カスタム合計行キー
export const CustomTotalKey: Story = {
  args: {
    data: [
      { name: '田中太郎', age: 30, department: '営業部', isSummary: false },
      { name: '佐藤花子', age: 25, department: '開発部', isSummary: false },
      { name: '合計', age: 55, department: '2名', isSummary: true }
    ],
    columns: [
      { key: 'name', label: '名前', align: 'left' },
      { key: 'age', label: '年齢', align: 'center' },
      { key: 'department', label: '部署', align: 'left' }
    ],
    title: '社員一覧（カスタム合計キー）',
    totalRowKey: 'isSummary'
  },
}; 