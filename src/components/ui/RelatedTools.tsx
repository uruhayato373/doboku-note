import MetaCard from '@/components/ui/MetaCard/MetaCard';
import LinkRow, { LinkRowList } from '@/components/ui/LinkRow/LinkRow';
import { getRelatedTools } from '@/lib/tools';

export default function RelatedTools({ category, slug, compact = false }: { category: string; slug: string; compact?: boolean }) {
  const tools = getRelatedTools(category, slug);
  if (!tools.length) return null;
  return <MetaCard className={compact ? 'mt-3' : 'mt-8'} padding={compact ? 'compact' : 'default'} ariaLabel="関連する無料ツール" trackNav="article-tools">
    <h2 className="text-lg font-bold text-(--ink)">無料ツールで確認する</h2>
    <LinkRowList className="mt-2">{tools.map(tool => <LinkRow key={tool.href} href={tool.href} title={tool.title} arrow />)}</LinkRowList>
  </MetaCard>;
}
