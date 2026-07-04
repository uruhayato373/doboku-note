import Link from 'next/link';
import { type DocMeta } from '@/lib/docs';
import { DocCard } from '@/components/category/CategorySections';

// カテゴリページの「体系（受験ガイド / 分野別 / テキスト章）」をテキスト目次調のリストで見せる共有コンポーネント群。
// カード（DocCard）でなくリストにすることで、章立て・出題分野の体系が一目で分かり情報密度を上げる。
// editorial トークンのみ使用（生 hex なし・rounded/shadow 直書きなし）。真実源: docs/design-system/design-system.md §3。

/** 目次リストの1ブロック（見出し＋所属記事）。volume は冊（テキスト2分冊）をまとめる eyebrow。
 *  intro は章の入口に据える「要点」記事（本文 docs の前・「要点」マーカーで区別して表示）。 */
export type CurriculumBlockView = {
  id?: string | undefined;
  label?: string | undefined;
  volume?: string | undefined;
  intro?: DocMeta[] | undefined;
  docs: DocMeta[];
};

/** セクション枠（h2 ヘッダ＝既存 DocSection と同一様式・`sec-*` アンカー維持）。 */
export function CurriculumSection({
  id,
  title,
  description,
  count,
  children,
}: {
  id: string;
  title: string;
  description?: string | undefined;
  count?: number | undefined;
  children: React.ReactNode;
}) {
  return (
    <section id={`sec-${id}`} className="scroll-mt-24">
      <div className="mb-6">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <h2 className="font-serif text-[22px] sm:text-[26px] font-black text-[var(--ink)]">{title}</h2>
          {typeof count === 'number' && (
            <span className="font-mono text-[11px] text-[var(--ink-muted)]">{count} docs</span>
          )}
        </div>
        {description && <p className="text-[14px] text-[var(--ink-muted)] mt-1">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function CurriculumRow({ doc, marker }: { doc: DocMeta; marker: React.ReactNode }) {
  return (
    <li className="border-b border-[var(--rule-soft)] last:border-b-0">
      <Link href={`/docs/${doc.slug}`} data-cta="nav" data-cta-label="curriculum-list" className="group flex items-baseline gap-3 py-3">
        <span className="shrink-0 flex items-center justify-center min-w-6" aria-hidden>
          {marker}
        </span>
        <span className="text-[15px] sm:text-base font-medium text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
          {doc.shortTitle || doc.title}
        </span>
        {doc.subtitle && (
          <span className="hidden sm:inline ml-auto max-w-[40%] truncate text-right text-[13px] text-[var(--ink-muted)]">
            {doc.subtitle}
          </span>
        )}
      </Link>
    </li>
  );
}

/**
 * ブロック群を目次調リストで描画する。
 * - numbered: 連番マーカー（テキスト章目次）。ブロックごとに 01 から振り直す。
 * - 非 numbered: 小さな四角マーカー（分野別）。
 * - volume が前ブロックと変われば冊 eyebrow を挿入。
 */
export function CurriculumList({ blocks, numbered = false }: { blocks: CurriculumBlockView[]; numbered?: boolean }) {
  const visible = blocks.filter((b) => b.docs.length > 0 || (b.intro?.length ?? 0) > 0);
  return (
    <div className="space-y-6">
      {visible.map((block, bi) => {
          const showVolume = !!block.volume && block.volume !== visible[bi - 1]?.volume;
          return (
            <div key={block.id ?? block.label ?? bi}>
              {showVolume && (
                <div className="font-mono text-[11px] uppercase tracking-widest text-[var(--ink-muted)] mb-2 mt-1">
                  {block.volume}
                </div>
              )}
              {block.label && (
                <h3 className="font-serif text-lg font-bold text-[var(--ink)] mb-1 border-b border-[var(--rule-soft)] pb-2">
                  {block.label}
                </h3>
              )}
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
            </div>
          );
        })}
    </div>
  );
}

/**
 * キャリア・転職セクション。注目記事（数本）を DocCard で強調し、残りを目次リストで密度高く見せる。
 * featured/rest は resolveCurriculum が career タグから解決済み（画像は使わない）。
 */
export function CareerSection({
  featured,
  rest,
  title = 'キャリア・転職',
  description,
}: {
  featured: DocMeta[];
  rest: DocMeta[];
  title?: string;
  description?: string | undefined;
}) {
  if (featured.length === 0 && rest.length === 0) return null;
  return (
    <CurriculumSection id="career" title={title} description={description} count={featured.length + rest.length}>
      {featured.length > 0 && (
        <div className="mb-6">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--accent)] mb-3">注目</div>
          <div className="grid gap-4 sm:grid-cols-2">
            {featured.map((doc) => (
              <DocCard key={doc.slug} doc={doc} />
            ))}
          </div>
        </div>
      )}
      {rest.length > 0 && <CurriculumList blocks={[{ docs: rest }]} />}
    </CurriculumSection>
  );
}
