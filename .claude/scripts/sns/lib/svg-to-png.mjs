/**
 * SVG 文字列 → PNG Buffer 変換（@resvg/resvg-js）。
 *
 * SNS 投稿は PNG で行うが、SVG も並置して保存する（ソース管理・後日修正用）。
 */

import { Resvg } from '@resvg/resvg-js';

export function svgToPng(svgString, { width } = {}) {
  const opts = width
    ? { fitTo: { mode: 'width', value: width } }
    : { fitTo: { mode: 'original' } };
  const resvg = new Resvg(svgString, opts);
  return resvg.render().asPng();
}
