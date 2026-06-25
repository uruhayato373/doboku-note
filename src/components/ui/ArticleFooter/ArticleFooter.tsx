import { type DocMeta } from '@/lib/docs';
import { type DocGroupKey } from '@/lib/doc-classifier';
import { buildMagazineUrl, type NoteMagazine } from '@/lib/note-magazines';
import { type PlacementSlot } from '@/lib/magazine-placement';
import { type ReferenceItem } from '@/lib/extract-references';
import {
  resolveCareerArticleEndCard,
  resolvePeConsultingArticleEndCard,
} from '@/config/affiliate-creatives';
import ExternalReferences from '@/components/ui/ExternalReferences/ExternalReferences';
import PastExamBacklinks from '@/components/ui/PastExamBacklinks/PastExamBacklinks';
import SectionKeywords from '@/components/ui/SectionKeywords';
import PillarNavCard from '@/components/ui/PillarNavCard';
import RelatedTextbooks from '@/components/ui/RelatedTextbooks/RelatedTextbooks';
import MagazineInlineCard from '@/components/ui/MagazineInlineCard';
import TextbookNav from '@/components/ui/TextbookNav/TextbookNav';
import CategoryNavCard from '@/components/ui/CategoryNavCard/CategoryNavCard';
import FAQCard from '@/components/ui/FAQCard/FAQCard';
import CareerAffiliate from '@/components/ui/CareerAffiliate/CareerAffiliate';
import RelatedArticles from '@/components/ui/RelatedArticles';
import AuthorCard from '@/components/ui/AuthorCard/AuthorCard';

interface ArticleFooterProps {
  readonly references: ReferenceItem[];
  readonly category: DocMeta['category'];
  readonly docGroup: DocGroupKey;
  readonly slugStr: string;
  readonly sectionStr: string | undefined;
  readonly meta: DocMeta;
  readonly categoryArticles: DocMeta[];
  readonly inlineMagazines: ReadonlyArray<{ slot: PlacementSlot; magazine: NoteMagazine }>;
  readonly inlineMobileOnly: boolean;
  readonly faqs: { q: string; a: string }[];
  readonly hasCategoryNavCard: boolean;
  readonly authorDates: {
    publishedAt?: string;
    updatedAt?: string;
    lastRewrittenAt?: string;
  };
}

/**
 * 記事末セクション（docs/[...slug]/page.tsx から抽出）。
 * category × docGroup ごとに「過去問逆引き／関連テキスト／note CTA／ナビ／FAQ／転職カード／
 * 関連記事／著者」の構成を出し分ける。ロジックは抽出前と不変。
 * ページ種別ごとの構成は docs/project/article-footer-design.md 参照。
 */
