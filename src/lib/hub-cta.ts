import { getMagazine, buildMagazineUrl, type MagazineId } from '@/lib/note-magazines';

// カテゴリ hub 本文の note CTA（資格別リッチ背景×HTML文字）を解決する。
// 方針（2026-07-05 決定）: マガジンが多いので幅広面は「もくじ(L2索引)」へ集約し、直前期だけ特定商品へ直リンク。
// 背景は資格ごとに 1 枚（public/images/cta-bg/*.webp）を使い回し、文言/価格は HTML でデータ駆動。
// 直前期の switch 日は magazine-placement の季節ロジックと同型（ビルド時 Date.now() 比較）。

type HubCtaSpec = {
  bg: string;
  themeVar: string; // globals.css の --exam-* トークン名
  qual: string;
  mokuji: { url: string; title1: string; title2: string; sub: string };
  seasonal?: { switchUtcMs: number; product: MagazineId; sub: string };
};

const HUB: Partial<Record<string, HubCtaSpec>> = {
  'civil-construction-1': {
    bg: '/images/cta-bg/civil-1.webp',
    themeVar: '--exam-civil-1',
    qual: '1級土木',
    mokuji: { url: 'https://note.com/dobokunote/n/n4fde0f62dc20', title1: 'note教材', title2: 'もくじ・まとめ', sub: '経験記述・学科記述・暗記' },
    seasonal: { switchUtcMs: Date.UTC(2026, 9, 5), product: 'civil-1-anki-note', sub: '赤シート対応PDF付' },
  },
  'civil-construction-2': {
    bg: '/images/cta-bg/civil-2.webp',
    themeVar: '--exam-civil-2',
    qual: '2級土木',
    mokuji: { url: 'https://note.com/dobokunote/n/n4fde0f62dc20', title1: 'note教材', title2: 'もくじ・まとめ', sub: '経験記述・学科記述・暗記' },
    seasonal: { switchUtcMs: Date.UTC(2026, 9, 5), product: 'civil-2-anki-note', sub: '赤シート対応PDF付' },
  },
  'pe-comprehensive-management': {
    bg: '/images/cta-bg/pe-comprehensive.webp',
    themeVar: '--exam-pe',
    qual: '技術士 総監',
    mokuji: { url: 'https://note.com/dobokunote/n/n3ed4c77ceed6', title1: 'note教材', title2: 'もくじ・まとめ', sub: '記述式・R8予想・キーワード' },
    seasonal: { switchUtcMs: Date.UTC(2026, 6, 14), product: 'r8-essay-forecast', sub: '出る6テーマ×専門' },
  },
  'pe-construction': {
    bg: '/images/cta-bg/pe-construction.webp',
    themeVar: '--exam-pe-construction',
    qual: '技術士 建設部門',
    mokuji: { url: 'https://note.com/dobokunote/n/n7279ca0d926f', title1: 'note教材', title2: 'もくじ・まとめ', sub: '必須I・選択科目 模範解答' },
    seasonal: { switchUtcMs: Date.UTC(2026, 6, 14), product: 'pe-construction-required-magazine', sub: 'R03-R07＋R8予想' },
  },
};

export type ResolvedHubCta = {
  mode: 'product' | 'mokuji';
  bg: string;
  themeVar: string;
  qual: string;
  title1: string;
  title2: string;
  sub: string;
  price?: string | undefined;
  cta: string;
  url: string;
  trackLabel: string;
};

function appendUtm(base: string, utmContent: string): string {
  const params = new URLSearchParams({
    utm_source: 'doboku-note',
    utm_medium: 'referral',
    utm_campaign: 'note-magazine',
    utm_content: utmContent,
  });
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}${params.toString()}`;
}

export function resolveHubCta(category: string): ResolvedHubCta | null {
  const spec = HUB[category];
  if (!spec) return null;

  // 直前期（試験の 6 週間前〜試験日）だけ売れ筋の特定商品へ直リンク。それ以外はもくじへ集約。
  const PRE_EXAM_WINDOW_MS = 42 * 24 * 60 * 60 * 1000; // 6 週間
  const now = Date.now();
  if (spec.seasonal && now >= spec.seasonal.switchUtcMs - PRE_EXAM_WINDOW_MS && now < spec.seasonal.switchUtcMs) {
    const mag = getMagazine(spec.seasonal.product);
    if (mag) {
      const utm = `category-${category}-hub-seasonal`;
      return {
        mode: 'product',
        bg: spec.bg,
        themeVar: spec.themeVar,
        qual: spec.qual,
        title1: mag.shortTitle ?? mag.title,
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

  // それ以外は「もくじ」へ集約（マガジンが増えても追加不要でスケール）
  const utm = `category-${category}-hub-mokuji`;
  return {
    mode: 'mokuji',
    bg: spec.bg,
    themeVar: spec.themeVar,
    qual: spec.qual,
    title1: spec.mokuji.title1,
    title2: spec.mokuji.title2,
    sub: spec.mokuji.sub,
    cta: '教材一覧を見る',
    url: appendUtm(spec.mokuji.url, utm),
    trackLabel: utm,
  };
}
