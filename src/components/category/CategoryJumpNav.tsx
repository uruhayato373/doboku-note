import Link from 'next/link';

type JumpItem = { href: string; label: string };

const CATEGORY_JUMPS: Record<string, JumpItem[]> = {
  'civil-construction-1': [
    { href: '#sec-guide', label: '受験ガイド' },
    { href: '#sec-textbook', label: 'テキスト' },
    { href: '#sec-primary', label: '過去問' },
    { href: '#sec-secondary', label: '第2次対策' },
    { href: '#sec-career', label: 'キャリア' },
  ],
  'civil-construction-2': [
    { href: '#sec-guide', label: '受験ガイド' },
    { href: '#sec-fields', label: '分野別' },
    { href: '#sec-primary', label: '過去問' },
    { href: '#sec-secondary', label: '第2次対策' },
    { href: '#sec-career', label: 'キャリア' },
  ],
  'concrete-engineer': [
    { href: '#sec-guide', label: '受験ガイド' },
    { href: '#sec-textbook', label: 'テキスト' },
    { href: '#sec-primary', label: '演習問題' },
  ],
  'concrete-chief-engineer': [
    { href: '#sec-guide', label: '受験ガイド' },
    { href: '#sec-textbook', label: 'テキスト' },
    { href: '#sec-primary', label: '過去問' },
  ],
  'concrete-diagnostician': [
    { href: '#sec-guide', label: '受験ガイド' },
    { href: '#sec-textbook', label: 'テキスト' },
    { href: '#sec-primary', label: '過去問' },
  ],
  'pe-first-stage': [{ href: '#sec-primary', label: '科目別過去問' }],
  'pe-comprehensive-management': [
    { href: '#sec-guide', label: '受験ガイド' },
    { href: '#sec-fields', label: '論文対策' },
    { href: '#sec-pillar', label: '5管理' },
    { href: '#sec-pastExam', label: '過去問' },
    { href: '#sec-keyword', label: 'キーワード' },
  ],
  'pe-construction': [
    { href: '#sec-guide', label: '受験ガイド' },
    { href: '#sec-fields', label: '論文の書き方' },
    { href: '#sec-keyword', label: '科目別対策' },
    { href: '#sec-pastExam', label: '過去問' },
    { href: '#sec-career', label: 'キャリア' },
  ],
};

export default function CategoryJumpNav({ category }: { category: string }) {
  const items = CATEGORY_JUMPS[category] ?? [];
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="この資格の学習メニュー"
      data-cta="nav"
      data-cta-label="category-jump-nav"
      className="border-b border-[var(--rule-soft)] py-4"
    >
      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[var(--ink-muted)]">
        目的から選ぶ
      </div>
      <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 toc-scroll sm:flex-wrap sm:overflow-visible">
        {items.map((item) => (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              className="focus-ring inline-flex min-h-11 items-center rounded-card-inline border border-[var(--rule-soft)] bg-[var(--paper)] px-3.5 text-[13px] font-medium text-[var(--ink-body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
