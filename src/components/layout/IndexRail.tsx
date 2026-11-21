import type { ReactNode } from 'react';
import RailStack from '@/components/ui/RailStack/RailStack';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import LinkRow, { LinkRowList, RankMarker } from '@/components/ui/LinkRow/LinkRow';
import { getAllCategories, getCategoryHubPath } from '@/lib/categories';
import { getPublicDocPath } from '@/lib/content-routes';
import { getAllDocsMeta } from '@/lib/docs';
import { getPopularDocs } from '@/lib/popular';
import { buildExamCards } from '@/lib/home-exam-cards';

/** 右の欄の中身（サーバーで呼ぶ）。資格は資格カードの並び、その後に資格に紐づかないカテゴリ（実務など） */
export function indexRailData() {
  const exams = buildExamCards();
  const examSlugs = new Set(exams.map((e) => e.slug));
  const others = getAllCategories().filter((c) => c.visible !== false && !examSlugs.has(c.slug));
  const popular: IndexRailPopular[] = getPopularDocs(getAllDocsMeta(), 6).map((p) => ({
    rank: p.rank,
    href: getPublicDocPath(p.doc.slug),
    title: p.doc.shortTitle || p.doc.title,
  }));
  return { exams, others, popular, categories: [...exams, ...others].map(({ slug, label }) => ({ slug, label })) };
}

/** よく読まれている記事の 1 行。href はサーバーで解決して渡す（client で content-routes を読まない・DN-0684） */
export interface IndexRailPopular {
  rank: number;
  href: string;
  title: string;
}

/**
 * 一覧ページ（/search・/topics）の右の欄（PC ≥993px）。上から AdSense → よく読まれている記事 → 資格・分野から探す。
 * 広告を出す条件はページで違う（検索は結果があるときだけ・テーマ索引は常時）ので、枠そのものを ad で受ける。
 * 2 ページで同じ並びを書かないためにここへ置く（design-system.md §3.4）。
 */
export default function IndexRail({ ad, popular, categories, label }: {
  readonly ad: ReactNode;
  readonly popular: readonly IndexRailPopular[];
  /** 資格トップ・実務などのカテゴリ（slug と名前） */
  readonly categories: readonly { slug: string; label: string }[];
  /** 計測のラベルの接頭辞（search・topics） */
  readonly label: string;
}) {
  return (
    <RailStack
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
