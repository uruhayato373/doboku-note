/**
 * standards-render-targets.mjs — 公的基準の章・節ページのうち「中身が異なるページすべて」を返す。
 *
 * 共通仕様書 8 文書は本文がほぼ同じなので、同じ中身を重ねて描画しない。対象は
 *   - 比較の基準（comparison.json の baseline・近畿版）の全章・全節ページ
 *   - 比較から外した別の仕様書（status: different-document-structure で章記事のあるもの・北海道版）の全ページ
 *   - 基準と差分がある地域版の章（status: different の changedChapterIds）
 * manifest と比較データから決めるので、改訂で差分が増えれば対象も増える。
 * scope 'all' は、これに比較の外の文書（必携・マニュアル・特記・参考資料・付表。共通仕様書ではないので
 * 比較データに行が無い）の全ページを足す。ページ数が数倍になるので PR の E2E では使わず、夜間・手動の E2E が使う（DN-0850）。
 * 描画の検査（e2e/standards-render.spec.ts）と目視用の一覧（scripts/standards-table-gallery.mjs）が使う。
 * 依存ゼロ（e2e から読むため）。
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readJson } from './json-io.mjs';

function pagesOf(articlesRoot, agencyId, documentId, chapterIds) {
  const manifestPath = join(articlesRoot, agencyId, documentId, 'manifest.json');
  if (!existsSync(manifestPath)) return [];
  const urls = [];
  for (const chapter of readJson(join(articlesRoot, agencyId, documentId), 'manifest.json').chapters) {
    if (chapterIds && !chapterIds.has(chapter.chapterId)) continue;
    const base = `/standards/${agencyId}/${documentId}/chapters/${chapter.chapterId}`;
    urls.push(base);
    if (chapter.splitBySection) for (const section of chapter.sections) urls.push(`${base}/sections/${section.number}`);
  }
  return urls;
}

/**
 * @param {string} articlesRoot content/site/standards-articles の場所
 * @param {{ scope?: 'distinct' | 'all' }} [options] 'distinct'（既定）＝共通仕様書の中身が異なるページ / 'all'＝比較の外の文書も全ページ
 * @returns {string[]} サイト内の URL（重複なし・文書と章の順）
 */
export function standardsRenderTargets(articlesRoot, { scope = 'distinct' } = {}) {
  if (scope !== 'distinct' && scope !== 'all') throw new Error(`standardsRenderTargets: scope は distinct か all（${scope}）`);
  const comparison = readJson(articlesRoot, 'comparison.json');
  const [baseAgency, baseDocument] = String(comparison.baseline).split('/');
  const targets = new Set(pagesOf(articlesRoot, baseAgency, baseDocument));
  for (const row of comparison.rows) {
    if (row.status === 'different-document-structure') {
      for (const url of pagesOf(articlesRoot, row.agencyId, row.documentId)) targets.add(url);
    }
    if (row.status === 'different') {
      for (const url of pagesOf(articlesRoot, row.agencyId, row.documentId, new Set(row.changedChapterIds))) targets.add(url);
    }
  }
  if (scope === 'all') {
    const compared = new Set([String(comparison.baseline), ...comparison.rows.map((row) => `${row.agencyId}/${row.documentId}`)]);
    const dirs = (path) => readdirSync(path, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    for (const agencyId of dirs(articlesRoot)) {
      for (const documentId of dirs(join(articlesRoot, agencyId))) {
        if (compared.has(`${agencyId}/${documentId}`)) continue;
        for (const url of pagesOf(articlesRoot, agencyId, documentId)) targets.add(url);
      }
    }
  }
  return [...targets];
}
