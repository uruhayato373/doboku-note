import Link from 'next/link';
import { getCategoryBySlug } from '@/lib/categories';

// ジャンプの項目は categories.json の layout.jumps が持つ（DN-0793）
export function getCategoryJumps(category: string) {
  return [...(getCategoryBySlug(category)?.layout?.jumps ?? [])].sort((a, b) => Number(!/primary|pastExam/.test(a.href)) - Number(!/primary|pastExam/.test(b.href)));
}

export default function CategoryJumpNav({ category }: { category: string }) {
  const items = getCategoryJumps(category);
  if (items.length === 0) return null;

  const layoutClass = items.length <= 3
    ? 'grid grid-cols-3'
    : 'grid grid-cols-2 sm:grid-cols-3';

  return (
    <nav
      aria-label="この資格の学習メニュー"
      data-cta="nav"
      data-cta-label="category-jump-nav"
      className="border-b border-(--rule-soft) py-4"
    >
      <div className="mb-3">
        <div className="text-[17px] font-bold tracking-[0.02em] text-(--ink)">
          学習を始める
        </div>
      </div>
      <ul className={`${layoutClass} gap-2`}>
        {items.map((item) => (
          <li
            key={item.href}
            className="min-w-0"
          >
            <Link
              href={item.href}
              className="focus-ring flex h-full min-h-11 items-center justify-between gap-2 rounded-card-inline border border-(--rule-soft) px-3 py-3 text-sm font-bold text-(--ink) transition-colors hover:bg-(--accent-fill)"
            >
              <span>{item.label}</span><span aria-hidden="true" className="text-(--accent)">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
