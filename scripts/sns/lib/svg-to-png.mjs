/**
 * SVG 文字列 → PNG Buffer 変換（@resvg/resvg-js）。
 *
 * SNS 投稿は PNG で行うが、SVG も並置して保存する（ソース管理・後日修正用）。
 * note の本文の図は scripts/lib/note-figure-png.mjs がこれを使う（倍率 zoom・白背景）。
 * フォントは resvg-js の既定（システムフォント）。
 */

import { Resvg } from '@resvg/resvg-js';

export function svgToPng(svgString, { width, zoom, background } = {}) {
  const fitTo = width
    ? { mode: 'width', value: width }
    : zoom ? { mode: 'zoom', value: zoom } : { mode: 'original' };
  const resvg = new Resvg(svgString, background ? { fitTo, background } : { fitTo });
  return resvg.render().asPng();
}
