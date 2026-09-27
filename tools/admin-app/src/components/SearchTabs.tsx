import Link from 'next/link';

/**
 * 検索の画面内タブ。サイドバーは「検索」1 項目（domains.json の matchAlso）で、ここで 4 画面を切り替える。
 * 戦略 → 全体 → 改善中 → インデックスの順（docs/strategy/16_検索キーワード戦略.md の改善サイクル順）。
 */
const TABS = [
  { href: '/metrics/search-strategy', label: 'キーワード戦略' },
  { href: '/metrics/gsc', label: '全体（GSC）' },
  { href: '/metrics/seo-watch', label: '改善中' },
  { href: '/metrics/index', label: 'インデックス' },
] as const;

export default function SearchTabs({ current }: { current: (typeof TABS)[number]['href'] }) {
  return (
    <nav className="filterbar" style={{ marginBottom: 12 }}>
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={'chip' + (t.href === current ? ' active' : '')}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
