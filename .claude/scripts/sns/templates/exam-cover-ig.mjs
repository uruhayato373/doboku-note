/**
 * exam-cover-ig.mjs — IG slide 1（試験識別カバー）テンプレ。多フォーマット対応。
 *
 * 多資格展開の「試験識別レイヤー」を実装。
 *   - carousel: 1080×1350、セーフゾーン(中央1080²)対応
 *   - reels:    1080×1920（動画 1 枚目。bottom はキャプション域を避ける）
 *   - stories:  1080×1920（上下に IG Stories UI 域を確保）
 * 真実源: docs/reference/sns-image-policy.md §12 ／ docs/project/03_SNS/04_多資格SNS展開設計.md
 *
 * 使い方:
 *   renderExamCoverIg({ exam:'技術士総監', tag:'過去問', year:'令和7年度', fmtLabel:'択一式 過去問', page:[1,10] })
 *   renderExamCoverIg({ ...同上, format:'reels' })   // 1080×1920
 *   renderExamCoverIg({ ...同上, format:'stories' }) // 1080×1920・UI 域確保
 */
import { COLORS, esc, rect, text, svgDoc } from '../lib/svg-base.mjs';
import { examColor, officialNameLines } from '../lib/exam-palette.mjs';

const W = 1080;

// フォーマット別レイアウト。CTA ピル(w520/h96, text x110, dy60)とブランド
// (rect w40/h40, text x116, dy32)は全フォーマット共通。Y 座標のみ可変。
const LAYOUTS = {
  // carousel は従来座標を厳密温存（既存 PNG とバイト一致を保つ）
  carousel: { height: 1350, band: 440, tagY: 165, nameY1: 300, nameY2: 392, nameSolo: 375, yearY: 720, yearS: 150, fmtY: 820, fmtS: 56, ctaY: 980, brandY: 1140 },
  // reels: 1080×1920。動画 1 枚目。下部 ~250px はキャプション域として空ける
  reels:  { height: 1920, band: 600, tagY: 210, nameY1: 370, nameY2: 470, nameSolo: 445, yearY: 1010, yearS: 160, fmtY: 1120, fmtS: 60, ctaY: 1300, brandY: 1640 },
  // stories: 1080×1920。上 ~300px / 下 ~350px は IG Stories UI 域として空ける
  stories: { height: 1920, band: 640, tagY: 320, nameY1: 470, nameY2: 562, nameSolo: 540, yearY: 1030, yearS: 150, fmtY: 1135, fmtS: 56, ctaY: 1310, brandY: 1530 },
};

export function renderExamCoverIg({ exam, tag = '過去問', year, fmtLabel, page = [1, 10], tone, format = 'carousel' }) {
  const L = LAYOUTS[format] || LAYOUTS.carousel;
  const c = examColor(exam, tone);
  const hue = c.use, deep = c.deep;
  const body = [];

  // 上部 試験色帯（グリッドでカットされてよい＝色のみ）
  body.push(rect({ x: 0, y: 0, w: W, h: L.band, fill: hue }));

  // タグピル＋ページ番号（セーフゾーン内）
  const tagW = [...tag].length * 38 + 56;
  body.push(rect({ x: 60, y: L.tagY, w: tagW, h: 64, rx: 32, fill: deep }));
  body.push(text({ x: 60 + tagW / 2, y: L.tagY + 42, content: tag, size: 30, weight: 700, fill: COLORS.white, anchor: 'middle' }));
  body.push(text({ x: W - 60, y: L.tagY + 42, content: `${String(page[0]).padStart(2, '0')} / ${page[1]}`, size: 30, weight: 700, fill: '#ffffffcc', anchor: 'end' }));

  // 正式名称（略称なし。総監は2行、他は1行）
  const lines = officialNameLines(exam);
  if (lines.length === 2) {
    body.push(text({ x: 60, y: L.nameY1, content: lines[0].text, size: lines[0].size, weight: 400, fill: '#ffffffdd' }));
    body.push(text({ x: 60, y: L.nameY2, content: lines[1].text, size: lines[1].size, weight: 700, fill: COLORS.white }));
  } else {
    body.push(text({ x: 60, y: L.nameSolo, content: lines[0].text, size: lines[0].size, weight: 700, fill: COLORS.white }));
  }

  // コンテンツ：年度を主役（大）、形式＋種別を従
  if (year) body.push(text({ x: 60, y: L.yearY, content: year, size: L.yearS, weight: 700, fill: COLORS.inkStrong }));
  if (fmtLabel) body.push(text({ x: 60, y: L.fmtY, content: fmtLabel, size: L.fmtS, weight: 700, fill: COLORS.inkBody }));

  // CTA ピル（全フォーマット共通寸法）
  body.push(rect({ x: 60, y: L.ctaY, w: 520, h: 96, rx: 48, fill: `${hue}1a`, stroke: hue, sw: 2 }));
  body.push(text({ x: 110, y: L.ctaY + 60, content: 'まずは1問やってみる →', size: 40, weight: 700, fill: hue }));

  // ブランド（全フォーマット共通寸法）
  body.push(rect({ x: 60, y: L.brandY, w: 40, h: 40, rx: 8, fill: hue }));
  body.push(text({ x: 116, y: L.brandY + 32, content: 'doboku-note.com', size: 36, weight: 700, fill: COLORS.inkStrong }));

  return svgDoc({ width: W, height: L.height, body: body.join('\n  ') });
}
