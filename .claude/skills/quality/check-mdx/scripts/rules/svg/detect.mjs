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
 *   P8: 濃色 fill + 内部に白/薄色テキスト（prohibited.md 違反）
 *
 * 制限事項:
 *   - 正規表現ベースのため、ネストされた <tspan> や transform 付き <text> は
 *     座標計算が不正確になる
 *   - 日本語文字幅は 1.0em、ラテン/数字は 0.55em で近似（実ブラウザの
 *     フォントメトリクスと完全一致しない）
 *   - transform="translate(x,y)" 内の子 <text> は親の translate を考慮する
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// svg-tokens.json の colorsAllowList をロード（P6 用）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TOKENS_PATH = resolve(__dirname, "../../../../design-system/svg-tokens.json");
let SVG_TOKENS = null;
try {
  SVG_TOKENS = JSON.parse(readFileSync(TOKENS_PATH, "utf-8"));
} catch {
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
    width += (isCjk(code) ? 1.0 : 0.55) * fontSize;
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

    texts.push({ x, y, fontSize, textAnchor, text: textContent });
  }

  return { viewBox, hasRole, ariaLabel, hasMaxWidth, texts };
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
export function detectSvgIssues(svg) {
  const findings = [];

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
  if (svg.viewBox && svg.viewBox.w > 400) {
    findings.push({
      pattern: "P5-wide-viewbox",
      severity: "MEDIUM",
      detail: `viewBox 幅 ${svg.viewBox.w}px > 400px（モバイル視認性）`,
    });
  }

  if (!svg.viewBox) return findings;

  // P1: テキスト clip, P4: font-size
  const bboxes = svg.texts.map(textBBox);
  for (let i = 0; i < bboxes.length; i++) {
    const bb = bboxes[i];
    const t = svg.texts[i];
    if (bb.x < -1 || bb.x + bb.width > svg.viewBox.w + 1) {
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

  // P8: 濃色 fill + 白/薄色テキストの組合せ（prohibited.md 違反）
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
        detail: `濃色 bg (例: ${darkRects[0].fill}) + 白/薄色テキスト (例: ${lightTextColors[0]}) の組合せを検出。prohibited.md 違反、淡色 bg + 濃色文字に修正せよ`,
      });
    }
  }

  return findings;
}

/** ファイルパスから監査結果を取得する便利関数 */
export function auditSvgFile(path) {
  const content = readFileSync(path, "utf-8");
  const svg = parseSvg(content);
  const findings = detectSvgIssues(svg);
  // P6/P7/P8 は content 全文を直接走査（parseSvg の対象外）
  findings.push(...detectColorAndFontIssues(content));
  return findings;
}
