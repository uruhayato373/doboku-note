import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import ArticleHeader from './ArticleHeader';

describe('ArticleHeader', () => {
  const mockProps = {
    post: {
      id: 'test-post',
      title: '公務員のためのタスク管理入門',
      description: 'GTDメソッドで仕事を効率化しよう',
      content: 'これはテスト用の記事内容です。'.repeat(100), // 読了時間計算用
      date: '2024-01-01',
      category: 'シゴデキ' as const,
      subCategory: '仕事効率化' as const,
      tags: ['タスク管理', 'GTD', '効率化'],
      isPremium: false,
      readTime: '5分',
      headings: [
        { id: 'heading-1', text: 'はじめに', level: 2 },
        { id: 'heading-2', text: 'GTDとは', level: 2 },
      ],
    },
    imageSizes: {
      ogp: '/images/ogp/test-post.png',
    },
  };

  it('記事のタイトルが表示される', () => {
    render(<ArticleHeader {...mockProps} />);
    expect(screen.getByText('公務員のためのタスク管理入門')).toBeInTheDocument();
  });

  it('カテゴリバッジが表示される', () => {
    render(<ArticleHeader {...mockProps} />);
    expect(screen.getByText('シゴデキ')).toBeInTheDocument();
  });

  it('サブカテゴリが表示される', () => {
    render(<ArticleHeader {...mockProps} />);
    expect(screen.getByText('/ 仕事効率化')).toBeInTheDocument();
  });

  it('日付が正しくフォーマットされて表示される', () => {
    render(<ArticleHeader {...mockProps} />);
    expect(screen.getByText('2024年1月1日')).toBeInTheDocument();
  });

  it('読了時間が計算されて表示される', () => {
    render(<ArticleHeader {...mockProps} />);
    expect(screen.getByText(/読了時間: \d+分/)).toBeInTheDocument();
  });

  it('サムネイル画像が表示される', () => {
    render(<ArticleHeader {...mockProps} />);
    const image = screen.getByAltText('公務員のためのタスク管理入門');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/images/ogp/test-post.png');
  });

  it('カテゴリリンクが正しいURLを持つ', () => {
    render(<ArticleHeader {...mockProps} />);
    const categoryLink = screen.getByRole('link', { name: 'シゴデキ' });
    expect(categoryLink).toHaveAttribute('href', '/category/shigodeki');
  });

  it('イケオジカテゴリの場合、青系のスタイルが適用される', () => {
    const ikeojiProps = {
      ...mockProps,
      post: {
        ...mockProps.post,
        category: 'イケオジ' as const,
        subCategory: '美容・服装' as const,
      },
    };
    render(<ArticleHeader {...ikeojiProps} />);
    
    const categoryLink = screen.getByRole('link', { name: 'イケオジ' });
    expect(categoryLink).toHaveClass('bg-primary-500');
    expect(categoryLink).toHaveAttribute('href', '/category/ikeoji');
  });

  it('長いタイトルが適切に表示される', () => {
    const longTitleProps = {
      ...mockProps,
      post: {
        ...mockProps.post,
        title: 'これは非常に長い記事タイトルで、複数行にわたって表示される可能性があります。実際の記事ではこのような長いタイトルも適切に処理されます。',
      },
    };
    render(<ArticleHeader {...longTitleProps} />);
    expect(screen.getByText(longTitleProps.post.title)).toBeInTheDocument();
  });
}); 