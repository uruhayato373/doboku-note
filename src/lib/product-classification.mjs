/** 商品ラインナップの順序付きルール。サイトと運営スクリプトが共用する。 */
export function classifyProduct(rules, id) {
  for (const rule of rules ?? []) {
    if (new RegExp(rule.match).test(id)) return rule.cells;
  }
  return null;
}
