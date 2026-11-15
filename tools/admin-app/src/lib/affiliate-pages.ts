import { getAllDocsMeta, getDoc } from '../../../../src/lib/docs';
import { getPublicDocPath } from '../../../../src/lib/content-routes';
import { isCareerDoc } from '../../../../src/lib/doc-classifier';
import { planArticleCtas } from '../../../../src/lib/article-cta-plan';
import { articleSidebarInput, articleSidebarPlan } from '../../../../src/lib/article-sidebar-plan';
import { articleImagePlacements, articlePixelCandidates } from '../../../../src/lib/article-affiliate-plan';
import { chooseArticlePixels } from '../../../../src/lib/article-affiliate-pixels.mjs';
import vocab from '../../../../config/cta-placements.json';
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

export async function getAffiliatePages(now = Date.now()) {
  const latest = readLatest(repoPath(), 'ga4.reports');
  const report = latest?.data.reports?.['affiliate-by-page'];
  const loaded = Array.isArray(report?.rows);
  const impressions = pageImpressions(loaded ? report.rows : []);
  const manifest = latestLayoutManifest();
  const placements = resolvePlacements({ pageKind: 'standards' }, now);
  const standards = getStandardDocuments()
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
        const slots = [...plan.insertAt.map((s) => s.slot), 'standards-rail', 'standards-rail-2', 'standards-rail-3', 'standards-end'];
        const programs = slots.flatMap((slot) => {
          const r = placements[slot];
          return r ? [{ slot, program: r.program }] : [];
        });
        const crops = manifest?.shots.filter((s) => manifest.targets.some((t) => t.id === s.targetId && t.path === path))
          .flatMap((s) => (s.crops ?? []).map((c) => ({ label: `${s.viewport} ${s.variant} ${c.placement}`, href: `/affiliate/layout-shot/${manifest.ts}/${c.file}` }))) ?? [];
        return { pageKind: 'standards' as const, group: 'standards', category: '', career: false, inlineReason: plan.insertAt.length ? null : '字数・区切り不足', slotDetails: programs.map(p => ({ ...p, creative: '', pixel: '' })), slotImpressions: loaded ? Object.fromEntries(impressions.get(path) ?? []) : null, path, title, agency: document.agencyId, agencyName: document.agencyName, ...plan, programs, impressions: loaded ? [...(impressions.get(path)?.values() ?? [])].reduce((a, b) => a + b, 0) : null, crops };
      });
    })).sort((a, b) => b.chars - a.chars || a.path.localeCompare(b.path));
  const related = getAllDocsMeta().filter(d => d.published !== false && !d.tags?.includes('模範論文') && !d.hideFromCategory);
  const docs = getAllDocsMeta().filter(d => d.published !== false && d.category !== 'standards-articles');
  const articles = [];
  for (const meta of docs) {
    const doc = await getDoc(meta.slug);
    if (!doc) continue;
    const plan = planArticleCtas(doc, related, now);
    const categoryArticles = related.filter(d => d.category === meta.category);
    const cards = articleSidebarPlan(articleSidebarInput(doc.meta, plan, categoryArticles));
    const images = articleImagePlacements(plan.careerPlacements, plan.inline.map(s => s.slot), cards.length);
    const candidates = articlePixelCandidates(plan.careerPlacements, plan.renderedCareerSlots, images);
    const owners = (['B', 'B2'] as const).flatMap(variant => ([false, true] as const).flatMap(desktop =>
      chooseArticlePixels(candidates, vocab.affiliate, { desktop, wide: desktop, variant }).map(p => ({ ...p, label: `${desktop ? 'PC' : 'スマホ'} ${variant}` }))));
    const path = getPublicDocPath(meta.slug);
    const programs = images.map(({ placement }) => ({ slot: placement.slot, program: placement.program }));
    const slotDetails = images.map(({ placement: p, creatives: c }) => ({ slot: p.slot, program: p.program,
      creative: (['pc', 'mobile'] as const).flatMap(v => c[v] ? [`${v}: ${c[v].asp} ${c[v].width}×${c[v].height}`] : []).join(' / '),
      pixel: owners.filter(o => o.program === p.program && o.slot === p.slot).map(o => o.label).join(' / ') || '他面が所有',
    }));
    const crops = manifest?.shots.filter(s => manifest.targets.some(t => t.id === s.targetId && t.path === path))
      .flatMap(s => (s.crops ?? []).map(c => ({ label: `${s.viewport} ${s.variant} ${c.placement}`, href: `/affiliate/layout-shot/${manifest.ts}/${c.file}` }))) ?? [];
    articles.push({ pageKind: 'doc' as const, group: plan.docGroup, category: meta.category ?? '', career: isCareerDoc(meta),
      path, title: meta.title, agency: '', agencyName: '', chars: plan.candidates.chars, tables: plan.candidates.tables,
      insertAt: plan.inline, inlineReason: plan.inlineReason, programs, slotDetails, slotImpressions: loaded ? Object.fromEntries(impressions.get(path) ?? []) : null,
      impressions: loaded ? [...(impressions.get(path)?.values() ?? [])].reduce((a,b) => a+b, 0) : null, crops,
    });
  }
  const pages = [...standards, ...articles].sort((a,b) => b.chars-a.chars || a.path.localeCompare(b.path));
  return { pages, loaded, reportDate: latest?.data.date as string | undefined, period: report?.meta ? `${report.meta.startDate}〜${report.meta.endDate}` : null, truncated: report?.meta?.truncated === true, distribution: [0, 1, 2, 3].map((n) => pages.filter((p) => p.insertAt.length === n).length) };
}
