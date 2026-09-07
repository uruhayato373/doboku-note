#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import {
  buildStandardChapterStructuredData,
  buildStandardDocumentStructuredData,
  MLIT_TERMS_URL,
  PUBLIC_DATA_LICENSE_URL,
  standardsDataPath,
} from '../src/lib/standards-structured-data';
import { inferStandardEdition } from '../src/lib/standards-comparison';
import type { StandardChapter, StandardArticlesManifest } from '../src/lib/standards-articles';
import type { StandardDocument, StandardsCatalog } from '../src/lib/standards';

const ROOT = process.cwd();
const PUBLIC_ROOT = resolve(ROOT, 'public');
const OUTPUT_ROOT = resolve(PUBLIC_ROOT, 'standards-data');
const ARTICLES_ROOT = join(ROOT, 'content', 'site', 'standards-articles');
const CATALOG_PATH = join(ROOT, 'content', 'site', 'standards-library', 'catalog.json');
const COMPARISON_PATH = join(ARTICLES_ROOT, 'comparison.json');

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function writeText(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value.replace(/\r\n/gu, '\n'), 'utf8');
}

function writeJson(path: string, value: unknown): void {
  writeText(path, `${JSON.stringify(value, null, 2)}\n`);
}

function cleanOutputRoot(): void {
  const expectedPrefix = `${PUBLIC_ROOT}${sep}`;
  if (!OUTPUT_ROOT.startsWith(expectedPrefix) || OUTPUT_ROOT === PUBLIC_ROOT) {
    throw new Error(`出力先が public/ 配下に固定されていません: ${OUTPUT_ROOT}`);
  }
  rmSync(OUTPUT_ROOT, { recursive: true, force: true });
  mkdirSync(OUTPUT_ROOT, { recursive: true });
}

function listArticleManifests(): Array<{ path: string; manifest: StandardArticlesManifest }> {
  const results: Array<{ path: string; manifest: StandardArticlesManifest }> = [];
  for (const agency of readdirSync(ARTICLES_ROOT, { withFileTypes: true })) {
    if (!agency.isDirectory()) continue;
    const agencyRoot = join(ARTICLES_ROOT, agency.name);
    for (const document of readdirSync(agencyRoot, { withFileTypes: true })) {
      if (!document.isDirectory()) continue;
      const path = join(agencyRoot, document.name, 'manifest.json');
      if (existsSync(path)) results.push({ path, manifest: readJson<StandardArticlesManifest>(path) });
    }
  }
  return results.sort((a, b) =>
    `${a.manifest.agencyId}/${a.manifest.documentId}`.localeCompare(
      `${b.manifest.agencyId}/${b.manifest.documentId}`,
    ),
  );
}

function stripGeneratedComment(markdown: string): string {
  return markdown.replace(/^\{\/\*[\s\S]*?\*\/\}\s*/u, '');
}

function markdownToPlainText(lines: string[]): string {
  return lines
    .filter((line) => !line.trim().startsWith('<SourceRef '))
    .map((line) =>
      line
        .replace(/^#{1,6}\s+/u, '')
        .replace(/!\[([^\]]*)\]\([^)]*\)/gu, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/gu, '$1')
        .replace(/[*_`]/gu, '')
        .replace(/<[^>]+>/gu, '')
        .trimEnd(),
    )
    .join('\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
}

function extractArticleText(markdown: string): ReadonlyMap<string, string> {
  const articleText = new Map<string, string>();
  let currentNumber: string | null = null;
  let currentLines: string[] = [];

  const finish = () => {
    if (!currentNumber) return;
    const text = markdownToPlainText(currentLines);
    if (text) articleText.set(currentNumber, text);
    currentNumber = null;
    currentLines = [];
  };

  for (const line of stripGeneratedComment(markdown).split(/\r?\n/u)) {
    const article = line.match(/^###\s+(\d+-\d+-\d+-\d+)\s+/u);
    if (article) {
      finish();
      currentNumber = article[1] ?? null;
      continue;
    }
    if (/^##\s+/u.test(line)) {
      finish();
      continue;
    }
    if (currentNumber) currentLines.push(line);
  }
  finish();
  return articleText;
}

function exportMarkdown(
  document: StandardDocument,
  chapter: StandardChapter,
  markdown: string,
): string {
  const sourceUrl = document.sourceUrl ?? document.landing;
  const frontmatter = [
    '---',
    `title: ${JSON.stringify(chapter.title)}`,
    `agency: ${JSON.stringify(document.agencyName)}`,
    `edition: ${JSON.stringify(inferStandardEdition(document.title, document.edition))}`,
    `source: ${JSON.stringify(sourceUrl)}`,
    `sourceSha256: ${JSON.stringify(document.sourceSha256)}`,
    `chapterSha256: ${JSON.stringify(chapter.outputSha256)}`,
    `sourcePages: ${JSON.stringify(`${chapter.firstPage}-${chapter.lastPage}`)}`,
    `license: ${JSON.stringify(PUBLIC_DATA_LICENSE_URL)}`,
    `processedBy: ${JSON.stringify('doboku-note')}`,
    '---',
    '',
    `# ${chapter.title}`,
    '',
    '> 出典資料をdoboku-noteが検索・閲覧・機械利用向けに構造化した加工データです。実務では発行機関の最新版原本を確認してください。',
    '',
  ].join('\n');
  return `${frontmatter}\n${stripGeneratedComment(markdown).trim()}\n`;
}

function documentIndex(
  document: StandardDocument,
  manifest: StandardArticlesManifest,
): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: `${document.agencyId}/${document.documentId}`,
    title: document.title,
    edition: inferStandardEdition(document.title, document.edition),
    agency: { id: document.agencyId, name: document.agencyName },
    source: {
      landingUrl: document.landing,
      documentUrl: document.sourceUrl,
      sha256: document.sourceSha256,
      pages: document.pages,
      publisher: document.agencyName,
      terms: MLIT_TERMS_URL,
    },
    processing: {
      publisher: 'doboku-note',
      notice: '原本を編・章・節・条へ構造化した加工データ',
      license: PUBLIC_DATA_LICENSE_URL,
      quality: manifest.audit,
      reviewStatus: manifest.chapters.every((chapter) => chapter.reviewStatus === 'clean')
        ? 'clean'
        : 'needs-review',
    },
    indexable: manifest.indexable,
    indexableReason: manifest.indexableReason,
    chapters: manifest.chapters.map((chapter) => ({
      id: chapter.chapterId,
      title: chapter.title,
      html: `https://doboku-note.com/standards/${document.agencyId}/${document.documentId}/chapters/${chapter.chapterId}`,
      markdown: `https://doboku-note.com${standardsDataPath(document, chapter, 'md')}`,
      jsonLd: `https://doboku-note.com${standardsDataPath(document, chapter, 'jsonld')}`,
      sourcePages: [chapter.firstPage, chapter.lastPage],
      sourceSha256: chapter.sourceSha256,
      outputSha256: chapter.outputSha256,
      sections: chapter.sections.length,
      articles: chapter.stats.articles ?? 0,
    })),
  };
}

function listFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function main(): void {
  const catalog = readJson<StandardsCatalog>(CATALOG_PATH);
  const comparison = readJson<unknown>(COMPARISON_PATH);
  const manifests = listArticleManifests();
  cleanOutputRoot();

  let chapterCount = 0;
  let articleCount = 0;
  for (const { manifest } of manifests) {
    const document = catalog.documents.find(
      (entry) => entry.agencyId === manifest.agencyId && entry.documentId === manifest.documentId,
    );
    if (!document) throw new Error(`catalog に文書がありません: ${manifest.agencyId}/${manifest.documentId}`);
    const documentRoot = join(OUTPUT_ROOT, document.agencyId, document.documentId);
    writeJson(join(documentRoot, 'index.json'), documentIndex(document, manifest));
    writeJson(
      join(documentRoot, 'index.jsonld'),
      buildStandardDocumentStructuredData(document, manifest.chapters.length),
    );

    for (const chapter of manifest.chapters) {
      const markdownPath = join(ARTICLES_ROOT, document.agencyId, document.documentId, chapter.file);
      const markdown = readFileSync(markdownPath, 'utf8');
      const dataUrls = {
        markdown: standardsDataPath(document, chapter, 'md'),
        jsonLd: standardsDataPath(document, chapter, 'jsonld'),
      };
      const chapterRoot = join(documentRoot, 'chapters');
      writeText(join(chapterRoot, `${chapter.chapterId}.md`), exportMarkdown(document, chapter, markdown));
      const articleText = extractArticleText(markdown);
      writeJson(
        join(chapterRoot, `${chapter.chapterId}.jsonld`),
        buildStandardChapterStructuredData(document, chapter, dataUrls, articleText),
      );
      chapterCount += 1;
      articleCount += articleText.size;
    }
  }

  const publicCatalog = {
    schemaVersion: 1,
    asOf: catalog.asOf,
    license: PUBLIC_DATA_LICENSE_URL,
    processingOrganization: 'doboku-note',
    totals: catalog.totals,
    formats: ['text/html', 'text/markdown', 'application/ld+json'],
    documents: catalog.documents.map((document) => {
      const structured = manifests.some(
        ({ manifest }) =>
          manifest.agencyId === document.agencyId && manifest.documentId === document.documentId,
      );
      return {
        id: `${document.agencyId}/${document.documentId}`,
        agency: document.agencyName,
        title: document.title,
        edition: inferStandardEdition(document.title, document.edition),
        pages: document.pages,
        sourceUrl: document.sourceUrl ?? document.landing,
        sourceSha256: document.sourceSha256,
        html: `https://doboku-note.com/standards/${document.agencyId}/${document.documentId}`,
        ...(structured
          ? { dataIndex: `https://doboku-note.com/standards-data/${document.agencyId}/${document.documentId}/index.json` }
          : {}),
      };
    }),
  };
  writeJson(join(OUTPUT_ROOT, 'catalog.json'), publicCatalog);
  writeJson(join(OUTPUT_ROOT, 'comparison.json'), comparison);

  const files = listFiles(OUTPUT_ROOT);
  const totalBytes = files.reduce((sum, path) => sum + statSync(path).size, 0);
  writeJson(join(OUTPUT_ROOT, 'manifest.json'), {
    schemaVersion: 1,
    asOf: catalog.asOf,
    documents: manifests.length,
    chapters: chapterCount,
    articles: articleCount,
    files: files.length + 1,
    bytes: totalBytes,
    license: PUBLIC_DATA_LICENSE_URL,
  });

  console.log(
    `[standards-data] ${manifests.length}文書 / ${chapterCount}章 / ${articleCount}条 / ${(totalBytes / 1024 / 1024).toFixed(1)} MiB`,
  );
  console.log(`[standards-data] output: ${OUTPUT_ROOT}`);
}

main();
