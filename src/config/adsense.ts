/**
 * AdSense の発行者 ID と広告ユニット（2026-11-16 に AdSense の管理画面で作成）。
 * 自動広告はアンカー広告と全画面広告だけを有効にし、ページ内広告は無効（管理画面の「サイトごと」）。
 * 手動の枠の置き場: 本文の途中（転職バナー・CTA から離す・src/lib/article-inline-slots.mjs）・PC の右の欄の一番下・ページ末尾（Multiplex）。
 */
export const ADSENSE_CLIENT = 'ca-pub-8504035087322664';

export const ADSENSE_SLOTS = {
  inArticle: '3134794094', // doboku-in-article（ディスプレイ・レスポンシブ）
  rail: '8003977399', // doboku-rail（ディスプレイ・レスポンシブ）
  endMultiplex: '1246997354', // doboku-end-multiplex（Multiplex）
} as const;

export type AdSenseSlot = keyof typeof ADSENSE_SLOTS;
