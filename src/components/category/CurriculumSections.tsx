import Link from 'next/link';
import { type DocMeta } from '@/lib/docs';
import { DocCard } from '@/components/category/CategorySections';
import { getPublicDocPath } from '@/lib/content-routes';
import { AFFILIATE_LINK_REL, AffiliatePrBadge } from '@/components/ui/AffiliateParts';
import DisclosureChevron from '@/components/ui/DisclosureChevron';
import CardRail from '@/components/ui/CardRail';
import { type SmallBannerCreative } from '@/config/affiliate-creatives';

// カテゴリページの「体系（受験ガイド / 分野別 / テキスト章）」をテキスト目次調のリストで見せる共有コンポーネント群。
// カード（DocCard）でなくリストにすることで、章立て・出題分野の体系が一目で分かり情報密度を上げる。
// editorial トークンのみ使用（生 hex なし・rounded/shadow 直書きなし）。真実源: .claude/knowledge/design-system/design-system.md §3。

/** 目次リストの1ブロック（見出し＋所属記事）。volume は冊（テキスト2分冊）をまとめる eyebrow。
 *  intro は章の入口に据える「要点」記事（本文 docs の前・「要点」マーカーで区別して表示）。 */
export type CurriculumBlockView = {
  id?: string | undefined;
  label?: string | undefined;
  volume?: string | undefined;
  /** 紙テキストの章番号ラベル（例 "第1章"）。collapsible 章の summary 左に表示。省略時は非表示。 */
  chapterNo?: string | undefined;
  intro?: DocMeta[] | undefined;
  docs: DocMeta[];
};

