import Link from 'next/link';

const features = [
  {
    title: '土木一般',
    description: '土木工学の基礎知識、施工管理、空間情報、共通仕様書について解説しています。',
    link: '/docs/construction-management',
  },
  {
    title: '道路',
    description: '道路管理、道路設計に関する技術情報を提供しています。',
    link: '/docs/road-management',
  },
  {
    title: '河川',
    description: '河川法、河川計画、河川砂防技術基準に関する情報をまとめています。',
    link: '/docs/river-low',
  },
  {
    title: '港湾',
    description: '漁港施設の設計参考図書、地震・津波対策について解説しています。',
    link: '/docs/fishery-port',
  },
  {
    title: '環境',
    description: '騒音評価マニュアルなど環境関連の技術情報を提供しています。',
    link: '/docs/environment/noise-evaluation/general/01',
  },
  {
    title: '法律',
    description: '憲法、国家賠償法、民法など土木関連の法律について解説しています。',
    link: '/docs/low/constitution/01',
  },
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">doboku-note</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            土木技術に関する知識・経験をドキュメントとして整理した技術ノートサイトです。
            設計基準・施工管理・法律など、実務に役立つ情報を体系的にまとめています。
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
