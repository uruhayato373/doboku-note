import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { videoPackBoard, EXAM_LABELS, stageClass } from '@/lib/video-board';
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
        <div className="card">
          <p className="badge bad">未取得</p>
          <p className="muted">パックを読めていません: {board.reason}</p>
        </div>
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
        <span className="muted small" style={{ alignSelf: 'center', marginRight: 4 }}>
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
            {EXAM_LABELS[e] ?? e} {board.rows.filter((r) => r.exam === e).length}
          </Link>
        ))}
      </div>

      <div className="card">
        <h2>
          企画一覧
          <span className="sub">企画（manifest のみ）→ 下書き → レビュー → 予約 → 公開</span>
        </h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>段階</th>
                <th>packId</th>
                <th>タイトル / 悩み</th>
                <th>intent</th>
                <th>台本</th>
                <th>構成</th>
                <th>QA</th>
                <th>主CTA</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.packId}>
                  <td>
                    <span className={`badge ${stageClass(r.stage)}`}>
                      {r.stage ? LABELS[r.stage] : '不明'}
                    </span>
                  </td>
                  <td className="mono">
                    <Link href={`/content/content~sns/video-packs/${r.exam}/${r.slug}`}>{r.packId}</Link>
                    <div className="muted small">{EXAM_LABELS[r.exam] ?? r.exam}</div>
                  </td>
                  <td>
                    {r.hasScript ? (
                      <Link href={`/content/content~sns/video-packs/${r.exam}/${r.slug}/script`}>{r.title}</Link>
                    ) : (
                      r.title
                    )}
                    <div className="muted small">{r.pain}</div>
                  </td>
                  <td className="mono small">{r.intent}</td>
                  <td>{r.hasScript ? <span className="badge good">有</span> : <span className="muted">—</span>}</td>
                  <td>{r.hasStoryboard ? <span className="badge good">有</span> : <span className="muted">—</span>}</td>
                  <td className="num">
                    {r.qa ? (
                      <span className={`badge ${r.qa.blocks ? 'bad' : 'good'}`}>
                        {r.qa.avg}
                        {r.qa.blocks ? ` / B${r.qa.blocks}` : ''}
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="mono small">{r.cta ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="muted">この条件に一致するパックはありません。</p>}
      </div>
    </>
  );
}
