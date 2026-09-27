/**
 * 代表テンプレートのルート一覧（副作用なしの純データ）。
 * a11y.spec.ts と visual.spec.ts の両方が参照する。テストファイル同士を import すると
 * Playwright がその spec のテストも重複登録してしまうため、共有データはここへ切り出す。
 */
export const representativeRoutes = [
  '/',
  '/exam/pe-comprehensive-management',
  '/exam/pe-comprehensive-management/keywords/alarp-principle',
  '/exam/civil-construction-1/secondary/r06',
  '/exam/civil-construction-1/textbook/network-schedule',
  '/standards/kinki/common/chapters/1-3',
  '/tools/keiken-charcount',
  '/search?q=コンクリート',
] as const;
