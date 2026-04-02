/**
 * 日本語分かち書き（Intl.Segmenter 利用）
 * インデックス生成スクリプトと search-client で同一のトークナイザを使用する
 */
const segmenter = new Intl.Segmenter("ja", { granularity: "word" });

export function tokenize(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  return [...segmenter.segment(text)]
    .filter((s) => s.isWordLike)
    .map((s) => s.segment);
}
