/**
 * 記事末尾の参考資料カード。
 *
 * `## 参考資料` セクションを `extractReferencesSection` で抽出した
 * `ReferenceItem[]` を受け取り、PastExamBacklinks と同じビジュアル
 * 文法（→ 矢印 + text-sm + blue リンク）で外部リンクのリストを表示する。
 *
 * MDX には書かれない。`src/app/docs/[...slug]/page.tsx` で
 * render-time に注入される。
 */

import type { ReferenceItem } from '@/lib/extract-references';
import MetaCard from '@/components/ui/MetaCard/MetaCard';

interface ExternalReferencesProps {
  references: ReferenceItem[];
}

export default function ExternalReferences({ references }: ExternalReferencesProps) {
  if (!references || references.length === 0) return null;

  return (
    <MetaCard ariaLabel="参考資料">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">参考資料</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        公的資料・解説記事への外部リンク（{references.length} 件）
      </p>
      <ul className="space-y-2">
        {references.map((item, i) => (
          <li key={`${item.url || 'no-url'}-${i}`}>
            <ReferenceListItem item={item} />
          </li>
        ))}
      </ul>
    </MetaCard>
  );
}

function ReferenceListItem({ item }: { item: ReferenceItem }) {
  const titleColor = item.url
    ? 'text-blue-600 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-300 group-hover:underline'
    : 'text-gray-700 dark:text-gray-300';

  const Inner = (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-gray-500 dark:text-gray-400 shrink-0 leading-tight">→</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className={titleColor}>{item.title}</span>
          {item.source && (
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
              {item.source}
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            {item.description}
          </p>
        )}
      </div>
    </div>
  );

  if (!item.url) return <div>{Inner}</div>;

  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className="block group">
      {Inner}
    </a>
  );
}
