/**
 * SNS（YouTube/Instagram）共通デザイントークン。
 *
 * src/styles/globals.css の :root 定義（Light モード）を hex で再宣言する。
 * Satori は CSS 変数を解釈しないため、JSON/オブジェクトとして直接参照する。
 *
 * このファイルが「単一情報源」と globals.css の値が乖離した場合、
 * tests/sns-design-tokens.test.mjs が globals.css を read して検出する。
 */

export const COLORS = {
  brand: '#2e6da4',
  brandFill: '#e8f0fe',
  brandDeep: '#1a3a5c',
  inkStrong: '#222222',
  inkBody: '#555555',
  inkMuted: '#8a8a8a',
  border: '#d7d7d7',
  surface: '#f5f5f5',
  positive: '#3a7d44',
  positiveFill: '#d0e8d0',
  warn: '#d4a017',
  warnFill: '#fff3cd',
  danger: '#b22234',
  dangerFill: '#f8d7da',
  white: '#ffffff',
  black: '#000000',
};

export const FONTS = {
  heading: 'Noto Sans JP',
  body: 'Noto Sans JP',
  alpha: 'Inter',
};

export const SIZES = {
  igCarousel: { width: 1080, height: 1350 },
  igReel: { width: 1080, height: 1920 },
  ytShorts: { width: 1080, height: 1920 },
  ytStandard: { width: 1920, height: 1080 },
  ytThumbnail: { width: 1280, height: 720 },
  ogp: { width: 1200, height: 630 },
};

export const SPACING = {
  cardRadius: 24,
  contentPadding: 80,
  textBlockGap: 32,
  iconSize: 56,
};

export const FONT_SIZES = {
  hero: 96,
  title: 72,
  subtitle: 48,
  body: 36,
  caption: 28,
  meta: 24,
};
