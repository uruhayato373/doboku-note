// Shared mock data & helpers for About page designs.

const aboutAuthor = {
  name: "編集部 N",
  alias: "N. （ハンドルネーム）",
  title: "土木コンサルタント勤務 / 技術士・1級土木施工管理技士",
  bio: "建設コンサルタント勤務。河川・道路・橋梁の調査計画から設計・施工監理まで、土木構造物のライフサイクル全般に携わる。試験勉強と実務の往復で得た知見を、当ノートで体系的に整理・公開しています。",
  twitter: "@doboku_note",
  joinedYear: 2024,
  qualifications: [
    { label: "1級土木施工管理技士", year: 2018, type: "施工" },
    { label: "技術士（建設部門・道路）", year: 2020, type: "技術士" },
    { label: "技術士（総合技術監理部門）", year: 2022, type: "技術士" },
    { label: "コンクリート主任技士", year: 2017, type: "材料" },
    { label: "コンクリート診断士", year: 2019, type: "材料" },
    { label: "応用情報技術者", year: 2021, type: "IT" },
    { label: "行政書士", year: 2023, type: "法務" },
  ],
  examHistory: [
    { exam: "1級土木施工管理技士", year: "2018", result: "合格（1回目）" },
    { exam: "技術士 二次（建設）", year: "2020", result: "合格（1回目）" },
    { exam: "技術士 二次（総監）", year: "2022", result: "合格（2回目）" },
  ],
  principles: [
    "出題範囲を体系的に整理し、実務での適用例を必ず併記する",
    "公式試験機関の公表内容（過去問・正答）を一次情報として参照する",
    "誤りを発見した場合は X または問い合わせフォームから連絡を受け付け、可能な限り速やかに修正する",
    "キーワード解説は実務経験に基づく具体例を意識して執筆する",
  ],
  siteStats: {
    articles: 287,
    keywords: 412,
    visitors: "182K / 月",
    paidReaders: "3,200+",
    sinceMonths: 18,
  },
};

const personalReadingList = [
  { id: "r1", title: "コンクリート工学\n標準示方書 [施工編]", author: "土木学会", year: "2017", role: "1級土木 第1次 / 配合・施工の決定版", color: "gray" },
  { id: "r2", title: "1級土木\n第2次検定 経験記述\n合格論文集", author: "土木技術書院", year: "2024", role: "経験記述の文章作法を学んだ一冊", color: "green" },
  { id: "r3", title: "総監\n択一式問題集 2026", author: "建設技術出版", year: "2025", role: "総監キーワードの暗記サイクルに必須", color: "maroon" },
  { id: "r4", title: "土質力学\n基礎から実務まで", author: "鹿島技術研究所", year: "2019", role: "現場に出る前に通読した骨太な一冊", color: "olive" },
  { id: "r5", title: "技術士第二次試験\n論文の書き方", author: "日本技術士会編", year: "2022", role: "論文構成のテンプレートを作る土台", color: "blue" },
];

window.AboutMock = { aboutAuthor, personalReadingList };
