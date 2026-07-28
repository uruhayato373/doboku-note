/**
 * 資格（試験ファミリー）別のブランド情報 SSOT。
 *
 * マガジン id → 資格キー（examKeyOf）と、資格キー → 表示ブランド（ラベル・テーマ色・
 * CTA 背景イラスト）を一元管理する。note CTA タイル（HubCtaBanner）や記事内 MagazineCard が
 * 「どのマガジンをどの資格の見た目で出すか」を data 駆動で解決するために参照する。
 *
 * 背景イラストは cta-bg/*.webp（左空き・右にモチーフの明色イラスト＝HTML 文字オーバーレイ用）を
 * 共通利用する。資格別の焼き込みバナー（旧 sidebarImageUrl / 300×250 satori）は廃し、
 * 文言・価格は HTML でデータ駆動にした（マガジン追加時の画像生成を不要化）。
 */

export type ExamKey =
  | 'tankan'
  | 'pe-construction'
  | 'pe-first-stage'
  | 'civil-1'
  | 'civil-2'
  | 'concrete';

/**
 * マガジン id から資格キーを推定する（links / 導線が共有）。
 * 接頭辞ベース。civil-membership-lab は 1級・2級を横断する会員だが、ブランドは 1級側に寄せる
 * （id が civil-1/civil-2 のどちらにも一致せず旧実装では総監に落ちていた潜在バグを是正。
 *  現状 published:false のため live 挙動は不変）。
 */
export function examKeyOf(id: string): ExamKey {
  if (id.startsWith('pe-construction')) return 'pe-construction';
  // 技術士「第一次」試験（pe1-*）。総監（tankan）へ落ちる fallback より先に判定する。
  // これが無いと pe1-takuitsu-pdf が総監として扱われ、資格別に束ねる面（/links のカード等）で
  // 一次の過去問 PDF が総監に混ざる（2026-07-28 に /links のカード化で顕在化）。
  if (id.startsWith('pe1-')) return 'pe-first-stage';
  if (id.startsWith('civil-1') || id === 'civil-membership-lab') return 'civil-1';
  if (id.startsWith('civil-2')) return 'civil-2';
  if (id.startsWith('cd-') || id.startsWith('cce-')) return 'concrete';
  return 'tankan';
}

export interface ExamBrand {
  /** タイルに小さく出す資格ラベル（例: "1級土木"）。 */
  readonly label: string;
  /** globals.css の資格テーマ色トークン名（--exam-*）。 */
  readonly themeVar: string;
  /**
   * CTA タイル/バナーの背景イラスト（cta-bg/*.webp）。省略時はテーマ色のベタ塗りにフォールバック。
   * concrete はイラスト未整備＋該当マガジンが未公開のため未設定（描画されない）。
   */
  readonly ctaBg?: string;
}

export const EXAM_BRAND: Record<ExamKey, ExamBrand> = {
  tankan: {
    label: '技術士 総監',
    themeVar: '--exam-pe',
    ctaBg: '/images/cta-bg/pe-comprehensive.webp',
  },
  'pe-construction': {
    label: '技術士 建設部門',
    themeVar: '--exam-pe-construction',
    ctaBg: '/images/cta-bg/pe-construction.webp',
  },
  // 第一次試験は総監と同じ濃紺（globals.css の --exam-pe が「総監・第一次」共用）。
  // 専用の背景イラストは未整備のためベタ塗りにフォールバックする。
  'pe-first-stage': {
    label: '技術士 第一次',
    themeVar: '--exam-pe',
  },
  'civil-1': {
    label: '1級土木',
    themeVar: '--exam-civil-1',
    ctaBg: '/images/cta-bg/civil-1.webp',
  },
  'civil-2': {
    label: '2級土木',
    themeVar: '--exam-civil-2',
    ctaBg: '/images/cta-bg/civil-2.webp',
  },
  // concrete はテーマ色のみ（診断士専用トークンは無いため主任＝chief を流用）。
  concrete: {
    label: 'コンクリート',
    themeVar: '--exam-concrete-chief',
  },
};

/** マガジン id からブランド情報を解決するショートカット。 */
export function brandOf(id: string): ExamBrand {
  return EXAM_BRAND[examKeyOf(id)];
}
