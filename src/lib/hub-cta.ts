import { getMagazine, buildMagazineUrl, type MagazineId } from '@/lib/note-magazines';
import { qualificationShortLabel } from '@/lib/qualification-names';
import { withNoteUtm } from '@/lib/note-utm';
import { mokujiFor } from '@/lib/note-mokuji';
import { EXAM_BRAND, QUALIFICATION_TO_EXAM_KEY } from '@/lib/exam-brand';
import { activeSeason, surfaceRow } from '@/lib/cta-surfaces';

// カテゴリ hub・記事のタイル・記事の横の欄の note CTA を解決する。
// どの資格をもくじへ寄せ、いつどの商品へ切り替えるかは config/site-cta-surfaces.json（DN-1223）が正本で、ここに書かない。
// 方針（2026-07-05 決定・2026-11-16 に台帳化）: 幅広面は「もくじ(L2索引)」へ集約し、試験の前後の決まった期間だけ特定商品へ直リンク。
// 表示は資格・商品に対応する完成画像を使う。背景は画像欠落時のフォールバック。

/** もくじタイルの補足行。資格によらず「この先が有料教材の一覧」であることだけを示す。 */
const MOKUJI_SUB = '有料教材をまとめて確認';
/** 資格専用の背景イラストが無いときのフォールバック（完成画像のタイルがある資格では使われない） */
const FALLBACK_BG = '/images/cta-bg/note-hero.webp';

export type ResolvedHubCta = {
  mode: 'product' | 'mokuji';
  qualification: string;
  productId?: MagazineId;
  bg: string;
  themeVar: string;
  /** バッジ文言（省略時は "note限定"）。product タイルでは magazine.badge を差す。 */
  badge?: string;
  qual: string;
  title1: string;
  title2: string;
  sub: string;
  price?: string | undefined;
  cta: string;
  url: string;
  trackLabel: string;
};

/**
 * カテゴリ hub / docs 記事の note CTA を解決する。カテゴリページ・docs 記事末尾・docs サイドバーの
 * 全 HUB 面で共通利用し、平時=L2 もくじ／直前期 6 週間=売れ筋商品直リンク（seasonal）／
 * 試験後の決まった期間=その時期の商品の直リンク（afterResult）を返す。
 * @param opts.utmSuffix 面識別子（"sb" / "docs-sb" / "footer" 等）。trackLabel/utm_content 末尾に
 *   付与し GA4 で面分離する。
 * @param opts.stage 'first' は第1次検定の学習ページ。mokujiFirstStage がある資格は、二次の直前切替をせず一次の見出しのもくじを返す。
 */
export function resolveHubCta(
  category: string,
  opts: { utmSuffix?: string; stage?: 'first' | undefined } = {},
): ResolvedHubCta | null {
  const row = surfaceRow(category);
  // もくじへ寄せる資格だけがタイルを持つ（product・none の資格は資格トップの商品カード＝sidebar-discovery が受ける）
  if (row?.lead !== 'mokuji' || !row.tile) return null;
  const examKey = QUALIFICATION_TO_EXAM_KEY[category];
  if (!examKey) return null;
  const brand = EXAM_BRAND[examKey];
  const suffix = opts.utmSuffix ? `-${opts.utmSuffix}` : '';
  const firstStage = opts.stage === 'first' ? row.tileFirstStage : undefined;

  // 試験の前後の決まった期間だけ特定商品へ直リンク。それ以外はもくじへ集約。一次の学習ページ（firstStage）では二次の切り替えをしない。
  // utm の hub-seasonal（before-exam）・hub-after-result（after-event）は売上の帰属（scripts/lib/site-to-sales.mjs）が商品へ結ぶ。
  const season = firstStage ? null : activeSeason(category);
  const mag = season ? getMagazine(season.product) : null;
  if (season && mag) {
    const utm = `category-${category}-hub-${season.kind === 'before-exam' ? 'seasonal' : 'after-result'}${suffix}`;
    return {
      mode: 'product',
      qualification: category,
      productId: season.product,
      bg: brand.ctaBg ?? FALLBACK_BG,
      themeVar: brand.themeVar,
      qual: qualificationShortLabel(category),
      title1: season.title ?? mag.shortTitle ?? mag.title,
      title2: '',
      sub: season.sub,
      // price は「¥3,480（6テーマ…）」等の説明入りがあるので先頭の金額だけをピル表示に使う
      price: mag.price?.match(/[¥￥][\d,]+/)?.[0] ?? mag.price,
      cta: '詳しく見る',
      url: buildMagazineUrl(mag, utm),
      trackLabel: utm,
    };
  }

  // もくじ記事の URL は config/note-funnel.json が正本（note-mokuji.ts）。funnel にもくじが無い資格は CTA を出さない（check-cta-surfaces が止める）
  const mokuji = mokujiFor(examKey);
  if (!mokuji) return null;
  const titles = firstStage ?? row.tile;
  const utm = `category-${category}-hub-mokuji${suffix}`;
  return {
    mode: 'mokuji',
    qualification: category,
    bg: brand.ctaBg ?? FALLBACK_BG,
    themeVar: brand.themeVar,
    qual: qualificationShortLabel(category),
    title1: titles.title1,
    title2: titles.title2,
    sub: MOKUJI_SUB,
    cta: '教材一覧を見る',
    url: withNoteUtm(mokuji.noteUrl, 'magazine', { content: utm }),
    trackLabel: utm,
  };
}
