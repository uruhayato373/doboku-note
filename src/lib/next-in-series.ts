import { getCategoryCurriculum } from '@/config/category-curriculum';
import type { DocMeta } from '@/lib/docs';
import { isCareerDoc } from '@/lib/doc-classifier';
import { groupDocs } from '@/lib/category-groups';

/**
 * next-in-series.ts — 記事末の「前の記事・次の記事」を、資格ページの並び（category-curriculum.json）から決める。
 *
 * なぜ要るか: 実務・分野別の要点などは 1 本読んで離脱しがちで、次に読む 1 本が記事末に無かった（2026-11 の SEO 計画 §4）。
 *   並びの正本は資格ページと同じ category-curriculum.json の examGuide.slugs と fields.blocks[].slugs（記載順）。
 *   受験ガイドの列と分野別の列は別の列として扱い、分野別は block をまたいで続ける（block の最後の次は次の block の先頭）。
 *   公開中の記事（available に含まれる slug）だけを数え、非公開・未作成の slug は飛ばす。
 *   教科書の章（TextbookNav）・過去問の年度（ExamYearNav）は既存の前後ナビがあるので、ここでは扱わない。
 */

interface SeriesItem {
  readonly slug: string;
  readonly title: string;
}

export interface SeriesNav {
  /** 見出し（受験ガイド・分野の block の名前） */
  readonly heading: string;
  readonly prev: SeriesItem | null;
  readonly next: SeriesItem | null;
}

function sequences(category: string): { heading: string; slugs: { suffix: string; heading: string }[] }[] {
  const c = getCategoryCurriculum(category);
  if (!c) return [];
  const out: { heading: string; slugs: { suffix: string; heading: string }[] }[] = [];
  if (c.examGuide?.slugs.length) {
    const heading = c.examGuide.title;
    out.push({ heading, slugs: c.examGuide.slugs.map((suffix) => ({ suffix, heading })) });
  }
  if (c.fields?.blocks.length) {
    const fallback = c.fields.title;
    out.push({
      heading: fallback,
      slugs: c.fields.blocks.flatMap((b) => b.slugs.map((suffix) => ({ suffix, heading: b.label ?? fallback }))),
    });
  }
  // 章の入口に据えた要点ガイド（textbookChapters[].introGuides）は、章の順に 1 本の列にする（1級の分野別の要点 16 本・2026-11-15）
  const intro = (c.textbookChapters ?? []).flatMap((ch) => (ch.introGuides ?? []).map((suffix) => ({ suffix, heading: `${ch.label}の要点` })));
  if (intro.length) out.push({ heading: '分野別の要点', slugs: intro });
  // 建設部門のキーワード節: 必須科目I（テーマ分析→チップ帯）→ 選択科目（行の順）
  const ks = c.keywordSection;
  if (ks) {
    const req = ks.required;
    const reqSlugs = req ? [...(req.themeSlug ? [req.themeSlug] : []), ...req.groups.flatMap((g) => g.slugs)] : [];
    const sel = (ks.selective?.subjects ?? []).flatMap((sub) => sub.slugs.flatMap((suffix) => (suffix ? [{ suffix, heading: sub.label }] : [])));
    const slugs = [...reqSlugs.map((suffix) => ({ suffix, heading: req!.label })), ...sel];
    if (slugs.length) out.push({ heading: 'キーワード', slugs });
  }
  return out;
}

/** 現在の記事が並びに入っていれば前後を返す。入っていない・前後とも無ければ null */
export function resolveSeriesNav(
  category: string | undefined,
  currentSlug: string,
  available: ReadonlyMap<string, string>,
): SeriesNav | null {
  if (!category) return null;
  for (const seq of sequences(category)) {
    const items = seq.slugs
      .map((s) => ({ slug: `${category}-${s.suffix}`, heading: s.heading }))
      .filter((s, i, arr) => available.has(s.slug) && arr.findIndex((x) => x.slug === s.slug) === i);
    const idx = items.findIndex((s) => s.slug === currentSlug);
    if (idx < 0) continue;
    const pick = (i: number): SeriesItem | null => {
      const s = items[i];
      return s ? { slug: s.slug, title: available.get(s.slug) ?? s.slug } : null;
    };
    const prev = pick(idx - 1);
    const next = pick(idx + 1);
    if (!prev && !next) return null;
    return { heading: items[idx]!.heading, prev, next };
  }
  return null;
}

/**
 * 並びの設定（category-curriculum.json）に入っていない記事の前後。資格ページと同じ並べ方（category-groups の groupDocs）で、
 * 同じ記事型の中の前後を返す。法令は呼び出し側が /laws と同じテーマごとの列を ownGroup で渡す。
 * 二次の要点・コンクリートの一次・法令・総監の用語など 815 本に前後の行き先が無かった（2026-11-15・DN-1219）。
 * キャリア記事は列に入れない（転職導線は別の部品が持つ）。
 */
export function resolveGroupSeriesNav(
  category: string | undefined,
  currentSlug: string,
  docs: readonly DocMeta[],
  opts: {
    /** 資格ページと別の並べ方をする領域（法令はテーマごと）で、記事の属する列を返す */
    readonly ownGroup?: (doc: DocMeta) => { heading: string; docs: DocMeta[] } | null;
  } = {},
): SeriesNav | null {
  if (!category) return null;
  const current = docs.find((d) => d.slug === currentSlug);
  if (!current || isCareerDoc(current)) return null;
  const titleOf = (d: DocMeta): SeriesItem => ({ slug: d.slug, title: d.shortTitle ?? d.title });
  let heading: string;
  let items: DocMeta[];
  if (opts.ownGroup) {
    const own = opts.ownGroup(current);
    if (!own) return null;
    ({ heading, docs: items } = own);
  } else {
    const group = groupDocs(docs.filter((d) => !isCareerDoc(d)), category).find((g) => g.docs.some((d) => d.slug === currentSlug));
    if (!group) return null;
    heading = group.title;
    items = group.docs;
  }
  const idx = items.findIndex((d) => d.slug === currentSlug);
  const prev = idx > 0 ? titleOf(items[idx - 1]!) : null;
  const next = idx >= 0 && idx < items.length - 1 ? titleOf(items[idx + 1]!) : null;
  if (!prev && !next) return null;
  return { heading, prev, next };
}
