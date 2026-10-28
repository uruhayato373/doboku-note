/**
 * 記事末尾の参考資料カード。
 *
 * `## 参考資料` セクションを `extractReferencesSection` で抽出した
 * `ReferenceItem[]` を受け取り、PastExamBacklinks と同じ視覚文法
 * （MetaCard + MetaListItem）で外部リンクのリストを表示する。
 *
 * MDX には書かれない。`src/app/docs/[...slug]/page.tsx` で
 * render-time に注入される。
 */

import type { ReferenceItem, ReferencePart } from '@/lib/extract-references';
import { getPublicDocPath } from '@/lib/content-routes';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import MetaListItem from '@/components/ui/MetaListItem/MetaListItem';

interface ExternalReferencesProps {
  references: ReferenceItem[];
}

// 旧 /docs/{slug} は本文と同じく正規 URL へ置き換える（転送を経由させない）
function resolveHref(url: string): string {
  const legacy = url.match(/^\/docs\/([^/?#]+)/);
  return legacy?.[1] ? getPublicDocPath(legacy[1]) : url;
}

function InlineParts({ parts }: { parts: ReferencePart[] }) {
  return (
    <>
      {parts.map((part, i) => {
        if (!part.url) return <span key={i}>{part.text}</span>;
        const href = resolveHref(part.url);
        const external = /^https?:/.test(href);
        return (
          <a
            key={i}
            href={href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="text-(--accent) underline underline-offset-2 hover:no-underline"
          >
            {part.text}
          </a>
        );
      })}
    </>
  );
}

export default function ExternalReferences({ references }: ExternalReferencesProps) {
  if (!references || references.length === 0) return null;

  return (
    <MetaCard ariaLabel="参考資料">
      <h2 className="text-lg font-bold text-(--ink) mb-1">参考資料</h2>
      <p className="text-sm text-(--ink-muted) mb-4">
        公的資料・解説記事への外部リンク（{references.length} 件）
      </p>
      {/* 題が URL そのものの行はスマホ幅で折り返さずページを横にはみ出させる */}
      <ul className="space-y-2 wrap-anywhere">
        {references.map((item, i) => (
          <li key={`${item.url || 'no-url'}-${i}`}>
            {item.parts ? (
              <div>
                <MetaListItem title={<InlineParts parts={item.parts} />} plain />
              </div>
            ) : item.url ? (
              <a
                href={resolveHref(item.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <MetaListItem title={item.title} source={item.source} />
              </a>
            ) : (
              <div>
                <MetaListItem title={item.title} source={item.source} plain />
              </div>
            )}
          </li>
        ))}
      </ul>
    </MetaCard>
  );
}
