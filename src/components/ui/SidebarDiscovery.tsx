import Link from 'next/link';
import MetaCard from './MetaCard/MetaCard';
import type { DocMeta } from '@/lib/docs';
import { getDocsMetaByCategory } from '@/lib/docs';
import { getPublicDocPath } from '@/lib/content-routes';
import { getCategoryBySlug } from '@/lib/categories';
import { resolveNavTitle } from '@/lib/doc-title';
import { discoveryGroups, sidebarProduct } from '@/lib/sidebar-discovery';
import NoteProductCard from './NoteProductCard';

export function SidebarProduct({category,doc,placement}: {category:string;doc?:DocMeta;placement:string}) {
 const product=sidebarProduct(category,doc);
 if(!product)return null;
 return <NoteProductCard product={product} category={category} placement={placement} />;
}

export function DiscoveryNav({category,currentSlug,docs}: {category:string;currentSlug:string;docs:DocMeta[]}) {
 const groups=discoveryGroups(category,currentSlug,docs);
 return <MetaCard padding="compact" ariaLabel="分野・科目から復習" trackNav="article-discovery">
  <h2 className="text-lg font-bold text-[var(--ink)]">分野・科目から復習</h2>
  {groups.map(g=><div key={g.title} className="mt-3"><h3 className="text-sm font-bold text-[var(--ink-muted)]">{g.title}</h3><ul className="divide-y divide-[var(--rule-soft)]">{g.docs.map(d=><li key={d.slug}><Link className="focus-ring flex min-h-11 items-center py-2 text-sm text-[var(--accent)] hover:underline" href={getPublicDocPath(d.slug)}>{resolveNavTitle(d).main}</Link></li>)}</ul></div>)}
  <Link className="focus-ring mt-2 flex min-h-11 items-center text-sm font-bold text-[var(--accent)] hover:underline" href={category==='civil-practice'?'/practice':`/exam/${category}`}>{getCategoryBySlug(category)?.label}の一覧 →</Link>
  {category === 'civil-practice' && <Link className="focus-ring flex min-h-11 items-center text-sm text-[var(--accent)] hover:underline" href="/standards">発行機関別に基準・仕様書を確認 →</Link>}
  {category.startsWith('concrete-') && <Link className="focus-ring flex min-h-11 items-center text-sm text-[var(--accent)] hover:underline" href="/topics/concrete">コンクリートの関連テーマ →</Link>}
 </MetaCard>;
}

export function StandardPracticeLinks({title}: {title:string}) {
 const mapping: Array<[RegExp,string[]]> = [
  [/コンクリート/,['concrete-mix-acceptance','concrete-finishing-curing']],
  [/鉄筋/,['rebar-splice-selection']],
  [/土工|掘削|盛土/,['embankment-quality-control','trench-excavation-safety']],
  [/安全/,['sling-work-wire-rope','trench-excavation-safety']],
 ];
 const slugs=mapping.find(([pattern])=>pattern.test(title))?.[1]||[];
 const docs=getDocsMetaByCategory('civil-practice').filter(d=>d.published!==false&&!d.hideFromCategory&&slugs.includes(d.slug.replace('civil-practice-','')));
 if(!docs.length)return null;
 return <MetaCard padding="compact" ariaLabel="この基準を実務で使う" trackNav="standard-practice"><h2 className="text-lg font-bold text-[var(--ink)]">この基準を実務で使う</h2><ul>{docs.map(d=><li key={d.slug}><Link className="focus-ring flex min-h-11 items-center py-2 text-sm text-[var(--accent)] hover:underline" href={getPublicDocPath(d.slug)}>{resolveNavTitle(d).main}</Link></li>)}</ul></MetaCard>;
}
