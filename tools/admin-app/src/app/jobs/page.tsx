import { PageHead } from '@/components/ui';
import JobRunner, { type IgPackOpt, type XDraftOpt } from '@/components/JobRunner';
import { scanSnsPacks } from '@/lib/gallery';
import { xBoard } from '@/lib/sns-board';

export const dynamic = 'force-dynamic';

export default function JobsPage() {
  // IG パック候補（instagram/ を除去して publish の pack 引数形式へ）
  const igPacks: IgPackOpt[] = scanSnsPacks()
    .packs.filter((p) => p.channel === 'instagram')
    .map((p) => ({ value: p.rel.replace(/^instagram\//, ''), label: p.label }));

  // X ドラフト候補
  const xDrafts: XDraftOpt[] = xBoard().drafts.map((d) => ({
    value: d.name,
    label: `${d.name}（投稿${d.counts.posted}/予約${d.counts.scheduled}/下書${d.counts.draft}）`,
  }));

  return (
    <>
      <PageHead
        title="投稿ジョブ"
        sub="ホワイトリスト実行 · dry-run 既定 · 本番は明示ゲート · ガードは CLI 側（迂回不能）"
      />
      <JobRunner igPacks={igPacks} xDrafts={xDrafts} />
    </>
  );
}
