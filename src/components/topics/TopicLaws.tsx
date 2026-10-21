/**
 * テーマのページの「このテーマの法令」と、法令・制度の軸のテーマの「法令と分野の対応」（content-taxonomy.md §6-3）。
 *
 * 法令と分野・立場は多対多（道路法は 道路・舗装／自治体の土木職／関係法令 の記事が引く）。記事が本文で引く法令から数える
 * （src/lib/law-wiring.ts）。法令名は e-Gov へ（法令ごとのページは DN-0731 で説明を人が書いてから）、回遊は記事とテーマへ。
 * 計測: data-cta="nav"（label topic-laws・law-directory）。
 */
import Link from 'next/link';
import type { LawDirectoryRow, TopicLaw } from '@/lib/law-wiring';

export function TopicLaws({ laws, topicLabel }: { laws: readonly TopicLaw[]; topicLabel: string }) {
  if (laws.length === 0) return null;
  return (
    <div data-cta="nav" data-cta-label="topic-laws">
      <h2 className="mb-2 font-serif text-2xl font-bold text-(--ink)">{topicLabel}の記事が引く法令</h2>
      <p className="mb-6 text-sm text-(--ink-muted)">このテーマの記事が本文で根拠として引いている法令と、その法令を扱う記事です（法令名は e-Gov 法令検索へ）。</p>
      <ul className="space-y-5">
        {laws.map((law) => (
          <li key={law.lawId}>
            <p className="text-[15px]">
              <a href={law.url} target="_blank" rel="noopener noreferrer" className="font-medium text-(--accent) hover:underline">{law.title}</a>
              <span className="ml-2 text-[12px] text-(--ink-muted)">このテーマの記事 {law.count}件</span>
            </p>
            {law.picks.length > 0 && (
              <ul className="mt-1.5 space-y-1 pl-4">
                {law.picks.map((doc) => (
                  <li key={doc.slug} className="text-[14px]">
                    <Link href={doc.href} className="text-(--ink-body) hover:text-(--accent) hover:underline">{doc.title}</Link>
                    <span className="ml-2 text-[12px] text-(--ink-muted)">{doc.categoryLabel}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LawDirectory({ rows }: { rows: readonly LawDirectoryRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div data-cta="nav" data-cta-label="law-directory">
      <h2 className="mb-2 font-serif text-2xl font-bold text-(--ink)">法令と分野の対応</h2>
      <p className="mb-6 text-sm text-(--ink-muted)">3 本以上の記事が引く法令を、引く記事の多い順に並べ、その法令を引く記事が多い分野・立場のテーマへつなぎます。</p>
      <ul className="divide-y divide-(--rule-soft) border-y border-(--rule-soft) dark:divide-(--rule-soft) dark:border-(--rule-soft)">
        {rows.map((row) => (
          <li key={row.lawId} className="py-3">
            <p className="text-[15px]">
              <a href={row.url} target="_blank" rel="noopener noreferrer" className="font-medium text-(--accent) hover:underline">{row.title}</a>
              <span className="ml-2 text-[12px] text-(--ink-muted)">記事 {row.count}件</span>
            </p>
            {row.topics.length > 0 && (
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
                {row.topics.map((t) => (
                  <Link key={t.slug} href={`/topics/${t.slug}`} className="text-(--ink-body) hover:text-(--accent) hover:underline">
                    {t.label}<span className="ml-1 text-(--ink-muted)">（{t.count}）</span>
                  </Link>
                ))}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
