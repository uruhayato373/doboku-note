/**
 * 法令と横断テーマ（分野・立場）の多対多の配線（content-taxonomy.md §6-3）。
 *
 * 記事が本文で引く法令（記事メタの lawIds・build-doc-meta-index が e-Gov へのリンクから入れる）と、記事が属すテーマから、
 * 「この法令が関わるテーマ」（記事末の根拠法令のカード）と「このテーマの法令」（テーマのページ）と
 * 「法令と分野の対応」（法令・制度の軸のテーマのページ）を作る。数え方は src/lib/law-topic-core.mjs（週次の報告と同じ）。
 * 法令名は e-Gov 法令 API の写し config/egov-laws.json。法令ごとのページ（/laws/）は説明を人が書いてから（DN-0731）なので、
 * 法令名の行き先は e-Gov、回遊は記事とテーマのページで受ける。
 */
import egovLaws from '../../config/egov-laws.json';
import { getAllDocsMeta, type DocMeta } from '@/lib/docs';
import { isCareerDoc } from '@/lib/doc-classifier';
import { getDocTopics, getTopicBySlug, type Topic } from '@/lib/topics';
import { toWired, type WiredDoc } from '@/lib/article-end-wiring';
import { EGOV_LAW_BASE } from '@/lib/egov-links.mjs';
import { lawTopicIndex, lawsOfTopic, topicsOfLaw } from '@/lib/law-topic-core.mjs';

const LAWS = egovLaws.laws as Record<string, { title: string }>;

export type LawTopicLink = { slug: string; label: string; count: number };
export type TopicLaw = { lawId: string; title: string; url: string; count: number; picks: WiredDoc[] };
export type LawDirectoryRow = { lawId: string; title: string; url: string; count: number; topics: LawTopicLink[] };

// 記事の一覧に出す記事と同じ母集団（模範論文・カテゴリ非表示を除く）。ビルド中に何度も引くので 1 回だけ作る
let pool: DocMeta[] | null = null;
let index: Map<string, Map<string, string[]>> | null = null;
function getPool(): DocMeta[] {
  pool ??= getAllDocsMeta().filter((d) => d.published !== false && !d.tags?.includes('模範論文') && !d.hideFromCategory);
  return pool;
}
function getIndex(): Map<string, Map<string, string[]>> {
  index ??= lawTopicIndex(getPool(), (doc) => getDocTopics(doc as DocMeta).map((t) => t.slug));
  return index;
}
const lawUrl = (lawId: string) => `${EGOV_LAW_BASE}${lawId}`;
function toLinks(rows: { slug: string; count: number }[]): LawTopicLink[] {
  return rows.flatMap(({ slug, count }) => {
    const topic = getTopicBySlug(slug);
    return topic ? [{ slug, label: topic.label, count }] : [];
  });
}

/** 法令が関わるテーマ（そのテーマの記事のうち 2 本以上が引く。引く記事の多い順） */
function getLawTopicLinks(lawId: string, limit = 3): LawTopicLink[] {
  return toLinks(topicsOfLaw(getIndex(), lawId, { limit }));
}

/** 記事末の根拠法令のカード用: 法令 ID → 関わるテーマ */
export function resolveLawTopics(lawIds: readonly string[], limit = 3): Map<string, LawTopicLink[]> {
  const out = new Map<string, LawTopicLink[]>();
  for (const lawId of lawIds) {
    const links = getLawTopicLinks(lawId, limit);
    if (links.length) out.set(lawId, links);
  }
  return out;
}

/**
 * テーマの記事が引く法令（2 本以上が引くもの・多い順に limit まで）と、その法令を引くこのテーマの記事（資格が重ならないように perLaw 本）。
 */
export function getTopicLaws(topic: Topic, { limit = 8, perLaw = 3 }: { limit?: number; perLaw?: number } = {}): TopicLaw[] {
  const bySlug = new Map(getPool().map((d) => [d.slug, d]));
  return lawsOfTopic(getIndex(), topic.slug, { limit }).flatMap(({ lawId, docs }) => {
    const title = LAWS[lawId]?.title;
    if (!title) return [];
    const candidates = docs.map((s) => bySlug.get(s)).filter((d): d is DocMeta => Boolean(d) && !isCareerDoc(d as DocMeta));
    const picks: DocMeta[] = [];
    const seen = new Set<string>();
    for (const d of candidates) if (picks.length < perLaw && !seen.has(String(d.category))) { seen.add(String(d.category)); picks.push(d); }
    for (const d of candidates) if (picks.length < perLaw && !picks.includes(d)) picks.push(d);
    return [{ lawId, title, url: lawUrl(lawId), count: docs.length, picks: picks.map(toWired) }];
  });
}

/**
 * 法令と分野・立場の対応の一覧（法令・制度の軸のテーマのページ）。minDocs 本以上の記事が引く法令を、引く記事の多い順に。
 * excludeTopic（そのページのテーマ自身）は関わるテーマから外す。
 */
export function getLawDirectory({ minDocs = 3, topicsPerLaw = 4, excludeTopic }: { minDocs?: number; topicsPerLaw?: number; excludeTopic?: string } = {}): LawDirectoryRow[] {
  const counts = new Map<string, number>();
  for (const d of getPool()) for (const lawId of d.lawIds ?? []) counts.set(lawId, (counts.get(lawId) ?? 0) + 1);
  return [...counts]
    .filter(([lawId, n]) => n >= minDocs && LAWS[lawId])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([lawId, count]) => ({
      lawId, title: LAWS[lawId]?.title ?? lawId, url: lawUrl(lawId), count,
      topics: getLawTopicLinks(lawId, topicsPerLaw + 1).filter((t) => t.slug !== excludeTopic).slice(0, topicsPerLaw),
    }));
}
