/**
 * 資格（試験ファミリー）別のブランド情報 SSOT。
 *
 * マガジン id → 資格キー（examKeyOf）と、資格キー → 表示ブランド（ラベル・テーマ色・
 * CTA 背景イラスト）を一元管理する。note CTA タイル（HubCtaBanner）や記事内 MagazineCard が
 * 「どのマガジンをどの資格の見た目で出すか」を data 駆動で解決するために参照する。
 *
 * 背景イラストは cta-bg/*.webp（左空き・右にモチーフの明色イラスト＝HTML 文字オーバーレイ用）を
 * 完成画像が未登録の場合のフォールバックで共通利用する。
 * 完成画像の選択は note-cta-images.ts、商品別の文言・価格は商品台帳から解決する。
 */

import { qualificationShortLabel } from '@/lib/qualification-names';
import { NOTE_MAGAZINES, type NoteMagazine } from '@/lib/note-magazines';

// タイルの資格ラベルは registry の短い名前（ExamKey → registry の資格 id で引く・写さない）
export type ExamKey =
  | 'tankan'
  | 'pe-construction'
  | 'pe-general'
  | 'pe-first-stage'
  | 'civil-1'
  | 'civil-2'
  | 'concrete'
  | 'concrete-chief'
  | 'concrete-diagnosis'
  | 'rccm'
  | 'surveyor'
  | 'pavement';

/**
 * 商品の資格（config/products.json の qualification＝registry の資格 id か group id）→ 資格キー。
 * 以前は id の接頭辞から推定し、知らない接頭辞を総監（tankan）に倒していたので、新しい資格の商品が
 * 黙って総監の見た目で出た（DN-0794）。資格を足して商品を出すときは、ここに 1 行足す
 * （無いとビルドで throw し、tests/exam-brand-qualification.test.mjs が落ちる）。
 */
export const QUALIFICATION_TO_EXAM_KEY: Readonly<Record<string, ExamKey>> = {
  'pe-comprehensive-management': 'tankan',
  'pe-construction': 'pe-construction',
  'pe-first-stage': 'pe-first-stage',
  'civil-construction-1': 'civil-1',
  // 1級・2級を横断する商品（会員ラボ等）はブランドを 1 級側に寄せる
  'civil-construction-1-2': 'civil-1',
  'civil-construction-2': 'civil-2',
  'concrete-engineer': 'concrete',
  'concrete-chief-engineer': 'concrete-chief',
  'concrete-diagnostician': 'concrete-diagnosis',
  rccm: 'rccm',
  surveyor: 'surveyor',
  'pavement-1': 'pavement',
  'pavement-2': 'pavement',
};

/**
 * 資格（売上の帰属）と見た目を分けたい商品だけ、id で資格キーを上書きする（接頭辞では推定しない）。
 * pe-oral-general-guide は全部門共通の口頭試験の教材で、売上は建設部門に帰属させるが、表示は技術士の共通ラベルにする。
 */
const BRAND_OVERRIDE: Readonly<Record<string, ExamKey>> = {
  'pe-oral-general-guide': 'pe-general',
};

/** マガジン id → 資格キー（商品の qualification から引く。links / 導線が共有） */
function examKeyOf(id: string): ExamKey {
  const override = BRAND_OVERRIDE[id];
  if (override) return override;
  const qualification = (NOTE_MAGAZINES as Readonly<Record<string, NoteMagazine | undefined>>)[id]?.qualification;
  const key = qualification ? QUALIFICATION_TO_EXAM_KEY[qualification] : undefined;
  if (!key) throw new Error(`exam-brand: ${id} の資格 ${qualification ?? '（商品が無い）'} に資格キーが無い（QUALIFICATION_TO_EXAM_KEY に足す）`);
  return key;
}

export interface ExamBrand {
  /** サイトの商品プレビュー用画像。note上の表紙そのものとは区別する。 */
  readonly previewImage?: string;
  /** タイルに小さく出す資格ラベル（例: "1級土木"）。 */
  readonly label: string;
  /** globals.css の資格テーマ色トークン名（--exam-*）。 */
  readonly themeVar: string;
  /**
   * CTA タイル/バナーの背景イラスト（cta-bg/*.webp）。省略時はテーマ色のベタ塗りにフォールバック。
   */
  readonly ctaBg?: string;
}

export const EXAM_BRAND: Record<ExamKey, ExamBrand> = {
  'pe-general': {
    label: qualificationShortLabel('professional-engineer'),
    themeVar: '--exam-pe',
  },
  tankan: {
    label: qualificationShortLabel('pe-comprehensive-management'),
    themeVar: '--exam-pe',
    ctaBg: '/images/cta-bg/pe-comprehensive.webp',
  },
  'pe-construction': {
    label: qualificationShortLabel('pe-construction'),
    themeVar: '--exam-pe-construction',
    ctaBg: '/images/cta-bg/pe-construction.webp',
  },
  // 第一次試験は総監と同じ濃紺（globals.css の --exam-pe が「総監・第一次」共用）。
  // 専用の背景イラストは未整備のためベタ塗りにフォールバックする。
  'pe-first-stage': {
    label: qualificationShortLabel('pe-first-stage'),
    themeVar: '--exam-pe',
    previewImage: '/images/card-pe-first-stage.webp',
  },
  'civil-1': {
    label: qualificationShortLabel('civil-construction-1'),
    themeVar: '--exam-civil-1',
    ctaBg: '/images/cta-bg/civil-1.webp',
  },
  'civil-2': {
    label: qualificationShortLabel('civil-construction-2'),
    themeVar: '--exam-civil-2',
    ctaBg: '/images/cta-bg/civil-2.webp',
  },
  concrete: {
    label: qualificationShortLabel('concrete-engineer'),
    themeVar: '--exam-concrete',
    previewImage: '/images/card-concrete-engineer.webp',
  },
  'concrete-chief': {
    label: qualificationShortLabel('concrete-chief-engineer'),
    themeVar: '--exam-concrete-chief',
    ctaBg: '/images/cta-bg/concrete-chief.webp',
  },
  'concrete-diagnosis': {
    label: qualificationShortLabel('concrete-diagnostician'),
    themeVar: '--exam-concrete-diagnosis',
    ctaBg: '/images/cta-bg/concrete-diagnosis.webp',
  },
  // RCCM は専用の背景イラスト未整備のためテーマ色のベタ塗りにフォールバック（vertical 公開時に card 画像を追加）。
  rccm: {
    label: qualificationShortLabel('rccm'),
    themeVar: '--exam-rccm',
  },
  // 測量士・舗装（2026-10-28 に商品を公開・DN-0899）は背景イラスト未整備のためテーマ色のベタ塗り。
  surveyor: {
    label: qualificationShortLabel('surveyor'),
    themeVar: '--exam-surveyor',
  },
  pavement: {
    label: qualificationShortLabel('pavement'),
    themeVar: '--exam-pavement',
  },
};

/** マガジン id からブランド情報を解決するショートカット。 */
export function brandOf(id: string): ExamBrand {
  return EXAM_BRAND[examKeyOf(id)];
}
