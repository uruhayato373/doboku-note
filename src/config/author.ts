// 著者プロフィール（サイト全体で共有）
//
// E-E-A-T（Experience / Expertise / Authoritativeness / Trustworthiness）対応のため、
// About ページ・記事末尾・Article schema など複数箇所で参照される。

export const AUTHOR = {
  name: "架（かける）",
  penName: "架（かける）",
  url: "https://doboku-note.com/about",
  jobTitle: "元・地方自治体 土木職（発注者）／技術士（建設部門・総合技術監理部門）",
  // フル版 bio（/about ページ・Article schema 用）
  bio: "地方自治体の土木職（発注者）として、道路・河川等の公共インフラの計画・設計・発注・工事監督・維持管理を横断的に担い退職。在職中から退職後にかけて、1級土木施工管理技士・1級舗装施工管理技術者・コンクリート主任技士・コンクリート診断士・技術士（建設部門）・技術士（総合技術監理部門）を取得。ペンネーム「架（かける）」には、橋を架けるように、受験者と合格・実務と試験・現役と次世代のあいだに橋渡しをするというコンセプトを込めている。発注者として培った「事業全体を俯瞰し、経済性・安全・人的資源・情報・社会環境の5管理を統合する」視点を、これから受験に向かう技術者へ架け渡していく。",
  // 短縮版 bio（記事末尾 AuthorCard 用・92 字）
  shortBio:
    "元・地方自治体土木職（発注者）。技術士（建設部門・総合技術監理部門）・1 級土木・1 級舗装・コンクリート主任技士／診断士を取得。発注者視点で土木系資格受験者の合格を支援。",
  qualifications: [
    "1級土木施工管理技士",
    "2級土木施工管理技士",
    "技術士（建設部門）",
    "技術士（総合技術監理部門）",
    "コンクリート主任技士",
    "コンクリート診断士",
    "1級舗装施工管理技術者",
    "行政書士",
    "応用情報技術者",
    "基本情報技術者",
  ],
  knowsAbout: [
    "1級土木施工管理技士",
    "2級土木施工管理技士",
    "技術士 建設部門",
    "技術士 総合技術監理部門",
    "コンクリート主任技士",
    "コンクリート診断士",
    "1級舗装施工管理技術者",
    "行政書士",
    "応用情報技術者",
    "基本情報技術者",
    "施工管理",
    "コンクリート工学",
    "舗装工学",
    "土工",
    "安全管理",
    "建設法務",
  ],
  imageUrl: "/img/author-avatar.png",
  twitterUrl: "https://x.com/dobokunotecom",
  // note アカウント固定記事「【はじめての方へ】技術士総監・R08 合格のための note ロードマップ」
  // 各記事末尾の AuthorCard からの送客動線として参照される（UTM 付き）
  noteUrl:
    "https://note.com/dobokunote/n/n3d73729e6cc7?utm_source=site&utm_medium=author-card&utm_campaign=profile-fixed-roadmap",
  noteLabel: "note で総監 R08 対策の続編を発信中",
  // AuthorCard の note 送客先をカテゴリ別に出し分ける（旧: 全資格で総監ロードマップ固定だった）。
  // 該当の無いカテゴリ（civil/concrete 等・L2 もくじ未構築）は noteDefault（L1 全資格案内）へ。
  noteByCategory: {
    "pe-comprehensive-management": {
      noteUrl:
        "https://note.com/dobokunote/n/n3d73729e6cc7?utm_source=site&utm_medium=author-card&utm_campaign=author-tankan-roadmap",
      noteLabel: "note で総監 R08 対策の続編を発信中",
    },
    "pe-construction": {
      noteUrl:
        "https://note.com/dobokunote/n/n7279ca0d926f?utm_source=site&utm_medium=author-card&utm_campaign=author-pe-construction-mokuji",
      noteLabel: "note で建設部門 二次対策を発信中",
    },
  },
  noteDefault: {
    noteUrl:
      "https://note.com/dobokunote/n/n296a88f64ac2?utm_source=site&utm_medium=author-card&utm_campaign=author-l1-sitemap",
    noteLabel: "note で土木系資格の対策を発信中",
  },
} as const;
