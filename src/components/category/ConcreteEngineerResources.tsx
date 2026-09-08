import Link from 'next/link';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import { getMagazine } from '@/lib/note-magazines';
import NoteProductCard from '@/components/ui/NoteProductCard';
import { getPublicDocPath } from '@/lib/content-routes';
import { getRelatedTools } from '@/lib/tools';

const linkClass = 'focus-ring flex min-h-11 items-center justify-between gap-2 py-2 text-sm text-[var(--ink)] hover:text-[var(--accent)]';

export function ConcreteEngineerStudy() {
  const links = [
    ['guide-study-plan', '12週間の学習計画'],
    ['primary-mix-design', '配合計算を演習する'],
    ['textbook-production-qc', '製造・品質管理を復習する'],
  ];
  return <MetaCard padding="compact" ariaLabel="学習・復習の入口" trackNav="concrete-study">
    <h2 className="text-lg font-bold text-[var(--ink)]">学習・復習の入口</h2>
    <ul className="mt-2 divide-y divide-[var(--rule-soft)]">
      {links.map(([slug, title]) => <li key={slug}><Link className={linkClass} href={getPublicDocPath(`concrete-engineer-${slug}`)}>{title}<span aria-hidden="true">→</span></Link></li>)}
    </ul>
  </MetaCard>;
}

export function ConcreteEngineerProduct({ placement }: { placement: string }) {
  const product = getMagazine('ce-mix-jis-practice');
  if (!product) return null;
  return <NoteProductCard product={product} category="concrete-engineer" placement={placement} />;
}

export function ConcreteEngineerRelated() {
  const links = [
    ...getRelatedTools('concrete-engineer').map(t => ({ href: t.href, title: t.title })),
    { href: '/topics/concrete', title: 'コンクリートの記事を横断して探す' },
    { href: getPublicDocPath('concrete-engineer-guide-difference-chief'), title: '技士と主任技士の違い' },
    { href: '/exam/concrete-chief-engineer', title: 'コンクリート主任技士の対策' },
  ];
  return <MetaCard padding="compact" ariaLabel="関連ツール・資格" trackNav="concrete-related">
    <h2 className="text-lg font-bold text-[var(--ink)]">関連ツール・資格</h2>
    <ul className="mt-2 divide-y divide-[var(--rule-soft)]">
      {links.map(link => <li key={link.href}><Link className={linkClass} href={link.href}>{link.title}<span aria-hidden="true">→</span></Link></li>)}
    </ul>
  </MetaCard>;
}
