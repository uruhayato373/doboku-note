/**
 * frontmatter の 1 つの欄の値だけを置き換える（他の欄・本文・改行コードは触らない）。apply-seo-meta.mjs が使う。
 * 値は JSON 文字列（YAML のダブルクォート文字列として読める）で書く。
 */

/** frontmatter 内の key の値（1 行・折り返し `>-` / `|` のどちらも）を置き換える。frontmatter か key が無ければ null */
export function replaceFrontmatterField(raw, key, value) {
  const fmEnd = raw.indexOf('\n---', 4);
  if (!raw.startsWith('---') || fmEnd < 0) return null;
  const fm = raw.slice(0, fmEnd);
  const rest = raw.slice(fmEnd);
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const text = JSON.stringify(value);
  const folded = new RegExp(`^${key}:[ \\t]*[>|][-+]?[ \\t]*\\r?\\n(?:[ \\t]+.*\\r?\\n)+`, 'm');
  if (folded.test(fm)) return fm.replace(folded, () => `${key}: ${text}${eol}`) + rest;
  const single = new RegExp(`^${key}:[ \\t]*.*$`, 'm');
  if (single.test(fm)) return fm.replace(single, () => `${key}: ${text}`) + rest;
  return null;
}
