/**
 * 法令ページ（/laws/<参考文献の id>・DN-0731）の末尾に自動で出す節。本文（解説）の後、記事末のカードの前に置く。
 *
 * - この法令が関わるテーマ（法令を引く記事が 2 本以上あるテーマ）
 * - 関係する国の計画・施策・審議会（config/policy-registry.json の根拠法がこの法令・政令・省令のもの）
 * - よく引かれる条（サイトの記事が本文で引く条の本数。e-Gov の条へ）
 * - この法令を扱う記事（資格試験と実務に分けて）
 * - 最新の改正の施行日（e-Gov 法令 API の写し）
 *
 * 中身は src/lib/law-wiring.ts の getLawPageData。計測は data-cta="nav"（label law-page:topics / law-page:articles）。
 */
import Link from 'next/link';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import MetaListItem from '@/components/ui/MetaListItem/MetaListItem';
import PolicyList from '@/components/laws/PolicyList';
import type { LawPageData } from '@/lib/law-wiring';

export default function LawPageSections({ data }: { data: LawPageData }) {
  const { topics, policies, articles, docsByArea, enforced } = data;
  return (
    <div className="mt-8 space-y-8">
      {topics.length > 0 && (
        <MetaCard ariaLabel="この法令が関わるテーマ">
          <h2 className="text-lg font-bold text-(--ink) mb-1">この法令が関わるテーマ</h2>
          <p className="text-sm text-(--ink-muted) mb-4">この法令を本文で引く記事が多い分野・立場のテーマです（かっこ内は記事の本数）。</p>
          <p className="flex flex-wrap gap-x-4 gap-y-2 text-[15px]" data-cta="nav" data-cta-label="law-page:topics">
            {topics.map((t) => (
              <Link key={t.slug} href={`/topics/${t.slug}`} className="text-(--accent) hover:underline">
                {t.label}<span className="ml-1 text-[12px] text-(--ink-muted)">（{t.count}）</span>
              </Link>
            ))}
          </p>
        </MetaCard>
      )}
      {policies.length > 0 && (
        <MetaCard ariaLabel="関係する国の計画・施策・審議会">
          <h2 className="text-lg font-bold text-(--ink) mb-1">関係する国の計画・施策・審議会</h2>
          <p className="text-sm text-(--ink-muted) mb-4">この法令（と政令・省令）を根拠にする計画・施策と、方向を決めた審議会の答申です。</p>
          <PolicyList policies={policies} />
        </MetaCard>
      )}
      {articles.length > 0 && (
        <MetaCard ariaLabel="よく引かれる条">
          <h2 className="text-lg font-bold text-(--ink) mb-1">よく引かれる条</h2>
          <p className="text-sm text-(--ink-muted) mb-4">このサイトの記事が本文で引いている条と、その記事の本数です（e-Gov 法令検索の条へ）。</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[14px]">
            {articles.map((a) => (
              <li key={`${a.lawId}-${a.article}`}>
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-(--accent) hover:underline">{a.label}</a>
                <span className="ml-1 text-[12px] text-(--ink-muted)">（{a.count}）</span>
              </li>
            ))}
          </ul>
        </MetaCard>
      )}
      {(docsByArea.exam.length > 0 || docsByArea.practice.length > 0) && (
        <MetaCard ariaLabel="この法令を扱う記事" trackNav="law-page:articles">
          <h2 className="text-lg font-bold text-(--ink) mb-1">この法令を扱う記事</h2>
          <p className="text-sm text-(--ink-muted) mb-4">本文でこの法令（と政令・省令）を引いている記事です。</p>
          {(['practice', 'exam'] as const).map((area) => docsByArea[area].length > 0 && (
            <div key={area} className="mb-4 last:mb-0">
              <h3 className="mb-2 text-[15px] font-bold text-(--ink)">{area === 'practice' ? '土木施工の実務' : '資格試験'}（{docsByArea[area].length}件）</h3>
              <ul className="space-y-1.5">
                {docsByArea[area].map((doc) => (
                  <li key={doc.slug}>
                    <Link href={doc.href} className="block group">
                      <MetaListItem title={doc.title} source={doc.categoryLabel} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </MetaCard>
      )}
      {enforced.length > 0 && (
        <MetaCard ariaLabel="最新の改正の施行日">
          <h2 className="text-lg font-bold text-(--ink) mb-1">最新の改正の施行日</h2>
          <p className="text-sm text-(--ink-muted) mb-4">e-Gov 法令 API から取り直した時点の値です。条文は e-Gov 法令検索で最新のものを確かめてください。</p>
          <ul className="space-y-1.5 text-[14px]">
            {enforced.map((e) => (
              <li key={e.lawId}>
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-(--accent) hover:underline">{e.title}</a>
                <span className="ml-2 text-(--ink-muted)">{e.enforced ?? '施行日の記録なし'}</span>
              </li>
            ))}
          </ul>
        </MetaCard>
      )}
    </div>
  );
}
