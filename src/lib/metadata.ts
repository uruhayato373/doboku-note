import type { Post } from "@/types/blog";

import { getOgpImageUrl } from "./r2-image-loader";
import tags from "@/config/tags.json";

const getSlugByName = (name: string) => {
  const tagInfo = tags.find((t) => t.name === name);
  return tagInfo ? tagInfo.slug : name;
};

export const getCommonSeoData = () => ({
  title: {
    default: "doboku-note - 土木系資格試験 専門技術ノート",
    template: "%s | doboku-note",
  },
  description:
    "1級土木施工管理技士・技術士（総合技術監理部門）の試験対策サイト。体系的な技術解説と過去問で合格をサポート。",
  keywords: [
    "1級土木施工管理技士",
    "技術士",
    "総合技術監理部門",
    "土木施工管理",
    "試験対策",
    "過去問",
    "土木一般",
    "施工管理",
    "建設部門",
  ],
  authors: [{ name: "doboku-note" }],
  creator: "doboku-note",
  publisher: "doboku-note",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://doboku-note.com"),
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
    url: "https://doboku-note.com",
    title: "doboku-note - 土木系資格試験 専門技術ノート",
    description:
      "1級土木施工管理技士・技術士（総合技術監理部門）の試験対策サイト。体系的な技術解説と過去問で合格をサポート。",
    siteName: "doboku-note",
  },
  twitter: {
    card: "summary",
    title: "doboku-note - 土木系資格試験 専門技術ノート",
    description:
      "1級土木施工管理技士・技術士（総合技術監理部門）の試験対策サイト。体系的な技術解説と過去問で合格をサポート。",
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
    url: `https://doboku-note.com/blog/${post.id}`,
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
    url: `https://doboku-note.com/tags/${getSlugByName(tag)}`,
  },
  twitter: {
    card: "summary_large_image",
    title: `#${tag} の記事一覧`,
    description: `タグ「${tag}」に関する記事一覧です。`,
  },
});

