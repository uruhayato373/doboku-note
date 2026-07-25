import { type DocMeta } from '@/lib/docs';
import { type DocGroupKey } from '@/lib/doc-classifier';
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
import HubCtaBanner from '@/components/ui/HubCtaBanner/HubCtaBanner';
import { type ResolvedHubCta } from '@/lib/hub-cta';
import OffsiteCta from '@/components/ui/OffsiteCta';
import { type OffsiteCtaItem } from '@/lib/offsite-cta';
import TextbookNav from '@/components/ui/TextbookNav/TextbookNav';
import CategoryNavCard from '@/components/ui/CategoryNavCard/CategoryNavCard';
import FAQCard from '@/components/ui/FAQCard/FAQCard';
import CareerAffiliate from '@/components/ui/CareerAffiliate/CareerAffiliate';
import RelatedArticles from '@/components/ui/RelatedArticles';
import NextStepNav from '@/components/ui/NextStepNav/NextStepNav';
import AuthorCard from '@/components/ui/AuthorCard/AuthorCard';

interface ArticleFooterProps {
  readonly references: ReferenceItem[];
  readonly category: DocMeta['category'];
  readonly docGroup: DocGroupKey;
  readonly slugStr: string;
  readonly sectionStr: string | undefined;
  readonly meta: DocMeta;
  readonly categoryArticles: DocMeta[];
  /** もくじ（L2 索引）タイル。HUB 資格 & 非 career のとき非 null。全 HUB ページの記事末尾に統一表示。 */
  readonly footerMokuji: ResolvedHubCta | null;
  /** 外部チャネル（ココナラ/Brain）CTA。高適合ページのみ非空（offsite-cta.ts が解決）。 */
  readonly offsiteCta: readonly OffsiteCtaItem[];
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
 */
export default function ArticleFooter({
  references,
  category,
  docGroup,
  slugStr,
  sectionStr,
  meta,
  categoryArticles,
  footerMokuji,
  offsiteCta,
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

      {/* note 有料マガジン CTA（記事末尾）。全 HUB 資格で「もくじ（L2 索引）」タイル 1 枚に統一（2026-07 統一）。
          個別マガジンタイル（旧・最大 3 誌）は廃止し、個別導線は冒頭/中間 CTA・MDX 内 MagazineCard に一本化。
          文言/価格/リンク先は resolveHubCta が SoT から HTML 駆動（平時=もくじ／直前期=売れ筋商品）。 */}
      {footerMokuji && (
        <div className="mt-8 flex justify-center">
          <div className="w-full max-w-[300px]">
            <HubCtaBanner cta={footerMokuji} />
          </div>
        </div>
      )}

      {/* 外部チャネル（ココナラ添削／Brain 自作キット）CTA。施工経験記述・総監記述系の高適合ページのみ。
          note もくじ（フル教材）とは別種の「個別添削」「自作キット」導線として並置。listed 商品のみ描画。 */}
      <OffsiteCta items={offsiteCta} />

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

      {/* guide（キャリア記事を除く）: 次のステップ導線（演習・テキスト・分野へ）。全ビューポート。
          要点記事の行き止まりを解消し、カテゴリ hub の sec-* アンカー（直前期 note CTA と同居）へ送る。 */}
      {docGroup === 'guide' && category && !meta.tags?.includes('career') && (
        <div className="mt-8">
          <NextStepNav category={category} />
        </div>
      )}

      {/* よくある質問（frontmatter faqs を持つ記事のみ表示） */}
      {faqs.length > 0 && (
        <div className="mt-8">
          <FAQCard faqs={faqs} />
        </div>
      )}

      {/* 記事末 転職 CTA（モバイル限定・施工管理/建設業界カテゴリ・FAQ 直後）。href のみ＝計測はサイドバー側 1 発火を維持。
          creative は resolveCareerArticleEndCard が slug ハッシュ A/B（建設JOBs ↔ ビルドジョブ/GKS）で出し分け。
          slugStr をサイドバーと共有＝同一ページは PC サイドバーと記事末カードが必ず同じ案件になる。
          concrete/pe-first-stage も建設業界読者ゆえ 2026-07-06 に parity 追加（モバイル収益化）。 */}
      {(category === 'civil-construction-1' ||
        category === 'civil-construction-2' ||
        category === 'pe-construction' ||
        category === 'concrete-chief-engineer' ||
        category === 'concrete-diagnostician' ||
        category === 'pe-first-stage') && (
        <div className="mt-8 zenn-desktop:hidden">
          <CareerAffiliate {...resolveCareerArticleEndCard(slugStr)} placement="article-end-mobile" />
        </div>
      )}
      {/* 総監はシニア技術者・管理職層＝施工管理系がミスマッチのため PE_CONSULTING(ハイクラスDX/コンサル)で出す。 */}
      {category === 'pe-comprehensive-management' && (
        <div className="mt-8 zenn-desktop:hidden">
          <CareerAffiliate {...resolvePeConsultingArticleEndCard()} placement="article-end-mobile" />
        </div>
      )}

      {/* 関連記事（全記事共通・記事末 AuthorCard の前）。関連 2 件未満なら自動で非表示。 */}
      <div className="mt-8">
        <RelatedArticles currentMeta={meta} categoryArticles={categoryArticles} />
      </div>

      {/* 執筆者・最終更新日（全記事共通・E-A-T 強化） */}
      <AuthorCard {...authorDates} />
    </>
  );
}
