/**
 * SVG 品質問題検出（共有モジュール）
 *
 * 検出する問題:
 *   P1: テキストが viewBox からはみ出している（クリップリスク）
 *   P2: テキスト同士が重なっている（bounding box 衝突）
 *   P3: ルート <svg> に必須属性（role="img" / aria-label / style max-width）が欠落
 *   P4: フォントサイズが 11px 未満（モバイル視認性下限）
 *   P5: viewBox 幅が 400px 超過（create-svg 原則違反）
 *   P6: svg-tokens.json の colorsAllowList 外の hex 使用（色ドリフト）
 *   P7: font-family が未指定（ブラウザデフォルト serif に落ちる）
 *   P8: 濃色 fill + 内部に白/薄色テキスト（design-system.md §8 違反）
 *   P9: テキストが shape（circle / rect コンテナ）と衝突
 *       P9-text-shape-overlap: start-anchor テキストが circle bbox と重なる
 *       P9-text-rect-overflow: テキストが最内 enclosing rect の右端・下端を超える
 *   P10: marker 内 polygon が固定方向（▲▼）で orient="auto" と組み合わさっている
 *        orient="auto" が線方向に回転するため、▲▼固定 polygon は意図しない方向になる
 *        正しくは右向き三角形（▶）で定義し、orient="auto" に回転を任せる
 *   P11: 概念名タイトル（最上部中央の大見出し）＝図内タイトル禁止（figure-canvas-policy §2.4）
 *   P12: 試験ポイント/引っかけ 注記（受験対策テキスト）＝概念図に入れない（content-principles §5。
 *        HIGH＝pre-commit ブロック。試験原図は audit.mjs が h*-primary を除外）
 *   P13: <foreignObject> 使用（SVG→PNG 変換で描画されない非互換要素）＝HIGH
 *   P14: @font-face / 外部 URL href 参照（ビルド時に解決されず表示崩れ）＝HIGH。xmlns 名前空間は除外
 *   P15: viewBox 欠落（レスポンシブ縮尺・幾何監査が不能）＝MEDIUM
 *
 * 制限事項:
 *   - 正規表現ベースのため、ネストされた <tspan> や transform 付き <text> は
 *     座標計算が不正確になる
 *   - 日本語文字幅は 1.1em、ラテン/数字は 0.60em で近似（実ブラウザの
 *     フォントメトリクスと完全一致しない。1.0/0.55 は過小評価で P1 見逃しが発生）
 *   - transform="translate(x,y)" 内の子 <text> は親の translate を考慮する
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// svg-tokens.json の colorsAllowList をロード（P6 用）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TOKENS_PATH = resolve(__dirname, "../../../../../../../.claude/knowledge/design-system/svg-tokens.json");
let SVG_TOKENS = null;
try {
  SVG_TOKENS = JSON.parse(readFileSync(TOKENS_PATH, "utf-8"));
} catch (e) {
  console.warn(`[svg-audit] Failed to load svg-tokens.json at ${TOKENS_PATH}: ${e.message}. P6 will report all colors as out-of-allowlist.`);
  SVG_TOKENS = { colorsAllowList: [] };
}
const ALLOWED_COLORS = new Set(
  (SVG_TOKENS.colorsAllowList || []).map((c) => c.toLowerCase())
);

/** 日本語（CJK）文字かどうか判定 */
function isCjk(code) {
  return (code >= 0x3000 && code <= 0x9fff) || (code >= 0xff00 && code <= 0xffef);
}

/** テキストの描画幅を近似（px） */
export function estimateTextWidth(text, fontSize) {
  let width = 0;
  for (const c of text) {
    const code = c.codePointAt(0);
    width += (isCjk(code) ? 1.1 : 0.6) * fontSize;
  }
  return width;
}

/** <style>...</style> から class ベースの CSS ルールを抽出 */
function parseStyleBlock(content) {
  const rules = {};
  const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
  if (!styleMatch) return rules;
  const css = styleMatch[1];
  const ruleRe = /\.([\w-]+)\s*\{([^}]+)\}/g;
  let m;
  while ((m = ruleRe.exec(css))) {
    const name = m[1];
    const body = m[2];
    const fontSize = body.match(/font-size:\s*([\d.]+)px/)?.[1];
    const textAnchor = body.match(/text-anchor:\s*(\w+)/)?.[1];
    rules[name] = {
      fontSize: fontSize ? parseFloat(fontSize) : null,
      textAnchor: textAnchor || null,
    };
  }
  return rules;
}

