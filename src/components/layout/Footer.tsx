import Link from 'next/link';
import DisclosureChevron from '@/components/ui/DisclosureChevron';
import { getAllCategories, getCategoryHubPath } from '@/lib/categories';

const categories = getAllCategories().filter(category => category.visible !== false);
const siteLinks = [
  ['/tools', '計算・演習'],
  ['/standards', '基準類・仕様書'],
  ['/topics', 'テーマ別索引'],
  ['/about', '運営者情報'],
  ['/contact', 'お問い合わせ'],
  ['/privacy', 'プライバシーポリシー'],
  ['/terms', '利用規約'],
] as const;
const footerLink = 'focus-ring inline-flex min-h-11 items-center text-sm text-[var(--ink-body)] transition-colors hover:text-[var(--accent)]';

function CategoryLinks() {
  return (
    <ul className="grid grid-cols-1 gap-x-5 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map(category => (
        <li key={category.slug}>
          <Link href={getCategoryHubPath(category.slug)} className={footerLink}>
            {category.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Footer() {
  return (
    <footer className="mt-8 border-t border-[var(--rule-soft)] bg-[var(--paper)] transition-colors duration-300">
      <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 sm:py-6 lg:px-10">
        <div className="sm:flex sm:gap-8">
          <div className="sm:w-48 sm:shrink-0">
            <Link href="/" aria-label="doboku-note ホーム" className="focus-ring inline-flex min-h-11 items-baseline gap-2 py-2">
              <span className="font-serif text-xl font-black text-[var(--ink)]">doboku</span>
              <span className="font-mono text-xs uppercase tracking-widest text-[var(--ink-muted)]">— note</span>
            </Link>
            <p className="text-sm leading-relaxed text-[var(--ink-body)]">土木の資格試験と実務を学ぶ</p>
          </div>

          <nav aria-label="フッターの資格・実務一覧" className="hidden min-w-0 flex-1 sm:block">
            <h2 className="mb-1 text-sm font-bold text-[var(--ink)]">資格・実務から探す</h2>
            <CategoryLinks />
          </nav>
        </div>

        <details className="group mt-3 border-y border-[var(--rule-soft)] sm:hidden">
          <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-[var(--ink)] [&::-webkit-details-marker]:hidden">
            資格・実務から探す<DisclosureChevron />
          </summary>
          <nav aria-label="フッターの資格・実務一覧" className="pb-2">
            <CategoryLinks />
          </nav>
        </details>

        <nav aria-label="フッターのサイト案内" className="mt-3 sm:border-t sm:border-[var(--rule-soft)] sm:pt-2">
          <ul className="flex flex-wrap gap-x-5">
            {siteLinks.map(([href, label]) => (
              <li key={href}><Link href={href} className={footerLink}>{label}</Link></li>
            ))}
          </ul>
        </nav>

        <div className="mt-3 flex flex-col gap-2 text-xs leading-relaxed text-[var(--ink-body)] sm:flex-row sm:items-center sm:justify-between sm:gap-5">
          <p>当サイトは成果報酬型広告（アフィリエイト）を利用しています。</p>
          <span className="shrink-0 font-mono sm:pr-14">© {new Date().getFullYear()} doboku-note</span>
        </div>
      </div>
    </footer>
  );
}
