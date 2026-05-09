/**
 * SNS 投稿・動画生成の共通設定。
 * テキスト・URL・YouTube メタデータを一元管理する。
 */
export const SNS_CONFIG = {
  // ブランド
  domain: 'doboku-note.com',
  domainUrl: 'https://doboku-note.com',
  noteUrl: 'https://note.com/uruhayato/',
  profession: '技術士（総合技術監理部門）',
  professionShort: '技術士総監',
  defaultCategory: 'pe-comprehensive-management',

  // スライドラベル（ビジュアル）
  labels: {
    cover: '技術士（総合技術監理部門）',
    definition: '定義',
    examPoint: '試験ポイント',
  },

  // CTA スライド（ビジュアル）
  cta: {
    heading: ['概要欄のリンクを', 'チェック！'],
    cardAction: '▷ 概要欄のリンクから',
    stickyLabel: '▷ 概要欄',
    stickyItems: ['過去問 H21〜R7', '5管理 横断辞書', '1問1答 全694問'],
  },

  // ナレーション定型文（TTS）
  narration: {
    coverSuffix: '。技術士総合技術監理部門の重要キーワードです。',
    definitionConnector: 'とは、',
    definitionFallback: 'について解説します。',
    examPointPrefix: '試験ポイント',
    cta: '詳しい解説は概要欄のリンクから、doboku-note のキーワードページをご覧ください。',
    imageSuffix: 'のイメージです。',
  },

  // YouTube メタデータ
  youtube: {
    titlePrefix: '【総監キーワード】',
    categoryId: '27', // Education
    privacyStatus: 'private',
    tags: [
      '技術士', '技術士総監', '総合技術監理', '技術士試験', '技術士受験',
      'エンジニア学習', '土木', 'dobokunote',
    ],
    hashtags: '#技術士 #技術士総監 #総合技術監理 #技術士試験 #技術士受験 #エンジニア学習 #土木 #dobokunote',
    descriptionHeaders: {
      site: '▼ 詳しい解説（doboku-note）',
      note: '▼ 受験記・解答再現（note）',
    },
    utmParams: 'utm_source=youtube&utm_medium=description&utm_campaign=shorts',
  },

  // コンテンツ生成パラメータ
  generation: {
    examPointCount: 2,
    definitionMaxLength: 80,
  },
};
