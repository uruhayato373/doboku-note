import MetaCard from './MetaCard/MetaCard';
import type { DocMeta } from '@/lib/docs';
import { getPublicDocPath } from '@/lib/content-routes';
import { getCategoryBySlug, getCategoryHubPath } from '@/lib/categories';
import { resolveNavTitle } from '@/lib/doc-title';
import { discoveryGroups, sidebarProduct } from '@/lib/sidebar-discovery';
import { resolvePlacement } from '@/lib/magazine-placement';
import { classifyDoc, isCareerDoc } from '@/lib/doc-classifier';
import NoteProductCard from './NoteProductCard';
import LinkRow, { LinkRowList } from '@/components/ui/LinkRow/LinkRow';
import Arrow from '@/components/ui/Arrow/Arrow';
import { ButtonLink } from '@/components/ui/Button/Button';

export function SidebarProduct({category,doc,placement,content}: {category:string;doc?:DocMeta;placement:string;content?:string}) {
 const product=sidebarProduct(category,doc,content);
 if(!product)return null;
 const scopeNotice = doc ? resolvePlacement(doc.slug, classifyDoc(doc), isCareerDoc(doc)).scopeNotice : undefined;
 return <NoteProductCard product={product} category={category} placement={placement} scopeNotice={scopeNotice} />;
}

export function DiscoveryNav({category,currentSlug,docs}: {category:string;currentSlug:string;docs:DocMeta[]}) {
 const groups=discoveryGroups(category,currentSlug,docs);
 return <MetaCard padding="compact" ariaLabel="分野・科目から復習" trackNav="article-discovery" title="分野・科目から復習">
  {groups.map(g=><div key={g.title} className="mt-3"><h3 className="text-sm font-bold text-(--ink-muted)">{g.title}</h3><LinkRowList>{g.docs.map(d=><LinkRow key={d.slug} href={getPublicDocPath(d.slug)} title={resolveNavTitle(d).main} />)}</LinkRowList></div>)}
  <div className="mt-2"><ButtonLink variant="text" href={getCategoryHubPath(category)}>{getCategoryBySlug(category)?.label}の一覧<Arrow /></ButtonLink></div>
  {category === 'civil-practice' && <div><ButtonLink variant="text" href="/standards">発行機関別に基準・仕様書を確認<Arrow /></ButtonLink></div>}
  {category.startsWith('concrete-') && <div><ButtonLink variant="text" href="/topics/concrete">コンクリートの関連テーマ<Arrow /></ButtonLink></div>}
 </MetaCard>;
}
