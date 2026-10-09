/**
 * affiliate-placement-core.mjs — 転職アフィリエイトの配置ルール（config/affiliate-placements.json）の判定。依存ゼロの純関数。
 *
 * サイト（src/lib/affiliate-placement.ts）・検査（scripts/check-affiliate-placements.mjs）・型（scripts/lib/dataset-schemas-config-ops.mjs）
 * が同じ判定を使う（1 か所に置く。src/config/site-identity.mjs と同じ置き方）。時刻は引数で受け取る（ビルド時刻・テストの固定時刻）。
 */

/** @typedef {{ pageKind: string, categories?: string[], excludeCategories?: string[], careerDoc?: 'any'|'only'|'exclude' }} Target */
/** @typedef {{ id: string, program: string, slot: string, target: Target, period: { from: string, until: string|null } }} Rule */
/** @typedef {{ pageKind: string, category?: string|null, isCareerDoc?: boolean }} Page */

const ms = (iso) => (iso == null ? null : Date.parse(iso));

/** 期間 [from, until) に nowMs が入るか */
export function isActive(rule, nowMs) {
  const from = ms(rule.period.from);
  const until = ms(rule.period.until);
  return nowMs >= from && (until == null || nowMs < until);
}

/** ルールの対象にページが当たるか。categories を書かないルールは全カテゴリ（excludeCategories を除く） */
export function matchesPage(rule, page) {
  const t = rule.target;
  if (t.pageKind !== page.pageKind) return false;
  const category = page.category ?? null;
  if (t.categories && !t.categories.includes(category)) return false;
  if (t.excludeCategories?.includes(category)) return false;
  const career = t.careerDoc ?? 'any';
  if (career === 'exclude' && page.isCareerDoc) return false;
  if (career === 'only' && !page.isCareerDoc) return false;
  return true;
}

/**
 * ページに当たる有効なルールを面ごとに 1 つ返す（{ [slot]: rule }）。同じ面に 2 つ当たれば投げる
 * （検査と型が止めているはずの状態。黙ってどちらかを選ばない）。
 * @param {Rule[]} rules
 * @param {Page} page
 * @param {number} nowMs
 */
export function resolveSlots(rules, page, nowMs) {
  const out = {};
  for (const r of rules) {
    if (!isActive(r, nowMs) || !matchesPage(r, page)) continue;
    if (out[r.slot]) throw new Error(`配置ルール ${out[r.slot].id} と ${r.id} が同じ面 ${r.slot} に当たる（${page.pageKind} ${page.category ?? '-'}）`);
    out[r.slot] = r;
  }
  return out;
}

/**
 * 1 ページ 1 ピクセルの発火源を決める。描画した面のうち pixelPriority が最も小さい面（null は発火源にならない）。
 * @param {Record<string, { pixelPriority: number|null }>} vocab config/cta-placements.json の affiliate
 * @param {string[]} renderedSlots 実際に描画した面
 * @returns {string|null}
 */
export function choosePixelCarrier(vocab, renderedSlots) {
  let best = null;
  for (const slot of renderedSlots) {
    const p = vocab[slot]?.pixelPriority;
    if (p == null) continue;
    if (best == null || p < vocab[best].pixelPriority) best = slot;
  }
  return best;
}

/** 2 つのルールの期間が重なるか */
export function periodsOverlap(a, b) {
  const aFrom = ms(a.period.from);
  const bFrom = ms(b.period.from);
  const aUntil = ms(a.period.until) ?? Infinity;
  const bUntil = ms(b.period.until) ?? Infinity;
  return aFrom < bUntil && bFrom < aUntil;
}

/** 2 つのルールの対象が交わるか（同じページに両方が当たりうるか） */
export function targetsIntersect(a, b) {
  const ta = a.target;
  const tb = b.target;
  if (ta.pageKind !== tb.pageKind) return false;
  const ca = ta.careerDoc ?? 'any';
  const cb = tb.careerDoc ?? 'any';
  if ((ca === 'only' && cb === 'exclude') || (ca === 'exclude' && cb === 'only')) return false;
  const inA = (c) => (!ta.categories || ta.categories.includes(c)) && !ta.excludeCategories?.includes(c);
  const inB = (c) => (!tb.categories || tb.categories.includes(c)) && !tb.excludeCategories?.includes(c);
  if (ta.categories) return ta.categories.some((c) => inA(c) && inB(c));
  if (tb.categories) return tb.categories.some((c) => inA(c) && inB(c));
  return true; // どちらも全カテゴリ（除外があっても、除外していないカテゴリが残る）
}

/** 同じ面で期間が重なり対象が交わる 2 ルールの組（ページあたり 1 面 1 案件の前提を崩すもの） */
export function findOverlaps(rules) {
  const out = [];
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const a = rules[i];
      const b = rules[j];
      if (a.slot === b.slot && periodsOverlap(a, b) && targetsIntersect(a, b)) out.push([a.id, b.id]);
    }
  }
  return out;
}
