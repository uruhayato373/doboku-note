import popularData from '@/config/popular-pages.json';
import { type DocMeta } from '@/lib/docs';

interface PopularPage {
  slug: string;
  activeUsers: number;
  sessions: number;
}
interface PopularData {
  window: { start: string | null; end: string | null } | null;
  generatedFrom: string | null;
  pages: PopularPage[];
}

const data = popularData as PopularData;

/** GA4 集計窓（直近 28 日・scripts/build-popular-pages.mjs が ga4-page スナップショットから生成）。表示ラベル用。 */
export const popularWindow = data.window;

export interface PopularDoc {
  doc: DocMeta;
  activeUsers: number;
  rank: number;
}

/**
 * 渡された docs（カテゴリ内の公開記事）を GA4 activeUsers 降順に並べ、上位 limit 件を返す。
 * popular-pages.json に出現しない記事は除外（＝計測実績のある記事のみランク）。
 * データ未生成・該当なしの場合は空配列（呼び出し側で graceful 非表示）。
 */
export function getPopularDocs(docs: DocMeta[], limit: number): PopularDoc[] {
  const orderBySlug = new Map(data.pages.map((p, i) => [p.slug, { activeUsers: p.activeUsers, order: i }]));
  return docs
    .map((doc) => {
      const hit = doc.slug ? orderBySlug.get(doc.slug) : undefined;
      return hit ? { doc, activeUsers: hit.activeUsers, order: hit.order } : null;
    })
    .filter((x): x is { doc: DocMeta; activeUsers: number; order: number } => x !== null)
    .sort((a, b) => a.order - b.order)
    .slice(0, limit)
    .map((x, i) => ({ doc: x.doc, activeUsers: x.activeUsers, rank: i + 1 }));
}
