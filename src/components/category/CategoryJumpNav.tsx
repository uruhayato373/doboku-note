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

export function getCategoryJumps(category: string) {
  return [...(CATEGORY_JUMPS[category] ?? [])].sort((a, b) => Number(!/primary|pastExam/.test(a.href)) - Number(!/primary|pastExam/.test(b.href)));
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
      className="border-b border-[var(--rule-soft)] py-4"
    >
      <div className="mb-3">
        <div className="text-[17px] font-bold tracking-[0.02em] text-[var(--ink)]">
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
              className="focus-ring flex h-full min-h-11 items-center justify-between gap-2 rounded-card-inline border border-[var(--rule-soft)] px-3 py-3 text-sm font-bold text-[var(--ink)] transition-colors hover:bg-[var(--accent-fill)]"
            >
              <span>{item.label}</span><span aria-hidden="true" className="text-[var(--accent)]">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
