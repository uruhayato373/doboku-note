/** EXP-019: 掲載位置・案件を固定し、訪問者ごとに A/B/C を固定する。 */
export const AFFILIATE_EXPERIMENT_ID = 'EXP-019';
export const AFFILIATE_VARIANTS = ['A', 'B', 'C'];
export const AFFILIATE_VARIANT_KEY = 'doboku-note:EXP-019:variant';
export const AFFILIATE_EXPERIMENT_EVENTS = [
  'affiliate_experiment_page_view',
  'affiliate_experiment_impression',
  'affiliate_experiment_click',
  'note_experiment_impression',
  'note_experiment_click',
];

/** storage が使えない場合も、そのページ内では呼び出し側が戻り値を共有する。 */
export function assignAffiliateVariant(storage, random = Math.random) {
  try {
    const saved = storage?.getItem(AFFILIATE_VARIANT_KEY);
    if (AFFILIATE_VARIANTS.includes(saved)) return saved;
  } catch { /* ストレージ拒否時も広告とページは表示する。 */ }
  const variant = AFFILIATE_VARIANTS[Math.min(2, Math.max(0, Math.floor(random() * 3)))];
  try { storage?.setItem(AFFILIATE_VARIANT_KEY, variant); } catch { /* ページ内で固定する。 */ }
  return variant;
}

/** 登録済み event_label で案・案件・面を読める。氏名等は含めない。 */
export function affiliateExperimentLabel(variant, program, placement) {
  return `${AFFILIATE_EXPERIMENT_ID}:${variant}:${program}:${placement}`;
}

export function parseAffiliateExperimentLabel(label) {
  const [experiment, variant, program, placement, extra] = String(label).split(':');
  if (experiment !== AFFILIATE_EXPERIMENT_ID || !AFFILIATE_VARIANTS.includes(variant) || !program || !placement || extra) return null;
  return { experiment, variant, program, placement };
}
