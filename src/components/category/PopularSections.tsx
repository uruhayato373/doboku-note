import MetaCard from '@/components/ui/MetaCard/MetaCard';
import ArticleThumbRow from '@/components/ui/ArticleThumbRow/ArticleThumbRow';
import { getCardImage } from '@/lib/site-thumbnail';
import { type PopularDoc, popularWindow } from '@/lib/popular';
import { OgpThumbRow } from '@/components/category/CategorySections';
import { getPublicDocPath } from '@/lib/content-routes';
import { formatDotDate } from '@/lib/display-date';

/** 集計窓を「YYYY.MM.DD–MM.DD」で短く表示。窓不明なら null。 */
function windowLabel(): string | null {
  if (!popularWindow?.start || !popularWindow?.end) return null;
  const fmt = (iso: string) => formatDotDate(iso) ?? iso;
  return `${fmt(popularWindow.start)}〜${fmt(popularWindow.end)}`;
}

/**
 * カテゴリ hub 上部の「よく読まれている記事」特集。GA4 実アクセス上位（直近 28 日）を提示する。
 * 注目フラグでなく実シグナル駆動。各記事の OGP（R2 配信・全 published で CI 実在保証）をサムネにした
 * ブログ型の縦リストで、サイズを揃えて回遊させる。行は OgpThumbRow（rank 付き）で共通化。
 * ランクは OGP のタイトル焼込みと重ならないようタイトル側に置く。items が空なら描画しない（graceful）。
 */
export function PopularShowcase({ items }: { items: PopularDoc[] }) {
  if (items.length === 0) return null;
  return (
    <section data-cta="nav" data-cta-label="popular-showcase">
      <h2 className="font-serif text-[22px] sm:text-[26px] font-black text-(--ink) mb-5">よく読まれている記事</h2>
      <ol className="flex flex-col">
        {items.map((item) => (
          <OgpThumbRow key={item.doc.slug} doc={item.doc} rank={item.rank} eager />
        ))}
      </ol>
    </section>
  );
}

/**
 * サイドバー「人気記事ランキング」。GA4 実アクセス上位（直近 28 日）を番号付きリストで提示。
 * items が空なら描画しない（graceful）。socialplus 参考の閲覧ランキングウィジェット。
 */
export function PopularRanking({ items }: { items: PopularDoc[] }) {
  if (items.length === 0) return null;
  const label = windowLabel();
  return (
    // 順位つきのサムネイルの行（2026-11-22・以前は文字の行で、右の欄の下の続きに同じ人気順をサムネイルで重ねていた）
    <MetaCard as="div" padding="compact" trackNav="popular-ranking" title="人気記事" titleAside={label}>
      <ol className="space-y-3">
        {items.map((item) => (
          <li key={item.doc.slug}>
            <ArticleThumbRow
              variant="rail"
              rank={item.rank}
              href={getPublicDocPath(item.doc.slug)}
              title={item.doc.shortTitle || item.doc.title}
              image={getCardImage(item.doc)}
            />
          </li>
        ))}
      </ol>
    </MetaCard>
  );
}
