import Link from 'next/link';

/**
 * サイドバー 1 項目の中を画面内タブで切り替える（サイドバー側は domains.json の match＋matchAlso）。
 * 並びは「決める問い」の順。URL は既存のまま変えない（domains.json navRules）。
 */
export const TAB_SETS = {
  search: [
    { href: '/metrics/search-strategy', label: 'キーワード戦略' },
    { href: '/metrics/gsc', label: '全体（GSC）' },
    { href: '/metrics/seo-watch', label: '改善中' },
    { href: '/metrics/index', label: 'インデックス' },
  ],
  market: [
    { href: '/strategy/qualifications', label: '資格一覧' },
    { href: '/strategy/market', label: '展開の判断' },
    { href: '/strategy/competitors', label: '競合' },
  ],
  policy: [
    { href: '/strategy/policy', label: '共通方針' },
    { href: '/strategy/taxonomy', label: '事業の分類' },
  ],
} as const;

export default function SectionTabs({ set, current }: { set: keyof typeof TAB_SETS; current: string }) {
  return (
    <nav className="filterbar" style={{ marginBottom: 12 }}>
      {TAB_SETS[set].map((t) => (
        <Link key={t.href} href={t.href} className={'chip' + (t.href === current ? ' active' : '')}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
