#!/usr/bin/env node
/**
 * check-standards-links — content/site の MDX から共通仕様書のページ（/standards/…）へのリンク先が実在するかを止める（DN-0879）。
 *
 * なぜ要るか: 過去問の解説から正誤の根拠になる条へ結ぶ（例: /standards/kanto/common/chapters/3-2/sections/6#3-2-6-12-コンクリート舗装工）。
 * 章番号・節番号・条番号は共通仕様書の毎年の改定で変わり、章記事は生成物なので作り直すとリンクだけが黙って切れる。
 * 既存の内部リンク検査（check-links）は /standards の独自ページを対象外にしているので、ここで見る。
 *
 * 判定（サイトのルートと同じ真実源を読む）:
 *   - /standards・/standards/compare・/standards/data … 静的ページ
 *   - /standards/{agency}・/standards/{agency}/{document} … catalog.json（src/lib/standards.ts と同じ）
 *   - …/chapters/{章} … 文書が catalog にあり、manifest に章がある（src/lib/standards-articles.ts）
 *   - …/chapters/{章}/sections/{節} … 章が splitBySection で、その節がある（節ページの generateStaticParams と同じ）
 *   - #アンカー … そのページに出る本文の見出しの ID（src/lib/heading-id.mjs・節ページは standards-section-split.mjs で切り出す）。
 *     節ページに分けた章の章ページは節の一覧だけなので、条のアンカーは付けられない
 *
 * 出力: 走査した MDX の数・/standards リンクを持つファイル数・リンク数・検査したリンク数。
 * 終了コード: 0 = 全リンク実在 / 1 = リンク切れあり、または /standards リンクを 1 本も見つけられない（検査不成立）
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO_ROOT, SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';
import { listSiteMdx } from './lib/mdx-files.mjs';
import { isCliEntry } from './lib/cli-run.mjs';
import { extractHeadings } from '../src/lib/heading-id.mjs';
import { splitChapterBySection, sectionPageMarkdown } from '../src/lib/standards-section-split.mjs';

const ARTICLES_ROOT = join(SITE_CONTENT_ROOT, 'standards-articles');
const CATALOG_PATH = join(SITE_CONTENT_ROOT, 'standards-library', 'catalog.json');
const STATIC_PAGES = new Set(['/standards', '/standards/compare', '/standards/data']);

/** Markdown リンク・JSX の href から /standards のリンクを行番号つきで抜く（コードブロックの中は除く）。 */
export function extractStandardsLinks(content) {
  const links = [];
  const re = /(?:\]\(|href=["'{]{1,2})((?:https?:\/\/(?:www\.)?doboku-note\.com)?\/standards(?:[/#?][^)\s"'}]*)?)(?=[)\s"'}]|$)/g;
  let fenced = false;
  content.split('\n').forEach((line, i) => {
    if (/^\s*(`{3,}|~{3,})/.test(line)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    for (const m of line.matchAll(re)) links.push({ href: m[1], line: i + 1 });
  });
  return links;
}

/** ページ本文の Markdown から、サイトが付ける見出し ID の集合を作る。 */
export function headingIdSet(markdown) {
  return new Set(extractHeadings(markdown, { minLevel: 1, maxLevel: 6 }).map((h) => h.id));
}

/**
 * /standards のリンク 1 本を判定する。
 * @param {string} href
 * @param {{ hasDocument: (a: string, d: string) => boolean, hasAgency: (a: string) => boolean,
 *           manifest: (a: string, d: string) => any, chapterMarkdown: (a: string, d: string, chapter: any) => string }} source
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function resolveStandardsHref(href, source) {
  const noOrigin = href.replace(/^https?:\/\/(www\.)?doboku-note\.com/i, '');
  const [pathAndQuery, rawAnchor] = noOrigin.split('#');
  const path = pathAndQuery.split('?')[0].replace(/\/+$/, '') || '/';
  let anchor = null;
  if (rawAnchor) {
    try {
      anchor = decodeURIComponent(rawAnchor);
    } catch {
      return { ok: false, reason: `アンカーを読めない（#${rawAnchor}）` };
    }
  }
  if (STATIC_PAGES.has(path)) return anchor ? { ok: false, reason: '静的ページのアンカーは検査できない形' } : { ok: true };

  const parts = path.split('/').slice(2); // ['', 'standards', ...]
  const [agency, document, kind, chapterId, sub, sectionNo, ...rest] = parts;
  if (parts.length === 1) return source.hasAgency(agency) ? (anchor ? { ok: false, reason: '機関ページのアンカーは検査できない形' } : { ok: true }) : { ok: false, reason: `機関 ${agency} が catalog に無い` };
  if (!source.hasDocument(agency, document)) return { ok: false, reason: `文書 ${agency}/${document} が catalog に無い` };
  if (parts.length === 2) return anchor ? { ok: false, reason: '文書ページのアンカーは検査できない形' } : { ok: true };
  if (kind !== 'chapters' || !chapterId || rest.length || (sub !== undefined && sub !== 'sections') || (sub && !sectionNo)) {
    return { ok: false, reason: `サイトに無い URL の形（${path}）` };
  }
  const manifest = source.manifest(agency, document);
  const chapter = manifest?.chapters?.find((c) => c.chapterId === chapterId);
  if (!chapter) return { ok: false, reason: `章 ${chapterId} が ${agency}/${document} の manifest に無い` };

  let pageMarkdown;
  if (sub === 'sections') {
    if (!chapter.splitBySection) return { ok: false, reason: `章 ${chapterId} は節ページに分けていない（章ページへ結ぶ）` };
    const number = Number(sectionNo);
    const section = Number.isInteger(number) ? splitChapterBySection(source.chapterMarkdown(agency, document, chapter)).sections.find((s) => s.number === number) : null;
    if (!section || !chapter.sections?.some((s) => s.number === number)) return { ok: false, reason: `章 ${chapterId} に第${sectionNo}節が無い` };
    if (!anchor) return { ok: true };
    pageMarkdown = sectionPageMarkdown(section.lines);
  } else {
    if (!anchor) return { ok: true };
    if (chapter.splitBySection) return { ok: false, reason: `章 ${chapterId} の章ページは節の一覧だけ（条へは /sections/{節} のページで結ぶ）` };
    pageMarkdown = source.chapterMarkdown(agency, document, chapter);
  }
  return headingIdSet(pageMarkdown).has(anchor) ? { ok: true } : { ok: false, reason: `見出しの ID #${anchor} がページに無い（改定で条番号・題名が変わった可能性）` };
}

/** リポジトリの catalog・manifest・章記事を読む source。 */
export function repositorySource() {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
  const docs = new Set(catalog.documents.map((d) => `${d.agencyId}/${d.documentId}`));
  const agencies = new Set(catalog.documents.map((d) => d.agencyId));
  const manifests = new Map();
  const chapters = new Map();
  return {
    hasAgency: (a) => agencies.has(a),
    hasDocument: (a, d) => docs.has(`${a}/${d}`),
    manifest(a, d) {
      const key = `${a}/${d}`;
      if (!manifests.has(key)) {
        const file = join(ARTICLES_ROOT, a, d, 'manifest.json');
        manifests.set(key, existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);
      }
      return manifests.get(key);
    },
    chapterMarkdown(a, d, chapter) {
      const file = join(ARTICLES_ROOT, a, d, chapter.file);
      if (!chapters.has(file)) chapters.set(file, readFileSync(file, 'utf8'));
      return chapters.get(file);
    },
  };
}

/** content/site の MDX（章記事そのものを除く）を走査して判定する。 */
export function auditStandardsLinks({ files = listSiteMdx(), source = repositorySource() } = {}) {
  const broken = [];
  let filesWithLinks = 0;
  let links = 0;
  let checked = 0;
  const scanned = files.filter((f) => !relative(SITE_CONTENT_ROOT, f).startsWith('standards-articles'));
  for (const file of scanned) {
    const found = extractStandardsLinks(readFileSync(file, 'utf8'));
    if (!found.length) continue;
    filesWithLinks++;
    for (const link of found) {
      links++;
      const r = resolveStandardsHref(link.href, source);
      checked++;
      if (!r.ok) broken.push({ file: relative(REPO_ROOT, file).replace(/\\/g, '/'), ...link, reason: r.reason });
    }
  }
  return { scanned: scanned.length, filesWithLinks, links, checked, broken };
}

if (isCliEntry(import.meta.url)) {
  const r = auditStandardsLinks();
  console.log(`共通仕様書へのリンク検査: MDX ${r.scanned} 本を走査 / /standards リンクを持つファイル ${r.filesWithLinks} 本 / リンク ${r.links} 本 / 検査 ${r.checked} 本 / 切れ ${r.broken.length} 本`);
  if (r.links === 0) {
    console.error('検査不成立: /standards へのリンクを 1 本も見つけられない（過去問の解説には根拠の条へのリンクがあるはず。抽出の正規表現か走査範囲が壊れている）');
    process.exitCode = 1;
  } else if (r.broken.length) {
    for (const b of r.broken) console.error(`  ${b.file}:${b.line} ${b.href}\n    → ${b.reason}`);
    console.error('\nリンク先の章・節・条が改定で変わったときは、章記事（content/site/standards-articles/）を読んで同じ論点の条へ張り替える。');
    process.exitCode = 1;
  } else {
    console.log('OK: すべてのリンク先が実在する');
  }
}
