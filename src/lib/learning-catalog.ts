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

  return qualifications.map(({ scope: _scope, ...exam }) => {
    const lead = categoryLeadMagazineId(exam.id) ?? sidebarProduct(exam.id)?.id;
    // 既存の主教材を先頭へ。電子書籍も折りたたみの外から選べるようにする。
    const notes = exam.materials.filter((product) => product.channel === 'note');
    const first = exam.materials.find((product) => product.id === lead) ?? notes[0] ?? exam.materials[0];
    const book = exam.materials.find((product) => product.channel === 'kindle');
    const preview = [first, book, ...notes, ...exam.materials].filter((product): product is LearningProduct => !!product);
    return { ...exam, materials: [...new Map(preview.map((product) => [product.id, product])).values()] };
  });
}
