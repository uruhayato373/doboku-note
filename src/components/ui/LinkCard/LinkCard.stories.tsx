import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import LinkCardClient from './LinkCardClient';

const meta = {
  title: 'UI/LinkCard',
  component: LinkCardClient,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'リンクを表示する横型カード。OGP 画像を左に本来比のまま（クロップせず）、右にタイトル・説明・サイト名を並べる。モバイルでは画像を上・テキストを下に積む。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    url: { description: 'リンク先のURL', control: 'text' },
    title: { description: 'リンクのタイトル', control: 'text' },
    description: { description: 'リンクの説明文', control: 'text' },
    imageUrl: { description: '表示する画像のURL（OGP）', control: 'text' },
    siteName: { description: 'サイト名', control: 'text' },
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl mx-auto p-6 bg-gray-50">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LinkCardClient>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleLink = {
  url: 'https://nextjs.org/',
  title: 'Next.js - The React Framework for Production',
  description:
    'Next.js gives you the best developer experience with all the features you need for production: hybrid static & server rendering, TypeScript support, smart bundling, route pre-fetching, and more.',
  imageUrl: 'https://nextjs.org/static/twitter-cards/home.jpg',
  siteName: 'nextjs.org',
};

// デフォルト（画像・タイトル・説明・サイト名すべてあり）
export const Default: Story = {
  args: { ...sampleLink },
  parameters: {
    docs: {
      description: {
        story: 'デフォルト。画像（本来比のまま）・タイトル・説明・サイト名が表示されます。',
      },
    },
  },
};

// 長いタイトル（2 行に line-clamp）
export const LongTitle: Story = {
  args: {
    ...sampleLink,
    title:
      'これは非常に長いタイトルのリンクカードです。複数行にわたる場合や、詳細な説明を含む場合の表示を確認するためのサンプルです。',
  },
  parameters: {
    docs: {
      description: { story: '長いタイトルは line-clamp-2 で 2 行に省略されます。' },
    },
  },
};

// 短い説明
export const ShortDescription: Story = {
  args: { ...sampleLink, description: 'A utility-first framework.' },
};

// 説明なし
export const NoDescription: Story = {
  args: { ...sampleLink, description: undefined },
  parameters: {
    docs: { description: { story: '説明文なし。説明エリアは表示されません。' } },
  },
};

// 画像なし（テキストのみ）
export const NoImage: Story = {
  args: { ...sampleLink, imageUrl: undefined },
  parameters: {
    docs: { description: { story: '画像なし。テキストのみのレイアウトになります。' } },
  },
};

// ダークモード
export const DarkMode: Story = {
  args: { ...sampleLink },
  parameters: { backgrounds: { default: 'dark' } },
  decorators: [
    (Story) => (
      <div className="max-w-3xl mx-auto p-6 bg-gray-900 dark">
        <Story />
      </div>
    ),
  ],
};
