import LinkTile from '@/components/ui/LinkTile/LinkTile';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import ArticleThumbRow from '@/components/ui/RelatedArticles/ArticleThumbRow';
import type { DocMeta } from '@/lib/docs';
import { resolveNextSteps } from '@/lib/next-step';
import { getCardImage } from '@/lib/site-thumbnail';

/**
 * NextStepNav — guide（要点・概要）記事末の「次のステップ」導線。
 *
 * 要点をつかんだ読者を演習（過去問）・テキスト・分野へ送り、行き止まりを解消する。
 * リンク先はカテゴリページの sec-* アンカー（直前期 note CTA と同居＝回遊と収益導線が接続）。
 * クリックは MetaCard trackNav 経由で internal_nav_click（label=next-step）として計測される。
 * キャリア記事では呼び出し側で描画しない（転職導線と競合させない）。
 *
 * サムネイル: 行き先は節のアンカーで記事ではないので、節の代表の記事（next-step.ts の representativeDoc）の画像を添える。
 * 代表の記事が見つからない行は従来の文字だけのリンク。
 */
export default function NextStepNav({ category, docs = [], currentSlug }: { category: string; docs?: readonly DocMeta[]; currentSlug?: string | undefined }) {
  const steps = resolveNextSteps(category, docs, currentSlug);
  if (steps.length === 0) return null;
  return (
    <MetaCard ariaLabel="次のステップ" trackNav="next-step" title="次のステップ" lead="要点をつかんだら、演習と本文で定着させましょう。">
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.href}>
            {s.doc ? <ArticleThumbRow href={s.href} title={s.label} caption={s.hint} image={getCardImage(s.doc)} /> : <LinkTile href={s.href} title={s.label} description={s.hint} />}
          </li>
        ))}
      </ul>
    </MetaCard>
  );
}
