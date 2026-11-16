import ArticleThumbRow from '@/components/ui/RelatedArticles/ArticleThumbRow';
import LinkTile from '@/components/ui/LinkTile/LinkTile';
import { findDocByPublicPath } from '@/lib/content-routes';
import { getCardImage } from '@/lib/site-thumbnail';

export interface RelatedPageLink {
  readonly href: string;
  readonly title: string;
  readonly description?: string;
}

/**
 * ツールの末尾の「関連するページ」。行き先が記事なら画像つきの行（ArticleThumbRow の card 型）、記事でない行き先（ツール一覧・別のツール・外部）は枠つきタイル（LinkTile）。
 * 2026-11-17 に 13 か所の手書きのタイルをまとめた（運営者判断: 行き先に画像があれば画像つき）。画像は台帳から引くので server で描き、client のツールには ReactNode で渡す。
 */
export default function RelatedPages({ links, toolsIndex, toolsIndexFirst = false, heading = '関連するページ' }: { links: readonly RelatedPageLink[]; toolsIndex?: string; toolsIndexFirst?: boolean; heading?: string }) {
  const index: RelatedPageLink[] = toolsIndex ? [{ href: '/tools', title: '無料ツール一覧', description: toolsIndex }] : [];
  const all = toolsIndexFirst ? [...index, ...links] : [...links, ...index];
  if (!all.length) return null;
  return (
    <div className="mt-6">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-(--ink-muted)">{heading}</div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {all.map((link) => {
          const doc = findDocByPublicPath(link.href);
          return (
            <li key={link.href}>
              {doc
                ? <ArticleThumbRow href={link.href} title={link.title} caption={link.description} image={getCardImage(doc)} />
                : <LinkTile href={link.href} title={link.title} description={link.description} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
