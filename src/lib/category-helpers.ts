import categories from "@/config/categories.json";
import type { Post } from "@/types/blog";

export function getCategorySeoData(categoryId: string) {
  const categoryData = categories[categoryId as keyof typeof categories];
  const categoryName = categoryId === "イケオジ" ? "イケオジ" : "シゴデキ";
  const description =
    categoryId === "イケオジ"
      ? "40代からの外見・内面磨き"
      : "仕事・資産形成・ライフスタイル最適化";

  return {
    title: categoryName,
    description: description,
    keywords: [categoryName, ...categoryData.subCategories],
  };
}

export function categorizeIkeojiPosts(posts: Post[]) {
  return posts.reduce((acc, post) => {
    const category = post.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(post);
    return acc;
  }, {} as Record<string, Post[]>);
}

export function getIkeojiSubCategoryConfig() {
  return {
    "美容・健康": {
      title: "美容・健康",
      description: "40代からのメンズ美容とヘルスケア",
      icon: "💪",
    },
    ファッション: {
      title: "ファッション",
      description: "40代に似合うファッションとコーディネート",
      icon: "👔",
    },
    ライフスタイル: {
      title: "ライフスタイル",
      description: "40代からの充実した生活設計",
      icon: "🌟",
    },
  };
}
