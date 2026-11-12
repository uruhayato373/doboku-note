import Link from 'next/link';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import { type ExamStepBridgeData } from '@/lib/exam-step-bridge';

/**
 * ExamStepBridge — 技術士第一次試験の過去問ページの記事末で、二次試験（記述式）の入口へ送る 1 枚。
 * 行き先は resolveExamStepBridge（科目→部門）。クリックは internal_nav_click（label=exam-step）。
 */
export default function ExamStepBridge({ data }: { data: ExamStepBridgeData }) {
  return (
    <MetaCard ariaLabel={data.heading} trackNav="exam-step">
      <h2 className="text-lg font-bold text-(--ink) mb-1">{data.heading}</h2>
      <p className="text-sm text-(--ink-muted) mb-4">{data.lead}</p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {data.links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="block h-full rounded-card-content border border-(--rule-soft) px-4 py-3 transition-colors hover:border-brand"
            >
              <span className="block text-[15px] font-medium text-(--ink)">{l.label}</span>
              <span className="mt-0.5 block text-[13px] text-(--ink-muted)">{l.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </MetaCard>
  );
}
