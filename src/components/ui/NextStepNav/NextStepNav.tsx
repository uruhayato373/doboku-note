import Link from 'next/link';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import { resolveNextSteps } from '@/lib/next-step';

/**
 * NextStepNav — guide（要点・概要）記事末の「次のステップ」導線。
 *
 * 要点をつかんだ読者を演習（過去問）・テキスト・分野へ送り、行き止まりを解消する。
 * リンク先はカテゴリページの sec-* アンカー（直前期 note CTA と同居＝回遊と収益導線が接続）。
 * クリックは MetaCard trackNav 経由で internal_nav_click（label=next-step）として計測される。
 * キャリア記事では呼び出し側で描画しない（転職導線と競合させない）。
 */
export default function NextStepNav({ category }: { category: string }) {
  const steps = resolveNextSteps(category);
  if (steps.length === 0) return null;
  return (
    <MetaCard ariaLabel="次のステップ" trackNav="next-step">
      <h2 className="text-lg font-bold text-[var(--ink)] mb-1">次のステップ</h2>
      <p className="text-sm text-[var(--ink-muted)] mb-4">
        要点をつかんだら、演習と本文で定着させましょう。
      </p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="block h-full rounded-card-content border border-[var(--rule-soft)] px-4 py-3 transition-colors hover:border-brand"
            >
              <span className="block text-[15px] font-medium text-[var(--ink)]">{s.label}</span>
              <span className="mt-0.5 block text-[13px] text-[var(--ink-muted)]">{s.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </MetaCard>
  );
}
