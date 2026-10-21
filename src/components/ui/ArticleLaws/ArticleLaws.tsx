/**
 * 記事末尾の「この記事の根拠法令」カード（DN-0731）。
 *
 * 記事の本文の e-Gov 法令検索へのリンクから、引いている法令と条を集めて並べる（src/lib/egov-links.mjs の articleLaws）。
 * 法令の分類はタグで作らない（付け忘れと手入れが要る・docs/strategy/05_情報アーキテクチャ.md「法令ページ」）。
 * 法令名は e-Gov の法令のページへ、条は e-Gov の条へつなぐ。法令ページ（/laws/）を公開したら、法令名の行き先をそちらへ替える。
 * 法令ごとに、同じ法令を引く他の記事（他の資格・実務を先に）を並べる（siblings。src/lib/article-end-wiring.ts の
 * resolveLawSiblings が選ぶ）。計測は記事の一覧だけを data-cta="nav"（label law-siblings）で囲む（e-Gov への外部リンクは数えない）。
 *
 * MDX には書かれない。DocPage → ArticleFooter で render-time に注入される。視覚文法は ExternalReferences と同じ（MetaCard + MetaListItem）。
 */

import Link from 'next/link';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import MetaListItem from '@/components/ui/MetaListItem/MetaListItem';
import type { WiredDoc } from '@/lib/article-end-wiring';

export interface ArticleLaw {
  readonly lawId: string;
  readonly title: string;
  readonly url: string;
  readonly articles: readonly { readonly article: string; readonly label: string; readonly url: string }[];
}

export default function ArticleLaws({ laws, siblings }: { laws: readonly ArticleLaw[]; siblings?: ReadonlyMap<string, readonly WiredDoc[]> }) {
  if (!laws || laws.length === 0) return null;
  return (
    <MetaCard ariaLabel="この記事の根拠法令">
      <h2 className="text-lg font-bold text-(--ink) mb-1">この記事の根拠法令</h2>
      <p className="text-sm text-(--ink-muted) mb-4">
        本文が引いている法令と条（e-Gov 法令検索・{laws.length} 法令）
      </p>
      <ul className="space-y-2">
        {laws.map((law) => {
          const related = siblings?.get(law.lawId) ?? [];
          return (
          <li key={law.lawId}>
            <a href={law.url} target="_blank" rel="noopener noreferrer" className="block group">
              <MetaListItem title={law.title} />
            </a>
            {law.articles.length > 0 && (
              <p className="ml-5 mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {law.articles.map((a) => (
                  <a key={a.article} href={a.url} target="_blank" rel="noopener noreferrer" className="text-(--accent) hover:underline">
                    {a.label}
                  </a>
                ))}
              </p>
            )}
            {related.length > 0 && (
              <div className="ml-5 mt-2" data-cta="nav" data-cta-label="law-siblings">
                <p className="text-xs text-(--ink-muted)">同じ法令を扱う記事</p>
                <ul className="mt-1 space-y-1">
                  {related.map((doc) => (
                    <li key={doc.slug}>
                      <Link href={doc.href} className="block group">
                        <MetaListItem title={doc.title} source={doc.categoryLabel} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
          );
        })}
      </ul>
    </MetaCard>
  );
}
