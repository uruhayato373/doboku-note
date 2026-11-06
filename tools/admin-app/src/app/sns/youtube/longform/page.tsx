import Link from 'next/link';
import { VideoAnnualPlan, type PlanConfig } from '@/components/video-annual-plan';
import { PageHead } from '@/components/ui';
import { findRepoRoot } from '@/lib/repo-root';
import { roadmapHref } from '@/lib/content-plan-links';
import { loadLongformPlan, loadPlanAudit } from '../../../../../../../scripts/lib/youtube-longform-plan.mjs';
import { loadRoadmap, monthsOf, examTimeline } from '../../../../../../../scripts/lib/annual-roadmap.mjs';
import { readDataset } from '../../../../../../../scripts/lib/dataset-io.mjs';

export const dynamic = 'force-dynamic';

/** 通常動画の制作・予約管理。年間ロードマップの期間・試験日程を参照する。 */
export default async function LongformPage({ searchParams }: { searchParams: Promise<{ m?: string; e?: string; library?: string; s?: string; tab?: string }> }) {
  const sp = await searchParams;
  const root = findRepoRoot();
  const cfg = loadRoadmap(root);
  const months = monthsOf(cfg.period) as string[];
  const month = months.includes(sp.m ?? '') ? sp.m : undefined;
  let board: ReturnType<typeof loadLongformPlan> | null = null;
  let error: string | null = null;
  let planAudit: ReturnType<typeof loadPlanAudit>['audit'] | null = null;
  try { board = loadLongformPlan(root); planAudit = loadPlanAudit(root).audit; } catch (e) { error = (e as Error).message; }
  const calendar = readDataset(root, 'config.exam-calendar');
  const formats = new Map<string, { label: string; status: string }>((readDataset(root, 'config.youtube-formats').formats as { id: string; label: string; status: string }[]).map((f) => [f.id, f]));
  // 日付は写さず試験日程の台帳から引く。2027 年度は公式発表前なので、2026 年度の実績を目安と明示する
  const slotInfo = Object.fromEntries(((board?.plan.slots ?? []) as PlanConfig['slots']).map((s) => {
    const q = calendar.exams[s.exam];
    const anchors = s.anchors.map((a) => {
      const hit = q?.events?.[a] ?? q?.periods?.[a];
      return hit ? `${hit.label}: ${hit.date ?? hit.window}（${q.year} 年度の実績・予定）` : a;
    });
    return [s.id, { format: formats.get(s.format)?.label ?? s.format, formatStatus: formats.get(s.format)?.status ?? '不明', anchors }];
  }));
  const videoExams = new Set(board?.rows.map((r) => r.exam) ?? []);
  const exams = examTimeline(calendar, [...videoExams], cfg.period, cfg.buyWindowWeeks);
  const periods = Object.entries(calendar.exams as Record<string, { periods?: Record<string, { label: string; window: string }> }>)
    .filter(([id]) => videoExams.has(id))
    .flatMap(([exam, q]) => Object.values(q.periods ?? {}).map((p) => ({ exam, ...p })));

  return <>
    <PageHead title="通常動画の制作・公開管理" />
    <nav className="project-crumbs" aria-label="関連する計画と台帳">
      <Link href={roadmapHref(month)}>年間ロードマップ</Link> · <Link href="/plan/roadmap?tab=channels">チャネルの年間の枠</Link> · <Link href={`/schedule?dom=sns${month ? `&m=${month}` : ''}`}>SNS全体の予定</Link> · <Link href="/content/video">動画パック</Link>
    </nav>
    {board ? <VideoAnnualPlan board={board} planAudit={planAudit} slotInfo={slotInfo} months={months} exams={exams} periods={periods} month={month} exam={sp.e} library={sp.library === '1'} view={sp.s} tab={sp.tab} />
      : <p>動画計画を取得できません: {error}</p>}
  </>;
}
