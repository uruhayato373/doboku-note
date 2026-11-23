/**
 * AdSense の発行者 ID と広告ユニット（2026-11-16 に AdSense の管理画面で作成）。
 * 自動広告: アンカー広告と全画面広告に加え、本文の中はページ内広告に任せる（2026-11-23 運営者判断。管理画面の「サイトごと」で有効にする。サイドレールは右の欄の追従広告と重なるので切る）。
 * 手動の枠の置き場: PC の右の欄（下に続く組の 2 枠・src/lib/rail-continuation.ts と、欄の最後の追従ブロック 1 枠・src/components/ui/RailFollow）・ページ末尾（Multiplex）。
 * 本文の中には手動の枠を置かない（以前は字数・問題の数で最大 30 枠置き、長い章で 1 ページ 71 枠になって AdSense が上から約 19 枠しか処理しなかった）。
 * 記事の一覧（資格トップのサムネイルの行・/practice の文字の行・検索結果）には、インフィード広告を 1 項目として挟む（src/lib/feed-ads.ts）。
 * 手元・プレビュー（isAdSensePreviewHost）では広告を要求せず、破線の目印で置き場を見せる。
 */
export const ADSENSE_CLIENT = 'ca-pub-8504035087322664';

export const ADSENSE_SLOTS = {
  // 記事内広告（ネイティブ・2026-11-16 作成）。本文の中は 2026-11-23 から自動広告に任せ、手動では使わないが AdSense には残す
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
