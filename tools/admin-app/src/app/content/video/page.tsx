import Link from 'next/link';
import { DataTable, DetailList, DetailSheet, type DataTableColumn, type DataTableRow, PanelCard, StatusBadge, type Tone, FilterBar, FilterChip } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { longformPlanHref } from '@/lib/content-plan-links';
import { videoPackBoard, examLabel, stageClass } from '@/lib/video-board';
import { STAGE_ORDER, LABELS } from '@/lib/lifecycle';

export const dynamic = 'force-dynamic';

const COLUMNS: DataTableColumn[] = [
  { key: 'stage', label: '段階' },
  { key: 'title', label: 'タイトル' },
  { key: 'qa', label: 'QA', num: true },
];

/**
 * /content/video — 動画パック企画ボード（read-only・DN-0110 Phase 3 の最小版）。
 *
 * 企画（manifest のみ）から公開までを 1 画面で見る。行の組み立ては
 * scripts/lib/video-content-check.mjs の loadPackSummaries（CLI の
 * build-video-pack-index と同一実装）で、ここは絞り込みと表示だけ。
 * 編集・生成・公開ボタンは置かない（管理画面は判断のための読み取り専用）。
 */
export default async function VideoPackBoard({
  searchParams,
}: {
  searchParams: Promise<{ exam?: string; stage?: string }>;
}) {
  const sp = await searchParams;
  const board = videoPackBoard();

  if (!board.ok) {
    return (
      <>
        <PageHead title="動画パック" />
        <p className="text-sm"><StatusBadge tone="bad">未取得</StatusBadge> {board.reason}</p>
      </>
    );
  }

  const exams = [...new Set(board.rows.map((r) => r.exam))].sort();
  const activeExam = exams.includes(sp.exam ?? '') ? sp.exam! : 'all';
  const activeStage = [...STAGE_ORDER, 'unknown'].includes(sp.stage ?? '') ? sp.stage! : 'all';

  const filtered = board.rows.filter(
    (r) =>
      (activeExam === 'all' || r.exam === activeExam) &&
      (activeStage === 'all' || (r.stage ?? 'unknown') === activeStage),
  );

  const link = (patch: Partial<{ exam: string; stage: string }>) => {
    const exam = patch.exam ?? activeExam;
    const stage = patch.stage ?? activeStage;
    const q = new URLSearchParams();
    if (exam !== 'all') q.set('exam', exam);
    if (stage !== 'all') q.set('stage', stage);
    const s = q.toString();
    return '/content/video' + (s ? `?${s}` : '');
  };

  const rows: DataTableRow[] = filtered.map((r) => ({
    id: r.packId,
    values: {
      stage: r.stage ? LABELS[r.stage] : '不明',
      title: r.title,
      qa: r.qa?.avg ?? null,
    },
    cells: {
      stage: (
        <StatusBadge tone={stageClass(r.stage) as Tone}>
          {r.stage ? LABELS[r.stage] : '不明'}
        </StatusBadge>
      ),
      title: (
        <DetailSheet trigger={r.title} title={r.title} description={r.packId}>
          <DetailList
            items={[
              { label: '資格', value: examLabel(r.exam) },
              { label: '悩み', value: r.pain },
              { label: 'intent', value: r.intent },
              { label: '主CTA', value: r.cta },
              { label: '台本', value: r.hasScript ? <Link href={`/content/content~sns/video-packs/${r.exam}/${r.slug}/script`}>開く</Link> : null },
              { label: '構成', value: r.hasStoryboard ? '有' : null },
              { label: 'ファイル', value: <Link href={`/content/content~sns/video-packs/${r.exam}/${r.slug}`}>開く</Link> },
            ]}
          />
        </DetailSheet>
      ),
      qa: r.qa ? (
        <StatusBadge tone={r.qa.blocks ? 'bad' : 'good'}>
          {r.qa.avg}
          {r.qa.blocks ? ` / B${r.qa.blocks}` : ''}
        </StatusBadge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    },
  }));

  return (
    <>
      <PageHead title="動画パック" />

      <nav className="project-crumbs" aria-label="パンくず">
        <Link href={longformPlanHref()}>通常動画の制作・公開管理</Link>
        {' · '}
        <Link href="/content">コンテンツ</Link>
        {' · '}
        <Link href="/content/lifecycle">ライフサイクル</Link>
        {' · '}
        <Link href="/content/content~sns/video-packs">ファイル</Link>
      </nav>

      {/* 段階（共通ライフサイクル ステージ）*/}
      <FilterBar>
        <FilterChip href={link({ stage: 'all' })} active={activeStage === 'all'}>
          全て {board.rows.length}
        </FilterChip>
        {[...STAGE_ORDER, 'unknown']
          .filter((s) => board.byStage[s])
          .map((s) => (
            <FilterChip key={s} href={link({ stage: s })} active={activeStage === s}>
              {s === 'unknown' ? '不明' : LABELS[s]} {board.byStage[s]}
            </FilterChip>
          ))}
      </FilterBar>

      {/* 資格 */}
      <FilterBar>
        <FilterChip href={link({ exam: 'all' })} active={activeExam === 'all'}>
          全資格
        </FilterChip>
        {exams.map((e) => (
          <FilterChip key={e} href={link({ exam: e })} active={activeExam === e}>
            {examLabel(e)} {board.rows.filter((r) => r.exam === e).length}
          </FilterChip>
        ))}
      </FilterBar>

      <PanelCard title="企画一覧">
        <DataTable columns={COLUMNS} rows={rows} filter="packId・タイトルで絞り込む" emptyText="該当なし" />
      </PanelCard>
    </>
  );
}
