/** Pagefind投入時だけ表の表示を全セルの文字へ差し替える。配信HTMLへ隠し全文は加えない。 */
export function restoreStandardSearchText(html, tables) {
  const byId = new Map(tables.map((table) => [table.id, table]));
  const seen = new Set();
  const escaped = (s) => s.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');
  const content = html.replace(/<section\b([^>]*\bdata-standard-table="([^"]+)"[^>]*)>[\s\S]*?<\/section>/gu, (_, attributes, id) => {
    const table = byId.get(id);
    if (!table || seen.has(id)) throw new Error(`検索用の表が未登録または重複: ${id}`);
    seen.add(id);
    return `<section${attributes}><p>${escaped(table.sourceText)}</p></section>`;
  });
  if (tables.length === 0 || seen.size !== tables.length) throw new Error(`検索用表の照合不成立: 対象 ${tables.length} / 実検査 ${seen.size}`);
  return content;
}
