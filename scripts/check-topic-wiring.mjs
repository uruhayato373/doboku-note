#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import matter from 'gray-matter';

const EXPECTED_AGENCIES = [
  'chubu', 'chugoku', 'hokkaido', 'hokuriku', 'kanto',
  'kinki', 'kyushu', 'okinawa', 'shikoku', 'tohoku',
];

function findMdxFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...findMdxFiles(path));
    else if (entry.endsWith('.mdx')) files.push(path);
  }
  return files;
}

export function auditTopicWiring(root = process.cwd()) {
  const topics = JSON.parse(readFileSync(join(root, 'src/config/topics.json'), 'utf8'));
  const catalog = JSON.parse(readFileSync(join(root, 'content/site/standards-library/catalog.json'), 'utf8'));
  const issues = [];
  const topicSlugs = new Set();
  const topicTags = new Map();
  const documentRefs = new Set(catalog.documents.map((document) => `${document.agencyId}/${document.documentId}`));

  for (const topic of topics) {
    if (!topic.slug || topicSlugs.has(topic.slug)) issues.push(`topic slug が空または重複: ${topic.slug || '(empty)'}`);
    topicSlugs.add(topic.slug);
    if (!Array.isArray(topic.tags) || topic.tags.length === 0) issues.push(`${topic.slug}: tags が空`);
    if (!Array.isArray(topic.standardKeywords) || topic.standardKeywords.length === 0) issues.push(`${topic.slug}: standardKeywords が空`);

    for (const tag of topic.tags ?? []) {
      if (topicTags.has(tag)) issues.push(`tag が複数topicに重複: ${tag} (${topicTags.get(tag)}, ${topic.slug})`);
      topicTags.set(tag, topic.slug);
    }
    for (const ref of topic.featuredStandardRefs ?? []) {
      if (!documentRefs.has(ref)) issues.push(`${topic.slug}: 存在しない featuredStandardRefs: ${ref}`);
    }
  }

  const agencyIds = catalog.agencies.map((agency) => agency.agencyId).sort();
  if (JSON.stringify(agencyIds) !== JSON.stringify(EXPECTED_AGENCIES)) {
    issues.push(`公開機関が10地方機関SSOTと不一致: ${agencyIds.join(', ')}`);
  }
  if (catalog.totals.agencies !== 10 || catalog.agencies.length !== 10) {
    issues.push(`公開機関数が10でない: totals=${catalog.totals.agencies}, entries=${catalog.agencies.length}`);
  }

  const practiceRoot = join(root, 'content/site/civil-practice');
  let publishedGuides = 0;
  let guidesWithTopic = 0;
  for (const file of findMdxFiles(practiceRoot)) {
    const { data } = matter(readFileSync(file, 'utf8'));
    if (data.published === false || data.group !== 'guide') continue;
    publishedGuides += 1;
    const tags = Array.isArray(data.tags) ? data.tags : [];
    if (tags.some((tag) => topicTags.has(tag))) guidesWithTopic += 1;
    else issues.push(`${relative(root, file)}: 公開実務ガイドにtopic接続タグがない`);
  }

  return {
    issues,
    summary: {
      topics: topics.length,
      mappedTags: topicTags.size,
      agencies: catalog.agencies.length,
      documents: catalog.documents.length,
      publishedGuides,
      guidesWithTopic,
    },
  };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const result = auditTopicWiring();
  console.log('Topic・基準資料・実務ガイド配線チェック');
  console.log(JSON.stringify(result.summary, null, 2));
  if (result.issues.length > 0) {
    console.error(`FAIL: ${result.issues.length}件`);
    result.issues.forEach((issue) => console.error(`- ${issue}`));
    process.exit(1);
  }
  console.log('PASS: 全公開実務ガイドがtopicへ接続され、全国10機関と基準資料参照が解決できます。');
}
