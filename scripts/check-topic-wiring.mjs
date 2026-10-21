#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import matter from 'gray-matter';
import { pathToFileURL } from 'node:url';
import { buildAliasMap, normalizeTags } from './lib/content-taxonomy.mjs';
import { topicsOfDoc } from '../src/lib/topic-membership.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

// 地方 10 機関＋本省（2026-10-14 に施工管理基準の本省版を追加・DN-0393）
const EXPECTED_AGENCIES = [
  'chubu', 'chugoku', 'hokkaido', 'hokuriku', 'kanto',
  'kinki', 'kyushu', 'mlit', 'okinawa', 'shikoku', 'tohoku',
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

export function auditTopicWiring(root = REPO_ROOT) {
  const topics = JSON.parse(readFileSync(join(root, 'src/config/topics.json'), 'utf8'));
  // タグは canonical（tags.json）で照合する。記事の別名綴りは build 時に正規化されるため、ここでも同じ正規化を通す
  const aliasMap = buildAliasMap(JSON.parse(readFileSync(join(root, 'src/config/tags.json'), 'utf8')));
  const canon = (tag) => aliasMap.toCanonical.get(tag) ?? tag;
  const catalog = JSON.parse(readFileSync(join(root, 'content/site/standards-library/catalog.json'), 'utf8'));
  const issues = [];
  const topicSlugs = new Set();
  const topicTags = new Map();
  const documentRefs = new Set(catalog.documents.map((document) => `${document.agencyId}/${document.documentId}`));
  // featured（入口記事）は公開中の記事を指す。消した・非公開にした記事が先頭に残ると一覧から黙って消える
  const metaIndex = JSON.parse(readFileSync(join(root, 'src/config/doc-meta-index.json'), 'utf8')).docs ?? {};
  // products（このテーマの有料教材）は note の商品の正本にある id を指す。打ち間違いはページから黙って消える
  const productList = readDataset(root, 'config.products');
  const noteProductIds = new Set((Array.isArray(productList) ? productList : productList.products ?? []).filter((p) => p.channel === 'note').map((p) => p.id));

  for (const topic of topics) {
    if (!topic.slug || topicSlugs.has(topic.slug)) issues.push(`topic slug が空または重複: ${topic.slug || '(empty)'}`);
    topicSlugs.add(topic.slug);
    if (!Array.isArray(topic.tags) || topic.tags.length === 0) issues.push(`${topic.slug}: tags が空`);
    if (!Array.isArray(topic.standardKeywords) || topic.standardKeywords.length === 0) issues.push(`${topic.slug}: standardKeywords が空`);

    for (const rawTag of topic.tags ?? []) {
      const tag = canon(rawTag);
      if (topicTags.has(tag) && topicTags.get(tag) !== topic.slug) issues.push(`tag が複数topicに重複: ${tag} (${topicTags.get(tag)}, ${topic.slug})`);
      topicTags.set(tag, topic.slug);
    }
    for (const t of topic.featured ?? []) {
      if (typeof t !== 'string' || !t) issues.push(`${topic.slug}: featured に空の slug`);
      else if (!metaIndex[t] || metaIndex[t].published === false) issues.push(`${topic.slug}: featured「${t}」は公開中の記事に無い`);
      else if (!topicsOfDoc({ ...metaIndex[t], tags: (metaIndex[t].tags ?? []).map(canon) }, [topic], canon).length) issues.push(`${topic.slug}: featured「${t}」はこのテーマに属さない（タグか topics: を付ける）`);
    }
    for (const id of topic.products ?? []) {
      if (!noteProductIds.has(id)) issues.push(`${topic.slug}: products「${id}」は商品の正本（config.products）の note の商品に無い`);
    }
    for (const ref of topic.featuredStandardRefs ?? []) {
      if (!documentRefs.has(ref)) issues.push(`${topic.slug}: 存在しない featuredStandardRefs: ${ref}`);
    }
  }

  const agencyIds = catalog.agencies.map((agency) => agency.agencyId).sort();
  if (JSON.stringify(agencyIds) !== JSON.stringify(EXPECTED_AGENCIES)) {
    issues.push(`公開機関が SSOT（地方 10 機関＋本省）と不一致: ${agencyIds.join(', ')}`);
  }
  if (catalog.totals.agencies !== EXPECTED_AGENCIES.length || catalog.agencies.length !== EXPECTED_AGENCIES.length) {
    issues.push(`公開機関数が${EXPECTED_AGENCIES.length}でない: totals=${catalog.totals.agencies}, entries=${catalog.agencies.length}`);
  }

  const practiceRoot = join(root, 'content/site/civil-practice');
  let publishedGuides = 0;
  let guidesWithTopic = 0;
  for (const file of findMdxFiles(practiceRoot)) {
    const { data } = matter(readFileSync(file, 'utf8'));
    if (data.published === false || data.group !== 'guide') continue;
    publishedGuides += 1;
    const tags = normalizeTags(data.tags, aliasMap).tags;
    const explicit = Array.isArray(data.topics) ? data.topics : [];
    for (const t of explicit) if (!topicSlugs.has(t)) issues.push(`${relative(root, file)}: topics「${t}」は topics.json に無い`);
    if (topicsOfDoc({ category: data.category, tags, topics: data.topics }, topics, canon).length) guidesWithTopic += 1;
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = auditTopicWiring();
  console.log('Topic・基準資料・実務ガイド配線チェック');
  console.log(JSON.stringify(result.summary, null, 2));
  if (result.issues.length > 0) {
    console.error(`FAIL: ${result.issues.length}件`);
    result.issues.forEach((issue) => console.error(`- ${issue}`));
    process.exit(1);
  }
  console.log(`PASS: 全公開実務ガイドがtopicへ接続され、全${EXPECTED_AGENCIES.length}機関と基準資料参照が解決できます。`);
}
