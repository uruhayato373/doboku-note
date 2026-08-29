import topicsJson from '@/config/topics.json';
import { getAllDocsMeta, type DocMeta } from '@/lib/docs';
import { getStandardDocuments, type StandardDocument } from '@/lib/standards';

export type Topic = {
  slug: string;
  label: string;
  description: string;
  tags: string[];
  standardKeywords: string[];
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
  return getAllDocsMeta()
    .filter((doc) => doc.published !== false && doc.tags?.some((tag) => tags.has(tag)))
    .sort((a, b) => String(b.dateModified ?? b.updatedAt ?? '').localeCompare(String(a.dateModified ?? a.updatedAt ?? '')));
}

export function getTopicStandards(topic: Topic): StandardDocument[] {
  return getStandardDocuments().filter((document) =>
    topic.standardKeywords.some((keyword) => document.title.includes(keyword)),
  );
}
