import { getStandardDocuments } from '../../../../src/lib/standards';
import { getStandardChapters, getStandardChapterSection, isStandardChapterMerged, readStandardChapterMarkdown, standardChapterPath } from '../../../../src/lib/standards-articles';
import { standardSectionPath } from '../../../../src/lib/standards-section-split.mjs';
import { planInlineSlots } from '../../../../src/lib/standards-inline-slots.mjs';
import { resolvePlacements } from '../../../../src/lib/affiliate-placement';
import { readLatest } from '../../../../scripts/lib/dataset-io.mjs';
import { repoPath } from './repo-root';
import { latestLayoutManifest } from './affiliate-layout';

type ImpressionRow = { page: string; placement: string; eventName: string; eventCount: number };

/** page × placement でまとめる。過去の面も同じページの合計に含める。 */
export function pageImpressions(rows: ImpressionRow[]) {
  const pages = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (row.eventName !== 'affiliate_cta_impression') continue;
    const path = row.page.split(/[?#]/)[0].replace(/\/$/, '') || '/';
    const slots = pages.get(path) ?? new Map<string, number>();
    slots.set(row.placement, (slots.get(row.placement) ?? 0) + row.eventCount);
    pages.set(path, slots);
  }
  return pages;
}

export function getAffiliatePages(now = Date.now()) {
  const latest = readLatest(repoPath(), 'ga4.reports');
  const report = latest?.data.reports?.['affiliate-by-page'];
  const loaded = Array.isArray(report?.rows);
  const impressions = pageImpressions(loaded ? report.rows : []);
  const manifest = latestLayoutManifest();
  const placements = resolvePlacements({ pageKind: 'standards' }, now);
  const pages = getStandardDocuments()
    .filter((d) => !isStandardChapterMerged(d.agencyId, d.documentId))
    .flatMap((document) => getStandardChapters(document.agencyId, document.documentId).flatMap((chapter) => {
      // 分割した章の入口は節の一覧。本文を持つ節ページを列挙する。
      const bodies = chapter.splitBySection
        ? chapter.sections.map((section) => {
          const resolved = getStandardChapterSection(document.agencyId, document.documentId, chapter.chapterId, section.number);
          if (!resolved) throw new Error(`節本文が無い: ${document.agencyId}/${document.documentId}/${chapter.chapterId}/${section.number}`);
          return { path: standardSectionPath(document, chapter, section.number), title: `${chapter.chapterTitle} / ${section.title}`, markdown: resolved.markdown };
        })
        : [{ path: standardChapterPath(document, chapter), title: chapter.chapterTitle, markdown: readStandardChapterMarkdown(document.agencyId, document.documentId, chapter) }];
      return bodies.map(({ path, title, markdown }) => {
        const plan = planInlineSlots(markdown);
        const slots = [...plan.insertAt.map((s) => s.slot), 'standards-rail', 'standards-end'];
        const programs = slots.flatMap((slot) => {
          const r = placements[slot];
          return r ? [{ slot, program: r.alternate ? `${r.program} ⇄ ${r.alternate.program}` : r.program }] : [];
        });
        const crops = manifest?.shots.filter((s) => manifest.targets.some((t) => t.id === s.targetId && t.path === path))
          .flatMap((s) => (s.crops ?? []).map((c) => ({ label: `${s.viewport} ${s.variant} ${c.placement}`, href: `/affiliate/layout-shot/${manifest.ts}/${c.file}` }))) ?? [];
        return { path, title, agency: document.agencyId, agencyName: document.agencyName, ...plan, programs, impressions: loaded ? [...(impressions.get(path)?.values() ?? [])].reduce((a, b) => a + b, 0) : null, crops };
      });
    })).sort((a, b) => b.chars - a.chars || a.path.localeCompare(b.path));
  return { pages, loaded, reportDate: latest?.data.date as string | undefined, period: report?.meta ? `${report.meta.startDate}〜${report.meta.endDate}` : null, truncated: report?.meta?.truncated === true, distribution: [0, 1, 2, 3].map((n) => pages.filter((p) => p.insertAt.length === n).length) };
}
