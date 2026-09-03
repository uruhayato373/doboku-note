import topicsJson from '@/config/topics.json';
import { getAllDocsMeta, type DocMeta } from '@/lib/docs';
import { getStandardDocuments, type StandardDocument } from '@/lib/standards';

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
};

const topics = topicsJson as Topic[];

export function getAllTopics(): Topic[] {
  return topics;
}

export function getTopicBySlug(slug: string): Topic | null {
  return topics.find((topic) => topic.slug === slug) ?? null;
}

export function getTopicPathForTag(tag: string): string | null {
  const topic = topics.find((candidate) => candidate.tags.includes(tag));
  return topic ? `/topics/${topic.slug}` : null;
}

export function getTopicDocs(topic: Topic): DocMeta[] {
  const tags = new Set(topic.tags);
  const categories = new Set(topic.categories ?? []);
  return getAllDocsMeta()
    .filter(
      (doc) =>
        doc.published !== false &&
        (categories.has(String(doc.category)) || doc.tags?.some((tag) => tags.has(tag))),
    )
    .sort((a, b) => String(b.dateModified ?? b.updatedAt ?? '').localeCompare(String(a.dateModified ?? a.updatedAt ?? '')));
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
