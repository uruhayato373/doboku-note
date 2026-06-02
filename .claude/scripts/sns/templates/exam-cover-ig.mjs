/**
 * exam-cover-ig.mjs — IG カルーセル slide 1（試験識別カバー）テンプレ。
 *
 * 多資格展開の「試験識別レイヤー」を実装。1080×1350、セーフゾーン(中央1080²)対応。
 * 真実源: docs/reference/sns-image-policy.md §12 ／ docs/project/03_SNS/04_多資格SNS展開設計.md
 *
 * 使い方:
 *   renderExamCoverIg({ exam:'技術士総監', tag:'過去問', year:'令和7年度', fmtLabel:'択一式 過去問', page:[1,10] })
 */
import { COLORS, esc, rect, text, svgDoc } from '../lib/svg-base.mjs';
import { examColor, officialNameLines } from '../lib/exam-palette.mjs';

const W = 1080, H = 1350, CUT = 135; // セーフゾーン y∈[135,1215]

export function renderExamCoverIg({ exam, tag = '過去問', year, fmtLabel, page = [1, 10], tone }) {
  const c = examColor(exam, tone);
  const hue = c.use, deep = c.deep;
  const BAND = 440;
  const body = [];

  // 上部 試験色帯（グリッドでカットされてよい＝色のみ）
  body.push(rect({ x: 0, y: 0, w: W, h: BAND, fill: hue }));

  // タグピル＋ページ番号（セーフゾーン内 y≥135）
  const tagW = [...tag].length * 38 + 56;
  body.push(rect({ x: 60, y: 165, w: tagW, h: 64, rx: 32, fill: deep }));
  body.push(text({ x: 60 + tagW / 2, y: 207, content: tag, size: 30, weight: 700, fill: COLORS.white, anchor: 'middle' }));
  body.push(text({ x: W - 60, y: 207, content: `${String(page[0]).padStart(2, '0')} / ${page[1]}`, size: 30, weight: 700, fill: '#ffffffcc', anchor: 'end' }));

  // 正式名称（略称なし。総監は2行、他は1行）
  const lines = officialNameLines(exam);
  if (lines.length === 2) {
    body.push(text({ x: 60, y: 300, content: lines[0].text, size: lines[0].size, weight: 400, fill: '#ffffffdd' }));
    body.push(text({ x: 60, y: 392, content: lines[1].text, size: lines[1].size, weight: 700, fill: COLORS.white }));
  } else {
    body.push(text({ x: 60, y: 375, content: lines[0].text, size: lines[0].size, weight: 700, fill: COLORS.white }));
  }

  // コンテンツ：年度を主役（大）、形式＋種別を従
  if (year) body.push(text({ x: 60, y: 720, content: year, size: 150, weight: 700, fill: COLORS.inkStrong }));
  if (fmtLabel) body.push(text({ x: 60, y: 820, content: fmtLabel, size: 56, weight: 700, fill: COLORS.inkBody }));

  // CTA ピル
  body.push(rect({ x: 60, y: 980, w: 520, h: 96, rx: 48, fill: `${hue}1a`, stroke: hue, sw: 2 }));
  body.push(text({ x: 110, y: 1040, content: 'まずは1問やってみる →', size: 40, weight: 700, fill: hue }));

  // ブランド（セーフゾーン内 y≤1215）
  body.push(rect({ x: 60, y: 1140, w: 40, h: 40, rx: 8, fill: hue }));
  body.push(text({ x: 116, y: 1172, content: 'doboku-note.com', size: 36, weight: 700, fill: COLORS.inkStrong }));

  return svgDoc({ width: W, height: H, body: body.join('\n  ') });
}