/** transform="translate(x,y)" をパースして {x, y} を返す */
function parseTranslate(transformAttr) {
  if (!transformAttr) return { x: 0, y: 0 };
  const m = transformAttr.match(/translate\s*\(\s*([\d.-]+)\s*,?\s*([\d.-]+)?\s*\)/);
  if (!m) return { x: 0, y: 0 };
  return { x: parseFloat(m[1]), y: parseFloat(m[2] || 0) };
}

/** SVG ファイルをパースして構造化オブジェクトを返す */
export function parseSvg(content) {
  // viewBox
  const vbMatch = content.match(/viewBox="([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)"/);
  const viewBox = vbMatch
    ? {
        x: parseFloat(vbMatch[1]),
        y: parseFloat(vbMatch[2]),
        w: parseFloat(vbMatch[3]),
        h: parseFloat(vbMatch[4]),
      }
    : null;

  // ルート属性
  const svgTag = content.match(/<svg[\s\S]*?>/)?.[0] || "";
  const hasRole = /\brole="img"/.test(svgTag);
  const ariaLabel = svgTag.match(/aria-label="([^"]+)"/)?.[1];
  const rootStyle = svgTag.match(/style="([^"]+)"/)?.[1];
  const hasMaxWidth =
    rootStyle &&
    /max-width:\s*\d+/.test(rootStyle) &&
    /width:\s*100%/.test(rootStyle);

  // <style> の CSS ルール
  const cssRules = parseStyleBlock(content);

  // <g> の transform / font-size / text-anchor をスタックで継承
  const tokenRe = /<g\b([^>]*)>|<\/g>|<text\b([^>]*)>([^<]*)<\/text>/g;
  const texts = [];
  // スタック要素: { x, y, fontSize, textAnchor }
  const stack = [{ x: 0, y: 0, fontSize: null, textAnchor: null }];
  let m;
  while ((m = tokenRe.exec(content))) {
    const [raw, gAttrs, textAttrs, textBody] = m;
    if (raw === "</g>") {
      if (stack.length > 1) stack.pop();
      continue;
    }
    if (raw.startsWith("<g")) {
      const trAttr = gAttrs?.match(/transform="([^"]+)"/)?.[1];
      const tr = parseTranslate(trAttr);
      const top = stack[stack.length - 1];
      const gFontSize = parseFloat(gAttrs?.match(/font-size="([\d.]+)(?:px)?"/)?.[1] || 0) || null;
      const gAnchor = gAttrs?.match(/text-anchor="(\w+)"/)?.[1] || null;
      const gClass = gAttrs?.match(/class="([\w\s-]+)"/)?.[1];
      let classFontSize = null;
      let classAnchor = null;
      if (gClass) {
        for (const cls of gClass.split(/\s+/)) {
          const rule = cssRules[cls];
          if (!rule) continue;
          if (!classFontSize && rule.fontSize) classFontSize = rule.fontSize;
          if (!classAnchor && rule.textAnchor) classAnchor = rule.textAnchor;
        }
      }
      stack.push({
        x: top.x + tr.x,
        y: top.y + tr.y,
        fontSize: gFontSize || classFontSize || top.fontSize,
        textAnchor: gAnchor || classAnchor || top.textAnchor,
      });
      continue;
    }
    // <text>
    const textContent = (textBody || "").trim();
    if (!textContent) continue;

    const trAttr = textAttrs?.match(/transform="([^"]+)"/)?.[1];
    const ownTr = parseTranslate(trAttr);
    const isRotated = trAttr ? /\brotate\s*\(/.test(trAttr) : false;
    const parent = stack[stack.length - 1];

    const xRaw = parseFloat(textAttrs?.match(/\bx="([\d.-]+)"/)?.[1] || 0);
    const yRaw = parseFloat(textAttrs?.match(/\by="([\d.-]+)"/)?.[1] || 0);

    const x = xRaw + parent.x + ownTr.x;
    const y = yRaw + parent.y + ownTr.y;

    const fontSizeAttr = parseFloat(
      textAttrs?.match(/font-size="([\d.]+)(?:px)?"/)?.[1] || 0
    ) || null;
    const textAnchorAttr = textAttrs?.match(/text-anchor="(\w+)"/)?.[1];
    const classAttr = textAttrs?.match(/class="([\w\s-]+)"/)?.[1];

    let fontSize = fontSizeAttr;
    let textAnchor = textAnchorAttr || null;
    if (classAttr) {
      for (const cls of classAttr.split(/\s+/)) {
        const rule = cssRules[cls];
        if (!rule) continue;
        if (!fontSize && rule.fontSize) fontSize = rule.fontSize;
        if (!textAnchor && rule.textAnchor) textAnchor = rule.textAnchor;
      }
    }
    // 親 <g> からの継承
    if (!fontSize) fontSize = parent.fontSize;
    if (!textAnchor) textAnchor = parent.textAnchor;
    // デフォルト
    if (!fontSize) fontSize = 12;
    if (!textAnchor) textAnchor = "start";

    texts.push({ x, y, fontSize, textAnchor, text: textContent, isRotated });
  }

  // <rect> 要素収集（g transform は非考慮。translate 内の rect は近似値になる）
  const rects = [];
  const rectRe = /<rect\b([^/>]*(?:\/(?!>)[^/>]*)*)(?:\/?>)/g;
  let rm;
  while ((rm = rectRe.exec(content))) {
    const a = rm[1];
    const rx = parseFloat(a.match(/\bx="([\d.-]+)"/)?.[1] ?? 0);
    const ry = parseFloat(a.match(/\by="([\d.-]+)"/)?.[1] ?? 0);
    const rw = parseFloat(a.match(/\bwidth="([\d.-]+)"/)?.[1] ?? 0);
    const rh = parseFloat(a.match(/\bheight="([\d.-]+)"/)?.[1] ?? 0);
    if (rw > 0 && rh > 0) rects.push({ x: rx, y: ry, w: rw, h: rh, area: rw * rh });
  }

  // <circle> 要素収集
  const circles = [];
  const circleRe = /<circle\b([^/>]*(?:\/(?!>)[^/>]*)*)(?:\/?>)/g;
  let cm;
  while ((cm = circleRe.exec(content))) {
    const a = cm[1];
    const cx = parseFloat(a.match(/\bcx="([\d.-]+)"/)?.[1] ?? 0);
    const cy = parseFloat(a.match(/\bcy="([\d.-]+)"/)?.[1] ?? 0);
    const r  = parseFloat(a.match(/\br="([\d.-]+)"/)?.[1] ?? 0);
    if (r > 0) circles.push({ cx, cy, r });
  }

  return { viewBox, hasRole, ariaLabel, hasMaxWidth, texts, rects, circles };
}