export default function ArticleFooter({
  references,
  category,
  docGroup,
  slugStr,
  sectionStr,
  meta,
  categoryArticles,
  inlineMagazines,
  inlineMobileOnly,
  faqs,
  hasCategoryNavCard,
  authorDates,
}: ArticleFooterProps) {
  return (
    <>
      {/* 参考資料カード（## 参考資料 セクションを抽出したもの。全カテゴリ共通） */}
      {references.length > 0 && (
        <div className="mt-8">
          <ExternalReferences references={references} />
        </div>
      )}

      {/* PE keyword: 過去問逆引き + 同セクションキーワード */}
      {category === 'pe-comprehensive-management' && docGroup === 'keyword' && (
        <>
          <div className="mt-8">
            <PastExamBacklinks category={category} currentSlug={slugStr} />
          </div>
          {/* 同セクションのキーワード: モバイル限定（デスクトップではサイドバーの SectionCard で表示済み） */}
          {meta.section && (
            <div className="mt-8 zenn-desktop:hidden">
              <SectionKeywords currentSlug={slugStr} section={meta.section as string} />
            </div>
          )}
          {/* モバイル: 5 管理ピラーナビ（デスクトップではサイドバーで表示済み） */}
          <div className="mt-8 zenn-desktop:hidden">
            <PillarNavCard variant="mobile" currentSection={sectionStr} />
          </div>
        </>
      )}

      {/* Civil primary/secondary: 関連テキスト章 (過去問→教材、1級・2級共通) */}
      {(category === 'civil-construction-1' || category === 'civil-construction-2') &&
        (docGroup === 'primary' || docGroup === 'secondary') && (
          <div className="mt-8">
            <RelatedTextbooks currentMeta={meta} categoryArticles={categoryArticles} />
          </div>
        )}

      {/* note 有料マガジン CTA (inline)。inlineMobileOnly が true の場合は PC 非表示 (sidebar 側で出る)。 */}
      {inlineMagazines.length > 0 && (
        <div className={`mt-8 space-y-3 ${inlineMobileOnly ? 'zenn-desktop:hidden' : ''}`}>
          {inlineMagazines.map(({ slot, magazine }) => (
            <MagazineInlineCard
              key={slot.magazineId}
              url={buildMagazineUrl(magazine, slot.utmContent)}
              title={magazine.title}
              description={magazine.description}
              imageUrl={magazine.imageUrl}
              badge={magazine.badge}
              trackLabel={slot.utmContent}
            />
          ))}
        </div>
      )}

      {/* Civil 2級 guide（キャリア記事）: 記事末 CTA なし（GKS はサイドバー上部に集約＝1 ページ 1 GKS ピクセル）。
          本文インライン CareerAffiliate（href のみ）は MDX 側で維持。 */}

      {/* Civil textbook: 前後章ナビ + 過去問逆引き（1級・2級共通） */}
      {(category === 'civil-construction-1' || category === 'civil-construction-2') &&
        docGroup === 'textbook' && (
          <>
            <div className="mt-8">
              <TextbookNav currentSlug={slugStr} categoryArticles={categoryArticles} />
            </div>
            <div className="mt-8">
              <PastExamBacklinks category={category} currentSlug={slugStr} />
            </div>
          </>
        )}

      {/* guide/pillar/secondary/textbook: カテゴリナビカード（モバイル） */}
      {hasCategoryNavCard &&
        category &&
        (docGroup === 'guide' ||
          docGroup === 'pillar' ||
          docGroup === 'secondary' ||
          docGroup === 'textbook') && (
          <div className="mt-8 zenn-desktop:hidden">
            <CategoryNavCard
              variant="mobile"
              category={category}
              currentSlug={slugStr}
              docGroup={docGroup}
              categoryArticles={categoryArticles}
            />
          </div>
        )}

      {/* よくある質問（frontmatter faqs を持つ記事のみ表示） */}
      {faqs.length > 0 && (
        <div className="mt-8">
          <FAQCard faqs={faqs} />
        </div>
      )}

      {/* 記事末 転職 CTA（モバイル限定・civil 1/2 + 建設部門・FAQ 直後）。href のみ＝計測はサイドバー側 1 発火を維持。
          creative は resolveCareerArticleEndCard が期間で出し分け（〜8/31 ビルドジョブ／以降 GKS）。 */}
      {(category === 'civil-construction-1' ||
        category === 'civil-construction-2' ||
        category === 'pe-construction') && (
        <div className="mt-8 zenn-desktop:hidden">
          <CareerAffiliate {...resolveCareerArticleEndCard()} />
        </div>
      )}
      {/* 総監はシニア技術者・管理職層＝施工管理系がミスマッチのため PE_CONSULTING(ハイクラスDX/コンサル)で出す。 */}
      {category === 'pe-comprehensive-management' && (
        <div className="mt-8 zenn-desktop:hidden">
          <CareerAffiliate {...resolvePeConsultingArticleEndCard()} />
        </div>
      )}

      {/* 関連記事（全記事共通・記事末 AuthorCard の前）。関連 2 件未満なら自動で非表示。 */}
      <div className="mt-8">
        <RelatedArticles currentMeta={meta} categoryArticles={categoryArticles} />
      </div>

      {/* 執筆者・最終更新日（全記事共通・E-A-T 強化） */}
      <AuthorCard {...authorDates} category={category ?? undefined} />
    </>
  );
}
