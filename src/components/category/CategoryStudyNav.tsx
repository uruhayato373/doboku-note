import Link from 'next/link';
import LinkRow, { LinkRowList } from '@/components/ui/LinkRow/LinkRow';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import { getCategoryJumps } from './CategoryJumpNav';
import { getRelatedTools } from '@/lib/tools';
import { getDocsMetaByCategory } from '@/lib/docs';
import { getPublicDocPath } from '@/lib/content-routes';
import { resolveNavTitle } from '@/lib/doc-title';

export default function CategoryStudyNav({ category }: { category: string }) {
  const links = category === 'civil-practice' ? [
    {href:'#practice-field-0',label:'土工の判断・管理'},
    {href:'#practice-field-1',label:'コンクリート・鉄筋'},
    {href:'#practice-field-2',label:'現場の安全管理'},
  ] : getCategoryJumps(category).filter(item => !/guide|career/.test(item.href)).slice(0, 3);
  const tools = getRelatedTools(category);
  const guides = getDocsMetaByCategory(category).filter(d => d.published !== false && !d.hideFromCategory && /-guide-(overview|study-plan|essay|after-pass)$/.test(d.slug)).slice(0,3);
  if (!links.length && !tools.length) return null;
  return <MetaCard padding="compact" ariaLabel="演習・復習の入口" trackNav="category-study" title="演習・復習の入口">
    <LinkRowList className="mt-2">
      {links.map(link => <LinkRow key={link.href} href={link.href} title={link.label} tone="ink" arrow />)}
    </LinkRowList>
    {guides.length > 0 && <><h3 className="mt-4 text-sm font-bold text-(--ink)">最初に読む・対策を選ぶ</h3><LinkRowList>{guides.map(d=><LinkRow key={d.slug} href={getPublicDocPath(d.slug)} title={resolveNavTitle(d).main} />)}</LinkRowList></>}
    {tools.length > 0 && <><h3 className="mt-4 text-sm font-bold text-(--ink)">無料ツールで試す</h3><LinkRowList className="mt-1">{tools.map(tool => <LinkRow key={tool.href} href={tool.href} title={tool.title} />)}</LinkRowList></>}
    <Link href="/tools" className="focus-ring mt-2 inline-flex min-h-11 items-center text-sm text-(--accent) underline">計算・演習ツール一覧 →</Link>
  </MetaCard>;
}
