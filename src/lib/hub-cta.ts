import { getMagazine, buildMagazineUrl, type MagazineId } from '@/lib/note-magazines';
import { examDayEndUtcMs } from '@/lib/exam-dates';
import { isPeConstructionOralSeason } from '@/lib/magazine-placement';
import { qualificationShortLabel } from '@/lib/qualification-names';
import { withNoteUtm } from '@/lib/note-utm';
import { mokujiFor } from '@/lib/note-mokuji';
import type { ExamKey } from '@/lib/exam-brand';

// カテゴリ hub 本文の note CTA の商品・もくじ・リンクを解決する。
// 方針（2026-07-05 決定）: マガジンが多いので幅広面は「もくじ(L2索引)」へ集約し、直前期だけ特定商品へ直リンク。
// 表示は資格・商品に対応する完成画像を使う。背景は画像欠落時のフォールバック。
// 直前期の switch 日は magazine-placement の季節ロジックと同型（ビルド時 Date.now() 比較）。

type HubCtaSpec = {
  bg: string;
  themeVar: string; // globals.css の --exam-* トークン名
  /** 見出し 2 行は「何が買えるか」を主役にする（旧「note教材 / もくじ・まとめ」は
   *  タイル内の 3 箇所が同じ「一覧がある」を言い換えるだけでクリック動機が無かった）。
   *  一覧であることは CTA ボタンの「教材一覧を見る」が担う。 */
  mokuji: { title1: string; title2: string };
  /** もくじ（note ファネル L2）を引く資格キー。もくじ記事の URL は config/note-funnel.json（src/lib/note-mokuji.ts）が正本で、ここに書かない。 */
  examKey: ExamKey;
  /** title: 商品の shortTitle が長く資格名と重複するときの短縮表示（qual 行に資格名が出るため）。 */
  seasonal?: { switchUtcMs: number; product: MagazineId; sub: string; title?: string };
  /** 試験後の一定期間だけ出す商品（建設部門の筆記合格発表から 1 月末までの口頭試験の教材）。active はビルド時の日付で判定する */
  afterResult?: { active: (nowMs: number) => boolean; product: MagazineId; sub: string; title?: string };
};

/** もくじタイルの補足行。資格によらず「この先が有料教材の一覧」であることだけを示す。 */
const MOKUJI_SUB = '有料教材をまとめて確認';


const HUB: Partial<Record<string, HubCtaSpec>> = {
  'civil-construction-1': {
    bg: '/images/cta-bg/civil-1.webp',
    themeVar: '--exam-civil-1',
    examKey: 'civil-1',
    mokuji: { title1: '施工経験記述', title2: '学科記述・暗記' },
    seasonal: {
      switchUtcMs: examDayEndUtcMs('civil-construction-1', 'second'),
      // 2026-09-27: 暗記ノート単品（¥580）→ 暗記ノートを含む直前総仕上げパック（模試3回＋暗記ノート＋出題分析）
      product: 'civil-1-chokuzen-pack',
      title: '直前総仕上げパック',
      sub: '模試3回＋暗記ノート＋出題分析',
    },
  },
  'civil-construction-2': {
    bg: '/images/cta-bg/civil-2.webp',
    themeVar: '--exam-civil-2',
    examKey: 'civil-2',
    mokuji: { title1: '施工経験記述', title2: '学科記述・暗記' },
    seasonal: {
      switchUtcMs: examDayEndUtcMs('civil-construction-2', 'second'),
      product: 'civil-2-chokuzen-pack',
      title: '直前総仕上げパック',
      sub: '模試3回＋暗記ノート＋出題分析',
    },
  },
  'pe-comprehensive-management': {
    bg: '/images/cta-bg/pe-comprehensive.webp',
    themeVar: '--exam-pe',
    examKey: 'tankan',
    mokuji: { title1: '記述式・R8予想', title2: 'キーワード対策' },
    seasonal: { switchUtcMs: examDayEndUtcMs('pe-comprehensive-management', 'written'), product: 'r8-essay-forecast', sub: '出る6テーマ×専門' },
  },
  'pe-construction': {
    bg: '/images/cta-bg/pe-construction.webp',
    themeVar: '--exam-pe-construction',
    examKey: 'pe-construction',
    mokuji: { title1: '必須I・選択科目', title2: '模範解答集' },
    seasonal: { switchUtcMs: examDayEndUtcMs('pe-construction', 'written'), product: 'pe-construction-required-magazine', sub: 'R03-R07＋R8予想' },
    // DN-0902・EXP-047: 筆記合格発表の日から、合格した人が次に準備する口頭試験の教材へ
    afterResult: { active: isPeConstructionOralSeason, product: 'pe-construction-oral-guide', title: '口頭試験対策', sub: '想定問答33問＋準備ロードマップ' },
  },
};

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
 */
export function resolveHubCta(
  category: string,
  opts: { utmSuffix?: string } = {},
): ResolvedHubCta | null {
  const spec = HUB[category];
  if (!spec) return null;
  const suffix = opts.utmSuffix ? `-${opts.utmSuffix}` : '';

  // 直前期（試験の 6 週間前〜試験日）と試験後の決まった期間（afterResult）だけ特定商品へ直リンク。それ以外はもくじへ集約。
  // utm の hub-seasonal・hub-after-result は売上の帰属（scripts/lib/site-to-sales.mjs）が商品へ結ぶ。
  const PRE_EXAM_WINDOW_MS = 42 * 24 * 60 * 60 * 1000; // 6 週間
  const now = Date.now();
  const productTile = (
    pick: { product: MagazineId; sub: string; title?: string },
    utmKey: 'seasonal' | 'after-result',
  ): ResolvedHubCta | null => {
    const mag = getMagazine(pick.product);
    if (!mag) return null;
    const utm = `category-${category}-hub-${utmKey}${suffix}`;
    return {
      mode: 'product',
      qualification: category,
      productId: pick.product,
      bg: spec.bg,
      themeVar: spec.themeVar,
      qual: qualificationShortLabel(category),
      title1: pick.title ?? mag.shortTitle ?? mag.title,
      title2: '',
      sub: pick.sub,
      // price は「¥3,480（6テーマ…）」等の説明入りがあるので先頭の金額だけをピル表示に使う
      price: mag.price?.match(/[¥￥][\d,]+/)?.[0] ?? mag.price,
      cta: '詳しく見る',
      url: buildMagazineUrl(mag, utm),
      trackLabel: utm,
    };
  };
  if (
    spec.seasonal &&
    now >= spec.seasonal.switchUtcMs - PRE_EXAM_WINDOW_MS &&
    now < spec.seasonal.switchUtcMs
  ) {
    const tile = productTile(spec.seasonal, 'seasonal');
    if (tile) return tile;
  }
  if (spec.afterResult?.active(now)) {
    const tile = productTile(spec.afterResult, 'after-result');
    if (tile) return tile;
  }

  // それ以外は「もくじ」へ集約（マガジンが増えても追加不要でスケール）。funnel にもくじが無い資格は CTA を出さない
  const mokuji = mokujiFor(spec.examKey);
  if (!mokuji) return null;
  const utm = `category-${category}-hub-mokuji${suffix}`;
  return {
    mode: 'mokuji',
    qualification: category,
    bg: spec.bg,
    themeVar: spec.themeVar,
    qual: qualificationShortLabel(category),
    title1: spec.mokuji.title1,
    title2: spec.mokuji.title2,
    sub: MOKUJI_SUB,
    cta: '教材一覧を見る',
    url: withNoteUtm(mokuji.noteUrl, 'magazine', { content: utm }),
    trackLabel: utm,
  };
}
