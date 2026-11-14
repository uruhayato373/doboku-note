import Link from 'next/link';
import { ArrowRight, ArrowUpRight, BookOpen } from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import { WIDE_CONTAINER } from '@/components/layout/container';
import DisclosureChevron from '@/components/ui/DisclosureChevron';
import { AFFILIATE_LINK_REFERRER_POLICY, AFFILIATE_LINK_REL, AffiliatePrBadge, TrackingPixel } from '@/components/ui/AffiliateParts';
import { COCONALA_A8_PIXEL } from '@/config/affiliate-creatives';
import { buildLearningCatalog, type LearningProduct, type LearningQualification } from '@/lib/learning-catalog';
import { buildPageMetadata } from '@/lib/metadata';
import { externalLinkRel } from '@/lib/external-link-rel';

export const metadata = buildPageMetadata({
  title: '資格別の教材・学習サポート',
  description: '土木・建設系資格の無料学習、note教材、Kindle電子書籍、答案添削・相談を資格別に一覧できます。資格ごとの教材目次や主要教材から、自分に合う学習方法を探せます。',
  path: '/links',
});

const CHANNELS = { note: 'note', kindle: 'Kindle', coconala: 'ココナラ' };
const ROW_CLASS = 'focus-ring flex min-h-11 items-center gap-3 px-4 py-3 transition-colors hover:bg-(--accent-fill)';

function ProductRow({ product }: { product: LearningProduct }) {
  const affiliate = product.channel === 'coconala';
  return (
    <a href={product.href} target="_blank" rel={affiliate ? AFFILIATE_LINK_REL : externalLinkRel(product.href)}
      referrerPolicy={affiliate ? AFFILIATE_LINK_REFERRER_POLICY : undefined}
      data-cta={product.channel === 'kindle' ? undefined : product.channel}
      data-cta-label={product.id} data-cta-placement="links-hub" data-product-id={product.id}
      className={ROW_CLASS}>
      <span className="min-w-0 flex-1">
        <span className="mb-1 flex items-center gap-2 text-xs text-(--ink-muted)">
          {CHANNELS[product.channel]}{affiliate && <AffiliatePrBadge />}
        </span>
        <span className="block text-sm font-medium leading-relaxed text-(--ink)">{product.title}</span>
        {product.deadline && <span className="mt-1 block text-xs text-(--ink-muted)">{product.deadline}</span>}
      </span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-(--accent)" aria-hidden="true" />
    </a>
  );
}

function QualificationCard({ exam }: { exam: LearningQualification }) {
  const mainNote = exam.materials.find((product) => product.channel === 'note');
  const mainBook = exam.materials.find((product) => product.channel === 'kindle');
  // 主力の教材を指定した資格はもくじより先にそれを出す（2026-10-31 の決定）。もくじは全教材の一覧として残す
  const featured = [exam.featured ?? (!exam.noteIndex ? mainNote : undefined), mainBook]
    .filter((product): product is LearningProduct => !!product);
  const remaining = exam.materials.filter((product) => !featured.some((entry) => entry.id === product.id));

  return (
    <section id={`exam-${exam.id}`} aria-labelledby={`heading-${exam.id}`}
      className="scroll-mt-24 overflow-hidden rounded-card-content border border-(--rule-soft) bg-(--paper) shadow-card-content dark:border-(--rule-soft)">
      <h2 id={`heading-${exam.id}`} className="border-b border-(--rule-soft) bg-(--accent-fill) px-4 py-3 text-base font-bold leading-relaxed text-(--ink) dark:border-(--rule-soft)">
        {exam.label}
      </h2>
      <div className="divide-y divide-(--rule-soft)">
        <Link href={exam.siteHref} data-cta="nav" data-cta-label={`site-${exam.id}`} data-cta-placement="links-hub"
          className={`${ROW_CLASS} text-sm font-bold text-(--accent)`}>
          <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">無料で学ぶ</span><ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </Link>
        {exam.featured && <ProductRow product={exam.featured} />}
        {exam.noteIndex && (
          <a href={exam.noteIndex.href} target="_blank" rel={externalLinkRel(exam.noteIndex.href)}
            data-cta="note" data-cta-label={`mokuji-${exam.id}`} data-cta-placement="links-hub" className={ROW_CLASS}>
            <span className="min-w-0 flex-1">
              <span className="mb-1 block text-xs text-(--ink-muted)">note</span>
              <span className="block text-sm font-medium leading-relaxed text-(--ink)">{exam.featured ? '全教材の目次を見る' : '教材の目次を見る'}</span>
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-(--accent)" aria-hidden="true" />
          </a>
        )}
        {featured.filter((product) => product !== exam.featured).map((product) => <ProductRow key={product.id} product={product} />)}
        {exam.support.map((product) => <ProductRow key={product.id} product={product} />)}
      </div>
      {remaining.length > 0 && (
        <details className="border-t border-(--rule-soft) dark:border-(--rule-soft)">
          <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm text-(--accent) transition-colors hover:bg-(--accent-fill) [&::-webkit-details-marker]:hidden">
            <DisclosureChevron />ほかの教材（{remaining.length}件）
          </summary>
          <div className="divide-y divide-(--rule-soft) border-t border-(--rule-soft) dark:border-(--rule-soft)">
            {remaining.map((product) => <ProductRow key={product.id} product={product} />)}
          </div>
        </details>
      )}
    </section>
  );
}

export default function LinksPage() {
  const catalog = buildLearningCatalog();
  return (
    <PageShell variant="default">
      <div className={`${WIDE_CONTAINER} py-7 sm:py-10`}>
        <PageHeader title="資格別の教材・学習サポート" className="mb-4 sm:mb-6" />
        <nav aria-label="資格の目次" className="mb-6 flex flex-wrap gap-x-4 gap-y-1 border-b border-(--rule-soft) pb-4 dark:border-(--rule-soft)">
          {catalog.map((exam) => (
            <a key={exam.id} href={`#exam-${exam.id}`} title={exam.label}
              className="focus-ring inline-flex min-h-10 items-center text-sm text-(--accent) underline decoration-(--rule-soft) underline-offset-4 hover:decoration-current">
              {exam.shortLabel}
            </a>
          ))}
        </nav>
        <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
          {catalog.map((exam) => <QualificationCard key={exam.id} exam={exam} />)}
        </div>
        <div className="mt-8 border-t border-(--rule-soft) pt-4 text-sm dark:border-(--rule-soft)">
          <Link href="/about" className="focus-ring text-(--accent) hover:underline">運営者について</Link>
        </div>
        <TrackingPixel src={catalog.some((exam) => exam.support.length > 0) ? COCONALA_A8_PIXEL : undefined} />
      </div>
    </PageShell>
  );
}
