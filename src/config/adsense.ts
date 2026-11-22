/**
 * AdSense の発行者 ID と広告ユニット（2026-11-16 に AdSense の管理画面で作成）。
 * 自動広告はアンカー広告と全画面広告だけを有効にし、ページ内広告は無効（管理画面の「サイトごと」）。
 * 手動の枠の置き場: 本文の途中（記事・基準書は 1,500 字ごと、過去問は 3 問ごと。値の唯一の置き場は src/lib/body-ad-rules.mjs）・PC の右の欄（下に続く組に 1 組おき、その下の空きに縦長の枠を 1,000px 間隔で最大 40 枠・src/lib/rail-continuation.ts）・ページ末尾（Multiplex）。
 * 記事の一覧（資格トップのサムネイルの行・/practice の文字の行・検索結果）には、インフィード広告を 1 項目として挟む（src/lib/feed-ads.ts）。
 * 資格トップの本文の区画の切れ目には記事内広告を置く（src/components/ui/SectionAdBreak・PC は AdSense、スマホは 1 つ目が転職・2 つ目以降が AdSense）。
 * 手元・プレビュー（isAdSensePreviewHost）では広告を要求せず、破線の目印で置き場を見せる。
 */
export const ADSENSE_CLIENT = 'ca-pub-8504035087322664';

export const ADSENSE_SLOTS = {
  // 本文の途中は記事内広告（ネイティブ・2026-11-16 作成）。旧 doboku-in-article（3134794094・ディスプレイ）は使わないが AdSense には残す
  inArticle: '2242183125', // doboku-in-article-native（記事内広告・fluid）
  rail: '8003977399', // doboku-rail（ディスプレイ・レスポンシブ）
  endMultiplex: '1246997354', // doboku-end-multiplex（Multiplex）
  // 記事の一覧に 1 項目として入るインフィード広告（2026-11-16 作成・スタイルは AdSense の既定）。挟む位置は src/lib/feed-ads.ts
  inFeedThumb: '5537450367', // doboku-infeed-thumb（横の画像。サムネイルの行の一覧＝ArticleThumbRow の feed 型）
  inFeedText: '6658960341', // doboku-infeed-text（テキストのみ。文字の行の一覧）
} as const;

/** インフィード広告のレイアウトキー（AdSense の管理画面のコードの data-ad-layout-key） */
export const ADSENSE_LAYOUT_KEYS: Partial<Record<keyof typeof ADSENSE_SLOTS, string>> = {
  inFeedThumb: '-fb+5w+4e-db+86',
  inFeedText: '-gw-3+1f-3d+2z',
};

export type AdSenseSlot = keyof typeof ADSENSE_SLOTS;

/** 管理画面の広告ユニット名（手元の目印に出す） */
export const ADSENSE_UNIT_NAMES: Record<AdSenseSlot, string> = {
  inArticle: 'doboku-in-article-native',
  rail: 'doboku-rail',
  endMultiplex: 'doboku-end-multiplex',
  inFeedThumb: 'doboku-infeed-thumb',
  inFeedText: 'doboku-infeed-text',
};

/** 広告を要求しない手元・プレビューの配信（npm run dev・npm run serve・pages.dev）。ここでは枠の位置を目印で見せる */
export function isAdSensePreviewHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname.endsWith('.localhost') || hostname.endsWith('.pages.dev');
}
