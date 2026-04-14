// 著者プロフィール（サイト全体で共有）
//
// E-A-T（Expertise / Authoritativeness / Trustworthiness）対応のため、
// About ページ・記事末尾・Article schema など複数箇所で参照される。
// 仮の名称・経歴で運用を開始し、運営者が後から実名・実経歴に差し替える前提。

export const AUTHOR = {
  name: "土木ノート編集部",
  penName: "土木ノート編集部",
  url: "https://doboku-note.com/about",
  jobTitle: "土木技術者・技術士総合技術監理部門 受験者",
  bio: "1級土木施工管理技士。建設会社で約10年の現場・施工管理経験を経て、技術士総合技術監理部門の取得を目指し学習中。実務で得た知見と試験対策ノートを本サイトで共有。",
  qualifications: [
    "1級土木施工管理技士",
    "技術士補",
    "技術士総合技術監理部門 受験予定（2026年度）",
  ],
  knowsAbout: [
    "1級土木施工管理技士",
    "技術士総合技術監理部門",
    "施工管理",
    "コンクリート",
    "土工",
    "安全管理",
  ],
  imageUrl: "/img/author-placeholder.svg",
  twitterUrl: "https://twitter.com/doboku_note",
} as const;
