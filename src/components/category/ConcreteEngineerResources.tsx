import LinkRow, { LinkRowList } from '@/components/ui/LinkRow/LinkRow';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import { getMagazine } from '@/lib/note-magazines';
import NoteProductCard from '@/components/ui/NoteProductCard';
import { getPublicDocPath } from '@/lib/content-routes';
import { getRelatedTools } from '@/lib/tools';

export function ConcreteEngineerStudy() {
  const links = [
    ['guide-study-plan', '12週間の学習計画'],
    ['primary-mix-design', '配合計算を演習する'],
    ['textbook-production-qc', '製造・品質管理を復習する'],
  ];
  return <MetaCard padding="compact" ariaLabel="学習・復習の入口" trackNav="concrete-study">
    <h2 className="text-lg font-bold text-(--ink)">学習・復習の入口</h2>
    <LinkRowList className="mt-2">
      {links.map(([slug, title]) => <LinkRow key={slug} href={getPublicDocPath(`concrete-engineer-${slug}`)} title={title} tone="ink" arrow />)}
    </LinkRowList>
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
    <h2 className="text-lg font-bold text-(--ink)">関連ツール・資格</h2>
    <LinkRowList className="mt-2">
      {links.map(link => <LinkRow key={link.href} href={link.href} title={link.title} tone="ink" arrow />)}
    </LinkRowList>
  </MetaCard>;
}
