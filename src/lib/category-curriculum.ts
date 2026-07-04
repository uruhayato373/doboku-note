import { type DocMeta } from '@/lib/docs';
import { getCategoryCurriculum } from '@/config/category-curriculum';

// カテゴリページの「体系（受験ガイド / 分野別 / テキスト章 / キャリア）」を config から解決する純関数群。
// 設計の最重要原則: config 未割当の記事を silent drop しない。resolveCurriculum は必ず unassigned で拾い、
// resolveTextbookChapters はレンジ外を「その他」章へ回す。View 非依存（テスト可能）。

/** doc.slug（`${category}-${suffix}`）から suffix を取り出す。prefix が無ければ slug そのまま。 */
function toSuffix(category: string, slug: string): string {
  const prefix = `${category}-`;
  return slug.startsWith(prefix) ? slug.slice(prefix.length) : slug;
}

export type CurriculumBlockResolved = { id: string; label?: string | undefined; docs: DocMeta[] };

export type ResolvedCurriculum = {
  examGuide: { title: string; description?: string | undefined; docs: DocMeta[] } | null;
  fields: { title: string; description?: string | undefined; blocks: CurriculumBlockResolved[] } | null;
  career: { featured: DocMeta[]; rest: DocMeta[] };
  /** config のどのブロックにも属さない非キャリア guide。View は必ず表示する（silent drop 防止）。 */
  unassigned: DocMeta[];
};

/**
 * guide 記事群を config に従って 受験ガイド / 分野別ブロック / キャリア（注目＋残り）へ振り分ける。
 * - キャリア判定は既存踏襲（tags.includes('career')）。
 * - ブロック内の並びは config の slugs 記載順。config に無い非キャリア guide は unassigned。
 * - careerFeatured の欠落 slug は featured から除外し rest に残る（防御的）。
 */
export function resolveCurriculum(category: string, guideDocs: DocMeta[]): ResolvedCurriculum {
  const cfg = getCategoryCurriculum(category);

  const bySuffix = new Map<string, DocMeta>();
  for (const d of guideDocs) bySuffix.set(toSuffix(category, d.slug), d);

  const career = guideDocs.filter((d) => d.tags?.includes('career'));
  const nonCareer = guideDocs.filter((d) => !d.tags?.includes('career'));

  const assigned = new Set<DocMeta>();
  const pick = (slugs: string[] | undefined): DocMeta[] => {
    if (!slugs) return [];
    const out: DocMeta[] = [];
    for (const s of slugs) {
      const d = bySuffix.get(s);
      if (d && !d.tags?.includes('career') && !assigned.has(d)) {
        assigned.add(d);
        out.push(d);
      }
    }
    return out;
  };

  const examGuideDocs = pick(cfg?.examGuide?.slugs);
  const examGuide = cfg?.examGuide
    ? { title: cfg.examGuide.title, description: cfg.examGuide.description, docs: examGuideDocs }
    : null;

  const blocks: CurriculumBlockResolved[] = (cfg?.fields?.blocks ?? [])
    .map((b) => ({ id: b.id, label: b.label, docs: pick(b.slugs) }))
    .filter((b) => b.docs.length > 0);
  const fields = cfg?.fields && blocks.length > 0
    ? { title: cfg.fields.title, description: cfg.fields.description, blocks }
    : null;

  // 非キャリア guide で未割当のもの（config 追記漏れ・新規記事）。必ず表示に回す。
  const unassigned = nonCareer.filter((d) => !assigned.has(d));

  const featuredSuffixes = cfg?.careerFeatured ?? [];
  const featured: DocMeta[] = [];
  const featuredSet = new Set<DocMeta>();
  for (const s of featuredSuffixes) {
    const d = bySuffix.get(s);
    if (d && d.tags?.includes('career')) {
      featured.push(d);
      featuredSet.add(d);
    }
  }
  const rest = career.filter((d) => !featuredSet.has(d));

  return { examGuide, fields, career: { featured, rest }, unassigned };
}

/** テキスト記事の並び順キー（textbook_order 優先、無ければ section 数値、無ければ末尾）。 */
function textbookSortKey(d: DocMeta): number {
  if (typeof d.textbook_order === 'number') return d.textbook_order;
  const s = Number(d.section);
  return Number.isFinite(s) ? s : 9999;
}

export type TextbookChapterResolved = { volume?: string | undefined; label: string; docs: DocMeta[] };

/**
 * textbook 記事を config の章レンジ（textbook_order）でグルーピングする。
 * - config が無い（concrete 系: section 連番）なら単一のフラット章として order 昇順で返す。
 * - レンジ外の記事は「その他」章へ回す（silent drop 防止）。
 */
export function resolveTextbookChapters(category: string, textbookDocs: DocMeta[]): TextbookChapterResolved[] {
  if (textbookDocs.length === 0) return [];
  const cfg = getCategoryCurriculum(category);
  const ranges = cfg?.textbookChapters;

  const sorted = [...textbookDocs].sort((a, b) => textbookSortKey(a) - textbookSortKey(b));

  if (!ranges || ranges.length === 0) {
    // section ベース（concrete 系）: 章見出しなしのフラット目次。
    return [{ label: '', docs: sorted }];
  }

  const chapters: TextbookChapterResolved[] = ranges.map((r) => ({ volume: r.volume, label: r.label, docs: [] }));
  const leftover: DocMeta[] = [];
  for (const d of sorted) {
    const order = typeof d.textbook_order === 'number' ? d.textbook_order : NaN;
    const idx = ranges.findIndex((r) => Number.isFinite(order) && order >= r.min && order <= r.max);
    const chapter = idx >= 0 ? chapters[idx] : undefined;
    if (chapter) chapter.docs.push(d);
    else leftover.push(d);
  }
  if (leftover.length > 0) chapters.push({ label: 'その他', docs: leftover });
  return chapters.filter((c) => c.docs.length > 0);
}
