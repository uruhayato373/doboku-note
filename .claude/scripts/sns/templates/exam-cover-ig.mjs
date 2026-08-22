/**
 * exam-cover-ig.mjs — IG slide 1（試験識別カバー）テンプレ。多フォーマット対応。
 *
 * 多資格展開の「試験識別レイヤー」を実装。
 *   - carousel: 1080×1350、セーフゾーン(中央1080²)対応
 *   - reels:    1080×1920（動画 1 枚目。bottom はキャプション域を避ける）
 *   - stories:  1080×1920（上下に IG Stories UI 域を確保）
 * 真実源: .claude/knowledge/reference/sns-image-policy.md §12 ／ docs/marketing/03_多資格SNS展開設計.md
 *
 * レイアウト思想（2026-06-02 洗練）:
 *   左マージン mx=96 を基準に、タグピルのみ左へ(tagX=72)・形式ラベルのみ右へ(fmtX=120)
 *   インデントして階層感を出す。名称2行は行間広め、年度を主役（大）に。
 *
 * 使い方:
 *   renderExamCoverIg({ exam:'技術士総監', tag:'過去問', year:'令和7年度', fmtLabel:'択一式 過去問', page:[1,10] })
 *   renderExamCoverIg({ ...同上, format:'reels' })   // 1080×1920
 *   renderExamCoverIg({ ...同上, format:'stories' }) // 1080×1920・UI 域確保
 */
import { COLORS, esc, rect, text, svgDoc } from '../lib/svg-base.mjs';
import { examColor, officialNameLines } from '../lib/exam-palette.mjs';
import { SNS_CONFIG } from '../../lib/sns-common/sns-config.mjs';

const W = 1080;

// フォーマット別レイアウト。mx=左基準マージン、tagX=タグピル左、fmtX=形式ラベル左。
// CTA ピル(w520/h96, text x+50, dy60)とブランド(rect w40/h40, text x+56, dy32)は共通。
const LAYOUTS = {
  // carousel 1080×1350（採用案 C3）
  carousel: { height: 1350, mx: 96, tagX: 72, fmtX: 120, band: 440, tagY: 172, nameY1: 312, nameY2: 404, nameSolo: 380, yearY: 664, yearS: 150, fmtY: 776, fmtS: 56, ctaY: 936, brandY: 1132 },
  // reels 1080×1920。動画 1 枚目。下部 ~250px はキャプション域として空ける
  reels:    { height: 1920, mx: 96, tagX: 72, fmtX: 120, band: 600, tagY: 210, nameY1: 382, nameY2: 474, nameSolo: 450, yearY: 1000, yearS: 160, fmtY: 1112, fmtS: 60, ctaY: 1290, brandY: 1630 },
  // stories 1080×1920。上 ~300px / 下 ~350px は IG Stories UI 域として空ける
  stories:  { height: 1920, mx: 96, tagX: 72, fmtX: 120, band: 640, tagY: 320, nameY1: 482, nameY2: 574, nameSolo: 550, yearY: 1030, yearS: 150, fmtY: 1142, fmtS: 56, ctaY: 1310, brandY: 1530 },
};

