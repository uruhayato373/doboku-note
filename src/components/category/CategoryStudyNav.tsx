import Link from 'next/link';
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
  return <MetaCard padding="compact" ariaLabel="演習・復習の入口" trackNav="category-study">
    <h2 className="text-lg font-bold text-[var(--ink)]">演習・復習の入口</h2>
    <ul className="mt-2 divide-y divide-[var(--rule-soft)]">
      {links.map(link => <li key={link.href}><Link className="focus-ring flex min-h-11 items-center justify-between gap-2 py-2 text-sm text-[var(--ink)] hover:text-[var(--accent)]" href={link.href}>{link.label}<span aria-hidden="true">→</span></Link></li>)}
    </ul>
    {guides.length > 0 && <><h3 className="mt-4 text-sm font-bold text-[var(--ink)]">最初に読む・対策を選ぶ</h3><ul>{guides.map(d=><li key={d.slug}><Link className="focus-ring flex min-h-11 items-center py-2 text-sm text-[var(--accent)] hover:underline" href={getPublicDocPath(d.slug)}>{resolveNavTitle(d).main}</Link></li>)}</ul></>}
    {tools.length > 0 && <><h3 className="mt-4 text-sm font-bold text-[var(--ink)]">無料ツールで試す</h3><ul className="mt-1 divide-y divide-[var(--rule-soft)]">{tools.map(tool => <li key={tool.href}><Link href={tool.href} className="focus-ring flex min-h-11 items-center py-2 text-sm text-[var(--accent)] hover:underline">{tool.title}</Link></li>)}</ul></>}
    <Link href="/tools" className="focus-ring mt-2 inline-flex min-h-11 items-center text-sm text-[var(--accent)] underline">計算・演習ツール一覧 →</Link>
  </MetaCard>;
}
