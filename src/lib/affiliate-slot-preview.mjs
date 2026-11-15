/* global process */
/** 仮の広告はローカル開発だけ。本番では環境変数が残っても有効にしない。 */
export function affiliateSlotPreview(env = process.env) {
  return env.AFFILIATE_SLOT_PREVIEW === '1' && env.NODE_ENV !== 'production';
}
