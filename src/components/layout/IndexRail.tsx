import type { ReactNode } from 'react';
import RailStack from '@/components/ui/RailStack/RailStack';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import LinkRow, { LinkRowList, RankMarker } from '@/components/ui/LinkRow/LinkRow';
import RailArticleList from '@/components/ui/RelatedArticles/RailArticleList';
import AuthorSidebarCard from '@/components/ui/AuthorSidebarCard';
import ResponsiveAffiliateBanner from '@/components/ui/SidebarAdBanner/ResponsiveAffiliateBanner';
import { getAllCategories, getCategoryHubPath } from '@/lib/categories';
import { getPublicDocPath } from '@/lib/content-routes';
import { getAllDocsMeta, type DocMeta } from '@/lib/docs';
import { getPopularDocs } from '@/lib/popular';
import { buildExamCards } from '@/lib/home-exam-cards';
import { pixelFor, resolvePlacements, type PlacementPage } from '@/lib/affiliate-placement';
import { withRailAdSense } from '@/lib/rail-continuation';

/** よく読まれている記事の 1 行。href はサーバーで解決して渡す（client で content-routes を読まない・DN-0684） */
interface IndexRailPopular {
  rank: number;
  href: string;
  title: string;
}

const LATEST_COUNT = 4;
const stamp = (doc: DocMeta) => doc.publishedAt || doc.created || '';

/** 右の欄の中身（サーバーで呼ぶ）。資格は資格カードの並び、その後に資格に紐づかないカテゴリ（実務など） */
export function indexRailData() {
  const exams = buildExamCards();
  const examSlugs = new Set(exams.map((e) => e.slug));
  const others = getAllCategories().filter((c) => c.visible !== false && !examSlugs.has(c.slug));
  const docs = getAllDocsMeta().filter((d) => d.published !== false);
  const popularDocs = getPopularDocs(docs, 6);
  const popular: IndexRailPopular[] = popularDocs.map((p) => ({
    rank: p.rank,
    href: getPublicDocPath(p.doc.slug),
    title: p.doc.shortTitle || p.doc.title,
  }));
  // 新着は人気に出た記事を除いて公開日の新しい順（資格トップの rail-latest と同じ並べ方）
  const shown = new Set(popularDocs.map((p) => p.doc.slug));
  const latest = docs.filter((d) => !shown.has(d.slug))
    .sort((a, b) => stamp(b).localeCompare(stamp(a)) || a.slug.localeCompare(b.slug))
    .slice(0, LATEST_COUNT)
    .map((doc) => ({ href: getPublicDocPath(doc.slug), title: doc.shortTitle || doc.title, doc }));
  return { exams, others, popular, latest, categories: [...exams, ...others].map(({ slug, label }) => ({ slug, label })) };
}

/**
 * 一覧ページ（/search・/topics）の右の欄（PC ≥993px）。上から
 * AdSense → よく読まれている記事 → 転職バナー → 新着の記事 → AdSense（2 枚目）→ 運営者 → 資格・分野から探す。
 * 広告どうし（AdSense・転職）は隣り合わせない。下に空きが残れば AdSense だけを散らす（withRailAdSense・空き 2,500px ごとに 1 枠）。
 * 広告を出す条件はページで違う（検索は結果があるときだけ・テーマ索引は常時）ので、AdSense の枠は ad・ad2 で受ける。
 * 転職は career の面（config/affiliate-placements.json）。ピクセルはページで描く面のうち優先順の最も高い 1 面だけ（pixelFor）。
 * 2 ページで同じ並びを書かないためにここへ置く（design-system.md §3.4）。
 */
export default function IndexRail({ ad, ad2, career, data, label }: {
  readonly ad: ReactNode;
  readonly ad2: ReactNode;
  /** 転職の面。pageSlots はそのページで描く転職の面すべて（ピクセルの持ち主を決める） */
  readonly career: { readonly page: PlacementPage; readonly slot: string; readonly pageSlots: readonly string[] };
  readonly data: ReturnType<typeof indexRailData>;
  /** 計測のラベルの接頭辞（search・topics） */
  readonly label: string;
}) {
  const { popular, latest, categories } = data;
  const resolved = resolvePlacements(career.page);
  const placement = resolved[career.slot];
  const pixel = pixelFor(resolved, career.pageSlots);
  return (
    <RailStack
      groups={withRailAdSense([])}
      items={[
        { kind: 'adsense', node: ad },
        { kind: 'nav', node: popular.length > 0 && (
          <MetaCard as="div" padding="compact" trackNav={`${label}-rail-popular`} title="よく読まれている記事">
            <LinkRowList as="ol">
              {popular.map((item) => (
                <LinkRow key={item.href} href={item.href} title={item.title} marker={<RankMarker rank={item.rank} />} serif tone="ink" />
              ))}
            </LinkRowList>
          </MetaCard>
        ) },
        { kind: 'career', node: placement && <ResponsiveAffiliateBanner placement={placement} withPixel={pixel?.slot === career.slot} only="pc" /> },
        { kind: 'thumbs', node: latest.length > 0 && <RailArticleList card={{ label: 'rail-latest', title: '新着の記事', links: latest }} /> },
        { kind: 'adsense', node: ad2 },
        { kind: 'author', node: <AuthorSidebarCard /> },
        { kind: 'nav', node: categories.length > 0 && (
          <MetaCard as="div" padding="compact" trackNav={`${label}-rail-exams`} title="資格・分野から探す">
            <LinkRowList>
              {categories.map((c) => (
                <LinkRow key={c.slug} href={getCategoryHubPath(c.slug)} title={c.label} serif tone="ink" />
              ))}
            </LinkRowList>
          </MetaCard>
        ) },
      ]}
    />
  );
}
