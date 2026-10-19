#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_ORIGIN } from './lib/site-identity.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';
import { readJson } from './lib/json-io.mjs';

const DATA_ROOT = join(ROOT, 'public', 'standards-data');
const SITE_ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function graphNode(graph, type) {
  return graph.find((node) => node['@type'] === type || node['@type']?.includes?.(type));
}

function main() {
  assert(existsSync(DATA_ROOT), 'public/standards-data がありません。先に生成してください');
  const manifest = readJson(DATA_ROOT, 'manifest.json');
  const catalog = readJson(DATA_ROOT, 'catalog.json');
  const comparison = readJson(DATA_ROOT, 'comparison.json');
  const headers = readFileSync(join(ROOT, 'public', '_headers'), 'utf8');
  const failures = [];
  let checkedDocuments = 0;
  let checkedChapters = 0;
  let checkedArticles = 0;
  let referenceOnlyArticles = 0;

  for (const document of catalog.documents.filter((entry) => entry.dataIndex)) {
    const [agencyId, documentId] = document.id.split('/');
    const documentRoot = join(DATA_ROOT, agencyId, documentId);
    try {
      const index = readJson(documentRoot, 'index.json');
      const documentSchema = readJson(documentRoot, 'index.jsonld');
      assert(index.source.sha256 === document.sourceSha256, `${document.id}: 原本SHAがcatalogと不一致`);
      assert(index.chapters.length > 0, `${document.id}: 章が0件`);
      assert(
        graphNode(documentSchema['@graph'], 'WebPage')?.publisher?.['@id'] === SITE_ORGANIZATION_ID,
        `${document.id}: WebPage publisherがdoboku-noteでない`,
      );

      for (const chapter of index.chapters) {
        const markdownPath = join(documentRoot, 'chapters', `${chapter.id}.md`);
        const jsonLdPath = join(documentRoot, 'chapters', `${chapter.id}.jsonld`);
        assert(existsSync(markdownPath), `${document.id}/${chapter.id}: Markdownがない`);
        assert(existsSync(jsonLdPath), `${document.id}/${chapter.id}: JSON-LDがない`);
        const markdown = readFileSync(markdownPath, 'utf8');
        const schema = readJson(documentRoot, `chapters/${chapter.id}.jsonld`);
        const graph = schema['@graph'];
        const source = graphNode(graph, 'DigitalDocument');
        const article = graphNode(graph, 'TechArticle');
        const clauses = graph.filter(
          (node) => node['@type'] === 'CreativeWork' && String(node['@id']).includes('#clause-'),
        );

        assert(markdown.startsWith('---\n'), `${document.id}/${chapter.id}: frontmatterがない`);
        assert(markdown.includes(`sourceSha256: "${document.sourceSha256}"`), `${document.id}/${chapter.id}: 原本SHAがない`);
        // 原本が章名だけの章（bodyless）は見出しを持たない
        // 見出しの前には必ず空行がある（目次で切った手引き・様式集の章は見出しを持たないことがある）
        const headingLines = markdown.split('\n').map((line, index, all) => ({ line, prev: all[index - 1] })).filter(({ line }) => /^#{2,6} /.test(line));
        assert(headingLines.every(({ prev }) => prev === ''), `${document.id}/${chapter.id}: 本文見出し前の空行がない`);
        assert(source?.publisher?.['@id'] !== SITE_ORGANIZATION_ID, `${document.id}/${chapter.id}: 原資料publisherが加工主体と同一`);
        assert(article?.publisher?.['@id'] === SITE_ORGANIZATION_ID, `${document.id}/${chapter.id}: 加工記事publisherがdoboku-noteでない`);
        assert(article?.encoding?.length === 2, `${document.id}/${chapter.id}: Markdown/JSON-LD encodingが揃っていない`);
        assert(clauses.length === chapter.articles, `${document.id}/${chapter.id}: 条数が索引と不一致`);
        // 北海道版には本文を持たず「開発局独自参照」（別冊の独自規定を見よ）とだけ書かれた条がある。
        // 原本どおり本文が無いのはその形だけに限り、件数を出す（それ以外の本文なしは従来どおり失敗）。
        const referenceOnly = clauses.filter((clause) => !clause.text && /独自参照$/.test(String(clause.name)));
        referenceOnlyArticles += referenceOnly.length;
        assert(
          clauses.every((clause) => (typeof clause.text === 'string' && clause.text.length > 0) || referenceOnly.includes(clause)),
          `${document.id}/${chapter.id}: 本文なしの条がある`,
        );
        checkedChapters += 1;
        // build-standards-data の manifest.articles は本文のある条の数（本文が無い参照だけの条は数えない）
        checkedArticles += clauses.length - referenceOnly.length;
      }
      checkedDocuments += 1;
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  assert(headers.includes('/standards-data/*'), '_headersにstandards-data規則がない');
  assert(headers.includes('X-Robots-Tag: noindex, follow'), 'standards-dataのnoindexヘッダーがない');
  assert(headers.includes('Access-Control-Allow-Origin: *'), 'standards-dataのCORSヘッダーがない');
  assert(comparison.summary.changedChapters === comparison.changes.length, '地域差分の章数が不一致');
  assert(comparison.rows.some((row) => row.status === 'baseline'), '地域差分に比較基準がない');
  // 文書ごとの失敗を先に出す（件数の不一致だけでは、どの文書のどの章で落ちたかが分からない）
  if (failures.length > 0) throw new Error(failures.join('\n'));
  assert(checkedDocuments === manifest.documents, `文書数が不一致: ${checkedDocuments}/${manifest.documents}`);
  assert(checkedChapters === manifest.chapters, `章数が不一致: ${checkedChapters}/${manifest.chapters}`);
  assert(checkedArticles === manifest.articles, `条数が不一致: ${checkedArticles}/${manifest.articles}`);
  assert(statSync(join(DATA_ROOT, 'catalog.json')).size > 0, 'catalog.jsonが空');

  console.log(
    `[check-standards-data] PASS ${checkedDocuments}文書 / ${checkedChapters}章 / ${checkedArticles}条` +
      `（うち本文が「開発局独自参照」だけの条 ${referenceOnlyArticles}）`,
  );
}

main();
