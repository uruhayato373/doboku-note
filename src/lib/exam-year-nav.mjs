/**
 * 同じ試験の年度違いのページを slug から見つける。年度は `-r07`（令和）・`-h29`（平成）。
 * `civil-construction-2-secondary-r07` と `-r06` のように、年度以外が同じ slug を兄弟とする。
 */
import { examYearRank } from './exam-year.mjs';

const YEAR_TOKEN = /(^|-)([rh])(\d{2})(?=-|$)/;

function yearOf(slug) {
  const m = YEAR_TOKEN.exec(slug);
  if (!m) return null;
  return { family: slug.replace(YEAR_TOKEN, '$1*'), order: examYearRank(`${m[2]}${m[3]}`) };
}

/** slug の年度の並び順（令和が平成より後・大きいほど新しい）。年度が無ければ null */
export function examYearOrder(slug) {
  return yearOf(slug)?.order ?? null;
}

/**
 * 年度違いの回遊候補を行き先の優先順に並べる。前後の年度 → 同じ年度の別区分（slug 順）→ 残りの年度を近い順。
 * 現在のページ自身と年度の無いページは含めない。
 */
export function findYearRelatives(currentSlug, slugs) {
  const current = yearOf(currentSlug);
  if (!current) return [];
  const rows = slugs.filter((slug) => slug !== currentSlug).map((slug) => ({ slug, year: yearOf(slug) })).filter((row) => row.year);
  const distance = (row) => Math.abs(row.year.order - current.order);
  const family = rows.filter((row) => row.year.family === current.family).sort((a, b) => distance(a) - distance(b) || b.year.order - a.year.order);
  const { older, newer } = findYearSiblings(currentSlug, slugs);
  const adjacent = [older, newer].filter(Boolean);
  const sameYear = rows.filter((row) => row.year.order === current.order && row.year.family !== current.family).map((row) => row.slug).sort();
  return [...new Set([...adjacent, ...sameYear, ...family.map((row) => row.slug)])];
}

/** 現在の slug の 1 年前（older）と 1 年後（newer）。無ければ null */
export function findYearSiblings(currentSlug, slugs) {
  const current = yearOf(currentSlug);
  if (!current) return { older: null, newer: null };
  const family = slugs
    .map((slug) => ({ slug, year: yearOf(slug) }))
    .filter((s) => s.year?.family === current.family)
    .sort((a, b) => a.year.order - b.year.order);
  const idx = family.findIndex((s) => s.slug === currentSlug);
  if (idx === -1) return { older: null, newer: null };
  return { older: family[idx - 1]?.slug ?? null, newer: family[idx + 1]?.slug ?? null };
}
