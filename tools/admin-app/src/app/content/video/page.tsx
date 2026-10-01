import Link from 'next/link';
import {
  numCol, PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow, type Tone,
} from '@/components/admin';
import { PageHead } from '@/components/ui';
import { videoPackBoard, examLabel, stageClass } from '@/lib/video-board';
import { STAGE_ORDER, LABELS } from '@/lib/lifecycle';

export const dynamic = 'force-dynamic';

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
        <PageHead title="動画パック" sub="content/sns/video-packs（read-only）" />
        <p className="text-sm text-muted-foreground">
          <StatusBadge tone="bad">未取得</StatusBadge> パックを読めていません: {board.reason}
        </p>
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

  return (
    <>
      <PageHead
        title="動画パック"
        sub={`${board.rows.length} 件 · content/sns/video-packs/**/video-pack.json + .claude/state/video-content-status.json（表示中 ${filtered.length}）`}
      />

      <nav className="project-crumbs" aria-label="パンくず">
        <Link href="/content">コンテンツ</Link>
        {' · '}
        <Link href="/content/lifecycle">ライフサイクル</Link>
        {' · '}
        <Link href="/content/content~sns/video-packs">ファイル</Link>
      </nav>

      {/* 段階（共通ライフサイクル ステージ）*/}
      <div className="filterbar">
        <span className="mr-1 self-center text-xs text-muted-foreground">
          段階:
        </span>
        <Link href={link({ stage: 'all' })} className={'chip' + (activeStage === 'all' ? ' active' : '')}>
          全て {board.rows.length}
        </Link>
        {[...STAGE_ORDER, 'unknown']
          .filter((s) => board.byStage[s])
          .map((s) => (
            <Link key={s} href={link({ stage: s })} className={'chip' + (activeStage === s ? ' active' : '')}>
              {s === 'unknown' ? '不明' : LABELS[s]} {board.byStage[s]}
            </Link>
          ))}
      </div>

      {/* 資格 */}
      <div className="filterbar">
        <Link href={link({ exam: 'all' })} className={'chip' + (activeExam === 'all' ? ' active' : '')}>
          全資格
        </Link>
        {exams.map((e) => (
          <Link key={e} href={link({ exam: e })} className={'chip' + (activeExam === e ? ' active' : '')}>
            {examLabel(e)} {board.rows.filter((r) => r.exam === e).length}
          </Link>
        ))}
      </div>

      <PanelCard title="企画一覧" description="企画（manifest のみ）→ 下書き → レビュー → 予約 → 公開">
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>段階</TableHead>
              <TableHead>packId</TableHead>
              <TableHead>タイトル / 悩み</TableHead>
              <TableHead>intent</TableHead>
              <TableHead>台本</TableHead>
              <TableHead>構成</TableHead>
              <TableHead className={numCol}>QA</TableHead>
              <TableHead>主CTA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.packId}>
                <TableCell>
                  <StatusBadge tone={stageClass(r.stage) as Tone}>
                    {r.stage ? LABELS[r.stage] : '不明'}
                  </StatusBadge>
                </TableCell>
                <TableCell className="font-mono">
                  <Link href={`/content/content~sns/video-packs/${r.exam}/${r.slug}`}>{r.packId}</Link>
                  <div className="text-xs text-muted-foreground">{examLabel(r.exam)}</div>
                </TableCell>
                <TableCell>
                  {r.hasScript ? (
                    <Link href={`/content/content~sns/video-packs/${r.exam}/${r.slug}/script`}>{r.title}</Link>
                  ) : (
                    r.title
                  )}
                  <div className="text-xs text-muted-foreground">{r.pain}</div>
                </TableCell>
                <TableCell className="font-mono text-xs">{r.intent}</TableCell>
                <TableCell>{r.hasScript ? <StatusBadge tone="good">有</StatusBadge> : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>{r.hasStoryboard ? <StatusBadge tone="good">有</StatusBadge> : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className={numCol}>
                  {r.qa ? (
                    <StatusBadge tone={r.qa.blocks ? 'bad' : 'good'}>
                      {r.qa.avg}
                      {r.qa.blocks ? ` / B${r.qa.blocks}` : ''}
                    </StatusBadge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{r.cta ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableFrame>
        {filtered.length === 0 && <p className="mt-3 text-sm text-muted-foreground">この条件に一致するパックはありません。</p>}
      </PanelCard>
    </>
  );
}
