const normalizeTitle = (title) => String(title || '').replace(/\s+/g, ' ').trim().slice(0, 80);

const unique = (rows) => rows.length === 1 ? rows[0] : null;

// 本棚検索は別の本を1行だけ返すことがある。ID または表示タイトルが一致した行だけ採用する。
export function selectShelfRow(book, rows) {
  const byId = rows.filter((row) =>
    (book.asin && row.asin === book.asin) ||
    (book.draftAsin && row.titleId === book.draftAsin));
  if (byId.length) return unique(byId);

  const title = normalizeTitle(book.title);
  return unique(rows.filter((row) => {
    const shelfTitle = normalizeTitle(row.shelfTitle);
    return shelfTitle === title || shelfTitle.startsWith(`${title}:`) || shelfTitle.startsWith(`${title}：`);
  }));
}
