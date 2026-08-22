/** Search Analytics API のページングを副作用なしで制御する。 */
export async function fetchGscPages({ fetchPage, rowCap = Infinity, pageSize = 25000 }) {
  const rows = [];
  let startRow = 0;
  let pagesFetched = 0;
  let lastPageFull = false;

  while (rows.length < rowCap) {
    const requested = Math.min(pageSize, rowCap - rows.length);
    const page = (await fetchPage({ startRow, rowLimit: requested })) || [];
    pagesFetched += 1;
    rows.push(...page);
    lastPageFull = page.length === requested;
    if (page.length < requested) break;
    startRow += page.length;
  }

  return {
    rows,
    pagesFetched,
    truncated: Number.isFinite(rowCap) && rows.length >= rowCap && lastPageFull,
  };
}
