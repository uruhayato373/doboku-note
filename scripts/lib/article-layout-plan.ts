/** 撮影前に記事の実配置を求める。表示・管理画面と同じ関数を使い、ブラウザへ渡すのは面名だけ。 */
import { getAllDocsMeta, getDoc } from '../../src/lib/docs';
import { getPublicDocPath } from '../../src/lib/content-routes';
import { planArticleCtas } from '../../src/lib/article-cta-plan';
import { articleSidebarInput, articleSidebarPlan } from '../../src/lib/article-sidebar-plan';
import { articleImagePlacements } from '../../src/lib/article-affiliate-plan';

export async function articleLayoutPlans(paths: string[], now: number) {
  const metas = getAllDocsMeta().filter(d => d.published !== false);
  const byPath = new Map(metas.map(m => [getPublicDocPath(m.slug), m]));
  const related = metas.filter(d => !d.hideFromCategory && !d.tags?.includes('模範論文'));
  const result: Record<string, string[]> = {};
  for (const path of paths) {
    const meta = byPath.get(path);
    const doc = meta ? await getDoc(meta.slug) : null;
    if (!doc) throw new Error(`撮影対象の記事がない: ${path}`);
    const plan = planArticleCtas(doc, related, now);
    const cards = articleSidebarPlan(articleSidebarInput(doc.meta, plan, related.filter(m => m.category === meta!.category)));
    result[path] = [...plan.renderedCareerSlots, ...articleImagePlacements(plan.careerPlacements, plan.inline.map(s => s.slot), cards.length).map(p => p.placement.slot)];
  }
  return result;
}
