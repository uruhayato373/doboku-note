/**
 * AdSense の発行者 ID と広告ユニット（2026-11-16 に AdSense の管理画面で作成）。
 * 自動広告はアンカー広告と全画面広告だけを有効にし、ページ内広告は無効（管理画面の「サイトごと」）。
 * 手動の枠の置き場: 本文の途中（転職バナー・CTA から離す・src/lib/article-inline-slots.mjs）・PC の右の欄（上詰めの 2 組目と、その下の空きに高さ 2,500px ごとに最大 3 枠・src/lib/rail-continuation.ts）・ページ末尾（Multiplex）。
 * 手元・プレビュー（isAdSensePreviewHost）では広告を要求せず、破線の目印で置き場を見せる。
 */
export const ADSENSE_CLIENT = 'ca-pub-8504035087322664';

export const ADSENSE_SLOTS = {
  inArticle: '3134794094', // doboku-in-article（ディスプレイ・レスポンシブ）
  rail: '8003977399', // doboku-rail（ディスプレイ・レスポンシブ）
  endMultiplex: '1246997354', // doboku-end-multiplex（Multiplex）
} as const;

export type AdSenseSlot = keyof typeof ADSENSE_SLOTS;

/** 管理画面の広告ユニット名（手元の目印に出す） */
export const ADSENSE_UNIT_NAMES: Record<AdSenseSlot, string> = {
  inArticle: 'doboku-in-article',
  rail: 'doboku-rail',
  endMultiplex: 'doboku-end-multiplex',
};

/** 広告を要求しない手元・プレビューの配信（npm run dev・npm run serve・pages.dev）。ここでは枠の位置を目印で見せる */
export function isAdSensePreviewHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname.endsWith('.localhost') || hostname.endsWith('.pages.dev');
}
