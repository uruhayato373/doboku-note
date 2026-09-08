import Link from 'next/link';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import { getRelatedTools } from '@/lib/tools';

export default function RelatedTools({ category, slug, compact = false }: { category: string; slug: string; compact?: boolean }) {
  const tools = getRelatedTools(category, slug);
  if (!tools.length) return null;
  return <MetaCard className={compact ? 'mt-3' : 'mt-8'} padding={compact ? 'compact' : 'default'} ariaLabel="関連する無料ツール" trackNav="article-tools">
    <h2 className="text-lg font-bold text-[var(--ink)]">無料ツールで確認する</h2>
    <ul className="mt-2 divide-y divide-[var(--rule-soft)]">{tools.map(tool => <li key={tool.href}><Link href={tool.href} className="focus-ring flex min-h-11 items-center justify-between gap-3 py-3 text-[var(--accent)] hover:underline">{tool.title}<span aria-hidden="true">→</span></Link></li>)}</ul>
  </MetaCard>;
}
