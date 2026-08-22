import type { Metadata } from "next";

const SITE_URL = "https://doboku-note.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-default.png`;
const DEFAULT_OG_ALT = "doboku-note - 土木系資格試験 専門技術ノート";
const META_DESCRIPTION_MAX = 160;

/** 検索スニペット用の description を意味の切れ目で 160 字以内に収める。 */
export function normalizeMetaDescription(description: string): string {
  const compact = description.replace(/\s+/g, " ").trim();
  if (compact.length <= META_DESCRIPTION_MAX) return compact;

  const limit = META_DESCRIPTION_MAX - 1;
  const prefix = compact.slice(0, limit);
  const sentenceEnd = Math.max(prefix.lastIndexOf("。"), prefix.lastIndexOf("！"), prefix.lastIndexOf("？"));
  if (sentenceEnd >= 80) return prefix.slice(0, sentenceEnd + 1);
  return `${prefix.trimEnd()}…`;
}

/**
 * ページ自己参照メタデータの生成ヘルパー。
 *
 * self canonical と self og:url を必ず同一 path で対にして生成し、
 * root レイアウトのメタデータ継承事故（子が canonical/og:url を省略すると
 * root の homepage 値を継承してしまう）を構造的に防ぐ。root（getCommonSeoData）は
 * canonical/og:url を持たない設計なので、各ページはこのヘルパー（または同等の
 * 明示指定）で必ず自己 URL を設定する。
 *
 * @param path 先頭スラッシュ付きの自己パス（例 "/about"）。canonical と og:url に共通使用。
 *             metadataBase（https://doboku-note.com）に対して絶対 URL へ解決される。
 * @param absoluteTitle true のとき title テンプレート（"%s | doboku-note"）を回避する。
 */
export function buildPageMetadata({
  title,
  description,
  path,
  noindex = false,
  absoluteTitle = false,
}: {
  title: string;
  description?: string;
  path: string;
  noindex?: boolean;
  absoluteTitle?: boolean;
}): Metadata {
  const normalizedDescription = description !== undefined ? normalizeMetaDescription(description) : undefined;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    ...(normalizedDescription !== undefined ? { description: normalizedDescription } : {}),
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    alternates: { canonical: path },
    openGraph: {
      url: path,
      title,
      ...(normalizedDescription !== undefined ? { description: normalizedDescription } : {}),
      images: [
        { url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: DEFAULT_OG_ALT },
      ],
    },
  };
}

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
  // canonical は root に置かない（子ページが省略すると homepage canonical を継承する
  // 事故構造になるため）。各ページが buildPageMetadata 等で自己 canonical を明示する。
  // ホーム自身の canonical は src/app/page.tsx が設定する。
  alternates: {
    types: {
      "application/rss+xml": [
        { url: "/feed.xml", title: "doboku-note RSS フィード" },
      ],
      "application/atom+xml": [
        { url: "/atom.xml", title: "doboku-note Atom フィード" },
      ],
    },
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
    // og:url も root に置かない（canonical と同じ継承事故を避ける）。各ページが自己 og:url を明示。
    title: "doboku-note - 土木系資格試験 専門技術ノート",
    description:
      "1級土木施工管理技士・技術士（総合技術監理部門）の試験対策サイト。体系的な技術解説と過去問で合格をサポート。",
    siteName: "doboku-note",
    images: [{
      url: "https://doboku-note.com/images/og-default.png",
      width: 1200,
      height: 630,
      alt: "doboku-note - 土木系資格試験 専門技術ノート",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "doboku-note - 土木系資格試験 専門技術ノート",
    description:
      "1級土木施工管理技士・技術士（総合技術監理部門）の試験対策サイト。体系的な技術解説と過去問で合格をサポート。",
    images: ["https://doboku-note.com/images/og-default.png"],
  },
  // GSC所有権確認はDNS認証で完了済み
});
