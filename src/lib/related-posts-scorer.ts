import type { Post } from "@/types/blog";

export interface PostWithScore {
  post: Post;
  score: number;
}

/**
 * 記事の関連性スコアを計算する
 * @param currentPost 現在の記事
 * @param otherPost 比較対象の記事
 * @returns 関連性スコア
 */
export function calculateRelatedScore(
  currentPost: Post,
  otherPost: Post
): number {
  let score = 0;

  // 同じカテゴリ: +3点
  if (otherPost.category === currentPost.category) {
    score += 3;
  }

  // 同じサブカテゴリ: +2点
  if (otherPost.subCategory === currentPost.subCategory) {
    score += 2;
  }

  // 共通のタグ: 1つにつき+1点
  const commonTags = otherPost.tags.filter((tag) =>
    currentPost.tags.includes(tag)
  );
  score += commonTags.length;

  // 日付が近い: 1ヶ月以内なら+1点
  const currentDate = new Date(currentPost.date);
  const postDate = new Date(otherPost.date);
  const monthDiff =
    Math.abs(currentDate.getTime() - postDate.getTime()) /
    (1000 * 60 * 60 * 24 * 30);
  if (monthDiff <= 1) {
    score += 1;
  }

  return score;
}

/**
 * 記事一覧から関連記事を抽出してスコア順にソートする
 * @param currentPost 現在の記事
 * @param allPosts 全記事の配列
 * @param maxPosts 取得する最大記事数
 * @returns 関連記事の配列（スコア順）
 */
export function getRelatedPosts(
  currentPost: Post,
  allPosts: Post[],
  maxPosts: number = 5
): Post[] {
  // 現在の記事を除外
  const otherPosts = allPosts.filter((post) => post.id !== currentPost.id);

  // 関連性スコアを計算
  const postsWithScore: PostWithScore[] = otherPosts.map((post) => ({
    post,
    score: calculateRelatedScore(currentPost, post),
  }));

  // スコア順にソートして上位の記事を取得
  return postsWithScore
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPosts)
    .map((item) => item.post);
}

/**
 * 記事の関連性を分析して詳細なスコア情報を返す
 * @param currentPost 現在の記事
 * @param otherPost 比較対象の記事
 * @returns 詳細なスコア分析結果
 */
export function analyzeRelatedScore(
  currentPost: Post,
  otherPost: Post
): {
  totalScore: number;
  categoryScore: number;
  subCategoryScore: number;
  tagScore: number;
  dateScore: number;
  commonTags: string[];
} {
  const categoryScore = otherPost.category === currentPost.category ? 3 : 0;
  const subCategoryScore =
    otherPost.subCategory === currentPost.subCategory ? 2 : 0;

  const commonTags = otherPost.tags.filter((tag) =>
    currentPost.tags.includes(tag)
  );
  const tagScore = commonTags.length;

  const currentDate = new Date(currentPost.date);
  const postDate = new Date(otherPost.date);
  const monthDiff =
    Math.abs(currentDate.getTime() - postDate.getTime()) /
    (1000 * 60 * 60 * 24 * 30);
  const dateScore = monthDiff <= 1 ? 1 : 0;

  const totalScore = categoryScore + subCategoryScore + tagScore + dateScore;

  return {
    totalScore,
    categoryScore,
    subCategoryScore,
    tagScore,
    dateScore,
    commonTags,
  };
}
