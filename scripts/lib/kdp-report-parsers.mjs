/** KDP の月別ロイヤリティは、確定後に KENP 列がページ数から金額へ変わる。 */
export function parseKdpMarketplaces(text) {
  const number = (value) => {
    const cleaned = String(value).replace(/[¥￥,\s]/g, '');
    return /^-?\d+(?:\.\d+)?$/.test(cleaned) ? Number(cleaned) : null;
  };
  let scanned = 0;
  const rows = [];
  for (const line of text.split('\n')) {
    const cells = line.split('\t').map((s) => s.trim());
    const [, marketplace, currency, eb, pb, hc, kenp, total] = cells;
    if (!marketplace || !/^[A-Z]{3}$/.test(currency || '')) continue;
    const amounts = [eb, pb, hc].map(number);
    const pages = String(kenp).match(/^([\d,]+)\s*既読\s*KENP$/);
    const kenpRoyalty = pages ? null : number(kenp);
    if (amounts.some((n) => n === null) || (!pages && kenpRoyalty === null)) continue;
    scanned++;
    const row = {
      marketplace, currency, ebook: amounts[0], paperback: amounts[1], hardcover: amounts[2],
      kenpPages: pages ? Number(pages[1].replaceAll(',', '')) : null,
      ...(kenpRoyalty === null ? {} : { kenpRoyalty }),
      ...(number(total) === null ? {} : { royalty: number(total) }),
    };
    if (amounts.some(Boolean) || row.kenpPages || kenpRoyalty || row.royalty) rows.push(row);
  }
  return { scanned, rows };
}

/** 母数は対象月に公開済みの当サイト書籍。共有口座の他書籍と停止済み書籍を分ける。 */
export function kdpScope(books, accountBookCount, expectedIds) {
  const found = new Set(books.map((book) => book.bookId).filter(Boolean));
  const expected = new Set(expectedIds);
  return {
    accountBookCount, accountRows: books.length,
    externalRows: books.filter((book) => !book.bookId).length,
    expectedDobokuBooks: expected.size,
    matchedDobokuBooks: [...expected].filter((id) => found.has(id)).length,
    missingDobokuBookIds: [...expected].filter((id) => !found.has(id)),
    dobokuRoyalty: books.filter((book) => expected.has(book.bookId)).reduce((sum, book) => sum + book.royalty, 0),
  };
}
