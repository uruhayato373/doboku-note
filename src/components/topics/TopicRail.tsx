import RailStack from '@/components/ui/RailStack/RailStack';
import RailArticleList from '@/components/ui/RelatedArticles/RailArticleList';
import AuthorProfile from '@/components/ui/AuthorProfile/AuthorProfile';
import ResponsiveAffiliateBanner from '@/components/ui/SidebarAdBanner/ResponsiveAffiliateBanner';
import RailFollow from '@/components/ui/RailFollow/RailFollow';
import { followToc } from '@/components/docs/follow-toc';
import { getPublicDocPath } from '@/lib/content-routes';
import type { DocMeta } from '@/lib/docs';
import { getPopularDocs } from '@/lib/popular';
import { pixelFor, resolvePlacements } from '@/lib/affiliate-placement';
import { withRailAdSense, type RailCard } from '@/lib/rail-continuation';
import type { TocHeading } from '@/lib/toc';

/** 右の欄の 1 つのカードに並べる記事の数 */
const PER_CARD = 4;

const link = (doc: DocMeta) => ({ href: getPublicDocPath(doc.slug), title: doc.shortTitle || doc.title, doc });

/**
 * テーマの個別ページ（/topics/{slug}）の右の欄（PC ≥993px・2026-11-23 に 1 列から 2 列へそろえた）。上から
 * 転職バナー（面 topic-rail。ピクセルは末尾の topic-end が持つ）→ このテーマの注目記事 → 運営者、
 * その下に続く組（このテーマの人気・新着の記事。1 組目に AdSense）、欄の最後に追従ブロック（本文の区画の目次＋AdSense 1 枠）。
 * note の教材と関連テーマは本文の区画にあるので、ここでは繰り返さない。
 */
export default function TopicRail({ docs, featured, sections }: {
  /** このテーマの記事（getTopicDocs） */
  readonly docs: readonly DocMeta[];
  /** 注目記事の slug（topics.json の featured の順） */
  readonly featured: readonly string[];
  /** 本文の区画の見出し（追従ブロックの目次。id は区画の要素の id） */
  readonly sections: readonly TocHeading[];
}) {
  const resolved = resolvePlacements({ pageKind: 'topic' });
  const placement = resolved['topic-rail'];
  const pixel = pixelFor(resolved, ['topic-end', 'topic-rail']);
  const bySlug = new Map(docs.map((doc) => [doc.slug, doc]));
  const featuredDocs = featured.map((slug) => bySlug.get(slug)).filter((doc): doc is DocMeta => Boolean(doc));
  const used = new Set(featuredDocs.map((doc) => doc.slug));
  const popular = getPopularDocs([...docs], PER_CARD * 2).map((p) => p.doc).filter((doc) => !used.has(doc.slug)).slice(0, PER_CARD);
  popular.forEach((doc) => used.add(doc.slug));
  const stamp = (doc: DocMeta) => doc.publishedAt || doc.created || '';
  const latest = docs.filter((doc) => !used.has(doc.slug))
    .sort((a, b) => stamp(b).localeCompare(stamp(a)) || a.slug.localeCompare(b.slug))
    .slice(0, PER_CARD);
  const cards: RailCard[] = [
    ...(popular.length > 0 ? [{ label: 'rail-popular' as const, title: 'このテーマでよく読まれている記事', links: popular.map(link) }] : []),
    ...(latest.length > 0 ? [{ label: 'rail-latest' as const, title: 'このテーマの新着の記事', links: latest.map(link) }] : []),
  ];
  return (
    <RailStack
      items={[
        { kind: 'career', node: placement && <ResponsiveAffiliateBanner placement={placement} withPixel={pixel?.slot === 'topic-rail'} only="pc" /> },
        { kind: 'thumbs', node: featuredDocs.length > 0 && <RailArticleList card={{ label: 'rail-topic', title: 'まず読む記事', links: featuredDocs.map(link) }} /> },
        { kind: 'author', node: <AuthorProfile variant="sidebar" /> },
      ]}
      groups={withRailAdSense(cards.map((card) => ({ slot: 'topic-rail-group', card })))}
      follow={<RailFollow toc={followToc(sections)} />}
      data={{ 'data-topic-sidebar': '' }}
    />
  );
}
