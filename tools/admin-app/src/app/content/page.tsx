import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { summarizeChannels } from '@/lib/document-store';
import { rootById, contentChannelLabel } from '@/lib/document-roots';
import { loadKindleSummary } from '@/lib/kindle';

export const dynamic = 'force-dynamic';

/**
 * /content — チャネル一覧（第 1 段）。
 *
 * content は 1 万ファイル規模になるので、**初期表示で本文を 1 つも読まない**。
 * ここで数えるのは件数と bytes（statSync）だけで、ドリルダウンして初めて文書を開く。
 * 記事・note・マガジンの専用ビューは従来どおり /content/articles などが担当する。
 */
export default function ContentPage() {
  const d = rootById('content')!;
  const channels = summarizeChannels(d);
  const hasKindle = channels.some((c) => c.segment === 'kindle');
  // /content ではカード表示に必要な件数だけ（loadKindleView の git log 実行はここでは呼ばない）。
  const kindleSummary = hasKindle ? loadKindleSummary() : null;

  return (
    <>
      <PageHead title="コンテンツ" />

      <div className="knowledge-grid">
        {channels.map((c) => {
          const drilldownHref = `/content/${encodeURIComponent(`${c.filePrefix}~${c.relDir}`)}`;

          if (c.segment === 'kindle' && kindleSummary) {
            return (
              <Link className="knowledge-card" href="/content/kindle" key={`${c.filePrefix}/${c.segment}`}>
                <h2>{contentChannelLabel(c.segment)}</h2>
                <div className="knowledge-card-meta">
                  <span>{kindleSummary.total} 冊</span>
                  <span>live {kindleSummary.live}</span>
                  {kindleSummary.inReview > 0 && <span>審査中 {kindleSummary.inReview}</span>}
                </div>
                <div className="knowledge-card-meta">
                  <span>{c.files} ファイル</span>
                  <span>{(c.bytes / 1048576).toFixed(1)}MB</span>
                </div>
              </Link>
            );
          }

          return (
            <Link className="knowledge-card" href={drilldownHref} key={`${c.filePrefix}/${c.segment}`}>
              <h2>{contentChannelLabel(c.segment)}</h2>
              <div className="knowledge-card-meta">
                <span>{c.files} ファイル</span>
                <span>{(c.bytes / 1048576).toFixed(1)}MB</span>
              </div>
            </Link>
          );
        })}
      </div>
      {channels.length === 0 && <p className="text-sm text-muted-foreground">{d.emptyState}</p>}
    </>
  );
}
