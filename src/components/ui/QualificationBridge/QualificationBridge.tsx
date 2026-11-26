import Link from 'next/link';
import LinkTile from '@/components/ui/LinkTile/LinkTile';
import ArticleCard from '@/components/ui/ArticleCard/ArticleCard';
import ArticleThumbRow from '@/components/ui/ArticleThumbRow/ArticleThumbRow';
import { getCardImage } from '@/lib/site-thumbnail';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import { MUNICIPAL_HUB, resolveQualificationBridge, type QualificationBridgeAudience, type QualificationBridgeSurface } from '@/config/qualification-bridge';
import Arrow from '@/components/ui/Arrow/Arrow';

/**
 * QualificationBridge — 実務記事・共通仕様書の章末に置く「業務経験 → 資格」の橋渡しカード。
 *
 * 読者は資格を意識せずに業務の悩みで来ているため、本文には試験文脈を入れず、記事末に 1 枚だけ置く。
 * 立場（発注者／施工会社／迷っている）を読者に選ばせ、既存の資格ガイドへ送る。
 *
 * 計測: root の data-cta="qualification-bridge" が表示（qualification_bridge_impression・label=card）、
 * 各リンクの data-cta-label（orderer / contractor / qualification-map）がクリックのラベルになる。
 * 真実源: src/config/qualification-bridge.ts
 *
 * 見た目（2026-11-26）: 記事末のカードは、行き先のガイドの写真つきカード（ArticleCard・記事末の関連記事と同じ部品）に、
 * 題名を「選ぶと何ができるか」、題名の上に立場を置く。白い面のなかで埋もれないよう、地色と左の線で区切る。
 * 文字だけの選択肢の頃は表示 1,687 に対しクリック 8（2026-10-23〜11-19）。スマホは小さなサムネイルの行（ArticleThumbRow）。右の欄（sidebar）は幅が狭いので文字のまま。
 */
export default function QualificationBridge({
  placement,
  audience,
  layout = 'card',
}: {
  placement: QualificationBridgeSurface;
  audience?: QualificationBridgeAudience | undefined;
  /** sidebar＝右の欄の幅（316px）に合わせて 1 列・説明を短く */
  layout?: 'card' | 'sidebar';
}) {
  const options = resolveQualificationBridge(audience);
  const sidebar = layout === 'sidebar';
  return (
    <div data-cta="qualification-bridge" data-cta-label="card" data-cta-placement={placement}>
      <MetaCard ariaLabel="この業務経験を資格につなげる" padding={sidebar ? 'compact' : 'default'}
        className={sidebar ? '' : 'border-l-4 border-l-brand bg-(--accent-fill) dark:border-l-brand'}
        title={sidebar ? 'この業務経験を資格につなげる' : 'この仕事の経験は、資格の受検に使えます'}
        lead={sidebar
          ? '担当している仕事の経験は、土木系資格の受検に使えます。'
          : 'いまの立場に近いものを選ぶと、受検の条件と取り方がわかります。'}>

        {sidebar ? (
          <ul className="grid grid-cols-1 gap-2">
            {options.map((option) => (
              <li key={option.key}>
                {/* sidebar では理由を出さない（右の欄の幅に合わせて短く） */}
                <LinkTile href={option.href} title={option.title} data={{ 'data-cta-label': option.key }} />
              </li>
            ))}
          </ul>
        ) : (
          <>
            {/* スマホは写真カードを 3 枚縦に積むと 1 画面を超えるので、小さなサムネイルの行にする */}
            <ul className="grid grid-cols-1 gap-2 sm:hidden">
              {options.map((option) => (
                <li key={option.key}>
                  <ArticleThumbRow href={option.href} title={option.headline} caption={option.title}
                    image={getCardImage({ slug: option.slug, category: option.category })} ctaLabel={option.key} />
                </li>
              ))}
            </ul>
            <ul className="hidden grid-cols-3 gap-3 sm:grid">
              {options.map((option) => (
                <li key={option.key}>
                  <ArticleCard
                    href={option.href}
                    eyebrow={option.title}
                    title={option.headline}
                    description={option.reason}
                    image={getCardImage({ slug: option.slug, category: option.category })}
                    data={{ 'data-cta-label': option.key }}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
        {audience === 'municipal' && (
          <p className="mt-3 text-sm">
            <Link href={MUNICIPAL_HUB.href} data-cta-label="municipal-hub" className="focus-ring text-(--accent) hover:underline">
              {MUNICIPAL_HUB.label} <Arrow />
            </Link>
          </p>
        )}
      </MetaCard>
    </div>
  );
}
