import { type DocMeta } from '@/lib/docs';
import { type DocGroupKey } from '@/lib/doc-classifier';
import { type NoteMagazine } from '@/lib/note-magazines';
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
import NoteMagazineTile from '@/components/ui/NoteMagazineTile';
import HubCtaBanner from '@/components/ui/HubCtaBanner/HubCtaBanner';
import { type ResolvedHubCta } from '@/lib/hub-cta';
import LinksHubTile from '@/components/ui/LinksHubTile';
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
  readonly footerMagazines: ReadonlyArray<{ slot: PlacementSlot; magazine: NoteMagazine }>;
  /** もくじ（L2 索引）タイル。placement 非空 & HUB 資格のときのみ非 null（回遊専用・forceMokuji）。 */
  readonly footerMokuji: ResolvedHubCta | null;
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
  footerMagazines,
  footerMokuji,
  faqs,
  hasCategoryNavCard,
  authorDates,
}: ArticleFooterProps) {
  // pe-comprehensive の keyword/guide/pastExam で個別マガジンが無いページは、
  // note 有料教材まとめ /links への画像バナーをフォールバック表示する（旧サイドバー条件を踏襲）。
  const showLinksHubFallback =
    footerMagazines.length === 0 &&
    category === 'pe-comprehensive-management' &&
    (docGroup === 'keyword' || docGroup === 'guide' || docGroup === 'pastExam');
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

      {/* note 有料マガジン CTA（記事末尾・資格別ブランドタイルに統一／2026-07）。
          直リンク商品タイル（先頭 3 誌に cap 済み）＋ もくじ（L2 索引）タイルを 1 行に折り返し表示。
          文言/価格は SoT から HTML 駆動（旧 300×250 焼き込みバナーを廃止）。 */}
      {(footerMagazines.length > 0 || footerMokuji) && (
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {footerMagazines.map(({ slot, magazine }) => (
            <div key={slot.magazineId} className="w-full max-w-[300px]">
              <NoteMagazineTile magazine={magazine} utmContent={slot.utmContent} />
            </div>
          ))}
          {footerMokuji && (
            <div className="w-full max-w-[300px]">
              <HubCtaBanner cta={footerMokuji} />
            </div>
          )}
        </div>
      )}
      {showLinksHubFallback && (
        <div className="mt-8 mx-auto max-w-sm">
          <LinksHubTile trackLabel="links-hub" />
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

      {/* 記事末 転職 CTA（モバイル限定・civil 1/2 + 建設部門・FAQ 直後）。href のみ＝計測はサイドバー側 1 発火を維持。
          creative は resolveCareerArticleEndCard が slug ハッシュ A/B（建設JOBs ↔ ビルドジョブ/GKS）で出し分け。
          slugStr をサイドバーと共有＝同一ページは PC サイドバーと記事末カードが必ず同じ案件になる。 */}
      {(category === 'civil-construction-1' ||
        category === 'civil-construction-2' ||
        category === 'pe-construction') && (
        <div className="mt-8 zenn-desktop:hidden">
          <CareerAffiliate {...resolveCareerArticleEndCard(slugStr)} />
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
      <AuthorCard {...authorDates} />
    </>
  );
}
