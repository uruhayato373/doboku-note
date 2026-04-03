import { getAllPosts } from "./mdx";

export interface BuildTimeData {
  totalPosts: number;
  categoryStats: Record<string, number>;
  tagStats: Record<string, number>;
  popularPosts: string[];
  latestPosts: string[];
  categoryPosts: Record<string, string[]>;
  tagPosts: Record<string, string[]>;
}

/**
 * ビルド時に必要なデータを生成
 */
export function generateBuildTimeData(): BuildTimeData {
  const posts = getAllPosts();

  // カテゴリ別の統計
  const categoryStats = posts.reduce((acc, post) => {
    acc[post.category] = (acc[post.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // タグ別の統計
  const tagStats = posts.reduce((acc, post) => {
    post.tags?.forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  // 人気記事（将来的にビュー数ベース）
  const popularPosts = posts
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
    .map((post) => post.id);

  // 最新記事
  const latestPosts = posts
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
    .map((post) => post.id);

  // カテゴリ別記事ID
  const categoryPosts = posts.reduce((acc, post) => {
    const category = post.category || '未分類';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(post.id);
    return acc;
  }, {} as Record<string, string[]>);

  // タグ別記事ID
  const tagPosts = posts.reduce((acc, post) => {
    post.tags?.forEach((tag) => {
      if (!acc[tag]) {
        acc[tag] = [];
      }
      acc[tag].push(post.id);
    });
    return acc;
  }, {} as Record<string, string[]>);

  return {
    totalPosts: posts.length,
    categoryStats,
    tagStats,
    popularPosts,
    latestPosts,
    categoryPosts,
    tagPosts,
  };
}

/**
 * 特定のカテゴリの記事を取得
 */
export function getCategoryPosts(category: string) {
  const posts = getAllPosts();
  return posts.filter((post) => post.category === category);
}

/**
 * 特定のタグの記事を取得
 */
export function getTagPosts(tag: string) {
  const posts = getAllPosts();
  return posts.filter((post) => post.tags?.includes(tag));
}

/**
 * 関連記事を取得
 */
export function getRelatedPosts(currentPostId: string, maxPosts: number = 3) {
  const posts = getAllPosts();
  const currentPost = posts.find((post) => post.id === currentPostId);

  if (!currentPost) return [];

  // 同じカテゴリの記事を優先
  const sameCategoryPosts = posts
    .filter(
      (post) =>
        post.id !== currentPostId && post.category === currentPost.category
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 同じタグの記事
  const sameTagPosts = posts
    .filter(
      (post) =>
        post.id !== currentPostId &&
        post.tags?.some((tag) => currentPost.tags?.includes(tag))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 関連性の高い順に記事を選択
  const relatedPosts = [...sameCategoryPosts];

  // 同じカテゴリの記事が不足している場合は、同じタグの記事を追加
  if (relatedPosts.length < maxPosts) {
    const additionalPosts = sameTagPosts
      .filter((post) => !relatedPosts.some((rp) => rp.id === post.id))
      .slice(0, maxPosts - relatedPosts.length);
    relatedPosts.push(...additionalPosts);
  }

  // まだ不足している場合は、最新記事を追加
  if (relatedPosts.length < maxPosts) {
    const latestPosts = posts
      .filter(
        (post) =>
          post.id !== currentPostId &&
          !relatedPosts.some((rp) => rp.id === post.id)
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, maxPosts - relatedPosts.length);
    relatedPosts.push(...latestPosts);
  }

  return relatedPosts.slice(0, maxPosts);
}
