/**
 * standards-mojibake.mjs — 全文ライブラリ（content/site/standards-library/）の文字化けしたページを見つける。
 *
 * PDF 側のフォントの対応表（ToUnicode）が壊れていると、pdftotext の出力が日本語ではない文字の並びになる
 * （関東の電子書類作成マニュアル: `$%& 3'()*$%+,7"`、沖縄の必携: `ู⾲ ᵝᘧ`・`ŨŨŨŨ`・`㻝㻝㻠㼏㼙`）。
 * U+FFFD は出ないので、replacementCharacters 0 の検査をすり抜ける（DN-0767）。
 *
 * 判定は「共通仕様書の紙面に出る文字の範囲」の外の文字の割合で行う。目次の点線（U+00B7 ·）や
 * ㎝・①・→・Ⅱ のような記号は範囲の内に入れる（点線を Latin-1 として数えると目次ページを誤判定する）。
 * ASCII の英数字だけの並び（`$%& 3'()*`）も化けの典型なので、和文がほとんど無く記号が多いページも拾う。
 */

/** 紙面に出てよい文字の範囲 */
const EXPECTED = new RegExp(
  '[' +
    '\\u0020-\\u007e' + // ASCII
    '\\u00a0-\\u00ff' + // Latin-1 補助（· ° ± × µ § など。点線のリーダーもここ）
    '\\u0300-\\u036f' + // 結合文字（x̄ の上線）
    '\\u0391-\\u03c9' + // ギリシャ文字（μ・Σ）
    '\\u1d00-\\u1dbf' + // 音声記号の拡張（添字の ᵢ）
    '\\u2000-\\u206f' + // 一般句読点（‐ — … ‥）
    '\\u2070-\\u209f' + // 上付き・下付き（₁ ⁿ）
    '\\u2100-\\u218f' + // 文字様記号・数字（ℓ Ⅱ ⅰ）
    '\\u2190-\\u23ff' + // 矢印・数学記号・技術記号
    '\\u2460-\\u24ff' + // 丸数字
    '\\u2500-\\u27bf' + // 罫線・図形・記号
    '\\u3000-\\u30ff' + // 和文の句読点・かな
    '\\u3200-\\u33ff' + // 囲み文字・単位（㈱ ㎝ ㎡）
    '\\u4e00-\\u9fff' + // 漢字
    '\\uf900-\\ufaff' + // 互換漢字
    '\\uff00-\\uffef' + // 全角英数・半角カナ
    ']',
);
const KANA_KANJI = /[぀-ヿ一-鿿]/;

/**
 * 1 ページの文字化けの度合いを測る。
 * @param {string} text ページの本文（版面）
 * @returns {{ garbled: boolean, chars: number, unexpected: number, kanaKanji: number, sample: string }}
 */
export function measureMojibake(text) {
  const chars = [...text.replace(/[\s　]/g, '')];
  let unexpected = 0;
  let kanaKanji = 0;
  let sample = '';
  for (const ch of chars) {
    if (!EXPECTED.test(ch)) {
      unexpected += 1;
      if (sample.length < 12) sample += ch;
    }
    if (KANA_KANJI.test(ch)) kanaKanji += 1;
  }
  const n = chars.length;
  // (a) 範囲外の文字が 10 字以上かつ 3% 以上（沖縄の必携の ู ᵝ Ũ 㻝 など）
  // (b) 40 字以上あるのに和文（かな・漢字）が 5% 未満で、ASCII の記号が 3 割を超える（関東のマニュアルの `$%& 3'()*`）
  const symbols = chars.filter((ch) => /[!-/:-@[-`{-~]/.test(ch)).length;
  const garbled =
    (unexpected >= 10 && unexpected / Math.max(n, 1) >= 0.03) ||
    (n >= 40 && kanaKanji / n < 0.05 && symbols / n > 0.3);
  return { garbled, chars: n, unexpected, kanaKanji, sample };
}

/** 全文ライブラリの part の Markdown をページに割る（`## PDF page N` ＋ 注記 ＋ ```text の版面）。 */
export function splitLibraryPages(markdown) {
  const pages = [];
  for (const m of markdown.matchAll(/## PDF page (\d+)\n\n(<!--[^\n]*-->)\n\n(`{3,4})text\n([\s\S]*?)\3/g)) {
    pages.push({ page: Number(m[1]), marker: m[2], text: m[4], start: m.index, raw: m[0] });
  }
  return pages;
}
