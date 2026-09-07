import Link from 'next/link';

type JumpItem = { href: string; label: string; goal: string };

const CATEGORY_JUMPS: Record<string, JumpItem[]> = {
  'civil-construction-1': [
    { href: '#sec-guide', label: '受験ガイド', goal: '試験を知る' },
    { href: '#sec-textbook', label: 'テキスト', goal: '知識を学ぶ' },
    { href: '#sec-primary', label: '過去問', goal: '問題を解く' },
    { href: '#sec-secondary', label: '第2次対策', goal: '記述を仕上げる' },
    { href: '#sec-career', label: 'キャリア', goal: '資格を活かす' },
  ],
  'civil-construction-2': [
    { href: '#sec-guide', label: '受験ガイド', goal: '試験を知る' },
    { href: '#sec-fields', label: '分野別', goal: '知識を学ぶ' },
    { href: '#sec-primary', label: '過去問', goal: '問題を解く' },
    { href: '#sec-secondary', label: '第2次対策', goal: '記述を仕上げる' },
    { href: '#sec-career', label: 'キャリア', goal: '資格を活かす' },
  ],
  'concrete-engineer': [
    { href: '#sec-guide', label: '受験ガイド', goal: '試験を知る' },
    { href: '#sec-textbook', label: 'テキスト', goal: '知識を学ぶ' },
    { href: '#sec-primary', label: '演習問題', goal: '問題を解く' },
  ],
  'concrete-chief-engineer': [
    { href: '#sec-guide', label: '受験ガイド', goal: '試験を知る' },
    { href: '#sec-textbook', label: 'テキスト', goal: '知識を学ぶ' },
    { href: '#sec-primary', label: '過去問', goal: '問題を解く' },
  ],
  'concrete-diagnostician': [
    { href: '#sec-guide', label: '受験ガイド', goal: '試験を知る' },
    { href: '#sec-textbook', label: 'テキスト', goal: '知識を学ぶ' },
    { href: '#sec-primary', label: '過去問', goal: '問題を解く' },
  ],
  'pe-first-stage': [
    { href: '#sec-guide', label: '受験ガイド', goal: '試験を知る' },
    { href: '#sec-fields', label: '科目別対策', goal: '科目を学ぶ' },
    { href: '#sec-primary', label: '科目別過去問', goal: '問題を解く' },
  ],
  'pe-comprehensive-management': [
    { href: '#sec-guide', label: '受験ガイド', goal: '試験を知る' },
    { href: '#sec-fields', label: '論文対策', goal: '論文を学ぶ' },
    { href: '#sec-pillar', label: '5管理', goal: '管理を整理する' },
    { href: '#sec-pastExam', label: '過去問', goal: '問題を解く' },
    { href: '#sec-keyword', label: 'キーワード', goal: '用語を調べる' },
  ],
  'pe-construction': [
    { href: '#sec-guide', label: '受験ガイド', goal: '試験を知る' },
    { href: '#sec-fields', label: '論文の書き方', goal: '論文を学ぶ' },
    { href: '#sec-keyword', label: '科目別対策', goal: '専門を深める' },
    { href: '#sec-pastExam', label: '過去問', goal: '問題を解く' },
    { href: '#sec-career', label: 'キャリア', goal: '資格を活かす' },
  ],
};

export default function CategoryJumpNav({ category }: { category: string }) {
  const items = CATEGORY_JUMPS[category] ?? [];
  if (items.length === 0) return null;

  const layoutClass = items.length <= 3
    ? 'grid grid-cols-3 overflow-hidden'
    : 'flex overflow-x-auto overflow-y-hidden sm:grid sm:grid-cols-5 sm:overflow-visible';

  return (
    <nav
      aria-label="この資格の学習メニュー"
      data-cta="nav"
      data-cta-label="category-jump-nav"
      className="border-b border-[var(--rule-soft)] py-5"
    >
      <div className="mb-3">
        <div className="text-[17px] font-bold tracking-[0.02em] text-[var(--ink)]">
          学習を始める
        </div>
        <p className="mt-0.5 text-[12px] leading-5 text-[var(--ink-muted)]">
          今やりたいことから選べます
        </p>
      </div>
      <ul className={`${layoutClass} rounded-card-inline border border-[var(--rule-soft)] bg-[var(--paper)] toc-scroll`}>
        {items.map((item, index) => (
          <li
            key={item.href}
            className={`${items.length <= 3 ? 'min-w-0' : 'min-w-[148px] sm:min-w-0'} border-r border-[var(--rule-soft)] last:border-r-0`}
          >
            <Link
              href={item.href}
              className="focus-ring group flex min-h-[78px] flex-col justify-between px-2.5 py-3 text-left transition-colors hover:bg-[var(--accent-fill)] sm:px-3.5"
            >
              <span className="flex items-center justify-between font-mono text-[10px] font-bold tracking-[0.14em] text-[var(--accent)]">
                {String(index + 1).padStart(2, '0')}
                <span aria-hidden="true" className="text-[13px] font-normal tracking-normal">→</span>
              </span>
              <span className="mt-2 block min-w-0">
                <span className="block text-[12px] font-bold leading-5 text-[var(--ink)] sm:text-[13px]">
                  {item.goal}
                </span>
                <span className="block truncate text-[10px] leading-4 text-[var(--ink-muted)] sm:text-[11px]">
                  {item.label}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
