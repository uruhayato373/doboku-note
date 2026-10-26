/**
 * 基準類の逐語ページ（/standards/{agency}/{document}/part-NN）の行き先（2026-10-26 に公開をやめた）。
 *
 * 逐語ページは原本をページ単位で文字起こしした照合用で、利用者には章・節ページと文書ページがあれば足りる。
 * 文字起こし（content/site/standards-library/**）はエージェントの照合用に残し、公開 URL だけを外す。
 * 行き先は 1 か所で決め、_redirects（build-public-route-redirects.ts）と記事内リンクの書き換え
 * （rewrite-standard-part-links.mjs）が同じ答えを使う。
 *
 * - 章を構造化した文書: その原本ページを含む章（節ページに分けた章は節）。含む章が無ければ文書ページ
 * - 章の無い文書: 文書ページ
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_CONTENT_ROOT } from './repository-paths.mjs';

const CATALOG = join(SITE_CONTENT_ROOT, 'standards-library', 'catalog.json');
const ARTICLES_ROOT = join(SITE_CONTENT_ROOT, 'standards-articles');

/** 逐語ページの URL（#pdf-page-N つきも可）を受ける形 */
export const PART_URL = /\/standards\/([a-z0-9-]+)\/([a-z0-9-]+)\/(part-\d+)(?:#pdf-page-(\d+))?/;

export function loadStandardsLibrary() {
  const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
  return catalog.documents.map((document) => {
    const manifestPath = join(ARTICLES_ROOT, document.agencyId, document.documentId, 'manifest.json');
    const chapters = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')).chapters : [];
    return { ...document, chapters };
  });
}

function documentPath(document) {
  return `/standards/${document.agencyId}/${document.documentId}`;
}

/** 原本のページ番号 page を含む章（節）のパス。無ければ文書ページ */
export function standardPageTarget(document, page) {
  const chapter = document.chapters.find((entry) => entry.firstPage <= page && page <= entry.lastPage);
  if (!chapter) return documentPath(document);
  const chapterPath = `${documentPath(document)}/chapters/${chapter.chapterId}`;
  if (!chapter.splitBySection) return chapterPath;
  const section = chapter.sections.find((entry) => entry.firstPage <= page && page <= entry.lastPage);
  return section ? `${chapterPath}/sections/${section.number}` : chapterPath;
}

/**
 * 逐語ページ 1 件の行き先。page を渡せばそのページ（#pdf-page-N）、無ければ分冊の先頭ページで決める。
 * 文書・分冊が台帳に無ければ null（呼び出し側が「解決できない」として扱う）。
 */
export function standardPartTarget(library, agencyId, documentId, partSlug, page) {
  const document = library.find((entry) => entry.agencyId === agencyId && entry.documentId === documentId);
  const part = document?.parts.find((entry) => entry.slug === partSlug);
  if (!document || !part) return null;
  return standardPageTarget(document, page ?? part.firstPage);
}

/** 章の無い文書の全分冊を文書ページへ送る動的ルール（1 本。章のある文書の分冊は前に置く静的ルールが先に当たる） */
export const PART_FALLBACK_RULE = '/standards/:agency/:document/part-* /standards/:agency/:document 301';

/**
 * _redirects の行。章のある文書は分冊ごとの静的ルール、章の無い文書は PART_FALLBACK_RULE 1 本にまとめる
 * （Cloudflare Pages の上限: 静的 2,000・動的 100。動的は文書ごとに 1 本だと 49 本で余裕を食う）。
 */
export function standardPartRedirectRules(library = loadStandardsLibrary()) {
  const staticRules = [];
  const dynamicRules = [];
  for (const document of library) {
    if (document.chapters.length === 0) {
      if (dynamicRules.length === 0) dynamicRules.push(PART_FALLBACK_RULE);
      continue;
    }
    for (const part of document.parts) {
      staticRules.push(`${documentPath(document)}/${part.slug} ${standardPageTarget(document, part.firstPage)} 301`);
    }
  }
  return { staticRules, dynamicRules };
}

/** 前回この生成が出した splat（入力の動的ルールとして数え直さない） */
export function isGeneratedPartRule(line) {
  const trimmed = String(line).trim().replace(/\s+/g, ' ');
  // 文書ごとの splat（2026-10-26 の初版）も前回の生成物として数え直さない
  return trimmed === PART_FALLBACK_RULE
    || /^\/standards\/[a-z0-9-]+\/[a-z0-9-]+\/part-\* \/standards\/[a-z0-9-]+\/[a-z0-9-]+ 301$/.test(trimmed);
}
