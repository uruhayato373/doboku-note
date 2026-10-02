import { getMagazine, buildMagazineUrl, type MagazineId } from '@/lib/note-magazines';
import examCalendar from '../../config/exam-calendar.json';
import { qualificationShortLabel } from '@/lib/qualification-names';
import { withNoteUtm } from '@/lib/note-utm';
import { mokujiFor } from '@/lib/note-mokuji';
import type { ExamKey } from '@/lib/exam-brand';

// カテゴリ hub 本文の note CTA（資格別リッチ背景×HTML文字）を解決する。
// 方針（2026-07-05 決定）: マガジンが多いので幅広面は「もくじ(L2索引)」へ集約し、直前期だけ特定商品へ直リンク。
// 背景は資格ごとに 1 枚（public/images/cta-bg/*.webp）を使い回し、文言/価格は HTML でデータ駆動。
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
};

/** もくじタイルの補足行。資格によらず「この先が有料教材の一覧」であることだけを示す。 */
const MOKUJI_SUB = '有料教材をまとめて確認';

type CivilExamId = 'civil-construction-1' | 'civil-construction-2';

function examDayEndUtcMs(examId: CivilExamId, eventId: 'second'): number {
  const date = examCalendar.exams[examId].events[eventId].date;
  const timestamp = Date.parse(`${date}T23:59:59+09:00`);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid exam date in 試験日程（config.exam-calendar）: ${examId}.${eventId}`);
  }
  return timestamp;
}

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
    seasonal: { switchUtcMs: Date.UTC(2026, 6, 19), product: 'r8-essay-forecast', sub: '出る6テーマ×専門' },
  },
  'pe-construction': {
    bg: '/images/cta-bg/pe-construction.webp',
    themeVar: '--exam-pe-construction',
    examKey: 'pe-construction',
    mokuji: { title1: '必須I・選択科目', title2: '模範解答集' },
    seasonal: { switchUtcMs: Date.UTC(2026, 6, 20), product: 'pe-construction-required-magazine', sub: 'R03-R07＋R8予想' },
  },
};

export type ResolvedHubCta = {
  mode: 'product' | 'mokuji';
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
 * 全 HUB 面で共通利用し、平時=L2 もくじ／直前期 6 週間=売れ筋商品直リンク（seasonal）を返す。
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

  // 直前期（試験の 6 週間前〜試験日）だけ売れ筋の特定商品へ直リンク。それ以外はもくじへ集約。
  const PRE_EXAM_WINDOW_MS = 42 * 24 * 60 * 60 * 1000; // 6 週間
  const now = Date.now();
  if (
    spec.seasonal &&
    now >= spec.seasonal.switchUtcMs - PRE_EXAM_WINDOW_MS &&
    now < spec.seasonal.switchUtcMs
  ) {
    const mag = getMagazine(spec.seasonal.product);
    if (mag) {
      const utm = `category-${category}-hub-seasonal${suffix}`;
      return {
        mode: 'product',
        bg: spec.bg,
        themeVar: spec.themeVar,
        qual: qualificationShortLabel(category),
        title1: spec.seasonal.title ?? mag.shortTitle ?? mag.title,
        title2: '',
        sub: spec.seasonal.sub,
        // price は「¥3,480（6テーマ…）」等の説明入りがあるので先頭の金額だけをピル表示に使う
        price: mag.price?.match(/[¥￥][\d,]+/)?.[0] ?? mag.price,
        cta: '詳しく見る',
        url: buildMagazineUrl(mag, utm),
        trackLabel: utm,
      };
    }
  }

  // それ以外は「もくじ」へ集約（マガジンが増えても追加不要でスケール）。funnel にもくじが無い資格は CTA を出さない
  const mokuji = mokujiFor(spec.examKey);
  if (!mokuji) return null;
  const utm = `category-${category}-hub-mokuji${suffix}`;
  return {
    mode: 'mokuji',
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
