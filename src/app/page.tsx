import Link from 'next/link';

const features = [
  {
    title: '試験ガイド',
    description: '出題傾向・得点戦略・学習ルートを解説。効率的な合格プランを提案します。',
    link: '/docs/exam/civil-construction-1/guide',
  },
  {
    title: '土木一般',
    description: '土工・コンクリート・基礎工・測量・建設機械。第1次検定の土木一般分野を体系的に解説。',
    link: '/docs/civil-general',
  },
  {
    title: '施工管理',
    description: '施工計画・工程管理・品質管理・安全管理・環境保全・法規。施工管理の全分野をカバー。',
    link: '/docs/construction-management',
  },
  {
    title: '過去問（第1次検定）',
    description: '14年分の第1次検定過去問を年度別に収録。解答と詳しい解説付き。',
    link: '/docs/exam/civil-construction-1/primary',
  },
  {
    title: '過去問（第2次検定）',
    description: '経験記述・土工・コンクリート・施工計画・品質管理。5分野の記述問題を対策。',
    link: '/docs/exam/civil-construction-1/secondary',
  },
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">doboku-note</h1>
          <p className="text-xl text-gray-700 font-medium mb-2">
            1級土木施工管理技士 試験対策サイト
          </p>
          <p className="text-base text-gray-500 max-w-2xl mx-auto">
            土木一般・施工管理の体系的な技術解説と、14年分の過去問で合格をサポート。
            ここだけで合格に必要な知識が身につきます。
          </p>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Link
                key={feature.title}
                href={feature.link}
                className="no-underline text-inherit"
              >
                <div className="rounded-lg border border-gray-200 p-6 min-h-[150px] flex flex-col transition-all hover:-translate-y-1 hover:shadow-md hover:border-primary/30">
                  <h3 className="text-xl font-semibold text-primary mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
