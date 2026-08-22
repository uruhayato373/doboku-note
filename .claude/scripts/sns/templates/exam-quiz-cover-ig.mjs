/**
 * exam-quiz-cover-ig.mjs — IG slide 1（論点クイズカード表紙）テンプレ。1級/2級土木 論点パック用。
 *
 * 競合 @miyabi_labo 分析（2026-07）: 1枚目に「科目 + 論点 + 頻出度 + 第1問Q」を出す表紙が
 * グリッド閲覧での訴求源。論点（頻出問題）括りパックの cover に使う。
 * 年度のみの exam-cover-ig.mjs（総監/リール等で継続使用）とは分離。
 *
 * レイアウト（carousel 1080×1350・グリッドのセーフゾーン中央1080² = y∈[135,1215]）:
 *   上帯（試験色）: 級ピル + 科目ピル + 頻出度★（右上）
 *   論点見出し   : 論点名（試験色・auto-fit 1〜2行）
 *   主役（白地）  : 「Q.」+ 第1問の設問文（大フォント・auto-fit）
 *   下部          : 出題年度の列挙 + スワイプ CTA + doboku-note ブランド
 *
 * 試験色は exam-palette.mjs（note-cover-tokens.json）＝ 試験=色相の2軸色設計に準拠。
 * miyabi の「科目=色相」方式はサイト色スキームと衝突するため採らず、科目はピル表示に留める。
 * 真実源: .claude/knowledge/reference/sns-image-policy.md §12 / .claude/knowledge/reference/ig-carousel-skill.md
 */
import { COLORS, rect, text } from '../lib/svg-base.mjs';
import { examColor } from '../lib/exam-palette.mjs';

const W = 1080;
const H = 1350;
const MX = 72;                 // 左右基準マージン
const USABLE = W - MX * 2;     // 936

/** 級ラベル短縮（civil-1 → 1級土木 / civil-2 → 2級土木）。examDir があればそれを優先 */
function gradeLabel({ exam, examDir }) {
  if (examDir) return examDir;
  if (exam === 'civil-1') return '1級土木';
  if (exam === 'civil-2') return '2級土木';
  return exam || '過去問';
}

/** テキストを幅に収まる font-size で折り返す（CJK=1em/字 近似）。sizeTable 降順で auto-fit */
function fitText(str, { sizeTable, maxLines, lineRatio = 1.5, availH = Infinity }) {
  const t = String(str || '').replace(/\s+/g, ' ').trim();
  for (const size of sizeTable) {
    const maxChars = Math.max(6, Math.floor(USABLE / size));
    const lines = wrap(t, maxChars);
    const lineH = Math.round(size * lineRatio);
    if (lines.length <= maxLines && lines.length * lineH <= availH) return { lines, size, lineH };
  }
  const size = sizeTable[sizeTable.length - 1];
  const maxChars = Math.max(6, Math.floor(USABLE / size));
  const lineH = Math.round(size * lineRatio);
  return { lines: wrap(t, maxChars).slice(0, maxLines), size, lineH };
}

/** 頻出度★（filled/empty）文字列。stars=1..3 */
function starStr(stars) {
  const n = Math.max(1, Math.min(3, stars || 1));
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}

