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
  // 法令ページ（category: laws・DN-0731）と計画・施策の台帳（制度の地図）は、e-Gov の法令の写しとテーマの slug を指す
  const egovLaws = readDataset(root, 'config.egov-laws').laws ?? {};
  const refSources = readDataset(root, 'config.reference-sources');
  const refList = Array.isArray(refSources) ? refSources : refSources.sources ?? [];
  const refIdOfLaw = new Map(refList.filter((s) => s.egov?.lawId).map((s) => [s.egov.lawId, s.id]));
  const lawPageOwner = new Map();
  let lawPages = 0;
  for (const [slug, m] of Object.entries(metaIndex)) {
    if (m.category !== 'laws' || m.published === false) continue;
    lawPages += 1;
    const local = slug.replace(/^laws-/, '');
    if (!m.lawId || !egovLaws[m.lawId]) { issues.push(`法令ページ ${local}: lawId「${m.lawId ?? '(なし)'}」が e-Gov の写し（config.egov-laws）に無い`); continue; }
    if (refIdOfLaw.get(m.lawId) !== local) issues.push(`法令ページ ${local}: URL は参考文献の id（${refIdOfLaw.get(m.lawId) ?? '台帳に無い'}）にする（/laws/<参考文献の id>）`);
    for (const id of [m.lawId, ...(m.lawFamily ?? [])]) {
      if (!egovLaws[id]) issues.push(`法令ページ ${local}: lawFamily「${id}」が e-Gov の写しに無い`);
      if (lawPageOwner.has(id) && lawPageOwner.get(id) !== local) issues.push(`法令 ${id} を 2 つの法令ページ（${lawPageOwner.get(id)}・${local}）が扱っている`);
      lawPageOwner.set(id, local);
    }
  }

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
    // 公開ハブは入口記事を 3 本選ぶ（無いと「はじめに読む」が記事型と更新順の機械選びになる・DN-0423）
    if (topic.status !== 'incubating' && (topic.featured ?? []).length < 3) issues.push(`${topic.slug}: 公開ハブの featured（入口記事）が ${(topic.featured ?? []).length} 本。3 本選ぶ`);
    if (new Set(topic.featured ?? []).size !== (topic.featured ?? []).length) issues.push(`${topic.slug}: featured に同じ記事が重複`);
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

  // 計画・施策の台帳はテーマの一覧（topicSlugs）を作った後に見る
  const policyRegistry = readDataset(root, 'config.policy-registry');
  for (const p of policyRegistry.policies ?? []) {
    for (const t of p.topics ?? []) if (!topicSlugs.has(t)) issues.push(`計画・施策 ${p.id}: topics「${t}」は topics.json に無い`);
    for (const id of p.basisLaws ?? []) if (!egovLaws[id]) issues.push(`計画・施策 ${p.id}: basisLaws「${id}」が e-Gov の写しに無い（参考文献の台帳に足して npm run egov-laws -- --sync）`);
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
      lawPages,
      policies: (policyRegistry.policies ?? []).length,
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
