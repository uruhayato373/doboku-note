/**
 * EXP-048: 本文の転職枠で、訪問者ごとに B（小型カード 1 枚）/ B2（PC だけ同じ枠に 2 社の小型カードを横に並べる）を固定する
 * （訴求設計 §12.2・DN-0883）。2 枚目は config/affiliate-placements.json の pairs で決まり、組の無い面・スマホでは B2 も 1 枚。
 * 前の EXP-043（小型カード B と支給バナー C）は 2026-10-31 に運営者の指示で B を採用して打ち切った。EXP-019・EXP-038 も打ち切り済み
 * （data/business/experiments.json）。保存キーも実験ごとに変え、前の実験で割り当てた案を引き継がない。
 */
export const AFFILIATE_EXPERIMENT_ID = 'EXP-048';
export const AFFILIATE_VARIANTS = ['B', 'B2'];
export const AFFILIATE_VARIANT_KEY = 'doboku-note:EXP-048:variant';
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
  const last = AFFILIATE_VARIANTS.length - 1;
  const variant = AFFILIATE_VARIANTS[Math.min(last, Math.max(0, Math.floor(random() * AFFILIATE_VARIANTS.length)))];
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
