import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// カスタムレンダラー（シンプル版）
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// モックデータ
export const mockPost = {
  id: 'test-post',
  title: 'テスト記事タイトル',
  description: 'これはテスト用の記事説明です。',
  content: 'これはテスト用の記事内容です。',
  date: '2024-01-01',
  category: 'シゴデキ',
  subCategory: '仕事効率化',
  tags: ['テスト', '効率化'],
  isPremium: false,
};

export const mockAllPosts = [
  mockPost,
  {
    ...mockPost,
    id: 'test-post-2',
    title: 'テスト記事2',
    category: 'イケオジ',
    subCategory: '美容・服装',
    tags: ['美容', 'スキンケア'],
  },
];

// カスタムレンダラーをエクスポート
export * from '@testing-library/react';
export { customRender as render }; 