export function renderExamCoverIg({ exam, tag = '過去問', year, fmtLabel, page = [1, 10], tone, format = 'carousel', hidePage = false, showCta = true, topic = null, management = null }) {
  const L = LAYOUTS[format] || LAYOUTS.carousel;
  const c = examColor(exam, tone);
  const hue = c.use, deep = c.deep;
  // 5管理パック: 管理分野を主役に、管理別色で帯を色分け（年度は従に降格）。
  // 管理色は淡色のため、帯上テキスト（試験名・ページ番号）は暗色へ切替えて可読性を確保する。
  const mgmt = management && SNS_CONFIG.managementMap[management] ? SNS_CONFIG.managementMap[management] : null;
  const bandFill = mgmt ? mgmt.color : hue;
  const onBand = mgmt ? COLORS.inkStrong : COLORS.white;      // 帯上 主テキスト
  const onBandSub = mgmt ? '#00000099' : '#ffffffdd';         // 帯上 副テキスト
  const pageFill = mgmt ? '#00000088' : '#ffffffcc';
  const displayTag = mgmt ? mgmt.label : tag;
  const body = [];

  // 上部 帯（5管理は管理別色 / それ以外は試験色。グリッドでカットされてよい＝色のみ）
  body.push(rect({ x: 0, y: 0, w: W, h: L.band, fill: bandFill }));

  // タグピル（左インデント tagX）＋ページ番号（右マージン mx 対称）
  const tagW = [...displayTag].length * 38 + 56;
  body.push(rect({ x: L.tagX, y: L.tagY, w: tagW, h: 64, rx: 32, fill: deep }));
  body.push(text({ x: L.tagX + tagW / 2, y: L.tagY + 42, content: displayTag, size: 30, weight: 700, fill: COLORS.white, anchor: 'middle' }));
  // YT（単発動画）は「N / 10」ページ番号を出さない（IG カルーセル/リール専用チャーム）。
  if (!hidePage) {
    body.push(text({ x: W - L.mx, y: L.tagY + 42, content: `${String(page[0]).padStart(2, '0')} / ${page[1]}`, size: 30, weight: 700, fill: pageFill, anchor: 'end' }));
  }

  // 正式名称（略称なし。総監は2行、他は1行）
  const lines = officialNameLines(exam);
  if (lines.length === 2) {
    body.push(text({ x: L.mx, y: L.nameY1, content: lines[0].text, size: lines[0].size, weight: 400, fill: onBandSub }));
    body.push(text({ x: L.mx, y: L.nameY2, content: lines[1].text, size: lines[1].size, weight: 700, fill: onBand }));
  } else {
    body.push(text({ x: L.mx, y: L.nameSolo, content: lines[0].text, size: lines[0].size, weight: 700, fill: onBand }));
  }

  // コンテンツ：5管理は「管理分野」を主役（大）に、年度＋形式を従に降格。
  //            それ以外（土木等）は従来どおり年度を主役に。
  if (mgmt) {
    const headSize = [...mgmt.label].length >= 6 ? Math.round(L.yearS * 0.84) : L.yearS;
    body.push(text({ x: L.mx, y: L.yearY, content: mgmt.label, size: headSize, weight: 700, fill: COLORS.inkStrong }));
    const sub = [year, fmtLabel].filter(Boolean).join('　');
    if (sub) body.push(text({ x: L.fmtX, y: L.fmtY, content: sub, size: L.fmtS, weight: 700, fill: COLORS.inkBody }));
  } else {
    if (year) body.push(text({ x: L.mx, y: L.yearY, content: year, size: L.yearS, weight: 700, fill: COLORS.inkStrong }));
    if (fmtLabel) body.push(text({ x: L.fmtX, y: L.fmtY, content: fmtLabel, size: L.fmtS, weight: 700, fill: COLORS.inkBody }));
  }

  // CTA ピル（IG はスワイプ誘導）。YT は単発動画でスワイプ概念がないため出さず、代わりにこの動画の論点を主役表示する。
  if (showCta) {
    body.push(rect({ x: L.mx, y: L.ctaY, w: 520, h: 96, rx: 48, fill: `${hue}1a`, stroke: hue, sw: 2 }));
    body.push(text({ x: L.mx + 50, y: L.ctaY + 60, content: 'まずは1問やってみる →', size: 40, weight: 700, fill: hue }));
  } else if (topic) {
    const tSize = [...topic].length > 13 ? 44 : 52;
    body.push(text({ x: L.mx, y: L.ctaY + 16, content: 'この動画の論点', size: 30, weight: 700, fill: hue }));
    body.push(text({ x: L.mx, y: L.ctaY + 84, content: topic, size: tSize, weight: 700, fill: COLORS.inkStrong }));
  }

  // ブランド（全フォーマット共通寸法）
  body.push(rect({ x: L.mx, y: L.brandY, w: 40, h: 40, rx: 8, fill: hue }));
  body.push(text({ x: L.mx + 56, y: L.brandY + 32, content: 'doboku-note.com', size: 36, weight: 700, fill: COLORS.inkStrong }));

  return svgDoc({ width: W, height: L.height, body: body.join('\n  ') });
}
