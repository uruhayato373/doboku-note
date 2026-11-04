/**
 * 同じ試験の年度違いのページを slug から見つける。年度は `-r07`（令和）・`-h29`（平成）。
 * `civil-construction-2-secondary-r07` と `-r06` のように、年度以外が同じ slug を兄弟とする。
 */
const YEAR_TOKEN = /(^|-)([rh])(\d{2})(?=-|$)/;

function yearOf(slug) {
  const m = YEAR_TOKEN.exec(slug);
  if (!m) return null;
  return { family: slug.replace(YEAR_TOKEN, '$1*'), order: (m[2] === 'r' ? 1000 : 0) + Number(m[3]) };
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
