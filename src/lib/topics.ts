import topicsJson from '@/config/topics.json';
import taxonomyJson from '@/config/content-taxonomy.json';
import { getAllDocsMeta, type DocMeta } from '@/lib/docs';
import { getStandardDocuments, type StandardDocument } from '@/lib/standards';
import { canonicalTag } from '@/lib/content-taxonomy';
import { topicsOfDoc } from '@/lib/topic-membership.mjs';

/** テーマの軸（content-taxonomy.json の topicFacets）。分野・工種／施工管理・マネジメント／法令・制度／読み手・立場 */
export type TopicFacet = 'field' | 'management' | 'law' | 'audience';
/** hub＝昇格基準を満たす公開ハブ（検索に出す）／incubating＝育成中（noindex・サイトマップ外。リンクは出す） */
type TopicStatus = 'hub' | 'incubating';

export type Topic = {
  slug: string;
  label: string;
  facet: TopicFacet;
  status: TopicStatus;
  /** 検索クエリに合わせた title（無ければ label から組み立てる）。title template の suffix は含めない */
  seoTitle?: string;
  description: string;
  /** 検索需要の根拠 1 行（content-taxonomy.md §6 昇格基準 (1)）。ページには出さない */
  demandEvidence?: string;
  /** 一覧の前に置く編集リード（段落ごと）。テーマの要点・資格ごとの出方・実務での使いどころ */
  intro?: string[];
  tags: string[];
  /** このカテゴリの記事は全件このテーマに属す（例: コンクリート 3 資格 → concrete）。
      タグ語彙が資格ごとに揺れて突合 0% になるカテゴリの受け皿（2026-09 監査で 6/10 カテゴリが 0% だった）。 */
  categories?: string[];
  standardKeywords: string[];
  featuredStandardRefs?: string[];
  /** 入口記事（論理 slug）。一覧の先頭に固定する。記事側は frontmatter `topics: [slug]` で明示所属もできる（content-taxonomy.md §6） */
  featured?: string[];
  /** このテーマ（分野・立場）に合う有料教材（config/products.json の note の id・並べる順）。テーマのページの「このテーマの有料教材」に出す。
      公開中でないものは getMagazine が落とす（check-topic-wiring が id の実在を、report-taxonomy-wiring が非公開を見る） */
  products?: string[];
};

const topics = topicsJson as Topic[];
const facets = (taxonomyJson as { topicFacets: Record<TopicFacet, { label: string }> }).topicFacets;

export function getAllTopics(): Topic[] {
  return topics;
}

/** 軸ごとのテーマ（content-taxonomy.json の topicFacets の順）。/topics の一覧が使う */
export function getTopicsByFacet(): { facet: TopicFacet; label: string; topics: Topic[] }[] {
  return (Object.keys(facets) as TopicFacet[])
    .map((facet) => ({ facet, label: facets[facet].label, topics: topics.filter((topic) => topic.facet === facet) }))
    .filter(({ topics: list }) => list.length > 0);
}

/** 検索に出すテーマか（育成中は noindex。content-taxonomy.md §6） */
export function isTopicIndexable(topic: Topic): boolean {
  return topic.status === 'hub';
}

export function getTopicBySlug(slug: string): Topic | null {
  return topics.find((topic) => topic.slug === slug) ?? null;
}

export function getTopicPathForTag(tag: string): string | null {
  const canonical = canonicalTag(tag);
  const topic = topics.find((candidate) => candidate.tags.some((t) => canonicalTag(t) === canonical));
  return topic ? `/topics/${topic.slug}` : null;
}

// 記事 → 所属テーマの slug。判定は検査・報告と同じ src/lib/topic-membership.mjs。ビルド中は全記事で何度も引くので slug で覚える
const docTopicCache = new Map<string, string[]>();

/** 記事が属するテーマ（明示 `topics:` → カテゴリ丸ごと → タグ一致の順） */
export function getDocTopics(doc: DocMeta): Topic[] {
  let slugs = docTopicCache.get(doc.slug);
  if (!slugs) {
    slugs = topicsOfDoc(doc, topics, canonicalTag);
    docTopicCache.set(doc.slug, slugs);
  }
  return slugs.map((slug) => topics.find((topic) => topic.slug === slug)).filter((topic): topic is Topic => Boolean(topic));
}

function isDocInTopic(doc: DocMeta, topic: Topic): boolean {
  return getDocTopics(doc).some((t) => t.slug === topic.slug);
}

export function getTopicDocs(topic: Topic): DocMeta[] {
  const featured = topic.featured ?? [];
  const rank = (doc: DocMeta) => { const i = featured.indexOf(doc.slug); return i < 0 ? featured.length : i; };
  return getAllDocsMeta()
    .filter((doc) => isDocInTopic(doc, topic))
    .sort((a, b) => rank(a) - rank(b) || String(b.dateModified ?? b.updatedAt ?? '').localeCompare(String(a.dateModified ?? a.updatedAt ?? '')));
}

/**
 * 記事をよく共有するテーマ（テーマページの「関連するテーマ」）。共有する記事の数の多い順。
 * 同じ記事に 2 つのテーマが付いていれば、読み手はもう片方も探しに行く、という考え方。
 */
export function getRelatedTopics(topic: Topic, limit = 4): { topic: Topic; shared: number }[] {
  const shared = new Map<string, number>();
  for (const doc of getTopicDocs(topic)) {
    for (const other of getDocTopics(doc)) {
      if (other.slug !== topic.slug) shared.set(other.slug, (shared.get(other.slug) ?? 0) + 1);
    }
  }
  return [...shared.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([slug, count]) => ({ topic: getTopicBySlug(slug)!, shared: count }));
}

/**
 * 資格（カテゴリ）の記事が属すテーマ（資格のハブの「テーマから探す」）。この資格の記事が minDocs 本以上あるテーマを、
 * この資格の記事の多い順に。資格 → テーマの向きの回遊（記事 → テーマは記事末の「この記事のテーマ」）。
 */
export function getTopicsForCategory(docs: DocMeta[], minDocs = 1): { topic: Topic; inCategory: number; total: number }[] {
  const counts = new Map<string, number>();
  for (const doc of docs) for (const topic of getDocTopics(doc)) counts.set(topic.slug, (counts.get(topic.slug) ?? 0) + 1);
  return topics
    .filter((topic) => (counts.get(topic.slug) ?? 0) >= minDocs)
    .map((topic) => ({ topic, inCategory: counts.get(topic.slug) ?? 0, total: getTopicDocs(topic).length }))
    .sort((a, b) => b.inCategory - a.inCategory || a.topic.slug.localeCompare(b.topic.slug));
}

export function getTopicStandards(topic: Topic): StandardDocument[] {
  const featured = new Set(topic.featuredStandardRefs ?? []);
  return getStandardDocuments().filter((document) => {
    const ref = `${document.agencyId}/${document.documentId}`;
    return featured.has(ref) || topic.standardKeywords.some((keyword) => document.title.includes(keyword));
  });
}

export function getTopicsForStandardDocument(document: StandardDocument): Topic[] {
  const ref = `${document.agencyId}/${document.documentId}`;
  return topics.filter((topic) =>
    topic.featuredStandardRefs?.includes(ref)
    || topic.standardKeywords.some((keyword) => document.title.includes(keyword)),
  );
}

export function getTopicsForStandardText(document: StandardDocument, text: string): Topic[] {
  const searchable = `${document.title}\n${text}`;
  return topics.filter((topic) =>
    topic.standardKeywords.some((keyword) => searchable.includes(keyword)),
  );
}