/** テキストの描画 bbox を計算 */
function textBBox(t) {
  const width = estimateTextWidth(t.text, t.fontSize);
  let x;
  if (t.textAnchor === "end") x = t.x - width;
  else if (t.textAnchor === "middle") x = t.x - width / 2;
  else x = t.x;
  // SVG の y は baseline。グリフは上 ~0.85em、下 ~0.15em に広がる
  const y = t.y - t.fontSize * 0.85;
  return { x, y, width, height: t.fontSize, text: t.text };
}

/** 2 つの bbox が重なっているか（3px 未満の接触は許容）*/
function bboxesOverlap(a, b) {
  const SLACK = 3; // 縦積みラベルの glyph descender 重なりを false positive としない
  const xOverlap = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const yOverlap = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return xOverlap > SLACK && yOverlap > SLACK;
}

/** SVG から問題を検出 */
export function detectSvgIssues(svg, opts = {}) {
  const findings = [];
  // landscape 変種（figure-N--wide.svg）は viewBox 幅 640 が正（YouTube 用・記事非埋込）。
  // 厳密な寸法一致は check-figure-canvas.mjs が担保するため、ここでは P5 を免除する。
  const isWideVariant = opts.isWideVariant === true;

  // P3: ルート必須属性
  if (!svg.hasRole) {
    findings.push({ pattern: "P3-missing-role", severity: "MEDIUM", detail: 'role="img" が未設定' });
  }
  if (!svg.ariaLabel) {
    findings.push({ pattern: "P3-missing-aria", severity: "MEDIUM", detail: "aria-label が未設定" });
  }
  if (!svg.hasMaxWidth) {
    findings.push({
      pattern: "P3-missing-maxwidth",
      severity: "HIGH",
      detail: 'style="max-width:{viewBox width}px;width:100%" が未設定（PC で拡大表示されるリスク）',
    });
  }

  // P5: viewBox 幅
  if (!isWideVariant && svg.viewBox && svg.viewBox.w > 400) {
    findings.push({
      pattern: "P5-wide-viewbox",
      severity: "MEDIUM",
      detail: `viewBox 幅 ${svg.viewBox.w}px > 400px（モバイル視認性）`,
    });
  }

  // P15: viewBox 欠落。レスポンシブ表示不能・以降の幾何チェックも不能なので記録して早期 return。
  if (!svg.viewBox) {
    findings.push({
      pattern: "P15-missing-viewbox",
      severity: "MEDIUM",
      detail: "viewBox 属性が無い（width/height 依存の固定表示になりレスポンシブ縮尺・幾何監査が不能）",
    });
    return findings;
  }

  // P1: テキスト clip, P4: font-size
  const bboxes = svg.texts.map(textBBox);
  for (let i = 0; i < bboxes.length; i++) {
    const bb = bboxes[i];
    const t = svg.texts[i];
    // 回転テキスト（軸ラベル等）は bbox 計算が rotation を考慮しないため P1 をスキップ
    if (!t.isRotated && (bb.x < -2 || bb.x + bb.width > svg.viewBox.w)) {
      findings.push({
        pattern: "P1-text-clip",
        severity: "HIGH",
        text: t.text.slice(0, 40),
        detail: `「${t.text.slice(0, 20)}」が viewBox 外（bbox x=${bb.x.toFixed(
          0
        )}〜${(bb.x + bb.width).toFixed(0)}, viewBox 幅 ${svg.viewBox.w}, anchor=${t.textAnchor}）`,
      });
    }
    if (t.fontSize < 11) {
      findings.push({
        pattern: "P4-tiny-font",
        severity: "LOW",
        text: t.text.slice(0, 40),
        detail: `font-size ${t.fontSize}px < 11px（モバイル視認性下限）`,
      });
    }
  }

  // P2: テキスト同士の重なり
  for (let i = 0; i < bboxes.length; i++) {
    for (let j = i + 1; j < bboxes.length; j++) {
      if (bboxesOverlap(bboxes[i], bboxes[j])) {
        findings.push({
          pattern: "P2-text-overlap",
          severity: "MEDIUM",
          detail: `「${svg.texts[i].text.slice(0, 15)}」と「${svg.texts[j].text.slice(
            0,
            15
          )}」の bbox が重複`,
        });
      }
    }
  }

  // P9a: start-anchor テキストが <circle> bbox と重なる（middle = 意図的ラベルとして除外）
  const SHAPE_SLACK = 2;
  for (const t of svg.texts) {
    if (t.textAnchor !== "start") continue;
    const bb = textBBox(t);
    for (const c of svg.circles || []) {
      const xOv = Math.min(bb.x + bb.width, c.cx + c.r) - Math.max(bb.x, c.cx - c.r);
      const yOv = Math.min(bb.y + bb.height, c.cy + c.r) - Math.max(bb.y, c.cy - c.r);
      if (xOv > SHAPE_SLACK && yOv > SHAPE_SLACK) {
        findings.push({
          pattern: "P9-text-shape-overlap",
          severity: "MEDIUM",
          detail: `「${t.text.slice(0, 15)}」が circle(cx=${c.cx},cy=${c.cy},r=${c.r}) と重複`,
        });
      }
    }
  }

  // P9b: テキストが最内 enclosing <rect> の右端・下端を超える
  const RECT_H_SLACK = 5; // 横方向（フォント幅推定誤差・描画差を吸収）
  const RECT_V_SLACK = 1; // 縦方向（descender 微超過を除外）
  for (const t of svg.texts) {
    const bb = textBBox(t);
    // t.x = text 要素のアンカー点（start=左端 / middle=中心 / end=右端）を使って
    // 最も小さい enclosing rect を探す。bb.x（左端）を使うと middle-anchor テキストが
    // 細い隣接 rect に誤マッチするため t.x を基準とする。
    const enclosing = (svg.rects || [])
      .filter(
        (r) =>
          r.w >= 40 &&                   // 幅 40px 未満の小マーカー rect は対象外
          r.h >= 10 &&
          r.x - 1 <= t.x &&             // アンカー点が rect の内側
          r.x + r.w + 1 >= t.x &&
          r.y <= t.y + 1 &&
          r.y + r.h >= t.y - t.fontSize * 0.85 - 1
      )
      .sort((a, b) => a.area - b.area);
    if (enclosing.length === 0) continue;
    const box = enclosing[0];
    // 右端超過
    if (bb.x + bb.width > box.x + box.w + RECT_H_SLACK) {
      findings.push({
        pattern: "P9-text-rect-overflow",
        severity: "MEDIUM",
        detail: `「${t.text.slice(0, 15)}」が rect(x=${box.x},w=${box.w}) 右端 x=${
          box.x + box.w
        } を超過（bbox 右端 x=${Math.round(bb.x + bb.width)}）`,
      });
    }
    // 下端超過
    const textBottom = t.y + t.fontSize * 0.15;
    if (textBottom > box.y + box.h + RECT_V_SLACK) {
      findings.push({
        pattern: "P9-text-rect-overflow",
        severity: "LOW",
        detail: `「${t.text.slice(0, 15)}」が rect(y=${box.y},h=${box.h}) 下端 y=${
          box.y + box.h
        } を超過（text 下端 y=${textBottom.toFixed(1)}）`,
      });
    }
  }

  // P11: 概念名タイトル禁止（figure-canvas-policy §2.4）
  // 最上部・中央・大見出し（font>=14）の text は「概念名タイトル」の疑い。
  // SNS は render-figure-sns が概念名をヘッダーに出すため図内タイトルと二重化し、
  // 記事は見出しが概念名を担う。軸名・区分ラベル（小さめ font<14 や非中央）は対象外。
  {
    const cx = svg.viewBox.w / 2;
    for (const t of svg.texts) {
      if (
        t.y <= 26 &&
        t.fontSize >= 14 &&
        t.textAnchor === "middle" &&
        Math.abs(t.x - cx) <= svg.viewBox.w * 0.12 &&
        t.text.trim().length >= 4
      ) {
        findings.push({
          pattern: "P11-concept-title",
          severity: "MEDIUM",
          text: t.text.slice(0, 30),
          detail: `最上部中央の大見出し「${t.text.slice(
            0,
            20
          )}」は概念名タイトルの疑い（figure-canvas-policy §2.4：図内タイトル禁止。SNS ヘッダーと二重化）。除去し凡例・サマリー等の実体で余白を埋めよ`,
        });
        break; // 1 図 1 件で十分
      }
    }
  }

  // P12: 試験ポイント/引っかけ 注記の禁止（content-principles §5 / figure-canvas-policy §2.5 #5）
  // figure-*.svg（概念図）は概念伝達に専念し、「試験ポイント」「引っかけ」等の受験対策注記
  // バー・ボックスを入れない（それは解説 <details> の役割）。試験原図は audit.mjs が
  // h*-primary を除外済みのため対象外。severity=HIGH＝pre-commit ブロック（既存違反3図
  // trademark/design/sexual-harassment の注記は本文へ既出のため 2026-06-28 に図から除去済み）。
  {
    const EXAM_HINT_RE = /試験ポイント|出題ポイント|引っかけ|ひっかけ/;
    for (const t of svg.texts) {
      if (EXAM_HINT_RE.test(t.text)) {
        findings.push({
          pattern: "P12-exam-hint",
          severity: "HIGH",
          text: t.text.slice(0, 30),
          detail: `図内に受験対策注記「${t.text.slice(
            0,
            20
          )}」を検出。figure-*.svg は概念伝達に専念し試験ポイント/引っかけを入れない（content-principles §5・figure-canvas-policy §2.5 #5）。注記は解説 <details> 内へ移し図からは除去せよ`,
        });
        break; // 1 図 1 件で十分
      }
    }
  }

  return findings;
}

