/**
 * law-topic-core — 法令と横断テーマ（分野・立場）の多対多の対応（content-taxonomy.md §6-3）。
 *
 * 記事が本文の e-Gov へのリンクで引く法令（記事メタの lawIds）と、記事が属すテーマ（topic-membership.mjs）を掛け合わせ、
 * 「この法令はどのテーマの記事が引くか」「このテーマの記事はどの法令を引くか」を数える。法令はタグにしない（05_IA「法令ページ」）。
 * サイト（src/lib/law-wiring.ts）と週次の報告（report-taxonomy-wiring）が同じ関数を使う。I/O と import を持たない。
 */

/** 法令とテーマを結ぶのに要る、そのテーマの記事のうちその法令を引く本数（1 本だけの偶然の重なりでは結ばない） */
export const MIN_LAW_TOPIC_DOCS = 2;

/**
 * 法令 → テーマ → 引く記事の slug。
 * @param {Array<{ slug: string, lawIds?: string[], published?: boolean }>} docs
 * @param {(doc: object) => string[]} topicsOf 記事が属すテーマの slug
 * @returns {Map<string, Map<string, string[]>>}
 */
export function lawTopicIndex(docs, topicsOf) {
  const index = new Map();
  for (const doc of docs) {
    if (doc.published === false || !Array.isArray(doc.lawIds) || doc.lawIds.length === 0) continue;
    const topics = topicsOf(doc);
    for (const lawId of doc.lawIds) {
      let byTopic = index.get(lawId);
      if (!byTopic) { byTopic = new Map(); index.set(lawId, byTopic); }
      for (const slug of topics) {
        const list = byTopic.get(slug) ?? [];
        list.push(doc.slug);
        byTopic.set(slug, list);
      }
    }
  }
  return index;
}

/**
 * 法令が関わるテーマ（そのテーマの記事のうち min 本以上が引く）。引く記事の多い順。
 * @returns {Array<{ slug: string, count: number }>}
 */
export function topicsOfLaw(index, lawId, { min = MIN_LAW_TOPIC_DOCS, limit = Infinity } = {}) {
  return [...(index.get(lawId) ?? new Map())]
    .map(([slug, docs]) => ({ slug, count: docs.length }))
    .filter((r) => r.count >= min)
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug))
    .slice(0, limit);
}

/**
 * テーマの記事が引く法令（min 本以上）。引く記事の多い順。
 * @returns {Array<{ lawId: string, docs: string[] }>}
 */
export function lawsOfTopic(index, topicSlug, { min = MIN_LAW_TOPIC_DOCS, limit = Infinity } = {}) {
  const out = [];
  for (const [lawId, byTopic] of index) {
    const docs = byTopic.get(topicSlug) ?? [];
    if (docs.length >= min) out.push({ lawId, docs });
  }
  return out.sort((a, b) => b.docs.length - a.docs.length || a.lawId.localeCompare(b.lawId)).slice(0, limit);
}