const NO_BREAK_BEFORE = ['、', '。', '」', ')', '）', '・', '，', '．'];
function wrap(str, maxChars) {
  const chars = [...str];
  const lines = [];
  let cur = '';
  for (let i = 0; i < chars.length; i++) {
    cur += chars[i];
    if (cur.length >= maxChars) {
      const next = chars[i + 1];
      if (next && NO_BREAK_BEFORE.includes(next)) { cur += next; i++; }
      lines.push(cur); cur = '';
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

/**
 * 論点パック表紙。
 * @param exam        civil-1 | civil-2（色相・級ラベル）
 * @param examDir     級ラベル明示（省略時 exam から導出）
 * @param subject     科目（6管理テーマ名。例「安全管理」）— 科目ピル
 * @param topic       論点名（例「足場・墜落・高所作業」）— 論点見出し
 * @param stars       頻出度 1..3
 * @param question    第1問の設問文（Q ヒーロー）
 * @param yearsLabel  出題年度の列挙（例「令和7・5・3年度」）
 */
export function renderExamQuizCoverIg({ exam, examDir, subject = null, topic = null, stars = null, question, yearsLabel = null }) {
  const c = examColor(exam);
  const hue = c.base, deep = c.deep;
  const body = [];

  // 上帯（試験色）— グリッドで上端135pxはカットされるが帯は色のみなので可
  const BAND = 296;
  body.push(rect({ x: 0, y: 0, w: W, h: BAND, fill: hue }));

  // 級ピル（deep 背景・白文字）
  const grade = gradeLabel({ exam, examDir });
  const gradeW = [...grade].length * 40 + 60;
  const pillY = 168;
  body.push(rect({ x: MX, y: pillY, w: gradeW, h: 72, rx: 36, fill: deep }));
  body.push(text({ x: MX + gradeW / 2, y: pillY + 48, content: grade, size: 38, weight: 700, fill: COLORS.white, anchor: 'middle' }));

  // 科目ピル（半透明白背景 + 白文字）— 級ピルの右
  if (subject) {
    const subW = [...subject].length * 38 + 56;
    const subX = MX + gradeW + 20;
    body.push(rect({ x: subX, y: pillY, w: subW, h: 72, rx: 36, fill: '#ffffff2e', stroke: '#ffffffcc', sw: 2 }));
    body.push(text({ x: subX + subW / 2, y: pillY + 48, content: subject, size: 34, weight: 700, fill: COLORS.white, anchor: 'middle' }));
  }

  // 頻出度★（右上・帯内）
  if (stars) {
    body.push(text({ x: W - MX, y: pillY + 8, content: '頻出度', size: 24, weight: 700, fill: '#ffffffcc', anchor: 'end' }));
    body.push(text({ x: W - MX, y: pillY + 54, content: starStr(stars), size: 42, weight: 700, fill: COLORS.white, anchor: 'end' }));
  }

  // 論点見出し（帯下・試験色・auto-fit 1〜2行）。eyebrow「頻出論点」の下に十分な間隔
  const eyebrowY = 348;              // 「頻出論点」ベースライン（帯下）
  const topicTop = 432;             // 論点見出し1行目ベースライン（eyebrow と重ならない位置）
  let qMarkerY;
  if (topic) {
    const t = fitText(topic, { sizeTable: [54, 48, 42], maxLines: 2, lineRatio: 1.28 });
    body.push(text({ x: MX, y: eyebrowY, content: '頻出論点', size: 28, weight: 700, fill: hue }));
    t.lines.forEach((ln, i) => body.push(text({ x: MX, y: topicTop + i * t.lineH, content: ln, size: t.size, weight: 800, fill: hue })));
    qMarkerY = topicTop + (t.lines.length - 1) * t.lineH + 92;
  } else {
    qMarkerY = 400;
  }

  // 主役: 「Q.」マーカー + 第1問設問文（下に十分な間隔で重なり防止）
  const qTop = qMarkerY + 100;
  const availH = 1040 - qTop;         // 下部 出題年度/CTA を避ける
  const { lines, size, lineH } = fitText(question, { sizeTable: [56, 50, 44, 40, 36], maxLines: 7, availH });
  body.push(text({ x: MX, y: qMarkerY, content: 'Q.', size: 56, weight: 800, fill: hue }));
  lines.forEach((ln, i) => {
    body.push(text({ x: MX, y: qTop + i * lineH, content: ln, size, weight: 700, fill: COLORS.inkStrong }));
  });

  // 下部: 出題年度の列挙（従）
  if (yearsLabel) body.push(text({ x: MX, y: 1112, content: `出題  ${yearsLabel}`, size: 38, weight: 700, fill: COLORS.inkBody }));

  // スワイプ CTA ピル
  const ctaY = 1160;
  body.push(rect({ x: MX, y: ctaY, w: 520, h: 88, rx: 44, fill: `${hue}1a`, stroke: hue, sw: 2 }));
  body.push(text({ x: MX + 44, y: ctaY + 56, content: 'スワイプで4問チャレンジ →', size: 36, weight: 700, fill: hue }));

  // ブランド（グリッド外・開封時に表示）
  body.push(rect({ x: MX, y: 1288, w: 38, h: 38, rx: 8, fill: hue }));
  body.push(text({ x: MX + 54, y: 1318, content: 'doboku-note.com', size: 34, weight: 700, fill: COLORS.inkStrong }));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${rect({ x: 0, y: 0, w: W, h: H, fill: COLORS.white })}
${body.join('\n  ')}
</svg>`;
}
