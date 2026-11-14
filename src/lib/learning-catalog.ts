import productsData from '../../config/products.json';
import registry from '../../config/qualification-registry.json';
import lineup from '../../config/product-lineup.json';
import { buildExamCards } from './home-exam-cards';
import { getCategoryBySlug, getCategoryHubPath } from './categories';
import { getMagazine, buildMagazineUrl, type MagazineId } from './note-magazines';
import { listedCoconalaServices } from './coconala-services';
import { QUALIFICATION_TO_EXAM_KEY } from './exam-brand';
import { classifyProduct } from './product-classification.mjs';
import { categoryLeadMagazineId } from './magazine-placement';
import { sidebarProduct } from './sidebar-discovery';
import { withTensakuDeadline } from './exam-dates';
import { qualificationShortLabel } from './qualification-names';
import { mokujiFor } from './note-mokuji';
import { withNoteUtm } from './note-utm';
import { coconalaAffiliateHref } from '@/config/affiliate-creatives';

export type LearningProduct = {
  id: string;
  channel: 'note' | 'kindle' | 'coconala';
  title: string;
  href: string;
  deadline: string;
};

export type LearningQualification = {
  id: string;
  label: string;
  shortLabel: string;
  siteHref: string;
  noteIndex: { title: string; href: string } | null;
  /** もくじより先に、カードの 2 行目へ直接出す主力の教材（FEATURED_NOTE の資格だけ） */
  featured: LearningProduct | null;
  materials: LearningProduct[];
  support: LearningProduct[];
};

type ProductRecord = {
  id: string;
  channel: string;
  qualification: string;
  catalog: { status?: string; asin?: string; title: string };
};

const groups: Record<string, { members: string[] }> = registry.groups;

/**
 * /links の発信の優先順（2026-10-31 の運営者の決定）。技術士一次→技術士の二次→コンクリート→土木→RCCM の順に先頭へ置き、
 * スマホの 1 画面目は技術士一次にする（e2e/mobile.spec.ts が見る）。ここに無い資格は資格の台帳の順で後ろに続く。
 */
const LINKS_PRIORITY = [
  'pe-first-stage', 'pe-construction', 'pe-comprehensive-management',
  'concrete-engineer', 'concrete-chief-engineer', 'concrete-diagnostician',
  'civil-construction-1', 'civil-construction-2', 'rccm',
];

/**
 * 主力の教材へ直接送る資格（2026-10-31 の決定）。技術士一次は試験日で切り替える（categoryLeadMagazineId＝試験日の翌日から過去問 PDF）。
 * コンクリートの 2 資格は直前パックを固定で出す。
 */
const FEATURED_NOTE: Record<string, MagazineId | 'season'> = {
  'pe-first-stage': 'season',
  'concrete-engineer': 'ce-chokuzen-pack',
  'concrete-chief-engineer': 'cce-takuitsu-chokuzen-pack',
};

/** 商品台帳はサーバーで読む。クライアントへ渡すのは公開用の項目だけ。 */
export function buildLearningCatalog(): LearningQualification[] {
  const qualifications = buildExamCards().map((exam) => {
    const qualification = getCategoryBySlug(exam.slug)?.qualification ?? exam.slug;
    const key = QUALIFICATION_TO_EXAM_KEY[qualification];
    const index = key ? mokujiFor(key) : null;
    return {
      id: exam.slug,
      label: exam.label,
      shortLabel: qualificationShortLabel(qualification),
      siteHref: getCategoryHubPath(exam.slug),
      noteIndex: index ? {
        title: index.title,
        href: withNoteUtm(index.noteUrl, 'links', { content: `mokuji-${key}` }),
      } : null,
      scope: [qualification, ...(groups[qualification]?.members ?? [])],
      materials: [] as LearningProduct[],
      support: [] as LearningProduct[],
    };
  });
  const services = new Map(listedCoconalaServices().map((service) => [service.id, service]));

  for (const record of productsData.products as ProductRecord[]) {
    let product: LearningProduct;
    let scope = [record.qualification];
    const base = { id: record.id, deadline: '' };
    if (record.channel === 'note') {
      const note = getMagazine(record.id as MagazineId);
      if (!note || note.retiredAt) continue;
      // 複数資格に対応する口頭対策・共通教材は、既存の分類を使う。
      const cells = classifyProduct(lineup.rules.note, record.id);
      if (cells?.length) scope = cells.map((cell) => cell.split(':')[0]!);
      product = {
        ...base, channel: 'note', title: note.shortTitle ?? note.title,
        href: buildMagazineUrl(note, `links-${record.id}`),
      };
    } else if (record.channel === 'coconala') {
      const service = services.get(record.id);
      if (!service) continue;
      scope = [...service.examScope];
      product = {
        ...base, channel: 'coconala', title: service.shortTitle ?? service.title,
        href: coconalaAffiliateHref(service.serviceUrl),
        deadline: service.examScope.includes('concrete-chief-engineer')
          ? withTensakuDeadline('concrete-chief-engineer', 'exam', '') : '',
      };
    } else if (record.channel === 'kindle') {
      const book = record.catalog;
      if (book.status !== 'live') continue;
      if (!book.asin || !/^[A-Z0-9]{10}$/.test(book.asin)) {
        throw new Error(`公開書籍 ${record.id} の ASIN が不正です`);
      }
      product = {
        ...base, channel: 'kindle', title: book.title,
        href: `https://www.amazon.co.jp/dp/${book.asin}`,
      };
    } else continue;

    const expanded = scope.flatMap((id) => [id, ...(groups[id]?.members ?? [])]);
    const targets = qualifications.filter((exam) => exam.scope.some((id) =>
      expanded.includes(id) || expanded.includes(QUALIFICATION_TO_EXAM_KEY[id] ?? '')));
    if (!targets.length) throw new Error(`公開商品 ${record.id} に対応する資格の入口がありません`);
    for (const exam of targets) {
      (product.channel === 'coconala' ? exam.support : exam.materials).push(product);
    }
  }

  const cards = qualifications.map(({ scope: _scope, ...exam }) => {
    const featuredId = FEATURED_NOTE[exam.id];
    const lead = featuredId === 'season' ? categoryLeadMagazineId(exam.id) : featuredId ?? categoryLeadMagazineId(exam.id) ?? sidebarProduct(exam.id)?.id;
    // 既存の主教材を先頭へ。電子書籍も折りたたみの外から選べるようにする。
    const notes = exam.materials.filter((product) => product.channel === 'note');
    const first = exam.materials.find((product) => product.id === lead) ?? notes[0] ?? exam.materials[0];
    const book = exam.materials.find((product) => product.channel === 'kindle');
    const preview = [first, book, ...notes, ...exam.materials].filter((product): product is LearningProduct => !!product);
    const featured = featuredId ? exam.materials.find((product) => product.id === lead) ?? null : null;
    return { ...exam, featured, materials: [...new Map(preview.map((product) => [product.id, product])).values()] };
  });
  const rank = (id: string) => { const i = LINKS_PRIORITY.indexOf(id); return i === -1 ? LINKS_PRIORITY.length : i; };
  // 優先の資格を先頭へ。それ以外は資格の台帳の順（buildExamCards の順）のまま後ろに続く（sort は安定）
  return cards.sort((a, b) => rank(a.id) - rank(b.id));
}
