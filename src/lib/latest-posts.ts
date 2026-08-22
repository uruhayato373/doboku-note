import type { Post } from "@/types/blog";

/**
 * 最新記事を取得するユーティリティ関数
 * @param allPosts 全記事の配列
 * @param currentPostId 現在の記事ID（除外する記事）
 * @param limit 取得する記事数（デフォルト: 5）
 * @returns 最新記事の配列
 */
export function getLatestPosts(
  allPosts: Post[],
  currentPostId?: string,
  limit: number = 5
): Post[] {
  return allPosts
    .filter((post) => post.id !== currentPostId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

/**
 * 最新記事が存在するかチェック
 * @param allPosts 全記事の配列
 * @param currentPostId 現在の記事ID（除外する記事）
 * @returns 最新記事が存在するかどうか
 */
export function hasLatestPosts(
  allPosts: Post[],
  currentPostId?: string
): boolean {
  return getLatestPosts(allPosts, currentPostId, 1).length > 0;
}