/** hex 文字列を正規化（短縮 #fff → #ffffff、小文字統一） */
function normalizeHex(hex) {
  if (!hex) return null;
  let h = hex.toLowerCase().trim();
  if (!h.startsWith("#")) return h; // 名前色 or "none" 等
  if (h.length === 4) {
    // #abc → #aabbcc
    h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  return h;
}

/** hex の輝度（0-1）を計算。P8 の濃色判定に使う */
function luminance(hex) {
  if (!hex || !hex.startsWith("#") || hex.length !== 7) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  // 近似（sRGB の相対輝度）
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * colorsAllowList に含まれるか判定。
 * svg-tokens.json の allowlist は短縮形（#fff）と正式形（#ffffff）の両方を含むため、
 * 両方を試す。
 */
function isAllowedColor(raw) {
  if (!raw) return true; // 未指定は検出対象外
  const lower = raw.toLowerCase().trim();
  if (ALLOWED_COLORS.has(lower)) return true;
  const norm = normalizeHex(raw);
  if (norm && ALLOWED_COLORS.has(norm)) return true;
  // 短縮形 #fff を #ffffff に展開した上で再照合
  return false;
}

/**
 * 追加検出ルール: P6 (color drift), P7 (missing font), P8 (dark bg + light text)
 * 正規表現ベースで SVG 全文を走査。
 */
function detectColorAndFontIssues(content) {
  const findings = [];

  // P7: font-family 未指定
  // <svg> ルート or <style> 内 or どこかに font-family 指定があるかを広く検出
  const hasFontFamily = /font-family\s*[:=]/.test(content);
  if (!hasFontFamily) {
    findings.push({
      pattern: "P7-missing-font-family",
      severity: "MEDIUM",
      detail: "font-family が未指定（ブラウザデフォルト serif に落ちて本文と不整合）",
    });
  }

  // P6: 使用中の hex 色を全抽出し、allowlist 外を報告
  // fill / stroke 属性、style 属性、<style> 内の fill:/stroke:/color: 値
  const colorRe = /(?:fill|stroke|color)\s*[:=]\s*"?(#[0-9a-fA-F]{3,6}|[a-zA-Z]+)"?/g;
  const seenOutliers = new Set();
  let m;
  while ((m = colorRe.exec(content)) !== null) {
    const raw = m[1];
    // url(...) 参照や CSS 変数は除外
    if (!raw || raw === "none" || raw.startsWith("url(") || raw.startsWith("var(")) continue;
    if (!isAllowedColor(raw)) {
      const key = raw.toLowerCase();
      if (seenOutliers.has(key)) continue;
      seenOutliers.add(key);
      findings.push({
        pattern: "P6-color-drift",
        severity: "MEDIUM",
        detail: `allowlist 外の色: ${raw}（svg-tokens.json の colorsAllowList 参照）`,
      });
    }
  }

  // P8: 濃色 fill + 白/薄色テキストの組合せ（design-system.md §8 違反）
  // <rect ... fill="#444">（輝度 < 0.3）+ 同 SVG 内に <text ... fill="white|#fff|#xxxx" 輝度 > 0.8>
  const darkRects = [];
  const rectRe = /<rect[^>]*fill\s*=\s*"([^"]+)"[^>]*>/g;
  while ((m = rectRe.exec(content)) !== null) {
    const raw = normalizeHex(m[1]);
    const lum = luminance(raw);
    if (lum !== null && lum < 0.3) darkRects.push({ fill: raw, lum });
  }
  if (darkRects.length > 0) {
    // 白/薄色テキストの存在
    const lightTextRe = /<text[^>]*fill\s*=\s*"([^"]+)"/g;
    const lightTextColors = [];
    while ((m = lightTextRe.exec(content)) !== null) {
      const raw = normalizeHex(m[1]);
      if (raw === "white" || raw === "#ffffff") {
        lightTextColors.push(raw);
        continue;
      }
      const lum = luminance(raw);
      if (lum !== null && lum > 0.8) lightTextColors.push(raw);
    }
    if (lightTextColors.length > 0) {
      findings.push({
        pattern: "P8-dark-bg",
        severity: "HIGH",
        detail: `濃色 bg (例: ${darkRects[0].fill}) + 白/薄色テキスト (例: ${lightTextColors[0]}) の組合せを検出。design-system.md §8 違反、淡色 bg + 濃色文字に修正せよ`,
      });
    }
  }

  return findings;
}

