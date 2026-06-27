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

import type { ReferenceItem } from '@/lib/extract-references';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import MetaListItem from '@/components/ui/MetaListItem/MetaListItem';

interface ExternalReferencesProps {
  references: ReferenceItem[];
}

export default function ExternalReferences({ references }: ExternalReferencesProps) {
  if (!references || references.length === 0) return null;

  return (
    <MetaCard ariaLabel="参考資料">
      <h2 className="text-lg font-bold text-[var(--ink)] mb-1">参考資料</h2>
      <p className="text-sm text-[var(--ink-muted)] mb-4">
        公的資料・解説記事への外部リンク（{references.length} 件）
      </p>
      <ul className="space-y-2">
        {references.map((item, i) => (
          <li key={`${item.url || 'no-url'}-${i}`}>
            {item.url ? (
              <a
                href={item.url}
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
