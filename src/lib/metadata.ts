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
    url: "https://doboku-note.com",
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

