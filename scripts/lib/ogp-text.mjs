/**
 * OGP タイトルの改行・フォントサイズ決定ロジック（純関数）。
 *
 * 4 層優先度の改行戦略:
 *   Layer 1: 呼び出し側で \n を含む文字列を渡せば、その改行を尊重（split するだけ）
 *   Layer 2: config.breakBefore の記号の直前で改行（「MBO（目標管理）」→ ["MBO", "（目標管理）"]）
 *   Layer 3: config.budouX.enabled = true のとき BudouX で機械学習ベース改行
 *   Layer 4: config.charCountFallback 字ごとに機械的に折り返し
 *
 * 設定は .claude/config/ogp/text.json から読み込む。
 */

let budouxParser = null;
let budouxTriedLoad = false;

async function loadBudouXParser() {
  if (budouxTriedLoad) return budouxParser;
  budouxTriedLoad = true;
  try {
    const mod = await import('budoux');
    budouxParser = mod.loadDefaultJapaneseParser();
  } catch {
    budouxParser = null;
  }
  return budouxParser;
}

/**
 * breakBefore マーカーの直前で分割（マーカーは次セグメントに残す）。
 * "abc（def）ghi" + marker "（" → ["abc", "（def）ghi"]
 */
function splitBeforeMarkers(lines, markers) {
  if (!markers || markers.length === 0) return lines;
  const escaped = markers.map(m => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = new RegExp(`(?=${escaped})`);
  return lines.flatMap(line => line.split(re));
}

/**
 * breakAt マーカー位置で分割（マーカー自体は破棄）。
 * "abc def ghi" + marker " " → ["abc", "def", "ghi"]
 */
function splitAtMarkers(lines, markers) {
  if (!markers || markers.length === 0) return lines;
  let result = lines;
  for (const marker of markers) {
    result = result.flatMap(line => line.split(marker));
  }
  return result;
}

function normalizeLines(lines) {
  return lines.map(l => l.trim()).filter(l => l.length > 0);
}

function splitByCharCount(line, maxChars) {
  if (line.length <= maxChars) return [line];
  const chunks = [];
  for (let i = 0; i < line.length; i += maxChars) {
    chunks.push(line.slice(i, i + maxChars));
  }
  return chunks;
}

async function wrapWithBudouX(lines, maxChars) {
  const parser = await loadBudouXParser();
  if (!parser) {
    // BudouX 未インストール時は文字数フォールバックに戻る
    return lines.flatMap(line => splitByCharCount(line, maxChars));
  }
  const result = [];
  for (const line of lines) {
    if (line.length <= maxChars) {
      result.push(line);
      continue;
    }
    const phrases = parser.parse(line);
    let current = '';
    for (const phrase of phrases) {
      if (current.length + phrase.length > maxChars && current.length > 0) {
        result.push(current);
        current = phrase;
      } else {
        current += phrase;
      }
    }
    if (current.length > 0) result.push(current);
  }
  return result;
}

/**
 * タイトル文字列を改行済みの行配列に変換する。
 * @param {string} title - タイトル。\n が含まれていればそれを尊重（Layer 1）
 * @param {object} config - .claude/config/ogp/text.json の内容
 * @returns {Promise<string[]>}
 */
export async function wrapTitle(title, config) {
  if (!title) return [''];

  // Layer 1: 明示改行を尊重
  let lines = normalizeLines(title.split('\n'));

  // Layer 2a: 記号直前で改行（「（」「：」「〜」「──」等の直前）
  lines = splitBeforeMarkers(lines, config.breakBefore || []);

  // Layer 2b: 区切り文字で分割（半角・全角スペース等）
  lines = splitAtMarkers(lines, config.breakAt || []);

  lines = normalizeLines(lines);

  const maxChars = config.charCountFallback || 16;

  // いずれかの行が閾値を超えていれば、Layer 3 または 4 を適用
  const needsFurtherWrap = lines.some(l => l.length > maxChars);
  if (needsFurtherWrap) {
    if (config.budouX?.enabled) {
      // Layer 3: BudouX
      lines = await wrapWithBudouX(lines, maxChars);
    } else {
      // Layer 4: 文字数フォールバック
      lines = lines.flatMap(line => splitByCharCount(line, maxChars));
    }
    lines = normalizeLines(lines);
  }

  return lines;
}

/**
 * 文字 1 つ分の見かけ幅を fontSize 比で推定する。
 * 全幅日本語 ≈ 1.0 × fontSize / 半角英数記号 ≈ 0.58 × fontSize（Noto Sans JP Bold 実測の近似値）。
 */
function effectiveWidth(line, fontSize) {
  let w = 0;
  for (const ch of line) {
    const code = ch.charCodeAt(0);
    if (code < 128) w += fontSize * 0.58;
    else w += fontSize * 1.0;
  }
  return w;
}

/**
 * 行配列からフォントサイズを決定する。
 * fontSizeTable は大きい順に並んだサイズ配列。最初に「全行が safetyWidth に収まる」サイズを返す。
 * 全滅時は最小サイズを返す（その場合タイトルは若干はみ出すが生成は継続）。
 * @param {string[]} lines
 * @param {object} config
 * @returns {number}
 */
export function pickFontSize(lines, config) {
  const budget = config.safetyWidth || 560;
  const table = config.fontSizeTable || [];
  for (const size of table) {
    const maxLineWidth = Math.max(0, ...lines.map(l => effectiveWidth(l, size)));
    if (maxLineWidth <= budget) return size;
  }
  return table.length > 0 ? table[table.length - 1] : 42;
}
