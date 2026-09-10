import topicsJson from '@/config/topics.json';
import { getAllDocsMeta, type DocMeta } from '@/lib/docs';
import { getStandardDocuments, type StandardDocument } from '@/lib/standards';
import { canonicalTag } from '@/lib/content-taxonomy';

export type Topic = {
  slug: string;
  label: string;
  description: string;
  tags: string[];
  /** このカテゴリの記事は全件このテーマに属す（例: コンクリート 3 資格 → concrete）。
      タグ語彙が資格ごとに揺れて突合 0% になるカテゴリの受け皿（2026-09 監査で 6/10 カテゴリが 0% だった）。 */
  categories?: string[];
  standardKeywords: string[];
  featuredStandardRefs?: string[];
  /** 入口記事（論理 slug）。一覧の先頭に固定する。記事側は frontmatter `topics: [slug]` で明示所属もできる（content-taxonomy.md §6） */
  featured?: string[];
};

const topics = topicsJson as Topic[];

export function getAllTopics(): Topic[] {
  return topics;
}

export function getTopicBySlug(slug: string): Topic | null {
  return topics.find((topic) => topic.slug === slug) ?? null;
}

export function getTopicPathForTag(tag: string): string | null {
  const canonical = canonicalTag(tag);
  const topic = topics.find((candidate) => candidate.tags.some((t) => canonicalTag(t) === canonical));
  return topic ? `/topics/${topic.slug}` : null;
}

/** 記事がテーマに属するか（明示 `topics:` ／ カテゴリ丸ごと ／ タグ一致。タグは canonical で照合） */
export function isDocInTopic(doc: DocMeta, topic: Topic): boolean {
  if (doc.published === false) return false;
  const explicit = doc.topics;
  if (Array.isArray(explicit) && explicit.includes(topic.slug)) return true;
  if ((topic.categories ?? []).includes(String(doc.category))) return true;
  const tags = new Set(topic.tags.map(canonicalTag));
  return (doc.tags ?? []).some((tag) => tags.has(canonicalTag(tag)));
}

export function getTopicDocs(topic: Topic): DocMeta[] {
  const featured = topic.featured ?? [];
  const rank = (doc: DocMeta) => { const i = featured.indexOf(doc.slug); return i < 0 ? featured.length : i; };
  return getAllDocsMeta()
    .filter((doc) => isDocInTopic(doc, topic))
    .sort((a, b) => rank(a) - rank(b) || String(b.dateModified ?? b.updatedAt ?? '').localeCompare(String(a.dateModified ?? a.updatedAt ?? '')));
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
