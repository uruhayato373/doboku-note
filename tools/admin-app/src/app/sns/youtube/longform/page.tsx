import Link from 'next/link';
import { VideoAnnualPlan } from '@/components/video-annual-plan';
import { PageHead } from '@/components/ui';
import { findRepoRoot } from '@/lib/repo-root';
import { roadmapHref } from '@/lib/content-plan-links';
import { loadLongformPlan } from '../../../../../../../scripts/lib/youtube-longform-plan.mjs';
import { loadRoadmap, monthsOf, examTimeline } from '../../../../../../../scripts/lib/annual-roadmap.mjs';
import { readDataset } from '../../../../../../../scripts/lib/dataset-io.mjs';

export const dynamic = 'force-dynamic';

/** 通常動画の制作・予約管理。年間ロードマップの期間・試験日程を参照する。 */
export default async function LongformPage({ searchParams }: { searchParams: Promise<{ m?: string; e?: string; library?: string }> }) {
  const sp = await searchParams;
  const root = findRepoRoot();
  const cfg = loadRoadmap(root);
  const months = monthsOf(cfg.period) as string[];
  const month = months.includes(sp.m ?? '') ? sp.m : undefined;
  let board: ReturnType<typeof loadLongformPlan> | null = null;
  let error: string | null = null;
  try { board = loadLongformPlan(root); } catch (e) { error = (e as Error).message; }
  const calendar = readDataset(root, 'config.exam-calendar');
  const videoExams = new Set(board?.rows.map((r) => r.exam) ?? []);
  const exams = examTimeline(calendar, [...videoExams], cfg.period, cfg.buyWindowWeeks);
  const periods = Object.entries(calendar.exams as Record<string, { periods?: Record<string, { label: string; window: string }> }>)
    .filter(([id]) => videoExams.has(id))
    .flatMap(([exam, q]) => Object.values(q.periods ?? {}).map((p) => ({ exam, ...p })));

  return <>
    <PageHead title="通常動画の制作・公開管理" sub="制作順・確認期限・予約状況を動画ごとに確認" />
    <nav className="project-crumbs" aria-label="関連する計画と台帳">
      <Link href={roadmapHref(month)}>年間ロードマップ</Link> · <Link href={`/schedule?dom=sns${month ? `&m=${month}` : ''}`}>SNS全体の予定</Link> · <Link href="/content/video">動画パック</Link>
    </nav>
    {board ? <VideoAnnualPlan board={board} months={months} exams={exams} periods={periods} month={month} exam={sp.e} library={sp.library === '1'} />
      : <p>動画計画を取得できません: {error}</p>}
  </>;
}
