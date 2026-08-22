import Link from 'next/link';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import { resolveCareerNextSteps } from '@/config/career-pathways';

/**
 * CareerNextStepNav — キャリア記事の記事末に置く**内部**次行動。
 *
 * なぜ広告ではなく内部導線か: 2026-07-16〜08-12 の実測で、記事末の 300×250 転職バナーは
 * **975 表示 0 クリック（CTR 0.00%）** だった。同じ枠に別の広告を入れ替えても改善する根拠がなく、
 * キャリア記事に限って「悩みに対応する柱」と「hub」へ戻す内部導線に置き換える。
 * 転職 CTA 自体は本文中間のネイティブカード（実測 0.41% で最良の面）に集約する。
 *
 * 非キャリア記事の記事末バナーはこの変更の対象外（ArticleFooter 側で分岐）。
 *
 * クリックは MetaCard の trackNav 経由で `internal_nav_click`（label=career-next-step）として計測される。
 * 真実源: src/config/career-pathways.ts
 */
export default function CareerNextStepNav({ slug }: { slug: string }) {
  const steps = resolveCareerNextSteps(slug);
  if (steps.length === 0) return null;
  return (
    <MetaCard ariaLabel="次に読むページ" trackNav="career-next-step">
      <h2 className="text-lg font-bold text-[var(--ink)] mb-1">次に読むページ</h2>
      <p className="text-sm text-[var(--ink-muted)] mb-4">
        いま迷っている内容に近いほうを 1 つ選んで、そこで示された行動を先に済ませてください。
      </p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="block h-full rounded-card-content border border-[var(--rule-soft)] px-4 py-3 transition-colors hover:border-brand"
            >
              <span className="block text-[15px] font-medium text-[var(--ink)]">{s.title}</span>
              <span className="mt-0.5 block text-[13px] text-[var(--ink-muted)]">{s.reason}</span>
            </Link>
          </li>
        ))}
      </ul>
    </MetaCard>
  );
}
