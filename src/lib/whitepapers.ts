/**
 * 白書 → 政府公式 URL マッピング (Single Source of Truth)
 *
 * <SourceBadges items={[...]} /> のチップを外部政府サイトにリンク化するための registry。
 * key はチップ表記そのもの（年度サフィックス込み）。
 *
 * 運用方針:
 * - 年度固定 URL が存在する場合（消防白書 R7・水産白書 R6 等）は固定 URL を採用
 * - landing URL のみの場合は最新版が表示される landing をそのまま採用
 * - 年度が新版に切り替わったときは新エントリを追加（旧エントリも保持可、または削除）
 *
 * 真実源として `content/note/whitepaper-study-map` や `whitepaper-study-map/article.mdx` の
 * リンク群が並列して存在するが、ここを一次 SoT とする（マップ MDX は記述目的の優先で更新タイミングがずれる）。
 */

export interface WhitepaperEntry {
  readonly url: string;
  readonly ministry: string;
}

const WHITEPAPERS_RAW = {
  // 環境系
  '環境白書 R7': {
    url: 'https://www.env.go.jp/policy/hakusyo/',
    ministry: '環境省',
  },
  '水循環白書 R7': {
    url: 'https://www.cas.go.jp/jp/seisaku/mizu_junkan/materials/materials/white_paper.html',
    ministry: '内閣官房',
  },

  // 国土・防災系
  '国土交通白書 R7': {
    url: 'https://www.mlit.go.jp/statistics/file000004.html',
    ministry: '国土交通省',
  },
  '防災白書 R7': {
    url: 'https://www.bousai.go.jp/kaigirep/hakusho/index.html',
    ministry: '内閣府',
  },
  '消防白書 R7': {
    url: 'https://www.fdma.go.jp/publication/hakusho/r7/',
    ministry: '消防庁',
  },

  // 水産・農林系
  '水産白書 R6': {
    url: 'https://www.jfa.maff.go.jp/j/kikaku/wpaper/R6/250606_1.html',
    ministry: '水産庁',
  },

  // 経済・産業系
  '通商白書 R7': {
    url: 'https://www.meti.go.jp/report/whitepaper/index_tuhaku.html',
    ministry: '経済産業省',
  },
  'ものづくり白書 R7': {
    url: 'https://www.meti.go.jp/report/whitepaper/index_mono.html',
    ministry: '経済産業省',
  },
  '経済財政白書 R7': {
    url: 'https://www5.cao.go.jp/keizai3/whitepaper.html',
    ministry: '内閣府',
  },

  // 厚生労働・人口系
  '厚生労働白書 R7': {
    url: 'https://www.mhlw.go.jp/toukei_hakusho/hakusho/index.html',
    ministry: '厚生労働省',
  },
  '労働経済の分析 R7': {
    url: 'https://www.mhlw.go.jp/stf/newpage_63870.html',
    ministry: '厚生労働省',
  },
  '男女共同参画白書 R7': {
    url: 'https://www.gender.go.jp/about_danjo/whitepaper/index.html',
    ministry: '内閣府',
  },
  '地方財政白書 R8': {
    url: 'https://www.soumu.go.jp/menu_seisaku/hakusyo/index.html',
    ministry: '総務省',
  },

  // エネルギー・原子力系
  'エネルギー白書 R6': {
    url: 'https://www.enecho.meti.go.jp/about/whitepaper/',
    ministry: '資源エネルギー庁',
  },
  '原子力白書 R6': {
    url: 'https://www.aec.go.jp/kettei/hakusho/',
    ministry: '原子力委員会',
  },

  // 情報・科学技術系
  '情報通信白書 R7': {
    url: 'https://www.soumu.go.jp/johotsusintokei/whitepaper/',
    ministry: '総務省',
  },
  '科学技術・イノベーション白書 R7': {
    url: 'https://www.mext.go.jp/b_menu/hakusho/html/hpaa202501/1421221_00015.html',
    ministry: '文部科学省',
  },
  'サイバーセキュリティ 2025': {
    url: 'https://www.cyber.go.jp/policy/jyuyo-bunsho',
    ministry: '国家サイバー統括室',
  },
} as const satisfies Record<string, WhitepaperEntry>;

type WhitepaperName = keyof typeof WHITEPAPERS_RAW;

const WHITEPAPERS: Readonly<Record<WhitepaperName, WhitepaperEntry>> = WHITEPAPERS_RAW;

/**
 * チップ名から白書エントリを取得。未登録の場合は null。
 * 呼び出し側（<SourceBadges>）は null のとき非リンク <span> でフォールバック表示する。
 */
export function getWhitepaper(name: string): WhitepaperEntry | null {
  return (WHITEPAPERS as Record<string, WhitepaperEntry | undefined>)[name] ?? null;
}
