import type { Post } from "@/types/blog";

import { getCategorySeoData } from "./category-helpers";
import { getOgpImageUrl } from "./r2-image-loader";
import tags from "@/config/tags.json";

const getSlugByName = (name: string) => {
  const tagInfo = tags.find((t) => t.name === name);
  return tagInfo ? tagInfo.slug : name;
};

export const getCommonSeoData = () => ({
  title: {
    default: "カッコム - カッコいい公務員を目指して",
    template: "%s | カッコム",
  },
  description:
    "40代公務員の、もう一歩先へ。シゴデキ（仕事・資産形成・ライフスタイル最適化）とイケオジ（40代からの外見・内面磨き）の2つのカテゴリで情報発信。",
  keywords: [
    "公務員",
    "ライフスタイル",
    "40代",
    "シゴデキ",
    "イケオジ",
    "ファッション",
    "スキンケア",
    "副業",
    "投資",
    "キャリア",
  ],
  authors: [{ name: "カズ（KAZU）" }],
  creator: "カズ（KAZU）",
  publisher: "カズ（KAZU）",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://kakkom.com"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large" as const,
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://kakkom.com",
    title: "カッコム - カッコいい公務員を目指して",
    description:
      "40代公務員の、もう一歩先へ。シゴデキ（仕事・資産形成・ライフスタイル最適化）とイケオジ（40代からの外見・内面磨き）の2つのカテゴリで情報発信。",
    siteName: "カッコム",
    images: [
      {
        url: "https://kakkom.com/ogp/home.jpg",
        width: 1200,
        height: 630,
        alt: "カッコム - カッコいい公務員を目指して",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "カッコム - カッコいい公務員を目指して",
    description:
      "40代公務員の、もう一歩先へ。シゴデキ（仕事・資産形成・ライフスタイル最適化）とイケオジ（40代からの外見・内面磨き）の2つのカテゴリで情報発信。",
    images: ["https://kakkom.com/ogp/home.jpg"],
  },
  // GSC所有権確認はDNS認証で完了済み
});

export const getPostSeoData = (post: Post) => ({
  title: post.title,
  description: post.description,
  keywords: post.tags,
  openGraph: {
    title: post.title,
    description: post.description,
    type: "article",
    publishedTime: new Date(post.date).toISOString(),
    url: `https://kakkom.com/blog/${post.id}`,
    images: [
      {
        url: getOgpImageUrl(post.id),
        width: 1200,
        height: 630,
        alt: post.title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: post.title,
    description: post.description,
    images: [getOgpImageUrl(post.id)],
  },
});

export const getTagSeoData = (tag: string) => ({
  title: `#${tag} の記事一覧`,
  description: `タグ「${tag}」に関する記事一覧です。`,
  keywords: [tag, "タグ", "記事一覧"],
  openGraph: {
    title: `#${tag} の記事一覧`,
    description: `タグ「${tag}」に関する記事一覧です。`,
    url: `https://kakkom.com/tags/${getSlugByName(tag)}`,
  },
  twitter: {
    card: "summary_large_image",
    title: `#${tag} の記事一覧`,
    description: `タグ「${tag}」に関する記事一覧です。`,
  },
});

export const getCategoryPageSeoData = (category: { id: string }) => {
  const categorySeoData = getCategorySeoData(category.id);
  return {
    title: categorySeoData.title,
    description: categorySeoData.description,
    keywords: categorySeoData.keywords,
    openGraph: {
      title: categorySeoData.title,
      description: categorySeoData.description,
      url: `https://kakkom.com/category/${category.id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: categorySeoData.title,
      description: categorySeoData.description,
    },
  };
};