/** セクション枠（h2 ヘッダ＝既存 DocSection と同一様式・`sec-*` アンカー維持）。 */
export function CurriculumSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string | undefined;
  /** 呼び出し側の互換のため残置（表示はしない）。件数バッジは 2026-07 撤去。 */
  count?: number | undefined;
  children: React.ReactNode;
}) {
  return (
    <section id={`sec-${id}`} className="scroll-mt-24">
      <div className="mb-6">
        <h2 className="font-serif text-[22px] sm:text-[26px] font-black text-[var(--ink)]">{title}</h2>
        {description && <p className="text-[14px] text-[var(--ink-muted)] mt-1">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function CurriculumRow({ doc, marker }: { doc: DocMeta; marker: React.ReactNode }) {
  return (
    <li className="border-b border-[var(--rule-soft)] last:border-b-0">
      <Link href={getPublicDocPath(doc.slug)} data-cta="nav" data-cta-label="curriculum-list" className="group flex items-baseline gap-3 py-3">
        <span className="shrink-0 flex items-center justify-center min-w-6" aria-hidden>
          {marker}
        </span>
        {/* タイトル下に subtitle を縦積み（旧: 右寄せ truncate はデスクトップで途切れ・
            モバイル非表示だった）。全文・全デバイス表示で記事選択の手がかりを保つ（2026-07 C-2）。 */}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] sm:text-base font-medium text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
            {doc.shortTitle || doc.title}
          </span>
          {doc.subtitle && (
            <span className="text-[13px] text-[var(--ink-muted)]">{doc.subtitle}</span>
          )}
        </span>
      </Link>
    </li>
  );
}

/** 1 ブロック内の行（章頭の要点 → 本文 docs）。開閉カード内・フラット双方で共有。 */
function ChapterRows({ block, numbered }: { block: CurriculumBlockView; numbered: boolean }) {
  return (
    <ul>
      {/* 章の入口: 要点まとめ（本文の前・「要点」マーカーで区別） */}
      {(block.intro ?? []).map((doc) => (
        <CurriculumRow
          key={doc.slug}
          doc={doc}
          marker={<span className="font-mono text-[10px] font-bold text-[var(--accent)]">要点</span>}
        />
      ))}
      {block.docs.map((doc, i) => (
        <CurriculumRow
          key={doc.slug}
          doc={doc}
          marker={
            numbered ? (
              <span className="font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                {String(i + 1).padStart(2, '0')}
              </span>
            ) : (
              <span className="block h-1.5 w-1.5 rounded-[1px] bg-[var(--accent)] opacity-60" />
            )
          }
        />
      ))}
    </ul>
  );
}

/**
 * ブロック群を目次調リストで描画する。
 * - numbered: 連番マーカー（テキスト章目次）。ブロックごとに 01 から振り直す。
 * - 非 numbered: 小さな四角マーカー（分野別）。
 * - volume が前ブロックと変われば冊 eyebrow を挿入。
 * - collapsible: 章（label あり）を <details> 開閉カードにする。畳めば章タイトルだけが並び「体系が一目」、
 *   開けば章内リストへドリルダウン。JS 不要（ネイティブ details）。FAQCard と同じ group/open パターン。
 */
export function CurriculumList({
  blocks,
  numbered = false,
  collapsible = false,
}: {
  blocks: CurriculumBlockView[];
  numbered?: boolean;
  collapsible?: boolean;
}) {
  const visible = blocks.filter((b) => b.docs.length > 0 || (b.intro?.length ?? 0) > 0);
  return (
    <div className={collapsible ? 'space-y-3' : 'space-y-6'}>
      {visible.map((block, bi) => {
        const showVolume = !!block.volume && block.volume !== visible[bi - 1]?.volume;
        const count = (block.intro?.length ?? 0) + block.docs.length;
        return (
          <div key={block.id ?? block.label ?? bi}>
            {showVolume && (
              /* 分冊見出し（章をまとめる上位区切り）。章タイトル(18px)より一段控えめな
                 13px 太字＋区切り罫線で「ここから別の分冊」を示す（旧: mono 11px muted で
                 章より弱く階層が逆転していた）。2 冊目以降は上に余白を足す。 */
              <div className={`mb-3 flex items-center gap-3${bi > 0 ? ' mt-6' : ''}`}>
                <span className="shrink-0 text-[13px] font-bold text-[var(--ink-body)]">{block.volume}</span>
                <span aria-hidden="true" className="h-px flex-1 bg-[var(--rule-soft)]" />
              </div>
            )}
            {collapsible && block.label ? (
              <details className="group rounded-card-content border border-[var(--rule-soft)] bg-[var(--paper)] open:border-[var(--accent)] transition-colors">
                {/* E-1: 章番号(mono accent) + タイトル + N記事 + 右端シェブロン（1行）。
                    章の中身は開いて確認する（閉状態のトピックプレビューは冗長のため撤去）。 */}
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden">
                  {block.chapterNo && (
                    <span className="shrink-0 font-mono text-[11px] font-bold tracking-wider text-[var(--accent)]">
                      {block.chapterNo}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate font-serif text-lg font-bold text-[var(--ink)]">{block.label}</span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">{count}記事</span>
                  <DisclosureChevron className="text-[var(--ink-muted)]" />
                </summary>
                <div className="border-t border-[var(--rule-soft)] px-4">
                  <ChapterRows block={block} numbered={numbered} />
                </div>
              </details>
            ) : (
              <>
                {block.label && (
                  <h3 className="font-serif text-lg font-bold text-[var(--ink)] mb-1 border-b border-[var(--rule-soft)] pb-2">
                    {block.label}
                  </h3>
                )}
                <ChapterRows block={block} numbered={numbered} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** キャリアレールに出す最大枚数。超過分は <details> の目次リストに畳む（内部リンクは保持）。 */
const CAREER_RAIL_MAX = 10;

/**
 * キャリア・転職セクション。注目→残りの順の横スクロールカードレール（全カテゴリ共通）。
 * featured/rest は resolveCurriculum が career タグから解決済み（画像は使わない）。
 * ハブは入口数本の役割に留め、テールの発見は記事ページの RelatedArticles / 検索が担う
 * （キャリア記事は career タグ共有で関連モジュールが自動相互リンクする）。
 */
export function CareerSection({
  featured,
  rest,
  title = 'キャリア・転職',
  description,
  smallBanner = null,
}: {
  featured: DocMeta[];
  rest: DocMeta[];
  title?: string;
  description?: string | undefined;
  /** 転職アフィリの小バナー（120×60・href のみ）。campaign 中のみ非 null。 */
  smallBanner?: SmallBannerCreative | null;
}) {
  // 注目→残りの順で 1 本の横スクロールカードレールに統合（全カテゴリ共通）。
  // 二次的な回遊セクションのため全件を縦積みせず、次カードを覗かせる rail で畳む。
  // 大量カテゴリ（1級=26本等）はレールを CAREER_RAIL_MAX で打ち切り、超過分を
  // <details> の目次リストへ（リンクは DOM に残る＝クロール/内部リンク維持）。
  const cards = [...featured, ...rest];
  if (cards.length === 0) return null;
  const railCards = cards.slice(0, CAREER_RAIL_MAX);
  const overflow = cards.slice(CAREER_RAIL_MAX);
  return (
    <CurriculumSection id="career" title={title} description={description} count={cards.length}>
      <CardRail ariaLabel="キャリア記事カード">
        {railCards.map((doc) => (
          <DocCard key={doc.slug} doc={doc} />
        ))}
      </CardRail>
      {overflow.length > 0 && (
        <details className="group mt-4 rounded-card-content border border-[var(--rule-soft)] bg-[var(--paper)] open:border-[var(--accent)] transition-colors">
          {/* テキスト章アコーディオン（CurriculumList collapsible）と同型の 1 行 summary */}
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden">
            <span className="min-w-0 flex-1 truncate font-serif text-lg font-bold text-[var(--ink)]">その他のキャリア記事</span>
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">{overflow.length}記事</span>
            <DisclosureChevron className="text-[var(--ink-muted)]" />
          </summary>
          <div className="border-t border-[var(--rule-soft)] px-4">
            <CurriculumList blocks={[{ docs: overflow }]} />
          </div>
        </details>
      )}
      {smallBanner && (
        // 転職アフィリ小バナー（PR 表記・href のみ・width/height 属性で自然サイズ＝引き伸ばしなし）。
        // 計測ピクセルは持たない（hub のサイドバー枠が発火源）。景表法: rel=nofollow sponsored。
        <div className="mt-6 flex items-center gap-2">
          <AffiliatePrBadge />
          <a
            href={smallBanner.href}
            target="_blank"
            rel={AFFILIATE_LINK_REL}
            data-cta="affiliate"
            data-cta-label={smallBanner.trackLabel}
            data-cta-placement="category-career-section"
            className="inline-block"
          >
            <img
              src={smallBanner.imageSrc}
              alt={smallBanner.alt}
              width={smallBanner.width}
              height={smallBanner.height}
              loading="lazy"
              className="block"
            />
          </a>
        </div>
      )}
    </CurriculumSection>
  );
}
