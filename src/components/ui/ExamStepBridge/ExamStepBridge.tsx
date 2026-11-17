import LinkTile from '@/components/ui/LinkTile/LinkTile';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import { type ExamStepBridgeData } from '@/lib/exam-step-bridge';

/**
 * ExamStepBridge — 技術士第一次試験の過去問ページの記事末で、二次試験（記述式）の入口へ送る 1 枚。
 * 行き先は resolveExamStepBridge（科目→部門）。クリックは internal_nav_click（label=exam-step）。
 */
export default function ExamStepBridge({ data }: { data: ExamStepBridgeData }) {
  return (
    <MetaCard ariaLabel={data.heading} trackNav="exam-step" title={data.heading} lead={data.lead}>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {data.links.map((l) => (
          <li key={l.href}>
            <LinkTile href={l.href} title={l.label} description={l.hint} />
          </li>
        ))}
      </ul>
    </MetaCard>
  );
}