/**
 * P10: marker 内 polygon の方向バグ検出
 * orient="auto" と固定方向 polygon（▲▼）の組み合わせを検出する。
 * ▲▼ polygon の特徴: 第1点と第3点が同じ x 座標 or 同じ y 座標の "天底/天頂" 配置。
 * 正しい ▶ 右向き: 第1点=(0,0), 第2点=(W,H/2), 第3点=(0,H) → 第1・第3点は同じ x=0
 *
 * 判定ロジック:
 *   - points の第2頂点（tip）が W/2 の x 座標（中央）なら ▲▼ 固定形（WRONG）
 *   - points の第2頂点（tip）が W 付近の x 座標（右端）なら ▶ 正形（OK）
 */
function detectMarkerDirectionIssues(content) {
  const findings = [];
  // <marker ...orient="auto"...> ... <polygon points="..." .../> ... </marker> を抽出
  const markerRe = /<marker\b([^>]*)>([\s\S]*?)<\/marker>/g;
  let m;
  while ((m = markerRe.exec(content)) !== null) {
    const attrs = m[1];
    const inner = m[2];
    // orient="auto" のみ対象（orient 未指定も auto 相当だが明示分だけチェック）
    if (!/orient\s*=\s*["']auto["']/.test(attrs)) continue;
    // polygon を取得
    const polyM = inner.match(/<polygon\b[^>]*points\s*=\s*["']([^"']+)["']/);
    if (!polyM) continue;
    const pts = polyM[1].trim().split(/[\s,]+/).map(Number);
    if (pts.length < 6) continue; // 3点未満はスキップ
    // 3点の座標: (x0,y0) (x1,y1) (x2,y2)
    const [x0, y0, x1, y1, x2, y2] = pts;
    // markerWidth を取得（tip x の判定基準）
    const wM = attrs.match(/markerWidth\s*=\s*["']([\d.]+)["']/);
    const W = wM ? parseFloat(wM[1]) : 10;
    // ▲ 判定: 第1・第3点が同じ y（水平底辺）、第2点が x≈W/2（頂点）
    const isTriUp = Math.abs(y0 - y2) < 1 && Math.abs(x1 - W / 2) < W * 0.25;
    // ▼ 判定: 第1・第2点が同じ y（水平上辺）、第3点が x≈W/2（頂点）
    const isTriDown = Math.abs(y0 - y1) < 1 && Math.abs(x2 - W / 2) < W * 0.25;
    if (isTriUp || isTriDown) {
      const idM = attrs.match(/\bid\s*=\s*["']([^"']+)["']/);
      const id = idM ? idM[1] : "(無名)";
      findings.push({
        pattern: "P10-marker-direction",
        severity: "HIGH",
        detail: `marker id="${id}": ▲▼固定polygon(points="${polyM[1]}")とorient="auto"の組合せ。右向き▶に修正: points="0,0 ${W},${W * 0.4} 0,${W * 0.8}" refX="${W}" refY="${W * 0.4}"`,
      });
    }
  }
  return findings;
}

/**
 * P13/P14: SVG→PNG 変換・ビルドで壊れる構造を content 全文走査で検出する。
 *   P13 foreignObject: resvg 等のラスタライザで描画されない（HTML を SVG に埋める非互換要素）。
 *   P14 外部フォント/外部参照: @font-face や http(s) href はビルド時に解決されず表示が崩れる。
 *     xmlns 名前空間宣言（xmlns=... で href ではない）は対象外。
 */
export function detectStructuralIssues(content) {
  const findings = [];
  if (/<foreignObject\b/.test(content)) {
    findings.push({
      pattern: "P13-foreign-object",
      severity: "HIGH",
      detail: "<foreignObject> は SVG→PNG 変換で描画されない。純粋な SVG 要素（text/rect 等）へ置換すること",
    });
  }
  if (/@font-face/.test(content)) {
    findings.push({
      pattern: "P14-external-font",
      severity: "HIGH",
      detail: "@font-face の外部フォント読込はビルド時に解決されない。svg-tokens 準拠の system/serif 指定にすること",
    });
  }
  const extHrefRe = /(?:xlink:)?href\s*=\s*["']https?:\/\/[^"']+["']/g;
  let m;
  while ((m = extHrefRe.exec(content)) !== null) {
    findings.push({
      pattern: "P14-external-ref",
      severity: "HIGH",
      detail: `外部 URL 参照 ${m[0].slice(0, 60)} はビルド時に解決されない。アセットを inline 化すること`,
    });
  }
  return findings;
}

/** ファイルパスから監査結果を取得する便利関数 */
export function auditSvgFile(path) {
  const content = readFileSync(path, "utf-8");
  const svg = parseSvg(content);
  const findings = detectSvgIssues(svg, { isWideVariant: /--wide\.svg$/.test(path) });
  // P6/P7/P8 は content 全文を直接走査（parseSvg の対象外）
  findings.push(...detectColorAndFontIssues(content));
  // P10: marker 方向バグ
  findings.push(...detectMarkerDirectionIssues(content));
  // P13/P14: 構造互換性
  findings.push(...detectStructuralIssues(content));
  return findings;
}
