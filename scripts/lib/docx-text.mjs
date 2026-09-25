/**
 * docx-text.mjs — Word(.docx) の本文を段落ごとのプレーンテキストにする
 * ---------------------------------------------------------------------------
 * 顧客がトークルームに添付した答案（docx）を、添削パイプラインの入力（.md/.txt）に
 * 落とすための最小実装。Word を開かずに本文だけを読む（書式・表・画像は捨てる）。
 * 2026-09-25 ココナラ S2 初回受注で、その場の python ワンライナーで読んだものを部品化。
 * ---------------------------------------------------------------------------
 */
import { strFromU8, unzipSync } from 'fflate';

const decodeXml = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&amp;/g, '&');

/**
 * @param {Uint8Array|Buffer} bytes docx ファイルの中身
 * @returns {string} 段落を改行で区切った本文（タブ・改行要素も反映）
 * @throws docx でない（word/document.xml が無い）とき
 */
export function docxToText(bytes) {
  const files = unzipSync(new Uint8Array(bytes), { filter: (f) => f.name === 'word/document.xml' });
  const xml = files['word/document.xml'];
  if (!xml) throw new Error('word/document.xml が見つからない（docx ではない）');
  const body = strFromU8(xml);
  const paragraphs = body.match(/<w:p[ >][\s\S]*?<\/w:p>|<w:p\/>/g) ?? [];
  return paragraphs.map((p) => {
    let out = '';
    for (const m of p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>/g)) {
      if (m[1] !== undefined) out += decodeXml(m[1]);
      else out += m[0] === '<w:tab/>' ? '\t' : '\n';
    }
    return out;
  }).join('\n');
}
